const db = require('../config/db');

const VALID_STATUSES = ['pending', 'inprogress', 'completed'];

// Status transition map - defines allowed forward transitions
const ALLOWED_TRANSITIONS = {
    'pending': ['inprogress'],
    'inprogress': ['completed'],
    'completed': [] // No transitions allowed from completed
};

function validateStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
        return { valid: true };
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
        const error = new Error(
            `Invalid status transition: Cannot move from '${currentStatus}' to '${newStatus}'. ` +
            `Task flow is unidirectional: pending → in-progress → completed`
        );
        error.status = 400;
        return { valid: false, error };
    }

    return { valid: true };
}

// Helper function to structure task with nested customer data
function structureTaskWithCustomerData(row) {
    if (!row) return null;

    const task = {
        id: row.id,
        work: row.work,
        work_type: row.work_type,
        status: row.status,
        assigned_to_id: row.assigned_to_id,
        assigned_to_name: row.assigned_to_name,
        assigned_to_role: row.assigned_to_role,
        registered_customer_id: row.registered_customer_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        registered_customer_data: {
            id: row.customer_id,
            applicant_name: row.applicant_name,
            mobile_number: row.mobile_number,
            email_id: row.email_id,
            solar_plant_type: row.solar_plant_type,
            solar_system_type: row.solar_system_type,
            plant_category: row.plant_category,
            plant_size_kw: row.plant_size_kw,
            plant_price: row.plant_price,
            district: row.district,
            installation_pincode: row.installation_pincode,
            site_address: row.site_address,
            site_latitude: row.site_latitude,
            site_longitude: row.site_longitude,
            meter_type: row.meter_type,
            name_correction_required: row.name_correction_required,
            correct_name: row.correct_name,
            load_enhancement_required: row.load_enhancement_required,
            current_load: row.current_load,
            required_load: row.required_load,
            cot_required: row.cot_required,
            cot_type: row.cot_type,
            cot_documents: row.cot_documents,
            payment_mode: row.payment_mode,
            advance_payment_mode: row.advance_payment_mode,
            upi_type: row.upi_type,
            margin_money: row.margin_money,
            special_finance_required: row.special_finance_required,
            building_floor_number: row.building_floor_number,
            structure_type: row.structure_type,
            structure_length: row.structure_length,
            structure_height: row.structure_height,
            free_shadow_area: row.free_shadow_area,
            installation_date_feasible: row.installation_date_feasible,
            application_status: row.application_status,
            aadhaar_front_url: row.aadhaar_front_url,
            aadhaar_back_url: row.aadhaar_back_url,
            pan_card_url: row.pan_card_url,
            electric_bill_url: row.electric_bill_url,
            smart_meter_doc_url: row.smart_meter_doc_url,
            cancel_cheque_url: row.cancel_cheque_url,
            bank_details_doc_url: row.bank_details_doc_url,
            cot_death_certificate_url: row.cot_death_certificate_url,
            cot_house_papers_url: row.cot_house_papers_url,
            cot_passport_photo_url: row.cot_passport_photo_url,
            cot_family_registration_url: row.cot_family_registration_url,
            cot_aadhaar_photos_urls: row.cot_aadhaar_photos_urls,
            cot_live_aadhaar_1_url: row.cot_live_aadhaar_1_url,
            cot_live_aadhaar_2_url: row.cot_live_aadhaar_2_url,
            created_by: row.created_by,
            created_at: row.customer_created_at,
            updated_at: row.customer_updated_at,
            transaction_information: row.transaction_id ? {
                id: row.transaction_id,
                total_amount: row.transaction_total_amount,
                paid_amount: row.transaction_paid_amount,
                remaining_amount: (row.transaction_total_amount || 0) - (row.transaction_paid_amount || 0),
                amount_submitted_details: row.transaction_amount_submitted_details,
                amount_submitted_images_url: row.transaction_amount_submitted_images_url,
                created_at: row.transaction_created_at,
                updated_at: row.transaction_updated_at
            } : null
        }
    };

    return task;
}

function validateRequiredFields(data) {
    const required = ['work', 'work_type', 'assigned_to_id', 'registered_customer_id'];

    for (const field of required) {
        if (!data[field] && data[field] !== 0) {
            const err = new Error(`${field} is required`);
            err.status = 400;
            throw err;
        }
    }
}

async function list(filters = {}) {
    const { page = 1, limit = 50, status, assigned_to_id, customer_id, work_type } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status && VALID_STATUSES.includes(status)) {
        whereConditions.push('t.status = ?');
        params.push(status);
    }

    if (assigned_to_id) {
        whereConditions.push('t.assigned_to_id = ?');
        params.push(assigned_to_id);
    }

    if (customer_id) {
        whereConditions.push('t.registered_customer_id = ?');
        params.push(customer_id);
    }

    if (work_type) {
        whereConditions.push('t.work_type = ?');
        params.push(work_type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM tasks t ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = countResult[0].total;

    const query = `
    SELECT 
      t.*,
      rc.id as customer_id,
      rc.applicant_name,
      rc.mobile_number,
      rc.email_id,
      rc.solar_plant_type,
      rc.solar_system_type,
      rc.plant_category,
      rc.plant_size_kw,
      rc.plant_price,
      rc.district,
      rc.installation_pincode,
      rc.site_address,
      rc.site_latitude,
      rc.site_longitude,
      rc.meter_type,
      rc.name_correction_required,
      rc.correct_name,
      rc.load_enhancement_required,
      rc.current_load,
      rc.required_load,
      rc.cot_required,
      rc.cot_type,
      rc.cot_documents,
      rc.payment_mode,
      rc.advance_payment_mode,
      rc.upi_type,
      rc.margin_money,
      rc.special_finance_required,
      rc.building_floor_number,
      rc.structure_type,
      rc.structure_length,
      rc.structure_height,
      rc.free_shadow_area,
      rc.installation_date_feasible,
      rc.application_status,
      rc.aadhaar_front_url,
      rc.aadhaar_back_url,
      rc.pan_card_url,
      rc.electric_bill_url,
      rc.smart_meter_doc_url,
      rc.cancel_cheque_url,
      rc.bank_details_doc_url,
      rc.cot_death_certificate_url,
      rc.cot_house_papers_url,
      rc.cot_passport_photo_url,
      rc.cot_family_registration_url,
      rc.cot_aadhaar_photos_urls,
      rc.cot_live_aadhaar_1_url,
      rc.cot_live_aadhaar_2_url,
      rc.created_by,
      rc.created_at as customer_created_at,
      rc.updated_at as customer_updated_at,
      tl.id as transaction_id,
      tl.total_amount as transaction_total_amount,
      tl.paid_amount as transaction_paid_amount,
      tl.amount_submitted_details as transaction_amount_submitted_details,
      tl.amount_submitted_images_url as transaction_amount_submitted_images_url,
      tl.created_at as transaction_created_at,
      tl.updated_at as transaction_updated_at
    FROM tasks t
    LEFT JOIN registered_customers rc ON t.registered_customer_id = rc.id
    LEFT JOIN transaction_logs tl ON rc.id = tl.registered_customer_id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

    const rows = await db.query(query, [...params, limit, offset]);
    const structuredData = rows.map(structureTaskWithCustomerData);

    return {
        data: structuredData,
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
    SELECT 
      t.*,
      rc.id as customer_id,
      rc.applicant_name,
      rc.mobile_number,
      rc.email_id,
      rc.solar_plant_type,
      rc.solar_system_type,
      rc.plant_category,
      rc.plant_size_kw,
      rc.plant_price,
      rc.district,
      rc.installation_pincode,
      rc.site_address,
      rc.site_latitude,
      rc.site_longitude,
      rc.meter_type,
      rc.name_correction_required,
      rc.correct_name,
      rc.load_enhancement_required,
      rc.current_load,
      rc.required_load,
      rc.cot_required,
      rc.cot_type,
      rc.cot_documents,
      rc.payment_mode,
      rc.advance_payment_mode,
      rc.upi_type,
      rc.margin_money,
      rc.special_finance_required,
      rc.building_floor_number,
      rc.structure_type,
      rc.structure_length,
      rc.structure_height,
      rc.free_shadow_area,
      rc.installation_date_feasible,
      rc.application_status,
      rc.aadhaar_front_url,
      rc.aadhaar_back_url,
      rc.pan_card_url,
      rc.electric_bill_url,
      rc.smart_meter_doc_url,
      rc.cancel_cheque_url,
      rc.bank_details_doc_url,
      rc.cot_death_certificate_url,
      rc.cot_house_papers_url,
      rc.cot_passport_photo_url,
      rc.cot_family_registration_url,
      rc.cot_aadhaar_photos_urls,
      rc.cot_live_aadhaar_1_url,
      rc.cot_live_aadhaar_2_url,
      rc.created_by,
      rc.created_at as customer_created_at,
      rc.updated_at as customer_updated_at,
      tl.id as transaction_id,
      tl.total_amount as transaction_total_amount,
      tl.paid_amount as transaction_paid_amount,
      tl.amount_submitted_details as transaction_amount_submitted_details,
      tl.amount_submitted_images_url as transaction_amount_submitted_images_url,
      tl.created_at as transaction_created_at,
      tl.updated_at as transaction_updated_at
    FROM tasks t
    LEFT JOIN registered_customers rc ON t.registered_customer_id = rc.id
    LEFT JOIN transaction_logs tl ON rc.id = tl.registered_customer_id
    WHERE t.id = ?
  `;
    const rows = await db.query(query, [id]);
    return structureTaskWithCustomerData(rows[0]);
}

async function create(data) {
    validateRequiredFields(data);

    // Validate employee exists
    const employee = await db.query('SELECT id, name, employee_role FROM employees WHERE id = ?', [data.assigned_to_id]);
    if (employee.length === 0) {
        const err = new Error('Invalid assigned_to_id: Employee not found');
        err.status = 400;
        throw err;
    }

    // Validate customer exists
    const customer = await db.query('SELECT id FROM registered_customers WHERE id = ?', [data.registered_customer_id]);
    if (customer.length === 0) {
        const err = new Error('Invalid registered_customer_id: Customer not found');
        err.status = 400;
        throw err;
    }

    // Check if task already exists for this customer, work_type, and employee
    const existingTask = await db.query(
        'SELECT id FROM tasks WHERE registered_customer_id = ? AND work_type = ? AND assigned_to_id = ?',
        [data.registered_customer_id, data.work_type, data.assigned_to_id]
    );
    if (existingTask.length > 0) {
        const err = new Error('Task already exists for this customer, work type, and employee');
        err.status = 409;
        throw err;
    }

    // Auto-populate employee details
    const emp = employee[0];
    const assigned_to_name = data.assigned_to_name || emp.name;
    const assigned_to_role = data.assigned_to_role || emp.employee_role;

    // Set defaults
    const status = data.status || 'pending';

    const query = `
    INSERT INTO tasks (
      work, work_type, status, 
      assigned_to_id, assigned_to_name, assigned_to_role,
      registered_customer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    const result = await db.query(query, [
        data.work,
        data.work_type,
        status,
        data.assigned_to_id,
        assigned_to_name,
        assigned_to_role,
        data.registered_customer_id
    ]);

    return getById(result.insertId);
}

async function validateDocumentRequirements(workType, customerId) {
    // Define document requirements for each task type
    const documentRequirements = {
        'finance_registration': {
            table: 'additional_documents',
            fields: ['finance_quotation_document', 'finance_digital_approval'],
            message: 'Finance documents (quotation and digital approval) must be uploaded before completing this task'
        },
        'complete_registration': {
            table: 'additional_documents',
            fields: ['application_form', 'feasibility_form', 'etoken_document', 'net_metering_document'],
            message: 'Registration documents (application form, feasibility form, e-token, and net metering) must be uploaded before completing this task'
        },
        'hard_copy_indent_creation': {
            table: 'additional_documents',
            fields: ['indent_document'],
            message: 'Indent document must be uploaded before completing this task'
        },
        'generate_bill': {
            table: 'additional_documents',
            fields: ['paybill_document'],
            message: 'Generated bill document must be uploaded before completing this task'
        },
        'approval_of_payment_collection': {
            table: 'transaction_logs',
            fields: ['amount_submitted_details', 'amount_submitted_images_url'],
            message: 'Payment details and proof images must be uploaded before completing this task',
            customValidation: async (customerId) => {
                const result = await db.query(
                    'SELECT amount_submitted_details, amount_submitted_images_url FROM transaction_logs WHERE registered_customer_id = ?',
                    [customerId]
                );
                if (result.length === 0) return false;

                const details = result[0].amount_submitted_details;
                const images = result[0].amount_submitted_images_url;

                // Check if JSON arrays exist and have content
                try {
                    const detailsArray = JSON.parse(details || '[]');
                    const imagesArray = JSON.parse(images || '[]');
                    return detailsArray.length > 0 && imagesArray.length > 0;
                } catch {
                    return false;
                }
            }
        },
        'plant_installation': {
            table: 'plant_installations',
            fields: ['date_of_installation', 'photo_taker_employee_id'],
            message: 'Plant installation details (date and photo taker) must be recorded before completing this task'
        }
    };

    const requirement = documentRequirements[workType];
    if (!requirement) {
        // No document requirement for this work type
        return { valid: true };
    }

    // Custom validation if specified
    if (requirement.customValidation) {
        const isValid = await requirement.customValidation(customerId);
        if (!isValid) {
            const err = new Error(requirement.message);
            err.status = 400;
            return { valid: false, error: err };
        }
        return { valid: true };
    }

    // Standard field validation
    const fields = requirement.fields.map(f => `${f} IS NOT NULL AND ${f} != ''`).join(' AND ');
    const query = `SELECT id FROM ${requirement.table} WHERE registered_customer_id = ? AND ${fields}`;

    const result = await db.query(query, [customerId]);

    if (result.length === 0) {
        const err = new Error(requirement.message);
        err.status = 400;
        return { valid: false, error: err };
    }

    return { valid: true };
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Task not found');
        err.status = 404;
        throw err;
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;

    // Validate status transition if status is being changed
    if (updateData.status && updateData.status !== existing.status) {
        const validation = validateStatusTransition(existing.status, updateData.status);
        if (!validation.valid) {
            throw validation.error;
        }

        // Validate document requirements before marking as completed
        if (updateData.status === 'completed') {
            const docValidation = await validateDocumentRequirements(
                existing.work_type,
                existing.registered_customer_id
            );
            if (!docValidation.valid) {
                throw docValidation.error;
            }
        }
    }

    // If assigned_to_id is changed, update name and role
    if (updateData.assigned_to_id && updateData.assigned_to_id !== existing.assigned_to_id) {
        const employee = await db.query('SELECT name, employee_role FROM employees WHERE id = ?', [updateData.assigned_to_id]);
        if (employee.length === 0) {
            const err = new Error('Invalid assigned_to_id: Employee not found');
            err.status = 400;
            throw err;
        }
        updateData.assigned_to_name = employee[0].name;
        updateData.assigned_to_role = employee[0].employee_role;
    }

    if (Object.keys(updateData).length === 0) {
        return getById(id);
    }

    const fields = Object.keys(updateData);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const query = `UPDATE tasks SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);

    const updatedTask = await getById(id);

    // ✅ NEW: Trigger next task creation workflow when task is marked completed
    const wasCompleting = existing.status !== 'completed' && updateData.status === 'completed';
    if (wasCompleting) {
        const logger = require('../utils/logger');
        try {
            const identifyNextTaskCall = require('../utils/IdentifyNextTaskCall');

            // Get next task details asynchronously (non-blocking)
            identifyNextTaskCall.getNextTaskDetails(existing.work_type, {
                customerId: existing.registered_customer_id,
                customer: existing.registered_customer_data
            }).then(nextTaskInfo => {
                if (nextTaskInfo.success && nextTaskInfo.nextWorkType) {
                    logger.info(`Next task identified: ${nextTaskInfo.nextWorkType} for customer ${existing.registered_customer_id}`);
                    // Could emit event here or queue for background processing
                }
            }).catch(err => {
                logger.error(`Error identifying next task for ${existing.work_type}: ${err.message}`);
            });
        } catch (err) {
            logger.error(`Workflow trigger failed: ${err.message}`);
            // Don't throw - don't block the response if workflow fails
        }
    }

    return updatedTask;
}

async function partialUpdate(id, data) {
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Task not found');
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
    SELECT 
      t.*,
      rc.id as customer_id,
      rc.applicant_name,
      rc.mobile_number,
      rc.email_id,
      rc.solar_plant_type,
      rc.solar_system_type,
      rc.plant_category,
      rc.plant_size_kw,
      rc.plant_price,
      rc.district,
      rc.installation_pincode,
      rc.site_address,
      rc.site_latitude,
      rc.site_longitude,
      rc.meter_type,
      rc.name_correction_required,
      rc.correct_name,
      rc.load_enhancement_required,
      rc.current_load,
      rc.required_load,
      rc.cot_required,
      rc.cot_type,
      rc.cot_documents,
      rc.payment_mode,
      rc.advance_payment_mode,
      rc.upi_type,
      rc.margin_money,
      rc.special_finance_required,
      rc.building_floor_number,
      rc.structure_type,
      rc.structure_length,
      rc.structure_height,
      rc.free_shadow_area,
      rc.installation_date_feasible,
      rc.application_status,
      rc.aadhaar_front_url,
      rc.aadhaar_back_url,
      rc.pan_card_url,
      rc.electric_bill_url,
      rc.smart_meter_doc_url,
      rc.cancel_cheque_url,
      rc.bank_details_doc_url,
      rc.cot_death_certificate_url,
      rc.cot_house_papers_url,
      rc.cot_passport_photo_url,
      rc.cot_family_registration_url,
      rc.cot_aadhaar_photos_urls,
      rc.cot_live_aadhaar_1_url,
      rc.cot_live_aadhaar_2_url,
      rc.created_by,
      rc.created_at as customer_created_at,
      rc.updated_at as customer_updated_at,
      tl.id as transaction_id,
      tl.total_amount as transaction_total_amount,
      tl.paid_amount as transaction_paid_amount,
      tl.amount_submitted_details as transaction_amount_submitted_details,
      tl.amount_submitted_images_url as transaction_amount_submitted_images_url,
      tl.created_at as transaction_created_at,
      tl.updated_at as transaction_updated_at
    FROM tasks t
    LEFT JOIN registered_customers rc ON t.registered_customer_id = rc.id
    LEFT JOIN transaction_logs tl ON rc.id = tl.registered_customer_id
    WHERE t.status = ?
    ORDER BY t.created_at DESC
  `;
    const rows = await db.query(query, [status]);
    return rows.map(structureTaskWithCustomerData);
}

async function getByEmployee(employeeId) {
    const query = `
    SELECT 
      t.*,
      rc.id as customer_id,
      rc.applicant_name,
      rc.mobile_number,
      rc.email_id,
      rc.solar_plant_type,
      rc.solar_system_type,
      rc.plant_category,
      rc.plant_size_kw,
      rc.plant_price,
      rc.district,
      rc.installation_pincode,
      rc.site_address,
      rc.site_latitude,
      rc.site_longitude,
      rc.meter_type,
      rc.name_correction_required,
      rc.correct_name,
      rc.load_enhancement_required,
      rc.current_load,
      rc.required_load,
      rc.cot_required,
      rc.cot_type,
      rc.cot_documents,
      rc.payment_mode,
      rc.advance_payment_mode,
      rc.upi_type,
      rc.margin_money,
      rc.special_finance_required,
      rc.building_floor_number,
      rc.structure_type,
      rc.structure_length,
      rc.structure_height,
      rc.free_shadow_area,
      rc.installation_date_feasible,
      rc.application_status,
      rc.aadhaar_front_url,
      rc.aadhaar_back_url,
      rc.pan_card_url,
      rc.electric_bill_url,
      rc.smart_meter_doc_url,
      rc.cancel_cheque_url,
      rc.bank_details_doc_url,
      rc.cot_death_certificate_url,
      rc.cot_house_papers_url,
      rc.cot_passport_photo_url,
      rc.cot_family_registration_url,
      rc.cot_aadhaar_photos_urls,
      rc.cot_live_aadhaar_1_url,
      rc.cot_live_aadhaar_2_url,
      rc.created_by,
      rc.created_at as customer_created_at,
      rc.updated_at as customer_updated_at,
      tl.id as transaction_id,
      tl.total_amount as transaction_total_amount,
      tl.paid_amount as transaction_paid_amount,
      tl.amount_submitted_details as transaction_amount_submitted_details,
      tl.amount_submitted_images_url as transaction_amount_submitted_images_url,
      tl.created_at as transaction_created_at,
      tl.updated_at as transaction_updated_at
    FROM tasks t
    LEFT JOIN registered_customers rc ON t.registered_customer_id = rc.id
    LEFT JOIN transaction_logs tl ON rc.id = tl.registered_customer_id
    WHERE t.assigned_to_id = ?
    ORDER BY t.created_at DESC
  `;
    const rows = await db.query(query, [employeeId]);
    return rows.map(structureTaskWithCustomerData);
}

async function getByCustomer(customerId) {
    const query = `
    SELECT 
      t.*,
      rc.id as customer_id,
      rc.applicant_name,
      rc.mobile_number,
      rc.email_id,
      rc.solar_plant_type,
      rc.solar_system_type,
      rc.plant_category,
      rc.plant_size_kw,
      rc.plant_price,
      rc.district,
      rc.installation_pincode,
      rc.site_address,
      rc.site_latitude,
      rc.site_longitude,
      rc.meter_type,
      rc.name_correction_required,
      rc.correct_name,
      rc.load_enhancement_required,
      rc.current_load,
      rc.required_load,
      rc.cot_required,
      rc.cot_type,
      rc.cot_documents,
      rc.payment_mode,
      rc.advance_payment_mode,
      rc.upi_type,
      rc.margin_money,
      rc.special_finance_required,
      rc.building_floor_number,
      rc.structure_type,
      rc.structure_length,
      rc.structure_height,
      rc.free_shadow_area,
      rc.installation_date_feasible,
      rc.application_status,
      rc.aadhaar_front_url,
      rc.aadhaar_back_url,
      rc.pan_card_url,
      rc.electric_bill_url,
      rc.smart_meter_doc_url,
      rc.cancel_cheque_url,
      rc.bank_details_doc_url,
      rc.cot_death_certificate_url,
      rc.cot_house_papers_url,
      rc.cot_passport_photo_url,
      rc.cot_family_registration_url,
      rc.cot_aadhaar_photos_urls,
      rc.cot_live_aadhaar_1_url,
      rc.cot_live_aadhaar_2_url,
      rc.created_by,
      rc.created_at as customer_created_at,
      rc.updated_at as customer_updated_at,
      tl.id as transaction_id,
      tl.total_amount as transaction_total_amount,
      tl.paid_amount as transaction_paid_amount,
      tl.amount_submitted_details as transaction_amount_submitted_details,
      tl.amount_submitted_images_url as transaction_amount_submitted_images_url,
      tl.created_at as transaction_created_at,
      tl.updated_at as transaction_updated_at
    FROM tasks t
    LEFT JOIN registered_customers rc ON t.registered_customer_id = rc.id
    LEFT JOIN transaction_logs tl ON rc.id = tl.registered_customer_id
    WHERE t.registered_customer_id = ?
    ORDER BY t.created_at DESC
  `;
    const rows = await db.query(query, [customerId]);
    return rows.map(structureTaskWithCustomerData);
}

async function createNextTasksInWorkflow(completedWorkType, registeredCustomerId, customerData, loggedInUser) {
    // Delegate to TaskWorkflowAutomation utility
    const TaskWorkflowAutomation = require('../utils/TaskWorkflowAutomation');
    return TaskWorkflowAutomation.createNextTasksInWorkflow(
        completedWorkType,
        registeredCustomerId,
        customerData,
        loggedInUser
    );
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByStatus,
    getByEmployee,
    getByCustomer,
    createNextTasksInWorkflow
};
