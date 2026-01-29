const { Router } = require('express');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const registeredCustomerRoutes = require('./registeredCustomerRoutes');
const taskRoutes = require('./taskRoutes');
const uploadRoutes = require('./uploadRoutes');
const additionalDocumentRoutes = require('./additionalDocumentRoutes');
const providedSolarPlantDetailsRoutes = require('./providedSolarPlantDetailsRoutes');
const transactionLogRoutes = require('./transactionLogRoutes');
const plantInstallationDetailsRoutes = require('./plantInstallationDetailsRoutes');
const employeeAttendanceRoutes = require('./employeeAttendanceRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const schedulerRoutes = require('./schedulerRoutes');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', authenticate, employeeRoutes);
router.use('/registered-customers', registeredCustomerRoutes);
router.use('/tasks', taskRoutes);
router.use('/uploads', uploadRoutes);
router.use('/additional-documents', additionalDocumentRoutes);
router.use('/solar-plant-details', providedSolarPlantDetailsRoutes);
router.use('/transaction-logs', transactionLogRoutes);
router.use('/plant-installation-details', plantInstallationDetailsRoutes);
router.use('/employee-attendance', employeeAttendanceRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/scheduler', schedulerRoutes);

module.exports = router;
