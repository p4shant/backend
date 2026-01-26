const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, env.auth.jwtSecret);
        req.user = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function requireRoles(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.employee_role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        return next();
    };
}

module.exports = {
    authenticate,
    requireRoles
};
