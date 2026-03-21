const db = require('../config/db');
const env = require('../config/env');

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key so the frontend can subscribe.
 */
async function getVapidPublicKey(req, res) {
    return res.json({ publicKey: env.vapid.publicKey });
}

/**
 * POST /api/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth } }
 * Saves push subscription for the logged-in employee.
 */
async function subscribe(req, res) {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        const employeeId = req.user.id;
        const keysJson = JSON.stringify(keys);
        const userAgent = req.headers['user-agent'] || null;

        // Upsert: if this endpoint already exists for this employee, update; otherwise insert
        const existing = await db.query(
            'SELECT id FROM employee_push_subscriptions WHERE employee_id = ? AND endpoint = ?',
            [employeeId, endpoint]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE employee_push_subscriptions SET keys_json = ?, user_agent = ? WHERE id = ?',
                [keysJson, userAgent, existing[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO employee_push_subscriptions (employee_id, endpoint, keys_json, user_agent) VALUES (?, ?, ?, ?)',
                [employeeId, endpoint, keysJson, userAgent]
            );
        }

        return res.status(201).json({ message: 'Subscription saved' });
    } catch (err) {
        console.error('[Push] Error saving subscription:', err.message);
        return res.status(500).json({ message: 'Failed to save subscription' });
    }
}

/**
 * DELETE /api/push/unsubscribe
 * Body: { endpoint }
 * Removes a push subscription.
 */
async function unsubscribe(req, res) {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ message: 'endpoint is required' });
        }

        await db.query(
            'DELETE FROM employee_push_subscriptions WHERE employee_id = ? AND endpoint = ?',
            [req.user.id, endpoint]
        );

        return res.json({ message: 'Unsubscribed successfully' });
    } catch (err) {
        console.error('[Push] Error removing subscription:', err.message);
        return res.status(500).json({ message: 'Failed to unsubscribe' });
    }
}

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
