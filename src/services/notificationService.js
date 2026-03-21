const db = require('../config/db');
const pushService = require('./pushService');

class NotificationService {
    /**
     * List notifications with filters
     */
    async list(filters = {}) {
        const { page = 1, limit = 50, employee_id, is_read, is_archived, notification_type, priority } = filters;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM notifications WHERE 1=1';
        const params = [];

        if (employee_id) {
            query += ' AND employee_id = ?';
            params.push(employee_id);
        }

        if (is_read !== undefined) {
            query += ' AND is_read = ?';
            params.push(is_read ? 1 : 0);
        }

        if (is_archived !== undefined) {
            query += ' AND is_archived = ?';
            params.push(is_archived ? 1 : 0);
        }

        if (notification_type) {
            query += ' AND notification_type = ?';
            params.push(notification_type);
        }

        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }

        // Get total count
        const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as count');
        const countResult = await db.query(countQuery, params);
        const total = countResult[0]?.count || 0;

        // Get paginated results
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const notifications = await db.query(query, params);

        return {
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get notification by ID
     */
    async getById(id) {
        const query = 'SELECT * FROM notifications WHERE id = ?';
        const result = await db.query(query, [id]);
        return result[0] || null;
    }

    /**
     * Get all notifications for an employee (unread and unarchived)
     */
    async getByEmployeeId(employee_id) {
        const query = `
      SELECT * FROM notifications 
      WHERE employee_id = ? AND is_read = 0 AND is_archived = 0
      ORDER BY priority DESC, created_at DESC
    `;
        return await db.query(query, [employee_id]);
    }

    /**
     * Create a new notification
     */
    async create(data) {
        const { employee_id, notification_type, title, message, related_entity_type, related_entity_id, priority } = data;

        if (!employee_id || !notification_type || !title) {
            const err = new Error('Missing required fields: employee_id, notification_type, title');
            err.status = 400;
            throw err;
        }

        const query = `
      INSERT INTO notifications 
      (employee_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(query, [
            employee_id,
            notification_type,
            title,
            message || null,
            related_entity_type || null,
            related_entity_id || null,
            priority || 'normal'
        ]);

        const notification = await this.getById(result.insertId);

        // Fire web push non-blocking
        pushService.sendToEmployee(employee_id, {
            title,
            body: message || title,
            data: {
                notification_type,
                related_entity_type: related_entity_type || null,
                related_entity_id: related_entity_id || null
            }
        });

        return notification;
    }

    /**
     * Create bulk notifications
     */
    async createBulk(notifications) {
        const results = [];
        for (const notification of notifications) {
            try {
                const result = await this.create(notification);
                results.push(result);
            } catch (err) {
                console.error('Error creating bulk notification:', err);
            }
        }
        return results;
    }

    /**
     * Update notification
     */
    async update(id, data) {
        const { is_read, is_archived, priority, message, title } = data;
        const allowedFields = { is_read, is_archived, priority, message, title };

        let query = 'UPDATE notifications SET ';
        const updates = [];
        const params = [];

        for (const [key, value] of Object.entries(allowedFields)) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                if (key === 'is_read' && value) {
                    params.push(1);
                } else if (key === 'is_read') {
                    params.push(0);
                } else if (key === 'is_archived' && value) {
                    params.push(1);
                } else if (key === 'is_archived') {
                    params.push(0);
                } else {
                    params.push(value);
                }
            }
        }

        if (updates.length === 0) {
            const err = new Error('No fields to update');
            err.status = 400;
            throw err;
        }

        // Add read_at timestamp if marking as read
        if (data.is_read) {
            updates.push('read_at = CURRENT_TIMESTAMP');
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);
        return this.getById(id);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id) {
        return this.update(id, { is_read: true });
    }

    /**
     * Mark notification as unread
     */
    async markAsUnread(id) {
        return this.update(id, { is_read: false });
    }

    /**
     * Mark notification as archived
     */
    async markAsArchived(id) {
        return this.update(id, { is_archived: true });
    }

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(notification_ids) {
        if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
            const err = new Error('Invalid notification IDs');
            err.status = 400;
            throw err;
        }

        const placeholders = notification_ids.map(() => '?').join(',');
        const query = `
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;

        await db.query(query, notification_ids);
        return { message: `${notification_ids.length} notifications marked as read` };
    }

    /**
     * Delete notification
     */
    async delete(id) {
        const notification = await this.getById(id);
        if (!notification) {
            const err = new Error('Notification not found');
            err.status = 404;
            throw err;
        }

        const query = 'DELETE FROM notifications WHERE id = ?';
        await db.query(query, [id]);

        return { message: 'Notification deleted successfully' };
    }

    /**
     * Get unread count for employee
     */
    async getUnreadCount(employee_id) {
        const query = 'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0 AND is_archived = 0';
        const result = await db.query(query, [employee_id]);
        return result[0]?.count || 0;
    }

    /**
     * Send attendance reminder to all employees
     */
    async sendAttendanceReminder(message = 'Please mark your attendance for today') {
        try {
            // Get all active employees
            const employeesQuery = 'SELECT id, name FROM employees';
            const employees = await db.query(employeesQuery);

            if (employees.length === 0) {
                return { message: 'No employees found', count: 0 };
            }

            const notifications = employees.map((emp) => ({
                employee_id: emp.id,
                notification_type: 'ATTENDANCE_DUE',
                title: 'Daily Attendance Reminder',
                message: message,
                related_entity_type: 'attendance',
                priority: 'high'
            }));

            const results = await this.createBulk(notifications);
            return { message: 'Attendance reminders sent', count: results.length };
        } catch (err) {
            console.error('Error sending attendance reminders:', err);
            throw err;
        }
    }

    /**
     * Send task notification
     */
    async sendTaskNotification(task_id, notification_type, employee_id, title, message = null) {
        try {
            return await this.create({
                employee_id,
                notification_type,
                title,
                message: message || this.getTaskMessage(notification_type),
                related_entity_type: 'task',
                related_entity_id: task_id,
                priority: ['TASK_OVERDUE', 'TASK_DUE_SOON'].includes(notification_type) ? 'high' : 'normal'
            });
        } catch (err) {
            console.error('Error sending task notification:', err);
            throw err;
        }
    }

    /**
     * Send document notification
     */
    async sendDocumentNotification(document_id, notification_type, employee_id, title, message = null) {
        try {
            return await this.create({
                employee_id,
                notification_type,
                title,
                message: message || this.getDocumentMessage(notification_type),
                related_entity_type: 'document',
                related_entity_id: document_id,
                priority: 'normal'
            });
        } catch (err) {
            console.error('Error sending document notification:', err);
            throw err;
        }
    }

    /**
     * Get default message for task notifications
     */
    getTaskMessage(notification_type) {
        const messages = {
            TASK_ASSIGNED: 'A new task has been assigned to you.',
            TASK_COMPLETED: 'Task has been completed successfully.',
            TASK_DUE_SOON: 'Your task is due soon. Please complete it.',
            TASK_OVERDUE: 'Your task is overdue. Please complete it immediately.',
            WORKFLOW_ACTION_REQUIRED: 'An action is required on your workflow.'
        };
        return messages[notification_type] || 'Task notification';
    }

    /**
     * Get default message for document notifications
     */
    getDocumentMessage(notification_type) {
        const messages = {
            DOCUMENT_UPLOADED: 'A new document has been uploaded.',
            DOCUMENT_APPROVED: 'Your document has been approved.',
            DOCUMENT_REJECTED: 'Your document has been rejected. Please review and resubmit.'
        };
        return messages[notification_type] || 'Document notification';
    }

    /**
     * Send reminders only to employees who punched in today but have not punched out yet.
     * Creates at most one punch-out reminder notification per employee per day.
     */
    async sendForgotPunchOutReminders(message = 'You forgot to punch out today. Please mark your punch-out time.') {
        try {
            const query = `
                SELECT ea.id AS attendance_id, ea.employee_id, e.name
                FROM employee_attendance ea
                JOIN employees e ON ea.employee_id = e.id
                LEFT JOIN notifications n
                    ON n.employee_id = ea.employee_id
                    AND n.notification_type = 'ATTENDANCE_MARKED'
                    AND n.title = 'Punch-Out Reminder'
                    AND DATE(n.created_at) = CURDATE()
                    AND n.related_entity_type = 'attendance'
                    AND n.related_entity_id = ea.id
                WHERE ea.attendance_date = CURDATE()
                  AND ea.punch_in_time IS NOT NULL
                  AND ea.punch_out_time IS NULL
                  AND n.id IS NULL
            `;

            const attendanceRecords = await db.query(query);

            if (attendanceRecords.length === 0) {
                return { message: 'No employees found who need a punch-out reminder', count: 0 };
            }

            const notifications = attendanceRecords.map((record) => ({
                employee_id: record.employee_id,
                notification_type: 'ATTENDANCE_MARKED',
                title: 'Punch-Out Reminder',
                message,
                related_entity_type: 'attendance',
                related_entity_id: record.attendance_id,
                priority: 'high'
            }));

            const results = await this.createBulk(notifications);

            return {
                message: 'Punch-out reminders sent',
                count: results.length,
                employees: attendanceRecords.map((record) => ({ id: record.employee_id, name: record.name }))
            };
        } catch (err) {
            console.error('Error sending punch-out reminders:', err);
            throw err;
        }
    }

    /**
     * Send evening login notifications to all employees
     * Only creates ONE notification per employee per day
     */
    async sendEveningLoginNotifications(message = 'Good evening! Please check your pending tasks in the portal.') {
        try {
            // Get all active employees
            const employeesQuery = 'SELECT id, name FROM employees';
            const employees = await db.query(employeesQuery);

            if (employees.length === 0) {
                return { message: 'No employees found', count: 0 };
            }

            // Check which employees already have an evening notification today
            // Using >= CURDATE() to get today's notifications (timezone-safe)
            const checkQuery = `
                SELECT DISTINCT employee_id 
                FROM notifications 
                WHERE notification_type = 'SYSTEM_ALERT'
                AND title = 'Evening Portal Update'
                AND DATE(created_at) >= CURDATE()
            `;
            const existingNotifications = await db.query(checkQuery);
            const existingEmployeeIds = new Set(existingNotifications.map(n => n.employee_id));

            // Filter out employees who already received notification today
            const employeesToNotify = employees.filter(emp => !existingEmployeeIds.has(emp.id));

            if (employeesToNotify.length === 0) {
                return { message: 'All employees already notified today', count: 0 };
            }

            const notifications = employeesToNotify.map((emp) => ({
                employee_id: emp.id,
                notification_type: 'SYSTEM_ALERT',
                title: 'Evening Portal Update',
                message: message,
                related_entity_type: 'employee',
                related_entity_id: emp.id,
                priority: 'normal'
            }));

            const results = await this.createBulk(notifications);
            return {
                message: 'Evening notifications sent',
                count: results.length,
                employees: employeesToNotify.map(e => ({ id: e.id, name: e.name }))
            };
        } catch (err) {
            console.error('Error sending evening login notifications:', err);
            throw err;
        }
    }

    /**
     * Clear archived notifications older than X days
     */
    async clearOldNotifications(days = 30) {
        const query = 'DELETE FROM notifications WHERE is_archived = 1 AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
        const result = await db.query(query, [days]);
        return { message: `${result.affectedRows} old notifications cleared` };
    }
}

module.exports = new NotificationService();
