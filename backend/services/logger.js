const AuditLog = require('../models/AuditLog');
const mockDb = require('../config/mockDb');

const logAction = async (userId, email, action, details = '', req = null) => {
  try {
    const logData = {
      userId: userId || null,
      email: email || '',
      action,
      details,
      ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : '',
      userAgent: req ? (req.headers['user-agent'] || '') : ''
    };

    if (mockDb.isMockActive()) {
      await mockDb.create('auditlogs', logData);
    } else {
      await AuditLog.create(logData);
    }
    
    console.log(`📝 [AUDIT LOG] Action: ${action} | Details: ${details}`);
  } catch (error) {
    console.error('❌ Failed to save audit log:', error.message);
  }
};

module.exports = {
  logAction
};
