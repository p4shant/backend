const taskService = require('../services/taskService');

async function list(req, res) {
    try {
        const { page = 1, limit = 50, status, assigned_to_id, customer_id, work_type } = req.query;
        const filters = {
            page: Number(page),
            limit: Number(limit),
            status,
            assigned_to_id: assigned_to_id ? Number(assigned_to_id) : undefined,
            customer_id: customer_id ? Number(customer_id) : undefined,
            work_type
        };
        const result = await taskService.list(filters);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch tasks' });
    }
}

async function getById(req, res) {
    try {
        const task = await taskService.getById(Number(req.params.id));
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        return res.json(task);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch task' });
    }
}

async function create(req, res) {
    try {
        const task = await taskService.create(req.body);
        return res.status(201).json(task);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to create task' });
    }
}

async function update(req, res) {
    try {
        const task = await taskService.update(Number(req.params.id), req.body);

        // If task was just completed, create next tasks in workflow
        if (req.body.status === 'completed' && task.status === 'completed') {
            try {
                // Use taskService to handle next task creation with proper assignment rules
                const workflowResult = await taskService.createNextTasksInWorkflow(
                    task.work_type,
                    task.registered_customer_id,
                    task.registered_customer_data,
                    req.user // Pass logged-in user for Sales Executive assignment
                );

                return res.json({
                    task,
                    workflow: workflowResult
                });
            } catch (err) {
                // If workflow creation fails, still return task but log the error
                return res.json({
                    task,
                    workflow: { error: 'Could not create next tasks', details: err.message }
                });
            }
        }

        return res.json(task);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update task' });
    }
}

async function partialUpdate(req, res) {
    try {
        const task = await taskService.partialUpdate(Number(req.params.id), req.body);

        // If task was just completed, create next tasks in workflow
        if (req.body.status === 'completed' && task.status === 'completed') {
            try {
                // Use taskService to handle next task creation with proper assignment rules
                const workflowResult = await taskService.createNextTasksInWorkflow(
                    task.work_type,
                    task.registered_customer_id,
                    task.registered_customer_data,
                    req.user // Pass logged-in user for Sales Executive assignment
                );

                return res.json({
                    task,
                    workflow: workflowResult
                });
            } catch (err) {
                // If workflow creation fails, still return task but log the error
                return res.json({
                    task,
                    workflow: { error: 'Could not create next tasks', details: err.message }
                });
            }
        }

        return res.json(task);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update task' });
    }
}

async function remove(req, res) {
    try {
        await taskService.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete task' });
    }
}

async function getByStatus(req, res) {
    try {
        const tasks = await taskService.getByStatus(req.params.status);
        return res.json(tasks);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch tasks' });
    }
}

async function getByEmployee(req, res) {
    try {
        const tasks = await taskService.getByEmployee(Number(req.params.employeeId));
        return res.json(tasks);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch tasks' });
    }
}

async function getByCustomer(req, res) {
    try {
        const tasks = await taskService.getByCustomer(Number(req.params.customerId));
        return res.json(tasks);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch tasks' });
    }
}

async function createReassignTask(req, res) {
    try {
        const { work, work_type, status, assigned_to_id, assigned_to_ids, assigned_to_name, assigned_to_role, registered_customer_id } = req.body;

        const normalizedAssigneeIds = Array.isArray(assigned_to_id)
            ? assigned_to_id
            : Array.isArray(assigned_to_ids)
                ? assigned_to_ids
                : [assigned_to_id];

        // Validate required fields
        if (!work || !work_type || !status || !normalizedAssigneeIds?.length || !assigned_to_name || !assigned_to_role || !registered_customer_id) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create task data
        const taskData = {
            work,
            work_type,
            status,
            assigned_to_id: normalizedAssigneeIds.map(Number),
            assigned_to_name,
            assigned_to_role,
            registered_customer_id: Number(registered_customer_id),
        };

        const task = await taskService.create(taskData);
        return res.status(201).json({ success: true, id: task.id, data: task });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || 'Unable to create reassignment task' });
    }
}

async function getReassignmentApprovals(req, res) {
    try {
        const tasks = await taskService.getReassignmentApprovals();
        return res.json({ success: true, data: tasks });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || 'Unable to fetch reassignment approval tasks' });
    }
}

async function handleReassignmentAction(req, res) {
    try {
        const taskId = Number(req.params.id);
        const { action } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action. Must be "approve" or "reject"' });
        }

        const result = await taskService.handleReassignmentAction(taskId, action, req.user);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || 'Unable to process reassignment action' });
    }
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
    createReassignTask,
    getReassignmentApprovals,
    handleReassignmentAction
};
