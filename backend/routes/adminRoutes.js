const router = require('express').Router();
const { getOverview, getUsers, suspendUser, deleteUser, getAdminPosts, adminDeletePost, getAdminQueuemates, adminDeleteQueuemate, getAdminTournaments, adminDeleteTournament, getActivity } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const guard = [protect, adminOnly];

router.get('/overview',              ...guard, getOverview);
router.get('/users',                 ...guard, getUsers);
router.put('/users/:id/suspend',     ...guard, suspendUser);
router.delete('/users/:id',          ...guard, deleteUser);
router.get('/posts',                 ...guard, getAdminPosts);
router.delete('/posts/:id',          ...guard, adminDeletePost);
router.get('/queuemates',            ...guard, getAdminQueuemates);
router.delete('/queuemates/:id',     ...guard, adminDeleteQueuemate);
router.get('/tournaments',           ...guard, getAdminTournaments);
router.delete('/tournaments/:id',    ...guard, adminDeleteTournament);
router.get('/activity',              ...guard, getActivity);

module.exports = router;
