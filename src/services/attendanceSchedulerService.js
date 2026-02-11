const db = require('../config/db');

/**
 * Get current date in IST timezone (YYYY-MM-DD format)
 * 
 * NOTE: attendance_date field represents a calendar day in IST, not a UTC timestamp.
 * This is necessary because:
 * 1. Employees mark attendance based on their local calendar (IST)
 * 2. The scheduler runs at 18:30 UTC (23:30 IST) to mark absent employees
 * 3. The date must be consistent with how employees see their calendar day
 * 
 * This function performs UTC-to-IST conversion only for determining the calendar date,
 * NOT for timestamp conversions (which stay in UTC per timezone rules).
 */
function getCurrentDateIST() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);

    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Mark all employees who haven't marked attendance as absent
 * This runs daily at 11:30 PM IST
 */
async function markAbsentEmployees() {
    try {
        const currentDate = getCurrentDateIST();
        console.log(`[Scheduler] Running absent marking task for date: ${currentDate}`);

        // STEP 1: Fetch all active employees
        const allEmployeesQuery = `SELECT id, name, employee_role FROM employees ORDER BY id`;
        const allEmployees = await db.query(allEmployeesQuery);

        console.log(`[Scheduler] Total employees in system: ${allEmployees.length}`);

        // STEP 2: Fetch employees who already have attendance records for today
        const attendanceQuery = `
            SELECT DISTINCT employee_id 
            FROM employee_attendance 
            WHERE attendance_date = ?
        `;
        const attendanceRecords = await db.query(attendanceQuery, [currentDate]);

        // Create a Set of employee IDs who have marked attendance
        const markedEmployeeIds = new Set(attendanceRecords.map(r => r.employee_id));

        console.log(`[Scheduler] Employees who marked attendance: ${markedEmployeeIds.size}`);

        // STEP 3: Find employees who haven't marked attendance
        const absentEmployees = allEmployees.filter(emp => !markedEmployeeIds.has(emp.id));

        console.log(`[Scheduler] Employees to mark as absent: ${absentEmployees.length}`);

        if (absentEmployees.length === 0) {
            console.log(`[Scheduler] No absent employees to mark for ${currentDate}`);
            return {
                success: true,
                date: currentDate,
                totalEmployees: allEmployees.length,
                presentEmployees: markedEmployeeIds.size,
                absentEmployees: 0,
                markedAsAbsent: 0
            };
        }

        // STEP 4: Insert absent records for employees who didn't mark attendance
        const insertQuery = `
            INSERT INTO employee_attendance (
                employee_id,
                attendance_date,
                punch_in_time,
                punch_out_time,
                punch_in_image_url,
                punch_out_image_url,
                punch_in_latitude,
                punch_in_longitude,
                punch_out_latitude,
                punch_out_longitude,
                is_late,
                forgot_to_punch_out
            ) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0)
        `;

        let successCount = 0;
        let failCount = 0;

        for (const employee of absentEmployees) {
            try {
                await db.query(insertQuery, [employee.id, currentDate]);
                successCount++;
                console.log(`[Scheduler] Marked ${employee.name} (ID: ${employee.id}) as absent`);
            } catch (err) {
                // Check if error is due to duplicate entry (race condition)
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`[Scheduler] Employee ${employee.name} (ID: ${employee.id}) already has attendance record (race condition)`);
                } else {
                    failCount++;
                    console.error(`[Scheduler] Failed to mark ${employee.name} (ID: ${employee.id}) as absent:`, err.message);
                }
            }
        }

        const result = {
            success: true,
            date: currentDate,
            totalEmployees: allEmployees.length,
            presentEmployees: markedEmployeeIds.size,
            absentEmployees: absentEmployees.length,
            markedAsAbsent: successCount,
            failedToMark: failCount
        };

        console.log(`[Scheduler] Task completed successfully:`, result);
        return result;

    } catch (error) {
        console.error('[Scheduler] Error marking absent employees:', error);
        return {
            success: false,
            error: error.message,
            date: getCurrentDateIST()
        };
    }
}

/**
 * Manual trigger for testing - can be called via API endpoint
 */
async function triggerManualAbsentMarking(targetDate = null) {
    const dateToUse = targetDate || getCurrentDateIST();
    console.log(`[Manual Trigger] Marking absent employees for date: ${dateToUse}`);

    // Temporarily override getCurrentDateIST for manual trigger
    const originalFunction = getCurrentDateIST;
    if (targetDate) {
        getCurrentDateIST = () => targetDate;
    }

    const result = await markAbsentEmployees();

    // Restore original function
    getCurrentDateIST = originalFunction;

    return result;
}

module.exports = {
    markAbsentEmployees,
    triggerManualAbsentMarking,
    getCurrentDateIST
};
