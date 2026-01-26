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

// Helper to compute today's date string in local timezone (YYYY-MM-DD)
function getTodayStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function getTodayStatus(req, res) {
    try {
        const employeeId = req.user.id;
        const today = getTodayStr();
        const record = await attendanceService.getByEmployeeAndDate(employeeId, today);

        let total_hours = null;
        if (record?.punch_in_time && record?.punch_out_time) {
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

function nowISTMySQL() {
    const now = new Date();
    const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
    const ist = new Date(istMs);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    const hh = String(ist.getHours()).padStart(2, '0');
    const mm = String(ist.getMinutes()).padStart(2, '0');
    const ss = String(ist.getSeconds()).padStart(2, '0');
    return { mysql: `${y}-${m}-${d} ${hh}:${mm}:${ss}`, hours: Number(hh), minutes: Number(mm) };
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
            const istNow = nowISTMySQL();
            const punch_in_time = istNow.mysql;
            const imageUrl = req.file ? buildAttendanceImageUrl(req, req.file.filename) : null;

            const created = await attendanceService.create({
                employee_id: employeeId,
                attendance_date: today,
                punch_in_time,
                punch_in_image_url: imageUrl,
                punch_in_latitude: location?.latitude || null,
                punch_in_longitude: location?.longitude || null,
                is_late: (istNow.hours > 10 || (istNow.hours === 10 && istNow.minutes > 30)) ? 1 : 0,
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
            const istNow = nowISTMySQL();
            const punch_out_time = istNow.mysql;
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
