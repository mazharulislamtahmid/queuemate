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
  imageAspect: {
    type: String,
    default: '',
    validate: {
      validator: value => {
        if (!value) return true;
        if (!/^\d{1,5}:\d{1,5}$/.test(value)) return false;
        const [width, height] = value.split(':').map(Number);
        return width > 0 && height > 0;
      },
      message: 'Invalid image aspect.',
    },
  },
  category: { type: String, enum: ['news','result','recruitment'], required: true },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
