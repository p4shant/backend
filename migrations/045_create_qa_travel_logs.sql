-- QA Tester daily travel log: one row per QA Tester per day
-- The speedometer punch-in/out doubles as attendance proof
CREATE TABLE IF NOT EXISTS qa_travel_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  attendance_id INT NULL,           -- FK to employee_attendance (set when punch-in creates attendance)
  travel_date DATE NOT NULL,        -- IST calendar date (YYYY-MM-DD)

  -- Start of day (punch-in)
  start_reading   DECIMAL(10,1) NULL,
  start_image_url VARCHAR(255)  NULL,
  start_latitude  DECIMAL(9,6)  NULL,
  start_longitude DECIMAL(9,6)  NULL,
  start_time      DATETIME      NULL,   -- UTC ISO stored as DATETIME

  -- End of day (punch-out)
  end_reading     DECIMAL(10,1) NULL,
  end_image_url   VARCHAR(255)  NULL,
  end_latitude    DECIMAL(9,6)  NULL,
  end_longitude   DECIMAL(9,6)  NULL,
  end_time        DATETIME      NULL,

  -- Computed
  total_distance  DECIMAL(10,1) NULL,   -- end_reading - start_reading

  notes TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_employee_date (employee_id, travel_date),
  FOREIGN KEY (employee_id)   REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (attendance_id) REFERENCES employee_attendance(id) ON DELETE SET NULL
);
