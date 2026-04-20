const User          = require('../models/User');
const Post          = require('../models/Post');
const QueueMatePost = require('../models/QueueMatePost');
const Tournament    = require('../models/Tournament');
const MatchRequest  = require('../models/MatchRequest');
const ActivityLog   = require('../models/ActivityLog');
const { logActivity } = require('../utils/activityLogger');
const { calcStatus }  = require('../utils/gameConfig');

const getOverview = async (req, res) => {
  try {
    const [users, posts, queuemates, tournaments, matchRequests, recentActivities] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      QueueMatePost.countDocuments(),
      Tournament.countDocuments(),
      MatchRequest.countDocuments(),
      ActivityLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
    ]);
    res.json({ overview: { users, posts, queuemates, tournaments, matchRequests, recentActivities } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const suspendUser = async (req, res) => {
  try {
    const { isSuspended } = req.body;
    if (typeof isSuspended !== 'boolean') return res.status(400).json({ message: 'isSuspended must be boolean.' });
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const action = isSuspended ? 'suspend_user' : 'unsuspend_user';
    await logActivity({ actor: req.user._id, actionType: action, targetType: 'user', targetId: user._id, message: `Admin ${req.user.name} ${isSuspended ? 'suspended' : 'unsuspended'} user ${user.name}.` });
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user._id.toString() === req.user._id.toString()) return res.status(400).json({ message: 'Cannot delete your own admin account.' });

    // Cascade cleanup
    await Promise.all([
      Post.deleteMany({ user: user._id }),
      QueueMatePost.deleteMany({ user: user._id }),
      Tournament.deleteMany({ createdBy: user._id }),
      MatchRequest.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] }),
    ]);

    await logActivity({ actor: req.user._id, actionType: 'admin_delete_user', targetType: 'user', targetId: user._id, message: `Admin ${req.user.name} deleted user ${user.name} and all their content.` });
    await user.deleteOne();
    res.json({ message: 'User and all related content deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAdminPosts = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search)   filter.content = { $regex: search, $options: 'i' };
    const posts = await Post.find(filter).populate('user', 'name email avatarUrl').sort({ createdAt: -1 }).limit(100);
    res.json({ posts });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const adminDeletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'name');
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    await post.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'admin_delete_post', targetType: 'post', targetId: post._id, message: `Admin ${req.user.name} deleted post by ${post.user?.name || 'unknown'}.` });
    res.json({ message: 'Post deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAdminQueuemates = async (req, res) => {
  try {
    const { game, search } = req.query;
    const filter = {};
    if (game)   filter.game = game;
    if (search) filter.note = { $regex: search, $options: 'i' };
    const queuemates = await QueueMatePost.find(filter).populate('user', 'name email avatarUrl').sort({ createdAt: -1 }).limit(100);
    res.json({ queuemates });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const adminDeleteQueuemate = async (req, res) => {
  try {
    const post = await QueueMatePost.findById(req.params.id).populate('user', 'name');
    if (!post) return res.status(404).json({ message: 'QueueMate post not found.' });
    await post.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'admin_delete_queuemate', targetType: 'queuemate', targetId: post._id, message: `Admin ${req.user.name} deleted QueueMate post by ${post.user?.name || 'unknown'}.` });
    res.json({ message: 'QueueMate post deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAdminTournaments = async (req, res) => {
  try {
    const { game, tier, status, search } = req.query;
    const filter = {};
    if (game) filter.game = game;
    if (tier) filter.tier = tier;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { organizerName: { $regex: search, $options: 'i' } },
    ];
    let tournaments = await Tournament.find(filter).populate('createdBy', 'name email avatarUrl').sort({ createdAt: -1 }).limit(100);
    tournaments = tournaments.map(t => { const o = t.toObject(); o.status = calcStatus(t.startDate, t.endDate); return o; });
    if (status) tournaments = tournaments.filter(t => t.status === status);
    res.json({ tournaments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const adminDeleteTournament = async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id).populate('createdBy', 'name');
    if (!t) return res.status(404).json({ message: 'Tournament not found.' });
    await t.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'admin_delete_tournament', targetType: 'tournament', targetId: t._id, message: `Admin ${req.user.name} deleted tournament "${t.title}".` });
    res.json({ message: 'Tournament deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getActivity = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ activity: logs });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getOverview, getUsers, suspendUser, deleteUser,
  getAdminPosts, adminDeletePost,
  getAdminQueuemates, adminDeleteQueuemate,
  getAdminTournaments, adminDeleteTournament,
  getActivity,
};
