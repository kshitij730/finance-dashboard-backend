/**
 * helpers.js — seed utilities for tests.
 *
 * The in-memory DB is built by tests/jestSetup.js (setupFilesAfterEnv)
 * which sets global.__JEST_SQLDB__ before any test runs.
 *
 * database.js picks that up automatically via the global.__JEST_SQLDB__ check.
 */
"use strict";

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET = "finance_secret_key_change_in_production";

function getDb() {
  // database.js reads global.__JEST_SQLDB__ internally;
  // we just need the same facade for seeding.
  return require("../src/config/database");
}

function makeToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "1h" });
}

function seedUser(overrides) {
  const db = getDb();
  const user = Object.assign({
    id: uuidv4(),
    name: "Test User",
    email: "u-" + uuidv4() + "@t.com",
    password: bcrypt.hashSync("Password1", 10),
    role: "viewer",
    status: "active",
  }, overrides || {});
  db.prepare(
    "INSERT INTO users (id,name,email,password,role,status) VALUES (?,?,?,?,?,?)"
  ).run(user.id, user.name, user.email, user.password, user.role, user.status);
  return user;
}

function seedRecord(userId, overrides) {
  const db = getDb();
  const rec = Object.assign({
    id: uuidv4(), user_id: userId,
    amount: 1000, type: "income",
    category: "Salary", date: "2025-01-15", notes: "Test",
  }, overrides || {});
  db.prepare(
    "INSERT INTO financial_records (id,user_id,amount,type,category,date,notes) VALUES (?,?,?,?,?,?,?)"
  ).run(rec.id, rec.user_id, rec.amount, rec.type, rec.category, rec.date, rec.notes);
  return rec;
}

function clearTables() {
  const s = global.__JEST_SQLDB__;
  if (!s) throw new Error("Test DB not ready — jestSetup.js may not have run.");
  s.run("DELETE FROM financial_records");
  s.run("DELETE FROM users");
}

module.exports = { makeToken, seedUser, seedRecord, clearTables };
