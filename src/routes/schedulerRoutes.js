const { Router } = require('express');
const { triggerManualAbsentMarking, getCurrentDateIST } = require('../services/attendanceSchedulerService');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

/**
 * Manual trigger endpoint for testing absent marking
 * POST /api/scheduler/mark-absent
 * 
 * Description: Manually trigger the absent marking process
 * Optional body: { "date": "2026-01-29" }
 * If no date provided, uses today's date in IST timezone
 * 
 * Only Master Admin can access this
 */
router.post('/mark-absent', authenticate, async (req, res) => {
    try {
        // Only allow Master Admin to trigger this
        if (req.user.employee_role !== 'Master Admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Master Admin can trigger this action.'
            });
        }

        const targetDate = req.body.date || null;
        const requestTime = new Date();
        const requestTimeIST = new Date(requestTime.getTime() + 5.5 * 60 * 60 * 1000);

        if (targetDate) {
            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(targetDate)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD format (e.g., 2026-02-11).'
                });
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('API: Manual Absent Marking Trigger');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Triggered by: ${req.user.name} (ID: ${req.user.id}, Role: ${req.user.employee_role})`);
        console.log(`Request Time (UTC): ${requestTime.toISOString()}`);
        console.log(`Request Time (IST): ${requestTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`Target Date: ${targetDate || getCurrentDateIST()} (IST)`);
        console.log('═══════════════════════════════════════════════════');
        console.log('');

        const result = await triggerManualAbsentMarking(targetDate);

        return res.json({
            success: true,
            message: 'Absent marking completed successfully',
            requestedAt: {
                utc: requestTime.toISOString(),
                ist: requestTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            },
            ...result
        });
    } catch (err) {
        console.error('[API] Manual trigger failed:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to mark absent employees',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

/**
 * Get scheduler status and configuration
 * GET /api/scheduler/status
 * 
 * Returns: Scheduler configuration, timezone info, and API endpoints
 * Only Master Admin can access this
 */
router.get('/status', authenticate, (req, res) => {
    try {
        // Only allow Master Admin to view this
        if (req.user.employee_role !== 'Master Admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Master Admin can view scheduler status.'
            });
        }

        const currentTimeUTC = new Date();
        const currentTimeIST = new Date(currentTimeUTC.getTime() + 5.5 * 60 * 60 * 1000);
        const todayIST = getCurrentDateIST();

        return res.json({
            success: true,
            scheduler: {
                enabled: true,
                status: 'ACTIVE',
                schedule: '11:00 PM IST every day',
                scheduleDescription: 'Runs daily at 11:00 PM Indian Standard Time',
                cronExpression: '30 17 * * *',
                cronExplanation: 'Minute: 30, Hour: 17 (UTC), Day: every day, Month: every month, DayOfWeek: every day',
                utcTime: '17:30 UTC (5:30 PM UTC)',
                istTime: '11:00 PM IST (23:00)',
                timezone: 'IST (UTC+5:30)',
                purpose: 'Automatically marks employees as absent if they haven\'t marked attendance by 11:00 PM IST'
            },
            currentTime: {
                utc: currentTimeUTC.toISOString(),
                ist: currentTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                today_ist: todayIST
            },
            productionNotes: {
                note1: 'Cron runs at UTC time (17:30 UTC = 11:00 PM IST)',
                note2: 'This works on any VPS regardless of server timezone',
                note3: 'Date calculations use IST (UTC+5:30) offset in code',
                note4: 'Even if VPS is set to UTC, the scheduler works correctly',
                note5: 'Check server logs daily to verify execution'
            },
            endpoints: {
                manualTrigger: 'POST /api/scheduler/mark-absent',
                manualTriggerWithDate: 'POST /api/scheduler/mark-absent with body {"date": "2026-02-11"}',
                getStatus: 'GET /api/scheduler/status'
            },
            apiAccess: {
                requiresAuth: true,
                requiresRole: 'Master Admin',
                testCommand: 'curl -X POST http://localhost:3000/api/scheduler/mark-absent -H "Authorization: Bearer YOUR_TOKEN"'
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to get scheduler status',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

module.exports = router;
