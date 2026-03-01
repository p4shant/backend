-- Migration to normalize all document URLs from full URLs to relative paths
-- Part 1: registered_customers table
-- This fixes URLs like http://srv1304976.hstgr.cloud/uploads/... to /uploads/...

UPDATE registered_customers
SET 
    aadhaar_front_url = CASE 
        WHEN aadhaar_front_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(aadhaar_front_url, '/uploads/', -1))
        ELSE aadhaar_front_url 
    END,
    aadhaar_back_url = CASE 
        WHEN aadhaar_back_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(aadhaar_back_url, '/uploads/', -1))
        ELSE aadhaar_back_url 
    END,
    pan_card_url = CASE 
        WHEN pan_card_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(pan_card_url, '/uploads/', -1))
        ELSE pan_card_url 
    END,
    electric_bill_url = CASE 
        WHEN electric_bill_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(electric_bill_url, '/uploads/', -1))
        ELSE electric_bill_url 
    END,
    ceiling_paper_photo_url = CASE 
        WHEN ceiling_paper_photo_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(ceiling_paper_photo_url, '/uploads/', -1))
        ELSE ceiling_paper_photo_url 
    END,
    cancel_cheque_url = CASE 
        WHEN cancel_cheque_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cancel_cheque_url, '/uploads/', -1))
        ELSE cancel_cheque_url 
    END,
    site_image_gps_url = CASE 
        WHEN site_image_gps_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(site_image_gps_url, '/uploads/', -1))
        ELSE site_image_gps_url 
    END,
    cot_death_certificate_url = CASE 
        WHEN cot_death_certificate_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_death_certificate_url, '/uploads/', -1))
        ELSE cot_death_certificate_url 
    END,
    cot_house_papers_url = CASE 
        WHEN cot_house_papers_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_house_papers_url, '/uploads/', -1))
        ELSE cot_house_papers_url 
    END,
    cot_passport_photo_url = CASE 
        WHEN cot_passport_photo_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_passport_photo_url, '/uploads/', -1))
        ELSE cot_passport_photo_url 
    END,
    cot_family_registration_url = CASE 
        WHEN cot_family_registration_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_family_registration_url, '/uploads/', -1))
        ELSE cot_family_registration_url 
    END,
    cot_aadhaar_photos_urls = CASE 
        WHEN cot_aadhaar_photos_urls LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_aadhaar_photos_urls, '/uploads/', -1))
        ELSE cot_aadhaar_photos_urls 
    END,
    cot_live_aadhaar_1_url = CASE 
        WHEN cot_live_aadhaar_1_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_live_aadhaar_1_url, '/uploads/', -1))
        ELSE cot_live_aadhaar_1_url 
    END,
    cot_live_aadhaar_2_url = CASE 
        WHEN cot_live_aadhaar_2_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(cot_live_aadhaar_2_url, '/uploads/', -1))
        ELSE cot_live_aadhaar_2_url 
    END
WHERE 
    aadhaar_front_url LIKE 'http%://%.%/uploads/%'
    OR aadhaar_back_url LIKE 'http%://%.%/uploads/%'
    OR pan_card_url LIKE 'http%://%.%/uploads/%'
    OR electric_bill_url LIKE 'http%://%.%/uploads/%'
    OR ceiling_paper_photo_url LIKE 'http%://%.%/uploads/%'
    OR cancel_cheque_url LIKE 'http%://%.%/uploads/%'
    OR site_image_gps_url LIKE 'http%://%.%/uploads/%'
    OR cot_death_certificate_url LIKE 'http%://%.%/uploads/%'
    OR cot_house_papers_url LIKE 'http%://%.%/uploads/%'
    OR cot_passport_photo_url LIKE 'http%://%.%/uploads/%'
    OR cot_family_registration_url LIKE 'http%://%.%/uploads/%'
    OR cot_aadhaar_photos_urls LIKE 'http%://%.%/uploads/%'
    OR cot_live_aadhaar_1_url LIKE 'http%://%.%/uploads/%'
    OR cot_live_aadhaar_2_url LIKE 'http%://%.%/uploads/%';
