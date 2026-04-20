const User = require('../models/User');
const Friendship = require('../models/Friendship');
const FriendRequest = require('../models/FriendRequest');
const DirectMessage = require('../models/DirectMessage');
const MatchRequest = require('../models/MatchRequest');
const { logActivity } = require('../utils/activityLogger');

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function friendshipIncludesUser(friendship, userId) {
  const id = String(userId);
  return String(friendship.userOne?._id || friendship.userOne) === id || String(friendship.userTwo?._id || friendship.userTwo) === id;
}

function mapFriend(friendship, userId) {
  const id = String(userId);
  const other = String(friendship.userOne?._id || friendship.userOne) === id ? friendship.userTwo : friendship.userOne;
  const lastSeenAt = other?.lastSeenAt || null;
  return {
    _id: friendship._id,
    createdAt: friendship.createdAt,
    friend: other,
    lastSeenAt,
    isActive: !!lastSeenAt && (Date.now() - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS),
  };
}

function mapFriendRequest(request, userId) {
  const obj = request.toObject();
  obj.otherUser = String(obj.sender?._id || obj.sender) === String(userId) ? obj.receiver : obj.sender;
  return obj;
}

async function getMailboxOverview(req, res) {
  try {
    const userId = req.user._id;
    const [
      incomingRequests,
      outgoingRequests,
      incomingFriendRequests,
      outgoingFriendRequests,
      friendships,
    ] = await Promise.all([
      MatchRequest.find({ receiver: userId })
        .populate('sender', 'name avatarUrl coverPhotoUrl')
        .populate('receiver', 'name avatarUrl coverPhotoUrl')
        .populate('queuematePost', 'game rank playType note')
        .sort({ createdAt: -1 })
        .limit(20),
      MatchRequest.find({ sender: userId })
        .populate('sender', 'name avatarUrl coverPhotoUrl')
        .populate('receiver', 'name avatarUrl coverPhotoUrl')
        .populate('queuematePost', 'game rank playType note')
        .sort({ createdAt: -1 })
        .limit(20),
      FriendRequest.find({ receiver: userId, status: 'pending' })
        .populate('sender', 'name avatarUrl coverPhotoUrl')
        .populate('receiver', 'name avatarUrl coverPhotoUrl')
        .sort({ createdAt: -1 })
        .limit(20),
      FriendRequest.find({ sender: userId, status: 'pending' })
        .populate('sender', 'name avatarUrl coverPhotoUrl')
        .populate('receiver', 'name avatarUrl coverPhotoUrl')
        .sort({ createdAt: -1 })
        .limit(20),
      Friendship.find({ $or: [{ userOne: userId }, { userTwo: userId }] })
        .populate('userOne', 'name avatarUrl coverPhotoUrl lastSeenAt')
        .populate('userTwo', 'name avatarUrl coverPhotoUrl lastSeenAt')
        .sort({ createdAt: -1 }),
    ]);

    const friendshipMap = new Map();
    friendships.forEach(f => {
      const a = String(f.userOne?._id || f.userOne);
      const b = String(f.userTwo?._id || f.userTwo);
      friendshipMap.set(Friendship.buildPairKey(a, b), String(f._id));
    });

    const allMessages = friendships.length
      ? await DirectMessage.find({ friendship: { $in: friendships.map(f => f._id) } })
        .populate('sender', 'name avatarUrl')
        .sort({ createdAt: -1 })
      : [];

    const latestByFriendship = new Map();
    const unreadByFriendship = new Map();
    allMessages.forEach(msg => {
      const fid = String(msg.friendship);
      if (!latestByFriendship.has(fid)) latestByFriendship.set(fid, msg);
      const isUnread = String(msg.sender?._id || msg.sender) !== String(userId)
        && !(msg.readBy || []).some(id => String(id) === String(userId));
      if (isUnread) unreadByFriendship.set(fid, (unreadByFriendship.get(fid) || 0) + 1);
    });

    const conversations = friendships.map(friendship => {
      const fid = String(friendship._id);
      const friend = mapFriend(friendship, userId).friend;
      return {
        friendshipId: friendship._id,
        friend,
        latestMessage: latestByFriendship.get(fid) || null,
        unreadCount: unreadByFriendship.get(fid) || 0,
      };
    });

    const attachFriendshipId = request => {
      const counterpart = String(request.sender?._id || request.sender) === String(userId) ? request.receiver : request.sender;
      const friendshipId = counterpart
        ? friendshipMap.get(Friendship.buildPairKey(userId, counterpart._id || counterpart)) || ''
        : '';
      const obj = request.toObject();
      obj.friendshipId = friendshipId;
      return obj;
    };

    const friends = friendships
      .map(f => mapFriend(f, userId))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.lastSeenAt || b.createdAt || 0) - new Date(a.lastSeenAt || a.createdAt || 0);
      });

    const pendingMatchRequestCount = incomingRequests.filter(r => r.status === 'pending').length;
    const pendingFriendRequestCount = incomingFriendRequests.length;

    res.json({
      incomingRequests: incomingRequests.map(attachFriendshipId),
      outgoingRequests: outgoingRequests.map(attachFriendshipId),
      incomingFriendRequests: incomingFriendRequests.map(request => mapFriendRequest(request, userId)),
      outgoingFriendRequests: outgoingFriendRequests.map(request => mapFriendRequest(request, userId)),
      friends,
      conversations,
      pendingMatchRequestCount,
      pendingFriendRequestCount,
      pendingCount: pendingMatchRequestCount + pendingFriendRequestCount,
      unreadCount: [...unreadByFriendship.values()].reduce((sum, count) => sum + count, 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function sendFriendRequest(req, res) {
  try {
    const receiver = await User.findById(req.params.userId).select('name avatarUrl coverPhotoUrl');
    if (!receiver) return res.status(404).json({ message: 'User not found.' });
    if (String(receiver._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    const pairKey = Friendship.buildPairKey(req.user._id, receiver._id);
    const friendship = await Friendship.findOne({ pairKey });
    if (friendship) return res.status(409).json({ message: 'You are already friends with this player.' });

    let request = await FriendRequest.findOne({ pairKey });
    if (request?.status === 'pending') {
      const isOutgoing = String(request.sender) === String(req.user._id);
      return res.status(409).json({
        message: isOutgoing
          ? 'Friend request already sent.'
          : 'This player already sent you a friend request.',
      });
    }

    if (request?.status === 'accepted') {
      return res.status(409).json({ message: 'You are already friends with this player.' });
    }

    if (request) {
      request.sender = req.user._id;
      request.receiver = receiver._id;
      request.status = 'pending';
      await request.save();
    } else {
      request = await FriendRequest.create({
        sender: req.user._id,
        receiver: receiver._id,
      });
    }

    await request.populate('sender', 'name avatarUrl coverPhotoUrl');
    await request.populate('receiver', 'name avatarUrl coverPhotoUrl');

    await logActivity({
      actor: req.user._id,
      actionType: 'send_friend_request',
      targetType: 'user',
      targetId: receiver._id,
      message: `${req.user.name} sent a friend request.`,
    });

    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function respondToFriendRequest(req, res) {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected.' });
    }

    const request = await FriendRequest.findById(req.params.requestId)
      .populate('sender', 'name avatarUrl coverPhotoUrl')
      .populate('receiver', 'name avatarUrl coverPhotoUrl');
    if (!request) return res.status(404).json({ message: 'Friend request not found.' });
    if (String(request.receiver?._id || request.receiver) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This friend request has already been handled.' });
    }

    request.status = status;
    await request.save();

    let friendship = null;
    if (status === 'accepted') {
      const pairKey = Friendship.buildPairKey(request.sender?._id || request.sender, request.receiver?._id || request.receiver);
      friendship = await Friendship.findOne({ pairKey });
      if (!friendship) {
        friendship = await Friendship.create({
          userOne: request.sender?._id || request.sender,
          userTwo: request.receiver?._id || request.receiver,
          createdBy: req.user._id,
        });
      }
      await logActivity({
        actor: req.user._id,
        actionType: 'accept_friend_request',
        targetType: 'user',
        targetId: request.sender?._id || request.sender,
        message: `${req.user.name} accepted a friend request.`,
      });
    } else {
      await logActivity({
        actor: req.user._id,
        actionType: 'reject_friend_request',
        targetType: 'user',
        targetId: request.sender?._id || request.sender,
        message: `${req.user.name} rejected a friend request.`,
      });
    }

    res.json({ request, friendshipId: friendship?._id || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getConversationMessages(req, res) {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Conversation not found.' });
    if (!friendshipIncludesUser(friendship, req.user._id)) return res.status(403).json({ message: 'Not authorized.' });

    await DirectMessage.updateMany(
      { friendship: friendship._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    const messages = await DirectMessage.find({ friendship: friendship._id })
      .populate('sender', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function sendConversationMessage(req, res) {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId)
      .populate('userOne', 'name avatarUrl coverPhotoUrl')
      .populate('userTwo', 'name avatarUrl coverPhotoUrl');
    if (!friendship) return res.status(404).json({ message: 'Conversation not found.' });
    if (!friendshipIncludesUser(friendship, req.user._id)) return res.status(403).json({ message: 'Not authorized.' });

    const text = req.body?.text?.trim();
    if (!text) return res.status(400).json({ message: 'Message text is required.' });
    if (text.length > 1000) return res.status(400).json({ message: 'Message max 1000 characters.' });

    const message = await DirectMessage.create({
      friendship: friendship._id,
      sender: req.user._id,
      text,
      readBy: [req.user._id],
    });
    await message.populate('sender', 'name avatarUrl');

    await logActivity({
      actor: req.user._id,
      actionType: 'send_message',
      targetType: 'friendship',
      targetId: friendship._id,
      message: `${req.user.name} sent a direct message.`,
    });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getMailboxOverview,
  sendFriendRequest,
  respondToFriendRequest,
  getConversationMessages,
  sendConversationMessage,
};
