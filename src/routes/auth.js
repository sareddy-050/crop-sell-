const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, get, run } = require('../db');
require('dotenv').config();
const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9+]/g, '').trim();
}
function isEmail(str) { return /@/.test(String(str)); }

function isValidRole(role) {
  return role === 'customer' || role === 'farmer';
}

router.post('/signup', async (req, res) => {
  try {
    const role = String(req.body.role || '').trim();
    const adminName = String(req.body.adminName || '').trim();
    const email = req.body.email ? normalizeEmail(req.body.email) : null;
    const phone = req.body.phone ? normalizePhone(req.body.phone) : null;
    const password = String(req.body.password || '');

    if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
    if (!adminName || adminName.length < 3) return res.status(400).json({ error: 'Valid admin name required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const db = getDb();
    let existing = null;
    if (email) existing = await get(db, 'SELECT id FROM users WHERE email = ? AND role = ?', [email, role]);
    if (!existing && phone) existing = await get(db, 'SELECT id FROM users WHERE phone = ? AND role = ?', [phone, role]);
    if (existing) return res.status(409).json({ error: 'User already exists for this role' });
    const existingAdmin = await get(db, 'SELECT id FROM users WHERE admin_name = ?', [adminName]);
    if (existingAdmin) return res.status(409).json({ error: 'Admin name already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const emailToSave = email || (adminName.toLowerCase() + '@local');
    await run(db, 'INSERT INTO users (role, email, phone, admin_name, password_hash) VALUES (?,?,?,?,?)', [role, emailToSave, phone, adminName, passwordHash]);
    return res.status(201).json({ success: true, role, email: emailToSave, phone, adminName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const role = String(req.body.role || '').trim();
    const identifier = String(req.body.identifier || '').trim();
    const adminName = String(req.body.adminName || '').trim();
    const email = isEmail(identifier) ? normalizeEmail(identifier) : null;
    const phone = !isEmail(identifier) ? normalizePhone(identifier) : null;
    const password = String(req.body.password || '');

    if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
    if ((!email && !phone && !adminName) || !password) return res.status(400).json({ error: 'Identifier/admin and password required' });

    const db = getDb();
    let user = null;
    if (email) user = await get(db, 'SELECT id, email, phone, admin_name, role, password_hash FROM users WHERE email = ? AND role = ?', [email, role]);
    if (!user && phone) user = await get(db, 'SELECT id, email, phone, admin_name, role, password_hash FROM users WHERE phone = ? AND role = ?', [phone, role]);
    if (!user && adminName) user = await get(db, 'SELECT id, email, phone, admin_name, role, password_hash FROM users WHERE admin_name = ? AND role = ?', [adminName, role]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({ success: true, role: user.role, email: user.email, phone: user.phone, adminName: user.admin_name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// In-memory OTP store: { '<role>:<phone>': { otp, expiresAt } }
const otpStore = {};

// Helper to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/request-otp
// { role, phone }
router.post('/request-otp', async (req, res) => {
  try {
    const role = String(req.body.role || '').trim();
    const phone = req.body.phone ? normalizePhone(req.body.phone) : null;
    if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const db = getDb();
    const user = await get(db, 'SELECT id FROM users WHERE phone = ? AND role = ?', [phone, role]);
    if (!user) return res.status(404).json({ error: 'User not found' });
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[`${role}:${phone}`] = { otp, expiresAt };
  // Log OTP to terminal for backend debugging
  console.log(`[OTP] For role=${role}, phone=${phone}: OTP is ${otp}`);
  // No SMS sending, just store OTP
  return res.json({ success: true, otp }); // For testing, return OTP in response (remove in production)
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-otp
// { role, phone, otp, newPassword }
router.post('/verify-otp', async (req, res) => {
  try {
    const role = String(req.body.role || '').trim();
    const phone = req.body.phone ? normalizePhone(req.body.phone) : null;
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '');
    if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
    if (!phone || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const key = `${role}:${phone}`;
    const entry = otpStore[key];
    if (!entry || entry.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (Date.now() > entry.expiresAt) {
      delete otpStore[key];
      return res.status(400).json({ error: 'OTP expired' });
    }
    const db = getDb();
    const user = await get(db, 'SELECT id FROM users WHERE phone = ? AND role = ?', [phone, role]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await run(db, 'UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    delete otpStore[key];
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;




