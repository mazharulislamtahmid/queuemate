const ActivityLog = require('../models/ActivityLog');

async function logActivity({ actor, actionType, targetType, targetId, message, meta }) {
  try {
    await ActivityLog.create({ actor: actor || null, actionType, targetType, targetId: targetId || null, message, meta: meta || {} });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

module.exports = { logActivity };
