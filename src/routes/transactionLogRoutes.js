const { Router } = require('express');
const controller = require('../controllers/transactionLogController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../utils/upload');

const router = Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/payment-tracking', controller.getPaymentTracking);
router.get('/:id', controller.getById);
router.get('/customer/:registered_customer_id', controller.getByCustomer);
router.post('/', controller.create);
router.post('/:registered_customer_id/payment', uploadSingleImage('proof'), controller.recordPayment);
router.put('/:id', controller.update);
router.patch('/:id', controller.partialUpdate);
router.delete('/:id', controller.remove);

module.exports = router;
