const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/db');

// Import the new middleware
const auditLog = require('../middleware/auditLog');
const { validateRecord } = require('../middleware/validation');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all record routes
router.use(auth);

// Ensure fingerprint directory exists
const fingerprintDir = path.join(__dirname, '../uploads/fingerprint');
if (!fs.existsSync(fingerprintDir)) {
  fs.mkdirSync(fingerprintDir, { recursive: true });
}

// Simple multer configuration that treats both files the same way
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // For fingerprint files
    if (file.fieldname === 'fingerprint') {
      cb(null, 'uploads/fingerprint/');
    } 
    // For photo files
    else if (file.fieldname === 'photo') {
      cb(null, 'uploads/');
    } 
    // For any other field
    else {
      cb(new Error('Unexpected field: ' + file.fieldname), false);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let prefix = '';
    
    if (file.fieldname === 'photo') {
      prefix = 'photo-';
    } else if (file.fieldname === 'fingerprint') {
      prefix = 'fingerprint-';
    }
    
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create upload handler
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      if (file.fieldname === 'photo' || file.fieldname === 'fingerprint') {
        cb(null, true);
      } else {
        cb(new Error('Unexpected field: ' + file.fieldname), false);
      }
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply fields configuration
const uploadHandler = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'fingerprint', maxCount: 1 }
]);

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
router.post('/', uploadHandler, validateRecord, auditLog('CREATE_RECORD'), async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Files received:', req.files);
    
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
    
    let photoUrl = null;
    let fingerprintUrl = null;
    
    // Handle photo upload
    if (req.files && req.files.photo && req.files.photo.length > 0) {
      console.log('Processing photo:', req.files.photo[0].originalname);
      photoUrl = `/uploads/${req.files.photo[0].filename}`;
    }
    
    // Handle fingerprint upload
    if (req.files && req.files.fingerprint && req.files.fingerprint.length > 0) {
      console.log('Processing fingerprint:', req.files.fingerprint[0].originalname);
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
        arrest_location, arrest_reason, arrest_date, arresting_authority, photo_url, fingerprint_url,
        feel_no, baare
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
      fingerprintUrl,
      feelNo || null,
      baare || null
    ];
    
    console.log('Executing query with values:', values);
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Detailed error:', error);
    if (error.message && error.message.includes('Unexpected field')) {
      return res.status(400).json({ 
        error: 'Unexpected field in form data',
        details: error.message
      });
    }
    next(error);
  }
});

// PUT update record
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
    
    // Convert empty date strings to null
    const processedDateOfBirth = dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null;
    const processedArrestDate = arrestDate && arrestDate.trim() !== '' ? arrestDate : null;
    
    let query = '';
    let values = [];
    
    // Check if we have new files
    const hasNewPhoto = req.files && req.files.photo && req.files.photo.length > 0;
    const hasNewFingerprint = req.files && req.files.fingerprint && req.files.fingerprint.length > 0;
    
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
          arresting_authority = $20, feel_no = $21, baare = $22, updated_at = CURRENT_TIMESTAMP
      `;
      
      // Add photo_url if we have a new photo
      if (hasNewPhoto) {
        query += `, photo_url = $23`;
      }
      
      // Add fingerprint_url if we have a new fingerprint
      if (hasNewFingerprint) {
        if (hasNewPhoto) {
          query += `, fingerprint_url = $24`;
        } else {
          query += `, fingerprint_url = $23`;
        }
      }
      
      query += ` WHERE id = $${hasNewPhoto && hasNewFingerprint ? 25 : hasNewPhoto || hasNewFingerprint ? 24 : 23} RETURNING *`;
      
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
        feelNo || null,
        baare || null
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
          arresting_authority = $20, feel_no = $21, baare = $22, updated_at = CURRENT_TIMESTAMP
        WHERE id = $23
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
        feelNo || null,
        baare || null,
        id
      ];
    }
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Detailed error:', error);
    if (error.message && error.message.includes('Unexpected field')) {
      return res.status(400).json({ 
        error: 'Unexpected field in form data',
        details: error.message
      });
    }
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