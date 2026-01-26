const registeredCustomerService = require('../services/registeredCustomerService');
const taskService = require('../services/taskService');
const path = require('path');
const {
    createCustomerDataGatheringTask,
    createCollectRemainingAmountTask,
    createCompleteRegistrationTask,
    createCotRequestTask,
    createLoadRequestTask,
    createNameCorrectionRequestTask,
    createFinanceRegistrationTask
} = require('../utils/Tasks');
const employeeService = require('../services/employeeService');

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
        const result = await registeredCustomerService.list(filters);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch customers' });
    }
}

async function listWithTasks(req, res) {
    try {
        const { page = 1, limit = 50, status, district, search } = req.query;
        const filters = {
            page: Number(page),
            limit: Number(limit),
            status,
            district,
            search
        };
        const result = await registeredCustomerService.list(filters);

        // Fetch tasks for each customer
        const customersWithTasks = await Promise.all(
            result.data.map(async (customer) => {
                const tasks = await taskService.getByCustomer(customer.id);
                return {
                    ...customer,
                    tasks: tasks || []
                };
            })
        );

        return res.json({
            ...result,
            data: customersWithTasks
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch customers with tasks' });
    }
}

async function getById(req, res) {
    try {
        const customer = await registeredCustomerService.getById(Number(req.params.id));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        return res.json(customer);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch customer' });
    }
}

async function create(req, res) {
    try {
        const data = { ...req.body, created_by: req.user.id };
        const customer = await registeredCustomerService.create(data);

        // Create tasks automatically after customer creation
        const loggedInUserId = req.user.id;
        const customerId = customer.id;
        const customerDistrict = customer.district;
        const salesExecutiveId = customer.created_by; // Employee who registered the customer

        try {
            // Find System Admin (Mohammad Bilal Ansari)
            const db = require('../config/db');
            const systemAdminResult = await db.query(
                'SELECT id FROM employees WHERE phone_number = ? AND employee_role = ?',
                ['7275094145', 'System Admin']
            );
            const systemAdminId = systemAdminResult.length > 0 ? systemAdminResult[0].id : loggedInUserId;

            // Find Electrician in the same district as customer
            const electricianResult = await db.query(
                'SELECT id FROM employees WHERE district = ? AND employee_role = ? LIMIT 1',
                [customerDistrict, 'Electrician']
            );
            const electricianId = electricianResult.length > 0 ? electricianResult[0].id : loggedInUserId;

            // Create transaction log entry with plant price and margin money
            const totalAmount = parseFloat(customer.plant_price) || 0;
            const paidAmount = parseFloat(customer.margin_money) || 0;

            await db.query(
                'INSERT INTO transaction_logs (registered_customer_id, total_amount, paid_amount) VALUES (?, ?, ?)',
                [customerId, totalAmount, paidAmount]
            );

            // Always create these basic tasks
            // For Sale Executive tasks, use the employee who registered the customer (created_by)
            await createCustomerDataGatheringTask(customerId, salesExecutiveId); // Sale Executive who registered
            await createCollectRemainingAmountTask(customerId, salesExecutiveId); // Sale Executive who registered
            await createCompleteRegistrationTask(customerId, systemAdminId); // System Admin

            // Conditionally create tasks based on requirements
            if (data.cot_required === 'Yes') {
                await createCotRequestTask(customerId, electricianId); // Electrician in same district
            }

            if (data.load_enhancement_required === 'Required') {
                await createLoadRequestTask(customerId, electricianId); // Electrician in same district
            }

            if (data.name_correction_required === 'Required') {
                await createNameCorrectionRequestTask(customerId, electricianId); // Electrician in same district
            }

            // Finance task if required
            if (data.payment_mode === 'Finance' || data.special_finance_required === 'Yes') {
                await createFinanceRegistrationTask(customerId, systemAdminId); // System Admin
            }
        } catch (taskErr) {
            console.error('Error creating tasks:', taskErr.message);
            // Don't fail the customer creation if task creation fails
        }

        return res.status(201).json(customer);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to create customer' });
    }
}

async function update(req, res) {
    try {
        const customer = await registeredCustomerService.update(Number(req.params.id), req.body);
        return res.json(customer);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update customer' });
    }
}

async function partialUpdate(req, res) {
    try {
        const customer = await registeredCustomerService.partialUpdate(Number(req.params.id), req.body);
        return res.json(customer);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update customer' });
    }
}

async function remove(req, res) {
    try {
        await registeredCustomerService.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete customer' });
    }
}

async function getByStatus(req, res) {
    try {
        const customers = await registeredCustomerService.getByStatus(req.params.status);
        return res.json(customers);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch customers' });
    }
}

async function getByEmployee(req, res) {
    try {
        const customers = await registeredCustomerService.getByEmployee(Number(req.params.employeeId));
        return res.json(customers);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch customers' });
    }
}

async function uploadDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const folder = req.uploadContext?.customerFolder || 'unknown';
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}/${req.file.filename}`;

        return res.status(201).json({
            url: fileUrl,
            filename: req.file.filename,
            folder,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to upload document' });
    }
}

async function uploadDocuments(req, res) {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const folder = req.uploadContext?.customerFolder || 'unknown';
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}`;

        const uploadedFiles = {};

        // Handle all uploaded files
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
            if (Array.isArray(fileArray)) {
                if (fileArray.length === 1) {
                    // Single file field
                    uploadedFiles[fieldName] = {
                        url: `${baseUrl}/${fileArray[0].filename}`,
                        filename: fileArray[0].filename,
                        mimetype: fileArray[0].mimetype,
                        size: fileArray[0].size
                    };
                } else {
                    // Multiple files (like aadhaar_photos)
                    uploadedFiles[fieldName] = fileArray.map(file => ({
                        url: `${baseUrl}/${file.filename}`,
                        filename: file.filename,
                        mimetype: file.mimetype,
                        size: file.size
                    }));
                }
            }
        }

        return res.status(201).json({
            success: true,
            folder,
            files: uploadedFiles
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to upload documents' });
    }
}

module.exports = {
    list,
    listWithTasks,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByStatus,
    getByEmployee,
    uploadDocument,
    uploadDocuments
};
