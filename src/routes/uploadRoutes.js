const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const registeredCustomerService = require('../services/registeredCustomerService');
const { uploadSingleImage } = require('../utils/upload');
const registeredCustomerController = require('../controllers/registeredCustomerController');

const router = Router();
router.use(authenticate);

async function loadCustomerFromQuery(req, res, next) {
    try {
        const id = Number(req.query.registered_customer_id || req.body.registered_customer_id);
        if (id) {
            const customer = await registeredCustomerService.getById(id);
            if (!customer) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            req.customer = customer;
            return next();
        }
        // Allow pre-ID uploads using applicant_name + mobile_number
        const name = (req.body.applicant_name || '').trim();
        const mobile = (req.body.mobile_number || '').trim();
        if (!name || !mobile) {
            return res.status(400).json({
                message: 'Provide either registered_customer_id or both applicant_name and mobile_number'
            });
        }
        // No customer record yet; multer will derive folder from body
        return next();
    } catch (err) {
        next(err);
    }
}

// POST /api/uploads?registered_customer_id=123 OR with body applicant_name+mobile_number
router.post('/', loadCustomerFromQuery, uploadSingleImage('image'), registeredCustomerController.uploadDocument);

module.exports = router;
