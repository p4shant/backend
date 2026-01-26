const dotenv = require('dotenv');

// Load environment variables early
dotenv.config();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'datasphere',
        connectionLimit: process.env.DB_CONNECTION_LIMIT
            ? Number(process.env.DB_CONNECTION_LIMIT)
            : 10
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'change-me',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
        saltRounds: process.env.PASSWORD_SALT_ROUNDS
            ? Number(process.env.PASSWORD_SALT_ROUNDS)
            : 10
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

module.exports = env;
