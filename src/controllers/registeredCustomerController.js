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
    createFinanceRegistrationTask,
    createApprovalOfPaymentCollectionTask
} = require('../utils/Tasks');
const employeeService = require('../services/employeeService');
const { ROLE_ASSIGNMENTS } = require('../config/roleAssignments');

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
            const db = require('../config/db');

            // Find Help Desk employees from flexible role assignment config
            const configuredHelpDesk = Array.isArray(ROLE_ASSIGNMENTS.HELP_DESK?.users)
                ? ROLE_ASSIGNMENTS.HELP_DESK.users
                : [ROLE_ASSIGNMENTS.HELP_DESK].filter(Boolean);

            const resolvedHelpDeskIds = [];
            for (const adminConfig of configuredHelpDesk) {
                if (!adminConfig?.phone) continue;
                const admin = await employeeService.findByPhone(adminConfig.phone);
                if (admin?.id) {
                    resolvedHelpDeskIds.push(admin.id);
                }
            }

            const helpDeskIds = resolvedHelpDeskIds.length > 0
                ? [...new Set(resolvedHelpDeskIds)]
                : [loggedInUserId];

            // Find Master Admin
            const masterAdminResult = await db.query(
                'SELECT id FROM employees WHERE employee_role = ? LIMIT 1',
                ['Master Admin']
            );
            const masterAdminId = masterAdminResult.length > 0 ? masterAdminResult[0].id : loggedInUserId;

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
            await createCustomerDataGatheringTask(customerId, salesExecutiveId); // Sale Executive who registered
            await createCompleteRegistrationTask(customerId, helpDeskIds); // Help Desk (multi-assignee)
            // Note: collect_remaining_amount and approval_of_payment_collection removed
            // Payment collection/approval is now handled via dedicated pages

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
                await createFinanceRegistrationTask(customerId, helpDeskIds); // Help Desk (multi-assignee)
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
        const relativePath = `/uploads/${folder}`; // Relative path for database storage

        const uploadedFiles = {};
        const urlUpdates = {}; // URLs to save in database

        // Mapping from file field names to database column names
        const fieldToColumnMap = {
            'aadhaar_front': 'aadhaar_front_url',
            'aadhaar_back': 'aadhaar_back_url',
            'pan_card': 'pan_card_url',
            'electric_bill': 'electric_bill_url',
            'ceiling_paper_photo': 'ceiling_paper_photo_url',
            'cancel_cheque': 'cancel_cheque_url',
            'site_image_gps': 'site_image_gps_url',
            'cot_death_certificate': 'cot_death_certificate_url',
            'cot_house_papers': 'cot_house_papers_url',
            'cot_passport_photo': 'cot_passport_photo_url',
            'cot_family_registration': 'cot_family_registration_url',
            'cot_live_aadhaar_1': 'cot_live_aadhaar_1_url',
            'cot_live_aadhaar_2': 'cot_live_aadhaar_2_url',
            'cot_aadhaar_photos': 'cot_aadhaar_photos_urls'
        };

        // Handle all uploaded files
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
            if (Array.isArray(fileArray)) {
                if (fileArray.length === 1) {
                    // Single file field
                    const relativeUrl = `${relativePath}/${fileArray[0].filename}`;
                    uploadedFiles[fieldName] = {
                        url: `${baseUrl}/${fileArray[0].filename}`,
                        filename: fileArray[0].filename,
                        mimetype: fileArray[0].mimetype,
                        size: fileArray[0].size
                    };

                    // Save relative path for database update
                    const columnName = fieldToColumnMap[fieldName];
                    if (columnName) {
                        urlUpdates[columnName] = relativeUrl;
                    }
                } else {
                    // Multiple files (like aadhaar_photos)
                    const urls = fileArray.map(file => `${relativePath}/${file.filename}`);
                    uploadedFiles[fieldName] = fileArray.map(file => ({
                        url: `${baseUrl}/${file.filename}`,
                        filename: file.filename,
                        mimetype: file.mimetype,
                        size: file.size
                    }));

                    // Save relative paths as JSON array for database update
                    const columnName = fieldToColumnMap[fieldName];
                    if (columnName) {
                        urlUpdates[columnName] = JSON.stringify(urls);
                    }
                }
            }
        }

        // Automatically update the customer record with file URLs
        const customerId = req.params.registered_customer_id || req.params.id;
        if (customerId && Object.keys(urlUpdates).length > 0) {
            try {
                await registeredCustomerService.partialUpdate(Number(customerId), urlUpdates);
                console.log(`✓ Updated customer ${customerId} with uploaded document URLs`);
            } catch (updateErr) {
                console.error('Error updating customer with file URLs:', updateErr);
                // Don't fail the upload - files are already saved
            }
        }

        return res.status(201).json({
            success: true,
            folder,
            files: uploadedFiles,
            urlsSaved: Object.keys(urlUpdates).length > 0
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
