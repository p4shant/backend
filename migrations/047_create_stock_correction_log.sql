-- ============================================================================
-- Stock Correction Log — Audit trail for Master Admin corrections
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_correction_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movement_log_id INT NOT NULL,
    old_quantity_change INT NOT NULL,
    new_quantity_change INT NOT NULL,
    old_quantity_after INT NOT NULL,
    new_quantity_after INT NOT NULL,
    reason TEXT,
    corrected_by INT NOT NULL,
    affected_subsequent_rows INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movement_log_id) REFERENCES stock_movement_log(id),
    FOREIGN KEY (corrected_by) REFERENCES employees(id)
);

CREATE INDEX idx_correction_log_movement ON stock_correction_log(movement_log_id);
CREATE INDEX idx_correction_log_created ON stock_correction_log(created_at);
