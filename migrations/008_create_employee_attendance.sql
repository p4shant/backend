CREATE TABLE IF NOT EXISTS employee_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Relationships
  employee_id INT NOT NULL,

  -- Attendance details
  attendance_date DATE NOT NULL,
  punch_in_image_url VARCHAR(255) NULL,
  punch_in_time DATETIME NULL,
  punch_out_time DATETIME NULL,
  punch_out_image_url VARCHAR(255) NULL,

  -- Locations (lat/long)
  punch_in_latitude DECIMAL(9,6) NULL,
  punch_in_longitude DECIMAL(9,6) NULL,
  punch_out_latitude DECIMAL(9,6) NULL,
  punch_out_longitude DECIMAL(9,6) NULL,

  -- Derived/flags
  is_late TINYINT(1) NOT NULL DEFAULT 0,
  forgot_to_punch_out TINYINT(1) NOT NULL DEFAULT 0,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,

  -- Indexes
  UNIQUE KEY uniq_employee_date (employee_id, attendance_date),
  INDEX idx_employee_id (employee_id),
  INDEX idx_attendance_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
