const QueueMatePost = require('../models/QueueMatePost');
const MatchRequest  = require('../models/MatchRequest');
const Friendship = require('../models/Friendship');
const { logActivity } = require('../utils/activityLogger');
const { validateGame, validateRank, validateTeammateRequirement, validateLanguages, validateNoteLength } = require('../utils/validators');

const getQueuemates = async (req, res) => {
  try {
    const { game, playType, teammateRequirement, search, userId, limit } = req.query;
    const filter = { isActive: true, expiresAt: { $gt: new Date() } };
    if (game)                filter.game = game;
    if (playType)            filter.playType = playType;
    if (teammateRequirement) filter.teammateRequirement = teammateRequirement;
    if (userId)              filter.user = userId;
    if (search)              filter.note = { $regex: search, $options: 'i' };

    const queuemates = await QueueMatePost.find(filter)
      .populate('user', 'name avatarUrl coverPhotoUrl')
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit) : 50);

    res.json({ queuemates });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createQueuemate = async (req, res) => {
  try {
    const { game, rank, playType, playingTime, languages, teammateRequirement, note } = req.body;

    if (!game || !validateGame(game))                                  return res.status(400).json({ message: 'Invalid or missing game.' });
    if (!rank || !validateRank(game, rank))                            return res.status(400).json({ message: `Invalid rank for ${game}.` });
    if (!['Casual','Rank Push'].includes(playType))                    return res.status(400).json({ message: 'Invalid play type.' });
    if (!playingTime)                                                  return res.status(400).json({ message: 'Playing time is required.' });
    if (!teammateRequirement || !validateTeammateRequirement(game, teammateRequirement)) return res.status(400).json({ message: `Invalid teammate requirement for ${game}.` });
    if (languages && !validateLanguages(languages))                    return res.status(400).json({ message: 'Max 3 languages allowed.' });
    if (!note || !validateNoteLength(note))                            return res.status(400).json({ message: 'Note is required and must be ≤ 500 characters.' });

    const existingActivePost = await QueueMatePost.findOne({
      user: req.user._id,
      game,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingActivePost) {
      return res.status(409).json({
        message: 'You already have an active QueueMate post for this game. Delete your previous post or wait for it to expire first.',
        existingPostId: existingActivePost._id,
      });
    }

    const post = await QueueMatePost.create({
      user: req.user._id, game, rank, playType, playingTime,
      languages: languages || [], teammateRequirement, note: note.trim(),
    });
    await post.populate('user', 'name avatarUrl coverPhotoUrl');
    await logActivity({ actor: req.user._id, actionType: 'create_queuemate', targetType: 'queuemate', targetId: post._id, message: `${req.user.name} created a QueueMate post for ${game}.` });
    res.status(201).json({ queuemate: post });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteQueuemate = async (req, res) => {
  try {
    const post = await QueueMatePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'QueueMate post not found.' });
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await post.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'delete_queuemate', targetType: 'queuemate', targetId: post._id, message: `${req.user.name} deleted a QueueMate post.` });
    res.json({ message: 'QueueMate post deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const sendMatchRequest = async (req, res) => {
  try {
    const { introMessage } = req.body;
    const post = await QueueMatePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'QueueMate post not found.' });
    if (post.user.toString() === req.user._id.toString()) return res.status(400).json({ message: 'Cannot request your own post.' });
    if (new Date() > post.expiresAt) return res.status(400).json({ message: 'This QueueMate post has expired.' });

    const existing = await MatchRequest.findOne({ sender: req.user._id, queuematePost: post._id, status: 'pending' });
    if (existing) return res.status(409).json({ message: 'You already sent a pending request for this post.' });

    const request = await MatchRequest.create({
      sender: req.user._id, receiver: post.user, queuematePost: post._id,
      introMessage: introMessage?.trim() || '',
    });
    await logActivity({ actor: req.user._id, actionType: 'send_match_request', targetType: 'queuemate', targetId: post._id, message: `${req.user.name} sent a matchup request.` });
    res.status(201).json({ request });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await MatchRequest.find({ receiver: req.user._id })
      .populate('sender', 'name avatarUrl coverPhotoUrl')
      .populate('queuematePost', 'game rank playType note')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getOutgoingRequests = async (req, res) => {
  try {
    const requests = await MatchRequest.find({ sender: req.user._id })
      .populate('receiver', 'name avatarUrl coverPhotoUrl')
      .populate('queuematePost', 'game rank playType note')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const respondToRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted','rejected'].includes(status)) return res.status(400).json({ message: 'Status must be accepted or rejected.' });

    const request = await MatchRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.receiver.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized.' });

    request.status = status;
    await request.save();
    let friendship = null;
    if (status === 'accepted') {
      const pairKey = Friendship.buildPairKey(request.sender, request.receiver);
      friendship = await Friendship.findOne({ pairKey });
      if (!friendship) {
        friendship = await Friendship.create({
          userOne: request.sender,
          userTwo: request.receiver,
          createdBy: req.user._id,
        });
      }
      await logActivity({
        actor: req.user._id,
        actionType: 'accept_match_request',
        targetType: 'queuemate',
        targetId: request.queuematePost,
        message: `${req.user.name} accepted a matchup request.`,
      });
    }
    if (status === 'rejected') {
      await logActivity({
        actor: req.user._id,
        actionType: 'reject_match_request',
        targetType: 'queuemate',
        targetId: request.queuematePost,
        message: `${req.user.name} rejected a matchup request.`,
      });
    }
    res.json({ request, friendshipId: friendship?._id || '' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getQueuemates, createQueuemate, deleteQueuemate, sendMatchRequest, getIncomingRequests, getOutgoingRequests, respondToRequest };
