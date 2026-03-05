-- ============================================================================
-- Stock Management Module - Database Schema
-- ============================================================================
-- Tables:
--   1. stock_dealers          - Master data for dealers
--   2. stock_inventory        - Current stock levels per district/component/brand/dcr
--   3. stock_inward           - Inward transaction headers
--   4. stock_inward_systems   - System type breakdown per inward
--   5. stock_inward_items     - Component breakdown per inward
--   6. stock_outward          - Outward transaction headers
--   7. stock_outward_systems  - System type breakdown per outward
--   8. stock_outward_items    - Component breakdown per outward
--   9. stock_movement_log     - Audit trail for every inventory change
-- ============================================================================

-- 1. Dealers master table
CREATE TABLE IF NOT EXISTS stock_dealers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default dealers
INSERT IGNORE INTO stock_dealers (name) VALUES
    ('NV'), ('Green Sign'), ('Arpit Solar'), ('JDM'), ('Sri Saluday'),
    ('Nancan'), ('Ojas'), ('SuryaSatu'), ('Shardha'), ('Balaji'), ('Vishwakarma');

-- 2. Live inventory state
-- Unique key: district + component + brand + dcr_type
CREATE TABLE IF NOT EXISTS stock_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    district VARCHAR(50) NOT NULL,
    component VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    dcr_type ENUM('DCR', 'Non-DCR') NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inventory (district, component, brand, dcr_type)
);

-- 3. Stock inward header
CREATE TABLE IF NOT EXISTS stock_inward (
    id INT AUTO_INCREMENT PRIMARY KEY,
    district VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    dcr_type ENUM('DCR', 'Non-DCR') NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- 4. System type breakdown per inward
CREATE TABLE IF NOT EXISTS stock_inward_systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inward_id INT NOT NULL,
    system_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (inward_id) REFERENCES stock_inward(id) ON DELETE CASCADE
);

-- 5. Component-level items per inward (planned vs actual)
CREATE TABLE IF NOT EXISTS stock_inward_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inward_id INT NOT NULL,
    component VARCHAR(50) NOT NULL,
    planned_quantity INT NOT NULL DEFAULT 0,
    actual_quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (inward_id) REFERENCES stock_inward(id) ON DELETE CASCADE
);

-- 6. Stock outward header
CREATE TABLE IF NOT EXISTS stock_outward (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_district VARCHAR(50) NOT NULL,
    dispatch_type ENUM('customer', 'dealer', 'store_transfer') NOT NULL,
    -- For dealer dispatch
    dealer_id INT,
    -- For customer dispatch
    customer_name VARCHAR(150),
    customer_district VARCHAR(100),
    registered_customer_id INT,
    -- For store-to-store transfer
    to_district VARCHAR(50),
    -- Common fields
    connector VARCHAR(100),
    brand VARCHAR(50) NOT NULL,
    dcr_type ENUM('DCR', 'Non-DCR') NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES stock_dealers(id),
    FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id),
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- 7. System type breakdown per outward
CREATE TABLE IF NOT EXISTS stock_outward_systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    outward_id INT NOT NULL,
    system_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (outward_id) REFERENCES stock_outward(id) ON DELETE CASCADE
);

-- 8. Component-level items per outward (planned vs actual)
CREATE TABLE IF NOT EXISTS stock_outward_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    outward_id INT NOT NULL,
    component VARCHAR(50) NOT NULL,
    planned_quantity INT NOT NULL DEFAULT 0,
    actual_quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (outward_id) REFERENCES stock_outward(id) ON DELETE CASCADE
);

-- 9. Audit trail for every inventory movement
CREATE TABLE IF NOT EXISTS stock_movement_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    district VARCHAR(50) NOT NULL,
    component VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    dcr_type ENUM('DCR', 'Non-DCR') NOT NULL,
    movement_type ENUM('inward', 'outward_customer', 'outward_dealer', 'transfer_out', 'transfer_in') NOT NULL,
    reference_type ENUM('inward', 'outward') NOT NULL,
    reference_id INT NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL DEFAULT 0,
    quantity_after INT NOT NULL DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- Indexes for performance
CREATE INDEX idx_inventory_district ON stock_inventory(district);
CREATE INDEX idx_inventory_brand ON stock_inventory(brand);
CREATE INDEX idx_inward_district ON stock_inward(district);
CREATE INDEX idx_inward_created ON stock_inward(created_at);
CREATE INDEX idx_outward_district ON stock_outward(from_district);
CREATE INDEX idx_outward_created ON stock_outward(created_at);
CREATE INDEX idx_movement_district ON stock_movement_log(district);
CREATE INDEX idx_movement_created ON stock_movement_log(created_at);
CREATE INDEX idx_movement_ref ON stock_movement_log(reference_type, reference_id);
