import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

let db;

export function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

// Allow tests to run against an isolated in-memory database.
export function makeTestDb() {
  const mem = new Database(':memory:');
  mem.pragma('foreign_keys = ON');
  migrate(mem);
  return mem;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      -- LAB_VULNERABILITY (weak-auth): password stored in plaintext, no hashing.
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      location TEXT,
      size_hectares REAL,
      crop_type TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
      season_name TEXT NOT NULL,
      crop_type TEXT,
      variety TEXT,
      start_date TEXT,
      expected_harvest_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plot_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      original_name TEXT NOT NULL,
      s3_bucket TEXT NOT NULL,
      s3_key TEXT NOT NULL,
      content_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
