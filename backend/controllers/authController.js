const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const { validateEmail, validatePassword } = require('../utils/validators');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (!validateEmail(email))         return res.status(400).json({ message: 'Invalid email address.' });
    if (!validatePassword(password))   return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create({ name: name.trim(), email, password });
    const token = signToken(user._id);
    await logActivity({ actor: user._id, actionType: 'register', targetType: 'user', targetId: user._id, message: `${user.name} registered.` });
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
    if (user.isSuspended) return res.status(403).json({ message: 'Your account has been suspended.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

    user.lastSeenAt = new Date();
    await user.save();

    const token = signToken(user._id);
    await logActivity({ actor: user._id, actionType: 'login', targetType: 'user', targetId: user._id, message: `${user.name} logged in.` });
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

module.exports = { register, login, getMe };
