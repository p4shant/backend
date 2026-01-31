const { Router } = require('express');
const employeeController = require('../controllers/employeeController');
const { requireRoles, authenticate } = require('../middleware/authMiddleware');

const router = Router();

const adminRoles = ['System Admin', 'Master Admin', 'SFDC Admin'];

router.get('/', employeeController.listEmployees);
router.put('/change-password', authenticate, employeeController.changePassword);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', requireRoles(adminRoles), employeeController.createEmployee);
router.put('/:id', requireRoles(adminRoles), employeeController.updateEmployee);
router.delete('/:id', requireRoles(adminRoles), employeeController.deleteEmployee);

module.exports = router;
