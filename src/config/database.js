/**
 * database.js
 *
 * In production: exports a db object; call `await db.initDb()` at startup.
 * In Jest tests: if global.__JEST_SQLDB__ is set (by tests/jestSetup.js),
 *               the db facade uses it directly — no initDb() needed.
 */
"use strict";

const fs        = require("fs");
const path      = require("path");
const initSqlJs = require("sql.js");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/finance.db");

let _sqlDb = null;

function norm(args) {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : Array.from(args);
}

function getSqlDb() {
  // In test environment, use the globally pre-built in-memory DB
  if (global.__JEST_SQLDB__) return global.__JEST_SQLDB__;
  if (_sqlDb) return _sqlDb;
  throw new Error("Database not initialised. Call await db.initDb() first.");
}

const db = {
  pragma() {},

  exec(sql) {
    getSqlDb().run(sql);
    _persist();
  },

  prepare(sql) {
    return {
      get(...args) {
        const s = getSqlDb();
        const stmt = s.prepare(sql);
        stmt.bind(norm(args));
        if (!stmt.step()) { stmt.free(); return undefined; }
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      all(...args) {
        const res = getSqlDb().exec(sql, norm(args));
        if (!res.length) return [];
        const { columns, values } = res[0];
        return values.map(row => {
          const obj = {};
          columns.forEach((c, i) => { obj[c] = row[i]; });
          return obj;
        });
      },
      run(...args) {
        getSqlDb().run(sql, norm(args));
        _persist();
        return { changes: getSqlDb().getRowsModified() };
      },
    };
  },

  async initDb() {
    if (_sqlDb || global.__JEST_SQLDB__) return db;
    const SQL = await initSqlJs();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
    _sqlDb = buf ? new SQL.Database(buf) : new SQL.Database();
    _sqlDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer', status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
      );
      CREATE TABLE IF NOT EXISTS financial_records (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount REAL NOT NULL,
        type TEXT NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL,
        notes TEXT, is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_rec_user    ON financial_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_rec_type    ON financial_records(type);
      CREATE INDEX IF NOT EXISTS idx_rec_date    ON financial_records(date);
      CREATE INDEX IF NOT EXISTS idx_rec_deleted ON financial_records(is_deleted);
    `);
    _persist();
    console.log("✅ Database ready");
    return db;
  },
};

function _persist() {
  if (global.__JEST_SQLDB__) return; // never write to disk in tests
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(getSqlDb().export()));
  } catch (_) {}
}

module.exports = db;
