const attendanceService = require('../services/employeeAttendanceService');
const { uploadAttendanceImage } = require('../utils/upload');
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
                forgot_to_punch_out: 1,
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

module.exports.getTodayStatus = getTodayStatus;
module.exports.punchIn = punchIn;
module.exports.punchOut = punchOut;
