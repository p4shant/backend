const { Router } = require('express');
const controller = require('../controllers/statsController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticate);
router.use(requireRoles(['Master Admin']));

router.get('/overview', controller.getOverview);
router.get('/installations-by-district', controller.getInstallationsByDistrict);
router.get('/employees-by-district', controller.getEmployeesByDistrict);
router.get('/finance-cases', controller.getFinanceCases);
router.get('/sales-executive', controller.getSalesExecutiveStats);
router.get('/monthly-trend', controller.getMonthlyTrend);
router.get('/task-pipeline', controller.getTaskPipeline);
router.get('/attendance-summary', controller.getAttendanceSummary);
router.get('/plant-size-distribution', controller.getPlantSizeDistribution);
router.get('/payment-collection-trend', controller.getPaymentCollectionTrend);
router.get('/special-requirements', controller.getSpecialRequirements);
router.get('/recent-activity', controller.getRecentActivity);

module.exports = router;
