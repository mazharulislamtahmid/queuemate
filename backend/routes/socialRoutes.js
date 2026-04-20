const router = require('express').Router();
const { protect, blockSuspended } = require('../middleware/authMiddleware');
const {
  getMailboxOverview,
  sendFriendRequest,
  respondToFriendRequest,
  getConversationMessages,
  sendConversationMessage,
} = require('../controllers/socialController');

router.get('/overview', protect, getMailboxOverview);
router.post('/requests/:userId', protect, blockSuspended, sendFriendRequest);
router.put('/requests/:requestId/respond', protect, blockSuspended, respondToFriendRequest);
router.get('/conversations/:friendshipId/messages', protect, getConversationMessages);
router.post('/conversations/:friendshipId/messages', protect, blockSuspended, sendConversationMessage);

module.exports = router;
