let _profileData = null;
let _profileGames = [];

async function initProfile() {
  initNavbar(); initSidebar(); initSidebarRight();
  if (!requireAuth()) return;
  await loadProfile();
}

async function loadProfile() {
  const el = document.getElementById('profileContent');
  if (!el) return;
  setLoading(el);
  try {
    const d = await apiGet('/users/profile', true);
    _profileData = d.user;
    _profileGames = [...(_profileData.favoriteGames || [])];
    renderProfile();
    await loadProfilePosts();
  } catch(e) { setError(el, 'Failed to load profile.'); }
}

function renderProfile() {
  const el = document.getElementById('profileContent');
  const p  = _profileData;
  if (!el || !p) return;

  const gameTags = (p.favoriteGames || []).map(g => {
    const cfg = GAME_CONFIG[g] || {};
    return `<span class="game-chip" data-game="${escHtml(g)}">${cfg.label||escHtml(g)}</span>`;
  }).join('');

  const socials = (p.socialLinks || []).map(l =>
    `<a href="${escHtml(l)}" target="_blank" rel="noopener" class="profile-social-link">🔗 ${escHtml(truncate(l, 32))}</a>`
  ).join('');

  const achievements = (p.achievements || []).map(a =>
    `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:0.86rem;color:var(--text-secondary)">🏅 ${escHtml(a)}</div>`
  ).join('');

  el.innerHTML = `
    <div class="profile-header-card">
      <img src="${avatarFallback(p.avatarUrl)}" class="profile-avatar-lg" id="profileAvatar" alt="avatar" onerror="this.src='assets/default-avatar.svg'">
      <div class="profile-info" style="flex:1">
        <h2>${escHtml(p.name||'Player')}</h2>
        ${p.role==='admin'?`<span class="badge badge-admin" style="margin-top:4px">Admin</span>`:''}
        <p class="profile-bio">${escHtml(p.bio||'No bio yet.')}</p>
        ${gameTags ? `<div class="profile-game-tags">${gameTags}</div>` : ''}
        ${socials   ? `<div class="profile-social-links">${socials}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="toggleEditForm()">Edit Profile</button>
    </div>

    <div class="profile-section-card" id="editProfileForm" style="display:none">
      <h3>Edit Profile</h3>
      <div class="form-group"><label class="form-label">Avatar URL</label>
        <input type="url" id="editAvatar" value="${escHtml(p.avatarUrl||'')}" placeholder="https://…"
               oninput="document.getElementById('profileAvatar').src=this.value||'assets/default-avatar.svg'"></div>
      <div class="form-group"><label class="form-label">Bio</label>
        <textarea id="editBio" rows="3" maxlength="300">${escHtml(p.bio||'')}</textarea>
        <div class="form-hint">Max 300 characters</div></div>
      <div class="form-group"><label class="form-label">Favorite Games</label>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${GAMES.map(g => { const cfg=GAME_CONFIG[g]; const chk=(p.favoriteGames||[]).includes(g);
            return `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.87rem">
              <input type="checkbox" value="${g}" ${chk?'checked':''} style="width:auto;border:none;background:none" onchange="toggleProfileGame('${g}',this.checked)">
              <span class="game-chip" data-game="${g}">${cfg.label}</span></label>`;
          }).join('')}
        </div></div>
      <div class="form-group"><label class="form-label">Achievements (one per line)</label>
        <textarea id="editAchievements" rows="3">${(p.achievements||[]).join('\n')}</textarea></div>
      <div class="form-group"><label class="form-label">Social Links (one per line, max 5)</label>
        <textarea id="editSocialLinks" rows="3">${(p.socialLinks||[]).join('\n')}</textarea>
        <div class="form-hint">Max 5 links</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>
        <button class="btn btn-ghost" onclick="toggleEditForm()">Cancel</button>
      </div>
    </div>

    <div class="profile-grid">
      <div class="profile-section-card">
        <h3>Achievements</h3>
        ${achievements || '<p class="text-muted text-sm">No achievements listed.</p>'}
      </div>
      <div class="profile-section-card">
        <h3>Games Played</h3>
        ${(p.favoriteGames||[]).length
          ? `<div class="game-chips">${(p.favoriteGames||[]).map(g=>{const cfg=GAME_CONFIG[g]||{};return `<span class="game-chip" data-game="${g}">${cfg.label||g}</span>`;}).join('')}</div>`
          : '<p class="text-muted text-sm">No games listed.</p>'}
      </div>
    </div>

    <div class="profile-section-card" id="profileFeedPosts"><h3>Recent Posts</h3><div class="text-muted text-sm">Loading…</div></div>
    <div class="profile-section-card" id="profileQmPosts"><h3>QueueMate Posts</h3><div class="text-muted text-sm">Loading…</div></div>
    <div class="profile-section-card" id="profileTournPosts"><h3>Tournament Posts</h3><div class="text-muted text-sm">Loading…</div></div>
  `;
}

function toggleEditForm() {
  const f = document.getElementById('editProfileForm');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function toggleProfileGame(game, checked) {
  if (checked) { if (!_profileGames.includes(game)) _profileGames.push(game); }
  else _profileGames = _profileGames.filter(g => g !== game);
}

async function saveProfile() {
  const avatarUrl    = document.getElementById('editAvatar')?.value.trim();
  const bio          = document.getElementById('editBio')?.value.trim();
  const achRaw       = document.getElementById('editAchievements')?.value.trim();
  const linksRaw     = document.getElementById('editSocialLinks')?.value.trim();
  const achievements = achRaw   ? achRaw.split('\n').map(s=>s.trim()).filter(Boolean) : [];
  const socialLinks  = linksRaw ? linksRaw.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,5) : [];

  if (avatarUrl && !isValidUrl(avatarUrl)) return showToast('Invalid avatar URL', 'error');
  if (bio && bio.length > 300) return showToast('Bio max 300 characters', 'error');
  const badLinks = socialLinks.filter(l => !isValidUrl(l));
  if (badLinks.length) return showToast('One or more social links are invalid URLs', 'error');

  try {
    const d = await apiPut('/users/profile', { avatarUrl, bio, favoriteGames: _profileGames, achievements, socialLinks }, true);
    _profileData = d.user;
    const cur = getCurrentUser();
    if (cur) localStorage.setItem('currentUser', JSON.stringify({ ...cur, ..._profileData }));
    showToast('Profile updated!', 'success');
    renderProfile();
    await loadProfilePosts();
  } catch(e) { showToast(e.message||'Failed to update', 'error'); }
}

async function loadProfilePosts() {
  const uid = _profileData?._id;
  if (!uid) return;
  try {
    const d = await apiGet('/users/me/posts', true);
    const posts = (d.posts||[]).slice(0,3);
    const el = document.getElementById('profileFeedPosts');
    if (el) el.innerHTML = `<h3>Recent Posts</h3><div class="mini-post-list">${posts.length ? posts.map(p=>`<div class="mini-post-item">${categoryBadgeHTML(p.category)}<div style="margin-top:3px">${escHtml(truncate(p.content,80))}</div><div class="mini-post-time">${formatRelative(p.createdAt)}</div></div>`).join('') : '<p class="text-muted text-sm">No posts yet.</p>'}</div>`;
  } catch {}
  try {
    const d = await apiGet('/users/me/queuemates', true);
    const posts = (d.queuemates||[]).slice(0,3);
    const el = document.getElementById('profileQmPosts');
    if (el) el.innerHTML = `<h3>QueueMate Posts</h3><div class="mini-post-list">${posts.length ? posts.map(p=>`<div class="mini-post-item">${gameBadgeHTML(p.game)}<span class="text-secondary text-sm" style="margin-left:4px">${escHtml(p.rank||'')} · ${escHtml(p.playType||'')}</span><div style="margin-top:3px">${escHtml(truncate(p.note,60))}</div><div class="mini-post-time">${formatRelative(p.createdAt)}</div></div>`).join('') : '<p class="text-muted text-sm">No QueueMate posts yet.</p>'}</div>`;
  } catch {}
  try {
    const d = await apiGet('/users/me/tournaments', true);
    const posts = (d.tournaments||[]).slice(0,3);
    const el = document.getElementById('profileTournPosts');
    if (el) el.innerHTML = `<h3>Tournament Posts</h3><div class="mini-post-list">${posts.length ? posts.map(t=>`<div class="mini-post-item">${gameBadgeHTML(t.game)}<span class="font-600" style="margin-left:4px">${escHtml(truncate(t.title,50))}</span><div class="mini-post-time">${formatRelative(t.createdAt)}</div></div>`).join('') : '<p class="text-muted text-sm">No tournament posts yet.</p>'}</div>`;
  } catch {}
}
