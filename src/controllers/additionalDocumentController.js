const service = require('../services/additionalDocumentService');

async function list(req, res) {
    try {
        const { page = 1, limit = 50, registered_customer_id } = req.query;
        const result = await service.list({ page: Number(page), limit: Number(limit), registered_customer_id: registered_customer_id ? Number(registered_customer_id) : undefined });
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch records' });
    }
}

async function getById(req, res) {
    try {
        const record = await service.getById(Number(req.params.id));
        if (!record) return res.status(404).json({ message: 'Record not found' });
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch record' });
    }
}

async function create(req, res) {
    try {
        const record = await service.create(req.body);
        return res.status(201).json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to create record' });
    }
}

async function update(req, res) {
    try {
        const record = await service.update(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to update record' });
    }
}

async function partialUpdate(req, res) {
    try {
        const record = await service.partialUpdate(Number(req.params.id), req.body);
        return res.json(record);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to update record' });
    }
}

async function uploadFinanceDocuments(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const files = req.files;

        if (!files || !files.quotation || !files.approval) {
            return res.status(400).json({ message: 'Both quotation and approval documents are required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';

        const quotationUrl = `${baseUrl}/${customerFolder}/${files.quotation[0].filename}`;
        const approvalUrl = `${baseUrl}/${customerFolder}/${files.approval[0].filename}`;

        const result = await service.uploadFinanceDocuments(customerId, quotationUrl, approvalUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload documents' });
    }
}

async function uploadRegistrationDocuments(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const files = req.files;

        if (!files || !files.application_form || !files.feasibility_form || !files.etoken_document || !files.net_metering_document) {
            return res.status(400).json({ message: 'All 4 documents are required: application_form, feasibility_form, etoken_document, net_metering_document' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';

        const applicationFormUrl = `${baseUrl}/${customerFolder}/${files.application_form[0].filename}`;
        const feasibilityFormUrl = `${baseUrl}/${customerFolder}/${files.feasibility_form[0].filename}`;
        const etokenDocumentUrl = `${baseUrl}/${customerFolder}/${files.etoken_document[0].filename}`;
        const netMeteringDocumentUrl = `${baseUrl}/${customerFolder}/${files.net_metering_document[0].filename}`;

        const result = await service.uploadRegistrationDocuments(
            customerId,
            applicationFormUrl,
            feasibilityFormUrl,
            etokenDocumentUrl,
            netMeteringDocumentUrl
        );
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload documents' });
    }
}

async function uploadIndentDocument(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Indent document is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const indentDocumentUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadIndentDocument(customerId, indentDocumentUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload document' });
    }
}

async function uploadPaybillDocument(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Paybill document is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const paybillDocumentUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadPaybillDocument(customerId, paybillDocumentUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload document' });
    }
}

async function uploadWarrantyDocument(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Warranty card document is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const warrantyDocumentUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadWarrantyDocument(customerId, warrantyDocumentUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload document' });
    }
}

async function uploadDcrDocument(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'DCR document is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const dcrDocumentUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadDcrDocument(customerId, dcrDocumentUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload document' });
    }
}

async function uploadSolarPanelImages(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const files = req.files;
        const uploadedFiles = Array.isArray(files)
            ? files
            : files?.solar_panels_images || [];

        if (!uploadedFiles.length) {
            return res.status(400).json({ message: 'At least one solar panel image is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';

        const imageUrls = uploadedFiles.map(
            file => `${baseUrl}/${customerFolder}/${file.filename}`
        );

        const result = await service.uploadSolarPanelImages(customerId, imageUrls);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload images' });
    }
}

async function uploadApplicantWithPanelImage(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Applicant with panel image is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const imageUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadApplicantWithPanelImage(customerId, imageUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload image' });
    }
}

async function uploadInvertorImage(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Invertor image is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const imageUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadInvertorImage(customerId, imageUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload image' });
    }
}

async function uploadApplicantWithInvertorImage(req, res) {
    try {
        const customerId = Number(req.params.registered_customer_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Applicant with invertor image is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const customerFolder = req.uploadContext?.customerFolder || 'unknown';
        const imageUrl = `${baseUrl}/${customerFolder}/${file.filename}`;

        const result = await service.uploadApplicantWithInvertorImage(customerId, imageUrl);
        return res.json(result);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to upload image' });
    }
}

async function remove(req, res) {
    try {
        await service.remove(Number(req.params.id));
        return res.status(204).send();
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to delete record' });
    }
}

async function getByCustomer(req, res) {
    try {
        const rows = await service.getByCustomer(Number(req.params.registered_customer_id));
        return res.json(rows);
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Unable to fetch records' });
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
