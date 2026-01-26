const { Router } = require('express');
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', taskController.list);
router.get('/:id', taskController.getById);
router.post('/', taskController.create);
router.put('/:id', taskController.update);
router.patch('/:id', taskController.partialUpdate);
router.delete('/:id', taskController.remove);

// Additional query routes
router.get('/status/:status', taskController.getByStatus);
router.get('/employee/:employeeId', taskController.getByEmployee);
router.get('/customer/:customerId', taskController.getByCustomer);

module.exports = router;
