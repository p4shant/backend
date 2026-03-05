-- ============================================================================
-- Stock Management V2 — Sub-types for Inverter & Panel + Daily Snapshot
-- ============================================================================

-- 1. Add sub_type column to stock_inventory
ALTER TABLE stock_inventory ADD COLUMN sub_type VARCHAR(20) DEFAULT NULL AFTER component;
ALTER TABLE stock_inventory DROP INDEX uq_inventory;
ALTER TABLE stock_inventory ADD UNIQUE KEY uq_inventory (district, component, sub_type, brand, dcr_type);

-- 2. Add sub_type column to stock_inward_items
ALTER TABLE stock_inward_items ADD COLUMN sub_type VARCHAR(20) DEFAULT NULL AFTER component;

-- 3. Add sub_type column to stock_outward_items
ALTER TABLE stock_outward_items ADD COLUMN sub_type VARCHAR(20) DEFAULT NULL AFTER component;

-- 4. Add sub_type column to stock_movement_log
ALTER TABLE stock_movement_log ADD COLUMN sub_type VARCHAR(20) DEFAULT NULL AFTER component;

-- 5. Daily snapshot table (end-of-day inventory picture)
CREATE TABLE IF NOT EXISTS stock_daily_snapshot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    district VARCHAR(50) NOT NULL,
    component VARCHAR(50) NOT NULL,
    sub_type VARCHAR(20) DEFAULT NULL,
    brand VARCHAR(50) NOT NULL,
    dcr_type ENUM('DCR', 'Non-DCR') NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_snapshot (snapshot_date, district, component, sub_type, brand, dcr_type)
);

-- 6. Indexes for performance
CREATE INDEX idx_snapshot_date ON stock_daily_snapshot(snapshot_date);
CREATE INDEX idx_snapshot_district ON stock_daily_snapshot(district);
CREATE INDEX idx_movement_subtype ON stock_movement_log(component, sub_type);
CREATE INDEX idx_inventory_subtype ON stock_inventory(component, sub_type);
