/**
 * Jest setupFile — runs in the test worker before each test suite.
 * Builds the shared in-memory sql.js database and attaches it to global
 * so that database.js can pick it up automatically in test mode.
 */
"use strict";

const initSqlJs = require("sql.js");

// This file can use async because Jest supports async setupFiles
// via the setupFilesAfterFramework setting when using jest-circus.
// But for compatibility, we use a global beforeAll trick.

beforeAll(async () => {
  if (global.__JEST_SQLDB__) return; // already initialised by a previous suite

  const SQL = await initSqlJs();
  const db  = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer', status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount REAL NOT NULL,
      type TEXT NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL,
      notes TEXT, is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  global.__JEST_SQLDB__ = db;
});
