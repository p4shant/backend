const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initializeAttendanceScheduler } = require('./utils/attendanceScheduler');

const port = env.port;

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);

    // Initialize attendance scheduler (runs daily at 11:30 PM IST)
    initializeAttendanceScheduler();
});
