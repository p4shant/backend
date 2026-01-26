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
    // Force IPv4 to avoid IPv6 connection issues
    family: 4
});

pool.on('connection', () => {
    logger.debug('MySQL connection acquired');
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
