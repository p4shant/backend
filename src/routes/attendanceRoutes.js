const { Router } = require('express');
const controller = require('../controllers/employeeAttendanceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate);

// Dedicated attendance endpoints
router.get('/today', controller.getTodayStatus);
router.post('/punch-in', controller.punchIn);
router.post('/punch-out', controller.punchOut);

// History and management
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.partialUpdate);
router.delete('/:id', controller.remove);
router.patch('/:id/punch-out', controller.patchPunchOut);

module.exports = router;
