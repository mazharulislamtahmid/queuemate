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
  return !aspect || ['1:1', '3:4', '4:3'].includes(aspect);
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
