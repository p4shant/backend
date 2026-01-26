CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Identity
  name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  district VARCHAR(100) NULL,

  -- Role
  employee_role ENUM(
    'Sale Executive',
    'System Admin',
    'Electrician',
    'Accountant',
    'Master Admin',
    'Operation Manager',
    'Technician',
    'SFDC Admin',
    'Technical Assistant',
    'Electrician Assistant'
  ) NOT NULL,

  -- Authentication
  password_hash VARCHAR(255) NOT NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_phone_number (phone_number),
  INDEX idx_employee_role (employee_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
