// routes/records.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // kept for backward-compatible logging if needed
const db = require('../db/db');
const { createClient } = require('@supabase/supabase-js');

// middleware
const auditLog = require('../middleware/auditLog');
const { validateRecord } = require('../middleware/validation');
const { auth } = require('../middleware/auth');

const router = express.Router();

// apply auth for all routes
router.use(auth);

// Supabase / storage config (from .env)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROFILE_BUCKET = process.env.SUPABASE_PROFILE_BUCKET || 'profile';
const FINGERPRINT_BUCKET = process.env.SUPABASE_FINGERPRINT_BUCKET || 'fingerprint';
const SIGNED_URL_EXPIRES_SEC = parseInt(process.env.SIGNED_URL_EXPIRES_SEC || '3600', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// multer memory storage (no local files)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only images for both photo and fingerprint (adjust if you need non-image formats)
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    if (file.fieldname !== 'photo' && file.fieldname !== 'fingerprint') {
      return cb(new Error('Unexpected field: ' + file.fieldname), false);
    }
    cb(null, true);
  }
});
const uploadHandler = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'fingerprint', maxCount: 1 }
]);

// Helper: upload buffer to supabase bucket, returns the object key saved in bucket
async function uploadToBucket(bucket, fileBuffer, originalname, mimetype) {
  const safeName = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(safeName, fileBuffer, { contentType: mimetype, upsert: false });

  if (error) throw error;
  // return the object key (we store this in DB)
  return safeName;
}

// Helper: remove object from bucket (if exists)
async function removeFromBucket(bucket, objectKey) {
  if (!objectKey) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove([objectKey]);
    if (error) {
      // don't throw on remove error - just log
      console.warn(`Failed to remove ${objectKey} from ${bucket}:`, error.message || error);
    }
  } catch (err) {
    console.warn('Error removing file from bucket:', err);
  }
}

// Helper: create signed url for a file in bucket
async function createSignedUrl(bucket, objectKey, expires = SIGNED_URL_EXPIRES_SEC) {
  if (!objectKey) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, expires);
    if (error) {
      console.warn('createSignedUrl error:', error.message || error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('createSignedUrl exception:', err);
    return null;
  }
}

/* ROUTES */

// GET all records (pagination + search)
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const searchTerm = `%${search}%`;

    const query = `
      SELECT * FROM records
      WHERE full_name ILIKE $1 OR tribe ILIKE $1 OR phone ILIKE $1 OR nickname ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) FROM records
      WHERE full_name ILIKE $1 OR tribe ILIKE $1 OR phone ILIKE $1 OR nickname ILIKE $1
    `;

    const recordsResult = await db.query(query, [searchTerm, limit, offset]);
    const countResult = await db.query(countQuery, [searchTerm]);

    res.json({
      records: recordsResult.rows,
      totalRecords: parseInt(countResult.rows[0].count, 10),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      currentPage: parseInt(page, 10)
    });
  } catch (err) {
    next(err);
  }
});

// GET single record by id — returns signed URLs for private buckets
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = result.rows[0];

    // generate signed URLs if stored keys exist (we store keys, not full URLs)
    try {
      if (record.photo_url) {
        const signed = await createSignedUrl(PROFILE_BUCKET, record.photo_url);
        if (signed) record.photo_url = signed;
      }
      if (record.fingerprint_url) {
        const signed = await createSignedUrl(FINGERPRINT_BUCKET, record.fingerprint_url);
        if (signed) record.fingerprint_url = signed;
      }
    } catch (err) {
      console.warn('Error creating signed urls:', err);
      // continue returning the record (without signed urls) if signing fails
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST create new record (uploads -> supabase)
router.post('/', uploadHandler, validateRecord, auditLog('CREATE_RECORD'), async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Files received:', Object.keys(req.files || {}));

    const {
      fullName,
      nickname,
      mothersName,
      dateOfBirth,
      tribe,
      parentPhone,
      phone,
      maritalStatus,
      numberOfChildren,
      residence,
      educationLevel,
      languages,
      technicalSkills,
      additionalDetails,
      hasPassport,
      everArrested,
      arrestLocation,
      arrestReason,
      arrestDate,
      arrestingAuthority,
      feelNo,
      baare
    } = req.body;

    // upload files if provided (memory buffers)
    let photoKey = null;
    let fingerprintKey = null;

    if (req.files?.photo?.[0]) {
      const f = req.files.photo[0];
      photoKey = await uploadToBucket(PROFILE_BUCKET, f.buffer, f.originalname, f.mimetype);
    }

    if (req.files?.fingerprint?.[0]) {
      const f = req.files.fingerprint[0];
      fingerprintKey = await uploadToBucket(FINGERPRINT_BUCKET, f.buffer, f.originalname, f.mimetype);
    }

    const processedDateOfBirth = dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null;
    const processedArrestDate = arrestDate && arrestDate.trim() !== '' ? arrestDate : null;

    const query = `
      INSERT INTO records (
        full_name, nickname, mothers_name, date_of_birth, tribe, parent_phone, phone,
        marital_status, number_of_children, residence, education_level,
        languages_spoken, technical_skills, additional_details, has_passport, ever_arrested,
        arrest_location, arrest_reason, arrest_date, arresting_authority, photo_url, fingerprint_url,
        feel_no, baare
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      ) RETURNING *;
    `;

    const values = [
      fullName,
      nickname || null,
      mothersName || null,
      processedDateOfBirth,
      tribe || null,
      parentPhone || null,
      phone || null,
      maritalStatus || null,
      parseInt(numberOfChildren, 10) || 0,
      residence || null,
      educationLevel || null,
      languages || null,
      technicalSkills || null,
      additionalDetails || null,
      hasPassport === 'true',
      everArrested === 'true',
      arrestLocation || null,
      arrestReason || null,
      processedArrestDate,
      arrestingAuthority || null,
      photoKey,
      fingerprintKey,
      feelNo || null,
      baare || null
    ];

    console.log('Executing INSERT with values:', { fullName, photoKey, fingerprintKey });

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST error:', err);
    // If upload happened but DB failed, you might want to cleanup uploaded objects here.
    next(err);
  }
});

// PUT update record (can replace files)
router.put('/:id', uploadHandler, validateRecord, auditLog('UPDATE_RECORD'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      nickname,
      mothersName,
      dateOfBirth,
      tribe,
      parentPhone,
      phone,
      maritalStatus,
      numberOfChildren,
      residence,
      educationLevel,
      languages,
      technicalSkills,
      additionalDetails,
      hasPassport,
      everArrested,
      arrestLocation,
      arrestReason,
      arrestDate,
      arrestingAuthority,
      feelNo,
      baare
    } = req.body;

    // fetch existing record to know old keys (so we can delete if replaced)
    const existing = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    const old = existing.rows[0];

    // If files provided, upload new and delete old
    let newPhotoKey = null;
    let newFingerprintKey = null;

    if (req.files?.photo?.[0]) {
      const f = req.files.photo[0];
      newPhotoKey = await uploadToBucket(PROFILE_BUCKET, f.buffer, f.originalname, f.mimetype);
      // delete old photo if it was stored as a key
      if (old.photo_url) await removeFromBucket(PROFILE_BUCKET, old.photo_url);
    }

    if (req.files?.fingerprint?.[0]) {
      const f = req.files.fingerprint[0];
      newFingerprintKey = await uploadToBucket(FINGERPRINT_BUCKET, f.buffer, f.originalname, f.mimetype);
      if (old.fingerprint_url) await removeFromBucket(FINGERPRINT_BUCKET, old.fingerprint_url);
    }

    // Build dynamic UPDATE statement
    const fields = [];
    const values = [];
    let idx = 1;

    function pushField(col, val) {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    }

    pushField('full_name', fullName);
    pushField('nickname', nickname || null);
    pushField('mothers_name', mothersName || null);
    pushField('date_of_birth', dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null);
    pushField('tribe', tribe || null);
    pushField('parent_phone', parentPhone || null);
    pushField('phone', phone || null);
    pushField('marital_status', maritalStatus || null);
    pushField('number_of_children', parseInt(numberOfChildren, 10) || 0);
    pushField('residence', residence || null);
    pushField('education_level', educationLevel || null);
    pushField('languages_spoken', languages || null);
    pushField('technical_skills', technicalSkills || null);
    pushField('additional_details', additionalDetails || null);
    pushField('has_passport', hasPassport === 'true');
    pushField('ever_arrested', everArrested === 'true');
    pushField('arrest_location', arrestLocation || null);
    pushField('arrest_reason', arrestReason || null);
    pushField('arrest_date', arrestDate && arrestDate.trim() !== '' ? arrestDate : null);
    pushField('arresting_authority', arrestingAuthority || null);
    pushField('feel_no', feelNo || null);
    pushField('baare', baare || null);

    // file keys
    if (newPhotoKey) pushField('photo_url', newPhotoKey);
    if (newFingerprintKey) pushField('fingerprint_url', newFingerprintKey);

    // updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `UPDATE records SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    values.push(id);

    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT error:', err);
    next(err);
  }
});

// DELETE record
router.delete('/:id', auditLog('DELETE_RECORD'), async (req, res, next) => {
  try {
    const { id } = req.params;
    // optionally fetch record and delete objects from storage
    const existing = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const rec = existing.rows[0];
    if (rec.photo_url) await removeFromBucket(PROFILE_BUCKET, rec.photo_url);
    if (rec.fingerprint_url) await removeFromBucket(FINGERPRINT_BUCKET, rec.fingerprint_url);

    const result = await db.query('DELETE FROM records WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
