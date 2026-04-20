const Post = require('../models/Post');
const { logActivity } = require('../utils/activityLogger');
const { validateUrl, validateContentLength } = require('../utils/validators');

const getPosts = async (req, res) => {
  try {
    const { category, search, userId, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (userId)   filter.user = userId;
    if (search)   filter.content = { $regex: search, $options: 'i' };

    const posts = await Post.find(filter)
      .populate('user', 'name avatarUrl coverPhotoUrl')
      .populate('comments.user', 'name avatarUrl coverPhotoUrl')
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit) : 50);

    const currentUserId = req.user?._id?.toString();
    const result = posts.map(p => {
      const obj = p.toObject();
      obj.likedByMe = currentUserId ? p.likes.some(id => id.toString() === currentUserId) : false;
      obj.likesCount = p.likes.length;
      return obj;
    });

    res.json({ posts: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createPost = async (req, res) => {
  try {
    const { content, imageUrl, category } = req.body;
    if (!validateContentLength(content)) return res.status(400).json({ message: 'Content is required and must be ≤ 2000 characters.' });
    if (!['news','result','recruitment'].includes(category)) return res.status(400).json({ message: 'Invalid category.' });
    if (imageUrl && !validateUrl(imageUrl)) return res.status(400).json({ message: 'Invalid image URL.' });

    const post = await Post.create({ user: req.user._id, content: content.trim(), imageUrl: imageUrl || '', category });
    await post.populate('user', 'name avatarUrl coverPhotoUrl');
    await logActivity({ actor: req.user._id, actionType: 'create_post', targetType: 'post', targetId: post._id, message: `${req.user.name} created a post.` });
    res.status(201).json({ post });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const userId = req.user._id;
    const liked  = post.likes.some(id => id.toString() === userId.toString());
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ message: 'Comment text is required.' });
    if (text.length > 500) return res.status(400).json({ message: 'Comment max 500 characters.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();
    await post.populate('comments.user', 'name avatarUrl coverPhotoUrl');

    const comment = post.comments[post.comments.length - 1];
    res.status(201).json({ comment });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (post.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized.' });

    const { content, imageUrl, category } = req.body;
    if (content) {
      if (!validateContentLength(content)) return res.status(400).json({ message: 'Content must be ≤ 2000 characters.' });
      post.content = content.trim();
    }
    if (category) {
      if (!['news','result','recruitment'].includes(category)) return res.status(400).json({ message: 'Invalid category.' });
      post.category = category;
    }
    if (imageUrl !== undefined) {
      if (imageUrl && !validateUrl(imageUrl)) return res.status(400).json({ message: 'Invalid image URL.' });
      post.imageUrl = imageUrl;
    }
    await post.save();
    await post.populate('user', 'name avatarUrl coverPhotoUrl');
    await logActivity({ actor: req.user._id, actionType: 'update_post', targetType: 'post', targetId: post._id, message: `${req.user.name} updated a post.` });
    res.json({ post });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await post.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'delete_post', targetType: 'post', targetId: post._id, message: `${req.user.name} deleted a post.` });
    res.json({ message: 'Post deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reportPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'name');
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (post.user?._id?.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own post.' });
    }

    await logActivity({
      actor: req.user._id,
      actionType: 'report_post',
      targetType: 'post',
      targetId: post._id,
      message: `${req.user.name} reported a post by ${post.user?.name || 'Unknown user'}.`,
      meta: {
        reportedPostId: post._id.toString(),
        reportedUserId: post.user?._id?.toString() || '',
        preview: (post.content || '').slice(0, 180),
      },
    });

    res.json({ message: 'Post reported to admin.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getPosts, createPost, toggleLike, addComment, updatePost, deletePost, reportPost };
