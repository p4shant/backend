const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const port = env.port;

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});
