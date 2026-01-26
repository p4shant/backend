const { Router } = require('express');
const registeredCustomerController = require('../controllers/registeredCustomerController');
const { authenticate } = require('../middleware/authMiddleware');
const registeredCustomerService = require('../services/registeredCustomerService');
const { uploadSingleImage, uploadMultipleImages } = require('../utils/upload');

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/with-tasks', registeredCustomerController.listWithTasks);
router.get('/', registeredCustomerController.list);
router.get('/:id', registeredCustomerController.getById);
router.post('/', registeredCustomerController.create);
router.put('/:id', registeredCustomerController.update);
router.patch('/:id', registeredCustomerController.partialUpdate);
router.delete('/:id', registeredCustomerController.remove);

// Additional query routes
router.get('/status/:status', registeredCustomerController.getByStatus);
router.get('/employee/:employeeId', registeredCustomerController.getByEmployee);

// Preload customer for upload destination resolution using `registered_customer_id`
async function loadCustomer(req, res, next) {
    try {
        const idParam = req.params.registered_customer_id || req.params.id;
        const customer = await registeredCustomerService.getById(Number(idParam));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        req.customer = customer;
        next();
    } catch (err) {
        next(err);
    }
}

// Upload multiple documents for a customer
router.post('/:registered_customer_id/upload-batch', loadCustomer, uploadMultipleImages(), registeredCustomerController.uploadDocuments);

// Upload a single image for a customer; field name: 'image'
router.post('/:registered_customer_id/upload', loadCustomer, uploadSingleImage('image'), registeredCustomerController.uploadDocument);

module.exports = router;
