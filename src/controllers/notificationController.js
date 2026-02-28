const notificationService = require('../services/notificationService');

/**
 * List all notifications with filters
 */
async function list(req, res) {
    try {
        const { page = 1, limit = 50, employee_id, is_read, is_archived, notification_type, priority } = req.query;
        const filters = {
            page: Number(page),
            limit: Number(limit),
            employee_id: employee_id ? Number(employee_id) : req.user?.id,
            is_read: is_read !== undefined ? is_read === 'true' : undefined,
            is_archived: is_archived !== undefined ? is_archived === 'true' : undefined,
            notification_type,
            priority
        };

        const result = await notificationService.list(filters);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch notifications' });
    }
}

/**
 * Get notification by ID
 */
async function getById(req, res) {
    try {
        const notification = await notificationService.getById(Number(req.params.id));
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.json(notification);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch notification' });
    }
}

/**
 * Get all notifications for logged-in employee
 */
async function getByEmployeeId(req, res) {
    try {
        const employee_id = Number(req.params.employee_id) || req.user?.id;
        if (!employee_id) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        const notifications = await notificationService.getByEmployeeId(employee_id);
        return res.json(notifications);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch notifications' });
    }
}

/**
 * Create a new notification
 */
async function create(req, res) {
    try {
        const notification = await notificationService.create(req.body);
        return res.status(201).json(notification);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to create notification' });
    }
}

/**
 * Update notification
 */
async function update(req, res) {
    try {
        const notification = await notificationService.update(Number(req.params.id), req.body);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.json(notification);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update notification' });
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res) {
    try {
        const notification = await notificationService.markAsRead(Number(req.params.id));
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.json({ message: 'Notification marked as read', notification });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to mark notification as read' });
    }
}

/**
 * Mark notification as unread
 */
async function markAsUnread(req, res) {
    try {
        const notification = await notificationService.markAsUnread(Number(req.params.id));
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.json({ message: 'Notification marked as unread', notification });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to mark notification as unread' });
    }
}

/**
 * Mark notification as archived
 */
async function markAsArchived(req, res) {
    try {
        const notification = await notificationService.markAsArchived(Number(req.params.id));
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        return res.json({ message: 'Notification archived', notification });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to archive notification' });
    }
}

/**
 * Mark multiple notifications as read
 */
async function markMultipleAsRead(req, res) {
    try {
        const { notification_ids } = req.body;
        const result = await notificationService.markMultipleAsRead(notification_ids);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to mark notifications as read' });
    }
}

/**
 * Delete notification
 */
async function remove(req, res) {
    try {
        const result = await notificationService.delete(Number(req.params.id));
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete notification' });
    }
}

/**
 * Get unread count for logged-in employee
 */
async function getUnreadCount(req, res) {
    try {
        const employee_id = Number(req.params.employee_id) || req.user?.id;
        if (!employee_id) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        const count = await notificationService.getUnreadCount(employee_id);
        return res.json({ unread_count: count });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch unread count' });
    }
}

/**
 * Send attendance reminder to all employees
 * This should be called by a scheduler/cron job daily
 */
async function sendAttendanceReminder(req, res) {
    try {
        const { message } = req.body;
        const result = await notificationService.sendAttendanceReminder(message);
        return res.status(201).json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to send attendance reminders' });
    }
}

/**
 * Send punch-out reminders to employees who forgot to punch out
 */
async function sendForgotPunchOutReminder(req, res) {
    try {
        const { message } = req.body;
        const result = await notificationService.sendForgotPunchOutReminders(message);
        return res.status(201).json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to send punch-out reminders' });
    }
}

/**
 * Send evening login notifications to all employees
 */
async function sendEveningNotifications(req, res) {
    try {
        const { message } = req.body;
        const result = await notificationService.sendEveningLoginNotifications(message);
        return res.status(201).json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to send evening notifications' });
    }
}

/**
 * Clear old archived notifications
 */
async function clearOldNotifications(req, res) {
    try {
        const { days = 30 } = req.body;
        const result = await notificationService.clearOldNotifications(days);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to clear old notifications' });
    }
}

module.exports = {
    list,
    getById,
    getByEmployeeId,
    create,
    update,
    markAsRead,
    markAsUnread,
    markAsArchived,
    markMultipleAsRead,
    remove,
    getUnreadCount,
    sendAttendanceReminder,
    sendForgotPunchOutReminder,
    sendEveningNotifications,
    clearOldNotifications
};
