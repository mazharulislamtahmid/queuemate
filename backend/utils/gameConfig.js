const GAME_CONFIG = {
  valorant: {
    displayName: 'Valorant',
    color: '#e05260',
    teamSizeLabel: '5v5',
    ranks: ['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal','Radiant'],
    teammates: ['Duo','3 Players','Full Team'],
  },
  pubgm: {
    displayName: 'PUBGM',
    color: '#5bb85b',
    teamSizeLabel: '4-player squad',
    ranks: ['Bronze','Silver','Gold','Platinum','Diamond','Crown','Ace','Ace Master','Ace Dominator','Conqueror'],
    teammates: ['Duo','2 Players','Squad'],
  },
  ff: {
    displayName: 'FF',
    color: '#f07a2a',
    teamSizeLabel: '4-player squad',
    ranks: ['Bronze','Silver','Gold','Platinum','Diamond','Heroic','Master','Grandmaster'],
    teammates: ['Duo','2 Players','Squad'],
  },
  mlbb: {
    displayName: 'MLBB',
    color: '#9c6dff',
    teamSizeLabel: '5v5',
    ranks: ['Warrior','Elite','Master','Grandmaster','Epic','Legend','Mythic','Mythical Honor','Mythical Glory','Mythical Immortal'],
    teammates: ['Duo','3 Players','Full Team'],
  },
};

const SUPPORTED_GAMES = Object.keys(GAME_CONFIG);

function isValidGame(game) {
  return SUPPORTED_GAMES.includes(game);
}

function isValidRank(game, rank) {
  if (!isValidGame(game)) return false;
  return GAME_CONFIG[game].ranks.includes(rank);
}

function isValidTeammateRequirement(game, req) {
  if (!isValidGame(game)) return false;
  return GAME_CONFIG[game].teammates.includes(req);
}

function calcTier(prizePool) {
  const n = Number(prizePool) || 0;
  if (n > 50000) return 'S';
  if (n > 20000) return 'A';
  if (n > 5000)  return 'B';
  return 'C';
}

function calcStatus(startDate, endDate) {
  const now   = new Date();
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (now < start) return 'upcoming';
  if (now <= end)  return 'ongoing';
  return 'over';
}

module.exports = { GAME_CONFIG, SUPPORTED_GAMES, isValidGame, isValidRank, isValidTeammateRequirement, calcTier, calcStatus };
