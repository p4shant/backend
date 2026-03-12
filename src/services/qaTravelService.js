const db = require('../config/db');

// ─── Timezone helpers (same pattern as attendanceController) ───────────────

/** Returns today's date string in IST (YYYY-MM-DD) */
function getTodayIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Returns current UTC time as MySQL DATETIME string */
function nowUTC() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ─── Core helpers ──────────────────────────────────────────────────────────

async function getById(id) {
    const rows = await db.query('SELECT * FROM qa_travel_logs WHERE id = ?', [id]);
    return rows[0] || null;
}

async function getByEmployeeAndDate(employeeId, date) {
    const rows = await db.query(
        'SELECT * FROM qa_travel_logs WHERE employee_id = ? AND travel_date = ?',
        [employeeId, date]
    );
    return rows[0] || null;
}

async function getTodayForEmployee(employeeId) {
    return getByEmployeeAndDate(employeeId, getTodayIST());
}

// ─── Write operations ──────────────────────────────────────────────────────

async function createStartEntry(data) {
    const {
        employee_id,
        attendance_id = null,
        start_reading,
        start_image_url,
        start_latitude,
        start_longitude,
        start_time,
    } = data;

    const travel_date = getTodayIST();

    // Guard against duplicates (UNIQUE key also protects, but give a friendly message)
    const existing = await getByEmployeeAndDate(employee_id, travel_date);
    if (existing) {
        const err = new Error('Travel log already started for today');
        err.status = 409;
        throw err;
    }

    const result = await db.query(
        `INSERT INTO qa_travel_logs
           (employee_id, attendance_id, travel_date,
            start_reading, start_image_url, start_latitude, start_longitude, start_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, attendance_id, travel_date,
            start_reading, start_image_url, start_latitude, start_longitude, start_time]
    );
    return getById(result.insertId);
}

async function updateEndEntry(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Travel log not found');
        err.status = 404;
        throw err;
    }
    if (existing.end_time) {
        const err = new Error('Day already ended for this travel log');
        err.status = 409;
        throw err;
    }

    const end_reading = parseFloat(data.end_reading);
    const start_reading = parseFloat(existing.start_reading);

    if (isNaN(end_reading) || end_reading < start_reading) {
        const err = new Error(
            `End reading (${end_reading}) must be ≥ start reading (${start_reading})`
        );
        err.status = 400;
        throw err;
    }

    const total_distance = parseFloat((end_reading - start_reading).toFixed(1));

    await db.query(
        `UPDATE qa_travel_logs SET
           end_reading = ?, end_image_url = ?, end_latitude = ?, end_longitude = ?,
           end_time = ?, total_distance = ?
         WHERE id = ?`,
        [end_reading, data.end_image_url, data.end_latitude, data.end_longitude,
            data.end_time, total_distance, id]
    );
    return getById(id);
}

// ─── Customer visits ───────────────────────────────────────────────────────

function validateCustomer(c, idx) {
    if (!c.customer_name || !String(c.customer_name).trim()) {
        const err = new Error(`Customer #${idx + 1}: customer_name is required`);
        err.status = 400;
        throw err;
    }
    if (!['Completed', 'Pending'].includes(c.status)) {
        const err = new Error(`Customer #${idx + 1}: status must be "Completed" or "Pending"`);
        err.status = 400;
        throw err;
    }
    if (c.status === 'Pending') {
        const validReasons = ['Wiring not Completed', 'Inverter Other Brand'];
        if (!c.pending_reason || !validReasons.includes(c.pending_reason)) {
            const err = new Error(
                `Customer #${idx + 1}: pending_reason is required when status is Pending. ` +
                `Must be one of: ${validReasons.join(', ')}`
            );
            err.status = 400;
            throw err;
        }
    }
}

async function addCustomerVisits(travelLogId, customers) {
    if (!Array.isArray(customers) || customers.length === 0) {
        const err = new Error('At least one customer visit is required');
        err.status = 400;
        throw err;
    }

    // Validate all before inserting
    customers.forEach((c, i) => validateCustomer(c, i));

    for (const c of customers) {
        await db.query(
            `INSERT INTO qa_travel_customers
               (travel_log_id, customer_id, customer_name, status, pending_reason)
             VALUES (?, ?, ?, ?, ?)`,
            [
                travelLogId,
                c.customer_id || null,
                String(c.customer_name).trim(),
                c.status,
                c.status === 'Pending' ? c.pending_reason : null,
            ]
        );
    }
}

async function getCustomerVisits(travelLogId) {
    return db.query(
        'SELECT * FROM qa_travel_customers WHERE travel_log_id = ? ORDER BY id ASC',
        [travelLogId]
    );
}

// ─── Admin listing ─────────────────────────────────────────────────────────

async function listLogs(filters = {}) {
    const {
        page = 1,
        limit = 30,
        date_from,
        date_to,
        employee_id,
    } = filters;

    const offset = (Number(page) - 1) * Number(limit);

    const where = [];
    const params = [];

    if (employee_id) { where.push('tl.employee_id = ?'); params.push(employee_id); }
    if (date_from) { where.push('tl.travel_date >= ?'); params.push(date_from); }
    if (date_to) { where.push('tl.travel_date <= ?'); params.push(date_to); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total count
    const countRows = await db.query(
        `SELECT COUNT(*) AS total FROM qa_travel_logs tl ${whereClause}`,
        params
    );
    const total = countRows[0]?.total || 0;

    // Stats (total distance + avg)
    const statsRows = await db.query(
        `SELECT
           COALESCE(SUM(tl.total_distance), 0) AS total_distance_sum,
           COALESCE(AVG(tl.total_distance), 0) AS avg_distance
         FROM qa_travel_logs tl ${whereClause}`,
        params
    );

    // Main rows
    const rows = await db.query(
        `SELECT
           tl.*,
           e.name AS employee_name
         FROM qa_travel_logs tl
         JOIN employees e ON e.id = tl.employee_id
         ${whereClause}
         ORDER BY tl.travel_date DESC, e.name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
    );

    // Attach customer visits to each row
    const logIds = rows.map(r => r.id);
    let customerMap = {};
    if (logIds.length > 0) {
        const placeholders = logIds.map(() => '?').join(',');
        const customers = await db.query(
            `SELECT * FROM qa_travel_customers WHERE travel_log_id IN (${placeholders}) ORDER BY id ASC`,
            logIds
        );
        customers.forEach(c => {
            if (!customerMap[c.travel_log_id]) customerMap[c.travel_log_id] = [];
            customerMap[c.travel_log_id].push(c);
        });
    }

    const data = rows.map(r => ({ ...r, customers: customerMap[r.id] || [] }));

    return {
        data,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
        stats: {
            total_distance_sum: parseFloat(statsRows[0]?.total_distance_sum || 0).toFixed(1),
            avg_distance: parseFloat(statsRows[0]?.avg_distance || 0).toFixed(1),
        },
    };
}

async function getLogById(id) {
    const log = await getById(id);
    if (!log) return null;

    // Attach employee name
    const empRows = await db.query('SELECT name FROM employees WHERE id = ?', [log.employee_id]);
    log.employee_name = empRows[0]?.name || null;

    log.customers = await getCustomerVisits(id);
    return log;
}

// ─── Customer search (for QA Tester autocomplete) ─────────────────────────

async function searchCustomers(query) {
    const like = `%${query}%`;
    return db.query(
        `SELECT id, applicant_name, mobile_number, district
         FROM registered_customers
         WHERE applicant_name LIKE ?
         ORDER BY applicant_name ASC
         LIMIT 20`,
        [like]
    );
}

// ─── QA Tester list (for admin filter dropdown) ───────────────────────────

async function getQATesters() {
    return db.query(
        `SELECT id, name FROM employees WHERE employee_role = 'QA Tester' ORDER BY name ASC`
    );
}

module.exports = {
    getTodayIST,
    nowUTC,
    getById,
    getByEmployeeAndDate,
    getTodayForEmployee,
    createStartEntry,
    updateEndEntry,
    addCustomerVisits,
    getCustomerVisits,
    listLogs,
    getLogById,
    searchCustomers,
    getQATesters,
};
