-- Migration to normalize additional_documents table URLs from full URLs to relative paths
-- Part 2 of URL normalization

UPDATE additional_documents
SET 
    application_form = CASE 
        WHEN application_form LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(application_form, '/uploads/', -1))
        ELSE application_form 
    END,
    feasibility_form = CASE 
        WHEN feasibility_form LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(feasibility_form, '/uploads/', -1))
        ELSE feasibility_form 
    END,
    etoken_document = CASE 
        WHEN etoken_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(etoken_document, '/uploads/', -1))
        ELSE etoken_document 
    END,
    net_metering_document = CASE 
        WHEN net_metering_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(net_metering_document, '/uploads/', -1))
        ELSE net_metering_document 
    END,
    finance_quotation_document = CASE 
        WHEN finance_quotation_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(finance_quotation_document, '/uploads/', -1))
        ELSE finance_quotation_document 
    END,
    finance_digital_approval = CASE 
        WHEN finance_digital_approval LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(finance_digital_approval, '/uploads/', -1))
        ELSE finance_digital_approval 
    END,
    ubi_sanction_certificate_document = CASE 
        WHEN ubi_sanction_certificate_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(ubi_sanction_certificate_document, '/uploads/', -1))
        ELSE ubi_sanction_certificate_document 
    END,
    indent_document = CASE 
        WHEN indent_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(indent_document, '/uploads/', -1))
        ELSE indent_document 
    END,
    solar_panels_images_url = CASE 
        WHEN solar_panels_images_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(solar_panels_images_url, '/uploads/', -1))
        ELSE solar_panels_images_url 
    END,
    solar_panel_summary_image_url = CASE 
        WHEN solar_panel_summary_image_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(solar_panel_summary_image_url, '/uploads/', -1))
        ELSE solar_panel_summary_image_url 
    END,
    inverter_image_url = CASE 
        WHEN inverter_image_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(inverter_image_url, '/uploads/', -1))
        ELSE inverter_image_url 
    END,
    applicant_with_panel_image_url = CASE 
        WHEN applicant_with_panel_image_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(applicant_with_panel_image_url, '/uploads/', -1))
        ELSE applicant_with_panel_image_url 
    END,
    applicant_with_invertor_image_url = CASE 
        WHEN applicant_with_invertor_image_url LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(applicant_with_invertor_image_url, '/uploads/', -1))
        ELSE applicant_with_invertor_image_url 
    END,
    warranty_card_document = CASE 
        WHEN warranty_card_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(warranty_card_document, '/uploads/', -1))
        ELSE warranty_card_document 
    END,
    paybill_document = CASE 
        WHEN paybill_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(paybill_document, '/uploads/', -1))
        ELSE paybill_document 
    END,
    dcr_document = CASE 
        WHEN dcr_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(dcr_document, '/uploads/', -1))
        ELSE dcr_document 
    END,
    commissioning_document = CASE 
        WHEN commissioning_document LIKE '%/uploads/%' 
        THEN CONCAT('/uploads/', SUBSTRING_INDEX(commissioning_document, '/uploads/', -1))
        ELSE commissioning_document 
    END
WHERE 
    application_form LIKE 'http%://%.%/uploads/%'
    OR feasibility_form LIKE 'http%://%.%/uploads/%'
    OR etoken_document LIKE 'http%://%.%/uploads/%'
    OR net_metering_document LIKE 'http%://%.%/uploads/%'
    OR finance_quotation_document LIKE 'http%://%.%/uploads/%'
    OR finance_digital_approval LIKE 'http%://%.%/uploads/%'
    OR ubi_sanction_certificate_document LIKE 'http%://%.%/uploads/%'
    OR indent_document LIKE 'http%://%.%/uploads/%'
    OR solar_panels_images_url LIKE 'http%://%.%/uploads/%'
    OR solar_panel_summary_image_url LIKE 'http%://%.%/uploads/%'
    OR inverter_image_url LIKE 'http%://%.%/uploads/%'
    OR applicant_with_panel_image_url LIKE 'http%://%.%/uploads/%'
    OR applicant_with_invertor_image_url LIKE 'http%://%.%/uploads/%'
    OR warranty_card_document LIKE 'http%://%.%/uploads/%'
    OR paybill_document LIKE 'http%://%.%/uploads/%'
    OR dcr_document LIKE 'http%://%.%/uploads/%'
    OR commissioning_document LIKE 'http%://%.%/uploads/%';
