const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

let db;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new sqlite3.Database(dbPath);
  await run(db, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('customer','farmer')),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(email, role)
  )`);
  // Ensure phone column exists on users
  const cols = await all(db, `PRAGMA table_info(users)`);
  const hasPhone = Array.isArray(cols) && cols.some(c => c.name === 'phone');
  if (!hasPhone) {
    await run(db, `ALTER TABLE users ADD COLUMN phone TEXT`);
  }
  const hasAdminName = Array.isArray(cols) && cols.some(c => c.name === 'admin_name');
  if (!hasAdminName) {
    await run(db, `ALTER TABLE users ADD COLUMN admin_name TEXT`);
  }
  const hasGoogleId = Array.isArray(cols) && cols.some(c => c.name === 'google_id');
  if (!hasGoogleId) {
    await run(db, `ALTER TABLE users ADD COLUMN google_id TEXT`);
    await run(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
  }
  // Unique index for (phone, role) when phone is not null
  await run(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_role ON users(phone, role)`);
  // Unique admin name (global uniqueness)
  await run(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_admin_name ON users(admin_name)`);
  await run(db, `CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_email TEXT NOT NULL,
    farmer_name TEXT,
    crop_type TEXT NOT NULL,
    price_per_unit REAL NOT NULL,
    contact_number TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    is_organic INTEGER NOT NULL DEFAULT 0,
    photo_paths TEXT,
    video_paths TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  // Ensure farmer_name column exists for listings
  const listCols = await all(db, `PRAGMA table_info(listings)`);
  const hasFarmerName = Array.isArray(listCols) && listCols.some(c => c.name === 'farmer_name');
  if (!hasFarmerName) {
    await run(db, `ALTER TABLE listings ADD COLUMN farmer_name TEXT`);
  }
  // Seed one sample listing if empty (for quick verification)
  const row = await get(db, `SELECT COUNT(*) AS cnt FROM listings`, []);
  if (row && row.cnt === 0) {
    await run(db, `INSERT INTO listings (farmer_email, crop_type, price_per_unit, contact_number, customer_address, is_organic, photo_paths, video_paths)
      VALUES (?,?,?,?,?,?,?,?)`, [
      'farmer@example.com', 'Sample Tomatoes', 2.5, '+1 555 000 0000', '123 Main St', 1,
      JSON.stringify([]), JSON.stringify([])
    ]);
  }
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { initDb, getDb, run, get, all };


