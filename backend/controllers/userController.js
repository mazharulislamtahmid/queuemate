const User         = require('../models/User');
const Post         = require('../models/Post');
const QueueMatePost = require('../models/QueueMatePost');
const Tournament   = require('../models/Tournament');
const ActivityLog  = require('../models/ActivityLog');
const { logActivity } = require('../utils/activityLogger');
const { validateUrl, validateSocialLinks } = require('../utils/validators');

function normalizeAchievementsInput(achievements) {
  if (!Array.isArray(achievements)) return [];
  return achievements.map(item => {
    if (typeof item === 'string') {
      return { title: item.trim(), imageUrl: '' };
    }
    if (!item || typeof item !== 'object') return null;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    return { title, imageUrl };
  }).filter(item => item && (item.title || item.imageUrl));
}

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const { avatarUrl, coverPhotoUrl, bio, favoriteGames, achievements, socialLinks } = req.body;
    const normalizedAchievements = normalizeAchievementsInput(achievements);
    if (avatarUrl && !validateUrl(avatarUrl)) return res.status(400).json({ message: 'Invalid avatar URL.' });
    if (coverPhotoUrl && !validateUrl(coverPhotoUrl)) return res.status(400).json({ message: 'Invalid cover photo URL.' });
    if (socialLinks && !validateSocialLinks(socialLinks)) return res.status(400).json({ message: 'Max 10 social links.' });
    if (bio && bio.length > 300) return res.status(400).json({ message: 'Bio max 300 characters.' });
    if (normalizedAchievements.length > 12) return res.status(400).json({ message: 'Max 12 achievements.' });
    if (normalizedAchievements.some(item => item.title.length > 120)) {
      return res.status(400).json({ message: 'Achievement text must be 120 characters or less.' });
    }
    if (normalizedAchievements.some(item => item.imageUrl && !validateUrl(item.imageUrl))) {
      return res.status(400).json({ message: 'One or more achievement images are invalid.' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl, coverPhotoUrl, bio, favoriteGames, achievements: normalizedAchievements, socialLinks } },
      { new: true, runValidators: true }
    ).select('-password');

    await logActivity({ actor: req.user._id, actionType: 'update_profile', targetType: 'user', targetId: req.user._id, message: `${req.user.name} updated their profile.` });
    res.json({ user: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate('user', 'name avatarUrl coverPhotoUrl')
      .sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyQueuemates = async (req, res) => {
  try {
    const queuemates = await QueueMatePost.find({ user: req.user._id })
      .populate('user', 'name avatarUrl coverPhotoUrl')
      .sort({ createdAt: -1 });
    res.json({ queuemates });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ createdBy: req.user._id })
      .populate('createdBy', 'name avatarUrl coverPhotoUrl')
      .sort({ createdAt: -1 });
    res.json({ tournaments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyActivity = async (req, res) => {
  try {
    const activity = await ActivityLog.find({ actor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actor', 'name avatarUrl');
    res.json({ activity });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getProfile, getPublicProfile, updateProfile, getMyPosts, getMyQueuemates, getMyTournaments, getMyActivity };
