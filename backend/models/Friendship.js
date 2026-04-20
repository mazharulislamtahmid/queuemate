const mongoose = require('mongoose');

function buildPairKey(userOne, userTwo) {
  return [String(userOne), String(userTwo)].sort().join(':');
}

const friendshipSchema = new mongoose.Schema({
  userOne:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userTwo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pairKey:   { type: String, required: true, unique: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

friendshipSchema.pre('validate', function(next) {
  if (this.userOne && this.userTwo) this.pairKey = buildPairKey(this.userOne, this.userTwo);
  next();
});

friendshipSchema.statics.buildPairKey = buildPairKey;

module.exports = mongoose.model('Friendship', friendshipSchema);
