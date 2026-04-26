const transactionLogService = require('../services/transactionLogService');
const db = require('../config/db');

// GET /api/payments/collection - Help Desk sees all customer payment entries
async function getPaymentCollection(req, res) {
    try {
        const data = await transactionLogService.getPaymentTracking();
        return res.json(data);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch payment collection data' });
    }
}

// POST /api/payments/collection/:customerId/record - Help Desk records a payment
async function recordPaymentCollection(req, res) {
    try {
        const customerId = Number(req.params.customerId);
        const { amount } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        const proofUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
        const result = await transactionLogService.recordPayment(customerId, amount, proofUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to record payment' });
    }
}

// GET /api/payments/approval - Master Admin & Admin Assistant see all with approval status
async function getPaymentApproval(req, res) {
    try {
        const query = `
            SELECT 
                tl.id, tl.registered_customer_id,
                rc.applicant_name AS customer_name, rc.district, rc.plant_size_kw, rc.payment_mode,
                tl.total_amount, tl.paid_amount,
                (tl.total_amount - tl.paid_amount) AS remaining_amount,
                tl.amount_submitted_details, tl.amount_submitted_images_url,
                tl.payment_approved, tl.approved_by, tl.approved_at,
                e.name AS sales_person_name, e.phone_number AS sales_person_mobile,
                approver.name AS approved_by_name,
                CASE 
                    WHEN tl.paid_amount = 0 AND rc.payment_mode != 'Finance' THEN 'Pending'
                    WHEN tl.paid_amount > 0 AND tl.paid_amount < tl.total_amount THEN 'In Progress'
                    WHEN tl.paid_amount >= tl.total_amount THEN 'Completed'
                    WHEN rc.payment_mode = 'Finance' THEN 'Finance'
                    ELSE 'Pending'
                END AS status,
                tl.created_at, tl.updated_at
            FROM transaction_logs tl
            INNER JOIN registered_customers rc ON tl.registered_customer_id = rc.id
            INNER JOIN employees e ON rc.created_by = e.id
            LEFT JOIN employees approver ON tl.approved_by = approver.id
            ORDER BY tl.payment_approved ASC, tl.updated_at DESC
        `;
        const data = await db.query(query);
        return res.json(data);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch payment approval data' });
    }
}

// POST /api/payments/approval/:customerId/approve - Approve payment and trigger generate_bill
async function approvePayment(req, res) {
    try {
        const customerId = Number(req.params.customerId);
        const approvedBy = req.user.id;

        // Check transaction exists
        const txResult = await db.query(
            'SELECT * FROM transaction_logs WHERE registered_customer_id = ? LIMIT 1',
            [customerId]
        );
        if (txResult.length === 0) {
            return res.status(404).json({ message: 'Transaction not found for this customer' });
        }

        if (txResult[0].payment_approved) {
            return res.status(400).json({ message: 'Payment already approved' });
        }

        // Mark as approved
        await db.query(
            'UPDATE transaction_logs SET payment_approved = 1, approved_by = ?, approved_at = NOW() WHERE registered_customer_id = ?',
            [approvedBy, customerId]
        );

        // Auto-trigger generate_bill task for Accountant
        try {
            const Tasks = require('../utils/Tasks');
            const employeeService = require('../services/employeeService');

            const accountants = await employeeService.findByRole('Accountant');
            if (accountants.length > 0) {
                await Tasks.createGenerateBillTask(customerId, accountants[0].id);
            }
        } catch (workflowErr) {
            console.error('Error creating generate_bill task:', workflowErr.message);
            // Don't fail approval if workflow task creation fails
        }

        return res.json({
            success: true,
            message: 'Payment approved and bill generation task created'
        });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to approve payment' });
    }
}

module.exports = {
    getPaymentCollection,
    recordPaymentCollection,
    getPaymentApproval,
    approvePayment
};
