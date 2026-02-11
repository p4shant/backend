const cron = require('node-cron');
const { markAbsentEmployees } = require('../services/attendanceSchedulerService');

/**
 * Initialize attendance scheduler
 * Runs daily at 11:00 PM IST to mark absent employees
 * 
 * ⏰ TIMEZONE CONFIGURATION FOR PRODUCTION:
 * IST = UTC + 5:30 hours
 * 11:00 PM IST = 17:30 UTC (5:30 PM UTC)
 * 
 * The cron expression runs at the UTC time specified, regardless of server timezone.
 * Even if your VPS is set to UTC or any other timezone, the cron will run at the exact UTC time.
 * 
 * Cron Format: minute hour day month dayOfWeek
 * Expression: '30 17 * * *' = At 17:30 UTC every day = 11:00 PM IST
 */
function initializeAttendanceScheduler() {
    // Cron expression: '30 17 * * *' runs at 5:30 PM UTC = 11:00 PM IST (UTC+5:30)
    const cronExpression = '30 17 * * *'; // 11:00 PM IST every day

    const serverTimezone = process.env.TZ || 'UTC';
    const currentTime = new Date().toISOString();

    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       ATTENDANCE SCHEDULER INITIALIZATION           ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📅 Scheduler Configuration:');
    console.log(`   ├─ Scheduled Time: 11:00 PM IST (17:30 UTC)`);
    console.log(`   ├─ Cron Expression: ${cronExpression}`);
    console.log(`   ├─ Server Timezone: ${serverTimezone}`);
    console.log(`   ├─ Current Server Time: ${currentTime}`);
    console.log(`   └─ Frequency: Daily (every day of the week)`);
    console.log('');
    console.log('📋 Task Details:');
    console.log(`   ├─ Purpose: Mark all employees without attendance as "Absent"`);
    console.log(`   ├─ Date Format: YYYY-MM-DD in IST timezone`);
    console.log(`   ├─ Runs After: All employees have completed their working hours`);
    console.log(`   └─ Result: Absence records created in database`);
    console.log('');

    const task = cron.schedule(cronExpression, async () => {
        const taskStartTime = new Date();
        const taskStartIST = new Date(taskStartTime.getTime() + 5.5 * 60 * 60 * 1000);

        console.log('');
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║        RUNNING ATTENDANCE SCHEDULER TASK            ║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`⏱️  Task Started At:`);
        console.log(`   ├─ UTC Time: ${taskStartTime.toISOString()}`);
        console.log(`   └─ IST Time: ${taskStartIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log('');

        try {
            const result = await markAbsentEmployees();

            const taskEndTime = new Date();
            const duration = taskEndTime - taskStartTime;

            console.log('');
            console.log('✅ Task Completed Successfully');
            console.log('');
            console.log('📊 Results Summary:');
            console.log(`   ├─ Date: ${result.date}`);
            console.log(`   ├─ Total Employees: ${result.totalEmployees}`);
            console.log(`   ├─ Marked Attendance: ${result.presentEmployees}`);
            console.log(`   ├─ Absent (to be marked): ${result.absentEmployees}`);
            console.log(`   ├─ Successfully Marked: ${result.markedAsAbsent}`);
            console.log(`   ├─ Failed to Mark: ${result.failedToMark || 0}`);
            console.log(`   └─ Execution Time: ${duration}ms`);
            console.log('');
            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║              TASK COMPLETED SUCCESSFULLY            ║');
            console.log('╚════════════════════════════════════════════════════╝');
            console.log('');
        } catch (error) {
            console.error('');
            console.error('╔════════════════════════════════════════════════════╗');
            console.error('║               ❌ TASK FAILED WITH ERROR             ║');
            console.error('╚════════════════════════════════════════════════════╝');
            console.error('');
            console.error('❌ Error Details:');
            console.error(`   ├─ Message: ${error.message}`);
            console.error(`   ├─ Stack: ${error.stack}`);
            console.error(`   └─ Time: ${new Date().toISOString()}`);
            console.error('');
        }
    }, {
        scheduled: true,
        timezone: "UTC" // Cron always uses UTC internally
    });

    task.start();

    console.log('✅ Scheduler Status: ACTIVE');
    console.log('✅ Next Run: Daily at 11:00 PM IST (17:30 UTC)');
    console.log('');
    console.log('ℹ️  IMPORTANT FOR PRODUCTION:');
    console.log(`   ├─ Scheduler runs at UTC time (17:30 UTC = 11:00 PM IST)`);
    console.log(`   ├─ This works regardless of your VPS timezone setting`);
    console.log(`   ├─ The internal date calculation uses IST timezone`);
    console.log(`   ├─ Even if VPS is in UTC, IST conversion happens in code`);
    console.log(`   └─ Monitor logs to verify daily execution`);
    console.log('');

    return task;
}

/**
 * Test scheduler function - runs immediately
 * For testing purposes only
 * 
 * Usage in production:
 * - Call this from an API endpoint to verify scheduler is working
 * - Useful for debugging timezone issues
 * - Safe to call multiple times
 */
async function testScheduler() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║           TESTING SCHEDULER (MANUAL TRIGGER)        ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');

    const testStartTime = new Date();
    const testStartIST = new Date(testStartTime.getTime() + 5.5 * 60 * 60 * 1000);

    console.log('🧪 Test started at:');
    console.log(`   ├─ UTC: ${testStartTime.toISOString()}`);
    console.log(`   └─ IST: ${testStartIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('');

    try {
        const result = await markAbsentEmployees();

        const testEndTime = new Date();
        const duration = testEndTime - testStartTime;

        console.log('✅ Test Completed Successfully');
        console.log('');
        console.log('📊 Results:');
        console.log(`   ├─ Date Processed: ${result.date}`);
        console.log(`   ├─ Total Employees: ${result.totalEmployees}`);
        console.log(`   ├─ Already Marked Attendance: ${result.presentEmployees}`);
        console.log(`   ├─ Absent to Mark: ${result.absentEmployees}`);
        console.log(`   ├─ Successfully Marked: ${result.markedAsAbsent}`);
        console.log(`   └─ Execution Duration: ${duration}ms`);
        console.log('');

        return result;
    } catch (error) {
        console.error('❌ Test Failed');
        console.error('');
        console.error('Error Details:');
        console.error(`   ├─ Message: ${error.message}`);
        console.error(`   └─ Stack: ${error.stack}`);
        console.error('');
        throw error;
    }
}

module.exports = {
    initializeAttendanceScheduler,
    testScheduler
};
