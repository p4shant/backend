-- ============================================================================
-- Supervisor Attendance Feature
-- ============================================================================
-- Adds supervisor-marked attendance support for Technicians & Technical Assistants
-- Supervisors (Upendra Nath, Aashish Singh, Sanjay Singh Yadav, S N Singh) can
-- mark these employees as Present/Absent without requiring self punch-in/out

-- Add attendance_mode column: 'self' (default, existing punch-in/out) or 'supervisor' (marked by supervisor)
ALTER TABLE employee_attendance 
  ADD COLUMN attendance_mode ENUM('self', 'supervisor') NOT NULL DEFAULT 'self' AFTER forgot_to_punch_out;

-- Add marked_by column: employee_id of the supervisor who marked the attendance
ALTER TABLE employee_attendance 
  ADD COLUMN marked_by INT NULL AFTER attendance_mode;

-- Add marked_status column: 'present' or 'absent' (only used when attendance_mode = 'supervisor')
ALTER TABLE employee_attendance 
  ADD COLUMN marked_status ENUM('present', 'absent') NULL AFTER marked_by;

-- Add foreign key constraint for marked_by
ALTER TABLE employee_attendance 
  ADD CONSTRAINT fk_attendance_marked_by 
  FOREIGN KEY (marked_by) REFERENCES employees(id) ON DELETE SET NULL;
