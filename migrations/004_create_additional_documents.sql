CREATE TABLE IF NOT EXISTS additional_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Related Customer
  registered_customer_id INT NOT NULL,

  -- Document URLs
  application_form TEXT NULL,
  feasibility_form TEXT NULL,
  etoken_document TEXT NULL,
  net_metering_document TEXT NULL,
  finance_quotation_document TEXT NULL,
  finance_digital_approval TEXT NULL,
  ubi_sanction_certificate_document TEXT NULL,
  indent_document TEXT NULL,
  solar_panels_images_url TEXT NULL, -- JSON array of URLs
  inverter_image_url TEXT NULL,
  applicant_with_panel_image_url TEXT NULL,
  applicant_with_invertor_image_url TEXT NULL,
  warranty_card_document TEXT NULL,
  paybill_document TEXT NULL,
  dcr_document TEXT NULL,
  commissioning_document TEXT NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (registered_customer_id) REFERENCES registered_customers(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_registered_customer_id (registered_customer_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
