/**
 * Stock Snapshot Scheduler
 * =========================
 * Takes a daily inventory snapshot at midnight IST.
 * Midnight IST = 18:30 UTC → cron pattern '30 18 * * *'
 */

const cron = require('node-cron');
const inventoryService = require('../services/stockInventoryService');

let job = null;

function getISTDateString() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().slice(0, 10);
}

function initialize() {
    if (job) {
        console.log('[StockSnapshot] Scheduler already running');
        return;
    }

    // Run at midnight IST (18:30 UTC)
    job = cron.schedule('30 18 * * *', async () => {
        const snapshotDate = getISTDateString();
        console.log(`[StockSnapshot] Taking daily snapshot for ${snapshotDate}...`);
        try {
            await inventoryService.takeDailySnapshot(snapshotDate);
            console.log(`[StockSnapshot] ✅ Snapshot completed for ${snapshotDate}`);
        } catch (err) {
            console.error(`[StockSnapshot] ❌ Snapshot failed for ${snapshotDate}:`, err.message);
        }
    }, {
        scheduled: true,
        timezone: 'UTC',
    });

    console.log('[StockSnapshot] ✅ Daily snapshot scheduler initialized (midnight IST / 18:30 UTC)');
}

function stop() {
    if (job) {
        job.stop();
        job = null;
        console.log('[StockSnapshot] Scheduler stopped');
    }
}

module.exports = { initialize, stop };
