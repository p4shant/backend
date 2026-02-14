const service = require('../services/transactionLogService');

async function list(req, res) {
    try {
        const { page = 1, limit = 50, registered_customer_id } = req.query;
        const result = await service.list({ page: Number(page), limit: Number(limit), registered_customer_id: registered_customer_id ? Number(registered_customer_id) : undefined });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch records' });
    }
}

async function getById(req, res) {
    try {
        const record = await service.getById(Number(req.params.id));
        if (!record) return res.status(404).json({ message: 'Record not found' });
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch record' });
    }
}

async function create(req, res) {
    try {
        const record = await service.create(req.body);
        return res.status(201).json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to create record' });
    }
}

async function update(req, res) {
    try {
        const record = await service.update(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to update record' });
    }
}

async function partialUpdate(req, res) {
    try {
        const record = await service.partialUpdate(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to update record' });
    }
}

async function remove(req, res) {
    try {
        await service.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to delete record' });
    }
}

async function getByCustomer(req, res) {
    try {
        const rows = await service.getByCustomer(Number(req.params.registered_customer_id));
        return res.json(rows);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch records' });
    }
}

async function recordPayment(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const { amount } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        let proofUrl = null;
        if (req.file) {
            const folder = req.uploadContext?.customerFolder || 'unknown';
            proofUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}/${req.file.filename}`;
        }

        const result = await service.recordPayment(customerId, amount, proofUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to record payment' });
    }
}

async function getPaymentTracking(req, res) {
    try {
        const rows = await service.getPaymentTracking();
        return res.json(rows);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch payment tracking' });
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
    recordPayment,
    getPaymentTracking
};
