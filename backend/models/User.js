const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true, minlength: 6 },
  avatarUrl:     { type: String, default: '' },
  coverPhotoUrl: { type: String, default: '' },
  bio:           { type: String, default: '', maxlength: 300 },
  favoriteGames: [{ type: String, enum: ['valorant','pubgm','ff','mlbb'] }],
  achievements:  [{ type: mongoose.Schema.Types.Mixed }],
  socialLinks:   [{ type: String }],
  role:          { type: String, enum: ['user','admin'], default: 'user' },
  isSuspended:   { type: Boolean, default: false },
  lastSeenAt:    { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
