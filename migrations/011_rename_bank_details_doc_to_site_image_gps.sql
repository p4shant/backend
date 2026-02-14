-- Rename bank_details_doc_url to site_image_gps_url
ALTER TABLE registered_customers
  CHANGE COLUMN bank_details_doc_url site_image_gps_url TEXT NULL;
