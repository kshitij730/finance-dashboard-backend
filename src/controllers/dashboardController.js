const dashboardService = require("../services/dashboardService");

async function summary(req, res, next) {
  try {
    const data = dashboardService.getSummary(req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function categoryBreakdown(req, res, next) {
  try {
    const data = dashboardService.getCategoryBreakdown(req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function monthlyTrend(req, res, next) {
  try {
    const months = Math.min(Number(req.query.months) || 12, 24);
    const data = dashboardService.getMonthlyTrend(req.user, months);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function weeklyTrend(req, res, next) {
  try {
    const weeks = Math.min(Number(req.query.weeks) || 8, 52);
    const data = dashboardService.getWeeklyTrend(req.user, weeks);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function recentActivity(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const data = dashboardService.getRecentActivity(req.user, limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function topExpenses(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 10);
    const data = dashboardService.getTopExpenseCategories(req.user, limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, categoryBreakdown, monthlyTrend, weeklyTrend, recentActivity, topExpenses };
