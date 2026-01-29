const multer = require('multer');
const path = require('path');
const fs = require('fs');

function sanitizeName(str) {
    return String(str || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
}

function sanitizeMobile(str) {
    return String(str || '').replace(/\D/g, '');
}
// const rootUploads = path.resolve(__dirname, '..', 'uploads');
const rootUploads = '/var/www/uploads';

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Ensure root uploads exists
ensureDir(rootUploads);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const name = sanitizeName(req.customer?.applicant_name || req.body.applicant_name);
        const mobile = sanitizeMobile(req.customer?.mobile_number || req.body.mobile_number);
        const folderName = [name, mobile].filter(Boolean).join('_') || 'unknown';
        const folderPath = path.join(rootUploads, folderName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Expose folder to controller for URL construction
        req.uploadContext = { customerFolder: folderName };
        cb(null, folderPath);
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

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        // PDFs
        'application/pdf',
        // Documents
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/plain', // .txt
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Accepted: images, PDFs, Word, Excel, and text files'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function uploadSingleImage(fieldName = 'image') {
    return upload.single(fieldName);
}

function uploadMultipleImages() {
    return upload.fields([
        { name: 'aadhaar_front', maxCount: 1 },
        { name: 'aadhaar_back', maxCount: 1 },
        { name: 'pan_card', maxCount: 1 },
        { name: 'electric_bill', maxCount: 1 },
        { name: 'smart_meter_doc', maxCount: 1 },
        { name: 'cancel_cheque', maxCount: 1 },
        { name: 'bank_details_doc', maxCount: 1 },
        { name: 'cot_death_certificate', maxCount: 1 },
        { name: 'cot_house_papers', maxCount: 1 },
        { name: 'cot_passport_photo', maxCount: 1 },
        { name: 'cot_family_registration', maxCount: 1 },
        { name: 'cot_aadhaar_photos', maxCount: 10 },
        { name: 'cot_live_aadhaar_1', maxCount: 1 },
        { name: 'cot_live_aadhaar_2', maxCount: 1 },
    ]);
}

// Attendance-specific uploader: stores under /uploads/attendance/<employeeId>
const attendanceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const employeeId = req.user?.id || req.body.employee_id;
        const folderPath = path.join(rootUploads, 'attendance', String(employeeId || 'unknown'));
        ensureDir(folderPath);
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '';
        const base = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 50) || 'attendance';
        const ts = Date.now();
        cb(null, `${base}_${ts}${ext}`);
    },
});

const uploadAttendance = multer({
    storage: attendanceStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

function uploadAttendanceImage(fieldName = 'photo') {
    return uploadAttendance.single(fieldName);
}

module.exports = {
    uploadSingleImage,
    uploadMultipleImages,
    uploadAttendanceImage,
    rootUploads,
    ensureDir,
};
