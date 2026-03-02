const unconfirmedLeadService = require('../services/unconfirmedLeadService');

async function list(req, res) {
    try {
        const { page = 1, limit = 50, status, district, search } = req.query;
        const filters = {
            page: Number(page),
            limit: Number(limit),
            status,
            district,
            search
        };
        const result = await unconfirmedLeadService.list(filters);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch leads' });
    }
}

async function getById(req, res) {
    try {
        const { id } = req.params;
        const lead = await unconfirmedLeadService.getById(Number(id));
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        return res.json(lead);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch lead' });
    }
}

async function create(req, res) {
    try {
        // Set created_by from authenticated user
        const data = {
            ...req.body,
            created_by: req.user.id
        };

        const lead = await unconfirmedLeadService.create(data);
        return res.status(201).json({
            message: 'Lead created successfully',
            data: lead
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || 'Unable to create lead',
            error: err.message
        });
    }
}

async function update(req, res) {
    try {
        const { id } = req.params;
        const lead = await unconfirmedLeadService.update(Number(id), req.body);
        return res.json({
            message: 'Lead updated successfully',
            data: lead
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || 'Unable to update lead',
            error: err.message
        });
    }
}

async function remove(req, res) {
    try {
        const { id } = req.params;
        await unconfirmedLeadService.remove(Number(id));
        return res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete lead' });
    }
}

async function getByEmployee(req, res) {
    try {
        const { employeeId } = req.params;
        const leads = await unconfirmedLeadService.getByEmployee(Number(employeeId));
        return res.json({ data: leads });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch leads by employee' });
    }
}

async function convertToCustomer(req, res) {
    try {
        const { id } = req.params;
        const { customerId } = req.body;

        if (!customerId) {
            return res.status(400).json({ message: 'customerId is required' });
        }

        const lead = await unconfirmedLeadService.convertToCustomer(Number(id), Number(customerId));
        return res.json({
            message: 'Lead converted to customer successfully',
            data: lead
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || 'Unable to convert lead',
            error: err.message
        });
    }
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
