const { Router } = require('express');
const employeeController = require('../controllers/employeeController');
const { requireRoles, authenticate } = require('../middleware/authMiddleware');

const router = Router();

const { EMPLOYEE_ROLES } = require('../constants/roles');
const adminRoles = ['Help Desk', 'Master Admin', 'SFDC Admin'];

// Public endpoint to get all available roles
router.get('/roles', (req, res) => res.json({ roles: EMPLOYEE_ROLES }));

router.get('/', employeeController.listEmployees);
router.put('/change-password', authenticate, employeeController.changePassword);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', requireRoles(adminRoles), employeeController.createEmployee);
router.put('/:id', requireRoles(adminRoles), employeeController.updateEmployee);
router.delete('/:id', requireRoles(adminRoles), employeeController.deleteEmployee);

module.exports = router;
