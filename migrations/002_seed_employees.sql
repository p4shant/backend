-- Seed dummy employees with default password: Password123
-- Hashed password for: Password123
-- Run this in phpMyAdmin after creating the employees table

INSERT INTO employees (name, phone_number, district, employee_role, password_hash) VALUES
('Sale Executive User', '9000000001', 'Test District', 'Sale Executive', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('System Admin User', '9000000002', 'Test District', 'System Admin', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Electrician User', '9000000003', 'Test District', 'Electrician', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Accountant User', '9000000004', 'Test District', 'Accountant', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Master Admin User', '9000000005', 'Test District', 'Master Admin', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Operation Manager User', '9000000006', 'Test District', 'Operation Manager', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Technician User', '9000000007', 'Test District', 'Technician', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('SFDC Admin User', '9000000008', 'Test District', 'SFDC Admin', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Technical Assistant User', '9000000009', 'Test District', 'Technical Assistant', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu'),
('Electrician Assistant User', '9000000010', 'Test District', 'Electrician Assistant', '$2a$10$8qK0yGzX5pYrZPxJ3vHGqOXJH4K9X3pQ5LrN3WvYdJ8FhGtL2QqZu')
ON DUPLICATE KEY UPDATE id=id;
