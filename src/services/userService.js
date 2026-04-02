const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

function getAllUsers({ page = 1, limit = 20, role, status } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (role)   { conditions.push("role = ?");   params.push(role); }
  if (status) { conditions.push("status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;
  const users = db.prepare(
    `SELECT id, name, email, role, status, created_at, updated_at FROM users ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { users, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

function getUserById(id) {
  const user = db.prepare(
    "SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?"
  ).get(id);

  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }
  return user;
}

function createUser({ name, email, password, role = "viewer" }) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    const err = new Error("Email already exists.");
    err.status = 409;
    throw err;
  }

  const id = uuidv4();
  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, name, email, hashed, role);

  return db.prepare(
    "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?"
  ).get(id);
}

function updateUser(id, { name, role, status }) {
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const params = [];

  if (name   !== undefined) { fields.push("name = ?");   params.push(name); }
  if (role   !== undefined) { fields.push("role = ?");   params.push(role); }
  if (status !== undefined) { fields.push("status = ?"); params.push(status); }

  if (!fields.length) {
    const err = new Error("No valid fields provided for update.");
    err.status = 400;
    throw err;
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return db.prepare(
    "SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?"
  ).get(id);
}

function deleteUser(id, requestingUserId) {
  if (id === requestingUserId) {
    const err = new Error("You cannot delete your own account.");
    err.status = 400;
    throw err;
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  // Soft delete — deactivate instead of hard delete
  db.prepare("UPDATE users SET status = 'inactive', updated_at = datetime('now') WHERE id = ?").run(id);
  return { message: "User deactivated successfully." };
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
