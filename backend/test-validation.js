const express = require('express');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import validation middleware
const { validateRecord } = require('./middleware/validation');

const app = express();

// Simple multer configuration for testing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const uploadHandler = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'fingerprint', maxCount: 1 }
]);

// Test route
app.post('/test-validation', uploadHandler, validateRecord, (req, res) => {
  console.log('Validation passed!');
  res.json({ message: 'Validation successful', body: req.body });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test with: curl -X POST http://localhost:5001/test-validation -F "fullName=John Doe" -F "mothersName=Jane Doe"');
});
