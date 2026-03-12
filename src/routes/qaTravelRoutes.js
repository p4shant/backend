const { Router } = require('express');
const controller = require('../controllers/qaTravelController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── QA Tester endpoints ────────────────────────────────────────────────────
router.get('/today', controller.getTodayStatus);
router.post('/punch-in', controller.punchIn);
router.post('/punch-out', controller.punchOut);
router.get('/customers/search', controller.searchCustomers);

// ── Admin endpoints ────────────────────────────────────────────────────────
const adminOnly = requireRoles(['Master Admin', 'SFDC Admin']);
router.get('/testers', adminOnly, controller.getQATesters);
router.get('/logs', adminOnly, controller.listLogs);
router.get('/logs/:id', adminOnly, controller.getLogDetail);

module.exports = router;
