-- Add 'Inventory Operator' to the employee_role ENUM
ALTER TABLE employees
  MODIFY COLUMN employee_role ENUM(
    'Sale Executive',
    'System Admin',
    'Electrician',
    'Accountant',
    'Master Admin',
    'Operation Manager',
    'Technician',
    'SFDC Admin',
    'Technical Assistant',
    'Electrician Assistant',
    'Stock Controller',
    'Inventory Operator'
  ) NOT NULL;
