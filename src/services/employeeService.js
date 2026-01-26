const db = require('../config/db');
const { EMPLOYEE_ROLE_SET } = require('../constants/roles');
const { hashPassword } = require('../utils/password');

function sanitize(row) {
    if (!row) return null;
    const { password_hash, ...rest } = row;
    return rest;
}

async function list() {
    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees ORDER BY id DESC'
    );
    return rows.map(sanitize);
}

async function findByRole(employee_role) {
    if (!employee_role) return [];

    // Enforce allowed roles to avoid invalid queries
    if (!EMPLOYEE_ROLE_SET.has(employee_role)) {
        return [];
    }

    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE employee_role = ? ORDER BY id ASC',
        [employee_role]
    );
    return rows.map(sanitize);
}

async function findByRoleAndDistrict(employee_role, district) {
    if (!employee_role || !district) return [];

    // Enforce allowed roles to avoid invalid queries
    if (!EMPLOYEE_ROLE_SET.has(employee_role)) {
        return [];
    }

    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE employee_role = ? AND district = ? ORDER BY id ASC',
        [employee_role, district]
    );
    return rows.map(sanitize);
}

async function findByPhone(phone_number) {
    if (!phone_number) return null;

    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE phone_number = ?',
        [phone_number]
    );
    return sanitize(rows[0]);
}

async function findSingleByRole(employee_role) {
    if (!employee_role) return null;

    // Enforce allowed roles to avoid invalid queries
    if (!EMPLOYEE_ROLE_SET.has(employee_role)) {
        return null;
    }

    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE employee_role = ? LIMIT 1',
        [employee_role]
    );
    return sanitize(rows[0]);
}

async function getById(id) {
    const rows = await db.query(
        'SELECT id, name, phone_number, district, employee_role, created_at, updated_at FROM employees WHERE id = ?',
        [id]
    );
    return sanitize(rows[0]);
}

async function create({ name, phone_number, district, employee_role, password }) {
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
    return getById(id);
}

async function update(id, { name, phone_number, district, employee_role, password }) {
    const rows = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }
    const existing = rows[0];

    if (employee_role && !EMPLOYEE_ROLE_SET.has(employee_role)) {
        const err = new Error('Invalid employee_role');
        err.status = 400;
        throw err;
    }

    if (phone_number && phone_number !== existing.phone_number) {
        const phoneCheck = await db.query('SELECT id FROM employees WHERE phone_number = ?', [phone_number]);
        if (phoneCheck.length > 0) {
            const err = new Error('Phone number already registered');
            err.status = 409;
            throw err;
        }
    }

    const updated = {
        name: name ?? existing.name,
        phone_number: phone_number ?? existing.phone_number,
        district: district !== undefined ? district : existing.district,
        employee_role: employee_role ?? existing.employee_role,
        password_hash: existing.password_hash
    };

    if (password) {
        updated.password_hash = await hashPassword(password);
    }

    await db.query(
        'UPDATE employees SET name = ?, phone_number = ?, district = ?, employee_role = ?, password_hash = ? WHERE id = ?',
        [
            updated.name,
            updated.phone_number,
            updated.district,
            updated.employee_role,
            updated.password_hash,
            id
        ]
    );

    return getById(id);
}

async function remove(id) {
    const result = await db.query('DELETE FROM employees WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }
    return true;
}

module.exports = {
    list,
    getById,
    findByRole,
    findByRoleAndDistrict,
    findByPhone,
    findSingleByRole,
    create,
    update,
    remove
};
