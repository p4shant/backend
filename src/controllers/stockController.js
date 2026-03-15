/**
 * Stock Controller
 * =================
 * Thin request handlers for all /api/stock/* endpoints.
 * Delegates business logic to service layer.
 */

const inventoryService = require('../services/stockInventoryService');
const inwardService = require('../services/stockInwardService');
const outwardService = require('../services/stockOutwardService');
const movementLogService = require('../services/stockMovementLogService');
const correctionService = require('../services/stockCorrectionService');
const db = require('../config/db');
const {
    STOCK_COMPONENTS, SYSTEM_TYPES, BRANDS, DCR_TYPES, STORE_DISTRICTS, CONNECTORS,
    COMPONENTS_WITH_SUBTYPES, PANEL_WATTAGES, INVERTER_TYPES, SYSTEM_BOM,
} = require('../constants/stockConfig');

// ============================================================================
// CONFIG — return static config for the frontend
// ============================================================================
async function getConfig(req, res) {
    try {
        return res.json({
            components: STOCK_COMPONENTS,
            components_with_subtypes: COMPONENTS_WITH_SUBTYPES,
            panel_wattages: PANEL_WATTAGES,
            inverter_types: INVERTER_TYPES,
            system_types: SYSTEM_TYPES,
            system_bom: SYSTEM_BOM,
            brands: BRANDS,
            dcr_types: DCR_TYPES,
            store_districts: STORE_DISTRICTS,
            connectors: CONNECTORS,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ============================================================================
// INVENTORY
// ============================================================================
async function getInventory(req, res) {
    try {
        const { district, brand, dcr_type, component } = req.query;
        const data = await inventoryService.getInventory({ district, brand, dcr_type, component });
        return res.json(data);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function getInventorySummary(req, res) {
    try {
        const data = await inventoryService.getInventorySummary();
        return res.json(data);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function validateStock(req, res) {
    try {
        const { district, brand, dcr_type, items } = req.body;
        if (!district || !brand || !dcr_type || !items) {
            return res.status(400).json({ message: 'district, brand, dcr_type, and items are required' });
        }
        const result = await inventoryService.validateAvailability(district, brand, dcr_type, items);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

// ============================================================================
// INWARD
// ============================================================================
async function createInward(req, res) {
    try {
        const record = await inwardService.create({
            ...req.body,
            created_by: req.user.id,
        });

        // Auto-snapshot: update today's balance after every inward
        try {
            const now = new Date();
            const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
            await inventoryService.takeDailySnapshot(istDate.toISOString().slice(0, 10));
        } catch (snapErr) {
            console.error('[AutoSnapshot] Failed after inward:', snapErr.message);
        }

        return res.status(201).json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function getInwardById(req, res) {
    try {
        const record = await inwardService.getById(Number(req.params.id));
        if (!record) return res.status(404).json({ message: 'Inward record not found' });
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function listInward(req, res) {
    try {
        const { page, limit, district, brand, dcr_type, from_date, to_date } = req.query;
        const result = await inwardService.list({
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            district, brand, dcr_type, from_date, to_date,
        });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

// ============================================================================
// OUTWARD
// ============================================================================
async function createOutward(req, res) {
    try {
        const record = await outwardService.create({
            ...req.body,
            created_by: req.user.id,
        });

        // Auto-snapshot: update today's balance after every outward
        try {
            const now = new Date();
            const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
            await inventoryService.takeDailySnapshot(istDate.toISOString().slice(0, 10));
        } catch (snapErr) {
            console.error('[AutoSnapshot] Failed after outward:', snapErr.message);
        }

        return res.status(201).json(record);
    } catch (err) {
        // Include shortage details if available
        const response = { message: err.message };
        if (err.shortages) response.shortages = err.shortages;
        return res.status(err.status || 500).json(response);
    }
}

async function getOutwardById(req, res) {
    try {
        const record = await outwardService.getById(Number(req.params.id));
        if (!record) return res.status(404).json({ message: 'Outward record not found' });
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function listOutward(req, res) {
    try {
        const { page, limit, from_district, dispatch_type, brand, dcr_type, from_date, to_date } = req.query;
        const result = await outwardService.list({
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            from_district, dispatch_type, brand, dcr_type, from_date, to_date,
        });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

// ============================================================================
// DEALERS
// ============================================================================
async function listDealers(req, res) {
    try {
        const rows = await db.query('SELECT * FROM stock_dealers WHERE is_active = 1 ORDER BY name');
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

async function createDealer(req, res) {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Dealer name is required' });
        }
        const existing = await db.query('SELECT id FROM stock_dealers WHERE name = ?', [name.trim()]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Dealer already exists', dealer: existing[0] });
        }
        const result = await db.query('INSERT INTO stock_dealers (name) VALUES (?)', [name.trim()]);
        const dealer = await db.query('SELECT * FROM stock_dealers WHERE id = ?', [result.insertId]);
        return res.status(201).json(dealer[0]);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ============================================================================
// MOVEMENT LOG
// ============================================================================
async function listMovementLog(req, res) {
    try {
        const { page, limit, district, component, sub_type, brand, dcr_type, movement_type, from_date, to_date } = req.query;
        const result = await movementLogService.list({
            page: Number(page) || 1,
            limit: Number(limit) || 50,
            district, component, sub_type, brand, dcr_type, movement_type, from_date, to_date,
        });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

// ============================================================================
// CUSTOMER SEARCH (for outward dispatch to customer)
// ============================================================================
async function searchCustomers(req, res) {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }
        const rows = await db.query(
            `SELECT id, applicant_name, mobile_number, district 
             FROM registered_customers 
             WHERE applicant_name LIKE ? OR mobile_number LIKE ?
             ORDER BY applicant_name 
             LIMIT 20`,
            [`%${q}%`, `%${q}%`]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ============================================================================
// DAILY SNAPSHOTS
// ============================================================================
async function getDailySnapshots(req, res) {
    try {
        const { date, district, from_date, to_date } = req.query;
        const data = await inventoryService.getDailySnapshots({ date, district, from_date, to_date });
        return res.json(data);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

async function triggerSnapshot(req, res) {
    try {
        // Manual trigger for today's snapshot
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const snapshotDate = istDate.toISOString().slice(0, 10);
        await inventoryService.takeDailySnapshot(snapshotDate);
        return res.json({ message: `Snapshot taken for ${snapshotDate}` });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

// ============================================================================
// STOCK CORRECTIONS (Master Admin only)
// ============================================================================
async function correctMovementLog(req, res) {
    try {
        const { logId } = req.params;
        const { new_quantity_change, reason } = req.body;

        if (new_quantity_change === undefined || new_quantity_change === null) {
            return res.status(400).json({ message: 'new_quantity_change is required' });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: 'reason is required for audit trail' });
        }

        const result = await correctionService.correctMovementLog(
            Number(logId),
            Number(new_quantity_change),
            req.user.id,
            reason.trim()
        );
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
    }
}

module.exports = {
    getConfig,
    getInventory,
    getInventorySummary,
    validateStock,
    createInward,
    getInwardById,
    listInward,
    createOutward,
    getOutwardById,
    listOutward,
    listDealers,
    createDealer,
    listMovementLog,
    searchCustomers,
    getDailySnapshots,
    triggerSnapshot,
    correctMovementLog,
};
