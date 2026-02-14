const db = require('../config/db');

// ═══════════════════════════════════════════════════════════════════════
// 1. OVERVIEW — Top-level KPI numbers
// ═══════════════════════════════════════════════════════════════════════
async function getOverviewStats() {
    const [
        totalCustomers,
        statusBreakdown,
        totalEmployees,
        financeCases,
        revenue,
        plantInstallations,
        totalTasks,
        attendanceToday,
    ] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM registered_customers'),
        db.query(`SELECT application_status, COUNT(*) as count FROM registered_customers GROUP BY application_status`),
        db.query('SELECT COUNT(*) as count FROM employees'),
        db.query("SELECT COUNT(*) as count FROM registered_customers WHERE payment_mode = 'Finance' OR special_finance_required = 'Yes'"),
        db.query('SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(paid_amount), 0) as collected FROM transaction_logs'),
        db.query('SELECT COUNT(*) as count FROM plant_installations WHERE date_of_installation IS NOT NULL'),
        db.query(`SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'inprogress' THEN 1 ELSE 0 END) as inprogress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM tasks`),
        db.query(`SELECT COUNT(DISTINCT employee_id) as count FROM employee_attendance WHERE attendance_date = CURDATE()`),
    ]);

    const statusMap = {};
    statusBreakdown.forEach(r => { statusMap[r.application_status] = r.count; });

    return {
        total_customers: totalCustomers[0].count,
        total_employees: totalEmployees[0].count,
        finance_cases: financeCases[0].count,
        plant_installations_done: plantInstallations[0].count,
        total_revenue: revenue[0].total,
        collected_revenue: revenue[0].collected,
        pending_revenue: revenue[0].total - revenue[0].collected,
        collection_percentage: revenue[0].total > 0 ? Math.round((revenue[0].collected / revenue[0].total) * 100) : 0,
        tasks_total: totalTasks[0].total,
        tasks_pending: totalTasks[0].pending,
        tasks_inprogress: totalTasks[0].inprogress,
        tasks_completed: totalTasks[0].completed,
        attendance_today: attendanceToday[0].count,
        application_status_breakdown: statusMap,
    };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. DISTRICT-WISE INSTALLATIONS
// ═══════════════════════════════════════════════════════════════════════
async function getInstallationsByDistrict() {
    const rows = await db.query(`
        SELECT 
            rc.district,
            COUNT(*) as total_customers,
            SUM(CASE WHEN rc.application_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN rc.application_status IN ('DRAFT','SUBMITTED','APPROVED','IN_PROGRESS') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN rc.application_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
            COALESCE(SUM(rc.plant_size_kw), 0) as total_capacity_kw,
            COALESCE(SUM(rc.plant_price), 0) as total_business_value
        FROM registered_customers rc
        GROUP BY rc.district
        ORDER BY total_customers DESC
    `);
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. DISTRICT-WISE EMPLOYEES with role breakdown
// ═══════════════════════════════════════════════════════════════════════
async function getEmployeesByDistrict() {
    const rows = await db.query(`
        SELECT 
            COALESCE(district, 'Unassigned') as district,
            employee_role,
            COUNT(*) as count
        FROM employees
        GROUP BY district, employee_role
        ORDER BY district, employee_role
    `);

    const districtMap = {};
    rows.forEach(row => {
        if (!districtMap[row.district]) {
            districtMap[row.district] = { district: row.district, total: 0, roles: {} };
        }
        districtMap[row.district].total += row.count;
        districtMap[row.district].roles[row.employee_role] = row.count;
    });

    return Object.values(districtMap);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. FINANCE CASES — breakdown by district + mode
// ═══════════════════════════════════════════════════════════════════════
async function getFinanceCases() {
    const rows = await db.query(`
        SELECT 
            rc.district,
            rc.payment_mode,
            rc.special_finance_required,
            COUNT(*) as count,
            COALESCE(SUM(rc.plant_price), 0) as total_value,
            COALESCE(SUM(rc.plant_size_kw), 0) as total_capacity_kw
        FROM registered_customers rc
        WHERE rc.payment_mode = 'Finance' OR rc.special_finance_required = 'Yes'
        GROUP BY rc.district, rc.payment_mode, rc.special_finance_required
        ORDER BY count DESC
    `);
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 5. SALES EXECUTIVE PERFORMANCE — with year/month/district filters
// ═══════════════════════════════════════════════════════════════════════
async function getSalesExecutiveStats(filters = {}) {
    const { year, month, district } = filters;

    const dateConditions = [];
    const dateParams = [];
    if (year) { dateConditions.push('YEAR(rc.created_at) = ?'); dateParams.push(Number(year)); }
    if (month) { dateConditions.push('MONTH(rc.created_at) = ?'); dateParams.push(Number(month)); }
    if (district && district !== 'all') { dateConditions.push('rc.district = ?'); dateParams.push(district); }

    const joinCondition = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    const totals = await db.query(`
        SELECT 
            e.id as employee_id,
            e.name as employee_name,
            e.phone_number,
            e.district as employee_district,
            COUNT(rc.id) as total_customers,
            COALESCE(SUM(rc.plant_price), 0) as total_business_value,
            COALESCE(SUM(rc.plant_size_kw), 0) as total_capacity_kw,
            SUM(CASE WHEN rc.application_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_customers,
            SUM(CASE WHEN rc.payment_mode = 'Finance' THEN 1 ELSE 0 END) as finance_customers
        FROM employees e
        LEFT JOIN registered_customers rc ON rc.created_by = e.id ${joinCondition}
        WHERE e.employee_role = 'Sale Executive'
        GROUP BY e.id, e.name, e.phone_number, e.district
        ORDER BY total_customers DESC
    `, [...dateParams]);

    return totals;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. MONTHLY TREND — registrations per month with breakdown
// ═══════════════════════════════════════════════════════════════════════
async function getMonthlyTrend(year) {
    const targetYear = year || new Date().getFullYear();
    const rows = await db.query(`
        SELECT 
            MONTH(created_at) as month,
            COUNT(*) as total_customers,
            SUM(CASE WHEN payment_mode = 'Finance' THEN 1 ELSE 0 END) as finance_cases,
            SUM(CASE WHEN payment_mode = 'Cash' THEN 1 ELSE 0 END) as cash_cases,
            SUM(CASE WHEN payment_mode = 'UPI' THEN 1 ELSE 0 END) as upi_cases,
            SUM(CASE WHEN payment_mode = 'Cheque' THEN 1 ELSE 0 END) as cheque_cases,
            COALESCE(SUM(plant_price), 0) as total_value,
            COALESCE(SUM(plant_size_kw), 0) as total_capacity_kw,
            SUM(CASE WHEN application_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
        FROM registered_customers
        WHERE YEAR(created_at) = ?
        GROUP BY MONTH(created_at)
        ORDER BY month
    `, [targetYear]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((name, i) => {
        const found = rows.find(r => r.month === i + 1);
        return {
            month: i + 1,
            month_name: name,
            total_customers: found ? found.total_customers : 0,
            finance_cases: found ? found.finance_cases : 0,
            cash_cases: found ? found.cash_cases : 0,
            upi_cases: found ? found.upi_cases : 0,
            cheque_cases: found ? found.cheque_cases : 0,
            total_value: found ? found.total_value : 0,
            total_capacity_kw: found ? found.total_capacity_kw : 0,
            completed: found ? found.completed : 0,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════
// 7. TASK PIPELINE — work_type breakdown with status counts
// ═══════════════════════════════════════════════════════════════════════
async function getTaskPipeline() {
    const rows = await db.query(`
        SELECT 
            work_type,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'inprogress' THEN 1 ELSE 0 END) as inprogress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        GROUP BY work_type
        ORDER BY total DESC
    `);
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. ATTENDANCE SUMMARY — late count, absent, present per employee
// ═══════════════════════════════════════════════════════════════════════
async function getAttendanceSummary(filters = {}) {
    const { month, year } = filters;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);

    const rows = await db.query(`
        SELECT 
            e.id as employee_id,
            e.name as employee_name,
            e.employee_role,
            e.district,
            COUNT(ea.id) as days_present,
            SUM(CASE WHEN ea.is_late = 1 THEN 1 ELSE 0 END) as late_days,
            SUM(CASE WHEN ea.forgot_to_punch_out = 1 THEN 1 ELSE 0 END) as forgot_punch_out
        FROM employees e
        LEFT JOIN employee_attendance ea 
            ON e.id = ea.employee_id 
            AND YEAR(ea.attendance_date) = ?
            AND MONTH(ea.attendance_date) = ?
        GROUP BY e.id, e.name, e.employee_role, e.district
        ORDER BY days_present DESC
    `, [targetYear, targetMonth]);

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === Number(targetYear) && (today.getMonth() + 1) === Number(targetMonth);
    const daysSoFar = isCurrentMonth ? today.getDate() : daysInMonth;

    return {
        month: targetMonth,
        year: targetYear,
        days_in_month: daysSoFar,
        employees: rows.map(r => ({
            ...r,
            days_absent: daysSoFar - r.days_present,
            attendance_percentage: daysSoFar > 0 ? Math.round((r.days_present / daysSoFar) * 100) : 0,
        })),
    };
}

// ═══════════════════════════════════════════════════════════════════════
// 9. PLANT SIZE DISTRIBUTION — customers by kW range
// ═══════════════════════════════════════════════════════════════════════
async function getPlantSizeDistribution() {
    const rows = await db.query(`
        SELECT 
            CASE
                WHEN plant_size_kw <= 3 THEN '1-3 kW'
                WHEN plant_size_kw <= 5 THEN '3-5 kW'
                WHEN plant_size_kw <= 10 THEN '5-10 kW'
                WHEN plant_size_kw <= 20 THEN '10-20 kW'
                ELSE '20+ kW'
            END as size_range,
            COUNT(*) as count,
            COALESCE(SUM(plant_price), 0) as total_value,
            solar_plant_type
        FROM registered_customers
        GROUP BY size_range, solar_plant_type
        ORDER BY FIELD(size_range, '1-3 kW', '3-5 kW', '5-10 kW', '10-20 kW', '20+ kW'), solar_plant_type
    `);
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 10. PAYMENT COLLECTION TREND — monthly collection vs target
// ═══════════════════════════════════════════════════════════════════════
async function getPaymentCollectionTrend(year) {
    const targetYear = year || new Date().getFullYear();
    const rows = await db.query(`
        SELECT 
            MONTH(tl.updated_at) as month,
            COALESCE(SUM(tl.total_amount), 0) as target_amount,
            COALESCE(SUM(tl.paid_amount), 0) as collected_amount,
            COALESCE(SUM(tl.total_amount - tl.paid_amount), 0) as pending_amount,
            COUNT(*) as total_customers,
            SUM(CASE WHEN tl.paid_amount >= tl.total_amount THEN 1 ELSE 0 END) as fully_paid,
            SUM(CASE WHEN tl.paid_amount = 0 THEN 1 ELSE 0 END) as not_paid
        FROM transaction_logs tl
        WHERE YEAR(tl.created_at) = ?
        GROUP BY MONTH(tl.updated_at)
        ORDER BY month
    `, [targetYear]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((name, i) => {
        const found = rows.find(r => r.month === i + 1);
        return {
            month: i + 1,
            month_name: name,
            target_amount: found ? found.target_amount : 0,
            collected_amount: found ? found.collected_amount : 0,
            pending_amount: found ? found.pending_amount : 0,
            total_customers: found ? found.total_customers : 0,
            fully_paid: found ? found.fully_paid : 0,
            not_paid: found ? found.not_paid : 0,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════
// 11. COT / NAME CORRECTION / LOAD ENHANCEMENT STATS
// ═══════════════════════════════════════════════════════════════════════
async function getSpecialRequirements() {
    const rows = await db.query(`
        SELECT 
            district,
            SUM(CASE WHEN cot_required = 'Yes' THEN 1 ELSE 0 END) as cot_cases,
            SUM(CASE WHEN name_correction_required = 'Required' THEN 1 ELSE 0 END) as name_correction_cases,
            SUM(CASE WHEN load_enhancement_required = 'Required' THEN 1 ELSE 0 END) as load_enhancement_cases,
            COUNT(*) as total
        FROM registered_customers
        GROUP BY district
        ORDER BY total DESC
    `);
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 12. RECENT ACTIVITY — latest registrations, tasks, payments
// ═══════════════════════════════════════════════════════════════════════
async function getRecentActivity() {
    const [recentCustomers, recentTasks, recentPayments] = await Promise.all([
        db.query(`
            SELECT rc.id, rc.applicant_name, rc.district, rc.plant_size_kw, rc.payment_mode, 
                   rc.application_status, rc.created_at, e.name as created_by_name
            FROM registered_customers rc
            JOIN employees e ON rc.created_by = e.id
            ORDER BY rc.created_at DESC LIMIT 10
        `),
        db.query(`
            SELECT id, work_type, status, assigned_to_name, assigned_to_role, updated_at
            FROM tasks
            WHERE status != 'completed'
            ORDER BY updated_at DESC LIMIT 10
        `),
        db.query(`
            SELECT tl.id, rc.applicant_name, rc.district, tl.total_amount, tl.paid_amount,
                   (tl.total_amount - tl.paid_amount) as remaining, tl.updated_at
            FROM transaction_logs tl
            JOIN registered_customers rc ON tl.registered_customer_id = rc.id
            WHERE tl.paid_amount > 0
            ORDER BY tl.updated_at DESC LIMIT 10
        `),
    ]);

    return {
        recent_customers: recentCustomers,
        recent_tasks: recentTasks,
        recent_payments: recentPayments,
    };
}

module.exports = {
    getOverviewStats,
    getInstallationsByDistrict,
    getEmployeesByDistrict,
    getFinanceCases,
    getSalesExecutiveStats,
    getMonthlyTrend,
    getTaskPipeline,
    getAttendanceSummary,
    getPlantSizeDistribution,
    getPaymentCollectionTrend,
    getSpecialRequirements,
    getRecentActivity,
};
