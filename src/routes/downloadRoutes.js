const { Router } = require('express');
const downloadController = require('../controllers/downloadController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticate, downloadController.download);

module.exports = router;
