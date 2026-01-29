const { Router } = require('express');
const { triggerManualAbsentMarking } = require('../services/attendanceSchedulerService');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

/**
 * Manual trigger endpoint for testing absent marking
 * POST /api/scheduler/mark-absent
 * Optional body: { "date": "2026-01-29" }
 */
router.post('/mark-absent', authenticate, async (req, res) => {
    try {
        // Only allow Master Admin to trigger this
        if (req.user.employee_role !== 'Master Admin') {
            return res.status(403).json({
                message: 'Access denied. Only Master Admin can trigger this action.'
            });
        }

        const targetDate = req.body.date || null;

        if (targetDate) {
            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(targetDate)) {
                return res.status(400).json({
                    message: 'Invalid date format. Use YYYY-MM-DD format.'
                });
            }
        }

        console.log(`[API] Manual trigger requested by ${req.user.name} (ID: ${req.user.id})`);

        const result = await triggerManualAbsentMarking(targetDate);

        return res.json({
            success: true,
            message: 'Absent marking completed',
            ...result
        });
    } catch (err) {
        console.error('[API] Manual trigger failed:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to mark absent employees'
        });
    }
});

/**
 * Get scheduler status
 * GET /api/scheduler/status
 */
router.get('/status', authenticate, (req, res) => {
    try {
        // Only allow Master Admin to view this
        if (req.user.employee_role !== 'Master Admin') {
            return res.status(403).json({
                message: 'Access denied. Only Master Admin can view scheduler status.'
            });
        }

        return res.json({
            success: true,
            scheduler: {
                enabled: true,
                schedule: 'Daily at 11:30 PM IST (6:30 PM UTC)',
                cronExpression: '30 18 * * *',
                timezone: 'IST (UTC+5:30)',
                description: 'Automatically marks employees as absent if they haven\'t marked attendance by 11:30 PM IST'
            },
            endpoints: {
                manualTrigger: 'POST /api/scheduler/mark-absent',
                status: 'GET /api/scheduler/status'
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to get scheduler status'
        });
    }
});

module.exports = router;
