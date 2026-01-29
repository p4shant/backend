# Attendance Scheduler - Automatic Absent Marking

## Overview
The attendance scheduler automatically marks employees as absent if they haven't marked their attendance by 11:30 PM IST each day.

## Schedule
- **Time:** 11:30 PM IST (6:30 PM UTC) daily
- **Action:** Marks all employees who haven't marked attendance as "absent"
- **Database:** Creates attendance records with NULL values for punch times and images

## How It Works

### 1. Daily Automated Process
Every day at 11:30 PM IST, the scheduler:
1. Fetches all employees from the database
2. Checks which employees have marked attendance for the current date
3. Creates "absent" records for employees who haven't marked attendance

### 2. Absent Record Structure
When an employee is marked absent, the following record is created:

```sql
INSERT INTO employee_attendance (
    employee_id,
    attendance_date,
    punch_in_time,           -- NULL
    punch_out_time,          -- NULL
    punch_in_image_url,      -- NULL
    punch_out_image_url,     -- NULL
    punch_in_latitude,       -- NULL
    punch_in_longitude,      -- NULL
    punch_out_latitude,      -- NULL
    punch_out_longitude,     -- NULL
    is_late,                 -- 0
    forgot_to_punch_out      -- 0
)
```

### 3. Race Condition Protection
- Uses `UNIQUE KEY uniq_employee_date (employee_id, attendance_date)` constraint
- If an employee marks attendance between scheduler check and insert, the duplicate entry error is caught and logged
- No duplicate records are created

## API Endpoints

### 1. Manual Trigger (Master Admin Only)
Manually trigger absent marking for testing or specific dates.

**Endpoint:** `POST /api/scheduler/mark-absent`

**Headers:**
```
Authorization: Bearer <master_admin_token>
Content-Type: application/json
```

**Body (Optional):**
```json
{
  "date": "2026-01-29"  // Optional: specific date in YYYY-MM-DD format
}
```

**Response:**
```json
{
  "success": true,
  "message": "Absent marking completed",
  "date": "2026-01-29",
  "totalEmployees": 10,
  "presentEmployees": 7,
  "absentEmployees": 3,
  "markedAsAbsent": 3,
  "failedToMark": 0
}
```

### 2. Scheduler Status (Master Admin Only)
Check scheduler configuration and status.

**Endpoint:** `GET /api/scheduler/status`

**Headers:**
```
Authorization: Bearer <master_admin_token>
```

**Response:**
```json
{
  "success": true,
  "scheduler": {
    "enabled": true,
    "schedule": "Daily at 11:30 PM IST (6:30 PM UTC)",
    "cronExpression": "30 18 * * *",
    "timezone": "IST (UTC+5:30)",
    "description": "Automatically marks employees as absent if they haven't marked attendance by 11:30 PM IST"
  },
  "endpoints": {
    "manualTrigger": "POST /api/scheduler/mark-absent",
    "status": "GET /api/scheduler/status"
  }
}
```

## Files Created/Modified

### New Files:
1. `/backend/src/services/attendanceSchedulerService.js` - Core logic for marking absent employees
2. `/backend/src/utils/attendanceScheduler.js` - Cron job initialization
3. `/backend/src/routes/schedulerRoutes.js` - API endpoints for scheduler

### Modified Files:
1. `/backend/src/server.js` - Added scheduler initialization on server start
2. `/backend/src/routes/index.js` - Added scheduler routes

## Configuration

### Cron Expression
```javascript
'30 18 * * *'  // Runs at 6:30 PM UTC = 11:30 PM IST
```

### Timezone Conversion
- IST = UTC + 5:30
- 11:30 PM IST = 6:30 PM UTC (18:30)
- Cron minute 30, hour 18

## Logs

### Scheduler Initialization
```
📅 [Scheduler] Initializing attendance scheduler...
📅 [Scheduler] Schedule: Daily at 11:30 PM IST (6:30 PM UTC)
✅ [Scheduler] Attendance scheduler initialized successfully
✅ [Scheduler] Next run: Daily at 11:30 PM IST (6:30 PM UTC)
```

### Daily Execution
```
========================================
🕐 [Scheduler] Starting daily absent marking task
🕐 [Scheduler] Time: 11:30 PM IST
========================================
[Scheduler] Running absent marking task for date: 2026-01-29
[Scheduler] Total employees in system: 10
[Scheduler] Employees who marked attendance: 7
[Scheduler] Employees to mark as absent: 3
[Scheduler] Marked John Doe (ID: 5) as absent
[Scheduler] Marked Jane Smith (ID: 8) as absent
[Scheduler] Marked Bob Wilson (ID: 12) as absent
✅ [Scheduler] Task completed successfully
📊 [Scheduler] Results: {
  "success": true,
  "date": "2026-01-29",
  "totalEmployees": 10,
  "presentEmployees": 7,
  "absentEmployees": 3,
  "markedAsAbsent": 3,
  "failedToMark": 0
}
========================================
```

## Testing

### Test Manually
Use the manual trigger endpoint to test the scheduler:

```bash
# Test for current date
curl -X POST http://localhost:3000/api/scheduler/mark-absent \
  -H "Authorization: Bearer YOUR_MASTER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Test for specific date
curl -X POST http://localhost:3000/api/scheduler/mark-absent \
  -H "Authorization: Bearer YOUR_MASTER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-28"}'
```

### Check Scheduler Status
```bash
curl http://localhost:3000/api/scheduler/status \
  -H "Authorization: Bearer YOUR_MASTER_ADMIN_TOKEN"
```

## Important Notes

1. **Duplicate Prevention:** The scheduler will NOT create duplicate records if an employee has already been marked (present, late, or absent)

2. **Race Conditions:** If an employee marks attendance while the scheduler is running, the database constraint prevents duplicate entries

3. **Master Admin Only:** All scheduler endpoints require Master Admin authentication

4. **IST Timezone:** All date calculations use IST (Indian Standard Time, UTC+5:30)

5. **Server Restart:** Scheduler automatically starts when the server starts

6. **No Retroactive Marking:** Scheduler only marks absent for the current date (in IST timezone)

## Dependencies

```json
{
  "node-cron": "^3.x.x"
}
```

Install with:
```bash
npm install node-cron
```

## Future Enhancements

Potential features to add:
1. Email notifications for absent employees
2. Configurable cutoff time via environment variables
3. Weekly/Monthly absence reports
4. Attendance statistics dashboard
5. Grace period before marking absent
6. Holiday calendar integration (skip weekends/holidays)
