const { Router } = require('express');
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// List all notifications (with filters)
router.get('/', controller.list);

// Get notification by ID
router.get('/:id', controller.getById);

// Get all notifications for specific employee
router.get('/employee/:employee_id', controller.getByEmployeeId);

// Get unread count for employee
router.get('/employee/:employee_id/unread-count', controller.getUnreadCount);

// Create a new notification
router.post('/', controller.create);

// Send attendance reminder to all employees
// This is typically called by a scheduler/cron job
router.post('/send/attendance-reminder', controller.sendAttendanceReminder);
// Send punch-out reminders to employees who forgot to punch out
router.post('/send/forgot-punch-out', controller.sendForgotPunchOutReminder);
// Send evening login notifications to all employees
router.post('/send/evening-notifications', controller.sendEveningNotifications);
// Update notification
router.put('/:id', controller.update);

// Mark notification as read
router.patch('/:id/mark-as-read', controller.markAsRead);

// Mark notification as unread
router.patch('/:id/mark-as-unread', controller.markAsUnread);

// Mark notification as archived
router.patch('/:id/mark-as-archived', controller.markAsArchived);

// Mark multiple notifications as read
router.patch('/bulk/mark-as-read', controller.markMultipleAsRead);

// Delete notification
router.delete('/:id', controller.remove);

// Clear old archived notifications
router.delete('/maintenance/clear-old', controller.clearOldNotifications);

module.exports = router;
