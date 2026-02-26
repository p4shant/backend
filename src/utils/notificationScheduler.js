const cron = require('node-cron');
const logger = require('./logger');
const notificationService = require('../services/notificationService');

/**
 * Initialize notification scheduler
 * Runs at 7 PM (19:00) IST daily to send punch-out reminders
 * Only sends to employees who punched in but forgot to punch out
 */
function initializeNotificationScheduler() {
    try {
        // 7 PM IST = 19:00 UTC (during IST offset)
        // Using cron expression: 0 19 * * * (7 PM every day)
        const punchOutJob = cron.schedule('0 19 * * *', async () => {
            try {
                logger.info('[Notification Scheduler] Triggering punch-out reminders at 7 PM IST');

                const result = await notificationService.sendForgotPunchOutReminders(
                    'You forgot to punch out today. Please mark your punch-out time before leaving.'
                );

                logger.info(`[Notification Scheduler] Punch-out reminders sent: ${result.count} notifications`);
            } catch (err) {
                logger.error('[Notification Scheduler] Error sending punch-out reminders:', err.message);
            }
        });

        logger.info('[Notification Scheduler] Scheduler initialized');
        logger.info('  - Punch-out reminders: Daily at 7 PM IST (for employees who punched in but forgot to punch out)');

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
