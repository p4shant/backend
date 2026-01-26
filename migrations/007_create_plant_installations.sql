CREATE TABLE IF NOT EXISTS plant_installations (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Related Customer
  registered_customer_id INT NOT NULL,

  -- Installation details
  date_of_installation DATE NULL,
  internal_technician TEXT NULL, -- JSON array of employee IDs
  external_technician TEXT NULL, -- JSON array of names (no mobile)
  technical_assistant_ids TEXT NULL, -- JSON array of Technical Assistant employee IDs
  photo_taker_employee_id INT NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_taker_employee_id) REFERENCES employees(id) ON DELETE RESTRICT,

  -- Indexes
  INDEX idx_registered_customer_id (registered_customer_id),
  INDEX idx_photo_taker_employee_id (photo_taker_employee_id),
  INDEX idx_date_of_installation (date_of_installation),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
