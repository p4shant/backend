const registeredCustomerService = require('../services/registeredCustomerService');
const employeeService = require('../services/employeeService');
// taskService imported inside functions to avoid circular dependency

async function buildTaskPayload(work_type, registered_customer_id, assigned_to_id) {
    if (!registered_customer_id || !assigned_to_id) {
        const err = new Error('registered_customer_id and assigned_to_id are required');
        err.status = 400;
        throw err;
    }

    const customer = await registeredCustomerService.getById(Number(registered_customer_id));
    if (!customer) {
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
    }

    const employee = await employeeService.getById(Number(assigned_to_id));
    if (!employee) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    const work = `${work_type.replace(/_/g, ' ')} for ${customer.applicant_name || 'customer'} (Mobile: ${customer.mobile_number || 'unknown'}) in ${customer.district || 'district unknown'}`;

    return {
        work,
        work_type,
        status: 'pending',
        assigned_to_id: employee.id,
        assigned_to_name: employee.name,
        assigned_to_role: employee.employee_role,
        registered_customer_id: customer.id,
    };
}

async function createTaskForWorkType(work_type, registered_customer_id, assigned_to_id) {
    const taskService = require('../services/taskService'); // Import inside function
    const payload = await buildTaskPayload(work_type, registered_customer_id, assigned_to_id);
    return taskService.create(payload);
}

// Specific task creators
async function createCustomerDataGatheringTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('customer_data_gathering', registered_customer_id, assigned_to_id);
}

async function createCollectRemainingAmountTask(registered_customer_id, assigned_to_id) {
    // Check payment_mode - only create task if payment_mode is not 'Finance'
    const customer = await registeredCustomerService.getById(Number(registered_customer_id));
    if (!customer) {
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
    }

    // Skip task creation if payment_mode is 'Finance'
    if (customer.payment_mode === 'Finance') {
        return null; // No task needed for Finance payment mode
    }

    return createTaskForWorkType('collect_remaining_amount', registered_customer_id, assigned_to_id);
}

async function createCompleteRegistrationTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('complete_registration', registered_customer_id, assigned_to_id);
}

async function createCotRequestTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('cot_request', registered_customer_id, assigned_to_id);
}

async function createLoadRequestTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('load_request', registered_customer_id, assigned_to_id);
}

async function createNameCorrectionRequestTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('name_correction_request', registered_customer_id, assigned_to_id);
}

// Finance related
async function createFinanceRegistrationTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('finance_registration', registered_customer_id, assigned_to_id);
}

async function createSubmitFinanceToBankTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('submit_finance_to_bank', registered_customer_id, assigned_to_id);
}

async function createApprovalOfPaymentCollectionTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('approval_of_payment_collection', registered_customer_id, assigned_to_id);
}

async function createApprovalOfPlantInstallationTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('approval_of_plant_installation', registered_customer_id, assigned_to_id);
}

// indent / permissions
async function createHardCopyindentCreationTask(registered_customer_id, assigned_to_id) {
    const taskService = require('../services/taskService'); // Import inside function

    // Get all tasks for this customer
    const customerTasks = await taskService.getByCustomer(Number(registered_customer_id));

    // Check if hard_copy_indent_creation task already exists
    const existingIndentTask = customerTasks.find(t => t.work_type === 'hard_copy_indent_creation');
    if (existingIndentTask) {
        return null; // Task already exists, don't create duplicate
    }

    // Check if complete_registration is completed
    const completeRegistrationTask = customerTasks.find(t => t.work_type === 'complete_registration');
    if (!completeRegistrationTask || completeRegistrationTask.status !== 'completed') {
        return null; // complete_registration not yet completed
    }

    // Check conditional tasks (cot_request, load_request, name_correction_request)
    const conditionalTasks = customerTasks.filter(t =>
        ['cot_request', 'load_request', 'name_correction_request'].includes(t.work_type)
    );

    // If conditional tasks exist, check if all are completed
    if (conditionalTasks.length > 0) {
        const allConditionalTasksCompleted = conditionalTasks.every(t => t.status === 'completed');
        if (!allConditionalTasksCompleted) {
            return null; // Some conditional tasks are still pending
        }
    }

    // All conditions met - create the task
    return createTaskForWorkType('hard_copy_indent_creation', registered_customer_id, assigned_to_id);
}

async function createSubmitindentToElectricalDeptTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('submit_indent_to_electrical_department', registered_customer_id, assigned_to_id);
}

// Installation and metering
async function createMeterInstallationTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('meter_installation', registered_customer_id, assigned_to_id);
}

async function createPlantInstallationTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('plant_installation', registered_customer_id, assigned_to_id);
}

// Billing / docs
async function createGenerateBillTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('generate_bill', registered_customer_id, assigned_to_id);
}

async function createCdrTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('create_cdr', registered_customer_id, assigned_to_id);
}

async function createTakeInstalledItemPhotosTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('take_installed_item_photos', registered_customer_id, assigned_to_id);
}

async function createUploadInstalledItemSerialNumberTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('upload_installed_item_serial_number', registered_customer_id, assigned_to_id);
}

// QA / inspection / subsidy
async function createInspectionTask(registered_customer_id, assigned_to_id) {
    const taskService = require('../services/taskService'); // Import inside function

    // Get all tasks for this customer
    const customerTasks = await taskService.getByCustomer(Number(registered_customer_id));

    // Check if inspection task already exists
    const existingInspectionTask = customerTasks.find(t => t.work_type === 'inspection');
    if (existingInspectionTask) {
        return null; // Task already exists, don't create duplicate
    }

    // Check if both required tasks exist and are completed
    const uploadSerialNumberTask = customerTasks.find(t => t.work_type === 'upload_installed_item_serial_number');
    const meterInstallationTask = customerTasks.find(t => t.work_type === 'meter_installation');

    // Both tasks must exist and be completed
    const uploadCompleted = uploadSerialNumberTask && uploadSerialNumberTask.status === 'completed';
    const meterCompleted = meterInstallationTask && meterInstallationTask.status === 'completed';

    if (!uploadCompleted || !meterCompleted) {
        return null; // Both tasks must be completed
    }

    // All conditions met - create the task
    return createTaskForWorkType('inspection', registered_customer_id, assigned_to_id);
}

async function createApplySubsidyTask(registered_customer_id, assigned_to_id) {
    const taskService = require('../services/taskService'); // Import inside function

    // Get all tasks for this customer
    const customerTasks = await taskService.getByCustomer(Number(registered_customer_id));

    // Check if apply_subsidy task already exists
    const existingApplySubsidyTask = customerTasks.find(t => t.work_type === 'apply_subsidy');
    if (existingApplySubsidyTask) {
        return null; // Task already exists, don't create duplicate
    }

    // Check if both required tasks exist and are completed
    const createCdrTask = customerTasks.find(t => t.work_type === 'create_cdr');
    const inspectionTask = customerTasks.find(t => t.work_type === 'inspection');

    // Both tasks must exist and be completed
    const cdrCompleted = createCdrTask && createCdrTask.status === 'completed';
    const inspectionCompleted = inspectionTask && inspectionTask.status === 'completed';

    if (!cdrCompleted || !inspectionCompleted) {
        return null; // Both tasks must be completed
    }

    // All conditions met - create the task
    return createTaskForWorkType('apply_subsidy', registered_customer_id, assigned_to_id);
}

async function createSubsidyRedemptionTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('subsidy_redemption', registered_customer_id, assigned_to_id);
}

async function createDocumentHandoverTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('document_handover', registered_customer_id, assigned_to_id);
}

async function createQualityAssuranceTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('quality_assurance', registered_customer_id, assigned_to_id);
}

async function createSubmitWarrantyDocumentTask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('submit_warranty_document', registered_customer_id, assigned_to_id);
}

async function createAssignQATask(registered_customer_id, assigned_to_id) {
    return createTaskForWorkType('assign_qa', registered_customer_id, assigned_to_id);
}

module.exports = {
    createCustomerDataGatheringTask,
    createCollectRemainingAmountTask,
    createCompleteRegistrationTask,
    createCotRequestTask,
    createLoadRequestTask,
    createNameCorrectionRequestTask,
    createFinanceRegistrationTask,
    createSubmitFinanceToBankTask,
    createHardCopyindentCreationTask,
    createSubmitindentToElectricalDeptTask,
    createMeterInstallationTask,
    createPlantInstallationTask,
    createGenerateBillTask,
    createCdrTask,
    createTakeInstalledItemPhotosTask,
    createUploadInstalledItemSerialNumberTask,
    createInspectionTask,
    createApplySubsidyTask,
    createSubsidyRedemptionTask,
    createDocumentHandoverTask,
    createQualityAssuranceTask,
    createSubmitWarrantyDocumentTask,
    createApprovalOfPaymentCollectionTask,
    createApprovalOfPlantInstallationTask,
    createAssignQATask
};
