const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/db');

// Import the new middleware
const auditLog = require('../middleware/auditLog');
const { validateRecord } = require('../middleware/validation');
const { auth } = require('../middleware/auth'); // Import auth middleware

const router = express.Router();

// Apply auth middleware to all record routes
router.use(auth);

// Ensure fingerprint directory exists
const fingerprintDir = path.join(__dirname, '../uploads/fingerprint');
if (!fs.existsSync(fingerprintDir)) {
  fs.mkdirSync(fingerprintDir, { recursive: true });
}

// Configure multer for profile photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for fingerprint uploads
const fingerprintStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/fingerprint/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'fingerprint-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create separate upload instances
const uploadPhoto = multer({ 
  storage: photoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const uploadFingerprint = multer({ 
  storage: fingerprintStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// For routes that need both photo and fingerprint
const uploadBoth = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'photo') {
        cb(null, 'uploads/');
      } else if (file.fieldname === 'fingerprint') {
        cb(null, 'uploads/fingerprint/');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      if (file.fieldname === 'photo') {
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
      } else if (file.fieldname === 'fingerprint') {
        cb(null, 'fingerprint-' + uniqueSuffix + path.extname(file.originalname));
      }
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET all records with pagination and search
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM records 
      WHERE full_name ILIKE $1 OR tribe ILIKE $1 OR phone ILIKE $1 OR nickname ILIKE $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    let countQuery = `
      SELECT COUNT(*) FROM records 
      WHERE full_name ILIKE $1 OR tribe ILIKE $1 OR phone ILIKE $1 OR nickname ILIKE $1
    `;
    
    const searchTerm = `%${search}%`;
    
    const recordsResult = await db.query(query, [searchTerm, limit, offset]);
    const countResult = await db.query(countQuery, [searchTerm]);
    
    res.json({
      records: recordsResult.rows,
      totalRecords: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    next(error);
  }
});

// GET single record by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create new record
router.post('/', uploadBoth.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'fingerprint', maxCount: 1 }
]), validateRecord, auditLog('CREATE_RECORD'), async (req, res, next) => {
  try {
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
      arrestingAuthority
    } = req.body;
    
    let photoUrl = null;
    let fingerprintUrl = null;
    
    if (req.files && req.files.photo && req.files.photo[0]) {
      photoUrl = `/uploads/${req.files.photo[0].filename}`;
    }
    
    if (req.files && req.files.fingerprint && req.files.fingerprint[0]) {
      fingerprintUrl = `/uploads/fingerprint/${req.files.fingerprint[0].filename}`;
    }
    
    // Convert empty date strings to null
    const processedDateOfBirth = dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null;
    const processedArrestDate = arrestDate && arrestDate.trim() !== '' ? arrestDate : null;
    
    const query = `
      INSERT INTO records (
        full_name, nickname, mothers_name, date_of_birth, tribe, parent_phone, phone,
        marital_status, number_of_children, residence, education_level,
        languages_spoken, technical_skills, additional_details, has_passport, ever_arrested,
        arrest_location, arrest_reason, arrest_date, arresting_authority, photo_url, fingerprint_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;
    
    const values = [
      fullName,
      nickname || null,
      mothersName,
      processedDateOfBirth,
      tribe,
      parentPhone,
      phone,
      maritalStatus,
      parseInt(numberOfChildren) || 0,
      residence,
      educationLevel,
      languages,
      technicalSkills,
      additionalDetails || null,
      hasPassport === 'true',
      everArrested === 'true',
      arrestLocation,
      arrestReason,
      processedArrestDate,
      arrestingAuthority,
      photoUrl,
      fingerprintUrl
    ];
    
    console.log('Executing query with values:', values);
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Detailed error:', error);
    next(error);
  }
});

// PUT update record
router.put('/:id', uploadBoth.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'fingerprint', maxCount: 1 }
]), validateRecord, auditLog('UPDATE_RECORD'), async (req, res, next) => {
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
      arrestingAuthority
    } = req.body;
    
    // Convert empty date strings to null
    const processedDateOfBirth = dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null;
    const processedArrestDate = arrestDate && arrestDate.trim() !== '' ? arrestDate : null;
    
    let query = '';
    let values = [];
    
    // Check if we have new files
    const hasNewPhoto = req.files && req.files.photo && req.files.photo[0];
    const hasNewFingerprint = req.files && req.files.fingerprint && req.files.fingerprint[0];
    
    if (hasNewPhoto || hasNewFingerprint) {
      let photoUrl = null;
      let fingerprintUrl = null;
      
      if (hasNewPhoto) {
        photoUrl = `/uploads/${req.files.photo[0].filename}`;
      }
      
      if (hasNewFingerprint) {
        fingerprintUrl = `/uploads/fingerprint/${req.files.fingerprint[0].filename}`;
      }
      
      query = `
        UPDATE records SET 
          full_name = $1, nickname = $2, mothers_name = $3, date_of_birth = $4, tribe = $5, 
          parent_phone = $6, phone = $7, marital_status = $8, number_of_children = $9, 
          residence = $10, education_level = $11, languages_spoken = $12, 
          technical_skills = $13, additional_details = $14, has_passport = $15, ever_arrested = $16, 
          arrest_location = $17, arrest_reason = $18, arrest_date = $19, 
          arresting_authority = $20, updated_at = CURRENT_TIMESTAMP
      `;
      
      // Add photo_url if we have a new photo
      if (hasNewPhoto) {
        query += `, photo_url = $21`;
      }
      
      // Add fingerprint_url if we have a new fingerprint
      if (hasNewFingerprint) {
        if (hasNewPhoto) {
          query += `, fingerprint_url = $22`;
        } else {
          query += `, fingerprint_url = $21`;
        }
      }
      
      query += ` WHERE id = $${hasNewPhoto && hasNewFingerprint ? 23 : hasNewPhoto || hasNewFingerprint ? 22 : 21} RETURNING *`;
      
      values = [
        fullName,
        nickname || null,
        mothersName,
        processedDateOfBirth,
        tribe,
        parentPhone,
        phone,
        maritalStatus,
        parseInt(numberOfChildren) || 0,
        residence,
        educationLevel,
        languages,
        technicalSkills,
        additionalDetails || null,
        hasPassport === 'true',
        everArrested === 'true',
        arrestLocation,
        arrestReason,
        processedArrestDate,
        arrestingAuthority
      ];
      
      // Add URLs to values array
      if (hasNewPhoto) {
        values.push(photoUrl);
      }
      
      if (hasNewFingerprint) {
        values.push(fingerprintUrl);
      }
      
      // Add ID at the end
      values.push(id);
    } else {
      // No new files, just update the other fields
      query = `
        UPDATE records SET 
          full_name = $1, nickname = $2, mothers_name = $3, date_of_birth = $4, tribe = $5, 
          parent_phone = $6, phone = $7, marital_status = $8, number_of_children = $9, 
          residence = $10, education_level = $11, languages_spoken = $12, 
          technical_skills = $13, additional_details = $14, has_passport = $15, ever_arrested = $16, 
          arrest_location = $17, arrest_reason = $18, arrest_date = $19, 
          arresting_authority = $20, updated_at = CURRENT_TIMESTAMP
        WHERE id = $21
        RETURNING *
      `;
      
      values = [
        fullName,
        nickname || null,
        mothersName,
        processedDateOfBirth,
        tribe,
        parentPhone,
        phone,
        maritalStatus,
        parseInt(numberOfChildren) || 0,
        residence,
        educationLevel,
        languages,
        technicalSkills,
        additionalDetails || null,
        hasPassport === 'true',
        everArrested === 'true',
        arrestLocation,
        arrestReason,
        processedArrestDate,
        arrestingAuthority,
        id
      ];
    }
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE record
router.delete('/:id', auditLog('DELETE_RECORD'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM records WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;