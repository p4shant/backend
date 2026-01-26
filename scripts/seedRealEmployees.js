/*
  Seed real employee data with password: Kaman@123
  Run: node scripts/seedRealEmployees.js
*/

const db = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');
const logger = require('../src/utils/logger');

async function seed() {
    const defaultPassword = 'Kaman@123';
    const password_hash = await hashPassword(defaultPassword);

    // Note: Some roles mapped to closest valid role:
    // Sales Manager/Asst Sales Manager -> Operation Manager
    // QA -> System Admin
    // Sales Executives -> Sale Executive
    const realEmployees = [
        { name: 'Sangeeta Singh', phone_number: '9628677090', district: 'All', employee_role: 'Master Admin' },
        { name: 'Aashish Singh', phone_number: '7905692846', district: 'Varanasi', employee_role: 'Operation Manager' },
        { name: 'Upendra Nath', phone_number: '9795108581', district: 'Ghazipur', employee_role: 'Operation Manager' },
        { name: 'Shashikant', phone_number: '7317212223', district: 'Ghazipur', employee_role: 'Sale Executive' },
        { name: 'Jitendra Yadav', phone_number: '7007850988', district: 'Ghazipur', employee_role: 'Sale Executive' },
        { name: 'Ankita Chaudhary', phone_number: '7392913092', district: 'Ghazipur', employee_role: 'SFDC Admin' },
        { name: 'Dhananjay Singh', phone_number: '9792265673', district: 'Ghazipur', employee_role: 'Electrician' },
        { name: 'Sayyad Raji Haider', phone_number: '6388402855', district: 'Ghazipur', employee_role: 'Sale Executive' },
        { name: 'Mohammad Bilal Ansari', phone_number: '7275094145', district: 'Ghazipur', employee_role: 'System Admin' },
        { name: 'Vipin Sharma', phone_number: '7999388372', district: 'Varanasi', employee_role: 'Sale Executive' },
        { name: 'Ranjit Singh', phone_number: '9670009602', district: 'Mau', employee_role: 'Operation Manager' },
        { name: 'Vikas Singh', phone_number: '7380580198', district: 'Mau', employee_role: 'Electrician' },
        { name: 'Manoj Kumar Verma', phone_number: '9515128233', district: 'Ballia', employee_role: 'Electrician' },
        { name: 'Rahul Kumar', phone_number: '9118971809', district: 'Ghazipur', employee_role: 'Technician' },
        { name: 'Kamlesh Kumar', phone_number: '7392923753', district: 'Ghazipur', employee_role: 'Technician' },
        { name: 'Dharmveer Rav', phone_number: '8114162805', district: 'Ghazipur', employee_role: 'Technician' },
        { name: 'Santosh Kumar Nirala', phone_number: '9519240528', district: 'Ghazipur', employee_role: 'Technician' },
        { name: 'Amarjit Kumar', phone_number: '9598994856', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Vikas Raj', phone_number: '8471026492', district: 'Azamgarh', employee_role: 'Sale Executive' },
        { name: 'Krishna Maurya', phone_number: '9140537733', district: 'Azamgarh', employee_role: 'Electrician' },
        { name: 'Amarnath', phone_number: '7054037629', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Anil kumar', phone_number: '6387339579', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Vipin Kumar', phone_number: '8858282730', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Sonu kumar', phone_number: '9506181496', district: 'Ghazipur', employee_role: 'Technician' },
        { name: 'Om Prakash Yadav', phone_number: '7348120116', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Ashish Yadav', phone_number: '9598936409', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Komal Kumar', phone_number: '7460007512', district: 'Varanasi', employee_role: 'Sale Executive' },
        { name: 'Nihal Patel', phone_number: '8009396878', district: 'Varanasi', employee_role: 'Sale Executive' },
        { name: 'Krishna Yadav', phone_number: '9580723394', district: 'Ghazipur', employee_role: 'Technical Assistant' },
        { name: 'Deepak Kumar', phone_number: '8882950347', district: 'Ghazipur', employee_role: 'Sale Executive' },
        { name: 'Indramani Kushwaha', phone_number: '7985880732', district: 'Varanasi', employee_role: 'Accountant' },
        { name: 'Sachin Kumar', phone_number: '9451129655', district: 'Varanasi', employee_role: 'Operation Manager' },
        { name: 'Satish Mishra', phone_number: '9170442372', district: 'Ghazipur', employee_role: 'Operation Manager' },
        { name: 'Ashish Kumar Sharma', phone_number: '7275512458', district: 'Varanasi', employee_role: 'System Admin' },
        { name: 'Nandan Singh', phone_number: '7398421944', district: 'Ghazipur', employee_role: 'Sale Executive' },
        { name: 'Jyoti', phone_number: '7029269883', district: 'Ghazipur', employee_role: 'System Admin' },
        { name: 'Anand', phone_number: '8542870159', district: 'Azamgarh', employee_role: 'Sale Executive' },
        { name: 'Anand Pandey', phone_number: '7007543240', district: 'Ghazipur', employee_role: 'System Admin' }
    ];

    for (const emp of realEmployees) {
        const existing = await db.query('SELECT id FROM employees WHERE phone_number = ?', [emp.phone_number]);
        if (existing.length > 0) {
            logger.info(`Skipping ${emp.phone_number} (${emp.name}) - already exists`);
            continue;
        }

        await db.query(
            'INSERT INTO employees (name, phone_number, district, employee_role, password_hash) VALUES (?, ?, ?, ?, ?)',
            [emp.name, emp.phone_number, emp.district, emp.employee_role, password_hash]
        );
        logger.info(`✓ Inserted ${emp.phone_number} (${emp.name})`);
    }

    logger.info(`Seed complete. Default password for all employees: ${defaultPassword}`);
    logger.info('Note: Brij Gopal Yadav skipped (missing phone number)');
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
