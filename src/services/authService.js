const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { EMPLOYEE_ROLE_SET } = require('../constants/roles');
const { hashPassword, comparePassword } = require('../utils/password');
const env = require('../config/env');

function signToken(payload) {
    return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.jwtExpiresIn });
}

function sanitizeEmployee(row) {
    if (!row) return null;
    const { password_hash, ...rest } = row;
    return rest;
}

async function register({ name, phone_number, district, employee_role, password }) {
    if (!EMPLOYEE_ROLE_SET.has(employee_role)) {
        const err = new Error('Invalid employee_role');
        err.status = 400;
        throw err;
    }

    const existing = await db.query('SELECT id FROM employees WHERE phone_number = ?', [phone_number]);
    if (existing.length > 0) {
        const err = new Error('Phone number already registered');
        err.status = 409;
        throw err;
    }

    const password_hash = await hashPassword(password);

    const result = await db.query(
        'INSERT INTO employees (name, phone_number, district, employee_role, password_hash) VALUES (?, ?, ?, ?, ?)',
        [name, phone_number, district || null, employee_role, password_hash]
    );

    const id = result.insertId;
    const [row] = await db.query('SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE id = ?', [id]);

    const employee = sanitizeEmployee(row);
    const token = signToken({
        id: employee.id,
        name: employee.name,
        phone_number: employee.phone_number,
        employee_role: employee.employee_role
    });

    return { employee, token };
}

async function login({ phone_number, password }) {
    const rows = await db.query('SELECT * FROM employees WHERE phone_number = ?', [phone_number]);
    if (rows.length === 0) {
        const err = new Error('Invalid credentials');
        err.status = 401;
        throw err;
    }

    const employee = rows[0];
    const valid = await comparePassword(password, employee.password_hash);
    if (!valid) {
        const err = new Error('Invalid credentials');
        err.status = 401;
        throw err;
    }

    const clean = sanitizeEmployee(employee);
    const token = signToken({
        id: clean.id,
        name: clean.name,
        phone_number: clean.phone_number,
        employee_role: clean.employee_role
    });

    return { employee: clean, token };
}

module.exports = {
    register,
    login
};
