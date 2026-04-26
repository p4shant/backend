-- Migration 053: Help Desk role, DCR rename, Payment pages, completed_by
-- Date: 2026-04-25

-- 1. Rename 'System Admin' role to 'Help Desk'
UPDATE employees SET employee_role = 'Help Desk' WHERE employee_role = 'System Admin';

-- 2. Rename create_cdr -> create_dcr in tasks
UPDATE tasks SET work_type = 'create_dcr' WHERE work_type = 'create_cdr';

-- 3. Update assigned_to_role for Help Desk tasks
UPDATE tasks SET assigned_to_role = 'Help Desk' WHERE assigned_to_role = 'System Admin';

-- 4. Update create_dcr tasks to Accountant role
UPDATE tasks SET assigned_to_role = 'Accountant' WHERE work_type = 'create_dcr';

-- 5. Add completed_by column to tasks
ALTER TABLE tasks ADD COLUMN completed_by INT NULL;

-- 6. Add payment approval columns to transaction_logs
ALTER TABLE transaction_logs ADD COLUMN payment_approved TINYINT(1) DEFAULT 0;
ALTER TABLE transaction_logs ADD COLUMN approved_by INT NULL;
ALTER TABLE transaction_logs ADD COLUMN approved_at DATETIME NULL;

-- 7. Remove pending collect_remaining_amount and approval_of_payment_collection tasks
-- (all customers will use new payment pages instead)
DELETE FROM tasks WHERE work_type = 'collect_remaining_amount' AND status != 'completed';
DELETE FROM tasks WHERE work_type = 'approval_of_payment_collection' AND status != 'completed';
