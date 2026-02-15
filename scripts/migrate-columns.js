/*
  Run specific migration for column updates
*/

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runMigration() {
    try {
        const filePath = path.join(__dirname, '../migrations/031_update_additional_documents_images.sql');
        let sqlContent = fs.readFileSync(filePath, 'utf8');

        logger.info('Running migration: 031_update_additional_documents_images.sql');

        // Split by semicolons and filter out comments and empty statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement) {
                logger.info(`Executing: ${statement.substring(0, 80)}...`);
                await db.query(statement);
            }
        }

        logger.info('✓ Migration 031_update_additional_documents_images.sql completed successfully');
        logger.info('✓ Columns updated:');
        logger.info('  - Removed: logger_image_url');
        logger.info('  - Added: applicant_with_panel_image_url');
        logger.info('  - Added: applicant_with_invertor_image_url');
    } catch (err) {
        logger.error('Migration failed:', err.message);
        throw err;
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        logger.error('Fatal error:', err.message);
        process.exit(1);
    });
