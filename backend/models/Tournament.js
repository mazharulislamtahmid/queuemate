const mongoose = require('mongoose');
const { calcTier } = require('../utils/gameConfig');

const tournamentSchema = new mongoose.Schema({
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, required: true, trim: true },
  game:             { type: String, enum: ['valorant','pubgm','ff','mlbb'], required: true },
  prizePool:        { type: Number, required: true, min: 0 },
  tier:             { type: String, enum: ['C','B','A','S'] },
  posterUrl:        { type: String, default: '' },
  description:      { type: String, default: '' },
  organizerName:    { type: String, required: true, trim: true },
  registrationLink: { type: String, default: '' },
  socialLink:       { type: String, default: '' },
  startDate:        { type: Date, required: true },
  endDate:          { type: Date, required: true },
  resultImageUrl:   { type: String, default: '' },
  resultText:       { type: String, default: '' },
}, { timestamps: true });

tournamentSchema.pre('save', function(next) {
  this.tier = calcTier(this.prizePool);
  next();
});

tournamentSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startDate) return 'upcoming';
  if (now <= this.endDate)  return 'ongoing';
  return 'over';
});

tournamentSchema.set('toJSON', { virtuals: true });
tournamentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
