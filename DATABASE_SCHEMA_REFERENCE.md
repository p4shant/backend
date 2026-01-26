# Database Schema Reference

**Generated:** January 26, 2026  
**Source:** Migration files in `/backend/migrations/`

---

## Table: `employees`

**Migration File:** `001_create_employees.sql`

### Columns

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique employee identifier |
| `name` | VARCHAR(150) | NOT NULL | Employee full name |
| `phone_number` | VARCHAR(20) | NOT NULL, UNIQUE | Contact number (unique) |
| `district` | VARCHAR(100) | NULL | Work district |
| `employee_role` | ENUM | NOT NULL | Role designation |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update time |

### Employee Roles (ENUM Values)

```sql
'Sale Executive'
'System Admin'
'Electrician'
'Accountant'
'Master Admin'
'Operation Manager'
'Technician'
'SFDC Admin'
'Technical Assistant'
'Electrician Assistant'
```

### Indexes

- `PRIMARY KEY (id)`
- `UNIQUE (phone_number)`
- `INDEX idx_phone_number (phone_number)`
- `INDEX idx_employee_role (employee_role)`

### ⚠️ Important Notes

- **NO `status` COLUMN EXISTS** - Do not filter by `status`
- **NO `employee_name` COLUMN** - Use `name` column instead
- **NO `active` FIELD** - All employees in table are considered active

---

## Table: `employee_attendance`

**Migration File:** `008_create_employee_attendance.sql`

### Columns

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique attendance record ID |
| `employee_id` | INT | NOT NULL, FK → employees(id) | Employee reference |
| `attendance_date` | DATE | NOT NULL | Date of attendance |
| `punch_in_time` | DATETIME | NULL | Clock-in timestamp |
| `punch_out_time` | DATETIME | NULL | Clock-out timestamp |
| `punch_in_image_url` | VARCHAR(255) | NULL | Photo URL at punch in |
| `punch_out_image_url` | VARCHAR(255) | NULL | Photo URL at punch out |
| `punch_in_latitude` | DECIMAL(9,6) | NULL | GPS latitude at punch in |
| `punch_in_longitude` | DECIMAL(9,6) | NULL | GPS longitude at punch in |
| `punch_out_latitude` | DECIMAL(9,6) | NULL | GPS latitude at punch out |
| `punch_out_longitude` | DECIMAL(9,6) | NULL | GPS longitude at punch out |
| `is_late` | TINYINT(1) | NOT NULL, DEFAULT 0 | Late arrival flag (0/1) |
| `forgot_to_punch_out` | TINYINT(1) | NOT NULL, DEFAULT 0 | Missing punch out flag (0/1) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update time |

### Indexes

- `PRIMARY KEY (id)`
- `UNIQUE KEY uniq_employee_date (employee_id, attendance_date)`
- `INDEX idx_employee_id (employee_id)`
- `INDEX idx_attendance_date (attendance_date)`

### Foreign Keys

- `employee_id` → `employees(id)` ON DELETE RESTRICT

### ⚠️ Important Notes

- **NO `punch_in_location` or `punch_out_location` TEXT COLUMNS** - Use lat/lng fields instead
- **Unique constraint:** One attendance record per employee per date
- Coordinates are DECIMAL(9,6) - suitable for GPS precision

---

## Common Query Patterns

### ✅ Correct: Fetch All Employees

```sql
SELECT id, name, employee_role, phone_number, district 
FROM employees 
ORDER BY id;
```

### ❌ Incorrect: Filter by Non-Existent Status

```sql
-- WRONG - 'status' column does not exist!
SELECT id, name FROM employees WHERE status = 'Active';
```

### ✅ Correct: Fetch Employee with Role

```sql
SELECT id, name, employee_role 
FROM employees 
WHERE employee_role = 'Technician';
```

### ✅ Correct: Join Attendance with Employee

```sql
SELECT 
  ea.id,
  ea.employee_id,
  e.name AS employee_name,
  e.employee_role,
  ea.punch_in_time,
  ea.punch_out_time,
  ea.punch_in_latitude,
  ea.punch_in_longitude,
  ea.punch_out_latitude,
  ea.punch_out_longitude,
  ea.is_late,
  ea.forgot_to_punch_out
FROM employee_attendance ea
LEFT JOIN employees e ON ea.employee_id = e.id
WHERE ea.attendance_date = '2026-01-26';
```

### ❌ Incorrect: Reference Non-Existent Columns

```sql
-- WRONG - 'employee_name' column does not exist in employees table!
SELECT employee_name FROM employees;

-- WRONG - 'status' column does not exist!
SELECT * FROM employees WHERE status = 1;

-- WRONG - 'punch_in_location' is not a text column!
SELECT punch_in_location FROM employee_attendance;
```

---

## Data Type Reference

### VARCHAR vs TEXT
- `name`: VARCHAR(150)
- `phone_number`: VARCHAR(20)
- `district`: VARCHAR(100)
- Image URLs: VARCHAR(255)

### Numeric Types
- IDs: INT with AUTO_INCREMENT
- Coordinates: DECIMAL(9,6) for precision
- Flags: TINYINT(1) for boolean (0 or 1)

### Date/Time Types
- `attendance_date`: DATE (YYYY-MM-DD)
- `punch_in_time`, `punch_out_time`: DATETIME (YYYY-MM-DD HH:MM:SS)
- `created_at`, `updated_at`: TIMESTAMP with timezone

---

## Relationship Map

```
employees (1) ←→ (N) employee_attendance
    ↑
    └─ employee_id FK
```

### Cascade Rules
- **ON DELETE RESTRICT** - Cannot delete employee with attendance records

---

## Query Best Practices

### ✅ DO

1. **Use actual column names:**
   - `name` (not `employee_name`)
   - `id` (not `employee_id` when querying employees table)
   - `punch_in_latitude`, `punch_in_longitude` (not `punch_in_location`)

2. **Always alias when joining:**
   ```sql
   SELECT e.name, ea.punch_in_time
   FROM employees e
   LEFT JOIN employee_attendance ea ON e.id = ea.employee_id
   ```

3. **Use proper data types in comparisons:**
   ```sql
   -- Correct for TINYINT(1) flags
   WHERE is_late = 1
   WHERE forgot_to_punch_out = 0
   ```

### ❌ DON'T

1. **Don't assume columns exist:**
   - No `status` column in employees
   - No `employee_name` column (it's just `name`)
   - No text `location` columns (use lat/lng)

2. **Don't rely on string comparisons for flags:**
   ```sql
   -- WRONG - flags are TINYINT(1), not strings
   WHERE is_late = 'true'
   
   -- CORRECT
   WHERE is_late = 1
   ```

3. **Don't forget foreign key constraints:**
   - Must have valid employee_id when inserting attendance
   - Cannot delete employee with attendance records

---

## Common Errors & Fixes

### Error: "Unknown column 'status' in 'WHERE'"

**Problem:** Trying to filter by non-existent `status` column

**Fix:**
```sql
-- WRONG
SELECT * FROM employees WHERE status = 'Active';

-- CORRECT (fetch all employees)
SELECT * FROM employees;

-- OR filter by role if needed
SELECT * FROM employees WHERE employee_role = 'Technician';
```

### Error: "Unknown column 'employee_name' in 'SELECT'"

**Problem:** Wrong column name

**Fix:**
```sql
-- WRONG
SELECT employee_name FROM employees;

-- CORRECT
SELECT name FROM employees;
```

### Error: "Unknown column 'punch_in_location' in field list"

**Problem:** No text location field exists

**Fix:**
```sql
-- WRONG
SELECT punch_in_location FROM employee_attendance;

-- CORRECT (use coordinates)
SELECT punch_in_latitude, punch_in_longitude FROM employee_attendance;

-- OR create concatenated string in query
SELECT CONCAT(punch_in_latitude, ',', punch_in_longitude) AS location
FROM employee_attendance;
```

---

## Migration Execution Order

1. `001_create_employees.sql` - Base employee table
2. `002_create_registered_customers.sql` - Customer management
3. `002_seed_employees.sql` - Initial employee data
4. `003_create_tasks.sql` - Task management
5. `004_create_additional_documents.sql` - Document storage
6. `005_create_provided_solar_plant_details.sql` - Plant details
7. `006_create_transaction_logs.sql` - Transaction tracking
8. `007_create_plant_installations.sql` - Installation records
9. `008_create_employee_attendance.sql` - **Attendance system**
10. `009_create_test_transaction_log.sql` - Test data
11. `010_add_technical_assistant_to_plant_installations.sql` - Schema update

---

## Quick Column Reference

### employees Table (ACTUAL COLUMNS ONLY)

```javascript
{
  id: INT,
  name: VARCHAR(150),              // ← Use this, NOT "employee_name"
  phone_number: VARCHAR(20),
  district: VARCHAR(100),
  employee_role: ENUM,
  password_hash: VARCHAR(255),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
// NO 'status' column!
// NO 'employee_name' column!
```

### employee_attendance Table (ACTUAL COLUMNS ONLY)

```javascript
{
  id: INT,
  employee_id: INT,
  attendance_date: DATE,
  punch_in_time: DATETIME,
  punch_out_time: DATETIME,
  punch_in_image_url: VARCHAR(255),
  punch_out_image_url: VARCHAR(255),
  punch_in_latitude: DECIMAL(9,6),   // ← GPS coordinates
  punch_in_longitude: DECIMAL(9,6),  // ← GPS coordinates
  punch_out_latitude: DECIMAL(9,6),
  punch_out_longitude: DECIMAL(9,6),
  is_late: TINYINT(1),
  forgot_to_punch_out: TINYINT(1),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
// NO 'punch_in_location' text column!
// NO 'punch_out_location' text column!
```

---

**Last Updated:** January 26, 2026  
**Verified Against:** Migration files 001-010
