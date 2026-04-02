const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

/**
 * Build dynamic WHERE clause from filter options
 */
function buildFilters(filters, adminMode = false, userId = null) {
  const conditions = ["fr.is_deleted = 0"];
  const params = [];

  // Non-admins only see their own records
  if (!adminMode) {
    conditions.push("fr.user_id = ?");
    params.push(userId);
  }

  if (filters.type)     { conditions.push("fr.type = ?");             params.push(filters.type); }
  if (filters.category) { conditions.push("fr.category LIKE ?");      params.push(`%${filters.category}%`); }
  if (filters.dateFrom) { conditions.push("fr.date >= ?");            params.push(filters.dateFrom); }
  if (filters.dateTo)   { conditions.push("fr.date <= ?");            params.push(filters.dateTo); }
  if (filters.minAmount){ conditions.push("fr.amount >= ?");          params.push(Number(filters.minAmount)); }
  if (filters.maxAmount){ conditions.push("fr.amount <= ?");          params.push(Number(filters.maxAmount)); }
  if (filters.userId && adminMode) {
    conditions.push("fr.user_id = ?");
    params.push(filters.userId);
  }

  return { where: `WHERE ${conditions.join(" AND ")}`, params };
}

function getRecords(filters = {}, { page = 1, limit = 20 } = {}, requestingUser) {
  const isAdmin = requestingUser.role === "admin";
  const { where, params } = buildFilters(filters, isAdmin, requestingUser.id);
  const offset = (page - 1) * limit;

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM financial_records fr ${where}`
  ).get(...params).count;

  const records = db.prepare(`
    SELECT fr.*, u.name as user_name, u.email as user_email
    FROM financial_records fr
    LEFT JOIN users u ON fr.user_id = u.id
    ${where}
    ORDER BY fr.date DESC, fr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { records, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

function getRecordById(id, requestingUser) {
  const record = db.prepare(`
    SELECT fr.*, u.name as user_name
    FROM financial_records fr
    LEFT JOIN users u ON fr.user_id = u.id
    WHERE fr.id = ? AND fr.is_deleted = 0
  `).get(id);

  if (!record) {
    const err = new Error("Record not found.");
    err.status = 404;
    throw err;
  }

  // Viewers and analysts can only see their own records
  if (requestingUser.role !== "admin" && record.user_id !== requestingUser.id) {
    const err = new Error("You do not have permission to view this record.");
    err.status = 403;
    throw err;
  }

  return record;
}

function createRecord({ amount, type, category, date, notes }, userId) {
  const id = uuidv4();

  db.prepare(`
    INSERT INTO financial_records (id, user_id, amount, type, category, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, amount, type, category, date, notes || null);

  return db.prepare("SELECT * FROM financial_records WHERE id = ?").get(id);
}

function updateRecord(id, updates, requestingUser) {
  const record = db.prepare(
    "SELECT * FROM financial_records WHERE id = ? AND is_deleted = 0"
  ).get(id);

  if (!record) {
    const err = new Error("Record not found.");
    err.status = 404;
    throw err;
  }

  // Only admins or the record owner can update
  if (requestingUser.role !== "admin" && record.user_id !== requestingUser.id) {
    const err = new Error("You do not have permission to update this record.");
    err.status = 403;
    throw err;
  }

  const fields = [];
  const params = [];

  if (updates.amount   !== undefined) { fields.push("amount = ?");   params.push(updates.amount); }
  if (updates.type     !== undefined) { fields.push("type = ?");     params.push(updates.type); }
  if (updates.category !== undefined) { fields.push("category = ?"); params.push(updates.category); }
  if (updates.date     !== undefined) { fields.push("date = ?");     params.push(updates.date); }
  if (updates.notes    !== undefined) { fields.push("notes = ?");    params.push(updates.notes); }

  if (!fields.length) {
    const err = new Error("No valid fields provided for update.");
    err.status = 400;
    throw err;
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE financial_records SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return db.prepare("SELECT * FROM financial_records WHERE id = ?").get(id);
}

function deleteRecord(id, requestingUser) {
  const record = db.prepare(
    "SELECT * FROM financial_records WHERE id = ? AND is_deleted = 0"
  ).get(id);

  if (!record) {
    const err = new Error("Record not found.");
    err.status = 404;
    throw err;
  }

  if (requestingUser.role !== "admin" && record.user_id !== requestingUser.id) {
    const err = new Error("You do not have permission to delete this record.");
    err.status = 403;
    throw err;
  }

  // Soft delete
  db.prepare(
    "UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  return { message: "Record deleted successfully." };
}

module.exports = { getRecords, getRecordById, createRecord, updateRecord, deleteRecord };
