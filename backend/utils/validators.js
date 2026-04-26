const { isValidGame, isValidRank, isValidTeammateRequirement } = require('./gameConfig');

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function validateUrl(url) {
  if (!url) return true; // optional fields
  if (typeof url === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(url)) return true;
  try { new URL(url); return true; } catch { return false; }
}

function validateGame(game) {
  return isValidGame(game);
}

function validateRank(game, rank) {
  return isValidRank(game, rank);
}

function validateTeammateRequirement(game, req) {
  return isValidTeammateRequirement(game, req);
}

function validateLanguages(langs) {
  if (!Array.isArray(langs)) return false;
  return langs.length <= 3;
}

function validateSocialLinks(links) {
  if (!Array.isArray(links)) return false;
  return links.length <= 10;
}

function validateNoteLength(note) {
  return typeof note === 'string' && note.length <= 500;
}

function validateContentLength(content) {
  return typeof content === 'string' && content.length > 0 && content.length <= 2000;
}

function validatePostImageAspect(aspect) {
  if (!aspect) return true;
  if (!/^\d{1,5}:\d{1,5}$/.test(aspect)) return false;
  const [width, height] = aspect.split(':').map(Number);
  return width > 0 && height > 0;
}

function validateDateOrder(startDate, endDate) {
  return new Date(startDate) < new Date(endDate);
}

function validatePrizePool(prize) {
  return !isNaN(Number(prize)) && Number(prize) >= 0;
}

module.exports = {
  validateEmail, validatePassword, validateUrl, validateGame, validateRank,
  validateTeammateRequirement, validateLanguages, validateSocialLinks,
  validateNoteLength, validateContentLength, validatePostImageAspect, validateDateOrder, validatePrizePool,
};
