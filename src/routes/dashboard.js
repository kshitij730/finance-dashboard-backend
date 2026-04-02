const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

// Dashboard data accessible to analyst and admin (not viewer)
router.use(authenticate, authorize("analyst", "admin"));

router.get("/summary",            dashboardController.summary);
router.get("/categories",         dashboardController.categoryBreakdown);
router.get("/trends/monthly",     dashboardController.monthlyTrend);
router.get("/trends/weekly",      dashboardController.weeklyTrend);
router.get("/recent",             dashboardController.recentActivity);
router.get("/top-expenses",       dashboardController.topExpenses);

module.exports = router;
