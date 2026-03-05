/**
 * Stock Outward Service
 * ======================
 * V3: Mandatory entry_mode — 'system' (BOM-based) or 'component' (direct component entry).
 */

const db = require('../config/db');
const inventoryService = require('./stockInventoryService');
const movementLogService = require('./stockMovementLogService');
const {
    DISPATCH_TYPES, calculatePlannedComponents, calculateInverterBreakdown,
} = require('../constants/stockConfig');

/**
 * Create a stock outward record.
 * @param {Object} data
 *   - from_district, dispatch_type, brand, dcr_type, entry_mode, created_by
 *   - dealer_id?, customer_name?, customer_district?, registered_customer_id?, to_district?
 *   - connector, notes
 *   - systems: { '2KW': 3, ... }                          (required for system mode)
 *   - panel_breakdown: { '570': 2, '580': 10, ... }
 *   - items: [{ component, sub_type?, actual_quantity }]   (overrides for system / full list for component)
 */
async function create(data) {
    const {
        from_district, dispatch_type, dealer_id, customer_name, customer_district,
        registered_customer_id, to_district, connector, brand, dcr_type, entry_mode,
        systems, panel_breakdown, items, notes, created_by,
    } = data;

    // --- Validation ---
    if (!from_district || !dispatch_type || !brand || !dcr_type) {
        const err = new Error('from_district, dispatch_type, brand, and dcr_type are required');
        err.status = 400;
        throw err;
    }
    if (!entry_mode || !['system', 'component'].includes(entry_mode)) {
        const err = new Error('entry_mode is required and must be "system" or "component"');
        err.status = 400;
        throw err;
    }
    if (!DISPATCH_TYPES.includes(dispatch_type)) {
        const err = new Error(`Invalid dispatch_type. Must be one of: ${DISPATCH_TYPES.join(', ')}`);
        err.status = 400;
        throw err;
    }
    if (dispatch_type === 'dealer' && !dealer_id) {
        const err = new Error('dealer_id is required for dealer dispatch');
        err.status = 400;
        throw err;
    }
    if (dispatch_type === 'customer' && !customer_name) {
        const err = new Error('customer_name is required for customer dispatch');
        err.status = 400;
        throw err;
    }
    if (dispatch_type === 'store_transfer' && !to_district) {
        const err = new Error('to_district is required for store transfer');
        err.status = 400;
        throw err;
    }
    if (dispatch_type === 'store_transfer' && to_district === from_district) {
        const err = new Error('Source and destination district cannot be the same');
        err.status = 400;
        throw err;
    }

    let activeSystems = {};
    let finalItems = [];

    if (entry_mode === 'system') {
        // ── SYSTEM MODE ──────────────────────────────────────────────
        for (const [sysType, qty] of Object.entries(systems || {})) {
            if (qty > 0) activeSystems[sysType] = qty;
        }
        if (Object.keys(activeSystems).length === 0) {
            const err = new Error('At least one system type with quantity > 0 is required in system mode');
            err.status = 400;
            throw err;
        }

        const planned = calculatePlannedComponents(activeSystems);
        const inverterBreakdown = calculateInverterBreakdown(activeSystems);

        // Inverter items
        for (const [invType, qty] of Object.entries(inverterBreakdown)) {
            const override = items?.find(i => i.component === 'inverter' && i.sub_type === invType);
            finalItems.push({
                component: 'inverter',
                sub_type: invType,
                planned_quantity: qty,
                actual_quantity: override ? (override.actual_quantity ?? qty) : qty,
            });
        }

        // Panel items from panel_breakdown
        const pb = panel_breakdown || {};
        for (const [wattage, qty] of Object.entries(pb)) {
            if (qty > 0) {
                finalItems.push({
                    component: 'panel',
                    sub_type: wattage,
                    planned_quantity: 0,
                    actual_quantity: qty,
                });
            }
        }

        // Simple components
        const simpleComponents = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];
        for (const comp of simpleComponents) {
            const override = items?.find(i => i.component === comp);
            const plannedQty = planned[comp] || 0;
            const actualQty = override ? (override.actual_quantity ?? plannedQty) : plannedQty;
            if (actualQty > 0) {
                finalItems.push({
                    component: comp,
                    sub_type: null,
                    planned_quantity: plannedQty,
                    actual_quantity: actualQty,
                });
            }
        }
    } else {
        // ── COMPONENT MODE ───────────────────────────────────────────
        if (!items || !Array.isArray(items) || items.length === 0) {
            const err = new Error('At least one component item is required in component mode');
            err.status = 400;
            throw err;
        }
        const hasAnyQty = items.some(i => (i.actual_quantity || 0) > 0);
        if (!hasAnyQty) {
            const err = new Error('At least one component must have quantity > 0');
            err.status = 400;
            throw err;
        }
        for (const item of items) {
            if ((item.actual_quantity || 0) > 0) {
                finalItems.push({
                    component: item.component,
                    sub_type: item.sub_type || null,
                    planned_quantity: 0,
                    actual_quantity: item.actual_quantity,
                });
            }
        }
    }

    // --- Pre-validate stock availability ---
    const validation = await inventoryService.validateAvailability(from_district, brand, dcr_type, finalItems);
    if (!validation.valid) {
        const err = new Error('Insufficient stock for dispatch');
        err.status = 400;
        err.shortages = validation.shortages;
        throw err;
    }

    // --- Execute in transaction ---
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert outward header (with entry_mode)
        const [headerResult] = await conn.execute(
            `INSERT INTO stock_outward 
             (from_district, dispatch_type, dealer_id, customer_name, customer_district, 
              registered_customer_id, to_district, connector, brand, dcr_type, entry_mode, notes, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                from_district, dispatch_type,
                dealer_id || null, customer_name || null, customer_district || null,
                registered_customer_id || null, to_district || null,
                connector || null, brand, dcr_type, entry_mode, notes || null, created_by,
            ]
        );
        const outwardId = headerResult.insertId;

        // 2. Insert system type rows (only in system mode)
        if (entry_mode === 'system') {
            for (const [sysType, qty] of Object.entries(activeSystems)) {
                await conn.execute(
                    'INSERT INTO stock_outward_systems (outward_id, system_type, quantity) VALUES (?, ?, ?)',
                    [outwardId, sysType, qty]
                );
            }
        }

        // 3. Movement type
        let movementType;
        if (dispatch_type === 'customer') movementType = 'outward_customer';
        else if (dispatch_type === 'dealer') movementType = 'outward_dealer';
        else movementType = 'transfer_out';

        // 4. Insert items, deduct from source, log movement
        for (const item of finalItems) {
            await conn.execute(
                'INSERT INTO stock_outward_items (outward_id, component, sub_type, planned_quantity, actual_quantity) VALUES (?, ?, ?, ?, ?)',
                [outwardId, item.component, item.sub_type, item.planned_quantity, item.actual_quantity]
            );

            const qtyBefore = await inventoryService.subtractQuantity(
                conn, from_district, item.component, item.sub_type, brand, dcr_type, item.actual_quantity
            );

            await movementLogService.createWithConn(conn, {
                district: from_district,
                component: item.component,
                sub_type: item.sub_type,
                brand,
                dcr_type,
                movement_type: movementType,
                reference_type: 'outward',
                reference_id: outwardId,
                quantity_change: -item.actual_quantity,
                quantity_before: qtyBefore,
                quantity_after: qtyBefore - item.actual_quantity,
                created_by,
            });

            // Store-to-store: add to destination
            if (dispatch_type === 'store_transfer') {
                const destBefore = await inventoryService.getQuantity(conn, to_district, item.component, item.sub_type, brand, dcr_type);
                await inventoryService.addQuantity(conn, to_district, item.component, item.sub_type, brand, dcr_type, item.actual_quantity);

                await movementLogService.createWithConn(conn, {
                    district: to_district,
                    component: item.component,
                    sub_type: item.sub_type,
                    brand,
                    dcr_type,
                    movement_type: 'transfer_in',
                    reference_type: 'outward',
                    reference_id: outwardId,
                    quantity_change: item.actual_quantity,
                    quantity_before: destBefore,
                    quantity_after: destBefore + item.actual_quantity,
                    created_by,
                });
            }
        }

        await conn.commit();
        return await getById(outwardId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Get a single outward record with its systems, items, and related info.
 */
async function getById(id) {
    const rows = await db.query(
        `SELECT so.*, e.name as created_by_name, sd.name as dealer_name
         FROM stock_outward so
         LEFT JOIN employees e ON so.created_by = e.id
         LEFT JOIN stock_dealers sd ON so.dealer_id = sd.id
         WHERE so.id = ?`,
        [id]
    );
    if (!rows[0]) return null;

    const header = rows[0];
    const systems = await db.query('SELECT * FROM stock_outward_systems WHERE outward_id = ?', [id]);
    const items = await db.query('SELECT * FROM stock_outward_items WHERE outward_id = ?', [id]);

    return { ...header, systems, items };
}

/**
 * List outward records with pagination and filters.
 */
async function list({ page = 1, limit = 20, from_district, dispatch_type, brand, dcr_type, from_date, to_date } = {}) {
    const where = [];
    const params = [];

    if (from_district) { where.push('so.from_district = ?'); params.push(from_district); }
    if (dispatch_type) { where.push('so.dispatch_type = ?'); params.push(dispatch_type); }
    if (brand) { where.push('so.brand = ?'); params.push(brand); }
    if (dcr_type) { where.push('so.dcr_type = ?'); params.push(dcr_type); }
    if (from_date) { where.push('so.created_at >= ?'); params.push(from_date); }
    if (to_date) { where.push('so.created_at <= ?'); params.push(to_date + ' 23:59:59'); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await db.query(`SELECT COUNT(*) as total FROM stock_outward so ${whereClause}`, params);
    const total = countResult[0].total;

    const data = await db.query(
        `SELECT so.*, e.name as created_by_name, sd.name as dealer_name
         FROM stock_outward so
         LEFT JOIN employees e ON so.created_by = e.id
         LEFT JOIN stock_dealers sd ON so.dealer_id = sd.id
         ${whereClause} 
         ORDER BY so.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Attach systems and items
    for (const record of data) {
        record.systems = await db.query('SELECT * FROM stock_outward_systems WHERE outward_id = ?', [record.id]);
        record.items = await db.query('SELECT * FROM stock_outward_items WHERE outward_id = ?', [record.id]);
    }

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { create, getById, list };
