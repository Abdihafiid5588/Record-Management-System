const express = require('express');
const multer = require('multer');
const path = require('path');
const { query } = require('../db/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ------------------ GET user profile ------------------ //
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, first_name, last_name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------ UPDATE user profile ------------------ //
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { firstName, lastName, username, email } = req.body;

    // Fetch old data for audit log
    const oldUserResult = await query(
      'SELECT id, username, email, first_name, last_name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    if (oldUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldUser = oldUserResult.rows[0];

    let avatarUrl = oldUser.avatar_url;
    let queryText, values;

    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
      queryText = `
        UPDATE users 
        SET first_name = $1, last_name = $2, username = $3, email = $4, avatar_url = $5
        WHERE id = $6
        RETURNING id, username, email, first_name, last_name, avatar_url
      `;
      values = [firstName, lastName, username, email, avatarUrl, req.user.id];
    } else {
      queryText = `
        UPDATE users 
        SET first_name = $1, last_name = $2, username = $3, email = $4
        WHERE id = $5
        RETURNING id, username, email, first_name, last_name, avatar_url
      `;
      values = [firstName, lastName, username, email, req.user.id];
    }

    // Prevent duplicate username/email
    const checkExists = await query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.id]
    );

    if (checkExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const result = await query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUser = result.rows[0];

    // Insert into audit log (before/after)
    await query(
      `INSERT INTO audit_log (user_id, target_user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        req.user.id,
        req.user.id,
        'update_profile',
        JSON.stringify({ before: oldUser, after: newUser })
      ]
    );

    res.json({
      message: 'Profile updated successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
