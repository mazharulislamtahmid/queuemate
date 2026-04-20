const router = require('express').Router();
const { getTournaments, createTournament, getTournament, updateTournament, deleteTournament } = require('../controllers/tournamentController');
const { protect, blockSuspended } = require('../middleware/authMiddleware');

router.get('/',        getTournaments);
router.post('/',       protect, blockSuspended, createTournament);
router.get('/:id',     getTournament);
router.put('/:id',     protect, blockSuspended, updateTournament);
router.delete('/:id',  protect, deleteTournament);

module.exports = router;
