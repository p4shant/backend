const cron = require('node-cron');
const logger = require('./logger');
const notificationService = require('../services/notificationService');

/**
 * Initialize notification scheduler
 * Runs at 6 PM IST daily to send punch-out reminders
 * Only sends to employees who punched in but forgot to punch out
 */
function initializeNotificationScheduler() {
    try {
        // Run directly in Asia/Kolkata timezone so the job always fires at 6:00 PM IST.
        const punchOutJob = cron.schedule('0 18 * * *', async () => {
            try {
                logger.info('[Notification Scheduler] Triggering punch-out reminders at 6 PM IST');

                const result = await notificationService.sendForgotPunchOutReminders(
                    'You forgot to punch out today. Please mark your punch-out time before leaving.'
                );

                logger.info(`[Notification Scheduler] Punch-out reminders sent: ${result.count} notifications`);
            } catch (err) {
                logger.error('[Notification Scheduler] Error sending punch-out reminders:', err.message);
            }
        }, {
            scheduled: true,
            timezone: 'Asia/Kolkata'
        });

        logger.info('[Notification Scheduler] Scheduler initialized');
        logger.info('  - Punch-out reminders: Daily at 6 PM IST (only for employees who punched in but have not punched out)');

        return { punchOutJob };
    } catch (err) {
        logger.error('[Notification Scheduler] Failed to initialize:', err.message);
        throw err;
    }
}

/**
 * Stop notification scheduler
 */
function stopNotificationScheduler(jobs) {
    if (jobs) {
        if (jobs.punchOutJob) jobs.punchOutJob.stop();
        logger.info('[Notification Scheduler] Scheduler stopped');
    }
}

module.exports = {
    initializeNotificationScheduler,
    stopNotificationScheduler
};
