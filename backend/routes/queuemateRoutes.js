const router = require('express').Router();
const { getQueuemates, createQueuemate, deleteQueuemate, sendMatchRequest, getIncomingRequests, getOutgoingRequests, respondToRequest } = require('../controllers/queuemateController');
const { protect, blockSuspended } = require('../middleware/authMiddleware');

router.get('/',                         getQueuemates);
router.post('/',                        protect, blockSuspended, createQueuemate);
router.delete('/:id',                   protect, deleteQueuemate);
router.post('/:id/request',             protect, blockSuspended, sendMatchRequest);
router.get('/requests/incoming',        protect, getIncomingRequests);
router.get('/requests/outgoing',        protect, getOutgoingRequests);
router.put('/requests/:id/respond',     protect, respondToRequest);

module.exports = router;
