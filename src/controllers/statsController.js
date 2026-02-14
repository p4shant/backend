const statsService = require('../services/statsService');

async function getOverview(req, res) {
    try { return res.json(await statsService.getOverviewStats()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch overview stats' }); }
}

async function getInstallationsByDistrict(req, res) {
    try { return res.json(await statsService.getInstallationsByDistrict()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getEmployeesByDistrict(req, res) {
    try { return res.json(await statsService.getEmployeesByDistrict()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getFinanceCases(req, res) {
    try { return res.json(await statsService.getFinanceCases()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getSalesExecutiveStats(req, res) {
    try {
        const { year, month, district } = req.query;
        return res.json(await statsService.getSalesExecutiveStats({ year, month, district }));
    } catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getMonthlyTrend(req, res) {
    try { return res.json(await statsService.getMonthlyTrend(req.query.year)); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getTaskPipeline(req, res) {
    try { return res.json(await statsService.getTaskPipeline()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getAttendanceSummary(req, res) {
    try {
        const { month, year } = req.query;
        return res.json(await statsService.getAttendanceSummary({ month, year }));
    } catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getPlantSizeDistribution(req, res) {
    try { return res.json(await statsService.getPlantSizeDistribution()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getPaymentCollectionTrend(req, res) {
    try { return res.json(await statsService.getPaymentCollectionTrend(req.query.year)); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getSpecialRequirements(req, res) {
    try { return res.json(await statsService.getSpecialRequirements()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

async function getRecentActivity(req, res) {
    try { return res.json(await statsService.getRecentActivity()); }
    catch (err) { return res.status(500).json({ message: err.message || 'Unable to fetch data' }); }
}

module.exports = {
    getOverview, getInstallationsByDistrict, getEmployeesByDistrict,
    getFinanceCases, getSalesExecutiveStats, getMonthlyTrend,
    getTaskPipeline, getAttendanceSummary,
    getPlantSizeDistribution, getPaymentCollectionTrend,
    getSpecialRequirements, getRecentActivity,
};
