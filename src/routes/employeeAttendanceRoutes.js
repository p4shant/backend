const { Router } = require('express');
const controller = require('../controllers/employeeAttendanceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.partialUpdate);
router.delete('/:id', controller.remove);

// Patch only punch-out details
router.patch('/:id/punch-out', controller.patchPunchOut);

module.exports = router;
