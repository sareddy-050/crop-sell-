const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { getDb, run, all } = require('../db');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.post('/', upload.fields([
  { name: 'photos', maxCount: 6 },
  { name: 'videos', maxCount: 2 }
]), async (req, res) => {
  try {
    const db = getDb();
    const farmerEmail = String(req.body.farmerEmail || '').trim().toLowerCase();
    const farmerName = String(req.body.farmerName || '').trim();
    const cropType = String(req.body.cropType || '').trim();
    const pricePerUnit = parseFloat(req.body.pricePerUnit);
    const contactNumber = String(req.body.contactNumber || '').trim();
    const customerAddress = String(req.body.customerAddress || '').trim();
    const isOrganic = String(req.body.isOrganic || '0') === '1' ? 1 : 0;

    if (!farmerEmail || !cropType || !contactNumber || !customerAddress || !Number.isFinite(pricePerUnit)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const photos = (req.files.photos || []).map(f => `/uploads/${path.basename(f.path)}`);
    const videos = (req.files.videos || []).map(f => `/uploads/${path.basename(f.path)}`);

    await run(db, `INSERT INTO listings
      (farmer_email, farmer_name, crop_type, price_per_unit, contact_number, customer_address, is_organic, photo_paths, video_paths)
      VALUES (?,?,?,?,?,?,?,?,?)`, [
      farmerEmail, farmerName || null, cropType, pricePerUnit, contactNumber, customerAddress, isOrganic,
      JSON.stringify(photos), JSON.stringify(videos)
    ]);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const id = req.query.id ? parseInt(String(req.query.id), 10) : null;
    const farmerEmail = String(req.query.farmerEmail || '').trim().toLowerCase();
    let rows;
    if (id) {
      rows = await all(db, `SELECT l.*, COALESCE(l.farmer_name, (SELECT admin_name FROM users u WHERE u.email = l.farmer_email AND u.role = 'farmer' LIMIT 1)) AS farmer_name FROM listings l WHERE l.id = ?`, [id]);
    } else if (farmerEmail) {
      rows = await all(db, `SELECT l.*, COALESCE(l.farmer_name, (SELECT admin_name FROM users u WHERE u.email = l.farmer_email AND u.role = 'farmer' LIMIT 1)) AS farmer_name FROM listings l WHERE l.farmer_email = ? ORDER BY l.id DESC`, [farmerEmail]);
    } else {
      rows = await all(db, `SELECT l.*, COALESCE(l.farmer_name, (SELECT admin_name FROM users u WHERE u.email = l.farmer_email AND u.role = 'farmer' LIMIT 1)) AS farmer_name FROM listings l ORDER BY l.id DESC`, []);
    }
    const data = rows.map(r => ({
      id: r.id,
      cropType: r.crop_type,
      pricePerUnit: r.price_per_unit,
      contactNumber: r.contact_number,
      customerAddress: r.customer_address,
      isOrganic: !!r.is_organic,
      farmerName: r.farmer_name || null,
      photos: r.photo_paths ? JSON.parse(r.photo_paths) : [],
      videos: r.video_paths ? JSON.parse(r.video_paths) : [],
      createdAt: r.created_at
    }));
    res.json({ items: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update listing (owner check by farmerEmail, with file/image/video support)
router.patch('/:id', upload.fields([
  { name: 'photos', maxCount: 6 },
  { name: 'videos', maxCount: 2 }
]), async (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(String(req.params.id || ''), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const owner = String((req.body.farmerEmail || req.body.owner || req.query.owner || '')).trim().toLowerCase();
    if (!owner) return res.status(400).json({ error: 'owner required' });
    const row = await all(db, 'SELECT * FROM listings WHERE id = ? LIMIT 1', [id]);
    if (!row || row.length === 0) return res.status(404).json({ error: 'Not found' });
    const rec = row[0];
    const recEmail = String(rec.farmer_email || '').toLowerCase();
    const recName = String(rec.farmer_name || '').toLowerCase();
    let isOwner = owner === recEmail || (recName && owner === recName);
    if (!isOwner) {
      const u = await all(db, `SELECT email FROM users WHERE (LOWER(admin_name)=? OR LOWER(email)=?) AND role='farmer' LIMIT 1`, [owner, owner]);
      if (u && u[0] && String(u[0].email || '').toLowerCase() === recEmail) isOwner = true;
    }
    if (!isOwner) return res.status(403).json({ error: 'Not owner' });

    // Handle deleted images/videos
    let currentPhotos = rec.photo_paths ? JSON.parse(rec.photo_paths) : [];
    let currentVideos = rec.video_paths ? JSON.parse(rec.video_paths) : [];
    let deletedImages = [];
    let deletedVideos = [];
    try {
      deletedImages = req.body.deletedImages ? JSON.parse(req.body.deletedImages) : [];
    } catch {}
    try {
      deletedVideos = req.body.deletedVideos ? JSON.parse(req.body.deletedVideos) : [];
    } catch {}
    // Remove deleted files from disk
    deletedImages.forEach(filename => {
      const abs = path.join(uploadsDir, path.basename(filename));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
      currentPhotos = currentPhotos.filter(f => f !== filename);
    });
    deletedVideos.forEach(filename => {
      const abs = path.join(uploadsDir, path.basename(filename));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
      currentVideos = currentVideos.filter(f => f !== filename);
    });

    // Add new uploaded files
    if (req.files['photos']) {
      req.files['photos'].forEach(f => {
        const rel = `/uploads/${path.basename(f.path)}`;
        currentPhotos.push(rel);
      });
    }
    if (req.files['videos']) {
      req.files['videos'].forEach(f => {
        const rel = `/uploads/${path.basename(f.path)}`;
        currentVideos.push(rel);
      });
    }

    // Update fields
    const updates = [];
    const params = [];
    function push(field, dbcol, transform) {
      if (typeof field !== 'undefined') { updates.push(dbcol + ' = ?'); params.push(transform ? transform(field) : field); }
    }
    push(req.body.farmerName, 'farmer_name');
    push(req.body.cropType, 'crop_type');
    if (typeof req.body.pricePerUnit !== 'undefined') push(parseFloat(req.body.pricePerUnit), 'price_per_unit', Number);
    push(req.body.contactNumber, 'contact_number');
    push(req.body.customerAddress, 'customer_address');
    if (typeof req.body.isOrganic !== 'undefined') push(String(req.body.isOrganic) === '1' || req.body.isOrganic === true ? 1 : 0, 'is_organic');
    // Always update photo_paths and video_paths
    updates.push('photo_paths = ?');
    params.push(JSON.stringify(currentPhotos));
    updates.push('video_paths = ?');
    params.push(JSON.stringify(currentVideos));

    if (updates.length === 0) return res.json({ success: true });
    const sql = `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    await run(db, sql, params);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete listing (owner check by farmerEmail)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(String(req.params.id || ''), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const owner = String(((req.body && (req.body.farmerEmail || req.body.owner)) || req.query.owner || '')).trim().toLowerCase();
    if (!owner) return res.status(400).json({ error: 'owner required' });
    const row = await all(db, 'SELECT * FROM listings WHERE id = ? LIMIT 1', [id]);
    if (!row || row.length === 0) return res.status(404).json({ error: 'Not found' });
    const rec = row[0];
    const recEmail = String(rec.farmer_email || '').toLowerCase();
    const recName = String(rec.farmer_name || '').toLowerCase();
    let isOwner = owner === recEmail || (recName && owner === recName);
    if (!isOwner) {
      const u = await all(db, `SELECT email FROM users WHERE (LOWER(admin_name)=? OR LOWER(email)=?) AND role='farmer' LIMIT 1`, [owner, owner]);
      if (u && u[0] && String(u[0].email || '').toLowerCase() === recEmail) isOwner = true;
    }
    if (!isOwner) return res.status(403).json({ error: 'Not owner' });
    await run(db, 'DELETE FROM listings WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


