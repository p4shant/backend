-- =============================================================================
-- Migration 042: Fix duplicate NULL sub_type rows in stock_inventory
-- =============================================================================
--
-- ROOT CAUSE:
--   MySQL's unique index does NOT treat NULL = NULL, so the original
--   "ON DUPLICATE KEY UPDATE" in addQuantity() never fired for components
--   with sub_type IS NULL (ACDB, DCDB, earthing_rod, earthing_chemical,
--   lightning_arrestor). Every inward transaction therefore INSERTED a new
--   row instead of incrementing the existing one, accumulating duplicate
--   rows and causing the balance snapshot to show inflated values.
--
-- WHAT THIS MIGRATION DOES:
--   1. Consolidates all duplicate null-sub_type rows in stock_inventory into
--      a single row per (district, component, brand, dcr_type) with the
--      correct summed quantity.
--   2. Clears stock_daily_snapshot so stale inflated balances are gone.
--      The user should click "Take Snapshot Now" after running this.
-- =============================================================================

-- Step 1: Consolidate duplicate null-sub_type rows in stock_inventory
-- -------------------------------------------------------------------
-- Collect correct totals
CREATE TEMPORARY TABLE _fix_inventory_nulls (
    district   VARCHAR(50)  NOT NULL,
    component  VARCHAR(50)  NOT NULL,
    brand      VARCHAR(50)  NOT NULL,
    dcr_type   VARCHAR(10)  NOT NULL,
    total_qty  INT          NOT NULL
);

INSERT INTO _fix_inventory_nulls (district, component, brand, dcr_type, total_qty)
SELECT district, component, brand, dcr_type, SUM(quantity)
FROM   stock_inventory
WHERE  sub_type IS NULL
GROUP  BY district, component, brand, dcr_type;

-- Remove all null-sub_type rows (the duplicates)
DELETE FROM stock_inventory WHERE sub_type IS NULL;

-- Re-insert one correct row per slot
INSERT INTO stock_inventory (district, component, sub_type, brand, dcr_type, quantity)
SELECT district, component, NULL, brand, dcr_type, total_qty
FROM   _fix_inventory_nulls
WHERE  total_qty > 0;

DROP TEMPORARY TABLE _fix_inventory_nulls;

-- Step 2: Clear stale snapshot data
-- ----------------------------------
-- The previous snapshots contain the inflated values; delete them so the
-- dashboard starts fresh. Click "Take Snapshot Now" to rebuild correctly.
DELETE FROM stock_daily_snapshot;
