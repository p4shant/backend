const db = require('../config/db');

const VALID_STATUSES = ['active', 'converted', 'dropped'];

function validateRequiredFields(data) {
    const required = ['name', 'district', 'phone_number', 'created_by'];

    for (const field of required) {
        if (!data[field] && data[field] !== 0) {
            const err = new Error(`${field} is required`);
            err.status = 400;
            throw err;
        }
    }

    // Validate confirmation percentage
    if (data.confirmation_percentage !== undefined) {
        const percentage = parseInt(data.confirmation_percentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            const err = new Error('confirmation_percentage must be between 0 and 100');
            err.status = 400;
            throw err;
        }
    }
}

async function list(filters = {}) {
    const { page = 1, limit = 50, status, district, search } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status && VALID_STATUSES.includes(status)) {
        whereConditions.push('ul.status = ?');
        params.push(status);
    } else {
        // By default, only show active leads
        whereConditions.push('ul.status = ?');
        params.push('active');
    }

    if (district) {
        whereConditions.push('ul.district = ?');
        params.push(district);
    }

    if (search) {
        whereConditions.push('(ul.name LIKE ? OR ul.phone_number LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM unconfirmed_leads ul ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = countResult[0].total;

    const query = `
        SELECT ul.*, 
               e.name as created_by_name, 
               e.employee_role as created_by_role,
               rc.applicant_name as converted_customer_name
        FROM unconfirmed_leads ul
        LEFT JOIN employees e ON ul.created_by = e.id
        LEFT JOIN registered_customers rc ON ul.converted_customer_id = rc.id
        ${whereClause}
        ORDER BY ul.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const rows = await db.query(query, [...params, limit, offset]);

    return {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

async function getById(id) {
    const query = `
        SELECT ul.*, 
               e.name as created_by_name, 
               e.employee_role as created_by_role, 
               e.phone_number as created_by_phone,
               rc.applicant_name as converted_customer_name,
               rc.id as converted_customer_id
        FROM unconfirmed_leads ul
        LEFT JOIN employees e ON ul.created_by = e.id
        LEFT JOIN registered_customers rc ON ul.converted_customer_id = rc.id
        WHERE ul.id = ?
    `;
    const rows = await db.query(query, [id]);
    return rows[0] || null;
}

async function create(data) {
    validateRequiredFields(data);

    // Check if active lead with same phone number already exists
    const existingLead = await db.query(
        'SELECT id, name FROM unconfirmed_leads WHERE phone_number = ? AND status = ?',
        [data.phone_number, 'active']
    );
    if (existingLead.length > 0) {
        const err = new Error(`Active lead with phone number ${data.phone_number} already exists (Name: ${existingLead[0].name})`);
        err.status = 409; // Conflict
        throw err;
    }

    // Validate employee exists
    const employee = await db.query('SELECT id FROM employees WHERE id = ?', [data.created_by]);
    if (employee.length === 0) {
        const err = new Error('Invalid created_by employee ID');
        err.status = 400;
        throw err;
    }

    // Set defaults
    const defaults = {
        confirmation_percentage: 0,
        status: 'active'
    };

    const dataWithDefaults = { ...defaults, ...data };

    const fields = ['name', 'district', 'phone_number', 'confirmation_percentage', 'notes', 'status', 'created_by'];
    const values = fields.map(f => dataWithDefaults[f] !== undefined ? dataWithDefaults[f] : null);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');

    const query = `INSERT INTO unconfirmed_leads (${fieldNames}) VALUES (${placeholders})`;
    const result = await db.query(query, values);

    return getById(result.insertId);
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Lead not found');
        err.status = 404;
        throw err;
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by; // Cannot change creator
    delete updateData.converted_customer_id; // Use convertToCustomer for this

    if (Object.keys(updateData).length === 0) {
        return getById(id);
    }

    // Validate confirmation percentage if provided
    if (updateData.confirmation_percentage !== undefined) {
        const percentage = parseInt(updateData.confirmation_percentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            const err = new Error('confirmation_percentage must be between 0 and 100');
            err.status = 400;
            throw err;
        }
    }

    // Validate status if provided
    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
        const err = new Error('Invalid status. Must be: active, converted, or dropped');
        err.status = 400;
        throw err;
    }

    const fields = Object.keys(updateData);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const query = `UPDATE unconfirmed_leads SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);

    return getById(id);
}

async function remove(id) {
    const result = await db.query('DELETE FROM unconfirmed_leads WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Lead not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function getByEmployee(employeeId) {
    const query = `
        SELECT ul.*, 
               e.name as created_by_name, 
               e.employee_role as created_by_role,
               rc.applicant_name as converted_customer_name
        FROM unconfirmed_leads ul
        LEFT JOIN employees e ON ul.created_by = e.id
        LEFT JOIN registered_customers rc ON ul.converted_customer_id = rc.id
        WHERE ul.created_by = ?
        ORDER BY ul.created_at DESC
    `;
    return db.query(query, [employeeId]);
}

async function convertToCustomer(id, customerId) {
    console.log('=== convertToCustomer called ===');
    console.log('Lead ID:', id, typeof id);
    console.log('Customer ID:', customerId, typeof customerId);

    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Lead not found');
        err.status = 404;
        throw err;
    }
    console.log('Lead found:', existing.name);

    if (existing.status === 'converted') {
        const err = new Error('Lead is already converted');
        err.status = 400;
        throw err;
    }

    // Verify customer exists
    console.log('Verifying customer exists with ID:', customerId);
    const customer = await db.query('SELECT id FROM registered_customers WHERE id = ?', [customerId]);
    console.log('Customer query result:', customer);

    if (customer.length === 0) {
        const err = new Error(`Customer not found with ID: ${customerId}`);
        err.status = 404;
        throw err;
    }

    const query = `
        UPDATE unconfirmed_leads 
        SET status = 'converted', converted_customer_id = ? 
        WHERE id = ?
    `;
    await db.query(query, [customerId, id]);
    console.log('Lead marked as converted');

    return getById(id);
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove,
    getByEmployee,
    convertToCustomer
};
