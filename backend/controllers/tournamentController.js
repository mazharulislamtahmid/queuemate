const Tournament = require('../models/Tournament');
const { logActivity } = require('../utils/activityLogger');
const { validateGame, validateUrl, validateDateOrder, validatePrizePool } = require('../utils/validators');
const { calcTier, calcStatus } = require('../utils/gameConfig');

const getTournaments = async (req, res) => {
  try {
    const { game, tier, status, search, userId, limit } = req.query;
    const filter = {};
    if (game)   filter.game = game;
    if (tier)   filter.tier = tier;
    if (userId) filter.createdBy = userId;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { organizerName: { $regex: search, $options: 'i' } },
    ];

    let tournaments = await Tournament.find(filter)
      .populate('createdBy', 'name avatarUrl coverPhotoUrl socialLinks')
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit) : 100);

    // Inject computed status and filter if needed
    tournaments = tournaments.map(t => {
      const obj = t.toObject();
      obj.status = calcStatus(t.startDate, t.endDate);
      return obj;
    });

    if (status) tournaments = tournaments.filter(t => t.status === status);

    res.json({ tournaments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createTournament = async (req, res) => {
  try {
    const { title, game, prizePool, posterUrl, description, organizerName, registrationLink, socialLink, startDate, endDate } = req.body;
    const cleanRegistrationLink = registrationLink?.trim() || '';
    const cleanSocialLink = socialLink?.trim() || '';

    if (!title?.trim())                return res.status(400).json({ message: 'Title is required.' });
    if (!validateGame(game))           return res.status(400).json({ message: 'Invalid game.' });
    if (!validatePrizePool(prizePool)) return res.status(400).json({ message: 'Prize pool must be a non-negative number.' });
    if (!organizerName?.trim())        return res.status(400).json({ message: 'Organizer name is required.' });
    if (!startDate || !endDate)        return res.status(400).json({ message: 'Start and end dates are required.' });
    if (!validateDateOrder(startDate, endDate)) return res.status(400).json({ message: 'End date must be after start date.' });
    if (posterUrl && !validateUrl(posterUrl))             return res.status(400).json({ message: 'Invalid poster URL.' });
    if (cleanRegistrationLink && !validateUrl(cleanRegistrationLink)) return res.status(400).json({ message: 'Invalid registration link.' });
    if (cleanSocialLink && !validateUrl(cleanSocialLink)) return res.status(400).json({ message: 'Invalid social link.' });

    const tournament = await Tournament.create({
      createdBy: req.user._id, title: title.trim(), game,
      prizePool: Number(prizePool), posterUrl: posterUrl || '',
      description: description || '', organizerName: organizerName.trim(),
      registrationLink: cleanRegistrationLink, socialLink: cleanSocialLink, startDate, endDate,
    });
    await tournament.populate('createdBy', 'name avatarUrl coverPhotoUrl socialLinks');
    await logActivity({ actor: req.user._id, actionType: 'create_tournament', targetType: 'tournament', targetId: tournament._id, message: `${req.user.name} created tournament "${tournament.title}".` });

    const obj = tournament.toObject();
    obj.status = calcStatus(tournament.startDate, tournament.endDate);
    res.status(201).json({ tournament: obj });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('createdBy', 'name avatarUrl coverPhotoUrl socialLinks');
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    const obj = tournament.toObject();
    obj.status = calcStatus(tournament.startDate, tournament.endDate);
    res.json({ tournament: obj });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    if (tournament.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const { resultImageUrl, resultText, title, description, registrationLink, socialLink, posterUrl } = req.body;

    if (resultImageUrl !== undefined) {
      if (resultImageUrl && !validateUrl(resultImageUrl)) return res.status(400).json({ message: 'Invalid result image URL.' });
      tournament.resultImageUrl = resultImageUrl;
    }
    if (resultText !== undefined)       tournament.resultText = resultText;
    if (title?.trim())                  tournament.title = title.trim();
    if (description !== undefined)      tournament.description = description;
    if (registrationLink !== undefined) {
      const cleanRegistrationLink = registrationLink?.trim() || '';
      if (cleanRegistrationLink && !validateUrl(cleanRegistrationLink)) return res.status(400).json({ message: 'Invalid registration link.' });
      tournament.registrationLink = cleanRegistrationLink;
    }
    if (socialLink !== undefined) {
      const cleanSocialLink = socialLink?.trim() || '';
      if (cleanSocialLink && !validateUrl(cleanSocialLink)) return res.status(400).json({ message: 'Invalid social link.' });
      tournament.socialLink = cleanSocialLink;
    }
    if (posterUrl !== undefined) {
      if (posterUrl && !validateUrl(posterUrl)) return res.status(400).json({ message: 'Invalid poster URL.' });
      tournament.posterUrl = posterUrl;
    }

    await tournament.save();
    await tournament.populate('createdBy', 'name avatarUrl coverPhotoUrl socialLinks');
    await logActivity({ actor: req.user._id, actionType: 'update_tournament', targetType: 'tournament', targetId: tournament._id, message: `${req.user.name} updated tournament "${tournament.title}".` });

    const obj = tournament.toObject();
    obj.status = calcStatus(tournament.startDate, tournament.endDate);
    res.json({ tournament: obj });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    if (tournament.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await tournament.deleteOne();
    await logActivity({ actor: req.user._id, actionType: 'delete_tournament', targetType: 'tournament', targetId: tournament._id, message: `${req.user.name} deleted tournament "${tournament.title}".` });
    res.json({ message: 'Tournament deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getTournaments, createTournament, getTournament, updateTournament, deleteTournament };
