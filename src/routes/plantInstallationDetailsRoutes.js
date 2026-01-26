const { Router } = require('express');
const controller = require('../controllers/plantInstallationDetailsController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/customer/:registered_customer_id', controller.getByCustomer);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.partialUpdate);
router.delete('/:id', controller.remove);

module.exports = router;
