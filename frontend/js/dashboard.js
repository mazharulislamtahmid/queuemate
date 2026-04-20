let _dashboardProfile = null;
let _dashboardGames = [];
let _dashPosts = [];
let _dashQm = [];
let _dashTourns = [];
let _dashProfileUserId = '';
let _dashViewingOwnProfile = false;
let _dashboardAchievementDrafts = [];
let _dashboardAvatarDraft = '';
let _dashboardCoverDraft = '';
let _dashEditPostImage = '';

async function initDashboard() {
  initNavbar();
  initSidebar();

  const params = new URLSearchParams(window.location.search);
  const requestedUserId = params.get('user') || '';
  const currentUser = getCurrentUser();
  const currentUserId = getUserId(currentUser);

  _dashViewingOwnProfile = !requestedUserId || (currentUserId && requestedUserId === currentUserId);
  _dashProfileUserId = _dashViewingOwnProfile ? currentUserId : requestedUserId;

  if (_dashViewingOwnProfile && !requireAuth()) return;
  if (!_dashProfileUserId) {
    setError(document.getElementById('dashboardProfileContent'), 'Player profile not found.');
    return;
  }

  const tasks = [loadDashboardData()];
  if (isLoggedIn()) tasks.push(loadMailboxOverview());
  await Promise.all(tasks);
  renderDashboardPage();
  await initDashboardSidebarRight();
}

async function initDashboardSidebarRight() {
  const el = document.getElementById('sidebarRight');
  if (!el) return;

  if (!isLoggedIn()) {
    el.innerHTML = `
      <div class="right-rail">
        <div class="sidebar-card rail-card">
          <div class="widget-header">
            <div>
              <div class="widget-eyebrow">Social</div>
              <h4>Sign in to connect</h4>
            </div>
          </div>
          <p class="text-muted text-sm">Log in to send friend requests, build your friend list, and open chat from profile pages.</p>
          <a href="login.html" class="btn btn-primary btn-sm" style="margin-top:12px">Login</a>
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="right-rail">
      <div class="sidebar-card rail-card" id="profileFriendRequestsRail">
        <div class="widget-header">
          <div>
            <div class="widget-eyebrow">Social</div>
            <h4>Friend Requests</h4>
          </div>
        </div>
        <p class="text-muted text-sm">Loading...</p>
      </div>
      <div class="sidebar-card rail-card" id="profileFriendsRail">
        <div class="widget-header">
          <div>
            <div class="widget-eyebrow">Crew</div>
            <h4>Friend List</h4>
          </div>
        </div>
        <p class="text-muted text-sm">Loading...</p>
      </div>
    </div>
  `;

  try {
    const data = _mailboxOverview || await loadMailboxOverview(false);
    renderDashboardFriendRequestsRail(data);
    renderDashboardFriendsRail(data);
  } catch (e) {
    const requestsEl = document.getElementById('profileFriendRequestsRail');
    const friendsEl = document.getElementById('profileFriendsRail');
    if (requestsEl) requestsEl.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Social</div><h4>Friend Requests</h4></div></div><p class="text-muted text-sm">${escHtml(e.message || 'Failed to load requests.')}</p>`;
    if (friendsEl) friendsEl.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Crew</div><h4>Friend List</h4></div></div><p class="text-muted text-sm">${escHtml(e.message || 'Failed to load friends.')}</p>`;
  }
}

function renderDashboardRequestsRail(data) {
  const el = document.getElementById('profileRequestsRail');
  if (!el) return;

  const pending = (data?.incomingRequests || []).filter(r => r.status === 'pending').slice(0, 5);
  el.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Mailbox</div><h4>Matchup Requests</h4></div></div>` +
    (pending.length ? pending.map(request => `
      <div class="widget-item widget-item-card">
        <img src="${avatarFallback(request.sender?.avatarUrl)}" class="widget-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
        <div class="widget-item-stack">
          <div class="widget-item-title">${escHtml(request.sender?.name || 'Player')}</div>
          <div class="widget-item-sub">${escHtml(request.queuematePost?.game || 'QueueMate')} · ${formatRelative(request.createdAt)}</div>
          ${request.introMessage ? `<div class="widget-item-note">${escHtml(truncate(request.introMessage, 72))}</div>` : ''}
          <div class="widget-inline-actions">
            <button class="btn btn-success btn-sm" onclick="respondMailboxRequest('${escHtml(request._id)}','accepted')">Accept</button>
            <button class="btn btn-danger btn-sm" onclick="respondMailboxRequest('${escHtml(request._id)}','rejected')">Reject</button>
          </div>
        </div>
      </div>
    `).join('') : '<p class="text-muted text-sm">No pending matchup requests.</p>') +
    `<button class="btn btn-ghost btn-sm btn-full" style="margin-top:12px" onclick="openMailbox()">Open Mailbox</button>`;
}

function renderDashboardFriendsRail(data) {
  const el = document.getElementById('profileFriendsRail');
  if (!el) return;

  const friends = (data?.friends || []).slice().sort((a, b) =>
    new Date(b.lastSeenAt || b.createdAt || 0) - new Date(a.lastSeenAt || a.createdAt || 0)
  ).slice(0, 8);

  el.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Social</div><h4>Friends</h4></div></div>` +
    (friends.length ? friends.map(item => `
      <div class="widget-item widget-item-card widget-friend-card">
        <img src="${avatarFallback(item.friend?.avatarUrl)}" class="widget-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
        <div class="widget-item-stack">
          <div class="widget-item-title">${escHtml(item.friend?.name || 'Friend')}</div>
          <div class="widget-item-sub">Open chat from your profile</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openMailbox('${escHtml(item._id)}')">Chat</button>
      </div>
    `).join('') : '<p class="text-muted text-sm">No friends yet. Accept requests to build your squad circle.</p>');
}

function renderDashboardFriendRequestsRail(data) {
  renderFriendRequestRailCard('profileFriendRequestsRail', data, {
    eyebrow: 'Social',
    title: 'Friend Requests',
    emptyText: 'No pending friend requests.',
    limit: 5,
    showOpenMailbox: true,
  });
}

function renderDashboardFriendsRail(data) {
  renderFriendListRailCard('profileFriendsRail', data, {
    eyebrow: 'Crew',
    title: 'Friend List',
    emptyText: 'No friends yet. Send requests to build your squad.',
    limit: 8,
  });
}

function normalizeDashboardAchievements(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (typeof item === 'string') {
      return { title: item.trim(), imageUrl: '' };
    }
    if (!item || typeof item !== 'object') return null;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    return { title, imageUrl };
  }).filter(item => item && (item.title || item.imageUrl));
}

function cloneDashboardAchievements(items) {
  return normalizeDashboardAchievements(items).map(item => ({ ...item }));
}

async function loadDashboardData() {
  try {
    if (_dashViewingOwnProfile) {
      await Promise.all([
        loadDashboardOwnProfile(),
        loadDashPosts(`/users/me/posts`, 'posts'),
      ]);
    } else {
      await Promise.all([
        loadDashboardPublicProfile(),
        loadDashPosts(`/posts?userId=${encodeURIComponent(_dashProfileUserId)}&limit=6`, 'posts'),
      ]);
    }
  } catch {
    setError(document.getElementById('dashboardProfileContent'), 'Failed to load player profile.');
  }
}

async function loadDashboardOwnProfile() {
  const d = await apiGet('/users/profile', true);
  _dashboardProfile = d.user;
  _dashboardGames = [...(_dashboardProfile.favoriteGames || [])];
}

async function loadDashboardPublicProfile() {
  const d = await apiGet(`/users/${encodeURIComponent(_dashProfileUserId)}`);
  _dashboardProfile = d.user;
  _dashboardGames = [...(_dashboardProfile.favoriteGames || [])];
}

async function loadDashPosts(endpoint, key) {
  try {
    const d = await apiGet(endpoint, endpoint.startsWith('/users/me/'));
    _dashPosts = d[key] || [];
  } catch {
    _dashPosts = [];
  }
}

function renderDashboardPage() {
  const el = document.getElementById('dashboardProfileContent');
  const p = _dashboardProfile;
  if (!el || !p) return;

  document.title = `QueueMate | ${p.name || 'Player'} Profile`;

  const topGame = (p.favoriteGames || [])[0];
  const topGameCfg = GAME_CONFIG[topGame] || null;
  const normalizedAchievements = normalizeDashboardAchievements(p.achievements);

  const socials = (p.socialLinks || []).map(l => `
    <a href="${escHtml(l)}" target="_blank" rel="noopener" class="profile-social-link">
      ${escHtml(truncate(l.replace(/^https?:\/\//, ''), 28))}
    </a>`).join('');

  const achievements = normalizedAchievements.map(item => `
    <article class="gamer-profile-achievement-bar">
      ${item.imageUrl ? `<div class="gamer-profile-achievement-thumb"><img src="${escHtml(item.imageUrl)}" alt="${escHtml(item.title || 'Achievement')}" onerror="this.parentElement.style.display='none'"></div>` : '<div class="gamer-profile-achievement-accent"></div>'}
      <div class="gamer-profile-achievement-copy">
        ${item.title ? `<div class="gamer-profile-achievement-text">${escHtml(item.title)}</div>` : '<div class="gamer-profile-achievement-text">Achievement highlight</div>'}
      </div>
    </article>
  `).join('');

  const gameTags = (p.favoriteGames || []).map(g => {
    const cfg = GAME_CONFIG[g] || {};
    return `<span class="game-chip" data-game="${escHtml(g)}">${cfg.label || escHtml(g)}</span>`;
  }).join('');

  const adminBadge = p.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '';
  const profileActions = renderDashboardProfileActions(p);

  el.innerHTML = `
    <div class="gamer-profile-page">
      <section class="gamer-profile-hero">
        <div class="gamer-profile-cover" id="profileCover" style="background-image:url('${escHtml(coverFallback(p.coverPhotoUrl))}')"></div>
        <div class="gamer-profile-hero-backdrop" style="${topGameCfg ? `--profile-accent:${topGameCfg.color}` : ''}"></div>
        <div class="gamer-profile-hero-content">
          <div class="gamer-profile-identity">
            <img src="${avatarFallback(p.avatarUrl)}" class="gamer-profile-avatar" id="profileAvatar" alt="avatar" onerror="this.src='assets/default-avatar.svg'">
            <div class="gamer-profile-copy">
              <div class="gamer-profile-title-row">
                <h1>${escHtml(p.name || 'Player')}</h1>
                ${adminBadge}
              </div>
              <p class="gamer-profile-bio">${escHtml(p.bio || (_dashViewingOwnProfile ? 'Add a bio that tells people your main games, role, and squad vibe.' : 'This player has not added a bio yet.'))}</p>
              ${gameTags ? `<div class="profile-game-tags">${gameTags}</div>` : ''}
              ${socials ? `<div class="profile-social-links">${socials}</div>` : ''}
            </div>
            <div class="gamer-profile-actions">
              ${profileActions}
            </div>
          </div>
        </div>
      </section>

      ${_dashViewingOwnProfile ? renderDashboardEditForm(p) : ''}

      <div class="gamer-profile-layout gamer-profile-layout--single">
        <div class="gamer-profile-main">
          <section class="profile-section-card gamer-profile-panel">
            <div class="gamer-profile-section-head">
              <div>
                <h3>Achievements</h3>
              </div>
              ${_dashViewingOwnProfile ? '<button class="btn btn-ghost btn-sm" onclick="openDashboardAchievementManager()">Manage</button>' : ''}
            </div>
            ${achievements ? `<div class="gamer-profile-achievement-grid">${achievements}</div>` : `<p class="text-muted text-sm">${_dashViewingOwnProfile ? 'Add achievement cards with your own text and images.' : 'No achievements listed yet.'}</p>`}
          </section>

          <section class="profile-section-card gamer-profile-panel">
            <div class="gamer-profile-section-head">
              <div>
                <h3>${_dashViewingOwnProfile ? 'Posts' : `${escHtml((p.name || 'Player').split(' ')[0])}'s Posts`}</h3>
              </div>
              ${_dashViewingOwnProfile ? '<a href="index.html" class="btn btn-primary btn-sm">Create Post</a>' : ''}
            </div>
            <div id="dashPostsList">${renderDashPosts()}</div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardProfileActions(profile) {
  if (_dashViewingOwnProfile) {
    return '<button class="btn btn-ghost btn-sm" onclick="toggleDashboardEditForm()">Edit Profile</button>';
  }

  if (!isLoggedIn()) {
    return '<a href="login.html" class="btn btn-primary btn-sm">Login to Connect</a>';
  }

  const relation = getFriendRelationship(getUserId(profile));

  if (relation.friendshipId) {
    return `<button class="btn btn-primary btn-sm" onclick="openMailbox('${escHtml(relation.friendshipId)}')">Open Chat</button>`;
  }

  if (relation.incomingRequest) {
    return `
      <button class="btn btn-success btn-sm" onclick="respondFriendRequest('${escHtml(relation.incomingRequest._id)}','accepted',{ rerenderDashboardPage: true })">Accept Request</button>
      <button class="btn btn-ghost btn-sm" onclick="respondFriendRequest('${escHtml(relation.incomingRequest._id)}','rejected',{ rerenderDashboardPage: true })">Decline</button>
    `;
  }

  if (relation.outgoingRequest) {
    return '<button class="btn btn-ghost btn-sm" disabled>Request Sent</button>';
  }

  return `<button class="btn btn-primary btn-sm" onclick="sendFriendRequest('${escHtml(getUserId(profile))}', { rerenderDashboardPage: true })">Send Friend Request</button>`;
}

function renderDashboardEditForm(p) {
  _dashboardAvatarDraft = p.avatarUrl || '';
  _dashboardCoverDraft = p.coverPhotoUrl || '';
  return `
    <div class="profile-section-card gamer-profile-edit" id="dashboardEditProfileForm" style="display:none">
      <h3>Edit Profile</h3>
      <div class="form-group">
        <label class="form-label">Avatar Photo</label>
        <div class="device-upload-box">
          <input type="file" id="editAvatarFile" accept="image/*" hidden onchange="handleDashboardAvatarSelect(event)">
          <div class="device-upload-header">
            <div>
              <div class="device-upload-title">Choose avatar from your device</div>
              <div class="device-upload-subtitle">Upload a player photo for your profile.</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('editAvatarFile')?.click()">Browse</button>
          </div>
          <div id="editAvatarPreviewWrap" class="device-upload-preview" style="display:${p.avatarUrl ? 'flex' : 'none'}">
            <img id="editAvatarPreview" class="poster-preview" src="${escHtml(p.avatarUrl || '')}" alt="Avatar preview" onerror="this.style.display='none'">
            <button type="button" class="btn btn-danger btn-sm" onclick="clearDashboardAvatar()">Remove</button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Photo</label>
        <div class="device-upload-box">
          <input type="file" id="editCoverPhotoFile" accept="image/*" hidden onchange="handleDashboardCoverSelect(event)">
          <div class="device-upload-header">
            <div>
              <div class="device-upload-title">Choose cover from your device</div>
              <div class="device-upload-subtitle">Upload a wide cover for your player profile.</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('editCoverPhotoFile')?.click()">Browse</button>
          </div>
          <div id="editCoverPreviewWrap" class="device-upload-preview" style="display:${p.coverPhotoUrl ? 'flex' : 'none'}">
            <img id="editCoverPreview" class="poster-preview" src="${escHtml(p.coverPhotoUrl || '')}" alt="Cover preview" onerror="this.style.display='none'">
            <button type="button" class="btn btn-danger btn-sm" onclick="clearDashboardCover()">Remove</button>
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Bio</label>
        <textarea id="editBio" rows="3" maxlength="300">${escHtml(p.bio || '')}</textarea>
        <div class="form-hint">Max 300 characters</div></div>
      <div class="form-group"><label class="form-label">Favorite Games</label>
        <div class="gamer-profile-game-picker">
          ${GAMES.map(g => {
            const cfg = GAME_CONFIG[g];
            const checked = (p.favoriteGames || []).includes(g);
            return `<label class="gamer-profile-game-choice">
              <input type="checkbox" value="${g}" ${checked ? 'checked' : ''} style="width:auto;border:none;background:none" onchange="toggleDashboardGame('${g}',this.checked)">
              <span class="game-chip" data-game="${g}">${cfg.label}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-label">Social Links (one per line, max 5)</label>
        <textarea id="editSocialLinks" rows="3">${(p.socialLinks || []).join('\n')}</textarea>
        <div class="form-hint">Max 5 links</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveDashboardProfile()">Save Changes</button>
        <button class="btn btn-ghost" onclick="toggleDashboardEditForm()">Cancel</button>
      </div>
    </div>
  `;
}

function renderDashboardAchievementEditor() {
  if (!_dashboardAchievementDrafts.length) {
    return `
      <div class="achievement-editor-empty">
        <div class="text-muted text-sm">No achievements added yet.</div>
      </div>
    `;
  }

  return _dashboardAchievementDrafts.map((item, index) => `
    <div class="achievement-editor-card">
      <div class="achievement-editor-preview">
        ${item.imageUrl
          ? `<img src="${escHtml(item.imageUrl)}" alt="${escHtml(item.title || 'Achievement preview')}" onerror="this.style.display='none'">`
          : '<div class="achievement-editor-placeholder">Add image</div>'}
      </div>
      <div class="achievement-editor-fields">
        <div class="form-group">
          <label class="form-label">Text</label>
          <input type="text" value="${escHtml(item.title || '')}" maxlength="120" placeholder="MVP at campus scrim finals" oninput="updateDashboardAchievementText(${index}, this.value)">
        </div>
        <div class="achievement-editor-actions">
          <label class="btn btn-ghost btn-sm" for="achievementImage${index}">Browse Photo</label>
          <input type="file" id="achievementImage${index}" accept="image/*" style="display:none" onchange="handleDashboardAchievementImage(event, ${index})">
          ${item.imageUrl ? '<button type="button" class="btn btn-ghost btn-sm" onclick="clearDashboardAchievementImage(' + index + ')">Remove Photo</button>' : ''}
          <button type="button" class="btn btn-danger btn-sm" onclick="removeDashboardAchievement(${index})">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

function refreshDashboardAchievementEditor() {
  const el = document.getElementById('dashboardAchievementEditor');
  if (el) el.innerHTML = renderDashboardAchievementEditor();
}

function addDashboardAchievement() {
  if (_dashboardAchievementDrafts.length >= 12) {
    showToast('You can add up to 12 achievements', 'error');
    return;
  }
  _dashboardAchievementDrafts.push({ title: '', imageUrl: '' });
  refreshDashboardAchievementEditor();
}

function removeDashboardAchievement(index) {
  _dashboardAchievementDrafts.splice(index, 1);
  refreshDashboardAchievementEditor();
}

function updateDashboardAchievementText(index, value) {
  if (!_dashboardAchievementDrafts[index]) return;
  _dashboardAchievementDrafts[index].title = value.trimStart().slice(0, 120);
}

function clearDashboardAchievementImage(index) {
  if (!_dashboardAchievementDrafts[index]) return;
  _dashboardAchievementDrafts[index].imageUrl = '';
  refreshDashboardAchievementEditor();
}

function handleDashboardAchievementImage(event, index) {
  readDashboardImageFile(event, result => {
    if (!_dashboardAchievementDrafts[index]) return;
    _dashboardAchievementDrafts[index].imageUrl = result;
    refreshDashboardAchievementEditor();
  });
}

function renderDashPosts() {
  if (!_dashPosts.length) {
    return emptyStateHTML('N', 'No posts yet', _dashViewingOwnProfile ? 'Share an update to start building your player identity.' : 'This player has not posted anything yet.');
  }
  return `<div class="dashboard-post-stack">${_dashPosts.map(renderDashboardPostCard).join('')}</div>`;
}

function renderDashboardPostCard(p) {
  const isOwnPost = _dashViewingOwnProfile;
  const user = p.user || _dashboardProfile;
  const userName = escHtml(user?.name || _dashboardProfile?.name || 'Player');
  const avatar = avatarFallback(user?.avatarUrl);
  const canReport = isLoggedIn() && !isOwnPost;

  return `<div class="card post-card post-card-text" id="dash-post-${escHtml(p._id)}">
    <div class="card-body">
      <div class="post-menu-wrap">
        <button type="button" class="post-menu-trigger" onclick="toggleDashboardPostMenu(event, '${escHtml(p._id)}')" aria-label="Post actions">...</button>
        <div class="post-menu-dropdown" id="dashPostMenu-${escHtml(p._id)}">
          ${isOwnPost ? `<button type="button" class="post-menu-item" onclick="openEditPostModal('${escHtml(p._id)}')">Edit</button>` : ''}
          ${isOwnPost ? `<button type="button" class="post-menu-item danger" onclick="dashDeletePost('${escHtml(p._id)}')">Delete</button>` : ''}
          ${canReport ? `<button type="button" class="post-menu-item" onclick="reportDashboardPost('${escHtml(p._id)}')">Report to admin</button>` : ''}
        </div>
      </div>
      <div class="post-card-header">
        <div class="post-card-header-main">
          ${profileAnchor(user, `<img src="${avatar}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`, 'profile-entry-link profile-avatar-link')}
          <div>
            ${profileAnchor(user, `<div class="post-user-name">${userName}</div>`, 'profile-entry-link')}
            <div class="post-time">${formatRelative(p.createdAt)}</div>
          </div>
        </div>
        <div class="post-card-header-side">
          ${categoryBadgeHTML(p.category)}
        </div>
      </div>
      <div class="post-copy-wrap">
        ${renderDashboardPostContentBlock(p._id, p.content)}
      </div>
      ${p.imageUrl ? `<img src="${escHtml(p.imageUrl)}" class="post-image" alt="" onerror="this.style.display='none'">` : ''}
      <div class="dashboard-post-meta">
        <span>${p.likes?.length || p.likesCount || 0} likes</span>
        <span>${p.comments?.length || 0} comments</span>
      </div>
      ${isOwnPost ? `<div class="create-box-footer" style="margin-top:var(--space-sm);justify-content:flex-start">
        <button class="btn btn-ghost btn-sm" onclick="openEditPostModal('${escHtml(p._id)}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="dashDeletePost('${escHtml(p._id)}')">Delete</button>
      </div>` : ''}
    </div>
  </div>`;
}

function renderDashboardPostContentBlock(postId, content) {
  const safeContent = escHtml(content || '');
  const needsCollapse = (content || '').length > 30;
  return `
    <div class="post-content-shell ${needsCollapse ? 'collapsed' : ''}" id="dashPostContentShell-${escHtml(postId)}">
      <div class="post-content">${safeContent}</div>
      ${needsCollapse ? `<button type="button" class="post-see-more" onclick="toggleDashboardPostContent('${escHtml(postId)}')">See more</button>` : ''}
    </div>
  `;
}

function toggleDashboardPostContent(id) {
  const shell = document.getElementById(`dashPostContentShell-${id}`);
  if (!shell) return;
  shell.classList.toggle('collapsed');
  const button = shell.querySelector('.post-see-more');
  if (button) button.textContent = shell.classList.contains('collapsed') ? 'See more' : 'See less';
}

function toggleDashboardPostMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById(`dashPostMenu-${id}`);
  if (!menu) return;
  document.querySelectorAll('.post-menu-dropdown.open').forEach(item => {
    if (item !== menu) item.classList.remove('open');
  });
  menu.classList.toggle('open');
}

function reportDashboardPost(id) {
  if (!requireAuth()) return;
  document.querySelectorAll('.post-menu-dropdown.open').forEach(menu => menu.classList.remove('open'));
  showConfirm('Report Post', 'Send this post to the admin activity log for review?', async () => {
    try {
      await apiPost(`/posts/${id}/report`, {}, true);
      showToast('Post reported to admin', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to report post', 'error');
    }
  }, 'Report');
}

function toggleDashboardEditForm() {
  const form = document.getElementById('dashboardEditProfileForm');
  if (!form) return;
  const isOpening = form.style.display === 'none';
  form.style.display = isOpening ? 'block' : 'none';
  if (isOpening) {
    _dashboardGames = [...(_dashboardProfile?.favoriteGames || [])];
    _dashboardAvatarDraft = _dashboardProfile?.avatarUrl || '';
    _dashboardCoverDraft = _dashboardProfile?.coverPhotoUrl || '';
  } else {
    const heroAvatar = document.getElementById('profileAvatar');
    const heroCover = document.getElementById('profileCover');
    if (heroAvatar) heroAvatar.src = avatarFallback(_dashboardProfile?.avatarUrl);
    if (heroCover) heroCover.style.backgroundImage = `url('${coverFallback(_dashboardProfile?.coverPhotoUrl)}')`;
  }
}

function openDashboardAchievementManager() {
  _dashboardAchievementDrafts = cloneDashboardAchievements(_dashboardProfile?.achievements);
  const body = `
    <div class="achievement-editor-shell">
      <div class="achievement-editor-header">
        <div>
          <label class="form-label" style="margin-bottom:0">Achievements</label>
          <div class="form-hint">Add custom text and an image from your device.</div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="addDashboardAchievement()">Add Achievement</button>
      </div>
      <div id="dashboardAchievementEditor">${renderDashboardAchievementEditor()}</div>
    </div>
  `;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal(document.getElementById('dashboardAchievementModal'))">Cancel</button>
    <button class="btn btn-primary" onclick="saveDashboardAchievements()">Save Achievements</button>
  `;
  const modal = createModal('dashboardAchievementModal', 'Manage Achievements', body, footer);
  openModal(modal);
}

function readDashboardImageFile(event, onLoad) {
  const file = event.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be 5MB or smaller', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => showToast('Failed to read image file', 'error');
  reader.readAsDataURL(file);
  event.target.value = '';
}

function handleDashboardAvatarSelect(event) {
  readDashboardImageFile(event, result => {
    _dashboardAvatarDraft = result;
    const heroAvatar = document.getElementById('profileAvatar');
    const previewWrap = document.getElementById('editAvatarPreviewWrap');
    const preview = document.getElementById('editAvatarPreview');
    if (heroAvatar) heroAvatar.src = avatarFallback(result);
    if (preview && previewWrap) {
      preview.src = result;
      preview.style.display = 'block';
      previewWrap.style.display = 'flex';
    }
  });
}

function clearDashboardAvatar() {
  _dashboardAvatarDraft = '';
  const heroAvatar = document.getElementById('profileAvatar');
  const input = document.getElementById('editAvatarFile');
  const previewWrap = document.getElementById('editAvatarPreviewWrap');
  const preview = document.getElementById('editAvatarPreview');
  if (heroAvatar) heroAvatar.src = 'assets/default-avatar.svg';
  if (input) input.value = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (previewWrap) previewWrap.style.display = 'none';
}

function handleDashboardCoverSelect(event) {
  readDashboardImageFile(event, result => {
    _dashboardCoverDraft = result;
    const heroCover = document.getElementById('profileCover');
    const previewWrap = document.getElementById('editCoverPreviewWrap');
    const preview = document.getElementById('editCoverPreview');
    if (heroCover) heroCover.style.backgroundImage = `url('${result}')`;
    if (preview && previewWrap) {
      preview.src = result;
      preview.style.display = 'block';
      previewWrap.style.display = 'flex';
    }
  });
}

function clearDashboardCover() {
  _dashboardCoverDraft = '';
  const heroCover = document.getElementById('profileCover');
  const input = document.getElementById('editCoverPhotoFile');
  const previewWrap = document.getElementById('editCoverPreviewWrap');
  const preview = document.getElementById('editCoverPreview');
  if (heroCover) heroCover.style.backgroundImage = `url('${coverFallback('')}')`;
  if (input) input.value = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (previewWrap) previewWrap.style.display = 'none';
}

function toggleDashboardGame(game, checked) {
  if (checked) {
    if (!_dashboardGames.includes(game)) _dashboardGames.push(game);
  } else {
    _dashboardGames = _dashboardGames.filter(g => g !== game);
  }
}

async function saveDashboardProfile() {
  const avatarUrl = _dashboardAvatarDraft || '';
  const coverPhotoUrl = _dashboardCoverDraft || '';
  const bio = document.getElementById('editBio')?.value.trim();
  const linksRaw = document.getElementById('editSocialLinks')?.value.trim();
  const socialLinks = linksRaw ? linksRaw.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5) : [];

  if (avatarUrl && !isValidUrl(avatarUrl)) return showToast('Invalid avatar URL', 'error');
  if (coverPhotoUrl && !isValidUrl(coverPhotoUrl)) return showToast('Invalid cover photo URL', 'error');
  if (bio && bio.length > 300) return showToast('Bio max 300 characters', 'error');
  const badLinks = socialLinks.filter(l => !isValidUrl(l));
  if (badLinks.length) return showToast('One or more social links are invalid URLs', 'error');

  try {
    const d = await apiPut('/users/profile', {
      avatarUrl,
      coverPhotoUrl,
      bio,
      favoriteGames: _dashboardGames,
      achievements: normalizeDashboardAchievements(_dashboardProfile?.achievements),
      socialLinks,
    }, true);
    _dashboardProfile = d.user;
    const cur = getCurrentUser();
    if (cur) localStorage.setItem('currentUser', JSON.stringify({ ...cur, ..._dashboardProfile }));
    showToast('Profile updated!', 'success');
    renderDashboardPage();
  } catch (e) {
    showToast(e.message || 'Failed to update profile', 'error');
  }
}

async function saveDashboardAchievements() {
  const achievements = cloneDashboardAchievements(_dashboardAchievementDrafts);
  if (achievements.length > 12) return showToast('You can add up to 12 achievements', 'error');
  if (achievements.some(item => item.title.length > 120)) return showToast('Achievement text must be 120 characters or less', 'error');
  if (achievements.some(item => item.imageUrl && !isValidUrl(item.imageUrl))) return showToast('One or more achievement photos are invalid', 'error');

  try {
    const d = await apiPut('/users/profile', {
      avatarUrl: _dashboardProfile?.avatarUrl || '',
      coverPhotoUrl: _dashboardProfile?.coverPhotoUrl || '',
      bio: _dashboardProfile?.bio || '',
      favoriteGames: _dashboardProfile?.favoriteGames || [],
      achievements,
      socialLinks: _dashboardProfile?.socialLinks || [],
    }, true);
    _dashboardProfile = d.user;
    const cur = getCurrentUser();
    if (cur) localStorage.setItem('currentUser', JSON.stringify({ ...cur, ..._dashboardProfile }));
    closeModal(document.getElementById('dashboardAchievementModal'));
    renderDashboardPage();
    showToast('Achievements updated!', 'success');
  } catch (e) {
    showToast(e.message || 'Failed to update achievements', 'error');
  }
}

function openEditPostModal(postId) {
  const post = _dashPosts.find(p => p._id === postId);
  if (!post) return;
  _dashEditPostImage = post.imageUrl || '';
  const body = `
    <div class="form-group">
      <label class="form-label">Content</label>
      <textarea id="editPostContent" rows="5" maxlength="2000">${escHtml(post.content || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Category</label>
      <select id="editPostCategory">
        <option value="news" ${post.category === 'news' ? 'selected' : ''}>News</option>
        <option value="result" ${post.category === 'result' ? 'selected' : ''}>Result</option>
        <option value="recruitment" ${post.category === 'recruitment' ? 'selected' : ''}>Recruitment</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Photo</label>
      <div class="device-upload-box">
        <input type="file" id="editPostImageFile" accept="image/*" hidden onchange="handleDashboardPostImageSelect(event)">
        <div class="device-upload-header">
          <div>
            <div class="device-upload-title">Choose from your device</div>
            <div class="device-upload-subtitle">Upload a new image or remove the current one.</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('editPostImageFile')?.click()">Browse</button>
        </div>
        <div id="editPostImagePreviewWrap" class="device-upload-preview" style="display:${post.imageUrl ? 'flex' : 'none'}">
          <img id="editPostImagePreview" class="poster-preview" src="${escHtml(post.imageUrl || '')}" alt="Post image preview" onerror="this.style.display='none'">
          <button type="button" class="btn btn-danger btn-sm" onclick="clearDashboardPostImage()">Remove</button>
        </div>
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal(document.getElementById('editPostModal'))">Cancel</button>
    <button class="btn btn-primary" onclick="saveEditedPost('${escHtml(postId)}')">Save Changes</button>`;
  const modal = createModal('editPostModal', 'Edit Post', body, footer);
  openModal(modal);
}

function handleDashboardPostImageSelect(event) {
  readDashboardImageFile(event, result => {
    _dashEditPostImage = result;
    const wrap = document.getElementById('editPostImagePreviewWrap');
    const img = document.getElementById('editPostImagePreview');
    if (wrap && img) {
      img.src = result;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
  });
}

function clearDashboardPostImage() {
  _dashEditPostImage = '';
  const input = document.getElementById('editPostImageFile');
  const wrap = document.getElementById('editPostImagePreviewWrap');
  const img = document.getElementById('editPostImagePreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
}

async function saveEditedPost(postId) {
  const content = document.getElementById('editPostContent')?.value.trim();
  const category = document.getElementById('editPostCategory')?.value;
  const imageUrl = _dashEditPostImage || '';

  if (!content) return showToast('Content is required', 'error');
  if (imageUrl && !isValidUrl(imageUrl)) return showToast('Invalid image URL', 'error');

  try {
    const d = await apiPut(`/posts/${postId}`, {
      content,
      category,
      imageUrl,
    }, true);
    const idx = _dashPosts.findIndex(p => p._id === postId);
    if (idx !== -1) _dashPosts[idx] = d.post;
    closeModal(document.getElementById('editPostModal'));
    renderDashboardPage();
    showToast('Post updated', 'success');
  } catch (e) {
    showToast(e.message || 'Failed to update post', 'error');
  }
}

async function dashDeletePost(id) {
  showConfirm('Delete Post', 'Permanently delete this post?', async () => {
    try {
      await apiDelete(`/posts/${id}`, true);
      _dashPosts = _dashPosts.filter(p => p._id !== id);
      renderDashboardPage();
      showToast('Post deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Failed', 'error');
    }
  });
}
