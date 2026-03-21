const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const controller = require('../controllers/pushSubscriptionController');

const router = Router();

// Public: frontend needs the VAPID key before login to subscribe
router.get('/vapid-public-key', controller.getVapidPublicKey);

// Protected: save / remove subscription for logged-in employee
router.post('/subscribe', authenticate, controller.subscribe);
router.delete('/unsubscribe', authenticate, controller.unsubscribe);

module.exports = router;
