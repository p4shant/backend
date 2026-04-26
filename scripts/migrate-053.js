const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Check if columns exist in transaction_logs
        const [cols] = await conn.query('SHOW COLUMNS FROM transaction_logs');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('payment_approved')) {
            await conn.query('ALTER TABLE transaction_logs ADD COLUMN payment_approved TINYINT(1) DEFAULT 0');
            console.log('Added payment_approved');
        } else {
            console.log('payment_approved exists');
        }

        if (!colNames.includes('approved_by')) {
            await conn.query('ALTER TABLE transaction_logs ADD COLUMN approved_by INT NULL');
            console.log('Added approved_by');
        } else {
            console.log('approved_by exists');
        }

        if (!colNames.includes('approved_at')) {
            await conn.query('ALTER TABLE transaction_logs ADD COLUMN approved_at DATETIME NULL');
            console.log('Added approved_at');
        } else {
            console.log('approved_at exists');
        }

        // Add completed_by to tasks if not exists
        const [taskCols] = await conn.query('SHOW COLUMNS FROM tasks');
        const taskColNames = taskCols.map(c => c.Field);

        if (!taskColNames.includes('completed_by')) {
            await conn.query('ALTER TABLE tasks ADD COLUMN completed_by INT NULL');
            console.log('Added completed_by to tasks');
        } else {
            console.log('completed_by exists in tasks');
        }

        console.log('Migration complete!');
    } finally {
        await conn.end();
    }
}

run().catch(console.error);
