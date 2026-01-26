// Task Creation Service Integration
// This shows how to connect IdentifyNextTaskCall with actual task creation

const identifyNextTaskCall = require('./IdentifyNextTaskCall');
const Tasks = require('./Tasks');
const logger = require('./logger');

/**
 * Create Next Task Automatically
 * 
 * This function should be called after identifying the next task
 * It uses the function name from workflow config to create the task
 */
async function createNextTaskAutomatically(completedTaskId, workflowInfo, registeredCustomerId) {
    try {
        // Validate workflow info
        if (!workflowInfo.success) {
            logger.warn(`Workflow not successful for task ${completedTaskId}`);
            return null;
        }

        // Terminal task - nothing to create
        if (workflowInfo.isTerminal || !workflowInfo.nextWorkType) {
            logger.info(`Terminal task reached: ${completedTaskId}`);
            return null;
        }

        // Parallel tasks
        if (workflowInfo.parallelTasks && workflowInfo.parallelTasks.length > 0) {
            const createdTasks = [];

            for (const parallelTask of workflowInfo.parallelTasks) {
                try {
                    const task = await createSingleTask(
                        parallelTask.functionName,
                        registeredCustomerId,
                        parallelTask.assignedToId,
                        parallelTask.nextWorkType
                    );

                    createdTasks.push({
                        success: true,
                        workType: parallelTask.nextWorkType,
                        taskId: task.id,
                        assignedTo: task.assigned_to_name
                    });

                    logger.info(`Created parallel task: ${parallelTask.nextWorkType} (ID: ${task.id})`);
                } catch (err) {
                    logger.error(`Failed to create parallel task ${parallelTask.nextWorkType}: ${err.message}`);
                    createdTasks.push({
                        success: false,
                        workType: parallelTask.nextWorkType,
                        error: err.message
                    });
                }
            }

            return createdTasks;
        }

        // Single next task
        if (workflowInfo.functionName && workflowInfo.assignedToId) {
            const task = await createSingleTask(
                workflowInfo.functionName,
                registeredCustomerId,
                workflowInfo.assignedToId,
                workflowInfo.nextWorkType
            );

            logger.info(`Created next task: ${workflowInfo.nextWorkType} (ID: ${task.id})`);

            return {
                success: true,
                workType: workflowInfo.nextWorkType,
                taskId: task.id,
                assignedTo: task.assigned_to_name,
                createdFrom: workflowInfo.createdFromWorkType
            };
        }

        // Conditions not met - can't create yet
        if (workflowInfo.conditionsNotMet) {
            logger.info(`Conditions not met for ${workflowInfo.nextWorkType}. Task not created yet.`);
            return {
                success: true,
                pending: true,
                workType: workflowInfo.nextWorkType,
                message: 'Waiting for conditions to be met'
            };
        }

        logger.warn(`No task creation info available in workflow`);
        return null;

    } catch (err) {
        logger.error(`Error creating next task: ${err.message}`);
        throw err;
    }
}

/**
 * Create Single Task
 * 
 * @param {string} functionName - Function name from Tasks.js (e.g., 'createPlantInstallationTask')
 * @param {number} registeredCustomerId - Customer ID
 * @param {number} assignedToId - Employee ID
 * @param {string} workType - Work type (for logging)
 * @returns {Promise<object>} Created task
 */
async function createSingleTask(functionName, registeredCustomerId, assignedToId, workType) {
    try {
        // Validate inputs
        if (!functionName || !registeredCustomerId || !assignedToId) {
            throw new Error(`Invalid inputs: functionName=${functionName}, customerId=${registeredCustomerId}, employeeId=${assignedToId}`);
        }

        // Get the function from Tasks.js
        const taskFunction = Tasks[functionName];

        if (!taskFunction || typeof taskFunction !== 'function') {
            throw new Error(`Task function not found: ${functionName}`);
        }

        // Call the function to create the task
        const task = await taskFunction(registeredCustomerId, assignedToId);

        if (!task || !task.id) {
            throw new Error(`Task creation returned invalid result`);
        }

        return task;

    } catch (err) {
        logger.error(`Error in createSingleTask for ${workType}: ${err.message}`);
        throw err;
    }
}

/**
 * Complete Task Workflow Handler
 * 
 * This is the main entry point for creating next tasks
 * Call this when a task status changes to 'completed'
 * 
 * @param {number} completedTaskId - ID of the completed task
 * @param {string} completedWorkType - work_type of the completed task
 * @param {number} registeredCustomerId - Customer ID
 * @param {object} context - Additional context for conditions (customer data, etc.)
 * @returns {Promise<object>} Result with created tasks
 */
async function handleTaskCompletion(completedTaskId, completedWorkType, registeredCustomerId, context = {}) {
    try {
        logger.info(`Handling completion of task ${completedTaskId} (${completedWorkType})`);

        // Step 1: Identify next task
        const workflowInfo = await identifyNextTaskCall.getNextTaskDetails(
            completedWorkType,
            context
        );

        logger.debug(`Workflow info: ${JSON.stringify(workflowInfo)}`);

        // Step 2: Create next task(s)
        const creationResult = await createNextTaskAutomatically(
            completedTaskId,
            workflowInfo,
            registeredCustomerId
        );

        return {
            success: true,
            completedTask: {
                id: completedTaskId,
                workType: completedWorkType
            },
            workflow: workflowInfo,
            createdTasks: creationResult
        };

    } catch (err) {
        logger.error(`Error handling task completion: ${err.message}`);
        return {
            success: false,
            error: err.message,
            completedTask: {
                id: completedTaskId,
                workType: completedWorkType
            }
        };
    }
}

module.exports = {
    createNextTaskAutomatically,
    createSingleTask,
    handleTaskCompletion
};
