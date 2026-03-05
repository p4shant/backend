/**
 * Stock Inventory Service
 * ========================
 * Handles current inventory state (read/upsert).
 * The inventory table tracks: district × component × sub_type × brand × dcr → quantity
 */

const db = require('../config/db');

/**
 * Get current inventory with optional filters.
 */
async function getInventory({ district, brand, dcr_type, component, sub_type } = {}) {
    const where = [];
    const params = [];

    if (district) { where.push('district = ?'); params.push(district); }
    if (brand) { where.push('brand = ?'); params.push(brand); }
    if (dcr_type) { where.push('dcr_type = ?'); params.push(dcr_type); }
    if (component) { where.push('component = ?'); params.push(component); }
    if (sub_type) { where.push('sub_type = ?'); params.push(sub_type); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM stock_inventory ${whereClause} ORDER BY district, brand, dcr_type, component, sub_type`;
    return db.query(sql, params);
}

/**
 * Get inventory summary grouped by district.
 */
async function getInventorySummary() {
    const sql = `
        SELECT district, brand, dcr_type, component, sub_type, quantity
        FROM stock_inventory
        WHERE quantity > 0
        ORDER BY district, brand, dcr_type, component, sub_type
    `;
    return db.query(sql);
}

/**
 * Get current quantity for a specific inventory slot (with sub_type).
 * For null sub_type we use SUM() so that any residual duplicate rows
 * (created by the old ON DUPLICATE KEY bug) are counted correctly.
 */
async function getQuantity(conn, district, component, sub_type, brand, dcr_type) {
    const sql = sub_type
        ? 'SELECT quantity FROM stock_inventory WHERE district = ? AND component = ? AND sub_type = ? AND brand = ? AND dcr_type = ?'
        : 'SELECT COALESCE(SUM(quantity), 0) AS quantity FROM stock_inventory WHERE district = ? AND component = ? AND sub_type IS NULL AND brand = ? AND dcr_type = ?';
    const params = sub_type
        ? [district, component, sub_type, brand, dcr_type]
        : [district, component, brand, dcr_type];
    const rows = await conn.execute(sql, params);
    return rows[0]?.length > 0 ? (rows[0][0].quantity || 0) : 0;
}

/**
 * Add quantity to inventory (used for inward / transfer_in).
 *
 * IMPORTANT: MySQL's unique index does NOT treat NULL = NULL, so
 * "ON DUPLICATE KEY UPDATE" never fires when sub_type IS NULL.
 * That would silently insert a new duplicate row on every call instead
 * of incrementing the existing one. We therefore use an explicit
 * UPDATE → INSERT pattern for the null sub_type case.
 */
async function addQuantity(conn, district, component, sub_type, brand, dcr_type, amount) {
    const resolvedSubType = sub_type || null;

    if (resolvedSubType === null) {
        // Null sub_type (simple components: ACDB, DCDB, earthing_rod, etc.)
        const [updateResult] = await conn.execute(
            `UPDATE stock_inventory
             SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
             WHERE district = ? AND component = ? AND sub_type IS NULL AND brand = ? AND dcr_type = ?`,
            [amount, district, component, brand, dcr_type]
        );
        if (updateResult.affectedRows === 0) {
            // Row doesn't exist yet — insert it
            await conn.execute(
                `INSERT INTO stock_inventory (district, component, sub_type, brand, dcr_type, quantity)
                 VALUES (?, ?, NULL, ?, ?, ?)`,
                [district, component, brand, dcr_type, amount]
            );
        }
    } else {
        // Non-null sub_type (panel wattage, inverter type) — ON DUPLICATE KEY works correctly
        await conn.execute(
            `INSERT INTO stock_inventory (district, component, sub_type, brand, dcr_type, quantity)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = CURRENT_TIMESTAMP`,
            [district, component, resolvedSubType, brand, dcr_type, amount]
        );
    }
}

/**
 * Subtract quantity from inventory (used for outward / transfer_out).
 */
async function subtractQuantity(conn, district, component, sub_type, brand, dcr_type, amount) {
    const currentQty = await getQuantity(conn, district, component, sub_type, brand, dcr_type);
    if (currentQty < amount) {
        const label = sub_type ? `${component}(${sub_type})` : component;
        const err = new Error(
            `Insufficient stock: ${label} in ${district} (${brand}/${dcr_type}). Available: ${currentQty}, Requested: ${amount}`
        );
        err.status = 400;
        throw err;
    }
    const sql = sub_type
        ? 'UPDATE stock_inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE district = ? AND component = ? AND sub_type = ? AND brand = ? AND dcr_type = ?'
        : 'UPDATE stock_inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE district = ? AND component = ? AND sub_type IS NULL AND brand = ? AND dcr_type = ?';
    const params = sub_type
        ? [amount, district, component, sub_type, brand, dcr_type]
        : [amount, district, component, brand, dcr_type];
    await conn.execute(sql, params);
    return currentQty;
}

/**
 * Validate stock availability for an outward dispatch.
 * Items: [{ component, sub_type, actual_quantity }]
 */
async function validateAvailability(district, brand, dcr_type, items) {
    const shortages = [];
    for (const item of items) {
        // Use SUM for null sub_type to correctly total any residual duplicate rows
        const sql = item.sub_type
            ? 'SELECT quantity FROM stock_inventory WHERE district = ? AND component = ? AND sub_type = ? AND brand = ? AND dcr_type = ?'
            : 'SELECT COALESCE(SUM(quantity), 0) AS quantity FROM stock_inventory WHERE district = ? AND component = ? AND sub_type IS NULL AND brand = ? AND dcr_type = ?';
        const params = item.sub_type
            ? [district, item.component, item.sub_type, brand, dcr_type]
            : [district, item.component, brand, dcr_type];
        const rows = await db.query(sql, params);
        const available = rows.length > 0 ? (rows[0].quantity || 0) : 0;
        if (available < item.actual_quantity) {
            shortages.push({
                component: item.component,
                sub_type: item.sub_type || null,
                available,
                requested: item.actual_quantity,
                deficit: item.actual_quantity - available,
            });
        }
    }
    return shortages.length === 0
        ? { valid: true, shortages: [] }
        : { valid: false, shortages };
}

/**
 * Take a daily snapshot of current inventory.
 *
 * We use DELETE + INSERT (rather than ON DUPLICATE KEY UPDATE) because MySQL
 * unique indexes do NOT treat NULL == NULL — so ON DUPLICATE KEY would silently
 * insert duplicate snapshot rows for every component with sub_type IS NULL
 * (ACDB, DCDB, earthing_rod, earthing_chemical, lightning_arrestor).
 *
 * GROUP BY in the SELECT consolidates any residual duplicate null-sub_type
 * rows that may already exist in stock_inventory.
 */
async function takeDailySnapshot(snapshotDate) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Remove existing snapshot for this date (clean replace)
        await conn.execute('DELETE FROM stock_daily_snapshot WHERE snapshot_date = ?', [snapshotDate]);

        // Insert fresh from inventory, using SUM+GROUP BY to aggregate any
        // duplicate null-sub_type rows in stock_inventory into a single snapshot row
        await conn.execute(
            `INSERT INTO stock_daily_snapshot
                 (snapshot_date, district, component, sub_type, brand, dcr_type, quantity)
             SELECT ?, district, component, sub_type, brand, dcr_type, SUM(quantity) AS quantity
             FROM stock_inventory
             WHERE quantity > 0
             GROUP BY district, component, sub_type, brand, dcr_type`,
            [snapshotDate]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Get daily snapshots for a given date range and optional district.
 */
async function getDailySnapshots({ date, district, from_date, to_date } = {}) {
    const where = [];
    const params = [];

    if (date) { where.push('snapshot_date = ?'); params.push(date); }
    if (district) { where.push('district = ?'); params.push(district); }
    if (from_date) { where.push('snapshot_date >= ?'); params.push(from_date); }
    if (to_date) { where.push('snapshot_date <= ?'); params.push(to_date); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM stock_daily_snapshot ${whereClause} ORDER BY snapshot_date DESC, district, component, sub_type`;
    return db.query(sql, params);
}

module.exports = {
    getInventory,
    getInventorySummary,
    getQuantity,
    addQuantity,
    subtractQuantity,
    validateAvailability,
    takeDailySnapshot,
    getDailySnapshots,
};
