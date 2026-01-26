const employeeService = require('../services/employeeService');

async function listEmployees(req, res) {
    try {
        const { role, district } = req.query;

        let employees;
        if (role && district) {
            employees = await employeeService.findByRoleAndDistrict(role, district);
        } else if (role) {
            employees = await employeeService.findByRole(role);
        } else {
            employees = await employeeService.list();
        }

        return res.json({ success: true, data: employees });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch employees' });
    }
}

async function getEmployeeById(req, res) {
    try {
        const employee = await employeeService.getById(Number(req.params.id));
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        return res.json(employee);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch employee' });
    }
}

async function createEmployee(req, res) {
    try {
        const { name, phone_number, district, employee_role, password } = req.body;
        if (!name || !phone_number || !employee_role || !password) {
            return res.status(400).json({ message: 'name, phone_number, employee_role, and password are required' });
        }
        const employee = await employeeService.create({
            name,
            phone_number,
            district,
            employee_role,
            password
        });
        return res.status(201).json(employee);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to create employee' });
    }
}

async function updateEmployee(req, res) {
    try {
        const { name, phone_number, district, employee_role, password } = req.body;
        const employee = await employeeService.update(Number(req.params.id), {
            name,
            phone_number,
            district,
            employee_role,
            password
        });
        return res.json(employee);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update employee' });
    }
}

async function deleteEmployee(req, res) {
    try {
        await employeeService.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete employee' });
    }
}

module.exports = {
    listEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
