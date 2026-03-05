/**
 * Stock Movement Log Service
 * ============================
 * Append-only audit trail for every inventory change.
 * V2: Includes sub_type column.
 */

const db = require('../config/db');

/**
 * Create a log entry using an existing connection (within a transaction).
 */
async function createWithConn(conn, data) {
    const {
        district, component, sub_type, brand, dcr_type,
        movement_type, reference_type, reference_id,
        quantity_change, quantity_before, quantity_after,
        created_by,
    } = data;

    await conn.execute(
        `INSERT INTO stock_movement_log 
         (district, component, sub_type, brand, dcr_type, movement_type, reference_type, reference_id, 
          quantity_change, quantity_before, quantity_after, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            district, component, sub_type || null, brand, dcr_type,
            movement_type, reference_type, reference_id,
            quantity_change, quantity_before, quantity_after,
            created_by,
        ]
    );
}

/**
 * List movement log entries with pagination and filters.
 */
async function list({ page = 1, limit = 50, district, component, sub_type, brand, dcr_type, movement_type, from_date, to_date } = {}) {
    const where = [];
    const params = [];

    if (district) { where.push('ml.district = ?'); params.push(district); }
    if (component) { where.push('ml.component = ?'); params.push(component); }
    if (sub_type) { where.push('ml.sub_type = ?'); params.push(sub_type); }
    if (brand) { where.push('ml.brand = ?'); params.push(brand); }
    if (dcr_type) { where.push('ml.dcr_type = ?'); params.push(dcr_type); }
    if (movement_type) { where.push('ml.movement_type = ?'); params.push(movement_type); }
    if (from_date) { where.push('ml.created_at >= ?'); params.push(from_date); }
    if (to_date) { where.push('ml.created_at <= ?'); params.push(to_date + ' 23:59:59'); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await db.query(`SELECT COUNT(*) as total FROM stock_movement_log ml ${whereClause}`, params);
    const total = countResult[0].total;

    const data = await db.query(
        `SELECT ml.*, e.name as created_by_name
         FROM stock_movement_log ml
         LEFT JOIN employees e ON ml.created_by = e.id
         ${whereClause} 
         ORDER BY ml.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { createWithConn, list };
