const express = require('express');
const { query } = require('../db/db');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, first_name, last_name, avatar_url, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, isAdmin } = req.body;

    // Check if username or email already exists (excluding current user)
    const checkExists = await query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, id]
    );

    if (checkExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const result = await query(
      'UPDATE users SET username = $1, email = $2, is_admin = $3 WHERE id = $4 RETURNING id, username, email, is_admin',
      [username, email, isAdmin, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all audit logs (admin only)
router.get('/audit-logs', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action } = req.query;
    const offset = (page - 1) * limit;
    
    let sqlQuery = `
      SELECT 
        al.*,
        u.username as user_username,
        u.email as user_email
      FROM audit_log al
      LEFT JOIN users u ON al.target_user_id = u.id
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) 
      FROM audit_log al
      LEFT JOIN users u ON al.target_user_id = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    // Add filters if provided
    if (user_id) {
      paramCount++;
      sqlQuery += ` AND al.target_user_id = $${paramCount}`;
      countQuery += ` AND al.target_user_id = $${paramCount}`;
      values.push(user_id);
    }

    if (action) {
      paramCount++;
      sqlQuery += ` AND al.action ILIKE $${paramCount}`;
      countQuery += ` AND al.action ILIKE $${paramCount}`;
      values.push(`%${action}%`);
    }

    // Add ordering and pagination
    sqlQuery += `
      ORDER BY al.created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    const result = await query(sqlQuery, [...values, limit, offset]);
    const countResult = await query(countQuery, values);
    
    res.json({
      logs: result.rows,
      totalLogs: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit log statistics (admin only)
router.get('/audit-stats', adminAuth, async (req, res) => {
  try {
    // Most active users
    const activeUsersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(al.id) as action_count
      FROM audit_log al
      JOIN users u ON al.target_user_id = u.id
      GROUP BY u.id, u.username, u.email
      ORDER BY action_count DESC
      LIMIT 10
    `;

    // Most common actions
    const commonActionsQuery = `
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_log
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;

    // Recent activity timeline
    const timelineQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as actions_count
      FROM audit_log
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const [activeUsersResult, commonActionsResult, timelineResult] = await Promise.all([
      query(activeUsersQuery),
      query(commonActionsQuery),
      query(timelineQuery)
    ]);

    res.json({
      activeUsers: activeUsersResult.rows,
      commonActions: commonActionsResult.rows,
      timeline: timelineResult.rows
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin stats endpoint
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Get total users count
    const usersResult = await query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);
    
    // Get total records count
    const recordsResult = await query('SELECT COUNT(*) FROM records');
    const totalRecords = parseInt(recordsResult.rows[0].count);
    
    // Get today's records count
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await query(
      'SELECT COUNT(*) FROM records WHERE DATE(created_at) = $1',
      [today]
    );
    const todayRecords = parseInt(todayResult.rows[0].count);
    
    res.json({
      totalUsers,
      totalRecords,
      todayRecords,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;