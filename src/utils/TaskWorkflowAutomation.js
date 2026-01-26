/**
 * Task Workflow Automation
 * Handles the logic to determine next tasks and assign them to appropriate employees
 */

const employeeService = require('../services/employeeService');
const Tasks = require('./Tasks');
const { NEXT_TASK_MAPPING } = require('./IdentifyNextTaskCall');
const { ROLE_ASSIGNMENTS } = require('../config/roleAssignments');
// taskService and logger imported inside functions to avoid circular dependency issues

/**
 * Get the employee ID to assign a task based on role and business rules
 * 
 * @param {string} requiredRole - The role needed (e.g., 'Electrician', 'System Admin')
 * @param {object} customerData - Registered customer data for district-based logic
 * @param {object} loggedInUser - Current logged-in user (for Sales Executive assignment)
 * @returns {Promise<number>} Employee ID to assign task to
 */
async function getEmployeeIdByRoleAndRules(requiredRole, customerData, loggedInUser) {
    const logger = require('./logger'); // Import inside function
    try {
        switch (requiredRole) {
            case 'System Admin':
                // Fixed assignment: Mohammad Bilal Ansari
                const systemAdmin = await employeeService.findByPhone(
                    ROLE_ASSIGNMENTS.SYSTEM_ADMIN.phone
                );
                if (systemAdmin) {
                    return systemAdmin.id;
                }
                logger.warn(`System Admin not found by phone ${ROLE_ASSIGNMENTS.SYSTEM_ADMIN.phone}`);
                // Fallback: get any system admin
                const sysAdmins = await employeeService.findByRole('System Admin');
                return sysAdmins.length > 0 ? sysAdmins[0].id : null;

            case 'Electrician':
                // Find electrician from same district as customer
                if (customerData && customerData.district) {
                    const electricians = await employeeService.findByRoleAndDistrict(
                        'Electrician',
                        customerData.district
                    );
                    if (electricians.length > 0) {
                        return electricians[0].id;
                    }
                    logger.warn(`No Electrician found in district: ${customerData.district}`);
                }
                // Fallback: get any electrician
                const allElectricians = await employeeService.findByRole('Electrician');
                return allElectricians.length > 0 ? allElectricians[0].id : null;

            case 'Operation Manager':
                // District-based assignment
                const customerDistrict = customerData && customerData.district ? customerData.district : null;
                const assignmentConfig = customerDistrict === 'Varanasi'
                    ? ROLE_ASSIGNMENTS.OPERATION_MANAGER.Varanasi
                    : ROLE_ASSIGNMENTS.OPERATION_MANAGER.default;

                const opManager = await employeeService.findByPhone(assignmentConfig.phone);
                if (opManager) {
                    return opManager.id;
                }
                logger.warn(`Operation Manager not found by phone ${assignmentConfig.phone}`);
                // Fallback: get any operation manager
                const opManagers = await employeeService.findByRole('Operation Manager');
                return opManagers.length > 0 ? opManagers[0].id : null;

            case 'Accountant':
                // Get any accountant
                const accountants = await employeeService.findByRole('Accountant');
                return accountants.length > 0 ? accountants[0].id : null;

            case 'Technician':
                // Get any technician
                const technicians = await employeeService.findByRole('Technician');
                return technicians.length > 0 ? technicians[0].id : null;

            case 'Technical Assistant':
                // Get any technical assistant
                const technicalAssistants = await employeeService.findByRole('Technical Assistant');
                return technicalAssistants.length > 0 ? technicalAssistants[0].id : null;

            case 'Sale Executive':
                // Use logged-in user
                if (loggedInUser && loggedInUser.id) {
                    return loggedInUser.id;
                }
                logger.warn('Sale Executive required but no logged-in user provided');
                // Fallback: get any sale executive
                const salesExecutives = await employeeService.findByRole('Sale Executive');
                return salesExecutives.length > 0 ? salesExecutives[0].id : null;

            case 'Master Admin':
                // Single Master Admin in DB
                const masterAdmin = await employeeService.findSingleByRole('Master Admin');
                return masterAdmin ? masterAdmin.id : null;

            case 'SFDC Admin':
                // Single SFDC Admin in DB
                const sfdcAdmin = await employeeService.findSingleByRole('SFDC Admin');
                return sfdcAdmin ? sfdcAdmin.id : null;

            default:
                logger.warn(`Unknown role: ${requiredRole}`);
                return null;
        }
    } catch (err) {
        logger.error(`Error getting employee ID for role ${requiredRole}: ${err.message}`);
        throw err;
    }
}

/**
 * Create next tasks in workflow when a task is completed
 * 
 * @param {string} completedWorkType - The work_type of the completed task
 * @param {number} registeredCustomerId - The customer ID
 * @param {object} customerData - Full customer data
 * @param {object} loggedInUser - Current logged-in user
 * @returns {Promise<object>} Result with created tasks and workflow info
 */
async function createNextTasksInWorkflow(completedWorkType, registeredCustomerId, customerData, loggedInUser) {
    const logger = require('./logger'); // Import inside function
    try {
        // Get task configuration from mapping
        const taskConfig = NEXT_TASK_MAPPING[completedWorkType];

        if (!taskConfig) {
            logger.warn(`No task configuration found for work_type: ${completedWorkType}`);
            return {
                success: false,
                message: 'No next task configured',
                tasksCreated: []
            };
        }

        // If this is a terminal task
        if (!taskConfig.nextWorkTypes || taskConfig.nextWorkTypes.length === 0) {
            return {
                success: true,
                message: 'Task completed - no automatic next task',
                tasksCreated: [],
                isTerminal: true
            };
        }

        // Create tasks for each next work type
        const createdTasks = [];
        const errors = [];

        for (const nextTask of taskConfig.nextWorkTypes) {
            try {
                // Get the employee to assign
                let assignedToId;

                // For Sale Executive, use the created_by from customerData (employee who registered the customer)
                if (nextTask.requiredRole === 'Sale Executive') {
                    if (customerData && customerData.created_by) {
                        assignedToId = customerData.created_by;
                    } else {
                        assignedToId = await getEmployeeIdByRoleAndRules(
                            nextTask.requiredRole,
                            customerData,
                            loggedInUser
                        );
                    }
                } else {
                    assignedToId = await getEmployeeIdByRoleAndRules(
                        nextTask.requiredRole,
                        customerData,
                        loggedInUser
                    );
                }

                if (!assignedToId) {
                    errors.push({
                        worktype: nextTask.worktype,
                        requiredRole: nextTask.requiredRole,
                        error: 'No available employee found for this role'
                    });
                    continue;
                }

                // Get the task creator function from Tasks.js
                const taskCreatorFunction = Tasks[nextTask.functionName];
                if (!taskCreatorFunction) {
                    errors.push({
                        worktype: nextTask.worktype,
                        error: `Function ${nextTask.functionName} not found in Tasks.js`
                    });
                    continue;
                }

                // Create the task
                const newTask = await taskCreatorFunction(registeredCustomerId, assignedToId);

                createdTasks.push({
                    worktype: nextTask.worktype,
                    taskId: newTask.id,
                    requiredRole: nextTask.requiredRole,
                    assignedToId: assignedToId
                });

                logger.info(`Created task: ${nextTask.worktype} (ID: ${newTask.id}) for customer ${registeredCustomerId}`);

            } catch (err) {
                errors.push({
                    worktype: nextTask.worktype,
                    error: err.message
                });
                logger.error(`Error creating task ${nextTask.worktype}: ${err.message}`);
            }
        }

        return {
            success: createdTasks.length > 0,
            message: `Created ${createdTasks.length} next task(s)`,
            tasksCreated: createdTasks,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (err) {
        logger.error(`Error in createNextTasksInWorkflow: ${err.message}`);
        throw err;
    }
}

module.exports = {
    getEmployeeIdByRoleAndRules,
    createNextTasksInWorkflow
};
