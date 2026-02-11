const db = require('../config/db');

function computeIsLate(punchInTime) {
    if (!punchInTime) return 0;
    // Parse UTC datetime string
    // 10:30 AM IST = 05:00 AM UTC (IST is UTC+5:30)
    // So if punch-in is after 05:00 UTC, it's considered late
    const d = new Date(punchInTime);
    if (isNaN(d.getTime())) return 0; // if invalid date, treat as not late

    // Get UTC hours and minutes
    const utcHours = d.getUTCHours();
    const utcMinutes = d.getUTCMinutes();

    // Check if punch-in time is after 05:00 UTC (which is 10:30 IST)
    // Since we're comparing against 05:00, we can use a simple comparison
    const punchTimeInMinutes = utcHours * 60 + utcMinutes;
    const cutoffTimeInMinutes = 5 * 60; // 05:00 UTC = 300 minutes

    return punchTimeInMinutes > cutoffTimeInMinutes ? 1 : 0;
}

function validateCreatePayload(data) {
    const required = ['employee_id', 'attendance_date'];
    for (const field of required) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            const err = new Error(`${field} is required`);
            err.status = 400;
            throw err;
        }
    }
}

async function list(filters = {}) {
    const { page = 1, limit = 50, employee_id, date_from, date_to } = filters;
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (employee_id) {
        where.push('employee_id = ?');
        params.push(employee_id);
    }
    if (date_from) {
        where.push('attendance_date >= ?');
        params.push(date_from);
    }
    if (date_to) {
        where.push('attendance_date <= ?');
        params.push(date_to);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM employee_attendance ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = countRes[0]?.total || 0;

    const query = `
      SELECT *
      FROM employee_attendance
      ${whereClause}
      ORDER BY attendance_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.query(query, [...params, limit, offset]);
    return {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

async function listWithAbsentees(filters = {}) {
    const { page = 1, limit = 500, employee_id, date_from, date_to } = filters;
    const offset = (page - 1) * limit;

    // STEP 1: Fetch ALL employees from database (no filtering)
    const allEmployeesQuery = `SELECT id, name, employee_role FROM employees ORDER BY name`;
    const allEmployees = await db.query(allEmployeesQuery);

    console.log(`Total employees in database: ${allEmployees.length}`);

    // STEP 2: Fetch attendance records for the specified date range (IST)
    // If no date_from is provided, use today's IST date
    let targetDate = date_from;
    if (!targetDate) {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
    }

    const attendanceQuery = `
        SELECT 
            id,
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
            forgot_to_punch_out,
            created_at
        FROM employee_attendance
        WHERE attendance_date = ?
        ${employee_id ? 'AND employee_id = ?' : ''}
        ORDER BY punch_in_time ASC
    `;

    const attendanceParams = employee_id ? [targetDate, employee_id] : [targetDate];
    const attendanceRecords = await db.query(attendanceQuery, attendanceParams);

    console.log(`Attendance records found for ${targetDate}: ${attendanceRecords.length}`);

    // STEP 3: Create a Map for O(1) lookup of attendance by employee_id
    const attendanceByEmployeeId = new Map();
    attendanceRecords.forEach(record => {
        attendanceByEmployeeId.set(record.employee_id, record);
    });

    // STEP 4: Merge employee data with attendance data
    // If employee has attendance -> use attendance data
    // If employee has NO attendance -> mark as ABSENT with N/A values
    const completeRecords = allEmployees.map(employee => {
        const attendance = attendanceByEmployeeId.get(employee.id);

        if (attendance) {
            // Employee HAS attendance record - return full data
            let status = 'present';
            if (attendance.forgot_to_punch_out === 1) {
                status = 'forgot_to_punch_out';
            } else if (attendance.is_late === 1) {
                status = 'late';
            }

            return {
                id: attendance.id,
                employee_id: employee.id,
                employee_name: employee.name,
                employee_role: employee.employee_role,
                punch_in_time: attendance.punch_in_time,
                punch_out_time: attendance.punch_out_time,
                punch_in_location: `${attendance.punch_in_latitude || 'N/A'},${attendance.punch_in_longitude || 'N/A'}`,
                punch_out_location: attendance.punch_out_latitude && attendance.punch_out_longitude
                    ? `${attendance.punch_out_latitude},${attendance.punch_out_longitude}`
                    : null,
                punch_in_image_url: attendance.punch_in_image_url,
                punch_out_image_url: attendance.punch_out_image_url,
                punch_in_latitude: attendance.punch_in_latitude,
                punch_in_longitude: attendance.punch_in_longitude,
                punch_out_latitude: attendance.punch_out_latitude,
                punch_out_longitude: attendance.punch_out_longitude,
                total_hours: attendance.punch_in_time && attendance.punch_out_time
                    ? ((new Date(attendance.punch_out_time).getTime() - new Date(attendance.punch_in_time).getTime()) / (1000 * 60 * 60))
                    : 0,
                status: status,
                attendance_date: attendance.attendance_date,
                is_late: attendance.is_late,
                forgot_to_punch_out: attendance.forgot_to_punch_out
            };
        } else {
            // Employee has NO attendance record - return ABSENT with N/A values
            return {
                id: null, // No attendance record ID
                employee_id: employee.id,
                employee_name: employee.name,
                employee_role: employee.employee_role,
                punch_in_time: null,
                punch_out_time: null,
                punch_in_location: 'N/A',
                punch_out_location: null,
                punch_in_image_url: null,
                punch_out_image_url: null,
                punch_in_latitude: null,
                punch_in_longitude: null,
                punch_out_latitude: null,
                punch_out_longitude: null,
                total_hours: 0,
                status: 'absent',
                attendance_date: targetDate,
                is_late: 0,
                forgot_to_punch_out: 0
            };
        }
    });

    // STEP 5: Sort records - Present employees first (by punch time), then absent employees (by name)
    completeRecords.sort((a, b) => {
        // Absent employees go to the end
        if (!a.punch_in_time && b.punch_in_time) return 1;
        if (a.punch_in_time && !b.punch_in_time) return -1;

        // Both have punch_in_time - sort by time
        if (a.punch_in_time && b.punch_in_time) {
            return new Date(a.punch_in_time).getTime() - new Date(b.punch_in_time).getTime();
        }

        // Both absent - sort alphabetically by name
        return a.employee_name.localeCompare(b.employee_name);
    });

    // STEP 6: Calculate statistics
    const stats = {
        presentCount: completeRecords.filter(r => r.status === 'present').length,
        lateCount: completeRecords.filter(r => r.status === 'late').length,
        forgotPunchOutCount: completeRecords.filter(r => r.status === 'forgot_to_punch_out').length,
        absentCount: completeRecords.filter(r => r.status === 'absent').length
    };

    console.log('Stats:', stats);

    // STEP 7: Pagination
    const total = completeRecords.length;
    const paginatedRecords = completeRecords.slice(offset, offset + limit);

    // STEP 8: Return final response
    return {
        data: paginatedRecords,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        totalEmployees: allEmployees.length,
        stats: stats
    };
}

async function getById(id) {
    const rows = await db.query('SELECT * FROM employee_attendance WHERE id = ?', [id]);
    return rows[0] || null;
}

async function getByEmployeeAndDate(employeeId, attendanceDate) {
    const rows = await db.query(
        'SELECT * FROM employee_attendance WHERE employee_id = ? AND attendance_date = ?',
        [employeeId, attendanceDate]
    );
    return rows[0] || null;
}

async function create(data) {
    validateCreatePayload(data);

    // Validate employee exists
    const empRows = await db.query('SELECT id FROM employees WHERE id = ?', [data.employee_id]);
    if (empRows.length === 0) {
        const err = new Error('Invalid employee_id: Employee not found');
        err.status = 400;
        throw err;
    }

    // Prevent duplicate attendance for same day
    const existing = await getByEmployeeAndDate(data.employee_id, data.attendance_date);
    if (existing) {
        const err = new Error('Attendance already exists for this employee and date');
        err.status = 409;
        throw err;
    }

    const is_late = data.is_late !== undefined ? (data.is_late ? 1 : 0) : computeIsLate(data.punch_in_time);
    const forgot_to_punch_out = data.forgot_to_punch_out ? 1 : 0;

    const query = `
      INSERT INTO employee_attendance (
        employee_id, attendance_date,
        punch_in_image_url, punch_in_time,
        punch_out_time, punch_out_image_url,
        punch_in_latitude, punch_in_longitude,
        punch_out_latitude, punch_out_longitude,
        is_late, forgot_to_punch_out
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        data.employee_id,
        data.attendance_date,
        data.punch_in_image_url || null,
        data.punch_in_time || null,
        data.punch_out_time || null,
        data.punch_out_image_url || null,
        data.punch_in_latitude || null,
        data.punch_in_longitude || null,
        data.punch_out_latitude || null,
        data.punch_out_longitude || null,
        is_late,
        forgot_to_punch_out
    ];

    const result = await db.query(query, params);
    return getById(result.insertId);
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Attendance record not found');
        err.status = 404;
        throw err;
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;

    // Recompute is_late if punch_in_time is being set/changed
    if (updateData.punch_in_time !== undefined) {
        updateData.is_late = computeIsLate(updateData.punch_in_time);
    }

    // If punch_out_time is provided, clear forgot_to_punch_out
    if (updateData.punch_out_time) {
        updateData.forgot_to_punch_out = 0;
    }

    if (Object.keys(updateData).length === 0) {
        return existing;
    }

    const fields = Object.keys(updateData);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const query = `UPDATE employee_attendance SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);
    return getById(id);
}

async function partialUpdate(id, data) {
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM employee_attendance WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Attendance record not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function patchPunchOut(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Attendance record not found');
        err.status = 404;
        throw err;
    }

    const updateData = {};
    if (data.punch_out_time !== undefined) updateData.punch_out_time = data.punch_out_time;
    if (data.punch_out_image_url !== undefined) updateData.punch_out_image_url = data.punch_out_image_url;
    if (data.punch_out_latitude !== undefined) updateData.punch_out_latitude = data.punch_out_latitude;
    if (data.punch_out_longitude !== undefined) updateData.punch_out_longitude = data.punch_out_longitude;

    // Mark as not forgotten if punch_out_time present
    if (updateData.punch_out_time) {
        updateData.forgot_to_punch_out = 0;
    }

    if (Object.keys(updateData).length === 0) {
        return existing;
    }

    const fields = Object.keys(updateData);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const query = `UPDATE employee_attendance SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);
    return getById(id);
}

module.exports = {
    list,
    listWithAbsentees,
    getById,
    getByEmployeeAndDate,
    create,
    update,
    partialUpdate,
    remove,
    patchPunchOut
};
