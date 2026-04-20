function getToken() { return localStorage.getItem('token') || null; }
function getCurrentUser() { try { const r = localStorage.getItem('currentUser'); return r ? JSON.parse(r) : null; } catch { return null; } }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getCurrentUser(); return u && u.role === 'admin'; }

function _storeAuth(data) {
  if (data.token) localStorage.setItem('token', data.token);
  if (data.user)  localStorage.setItem('currentUser', JSON.stringify(data.user));
}
function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('currentUser'); }

async function registerUser(name, email, password) {
  const data = await apiPost('/auth/register', { name, email, password });
  _storeAuth(data); return data;
}
async function loginUser(email, password) {
  const data = await apiPost('/auth/login', { email, password });
  _storeAuth(data); return data;
}
function requireAuth() { if (!isLoggedIn()) { window.location.href = 'login.html'; return false; } return true; }
function requireAdmin() { if (!isLoggedIn() || !isAdmin()) { window.location.href = 'index.html'; return false; } return true; }
