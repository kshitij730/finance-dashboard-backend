const db = require("../config/database");

/**
 * Scope helper — admins see all records, others see only their own
 */
function scopeClause(user) {
  if (user.role === "admin") return { clause: "", params: [] };
  return { clause: "AND user_id = ?", params: [user.id] };
}

/**
 * Overall summary: total income, expense, net balance, record count
 */
function getSummary(user) {
  const { clause, params } = scopeClause(user);

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS net_balance,
      COUNT(*) AS total_records,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN 1 ELSE 0 END), 0) AS income_count,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END), 0) AS expense_count
    FROM financial_records
    WHERE is_deleted = 0 ${clause}
  `).get(...params);

  return row;
}

/**
 * Category-wise totals broken down by type
 */
function getCategoryBreakdown(user) {
  const { clause, params } = scopeClause(user);

  const rows = db.prepare(`
    SELECT
      category,
      type,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE is_deleted = 0 ${clause}
    GROUP BY category, type
    ORDER BY total DESC
  `).all(...params);

  // Group into { category: { income: x, expense: y, net: x-y } }
  const map = {};
  for (const row of rows) {
    if (!map[row.category]) map[row.category] = { category: row.category, income: 0, expense: 0, net: 0, count: 0 };
    map[row.category][row.type] += row.total;
    map[row.category].count += row.count;
  }

  for (const cat of Object.values(map)) {
    cat.net = cat.income - cat.expense;
  }

  return Object.values(map).sort((a, b) => b.income + b.expense - (a.income + a.expense));
}

/**
 * Monthly trend — income vs expense per month for the past N months
 */
function getMonthlyTrend(user, months = 12) {
  const { clause, params } = scopeClause(user);

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      type,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE is_deleted = 0
      AND date >= date('now', '-${months} months')
      ${clause}
    GROUP BY month, type
    ORDER BY month ASC
  `).all(...params);

  // Merge into per-month objects
  const map = {};
  for (const row of rows) {
    if (!map[row.month]) map[row.month] = { month: row.month, income: 0, expense: 0, net: 0, count: 0 };
    map[row.month][row.type] += row.total;
    map[row.month].count += row.count;
  }

  for (const m of Object.values(map)) {
    m.net = m.income - m.expense;
  }

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Weekly trend — last N weeks
 */
function getWeeklyTrend(user, weeks = 8) {
  const { clause, params } = scopeClause(user);

  const rows = db.prepare(`
    SELECT
      strftime('%Y-W%W', date) AS week,
      type,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE is_deleted = 0
      AND date >= date('now', '-${weeks * 7} days')
      ${clause}
    GROUP BY week, type
    ORDER BY week ASC
  `).all(...params);

  const map = {};
  for (const row of rows) {
    if (!map[row.week]) map[row.week] = { week: row.week, income: 0, expense: 0, net: 0, count: 0 };
    map[row.week][row.type] += row.total;
    map[row.week].count += row.count;
  }

  for (const w of Object.values(map)) {
    w.net = w.income - w.expense;
  }

  return Object.values(map).sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Recent activity — last N transactions
 */
function getRecentActivity(user, limit = 10) {
  const { clause, params } = scopeClause(user);

  return db.prepare(`
    SELECT fr.*, u.name as user_name
    FROM financial_records fr
    LEFT JOIN users u ON fr.user_id = u.id
    WHERE fr.is_deleted = 0 ${clause}
    ORDER BY fr.date DESC, fr.created_at DESC
    LIMIT ?
  `).all(...params, limit);
}

/**
 * Top spending categories (expenses only)
 */
function getTopExpenseCategories(user, limit = 5) {
  const { clause, params } = scopeClause(user);

  return db.prepare(`
    SELECT
      category,
      SUM(amount) AS total,
      COUNT(*) AS count,
      ROUND(SUM(amount) * 100.0 / (
        SELECT SUM(amount) FROM financial_records
        WHERE is_deleted = 0 AND type = 'expense' ${clause}
      ), 2) AS percentage
    FROM financial_records
    WHERE is_deleted = 0 AND type = 'expense' ${clause}
    GROUP BY category
    ORDER BY total DESC
    LIMIT ?
  `).all(...params, ...params, limit);
}

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getWeeklyTrend,
  getRecentActivity,
  getTopExpenseCategories,
};
