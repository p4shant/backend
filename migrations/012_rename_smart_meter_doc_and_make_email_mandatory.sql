-- Rename smart_meter_doc_url to ceiling_paper_photo_url and make email_id mandatory
ALTER TABLE registered_customers
  CHANGE COLUMN smart_meter_doc_url ceiling_paper_photo_url TEXT NULL,
  MODIFY COLUMN email_id VARCHAR(150) NOT NULL;
