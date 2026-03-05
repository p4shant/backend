-- ============================================================================
-- Stock Management V3 — Add mandatory entry_mode to inward & outward headers
-- ============================================================================
-- entry_mode: 'system' = full solar system kit (BOM-based)
--             'component' = individual components entered directly

ALTER TABLE stock_inward
    ADD COLUMN entry_mode ENUM('system', 'component') NOT NULL DEFAULT 'system' AFTER dcr_type;

ALTER TABLE stock_outward
    ADD COLUMN entry_mode ENUM('system', 'component') NOT NULL DEFAULT 'system' AFTER dcr_type;
