const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actionType: { type: String, required: true },
  targetType: { type: String, default: '' },
  targetId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  message:    { type: String, required: true },
  meta:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
