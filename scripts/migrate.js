/*
  Run migrations against the database.
  Usage: node scripts/migrate.js
*/

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runMigrations() {
    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            logger.info(`Running migration: ${file}`);
            await db.query(sql);
            logger.info(`✓ ${file} completed`);
        }

        logger.info('All migrations completed successfully');
    } catch (err) {
        logger.error('Migration failed:', err.message);
        throw err;
    }
}

runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        logger.error('Fatal error:', err.message);
        process.exit(1);
    });
