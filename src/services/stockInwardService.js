/**
 * Stock Inward Service
 * =====================
 * Handles creating inward transactions and updating inventory.
 * V3: Mandatory entry_mode — 'system' (BOM-based) or 'component' (direct component entry).
 */

const db = require('../config/db');
const inventoryService = require('./stockInventoryService');
const movementLogService = require('./stockMovementLogService');
const {
    calculatePlannedComponents, calculateInverterBreakdown,
} = require('../constants/stockConfig');

/**
 * Create a stock inward record.
 * @param {Object} data
 *   - district, brand, dcr_type, entry_mode, notes, created_by
 *   - systems: { '2KW': 3, '3KW': 2, ... }               (required for system mode)
 *   - panel_breakdown: { '570': 2, '580': 10, ... }        (wattage → count)
 *   - items: [{ component, sub_type?, actual_quantity }]    (overrides for system / full list for component)
 */
async function create(data) {
    const { district, brand, dcr_type, entry_mode, systems, panel_breakdown, items, notes, created_by } = data;

    // Validation — common
    if (!district || !brand || !dcr_type) {
        const err = new Error('district, brand, and dcr_type are required');
        err.status = 400;
        throw err;
    }
    if (!entry_mode || !['system', 'component'].includes(entry_mode)) {
        const err = new Error('entry_mode is required and must be "system" or "component"');
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

        // 1. Inverter items — one per sub_type
        for (const [invType, qty] of Object.entries(inverterBreakdown)) {
            const overrideItem = items?.find(i => i.component === 'inverter' && i.sub_type === invType);
            finalItems.push({
                component: 'inverter',
                sub_type: invType,
                planned_quantity: qty,
                actual_quantity: overrideItem ? (overrideItem.actual_quantity ?? qty) : qty,
            });
        }

        // 2. Panel items — one per wattage from panel_breakdown
        const panelBreakdown = panel_breakdown || {};
        for (const [wattage, qty] of Object.entries(panelBreakdown)) {
            if (qty > 0) {
                finalItems.push({
                    component: 'panel',
                    sub_type: wattage,
                    planned_quantity: 0,
                    actual_quantity: qty,
                });
            }
        }

        // 3. Other components
        const simpleComponents = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];
        for (const comp of simpleComponents) {
            const override = items?.find(i => i.component === comp);
            const plannedQty = planned[comp] || 0;
            const actualQty = override ? (override.actual_quantity ?? plannedQty) : plannedQty;
            if (plannedQty > 0 || actualQty > 0) {
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

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert inward header (with entry_mode)
        const [headerResult] = await conn.execute(
            'INSERT INTO stock_inward (district, brand, dcr_type, entry_mode, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [district, brand, dcr_type, entry_mode, notes || null, created_by]
        );
        const inwardId = headerResult.insertId;

        // 2. Insert system type rows (only in system mode)
        if (entry_mode === 'system') {
            for (const [sysType, qty] of Object.entries(activeSystems)) {
                await conn.execute(
                    'INSERT INTO stock_inward_systems (inward_id, system_type, quantity) VALUES (?, ?, ?)',
                    [inwardId, sysType, qty]
                );
            }
        }

        // 3. Insert items and update inventory
        for (const item of finalItems) {
            await conn.execute(
                'INSERT INTO stock_inward_items (inward_id, component, sub_type, planned_quantity, actual_quantity) VALUES (?, ?, ?, ?, ?)',
                [inwardId, item.component, item.sub_type, item.planned_quantity, item.actual_quantity]
            );

            if (item.actual_quantity > 0) {
                const qtyBefore = await inventoryService.getQuantity(conn, district, item.component, item.sub_type, brand, dcr_type);
                await inventoryService.addQuantity(conn, district, item.component, item.sub_type, brand, dcr_type, item.actual_quantity);

                await movementLogService.createWithConn(conn, {
                    district,
                    component: item.component,
                    sub_type: item.sub_type,
                    brand,
                    dcr_type,
                    movement_type: 'inward',
                    reference_type: 'inward',
                    reference_id: inwardId,
                    quantity_change: item.actual_quantity,
                    quantity_before: qtyBefore,
                    quantity_after: qtyBefore + item.actual_quantity,
                    created_by,
                });
            }
        }

        await conn.commit();
        return await getById(inwardId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Get a single inward record with its systems and items.
 */
async function getById(id) {
    const [header] = await db.query(
        'SELECT si.*, e.name as created_by_name FROM stock_inward si LEFT JOIN employees e ON si.created_by = e.id WHERE si.id = ?',
        [id]
    );
    if (!header) return null;

    const systems = await db.query('SELECT * FROM stock_inward_systems WHERE inward_id = ?', [id]);
    const items = await db.query('SELECT * FROM stock_inward_items WHERE inward_id = ?', [id]);

    return { ...header, systems, items };
}

/**
 * List inward records with pagination and filters.
 */
async function list({ page = 1, limit = 20, district, brand, dcr_type, from_date, to_date } = {}) {
    const where = [];
    const params = [];

    if (district) { where.push('si.district = ?'); params.push(district); }
    if (brand) { where.push('si.brand = ?'); params.push(brand); }
    if (dcr_type) { where.push('si.dcr_type = ?'); params.push(dcr_type); }
    if (from_date) { where.push('si.created_at >= ?'); params.push(from_date); }
    if (to_date) { where.push('si.created_at <= ?'); params.push(to_date + ' 23:59:59'); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await db.query(`SELECT COUNT(*) as total FROM stock_inward si ${whereClause}`, params);
    const total = countResult[0].total;

    const data = await db.query(
        `SELECT si.*, e.name as created_by_name 
         FROM stock_inward si 
         LEFT JOIN employees e ON si.created_by = e.id 
         ${whereClause} 
         ORDER BY si.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Attach systems and items for each record
    for (const record of data) {
        record.systems = await db.query('SELECT * FROM stock_inward_systems WHERE inward_id = ?', [record.id]);
        record.items = await db.query('SELECT * FROM stock_inward_items WHERE inward_id = ?', [record.id]);
    }

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { create, getById, list };
