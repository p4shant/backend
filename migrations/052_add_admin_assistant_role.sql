-- Add 'Admin Assistant' to employees.employee_role ENUM
ALTER TABLE employees MODIFY COLUMN employee_role ENUM(
  'Sale Executive','System Admin','Electrician','Accountant','Master Admin',
  'Operation Manager','Technician','SFDC Admin','Technical Assistant',
  'Electrician Assistant','Stock Controller','Inventory Operator','QA Tester',
  'Admin Assistant'
) NOT NULL;
