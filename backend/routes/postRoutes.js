const express = require('express');
const router = express.Router();
const { getPosts, createPost, toggleLike, addComment, updatePost, deletePost, reportPost } = require('../controllers/postController');
const { protect, blockSuspended } = require('../middleware/authMiddleware');

function parseMultipartTextFields(rawBody, contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match?.[1] || match?.[2];
  if (!boundary) throw new Error('Missing multipart boundary');

  const body = {};
  const parts = String(rawBody).split(`--${boundary}`);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === '--') continue;

    const [rawHeaders, ...valueParts] = trimmed.split('\r\n\r\n');
    if (!rawHeaders || !valueParts.length) continue;

    const nameMatch = rawHeaders.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    const value = valueParts.join('\r\n\r\n').replace(/\r\n$/, '');
    body[fieldName] = value;
  }

  return body;
}

const multipartTextParser = [
  express.text({ type: 'multipart/form-data', limit: '12mb' }),
  (req, res, next) => {
    if (!req.is('multipart/form-data')) return next();
    try {
      req.body = parseMultipartTextFields(req.body, req.headers['content-type']);
      next();
    } catch (err) {
      res.status(400).json({ message: 'Invalid form payload.' });
    }
  },
];

// Optional auth for GET (to detect likedByMe)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt  = require('jsonwebtoken');
      const User = require('../models/User');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) {}
  next();
};

router.get('/',                       optionalAuth, getPosts);
router.post('/',                      protect, blockSuspended, ...multipartTextParser, createPost);
router.put('/:id/like',               protect, blockSuspended, toggleLike);
router.post('/:id/comments',          protect, blockSuspended, addComment);
router.put('/:id',                    protect, blockSuspended, updatePost);
router.delete('/:id',                 protect, deletePost);
router.post('/:id/report',            protect, blockSuspended, reportPost);

module.exports = router;
