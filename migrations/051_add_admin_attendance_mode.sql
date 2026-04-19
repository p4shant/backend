-- Add 'admin' to attendance_mode enum for Admin Assistant marked attendance
ALTER TABLE employee_attendance 
MODIFY COLUMN attendance_mode ENUM('self','supervisor','admin') DEFAULT 'self';
