async function initAdmin() {
  initNavbar();
  if (!requireAdmin()) return;

  document.querySelectorAll('.admin-nav-btn').forEach(b => b.addEventListener('click', () => switchAdminSection(b.dataset.section)));
  switchAdminSection('overview');
  await loadAdminOverview();
}

function switchAdminSection(id) {
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === id));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === `admin-${id}`));
  const loaders = { overview: loadAdminOverview, users: loadAdminUsers, posts: loadAdminPosts, queuemates: loadAdminQueuemates, tournaments: loadAdminTournaments, activity: loadAdminActivity };
  loaders[id]?.();
}

/* ── Overview ── */
async function loadAdminOverview() {
  const el = document.getElementById('adminOverviewStats');
  if (!el) return;
  el.innerHTML = spinnerHTML('Loading stats…');
  try {
    const d = await apiGet('/admin/overview', true);
    const o = d.overview;
    const cards = [
      { label:'Users',           value:o.users,           icon:'👥', cls:'accent-blue'   },
      { label:'Feed Posts',      value:o.posts,           icon:'📝', cls:'accent-green'  },
      { label:'QueueMate Posts', value:o.queuemates,      icon:'🎮', cls:'accent-orange' },
      { label:'Tournaments',     value:o.tournaments,     icon:'🏆', cls:'accent-purple' },
      { label:'Match Requests',  value:o.matchRequests,   icon:'🤝', cls:'accent-gold'   },
      { label:'Activity (24h)',  value:o.recentActivities,icon:'📊', cls:'accent-blue'   },
    ];
    el.innerHTML = `<div class="stats-grid">${cards.map(c => `<div class="stat-card ${c.cls}"><div class="stat-icon">${c.icon}</div><div class="stat-label">${c.label}</div><div class="stat-value">${c.value}</div></div>`).join('')}</div>`;
  } catch(e) { el.innerHTML = errorStateHTML(e.message); }
}

/* ── Users ── */
let _adminUsers = [];
async function loadAdminUsers(search = '') {
  const el = document.getElementById('adminUsersBody');
  if (!el) return;
  el.innerHTML = `<tr><td colspan="6">${spinnerHTML('Loading users…')}</td></tr>`;
  try {
    const d = await apiGet(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, true);
    _adminUsers = d.users || [];
    renderAdminUsers();
  } catch(e) { el.innerHTML = `<tr><td colspan="6">${errorStateHTML(e.message)}</td></tr>`; }
}

function renderAdminUsers() {
  const el = document.getElementById('adminUsersBody');
  if (!el) return;
  if (!_adminUsers.length) { el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">No users found</td></tr>`; return; }
  el.innerHTML = _adminUsers.map(u => `<tr>
    <td class="td-name"><div style="display:flex;align-items:center;gap:8px"><img src="${avatarFallback(u.avatarUrl)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" alt="" onerror="this.src='assets/default-avatar.svg'">${escHtml(u.name)}</div></td>
    <td>${escHtml(u.email)}</td>
    <td>${u.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '<span class="badge badge-news">User</span>'}</td>
    <td>${u.isSuspended ? '<span class="badge badge-suspended">Suspended</span>' : '<span class="badge badge-upcoming">Active</span>'}</td>
    <td>${formatDate(u.createdAt)}</td>
    <td>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm ${u.isSuspended?'btn-success':'btn-warning'}" onclick="adminToggleSuspend('${escHtml(u._id)}',${!u.isSuspended})">
          ${u.isSuspended ? 'Unsuspend' : 'Suspend'}
        </button>
        ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${escHtml(u._id)}','${escHtml(u.name)}')">Delete</button>` : ''}
      </div>
    </td>
  </tr>`).join('');
}

async function adminToggleSuspend(userId, isSuspended) {
  try {
    await apiPut(`/admin/users/${userId}/suspend`, { isSuspended }, true);
    showToast(`User ${isSuspended ? 'suspended' : 'unsuspended'}`, 'success');
    await loadAdminUsers();
  } catch(e) { showToast(e.message||'Failed', 'error'); }
}

function adminDeleteUser(userId, name) {
  showConfirm('Delete User', `Delete user "${name}" and all their content permanently? This cannot be undone.`, async () => {
    try {
      await apiDelete(`/admin/users/${userId}`, true);
      showToast('User deleted', 'success');
      await loadAdminUsers();
    } catch(e) { showToast(e.message||'Failed', 'error'); }
  });
}

/* ── Posts ── */
let _adminPosts = [];
async function loadAdminPosts(search = '') {
  const el = document.getElementById('adminPostsBody');
  if (!el) return;
  el.innerHTML = `<tr><td colspan="5">${spinnerHTML('Loading posts…')}</td></tr>`;
  try {
    const d = await apiGet(`/admin/posts${search ? `?search=${encodeURIComponent(search)}` : ''}`, true);
    _adminPosts = d.posts || [];
    renderAdminPosts();
  } catch(e) { el.innerHTML = `<tr><td colspan="5">${errorStateHTML(e.message)}</td></tr>`; }
}

function renderAdminPosts() {
  const el = document.getElementById('adminPostsBody');
  if (!el) return;
  if (!_adminPosts.length) { el.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">No posts found</td></tr>`; return; }
  el.innerHTML = _adminPosts.map(p => `<tr>
    <td>${categoryBadgeHTML(p.category)}</td>
    <td class="td-name">${escHtml(truncate(p.content,70))}</td>
    <td>${escHtml(p.user?.name||'Unknown')}</td>
    <td>${formatDate(p.createdAt)}</td>
    <td><button class="btn btn-danger btn-sm" onclick="adminDeletePost('${escHtml(p._id)}')">Delete</button></td>
  </tr>`).join('');
}

function adminDeletePost(id) {
  showConfirm('Delete Post', 'Permanently delete this post?', async () => {
    try { await apiDelete(`/admin/posts/${id}`, true); showToast('Post deleted','success'); await loadAdminPosts(); }
    catch(e) { showToast(e.message||'Failed','error'); }
  });
}

/* ── QueueMates ── */
let _adminQm = [];
async function loadAdminQueuemates(game = '') {
  const el = document.getElementById('adminQmBody');
  if (!el) return;
  el.innerHTML = `<tr><td colspan="5">${spinnerHTML('Loading…')}</td></tr>`;
  try {
    const d = await apiGet(`/admin/queuemates${game ? `?game=${game}` : ''}`, true);
    _adminQm = d.queuemates || [];
    renderAdminQm();
  } catch(e) { el.innerHTML = `<tr><td colspan="5">${errorStateHTML(e.message)}</td></tr>`; }
}

function renderAdminQm() {
  const el = document.getElementById('adminQmBody');
  if (!el) return;
  if (!_adminQm.length) { el.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">No QueueMate posts found</td></tr>`; return; }
  el.innerHTML = _adminQm.map(q => `<tr>
    <td>${gameBadgeHTML(q.game)}</td>
    <td class="td-name">${escHtml(q.rank)} · ${escHtml(q.playType)}</td>
    <td>${escHtml(truncate(q.note,50))}</td>
    <td>${escHtml(q.user?.name||'Unknown')}</td>
    <td><button class="btn btn-danger btn-sm" onclick="adminDeleteQm('${escHtml(q._id)}')">Delete</button></td>
  </tr>`).join('');
}

function adminDeleteQm(id) {
  showConfirm('Delete QueueMate Post', 'Permanently delete this QueueMate post?', async () => {
    try { await apiDelete(`/admin/queuemates/${id}`, true); showToast('Deleted','success'); await loadAdminQueuemates(); }
    catch(e) { showToast(e.message||'Failed','error'); }
  });
}

/* ── Tournaments ── */
let _adminTourns = [];
async function loadAdminTournaments(game = '', status = '') {
  const el = document.getElementById('adminTournBody');
  if (!el) return;
  el.innerHTML = `<tr><td colspan="6">${spinnerHTML('Loading…')}</td></tr>`;
  try {
    const params = [];
    if (game)   params.push(`game=${game}`);
    if (status) params.push(`status=${status}`);
    const d = await apiGet(`/admin/tournaments${params.length ? '?'+params.join('&') : ''}`, true);
    _adminTourns = d.tournaments || [];
    renderAdminTourns();
  } catch(e) { el.innerHTML = `<tr><td colspan="6">${errorStateHTML(e.message)}</td></tr>`; }
}

function renderAdminTourns() {
  const el = document.getElementById('adminTournBody');
  if (!el) return;
  if (!_adminTourns.length) { el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">No tournaments found</td></tr>`; return; }
  el.innerHTML = _adminTourns.map(t => `<tr>
    <td class="td-name">${escHtml(truncate(t.title,40))}</td>
    <td>${gameBadgeHTML(t.game)}</td>
    <td>${tierBadgeHTML(calcTier(t.prizePool))}</td>
    <td>${statusBadgeHTML(t.status||calcStatus(t.startDate,t.endDate))}</td>
    <td>${escHtml(t.createdBy?.name||'Unknown')}</td>
    <td>
      <div style="display:flex;gap:6px">
        ${t.resultImageUrl ? `<a href="${escHtml(t.resultImageUrl)}" target="_blank" class="btn btn-success btn-sm">Result</a>` : ''}
        <button class="btn btn-danger btn-sm" onclick="adminDeleteTourn('${escHtml(t._id)}')">Delete</button>
      </div>
    </td>
  </tr>`).join('');
}

function adminDeleteTourn(id) {
  showConfirm('Delete Tournament', 'Permanently delete this tournament?', async () => {
    try { await apiDelete(`/admin/tournaments/${id}`, true); showToast('Deleted','success'); await loadAdminTournaments(); }
    catch(e) { showToast(e.message||'Failed','error'); }
  });
}

/* ── Activity ── */
async function loadAdminActivity() {
  const el = document.getElementById('adminActivityBody');
  if (!el) return;
  el.innerHTML = `<tr><td colspan="5">${spinnerHTML('Loading…')}</td></tr>`;
  try {
    const d = await apiGet('/admin/activity', true);
    const logs = d.activity || [];
    if (!logs.length) { el.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">No activity yet</td></tr>`; return; }
    el.innerHTML = logs.map(a => `<tr>
      <td class="td-name">${escHtml(a.actor?.name||'System')}</td>
      <td><span class="badge badge-news">${escHtml(a.actionType||'—')}</span></td>
      <td>${escHtml(a.targetType||'—')}</td>
      <td>${escHtml(truncate(a.message,60))}</td>
      <td>${formatRelative(a.createdAt)}</td>
    </tr>`).join('');
  } catch(e) { el.innerHTML = `<tr><td colspan="5">${errorStateHTML(e.message)}</td></tr>`; }
}

/* ── Search/Filter handlers called from HTML ── */
function adminUserSearch()   { loadAdminUsers(document.getElementById('adminUserSearch')?.value.trim()); }
function adminPostSearch()   { loadAdminPosts(document.getElementById('adminPostSearch')?.value.trim()); }
function adminQmFilter()     { loadAdminQueuemates(document.getElementById('adminQmGame')?.value); }
function adminTournFilter()  { loadAdminTournaments(document.getElementById('adminTournGame')?.value, document.getElementById('adminTournStatus')?.value); }
