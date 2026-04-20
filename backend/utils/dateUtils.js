function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isExpired(date) {
  return new Date() > new Date(date);
}

function queuemateExpiryDate(createdAt) {
  return addDays(createdAt || new Date(), 7);
}

function daysLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

module.exports = { addDays, isExpired, queuemateExpiryDate, daysLeft };
