CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Work Details
  work TEXT NOT NULL,
  work_type VARCHAR(100) NOT NULL,
  
  -- Status
  status ENUM('pending', 'inprogress', 'completed') NOT NULL DEFAULT 'pending',

  -- Assigned To (Employee)
  assigned_to_id INT NOT NULL,
  assigned_to_name VARCHAR(150) NOT NULL,
  assigned_to_role VARCHAR(100) NOT NULL,

  -- Related Customer
  registered_customer_id INT NOT NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (assigned_to_id) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_status (status),
  INDEX idx_assigned_to_id (assigned_to_id),
  INDEX idx_registered_customer_id (registered_customer_id),
  INDEX idx_work_type (work_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
