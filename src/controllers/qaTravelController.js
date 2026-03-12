const qaTravelService = require('../services/qaTravelService');
const attendanceService = require('../services/employeeAttendanceService');
const { uploadTravelImage } = require('../utils/upload');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildTravelImageUrl(employeeId, filename) {
    return `/uploads/travel/${employeeId}/${filename}`;
}

// ─── GET /qa-travel/today ─────────────────────────────────────────────────

async function getTodayStatus(req, res) {
    try {
        if (req.user.employee_role !== 'QA Tester') {
            return res.status(403).json({ message: 'Only QA Testers can access this endpoint' });
        }
        const log = await qaTravelService.getTodayForEmployee(req.user.id);
        if (!log) {
            return res.json({ exists: false });
        }
        const customers = await qaTravelService.getCustomerVisits(log.id);
        return res.json({ exists: true, ...log, customers });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch today status' });
    }
}

// ─── POST /qa-travel/punch-in ─────────────────────────────────────────────

function punchIn(req, res) {
    uploadTravelImage('photo')(req, res, async (uploadErr) => {
        if (uploadErr) {
            return res.status(uploadErr.status || 400).json({ message: uploadErr.message || 'Upload failed' });
        }
        try {
            if (req.user.employee_role !== 'QA Tester') {
                return res.status(403).json({ message: 'Only QA Testers can punch in travel' });
            }

            // Validate reading
            const reading = parseFloat(req.body.reading);
            if (isNaN(reading) || reading < 0) {
                return res.status(400).json({ message: 'A valid speedometer reading (≥ 0) is required' });
            }

            // Validate location
            let location = null;
            try {
                location = req.body.location ? JSON.parse(req.body.location) : null;
            } catch (_) {
                return res.status(400).json({ message: 'Invalid location format' });
            }
            if (!location || !location.latitude || !location.longitude) {
                return res.status(400).json({ message: 'GPS location is required to punch in' });
            }

            // Validate photo
            if (!req.file) {
                return res.status(400).json({ message: 'Speedometer photo is required to punch in' });
            }

            const employeeId = req.user.id;
            const imageUrl = buildTravelImageUrl(employeeId, req.file.filename);
            const startTime = new Date().toISOString(); // UTC ISO
            const today = qaTravelService.getTodayIST();

            // Create attendance record (speedometer photo doubles as attendance punch-in)
            let attendance = null;
            try {
                attendance = await attendanceService.create({
                    employee_id: employeeId,
                    attendance_date: today,
                    punch_in_time: startTime,
                    punch_in_image_url: imageUrl,
                    punch_in_latitude: location.latitude,
                    punch_in_longitude: location.longitude,
                    forgot_to_punch_out: 1,
                    attendance_mode: 'self',
                });
            } catch (attErr) {
                // If attendance already exists (e.g. duplicate), still proceed with travel log
                if (attErr.status !== 409) throw attErr;
                // Re-fetch existing attendance record for this day to get the id
                attendance = await attendanceService.getByEmployeeAndDate(employeeId, today);
            }

            const travelLog = await qaTravelService.createStartEntry({
                employee_id: employeeId,
                attendance_id: attendance?.id || null,
                start_reading: reading,
                start_image_url: imageUrl,
                start_latitude: location.latitude,
                start_longitude: location.longitude,
                start_time: startTime,
            });

            return res.status(201).json({ exists: true, ...travelLog, customers: [] });
        } catch (err) {
            return res.status(err.status || 500).json({ message: err.message || 'Unable to punch in' });
        }
    });
}

// ─── POST /qa-travel/punch-out ───────────────────────────────────────────

function punchOut(req, res) {
    uploadTravelImage('photo')(req, res, async (uploadErr) => {
        if (uploadErr) {
            return res.status(uploadErr.status || 400).json({ message: uploadErr.message || 'Upload failed' });
        }
        try {
            if (req.user.employee_role !== 'QA Tester') {
                return res.status(403).json({ message: 'Only QA Testers can punch out travel' });
            }

            const employeeId = req.user.id;

            // Fetch existing travel log for today
            const existing = await qaTravelService.getTodayForEmployee(employeeId);
            if (!existing) {
                return res.status(404).json({ message: 'No travel punch-in found for today. Please punch in first.' });
            }
            if (existing.end_time) {
                return res.status(409).json({ message: 'Day already ended. You have already punched out today.' });
            }

            // Validate reading
            const reading = parseFloat(req.body.reading);
            if (isNaN(reading) || reading < 0) {
                return res.status(400).json({ message: 'A valid speedometer reading is required' });
            }

            // Validate location
            let location = null;
            try {
                location = req.body.location ? JSON.parse(req.body.location) : null;
            } catch (_) {
                return res.status(400).json({ message: 'Invalid location format' });
            }
            if (!location || !location.latitude || !location.longitude) {
                return res.status(400).json({ message: 'GPS location is required to punch out' });
            }

            // Validate photo
            if (!req.file) {
                return res.status(400).json({ message: 'Speedometer photo is required to punch out' });
            }

            // Parse and validate customers
            let customers = [];
            try {
                customers = req.body.customers ? JSON.parse(req.body.customers) : [];
            } catch (_) {
                return res.status(400).json({ message: 'Invalid customers format' });
            }
            if (!Array.isArray(customers) || customers.length === 0) {
                return res.status(400).json({ message: 'At least one customer visit must be logged at punch-out' });
            }

            const imageUrl = buildTravelImageUrl(employeeId, req.file.filename);
            const endTime = new Date().toISOString();

            // Update travel log
            const updated = await qaTravelService.updateEndEntry(existing.id, {
                end_reading: reading,
                end_image_url: imageUrl,
                end_latitude: location.latitude,
                end_longitude: location.longitude,
                end_time: endTime,
            });

            // Insert customer visits
            await qaTravelService.addCustomerVisits(existing.id, customers);

            // Update attendance punch-out (clears forgot_to_punch_out)
            if (existing.attendance_id) {
                try {
                    await attendanceService.patchPunchOut(existing.attendance_id, {
                        punch_out_time: endTime,
                        punch_out_image_url: imageUrl,
                        punch_out_latitude: location.latitude,
                        punch_out_longitude: location.longitude,
                    });
                } catch (attErr) {
                    // Non-fatal: travel log is saved, attendance update failed
                    console.error('Failed to update attendance punch-out:', attErr.message);
                }
            }

            const customerList = await qaTravelService.getCustomerVisits(existing.id);
            return res.json({ exists: true, ...updated, customers: customerList });
        } catch (err) {
            return res.status(err.status || 500).json({ message: err.message || 'Unable to punch out' });
        }
    });
}

// ─── GET /qa-travel/logs (admin) ─────────────────────────────────────────

async function listLogs(req, res) {
    try {
        const { page, limit, date_from, date_to, employee_id } = req.query;
        const result = await qaTravelService.listLogs({
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 30,
            date_from,
            date_to,
            employee_id: employee_id ? Number(employee_id) : undefined,
        });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch travel logs' });
    }
}

// ─── GET /qa-travel/logs/:id (admin) ─────────────────────────────────────

async function getLogDetail(req, res) {
    try {
        const log = await qaTravelService.getLogById(Number(req.params.id));
        if (!log) return res.status(404).json({ message: 'Travel log not found' });
        return res.json(log);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch travel log' });
    }
}

// ─── GET /qa-travel/customers/search ────────────────────────────────────

async function searchCustomers(req, res) {
    try {
        const q = String(req.query.q || '').trim();
        if (!q || q.length < 1) return res.json([]);
        const results = await qaTravelService.searchCustomers(q);
        return res.json(results);
    } catch (err) {
        return res.status(500).json({ message: 'Customer search failed' });
    }
}

// ─── GET /qa-travel/testers (admin) ─────────────────────────────────────

async function getQATesters(req, res) {
    try {
        const testers = await qaTravelService.getQATesters();
        return res.json(testers);
    } catch (err) {
        return res.status(500).json({ message: 'Unable to fetch QA Testers' });
    }
}

module.exports = {
    getTodayStatus,
    punchIn,
    punchOut,
    listLogs,
    getLogDetail,
    searchCustomers,
    getQATesters,
};
