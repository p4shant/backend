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
    const count = await db.query(`SELECT COUNT(*) as total FROM transaction_logs ${whereClause}`, params);
    const total = count[0].total;
    const data = await db.query(`SELECT * FROM transaction_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getById(id) {
    const rows = await db.query('SELECT * FROM transaction_logs WHERE id = ?', [id]);
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
        'registered_customer_id', 'total_amount', 'paid_amount', 'amount_submitted_details', 'amount_submitted_images_url'
    ];
    const values = fields.map(f => (data[f] !== undefined ? data[f] : null));
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO transaction_logs (${fields.join(', ')}) VALUES (${placeholders})`;
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
    await db.query(`UPDATE transaction_logs SET ${setClause} WHERE id = ?`, [...values, id]);
    return getById(id);
}

async function partialUpdate(id, data) {
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM transaction_logs WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Record not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function getByCustomer(registered_customer_id) {
    return db.query('SELECT * FROM transaction_logs WHERE registered_customer_id = ? ORDER BY created_at DESC', [registered_customer_id]);
}

async function recordPayment(customerId, amount, proofUrl) {
    try {
        // Get existing transaction log
        const result = await db.query('SELECT * FROM transaction_logs WHERE registered_customer_id = ? LIMIT 1', [customerId]);
        let transaction = result[0];

        if (!transaction) {
            // Create new transaction log if doesn't exist with paid_amount starting at 0
            const createQuery = `
                INSERT INTO transaction_logs (registered_customer_id, total_amount, paid_amount)
                SELECT id, plant_price, 0 FROM registered_customers WHERE id = ?
            `;
            await db.query(createQuery, [customerId]);
            const newResult = await db.query('SELECT * FROM transaction_logs WHERE registered_customer_id = ? LIMIT 1', [customerId]);
            transaction = newResult[0];
        }

        // Parse existing submitted details
        let submittedDetails = [];
        try {
            submittedDetails = transaction.amount_submitted_details ? JSON.parse(transaction.amount_submitted_details) : [];
        } catch (e) {
            submittedDetails = [];
        }

        // Parse existing image URLs
        let submittedImages = [];
        try {
            submittedImages = transaction.amount_submitted_images_url ? JSON.parse(transaction.amount_submitted_images_url) : [];
        } catch (e) {
            submittedImages = [];
        }

        // Add new payment record
        const newPaymentRecord = {
            amount: parseFloat(amount),
            date: new Date().toISOString(),
            mode: 'Online',
            note: `Payment recorded on ${new Date().toLocaleDateString('en-IN')}`
        };
        submittedDetails.push(newPaymentRecord);

        // Add image URL
        if (proofUrl) {
            submittedImages.push(proofUrl);
        }

        // Update transaction log - Add new amount to existing paid_amount
        const newPaidAmount = parseFloat(transaction.paid_amount || 0) + parseFloat(amount);
        const updateQuery = `
            UPDATE transaction_logs
            SET paid_amount = ?,
                amount_submitted_details = ?,
                amount_submitted_images_url = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE registered_customer_id = ?
        `;

        await db.query(updateQuery, [
            newPaidAmount,
            JSON.stringify(submittedDetails),
            JSON.stringify(submittedImages),
            customerId
        ]);

        return {
            success: true,
            message: 'Payment recorded successfully',
            transaction: {
                id: transaction.id,
                paid_amount: newPaidAmount,
                amount_submitted_details: submittedDetails,
                amount_submitted_images_url: submittedImages
            }
        };
    } catch (error) {
        const err = new Error(error.message);
        err.status = 500;
        throw err;
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByCustomer,
    recordPayment
};
