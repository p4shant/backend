const db = require('../config/db');

async function validateCustomer(id) {
    const rows = await db.query('SELECT id FROM registered_customers WHERE id = ?', [id]);
    if (rows.length === 0) {
        const err = new Error('Invalid registered_customer_id');
        err.status = 400;
        throw err;
    }
}

async function list({ page = 1, limit = 50, registered_customer_id }) {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (registered_customer_id) {
        where.push('registered_customer_id = ?');
        params.push(registered_customer_id);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await db.query(`SELECT COUNT(*) as total FROM provided_solar_plant_details ${whereClause}`, params);
    const total = count[0].total;
    const data = await db.query(`SELECT * FROM provided_solar_plant_details ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getById(id) {
    const rows = await db.query('SELECT * FROM provided_solar_plant_details WHERE id = ?', [id]);
    return rows[0] || null;
}

async function create(data) {
    if (!data.registered_customer_id) {
        const err = new Error('registered_customer_id is required');
        err.status = 400;
        throw err;
    }
    await validateCustomer(data.registered_customer_id);
    const fields = [
        'registered_customer_id',
        'solar_panel_serial_number', 'inverter_serial_number', 'logger_serial_number'
    ];
    const values = fields.map(f => (data[f] !== undefined ? data[f] : null));
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO provided_solar_plant_details (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.query(sql, values);
    return getById(result.insertId);
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Record not found');
        err.status = 404;
        throw err;
    }
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;
    const fields = Object.keys(updateData);
    if (fields.length === 0) return getById(id);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updateData[f]);
    await db.query(`UPDATE provided_solar_plant_details SET ${setClause} WHERE id = ?`, [...values, id]);
    return getById(id);
}

async function partialUpdate(id, data) {
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM provided_solar_plant_details WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Record not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function getByCustomer(registered_customer_id) {
    return db.query('SELECT * FROM provided_solar_plant_details WHERE registered_customer_id = ? ORDER BY created_at DESC', [registered_customer_id]);
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByCustomer,
};
