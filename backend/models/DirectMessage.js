const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  friendship: { type: mongoose.Schema.Types.ObjectId, ref: 'Friendship', required: true, index: true },
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:       { type: String, required: true, maxlength: 1000 },
  readBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
