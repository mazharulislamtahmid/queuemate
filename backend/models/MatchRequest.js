const mongoose = require('mongoose');

const matchRequestSchema = new mongoose.Schema({
  sender:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  queuematePost: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueMatePost', required: true },
  introMessage:  { type: String, default: '', maxlength: 300 },
  status:        { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('MatchRequest', matchRequestSchema);
