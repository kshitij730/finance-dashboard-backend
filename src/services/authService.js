const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");
const { JWT_SECRET } = require("../middleware/auth");

const TOKEN_EXPIRY = "24h";

function register({ name, email, password, role = "viewer" }) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    const err = new Error("Email is already registered.");
    err.status = 409;
    throw err;
  }

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, name, email, hashed, role);

  const user = db.prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?").get(id);
  return { user, token: generateToken(user) };
}

function login({ email, password }) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  if (user.status === "inactive") {
    const err = new Error("Your account has been deactivated. Contact an administrator.");
    err.status = 403;
    throw err;
  }

  const { password: _, ...safeUser } = user;
  return { user: safeUser, token: generateToken(safeUser) };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

module.exports = { register, login };
