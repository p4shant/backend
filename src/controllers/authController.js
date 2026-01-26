const authService = require('../services/authService');

async function register(req, res) {
    try {
        const { name, phone_number, district, employee_role, password } = req.body;
        if (!name || !phone_number || !employee_role || !password) {
            return res.status(400).json({ message: 'name, phone_number, employee_role, and password are required' });
        }

        const result = await authService.register({
            name,
            phone_number,
            district,
            employee_role,
            password
        });

        return res.status(201).json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to register user' });
    }
}

async function login(req, res) {
    try {
        const { phone_number, password } = req.body;
        if (!phone_number || !password) {
            return res.status(400).json({ message: 'phone_number and password are required' });
        }

        const result = await authService.login({ phone_number, password });
        return res.status(200).json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to login' });
    }
}

module.exports = {
    register,
    login
};
