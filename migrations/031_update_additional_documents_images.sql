-- Migration: Update additional_documents table
-- Purpose: Remove logger_image_url and add applicant image columns
-- Date: 2026-02-15

-- Drop the old logger_image_url column
ALTER TABLE additional_documents DROP COLUMN IF EXISTS logger_image_url;

-- Add new applicant image columns
ALTER TABLE additional_documents ADD COLUMN applicant_with_panel_image_url TEXT NULL AFTER inverter_image_url;
ALTER TABLE additional_documents ADD COLUMN applicant_with_invertor_image_url TEXT NULL AFTER applicant_with_panel_image_url;
