/**
 * Stock Correction Service
 * ==========================
 * Master Admin edits a movement log entry's quantity.
 * In a SINGLE transaction this service:
 *   1. Updates the movement_log row
 *   2. Updates the corresponding inward_items / outward_items row
 *   3. Recascades all SUBSEQUENT log entries for the same inventory slot
 *   4. Updates stock_inventory to the correct current balance
 *   5. Regenerates daily snapshots for all affected dates
 *   6. Logs the correction for audit
 */

const db = require('../config/db');

/**
 * Correct a single movement log entry and recascade everything.
 *
 * @param {number} logId              - stock_movement_log.id to edit
 * @param {number} newQuantityChange  - The corrected quantity_change (positive for inward, negative for outward)
 * @param {number} editedBy           - employee id of the master admin
 * @param {string} reason             - reason for correction (audit trail)
 */
async function correctMovementLog(logId, newQuantityChange, editedBy, reason) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // ── 1. Fetch the original log entry ──────────────────────────
        const [logRows] = await conn.execute(
            'SELECT * FROM stock_movement_log WHERE id = ?', [logId]
        );
        if (!logRows.length) {
            const err = new Error('Movement log entry not found');
            err.status = 404;
            throw err;
        }
        const logEntry = logRows[0];

        const {
            district, component, sub_type, brand, dcr_type,
            quantity_change: oldQuantityChange, quantity_before,
            reference_type, reference_id,
        } = logEntry;

        // ── 2. Calculate new quantity_after ───────────────────────────
        const newQuantityAfter = quantity_before + newQuantityChange;
        if (newQuantityAfter < 0) {
            const label = sub_type ? `${component}(${sub_type})` : component;
            const err = new Error(
                `Correction would result in negative balance for ${label} in ${district}. ` +
                `Before: ${quantity_before}, New change: ${newQuantityChange}, Would become: ${newQuantityAfter}`
            );
            err.status = 400;
            throw err;
        }

        // ── 3. Update the movement_log row ───────────────────────────
        await conn.execute(
            `UPDATE stock_movement_log SET quantity_change = ?, quantity_after = ? WHERE id = ?`,
            [newQuantityChange, newQuantityAfter, logId]
        );

        // ── 4. Update corresponding inward_items or outward_items ────
        const subTypeClause = sub_type ? 'AND sub_type = ?' : 'AND sub_type IS NULL';
        const absQty = Math.abs(newQuantityChange);

        if (reference_type === 'inward') {
            const params = sub_type
                ? [absQty, reference_id, component, sub_type]
                : [absQty, reference_id, component];
            await conn.execute(
                `UPDATE stock_inward_items SET actual_quantity = ?
                 WHERE inward_id = ? AND component = ? ${subTypeClause}`,
                params
            );
        } else if (reference_type === 'outward') {
            const params = sub_type
                ? [absQty, reference_id, component, sub_type]
                : [absQty, reference_id, component];
            await conn.execute(
                `UPDATE stock_outward_items SET actual_quantity = ?
                 WHERE outward_id = ? AND component = ? ${subTypeClause}`,
                params
            );
        }

        // ── 5. Recascade all SUBSEQUENT log entries for same slot ────
        const cascadeSubTypeWhere = sub_type ? 'AND sub_type = ?' : 'AND sub_type IS NULL';
        const cascadeParams = sub_type
            ? [district, component, sub_type, brand, dcr_type, logId]
            : [district, component, brand, dcr_type, logId];

        const [subsequentLogs] = await conn.execute(
            `SELECT id, quantity_change, quantity_before, quantity_after
             FROM stock_movement_log
             WHERE district = ? AND component = ? ${cascadeSubTypeWhere}
               AND brand = ? AND dcr_type = ? AND id > ?
             ORDER BY id ASC`,
            cascadeParams
        );

        let runningBalance = newQuantityAfter;
        for (const row of subsequentLogs) {
            const correctedBefore = runningBalance;
            const correctedAfter = runningBalance + row.quantity_change;

            if (correctedAfter < 0) {
                const label = sub_type ? `${component}(${sub_type})` : component;
                const err = new Error(
                    `Correction causes negative balance at log #${row.id} for ${label} in ${district}. ` +
                    `Balance: ${correctedBefore}, Change: ${row.quantity_change}, Would become: ${correctedAfter}. ` +
                    `Fix that entry first or use a different value.`
                );
                err.status = 400;
                throw err;
            }

            await conn.execute(
                `UPDATE stock_movement_log SET quantity_before = ?, quantity_after = ? WHERE id = ?`,
                [correctedBefore, correctedAfter, row.id]
            );
            runningBalance = correctedAfter;
        }

        // ── 6. Update stock_inventory to final running balance ───────
        if (sub_type) {
            const [upd] = await conn.execute(
                `UPDATE stock_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE district = ? AND component = ? AND sub_type = ? AND brand = ? AND dcr_type = ?`,
                [runningBalance, district, component, sub_type, brand, dcr_type]
            );
            if (upd.affectedRows === 0) {
                await conn.execute(
                    `INSERT INTO stock_inventory (district, component, sub_type, brand, dcr_type, quantity)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [district, component, sub_type, brand, dcr_type, runningBalance]
                );
            }
        } else {
            const [upd] = await conn.execute(
                `UPDATE stock_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE district = ? AND component = ? AND sub_type IS NULL AND brand = ? AND dcr_type = ?`,
                [runningBalance, district, component, brand, dcr_type]
            );
            if (upd.affectedRows === 0) {
                await conn.execute(
                    `INSERT INTO stock_inventory (district, component, sub_type, brand, dcr_type, quantity)
                     VALUES (?, ?, NULL, ?, ?, ?)`,
                    [district, component, brand, dcr_type, runningBalance]
                );
            }
        }

        // ── 7. Regenerate daily snapshots for affected dates ─────────
        const snapshotParams = sub_type
            ? [district, component, sub_type, brand, dcr_type, logId]
            : [district, component, brand, dcr_type, logId];

        const [affectedDates] = await conn.execute(
            `SELECT DISTINCT DATE(created_at) as snap_date
             FROM stock_movement_log
             WHERE district = ? AND component = ? ${cascadeSubTypeWhere}
               AND brand = ? AND dcr_type = ? AND id >= ?
             ORDER BY snap_date ASC`,
            snapshotParams
        );

        for (const { snap_date } of affectedDates) {
            const dateStr = snap_date instanceof Date
                ? snap_date.toISOString().slice(0, 10)
                : String(snap_date).slice(0, 10);

            await conn.execute('DELETE FROM stock_daily_snapshot WHERE snapshot_date = ?', [dateStr]);
            await conn.execute(
                `INSERT INTO stock_daily_snapshot
                     (snapshot_date, district, component, sub_type, brand, dcr_type, quantity)
                 SELECT ?, district, component, sub_type, brand, dcr_type, SUM(quantity) AS quantity
                 FROM stock_inventory WHERE quantity > 0
                 GROUP BY district, component, sub_type, brand, dcr_type`,
                [dateStr]
            );
        }

        // Also regenerate today's snapshot
        const now = new Date();
        const todayStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        await conn.execute('DELETE FROM stock_daily_snapshot WHERE snapshot_date = ?', [todayStr]);
        await conn.execute(
            `INSERT INTO stock_daily_snapshot
                 (snapshot_date, district, component, sub_type, brand, dcr_type, quantity)
             SELECT ?, district, component, sub_type, brand, dcr_type, SUM(quantity) AS quantity
             FROM stock_inventory WHERE quantity > 0
             GROUP BY district, component, sub_type, brand, dcr_type`,
            [todayStr]
        );

        // ── 8. Audit log ────────────────────────────────────────────
        await conn.execute(
            `INSERT INTO stock_correction_log
             (movement_log_id, old_quantity_change, new_quantity_change, old_quantity_after, new_quantity_after,
              reason, corrected_by, affected_subsequent_rows)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logId, oldQuantityChange, newQuantityChange,
                quantity_before + oldQuantityChange, newQuantityAfter,
                reason || null, editedBy, subsequentLogs.length,
            ]
        );

        await conn.commit();

        return {
            message: 'Correction applied successfully',
            logId,
            oldQuantityChange,
            newQuantityChange,
            newBalance: runningBalance,
            subsequentRowsCorrected: subsequentLogs.length,
            snapshotsRegenerated: affectedDates.length + 1,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { correctMovementLog };
