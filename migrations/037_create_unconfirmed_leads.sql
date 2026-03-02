-- Migration: Create unconfirmed_leads table
-- This table stores unconfirmed customer leads with their information and conversion status

CREATE TABLE IF NOT EXISTS `unconfirmed_leads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `confirmation_percentage` INT NOT NULL DEFAULT 0 CHECK (`confirmation_percentage` BETWEEN 0 AND 100),
    `notes` TEXT NULL,
    `status` ENUM('active', 'converted', 'dropped') NOT NULL DEFAULT 'active',
    `converted_customer_id` INT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT `fk_unconfirmed_leads_converted_customer` 
        FOREIGN KEY (`converted_customer_id`) 
        REFERENCES `registered_customers`(`id`) 
        ON DELETE SET NULL,
    
    CONSTRAINT `fk_unconfirmed_leads_created_by` 
        FOREIGN KEY (`created_by`) 
        REFERENCES `employees`(`id`) 
        ON DELETE RESTRICT,
    
    -- Indexes for better query performance
    INDEX `idx_phone_number` (`phone_number`),
    INDEX `idx_district` (`district`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_by` (`created_by`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_status_created_at` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
