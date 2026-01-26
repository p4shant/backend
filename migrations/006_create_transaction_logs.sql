CREATE TABLE IF NOT EXISTS transaction_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Related Customer
  registered_customer_id INT NOT NULL,

  -- Amounts
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  amount_submitted_details TEXT NULL, -- JSON array of records {amount, mode, date, note}
  amount_submitted_images_url TEXT NULL, -- JSON array of URLs

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_registered_customer_id (registered_customer_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
