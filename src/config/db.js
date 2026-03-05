const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('../utils/logger');

const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    queueLimit: 0,
    dateStrings: true,
    timezone: '+05:30'
});

pool.on('connection', (connection) => {
    // Set MySQL session timezone to IST so all TIMESTAMP values are returned in IST
    connection.query("SET time_zone = '+05:30'");
    logger.debug('MySQL connection acquired (timezone set to IST +05:30)');
});

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function getConnection() {
    return pool.getConnection();
}

module.exports = {
    pool,
    query,
    getConnection
};
