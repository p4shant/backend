CREATE TABLE IF NOT EXISTS registered_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Applicant Basic Info
  applicant_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email_id VARCHAR(150) NOT NULL,

  -- Solar System Details
  solar_plant_type ENUM('Residential', 'Commercial', 'Industrial') NOT NULL DEFAULT 'Residential',
  solar_system_type ENUM('TATA On-Grid', 'TATA Off-Grid', 'TATA Hybrid', 'Other') NOT NULL DEFAULT 'TATA On-Grid',
  plant_category ENUM('Residential', 'Commercial', 'Industrial') NOT NULL DEFAULT 'Residential',
  plant_size_kw DECIMAL(10, 2) NOT NULL,
  plant_price DECIMAL(12, 2) NULL,

  -- Location Details (GPS mandatory, address optional)
  district VARCHAR(100) NOT NULL,
  installation_pincode VARCHAR(10) NOT NULL,
  site_address TEXT NULL,
  site_latitude DECIMAL(10, 8) NOT NULL,
  site_longitude DECIMAL(11, 8) NOT NULL,

  -- Meter Details
  meter_type ENUM('Electric Meter', 'Smart Meter', 'Other') NOT NULL DEFAULT 'Electric Meter',

  -- Name Correction
  name_correction_required ENUM('Required', 'Not Required') NOT NULL DEFAULT 'Not Required',
  correct_name VARCHAR(150) NULL,

  -- Load Enhancement
  load_enhancement_required ENUM('Required', 'Not Required') NOT NULL DEFAULT 'Not Required',
  current_load VARCHAR(50) NULL,
  required_load VARCHAR(50) NULL,

  -- COT (Change of Title) Details
  cot_required ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  cot_type VARCHAR(100) NULL,
  cot_documents TEXT NULL,

  -- Payment Details
  payment_mode ENUM('Cash', 'Finance', 'Cheque', 'UPI') NOT NULL DEFAULT 'Cash',
  advance_payment_mode ENUM('Cash', 'Finance', 'Cheque', 'UPI') NOT NULL DEFAULT 'Cash',
  upi_type ENUM('Company', 'Personal') NULL,
  margin_money DECIMAL(10, 2) NULL,
  special_finance_required ENUM('Yes', 'No') NOT NULL DEFAULT 'No',

  -- Building/Structure Details
  building_floor_number VARCHAR(50) NULL,
  structure_type VARCHAR(100) NULL,
  structure_length DECIMAL(10, 2) NULL,
  structure_height DECIMAL(10, 2) NULL,
  free_shadow_area DECIMAL(10, 2) NULL,

  -- Installation Details
  installation_date_feasible DATE NULL,

  -- Application Status
  application_status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',

  -- Document URLs (stored as JSON or text paths)
  aadhaar_front_url TEXT NULL,
  aadhaar_back_url TEXT NULL,
  pan_card_url TEXT NULL,
  electric_bill_url TEXT NULL,
  ceiling_paper_photo_url TEXT NULL,
  cancel_cheque_url TEXT NULL,
  site_image_gps_url TEXT NULL,

  -- COT Document URLs
  cot_death_certificate_url TEXT NULL,
  cot_house_papers_url TEXT NULL,
  cot_passport_photo_url TEXT NULL,
  cot_family_registration_url TEXT NULL,
  cot_aadhaar_photos_urls TEXT NULL,
  cot_live_aadhaar_1_url TEXT NULL,
  cot_live_aadhaar_2_url TEXT NULL,

  -- Employee who created this application
  created_by INT NOT NULL,

  -- System fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE RESTRICT,

  -- Indexes
  INDEX idx_mobile_number (mobile_number),
  INDEX idx_district (district),
  INDEX idx_application_status (application_status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
