-- Add technical_assistant_ids column to plant_installations table
ALTER TABLE plant_installations
ADD COLUMN technical_assistant_ids TEXT NULL COMMENT 'JSON array of Technical Assistant employee IDs'
AFTER external_technician;
