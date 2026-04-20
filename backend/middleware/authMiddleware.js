const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized. Token required.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found.' });
    const now = Date.now();
    if (!user.lastSeenAt || now - new Date(user.lastSeenAt).getTime() > 60000) {
      user.lastSeenAt = new Date(now);
      await user.save();
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const blockSuspended = (req, res, next) => {
  if (req.user && req.user.isSuspended) {
    return res.status(403).json({ message: 'Your account has been suspended.' });
  }
  next();
};

module.exports = { protect, blockSuspended };
