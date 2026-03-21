const webPush = require('web-push');
const db = require('../config/db');
const env = require('../config/env');
const logger = require('../utils/logger');

// Configure VAPID credentials once at module load
if (env.vapid.publicKey && env.vapid.privateKey) {
    webPush.setVapidDetails(
        env.vapid.email,
        env.vapid.publicKey,
        env.vapid.privateKey
    );
    logger.info('[Push] VAPID credentials configured');
} else {
    logger.warn('[Push] VAPID keys not set – web push will not work');
}

/**
 * Send a push notification to all registered devices for an employee.
 * payload: { title, body, icon?, badge?, data? }
 * Non-blocking – never throws.
 */
async function sendToEmployee(employeeId, payload) {
    if (!env.vapid.publicKey || !env.vapid.privateKey) return;

    let subscriptions;
    try {
        subscriptions = await db.query(
            'SELECT id, endpoint, keys_json FROM employee_push_subscriptions WHERE employee_id = ?',
            [employeeId]
        );
    } catch (err) {
        logger.error('[Push] DB error fetching subscriptions:', err.message);
        return;
    }

    if (!subscriptions || subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
        title: payload.title || 'KAMN Enterprises',
        body: payload.body || '',
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        data: payload.data || {}
    });

    for (const sub of subscriptions) {
        let keys;
        try {
            keys = JSON.parse(sub.keys_json);
        } catch {
            continue;
        }

        const pushSubscription = {
            endpoint: sub.endpoint,
            keys
        };

        try {
            await webPush.sendNotification(pushSubscription, pushPayload);
            logger.debug(`[Push] Sent to employee ${employeeId}, subscription ${sub.id}`);
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription expired – remove it
                logger.info(`[Push] Removing expired subscription ${sub.id}`);
                await db.query('DELETE FROM employee_push_subscriptions WHERE id = ?', [sub.id]).catch(() => { });
            } else {
                logger.warn(`[Push] Failed for subscription ${sub.id}: ${err.message}`);
            }
        }
    }
}

module.exports = { sendToEmployee };
