# Datasphere Backend (Node + MySQL)

Employee management API with authentication using MySQL (Hostinger-ready). Includes employee CRUD, role validation, JWT auth, and seeding script for dummy accounts.

## Prerequisites
- Node.js 18+
- Access to a MySQL instance (Hostinger or compatible)
- npm

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and fill values for your Hostinger database and JWT secret:
   ```bash
   cp .env.example .env
   ```
3. Create the database schema (run against your MySQL host):
   ```bash
   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < migrations/001_create_employees.sql
   ```

## Run
- Development (with reload):
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```
Server starts on `PORT` (default 3000). Health check: `GET /health`.

## API Overview (base path `/api`)
- Auth
  - `POST /auth/register` – create employee + returns JWT (fields: name, phone_number, employee_role, password, optional district)
  - `POST /auth/login` – login with phone_number + password, returns JWT
- Employees (all require `Authorization: Bearer <token>`)
  - `GET /employees` – list employees
  - `GET /employees/:id` – fetch single employee
  - `POST /employees` – create employee (roles allowed: System Admin, Master Admin, SFDC Admin)
  - `PUT /employees/:id` – update employee (same roles required)
  - `DELETE /employees/:id` – delete employee (same roles required)

## Authentication
- Login/register responses return `token` and `employee`.
- JWT payload includes `id`, `name`, `phone_number`, `employee_role`.
- Phone numbers are unique and used as the primary login identifier.

## Roles
Allowed roles (enforced at write-time):
```
Sale Executive
System Admin
Electrician
Accountant
Master Admin
Operation Manager
Technician
SFDC Admin
Technical Assistant
Electrician Assistant
```

## Seeding Dummy Users
After migrations and `.env` are in place, seed role-based dummy accounts:
```bash
node scripts/seedDummyEmployees.js
```
- Inserts one employee per role with phone numbers `9000000001`, `9000000002`, ... and default password `Password@123` (printed after running).
- Skips any entries that already exist by phone number.

## Project Structure
```
src/
  app.js              # Express app + middleware
  server.js           # Server bootstrap
  config/             # env + MySQL pool
  constants/          # role list
  controllers/        # route handlers
  middleware/         # auth + error handlers
  routes/             # route definitions
  services/           # business logic + DB access
  utils/              # logging, password helpers
migrations/           # SQL schema
scripts/              # seeding script
```

## Notes
- Make sure your MySQL user has rights to create/read/update/delete on the target database.
- For Hostinger, confirm the public host, port, and SSL requirements when filling `.env`.
