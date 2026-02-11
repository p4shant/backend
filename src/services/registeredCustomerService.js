const db = require('../config/db');

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const VALID_SOLAR_PLANT_TYPES = ['Residential', 'Commercial', 'Industrial'];
const VALID_SOLAR_SYSTEM_TYPES = ['TATA On-Grid', 'TATA Off-Grid', 'TATA Hybrid', 'Other'];
const VALID_METER_TYPES = ['Electric Meter', 'Smart Meter', 'Other'];
const VALID_PAYMENT_MODES = ['Cash', 'Online', 'Finance', 'Cheque', 'UPI'];
const VALID_YES_NO = ['Yes', 'No'];
const VALID_REQUIRED = ['Required', 'Not Required'];
const VALID_UPI_TYPES = ['Company', 'Personal'];

function validateRequiredFields(data) {
    const required = [
        'applicant_name',
        'mobile_number',
        'solar_plant_type',
        'solar_system_type',
        'plant_category',
        'plant_size_kw',
        'district',
        'installation_pincode',
        'site_latitude',
        'site_longitude',
        'created_by'
    ];

    for (const field of required) {
        if (!data[field] && data[field] !== 0) {
            const err = new Error(`${field} is required`);
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
        whereConditions.push('application_status = ?');
        params.push(status);
    }

    if (district) {
        whereConditions.push('district = ?');
        params.push(district);
    }

    if (search) {
        whereConditions.push('(applicant_name LIKE ? OR mobile_number LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM registered_customers ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = countResult[0].total;

    const query = `
    SELECT rc.*, e.name as created_by_name, e.employee_role as created_by_role
    FROM registered_customers rc
    LEFT JOIN employees e ON rc.created_by = e.id
    ${whereClause}
    ORDER BY rc.created_at DESC
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
    SELECT rc.*, e.name as created_by_name, e.employee_role as created_by_role, e.phone_number as created_by_phone
    FROM registered_customers rc
    LEFT JOIN employees e ON rc.created_by = e.id
    WHERE rc.id = ?
  `;
    const rows = await db.query(query, [id]);
    return rows[0] || null;
}

async function create(data) {
    validateRequiredFields(data);

    // Check if customer with same mobile number already exists
    const existingCustomer = await db.query(
        'SELECT id, applicant_name FROM registered_customers WHERE mobile_number = ?',
        [data.mobile_number]
    );
    if (existingCustomer.length > 0) {
        const err = new Error(`Customer with mobile number ${data.mobile_number} already exists (Name: ${existingCustomer[0].applicant_name})`);
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

    // Set defaults for NOT NULL fields
    const defaults = {
        meter_type: 'Electric Meter',
        name_correction_required: 'Not Required',
        load_enhancement_required: 'Not Required',
        cot_required: 'No',
        payment_mode: 'Cash',
        advance_payment_mode: 'Cash',
        special_finance_required: 'No',
        application_status: 'DRAFT'
    };

    const dataWithDefaults = { ...defaults, ...data };

    const fields = [
        'applicant_name', 'mobile_number', 'email_id',
        'solar_plant_type', 'solar_system_type', 'plant_category', 'plant_size_kw', 'plant_price',
        'district', 'installation_pincode', 'site_address', 'site_latitude', 'site_longitude',
        'meter_type',
        'name_correction_required', 'correct_name',
        'load_enhancement_required', 'current_load', 'required_load',
        'cot_required', 'cot_type', 'cot_documents',
        'payment_mode', 'advance_payment_mode', 'upi_type', 'margin_money', 'special_finance_required',
        'building_floor_number', 'structure_type', 'structure_length', 'structure_height', 'free_shadow_area',
        'installation_date_feasible',
        'application_status',
        'aadhaar_front_url', 'aadhaar_back_url', 'pan_card_url', 'electric_bill_url',
        'smart_meter_doc_url', 'cancel_cheque_url', 'bank_details_doc_url',
        'cot_death_certificate_url', 'cot_house_papers_url', 'cot_passport_photo_url',
        'cot_family_registration_url', 'cot_aadhaar_photos_urls', 'cot_live_aadhaar_1_url', 'cot_live_aadhaar_2_url',
        'created_by'
    ];

    const values = fields.map(f => dataWithDefaults[f] !== undefined ? dataWithDefaults[f] : null);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');

    const query = `INSERT INTO registered_customers (${fieldNames}) VALUES (${placeholders})`;
    const result = await db.query(query, values);

    return getById(result.insertId);
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by; // Cannot change creator

    if (Object.keys(updateData).length === 0) {
        return getById(id);
    }

    const fields = Object.keys(updateData);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const query = `UPDATE registered_customers SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);

    return getById(id);
}

async function partialUpdate(id, data) {
    // Same as update - only updates provided fields
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM registered_customers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function getByStatus(status) {
    if (!VALID_STATUSES.includes(status)) {
        const err = new Error('Invalid status');
        err.status = 400;
        throw err;
    }

    const query = `
    SELECT rc.*, e.name as created_by_name, e.employee_role as created_by_role
    FROM registered_customers rc
    LEFT JOIN employees e ON rc.created_by = e.id
    WHERE rc.application_status = ?
    ORDER BY rc.created_at DESC
  `;
    return db.query(query, [status]);
}

async function getByEmployee(employeeId) {
    const query = `
    SELECT rc.*, e.name as created_by_name, e.employee_role as created_by_role
    FROM registered_customers rc
    LEFT JOIN employees e ON rc.created_by = e.id
    WHERE rc.created_by = ?
    ORDER BY rc.created_at DESC
  `;
    return db.query(query, [employeeId]);
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByStatus,
    getByEmployee
};
