const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalRecordsQuery = 'SELECT COUNT(*) FROM records';
    const todayRecordsQuery = `
      SELECT COUNT(*) FROM records 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const pendingRecordsQuery = `
      SELECT COUNT(*) FROM records 
      WHERE ever_arrested = true
    `;
    
    const [totalResult, todayResult, pendingResult] = await Promise.all([
      db.query(totalRecordsQuery),
      db.query(todayRecordsQuery),
      db.query(pendingRecordsQuery)
    ]);
    
    res.json({
      totalRecords: parseInt(totalResult.rows[0].count),
      todayRecords: parseInt(todayResult.rows[0].count),
      pendingRecords: parseInt(pendingResult.rows[0].count),
      completedRecords: parseInt(totalResult.rows[0].count) - parseInt(pendingResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;