CREATE TABLE IF NOT EXISTS provided_solar_plant_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Related Customer
  registered_customer_id INT NOT NULL,

  -- Provided Details
  solar_panel_serial_number TEXT NULL, -- JSON array of serial numbers
  inverter_serial_number VARCHAR(150) NULL,
  logger_serial_number VARCHAR(150) NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_registered_customer_id (registered_customer_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
