const cron = require('node-cron');
const { markAbsentEmployees } = require('../services/attendanceSchedulerService');

/**
 * Initialize attendance scheduler
 * Runs daily at 11:30 PM IST to mark absent employees
 */
function initializeAttendanceScheduler() {
    // Cron expression: '30 18 * * *' runs at 6:30 PM UTC = 11:30 PM IST (UTC+5:30)
    // Cron format: minute hour day month dayOfWeek
    // 18:00 UTC + 5:30 = 23:30 IST (11:30 PM IST)

    const cronExpression = '30 18 * * *'; // 11:30 PM IST every day

    console.log('📅 [Scheduler] Initializing attendance scheduler...');
    console.log('📅 [Scheduler] Schedule: Daily at 11:30 PM IST (6:30 PM UTC)');

    const task = cron.schedule(cronExpression, async () => {
        console.log('');
        console.log('========================================');
        console.log('🕐 [Scheduler] Starting daily absent marking task');
        console.log('🕐 [Scheduler] Time: 11:30 PM IST');
        console.log('========================================');

        try {
            const result = await markAbsentEmployees();

            console.log('');
            console.log('✅ [Scheduler] Task completed successfully');
            console.log('📊 [Scheduler] Results:', JSON.stringify(result, null, 2));
            console.log('========================================');
            console.log('');
        } catch (error) {
            console.error('');
            console.error('❌ [Scheduler] Task failed with error');
            console.error('❌ [Scheduler] Error:', error.message);
            console.error('========================================');
            console.error('');
        }
    }, {
        scheduled: true,
        timezone: "UTC" // Run on UTC time, cron expression already adjusted for IST
    });

    task.start();

    console.log('✅ [Scheduler] Attendance scheduler initialized successfully');
    console.log('✅ [Scheduler] Next run: Daily at 11:30 PM IST (6:30 PM UTC)');
    console.log('');

    return task;
}

/**
 * Test scheduler function - runs immediately
 * For testing purposes only
 */
async function testScheduler() {
    console.log('🧪 [Test] Running test scheduler...');
    try {
        const result = await markAbsentEmployees();
        console.log('✅ [Test] Test completed:', result);
        return result;
    } catch (error) {
        console.error('❌ [Test] Test failed:', error);
        throw error;
    }
}

module.exports = {
    initializeAttendanceScheduler,
    testScheduler
};
