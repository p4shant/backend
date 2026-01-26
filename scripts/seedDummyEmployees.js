/*
  Seed dummy employees to the database.
  Run migrations first: npm run migrate
  Then: npm run seed
*/

const db = require('../src/config/db');
const env = require('../src/config/env');
const { hashPassword } = require('../src/utils/password');
const { EMPLOYEE_ROLES } = require('../src/constants/roles');
const logger = require('../src/utils/logger');

async function seed() {
    const defaultPassword = 'Password123';
    const password_hash = await hashPassword(defaultPassword);

    const dummyEmployees = EMPLOYEE_ROLES.map((role, idx) => ({
        name: `${role} User`,
        phone_number: `9000000${(idx + 1).toString().padStart(3, '0')}`,
        district: 'Test District',
        employee_role: role,
        password_hash
    }));

    for (const emp of dummyEmployees) {
        const existing = await db.query('SELECT id FROM employees WHERE phone_number = ?', [emp.phone_number]);
        if (existing.length > 0) {
            logger.info(`Skipping ${emp.phone_number} (${emp.employee_role}) - already exists`);
            continue;
        }

        await db.query(
            'INSERT INTO employees (name, phone_number, district, employee_role, password_hash) VALUES (?, ?, ?, ?, ?)',
            [emp.name, emp.phone_number, emp.district, emp.employee_role, emp.password_hash]
        );
        logger.info(`✓ Inserted ${emp.phone_number} (${emp.employee_role})`);
    }

    logger.info(`Seed complete. Default password for all dummy users: ${defaultPassword}`);
}

seed()
    .then(() => {
        logger.info('Seeding successful');
        process.exit(0);
    })
    .catch((err) => {
        logger.error('Seeding failed:', err.message);
        process.exit(1);
    });
