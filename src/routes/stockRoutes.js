/**
 * Stock Routes
 * ==============
 * All /api/stock/* endpoints.
 * Protected by authenticate + requireRoles for Stock Controller & Master Admin.
 */

const { Router } = require('express');
const controller = require('../controllers/stockController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

// All stock routes require authentication
router.use(authenticate);

// All stock routes restricted to Stock Controller, Inventory Operator and Master Admin
const stockAccess = requireRoles(['Stock Controller', 'Inventory Operator', 'Master Admin']);
router.use(stockAccess);

// --- Config ---
router.get('/config', controller.getConfig);

// --- Inventory ---
router.get('/inventory', controller.getInventory);
router.get('/inventory/summary', controller.getInventorySummary);
router.post('/inventory/validate', controller.validateStock);

// --- Inward ---
router.post('/inward', controller.createInward);
router.get('/inward', controller.listInward);
router.get('/inward/:id', controller.getInwardById);

// --- Outward ---
router.post('/outward', controller.createOutward);
router.get('/outward', controller.listOutward);
router.get('/outward/:id', controller.getOutwardById);

// --- Dealers ---
router.get('/dealers', controller.listDealers);
router.post('/dealers', controller.createDealer);

// --- Movement Log ---
router.get('/movement-log', controller.listMovementLog);

// --- Daily Snapshots ---
router.get('/snapshots', controller.getDailySnapshots);
router.post('/snapshots/trigger', controller.triggerSnapshot);

// --- Customer Search ---
router.get('/customers/search', controller.searchCustomers);

module.exports = router;
