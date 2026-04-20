const mongoose = require('mongoose');

function buildPairKey(userOne, userTwo) {
  return [String(userOne), String(userTwo)].sort().join(':');
}

const friendRequestSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pairKey:  { type: String, required: true, unique: true, index: true },
  status:   { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

friendRequestSchema.pre('validate', function(next) {
  if (this.sender && this.receiver) this.pairKey = buildPairKey(this.sender, this.receiver);
  next();
});

friendRequestSchema.statics.buildPairKey = buildPairKey;

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
