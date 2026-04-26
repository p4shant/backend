const { Router } = require('express');
const paymentController = require('../controllers/paymentController');
const { requireRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'payments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const router = Router();

// Payment Collection - Help Desk
router.get('/collection', requireRoles(['Help Desk']), paymentController.getPaymentCollection);
router.post('/collection/:customerId/record', requireRoles(['Help Desk']), upload.single('proof'), paymentController.recordPaymentCollection);

// Payment Approval - Master Admin & Admin Assistant
router.get('/approval', requireRoles(['Master Admin', 'Admin Assistant']), paymentController.getPaymentApproval);
router.post('/approval/:customerId/approve', requireRoles(['Master Admin', 'Admin Assistant']), paymentController.approvePayment);

module.exports = router;
