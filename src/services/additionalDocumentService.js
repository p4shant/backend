const db = require('../config/db');

async function validateCustomer(id) {
    const rows = await db.query('SELECT id FROM registered_customers WHERE id = ?', [id]);
    if (rows.length === 0) {
        const err = new Error('Invalid registered_customer_id');
        err.status = 400;
        throw err;
    }
}

async function list({ page = 1, limit = 50, registered_customer_id }) {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (registered_customer_id) {
        where.push('registered_customer_id = ?');
        params.push(registered_customer_id);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await db.query(`SELECT COUNT(*) as total FROM additional_documents ${whereClause}`, params);
    const total = count[0].total;
    const data = await db.query(`SELECT * FROM additional_documents ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getById(id) {
    const rows = await db.query('SELECT * FROM additional_documents WHERE id = ?', [id]);
    return rows[0] || null;
}

async function create(data) {
    const required = ['registered_customer_id'];
    for (const f of required) {
        if (!data[f]) {
            const err = new Error(`${f} is required`);
            err.status = 400;
            throw err;
        }
    }
    await validateCustomer(data.registered_customer_id);
    const fields = [
        'registered_customer_id',
        'application_form', 'feasibility_form', 'etoken_document', 'net_metering_document',
        'finance_quotation_document', 'finance_digital_approval', 'ubi_sanction_certificate_document', 'indent_document',
        'solar_panels_images_url', 'inverter_image_url', 'applicant_with_panel_image_url', 'applicant_with_invertor_image_url', 'warranty_card_document', 'paybill_document',
        'dcr_document', 'commissioning_document'
    ];
    const values = fields.map(f => (data[f] !== undefined ? data[f] : null));
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO additional_documents (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.query(sql, values);
    return getById(result.insertId);
}

async function update(id, data) {
    const existing = await getById(id);
    if (!existing) {
        const err = new Error('Record not found');
        err.status = 404;
        throw err;
    }
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;
    const fields = Object.keys(updateData);
    if (fields.length === 0) return getById(id);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updateData[f]);
    await db.query(`UPDATE additional_documents SET ${setClause} WHERE id = ?`, [...values, id]);
    return getById(id);
}

async function partialUpdate(id, data) {
    return update(id, data);
}

async function remove(id) {
    const result = await db.query('DELETE FROM additional_documents WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        const err = new Error('Record not found');
        err.status = 404;
        throw err;
    }
    return true;
}

async function getByCustomer(registered_customer_id) {
    return db.query('SELECT * FROM additional_documents WHERE registered_customer_id = ? ORDER BY created_at DESC', [registered_customer_id]);
}

async function uploadFinanceDocuments(customerId, quotationUrl, approvalUrl) {
    await validateCustomer(customerId);

    // Check if record exists
    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        // Update existing record
        await db.query(
            'UPDATE additional_documents SET finance_quotation_document = ?, finance_digital_approval = ? WHERE registered_customer_id = ?',
            [quotationUrl, approvalUrl, customerId]
        );
        return {
            success: true,
            message: 'Finance documents updated successfully',
            data: { finance_quotation_document: quotationUrl, finance_digital_approval: approvalUrl }
        };
    } else {
        // Create new record
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, finance_quotation_document, finance_digital_approval) VALUES (?, ?, ?)',
            [customerId, quotationUrl, approvalUrl]
        );
        return {
            success: true,
            message: 'Finance documents uploaded successfully',
            data: { finance_quotation_document: quotationUrl, finance_digital_approval: approvalUrl }
        };
    }
}

async function uploadRegistrationDocuments(customerId, applicationFormUrl, feasibilityFormUrl, etokenDocumentUrl, netMeteringDocumentUrl) {
    await validateCustomer(customerId);

    // Check if record exists
    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        // Update existing record
        await db.query(
            'UPDATE additional_documents SET application_form = ?, feasibility_form = ?, etoken_document = ?, net_metering_document = ? WHERE registered_customer_id = ?',
            [applicationFormUrl, feasibilityFormUrl, etokenDocumentUrl, netMeteringDocumentUrl, customerId]
        );
        return {
            success: true,
            message: 'Registration documents updated successfully',
            data: {
                application_form: applicationFormUrl,
                feasibility_form: feasibilityFormUrl,
                etoken_document: etokenDocumentUrl,
                net_metering_document: netMeteringDocumentUrl
            }
        };
    } else {
        // Create new record
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, application_form, feasibility_form, etoken_document, net_metering_document) VALUES (?, ?, ?, ?, ?)',
            [customerId, applicationFormUrl, feasibilityFormUrl, etokenDocumentUrl, netMeteringDocumentUrl]
        );
        return {
            success: true,
            message: 'Registration documents uploaded successfully',
            data: {
                application_form: applicationFormUrl,
                feasibility_form: feasibilityFormUrl,
                etoken_document: etokenDocumentUrl,
                net_metering_document: netMeteringDocumentUrl
            }
        };
    }
}

async function uploadIndentDocument(customerId, indentDocumentUrl) {
    await validateCustomer(customerId);

    // Check if record exists
    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        // Update existing record
        await db.query(
            'UPDATE additional_documents SET indent_document = ? WHERE registered_customer_id = ?',
            [indentDocumentUrl, customerId]
        );
        return {
            success: true,
            message: 'Indent document updated successfully',
            data: { indent_document: indentDocumentUrl }
        };
    } else {
        // Create new record
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, indent_document) VALUES (?, ?)',
            [customerId, indentDocumentUrl]
        );
        return {
            success: true,
            message: 'Indent document uploaded successfully',
            data: { indent_document: indentDocumentUrl }
        };
    }
}

async function uploadPaybillDocument(customerId, paybillDocumentUrl) {
    await validateCustomer(customerId);

    // Check if record exists
    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        // Update existing record
        await db.query(
            'UPDATE additional_documents SET paybill_document = ? WHERE registered_customer_id = ?',
            [paybillDocumentUrl, customerId]
        );
        return {
            success: true,
            message: 'Paybill document updated successfully',
            data: { paybill_document: paybillDocumentUrl }
        };
    } else {
        // Create new record
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, paybill_document) VALUES (?, ?)',
            [customerId, paybillDocumentUrl]
        );
        return {
            success: true,
            message: 'Paybill document uploaded successfully',
            data: { paybill_document: paybillDocumentUrl }
        };
    }
}

async function uploadWarrantyDocument(customerId, warrantyDocumentUrl) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET warranty_card_document = ? WHERE registered_customer_id = ?',
            [warrantyDocumentUrl, customerId]
        );
        return {
            success: true,
            message: 'Warranty document updated successfully',
            data: { warranty_card_document: warrantyDocumentUrl }
        };
    }

    await db.query(
        'INSERT INTO additional_documents (registered_customer_id, warranty_card_document) VALUES (?, ?)',
        [customerId, warrantyDocumentUrl]
    );
    return {
        success: true,
        message: 'Warranty document uploaded successfully',
        data: { warranty_card_document: warrantyDocumentUrl }
    };
}

async function uploadDcrDocument(customerId, dcrDocumentUrl) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET dcr_document = ? WHERE registered_customer_id = ?',
            [dcrDocumentUrl, customerId]
        );
        return {
            success: true,
            message: 'DCR document updated successfully',
            data: { dcr_document: dcrDocumentUrl }
        };
    }

    await db.query(
        'INSERT INTO additional_documents (registered_customer_id, dcr_document) VALUES (?, ?)',
        [customerId, dcrDocumentUrl]
    );
    return {
        success: true,
        message: 'DCR document uploaded successfully',
        data: { dcr_document: dcrDocumentUrl }
    };
}

async function uploadSolarPanelImages(customerId, solarPanelImagesUrls) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id, solar_panels_images_url FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    let mergedUrls = Array.isArray(solarPanelImagesUrls) ? [...solarPanelImagesUrls] : [];
    if (existing.length > 0 && existing[0].solar_panels_images_url) {
        try {
            const currentUrls = JSON.parse(existing[0].solar_panels_images_url);
            if (Array.isArray(currentUrls)) {
                mergedUrls = [...currentUrls, ...mergedUrls];
            }
        } catch {
            // ignore parse errors and keep new URLs only
        }
    }

    const urlsJson = JSON.stringify(mergedUrls);

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET solar_panels_images_url = ? WHERE registered_customer_id = ?',
            [urlsJson, customerId]
        );
        return {
            success: true,
            message: 'Solar panel images uploaded successfully',
            data: { solar_panels_images_url: mergedUrls }
        };
    } else {
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, solar_panels_images_url) VALUES (?, ?)',
            [customerId, urlsJson]
        );
        return {
            success: true,
            message: 'Solar panel images uploaded successfully',
            data: { solar_panels_images_url: mergedUrls }
        };
    }
}

async function uploadApplicantWithPanelImage(customerId, applicantWithPanelImageUrl) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET applicant_with_panel_image_url = ? WHERE registered_customer_id = ?',
            [applicantWithPanelImageUrl, customerId]
        );
        return {
            success: true,
            message: 'Applicant with panel image uploaded successfully',
            data: { applicant_with_panel_image_url: applicantWithPanelImageUrl }
        };
    } else {
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, applicant_with_panel_image_url) VALUES (?, ?)',
            [customerId, applicantWithPanelImageUrl]
        );
        return {
            success: true,
            message: 'Applicant with panel image uploaded successfully',
            data: { applicant_with_panel_image_url: applicantWithPanelImageUrl }
        };
    }
}

async function uploadInvertorImage(customerId, invertorImageUrl) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET inverter_image_url = ? WHERE registered_customer_id = ?',
            [invertorImageUrl, customerId]
        );
        return {
            success: true,
            message: 'Invertor image uploaded successfully',
            data: { inverter_image_url: invertorImageUrl }
        };
    } else {
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, inverter_image_url) VALUES (?, ?)',
            [customerId, invertorImageUrl]
        );
        return {
            success: true,
            message: 'Invertor image uploaded successfully',
            data: { inverter_image_url: invertorImageUrl }
        };
    }
}

async function uploadApplicantWithInvertorImage(customerId, applicantWithInvertorImageUrl) {
    await validateCustomer(customerId);

    const existing = await db.query(
        'SELECT id FROM additional_documents WHERE registered_customer_id = ?',
        [customerId]
    );

    if (existing.length > 0) {
        await db.query(
            'UPDATE additional_documents SET applicant_with_invertor_image_url = ? WHERE registered_customer_id = ?',
            [applicantWithInvertorImageUrl, customerId]
        );
        return {
            success: true,
            message: 'Applicant with invertor image uploaded successfully',
            data: { applicant_with_invertor_image_url: applicantWithInvertorImageUrl }
        };
    } else {
        await db.query(
            'INSERT INTO additional_documents (registered_customer_id, applicant_with_invertor_image_url) VALUES (?, ?)',
            [customerId, applicantWithInvertorImageUrl]
        );
        return {
            success: true,
            message: 'Applicant with invertor image uploaded successfully',
            data: { applicant_with_invertor_image_url: applicantWithInvertorImageUrl }
        };
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    partialUpdate,
    remove,
    getByCustomer,
    uploadFinanceDocuments,
    uploadRegistrationDocuments,
    uploadIndentDocument,
    uploadPaybillDocument,
    uploadWarrantyDocument,
    uploadDcrDocument,
    uploadSolarPanelImages,
    uploadApplicantWithPanelImage,
    uploadInvertorImage,
    uploadApplicantWithInvertorImage,
};
