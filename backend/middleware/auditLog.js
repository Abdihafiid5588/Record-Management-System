// middleware/auditLog.js
const { query } = require('../db/db');

function auditLog(action, getDetails) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || null;
      const targetId = req.params.id || null;
      const details = getDetails ? getDetails(req) : null;

      await query(
        `INSERT INTO audit_log (user_id, target_user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, targetId, action, details ? JSON.stringify(details) : null]
      );

      next();
    } catch (error) {
      console.error('Audit log error:', error);
      next(); // Don’t block request
    }
  };
}

module.exports = auditLog;
