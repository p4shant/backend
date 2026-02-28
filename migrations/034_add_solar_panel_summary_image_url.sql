-- Add solar panel summary image URL column to additional_documents
ALTER TABLE additional_documents
ADD COLUMN IF NOT EXISTS solar_panel_summary_image_url TEXT NULL AFTER solar_panels_images_url;
