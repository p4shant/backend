const { Router } = require('express');
const unconfirmedLeadController = require('../controllers/unconfirmedLeadController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', unconfirmedLeadController.list);
router.get('/:id', unconfirmedLeadController.getById);
router.post('/', unconfirmedLeadController.create);
router.put('/:id', unconfirmedLeadController.update);
router.delete('/:id', unconfirmedLeadController.remove);

// Additional query routes
router.get('/employee/:employeeId', unconfirmedLeadController.getByEmployee);

// Conversion route
router.patch('/:id/convert', unconfirmedLeadController.convertToCustomer);

module.exports = router;
