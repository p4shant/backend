const attendanceService = require('../services/employeeAttendanceService');
const { uploadAttendanceImage } = require('../utils/upload');
const { isWithinAnyOffice } = require('../utils/geoValidation');
const path = require('path');

async function list(req, res) {
    try {
        const { page = 1, limit = 500, employee_id, date_from, date_to, includeAbsentees } = req.query;
        const filters = {
            page: Number(page),
            limit: Number(limit),
            employee_id: employee_id ? Number(employee_id) : undefined,
            date_from,
            date_to
        };

        // Use listWithAbsentees when includeAbsentees=true or for monitor attendance page
        if (includeAbsentees === 'true' || !employee_id) {
            const result = await attendanceService.listWithAbsentees(filters);
            return res.json(result);
        }

        const result = await attendanceService.list(filters);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch attendance' });
    }
}

async function getById(req, res) {
    try {
        const record = await attendanceService.getById(Number(req.params.id));
        if (!record) return res.status(404).json({ message: 'Attendance record not found' });
        return res.json(record);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch attendance record' });
    }
}

async function create(req, res) {
    try {
        const record = await attendanceService.create(req.body);
        return res.status(201).json(record);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to create attendance record' });
    }
}

async function update(req, res) {
    try {
        const record = await attendanceService.update(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update attendance record' });
    }
}

async function partialUpdate(req, res) {
    try {
        const record = await attendanceService.partialUpdate(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update attendance record' });
    }
}

async function remove(req, res) {
    try {
        await attendanceService.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to delete attendance record' });
    }
}

async function patchPunchOut(req, res) {
    try {
        const record = await attendanceService.patchPunchOut(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to update punch-out details' });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    patchPunchOut,
    // New exports will be assigned below
};

// Get today's date in IST timezone (YYYY-MM-DD)
// NOTE: attendance_date field represents a calendar day in IST, not a UTC timestamp.
// This is necessary because employees mark attendance based on their local calendar (IST).
// Timestamps (punch_in_time, punch_out_time) remain in UTC per timezone rules.
function getTodayStr() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);

    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

async function getTodayStatus(req, res) {
    try {
        const employeeId = req.user.id;
        const today = getTodayStr();
        const record = await attendanceService.getByEmployeeAndDate(employeeId, today);

        let total_hours = null;
        if (record?.punch_in_time && record?.punch_out_time) {
            // Calculate hours difference from UTC datetime strings
            // Timestamps already contain timezone info or are in UTC format
            const inTime = new Date(record.punch_in_time).getTime();
            const outTime = new Date(record.punch_out_time).getTime();
            total_hours = ((outTime - inTime) / (1000 * 60 * 60));
        }

        return res.json({
            punch_in_time: record?.punch_in_time || null,
            punch_out_time: record?.punch_out_time || null,
            total_hours,
            attendance_id: record?.id || null,
            punch_in_image_url: record?.punch_in_image_url || null,
            punch_out_image_url: record?.punch_out_image_url || null,
            punch_in_latitude: record?.punch_in_latitude || null,
            punch_in_longitude: record?.punch_in_longitude || null,
            punch_out_latitude: record?.punch_out_latitude || null,
            punch_out_longitude: record?.punch_out_longitude || null,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Unable to fetch today status' });
    }
}

function buildAttendanceImageUrl(req, filename) {
    const employeeId = req.user.id;
    // Static served from /uploads in app.js
    return `/uploads/attendance/${employeeId}/${filename}`;
}

function nowUTCMySQL() {
    // Store UTC time in MySQL - frontend will convert to IST for display
    const now = new Date(); // UTC internally
    // Return ISO format (with Z) so database stores it correctly for parsing
    const iso = now.toISOString();
    const mysql = iso.slice(0, 19).replace('T', ' ');
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    return { mysql, hours, minutes, iso };
}


async function punchIn(req, res) {
    // Handle upload first
    uploadAttendanceImage('photo')(req, res, async (uploadErr) => {
        if (uploadErr) {
            const status = uploadErr.status || 400;
            return res.status(status).json({ message: uploadErr.message || 'Upload failed' });
        }
        try {
            const employeeId = req.user.id;
            const today = getTodayStr();

            // Prevent duplicate
            const existing = await attendanceService.getByEmployeeAndDate(employeeId, today);
            if (existing) {
                return res.status(409).json({ message: 'Attendance already marked for today' });
            }

            const location = req.body.location ? JSON.parse(req.body.location) : null;

            // Geofence validation: employee must be within 500m of an office
            if (!location || !location.latitude || !location.longitude) {
                return res.status(400).json({ message: 'Location is required to mark attendance. Please enable location services.' });
            }
            const geoCheck = isWithinAnyOffice(location.latitude, location.longitude);
            if (!geoCheck.allowed) {
                return res.status(403).json({
                    message: `You are ${geoCheck.distance}m away from the nearest office (${geoCheck.nearestOffice}). Please be within ${geoCheck.radius}m of an office to mark attendance.`,
                    distance: geoCheck.distance,
                    nearestOffice: geoCheck.nearestOffice,
                    radius: geoCheck.radius,
                });
            }

            const utcNow = nowUTCMySQL();
            const punch_in_time = utcNow.iso; // Use ISO format for proper timezone awareness
            const imageUrl = req.file ? buildAttendanceImageUrl(req, req.file.filename) : null;

            // Note: is_late will be calculated by the service based on punch_in_time
            const created = await attendanceService.create({
                employee_id: employeeId,
                attendance_date: today,
                punch_in_time,
                punch_in_image_url: imageUrl,
                punch_in_latitude: location?.latitude || null,
                punch_in_longitude: location?.longitude || null,
                // is_late will be computed by service from punch_in_time
                forgot_to_punch_out: 0,
            });

            return res.status(201).json(created);
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message || 'Unable to punch in' });
        }
    });
}

async function punchOut(req, res) {
    uploadAttendanceImage('photo')(req, res, async (uploadErr) => {
        if (uploadErr) {
            const status = uploadErr.status || 400;
            return res.status(status).json({ message: uploadErr.message || 'Upload failed' });
        }
        try {
            const employeeId = req.user.id;
            const today = getTodayStr();
            const existing = await attendanceService.getByEmployeeAndDate(employeeId, today);
            if (!existing) {
                return res.status(404).json({ message: 'No punch-in found for today' });
            }

            const location = req.body.location ? JSON.parse(req.body.location) : null;

            // Geofence validation: employee must be within 500m of an office
            if (!location || !location.latitude || !location.longitude) {
                return res.status(400).json({ message: 'Location is required to mark attendance. Please enable location services.' });
            }
            const geoCheck = isWithinAnyOffice(location.latitude, location.longitude);
            if (!geoCheck.allowed) {
                return res.status(403).json({
                    message: `You are ${geoCheck.distance}m away from the nearest office (${geoCheck.nearestOffice}). Please be within ${geoCheck.radius}m of an office to punch out.`,
                    distance: geoCheck.distance,
                    nearestOffice: geoCheck.nearestOffice,
                    radius: geoCheck.radius,
                });
            }

            const utcNow = nowUTCMySQL();
            const punch_out_time = utcNow.iso; // Use ISO format for proper timezone awareness
            const imageUrl = req.file ? buildAttendanceImageUrl(req, req.file.filename) : null;

            const updated = await attendanceService.patchPunchOut(existing.id, {
                punch_out_time,
                punch_out_image_url: imageUrl,
                punch_out_latitude: location?.latitude || null,
                punch_out_longitude: location?.longitude || null,
            });

            return res.json(updated);
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message || 'Unable to punch out' });
        }
    });
}

// ============================================================================
// SUPERVISOR TEAM ATTENDANCE — Technicians & Technical Assistants
// ============================================================================

const SUPERVISOR_NAMES = ['Upendra Nath', 'Aashish Singh', 'Sanjay Singh Yadav', 'SN Singh'];
const TEAM_ROLES = ['Technician', 'Technical Assistant'];

async function getTeamMembers(req, res) {
    try {
        const supervisorName = req.user.name;
        if (!SUPERVISOR_NAMES.includes(supervisorName)) {
            return res.status(403).json({ message: 'You are not authorized to manage team attendance' });
        }

        const db = require('../config/db');
        const members = await db.query(
            `SELECT id, name, employee_role, district FROM employees WHERE employee_role IN (?, ?) ORDER BY employee_role, name`,
            TEAM_ROLES
        );

        return res.json({ success: true, data: members });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch team members' });
    }
}

async function getTeamAttendance(req, res) {
    try {
        const supervisorName = req.user.name;
        if (!SUPERVISOR_NAMES.includes(supervisorName)) {
            return res.status(403).json({ message: 'You are not authorized to view team attendance' });
        }

        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'date query parameter is required (YYYY-MM-DD)' });
        }

        const db = require('../config/db');

        // Get all team members
        const members = await db.query(
            `SELECT id, name, employee_role, district FROM employees WHERE employee_role IN (?, ?) ORDER BY employee_role, name`,
            TEAM_ROLES
        );

        // Get existing attendance records for that date
        const memberIds = members.map(m => m.id);
        let records = [];
        if (memberIds.length > 0) {
            const placeholders = memberIds.map(() => '?').join(',');
            const query = `SELECT ea.*, e.name AS employee_name, e.employee_role 
                 FROM employee_attendance ea 
                 JOIN employees e ON e.id = ea.employee_id 
                 WHERE ea.attendance_date = ? AND ea.employee_id IN (${placeholders})`;
            records = await db.query(query, [date, ...memberIds]);
        }

        const recordMap = new Map();
        records.forEach(r => recordMap.set(r.employee_id, r));

        // Merge: for each member, attach their attendance status for that date
        const result = members.map(member => {
            const record = recordMap.get(member.id);
            return {
                employee_id: member.id,
                employee_name: member.name,
                employee_role: member.employee_role,
                district: member.district,
                attendance_id: record?.id || null,
                attendance_mode: record?.attendance_mode || null,
                marked_status: record?.marked_status || null,
                marked_by: record?.marked_by || null,
                punch_in_time: record?.punch_in_time || null,
                punch_out_time: record?.punch_out_time || null,
            };
        });

        return res.json({ success: true, data: result });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch team attendance' });
    }
}

async function markTeamAttendance(req, res) {
    try {
        const supervisorName = req.user.name;
        const supervisorId = req.user.id;

        if (!SUPERVISOR_NAMES.includes(supervisorName)) {
            return res.status(403).json({ message: 'You are not authorized to mark team attendance' });
        }

        const { date, attendance } = req.body;
        // attendance = [{ employee_id: number, status: 'present' | 'absent' }]

        if (!date || !attendance || !Array.isArray(attendance)) {
            return res.status(400).json({ message: 'date and attendance array are required' });
        }

        const db = require('../config/db');

        // Validate all employee_ids are Technicians or Technical Assistants
        const employeeIds = attendance.map(a => a.employee_id);

        let employees = [];
        if (employeeIds.length > 0) {
            const placeholders = employeeIds.map(() => '?').join(',');
            const query = `SELECT id, employee_role FROM employees WHERE id IN (${placeholders})`;
            employees = await db.query(query, employeeIds);
        }

        const validIds = new Set(employees.filter(e => TEAM_ROLES.includes(e.employee_role)).map(e => e.id));
        const invalidEntries = attendance.filter(a => !validIds.has(a.employee_id));
        if (invalidEntries.length > 0) {
            return res.status(400).json({
                message: `Some employees are not Technician/Technical Assistant: ${invalidEntries.map(e => e.employee_id).join(', ')}`
            });
        }

        const results = [];
        for (const entry of attendance) {
            const { employee_id, status } = entry;

            // Check for existing record on this date
            const existing = await attendanceService.getByEmployeeAndDate(employee_id, date);

            if (existing) {
                // Update existing record
                const updated = await attendanceService.update(existing.id, {
                    attendance_mode: 'supervisor',
                    marked_by: supervisorId,
                    marked_status: status,
                    // Clear self-attendance fields if marking absent
                    punch_in_time: status === 'present' ? existing.punch_in_time : null,
                    punch_out_time: status === 'present' ? existing.punch_out_time : null,
                    is_late: 0,
                    forgot_to_punch_out: 0,
                });
                results.push(updated);
            } else {
                // Create new record
                const created = await attendanceService.create({
                    employee_id,
                    attendance_date: date,
                    attendance_mode: 'supervisor',
                    marked_by: supervisorId,
                    marked_status: status,
                    punch_in_time: null,
                    punch_out_time: null,
                    is_late: 0,
                    forgot_to_punch_out: 0,
                });
                results.push(created);
            }
        }

        return res.json({ message: `Attendance marked for ${results.length} employees`, results });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to mark team attendance' });
    }
}

module.exports.getTodayStatus = getTodayStatus;
module.exports.punchIn = punchIn;
module.exports.punchOut = punchOut;
module.exports.getTeamMembers = getTeamMembers;
module.exports.getTeamAttendance = getTeamAttendance;
module.exports.markTeamAttendance = markTeamAttendance;
