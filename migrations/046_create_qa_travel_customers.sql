-- Customer visits logged by a QA Tester at punch-out
-- Many visits can exist per travel log (one day)
CREATE TABLE IF NOT EXISTS qa_travel_customers (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  travel_log_id  INT NOT NULL,
  customer_id    INT NULL,          -- FK to registered_customers (nullable for free-text entries)
  customer_name  VARCHAR(255) NOT NULL,
  status         ENUM('Completed', 'Pending') NOT NULL,
  pending_reason ENUM('Wiring not Completed', 'Inverter Other Brand') NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (travel_log_id) REFERENCES qa_travel_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id)   REFERENCES registered_customers(id) ON DELETE SET NULL
);
