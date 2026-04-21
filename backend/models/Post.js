const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true, maxlength: 2000 },
  imageUrl: { type: String, default: '' },
  imageAspect: { type: String, enum: ['', '1:1', '3:4', '4:3'], default: '' },
  category: { type: String, enum: ['news','result','recruitment'], required: true },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
