CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Recipient
  employee_id INT NOT NULL,

  -- Notification Details
  notification_type ENUM(
    'TASK_ASSIGNED',
    'TASK_COMPLETED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'DOCUMENT_UPLOADED',
    'DOCUMENT_APPROVED',
    'DOCUMENT_REJECTED',
    'ATTENDANCE_MARKED',
    'ATTENDANCE_DUE',
    'SCHEDULE_CHANGED',
    'PLANT_INSTALLATION_UPDATE',
    'CUSTOMER_REGISTERED',
    'PAYMENT_RECEIVED',
    'SYSTEM_ALERT',
    'WORKFLOW_ACTION_REQUIRED'
  ) NOT NULL,

  title VARCHAR(255) NOT NULL,
  message TEXT NULL,

  -- Link to Related Entity
  related_entity_type ENUM(
    'task',
    'document',
    'attendance',
    'plant_installation',
    'customer',
    'transaction',
    'workflow',
    'employee'
  ) NULL,
  related_entity_id INT NULL,

  -- Status & Priority
  is_read TINYINT(1) DEFAULT 0,
  is_archived TINYINT(1) DEFAULT 0,
  priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_employee_id (employee_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_is_read (is_read),
  INDEX idx_is_archived (is_archived),
  INDEX idx_created_at (created_at),
  INDEX idx_employee_read (employee_id, is_read),
  INDEX idx_priority (priority),
  INDEX idx_related_entity (related_entity_type, related_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
