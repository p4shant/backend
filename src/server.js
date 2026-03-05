const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initializeAttendanceScheduler } = require('./utils/attendanceScheduler');
const { initializeNotificationScheduler } = require('./utils/notificationScheduler');
const stockSnapshotScheduler = require('./utils/stockSnapshotScheduler');

const port = env.port;

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);

    // Initialize attendance scheduler (runs daily at 11:30 PM IST)
    initializeAttendanceScheduler();

    // Initialize notification scheduler (runs daily at 7 PM IST)
    initializeNotificationScheduler();

    // Initialize stock snapshot scheduler (runs daily at midnight IST)
    stockSnapshotScheduler.initialize();
});
