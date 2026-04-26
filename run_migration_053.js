const db = require('./src/config/db');

async function runMigration() {
    try {
        console.log('Running migration 053...');

        // Add completed_by to tasks
        try {
            await db.query('ALTER TABLE tasks ADD COLUMN completed_by INT NULL');
            console.log('✅ Added completed_by to tasks');
        } catch (e) {
            if (e.message.includes('Duplicate column')) console.log('⏭ completed_by already exists');
            else console.error('❌ completed_by:', e.message);
        }

        // Add payment_approved to transaction_logs
        try {
            await db.query('ALTER TABLE transaction_logs ADD COLUMN payment_approved TINYINT(1) DEFAULT 0');
            console.log('✅ Added payment_approved to transaction_logs');
        } catch (e) {
            if (e.message.includes('Duplicate column')) console.log('⏭ payment_approved already exists');
            else console.error('❌ payment_approved:', e.message);
        }

        // Add approved_by to transaction_logs
        try {
            await db.query('ALTER TABLE transaction_logs ADD COLUMN approved_by INT NULL');
            console.log('✅ Added approved_by to transaction_logs');
        } catch (e) {
            if (e.message.includes('Duplicate column')) console.log('⏭ approved_by already exists');
            else console.error('❌ approved_by:', e.message);
        }

        // Add approved_at to transaction_logs
        try {
            await db.query('ALTER TABLE transaction_logs ADD COLUMN approved_at DATETIME NULL');
            console.log('✅ Added approved_at to transaction_logs');
        } catch (e) {
            if (e.message.includes('Duplicate column')) console.log('⏭ approved_at already exists');
            else console.error('❌ approved_at:', e.message);
        }

        // Update roles
        const r1 = await db.query("UPDATE employees SET employee_role = 'Help Desk' WHERE employee_role = 'System Admin'");
        console.log(`✅ Updated ${r1.affectedRows || 0} employees to Help Desk`);

        // Rename create_cdr -> create_dcr
        const r2 = await db.query("UPDATE tasks SET work_type = 'create_dcr' WHERE work_type = 'create_cdr'");
        console.log(`✅ Updated ${r2.affectedRows || 0} tasks from create_cdr to create_dcr`);

        // Update assigned_to_role
        const r3 = await db.query("UPDATE tasks SET assigned_to_role = 'Help Desk' WHERE assigned_to_role = 'System Admin'");
        console.log(`✅ Updated ${r3.affectedRows || 0} tasks role to Help Desk`);

        // Update create_dcr tasks to Accountant
        const r4 = await db.query("UPDATE tasks SET assigned_to_role = 'Accountant' WHERE work_type = 'create_dcr'");
        console.log(`✅ Updated ${r4.affectedRows || 0} create_dcr tasks to Accountant`);

        // Remove pending payment tasks
        const r5 = await db.query("DELETE FROM tasks WHERE work_type = 'collect_remaining_amount' AND status != 'completed'");
        console.log(`✅ Deleted ${r5.affectedRows || 0} pending collect_remaining_amount tasks`);

        const r6 = await db.query("DELETE FROM tasks WHERE work_type = 'approval_of_payment_collection' AND status != 'completed'");
        console.log(`✅ Deleted ${r6.affectedRows || 0} pending approval_of_payment_collection tasks`);

        console.log('\n🎉 Migration 053 complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
