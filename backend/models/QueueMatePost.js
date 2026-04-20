const mongoose = require('mongoose');
const { queuemateExpiryDate } = require('../utils/dateUtils');

const queuemateSchema = new mongoose.Schema({
  user:                { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  game:                { type: String, enum: ['valorant','pubgm','ff','mlbb'], required: true },
  rank:                { type: String, required: true },
  playType:            { type: String, enum: ['Casual','Rank Push'], required: true },
  playingTime:         { type: String, required: true },
  languages:           { type: [String], validate: v => v.length <= 3, default: [] },
  teammateRequirement: { type: String, required: true },
  note:                { type: String, required: true, maxlength: 500 },
  expiresAt:           { type: Date },
  isActive:            { type: Boolean, default: true },
}, { timestamps: true });

queuemateSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = queuemateExpiryDate(this.createdAt || new Date());
  }
  next();
});

queuemateSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

module.exports = mongoose.model('QueueMatePost', queuemateSchema);
