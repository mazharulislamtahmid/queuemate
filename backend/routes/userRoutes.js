const router = require('express').Router();
const { getProfile, getPublicProfile, updateProfile, getMyPosts, getMyQueuemates, getMyTournaments, getMyActivity } = require('../controllers/userController');
const { protect, blockSuspended } = require('../middleware/authMiddleware');

router.get('/profile',         protect, getProfile);
router.put('/profile',         protect, blockSuspended, updateProfile);
router.get('/me/posts',        protect, getMyPosts);
router.get('/me/queuemates',   protect, getMyQueuemates);
router.get('/me/tournaments',  protect, getMyTournaments);
router.get('/me/activity',     protect, getMyActivity);
router.get('/:id',             getPublicProfile);

module.exports = router;
