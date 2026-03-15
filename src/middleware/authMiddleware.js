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

const STOCK_ROLES = ['Stock Controller', 'Inventory Operator', 'Master Admin', 'Accountant'];

function requireRoles(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.employee_role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        return next();
    };
}

/**
 * Allows access if the user has a stock-designated role OR has stock_access=1 flag.
 * This lets individual employees (any role) be granted stock access without changing their role.
 */
function requireStockAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const hasStockRole = STOCK_ROLES.includes(req.user.employee_role);
    const hasFlag = req.user.stock_access === 1;
    if (hasStockRole || hasFlag) {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: no stock access' });
}

module.exports = {
    authenticate,
    requireRoles,
    requireStockAccess,
};
