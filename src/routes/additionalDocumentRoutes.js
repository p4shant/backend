const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/additionalDocumentController');
const { authenticate } = require('../middleware/authMiddleware');
const env = require('../config/env');

const router = Router();
router.use(authenticate);

// Custom storage configuration for finance documents
const rootUploads = env.uploadsRoot;

function sanitizeName(str) {
    return String(str || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
}

function sanitizeMobile(str) {
    return String(str || '').replace(/\\D/g, '');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get customer details from the database to build folder path
        const db = require('../config/db');
        const customerId = req.params.registered_customer_id;

        db.query('SELECT applicant_name, mobile_number FROM registered_customers WHERE id = ?', [customerId])
            .then(rows => {
                if (rows.length > 0) {
                    const name = sanitizeName(rows[0].applicant_name);
                    const mobile = sanitizeMobile(rows[0].mobile_number);
                    const folderName = [name, mobile].filter(Boolean).join('_') || 'unknown';
                    const folderPath = path.join(rootUploads, folderName);

                    if (!fs.existsSync(folderPath)) {
                        fs.mkdirSync(folderPath, { recursive: true });
                    }

                    req.uploadContext = { customerFolder: folderName };
                    cb(null, folderPath);
                } else {
                    cb(new Error('Customer not found'));
                }
            })
            .catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '';
        const base = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 50) || 'file';
        const ts = Date.now();
        cb(null, `${base}_${ts}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype) || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/customer/:registered_customer_id', controller.getByCustomer);
router.post('/', controller.create);
router.post('/:registered_customer_id/finance', upload.fields([{ name: 'quotation', maxCount: 1 }, { name: 'approval', maxCount: 1 }]), controller.uploadFinanceDocuments);
router.post('/:registered_customer_id/indent', upload.single('indent_document'), controller.uploadIndentDocument);
router.post('/:registered_customer_id/paybill', upload.single('paybill_document'), controller.uploadPaybillDocument);
router.post('/:registered_customer_id/warranty', upload.single('warranty_card_document'), controller.uploadWarrantyDocument);
router.post('/:registered_customer_id/dcr', upload.single('dcr_document'), controller.uploadDcrDocument);
router.post('/:registered_customer_id/registration', upload.fields([
    { name: 'application_form', maxCount: 1 },
    { name: 'feasibility_form', maxCount: 1 },
    { name: 'etoken_document', maxCount: 1 },
    { name: 'net_metering_document', maxCount: 1 }
]), controller.uploadRegistrationDocuments);
router.put('/:id', controller.update);
router.patch('/:id', controller.partialUpdate);
router.delete('/:id', controller.remove);

module.exports = router;
