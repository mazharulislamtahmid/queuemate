let _allQm = [];
let _qmFilters = { game:'', playType:'', teammate:'', search:'' };
let _langChips = [];
let _qmCreateExpanded = false;

async function initQueuemate() {
  initNavbar(); initSidebar(); initSidebarRight();
  renderQmForm();
  await loadQueuemates();
  document.getElementById('qmFilterGame')?.addEventListener('change', e => { _qmFilters.game=e.target.value; renderQueuemates(); });
  document.getElementById('qmFilterPlay')?.addEventListener('change', e => { _qmFilters.playType=e.target.value; renderQueuemates(); });
  document.getElementById('qmFilterTeam')?.addEventListener('change', e => { _qmFilters.teammate=e.target.value; renderQueuemates(); });
  document.getElementById('qmSearch')?.addEventListener('input', e => { _qmFilters.search=e.target.value.trim(); renderQueuemates(); });
}

function renderQmForm() {
  const el = document.getElementById('qmCreateForm');
  if (!el) return;
  if (!isLoggedIn()) {
    el.innerHTML = `<div class="create-box"><p class="text-secondary" style="font-size:0.9rem"><a href="login.html" class="text-accent font-600">Log in</a> to post a QueueMate listing.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="create-box create-box-shell qm-create-shell ${_qmCreateExpanded ? 'expanded' : ''}">
    <div class="create-box-collapsed qm-create-collapsed" onclick="expandQmForm()">
      <img src="${avatarFallback(getCurrentUser()?.avatarUrl)}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div class="create-box-collapsed-copy">
        <div class="create-box-collapsed-title">Post a teammate request</div>
        <div class="create-box-collapsed-subtitle">Share your rank, game, and schedule so other players can find you fast.</div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm">${_qmCreateExpanded ? 'Open' : 'Create'}</button>
    </div>
    <div class="create-box-expander qm-create-expander">
      <div style="display:flex;align-items:center;justify-content:space-between;margin:var(--space-md) 0">
        <span class="section-title">Post a Teammate Request</span>
        <span id="qmTeamSizeLabel" class="badge badge-news">Select a game</span>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Game *</label>
          <select id="qmGame" onchange="onQmGameChange()">
            <option value="">Select Game</option>
            <option value="valorant">Valorant</option><option value="pubgm">PUBG Mobile</option><option value="ff">Free Fire</option><option value="mlbb">Mobile Legends</option>
          </select></div>
        <div class="form-group"><label class="form-label">Rank *</label><select id="qmRank"><option value="">Select Game First</option></select></div>
        <div class="form-group"><label class="form-label">Play Type *</label>
          <select id="qmPlayType"><option value="">Play Type</option><option value="Casual">Casual</option><option value="Rank Push">Rank Push</option></select></div>
        <div class="form-group"><label class="form-label">Looking For *</label><select id="qmTeammate"><option value="">Select Game First</option></select></div>
        <div class="form-group"><label class="form-label">Playing Time *</label><input type="text" id="qmPlayingTime" placeholder="e.g. Evenings 8-11 PM"></div>
        <div class="form-group"><label class="form-label">Languages (max 3)</label>
          <div class="chip-input-wrapper" id="qmLangWrapper" onclick="document.getElementById('qmLangInput').focus()">
            <input type="text" id="qmLangInput" placeholder="Type and press Enter..." onkeydown="handleLangKey(event,'qm')">
          </div></div>
      </div>
      <div class="form-group"><label class="form-label">Note *</label>
        <textarea id="qmNote" rows="3" placeholder="Tell others about your playstyle, goals..." maxlength="500" style="resize:vertical"></textarea>
        <div class="form-hint">Max 500 characters</div></div>
      <div class="create-box-footer">
        <button type="button" class="btn btn-ghost" onclick="collapseQmForm()">Cancel</button>
        <button class="btn btn-primary" id="submitQmBtn" onclick="submitQueuemate()">Post QueueMate</button>
      </div>
    </div>
  </div>`;
}

function expandQmForm() {
  _qmCreateExpanded = true;
  renderQmForm();
  requestAnimationFrame(() => document.getElementById('qmGame')?.focus());
}

function collapseQmForm() {
  _qmCreateExpanded = false;
  renderQmForm();
}

function onQmGameChange() {
  const game = document.getElementById('qmGame')?.value;
  populateRankDropdown(document.getElementById('qmRank'), game);
  populateTeammateDropdown(document.getElementById('qmTeammate'), game);
  const cfg = GAME_CONFIG[game];
  const lbl = document.getElementById('qmTeamSizeLabel');
  if (lbl) { lbl.textContent = cfg ? cfg.teamSize : 'Select a game'; lbl.className = `badge ${cfg ? cfg.badgeClass : 'badge-news'}`; }
}

function handleLangKey(e, prefix) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const input = document.getElementById(`${prefix}LangInput`);
  const val = input?.value.trim();
  if (!val) return;
  if (_langChips.length >= 3) { showToast('Max 3 languages', 'error'); return; }
  if (!_langChips.includes(val)) _langChips.push(val);
  input.value = '';
  renderLangChips(prefix);
}

function removeLangChip(lang, prefix) {
  _langChips = _langChips.filter(l => l !== lang);
  renderLangChips(prefix);
}

function renderLangChips(prefix) {
  const wrapper = document.getElementById(`${prefix}LangWrapper`);
  const input   = document.getElementById(`${prefix}LangInput`);
  if (!wrapper || !input) return;
  wrapper.querySelectorAll('.lang-chip').forEach(c => c.remove());
  _langChips.forEach(l => {
    const chip = document.createElement('span');
    chip.className = 'lang-chip';
    chip.innerHTML = `${escHtml(l)} <span class="chip-remove" onclick="removeLangChip('${escHtml(l)}','${prefix}')">x</span>`;
    wrapper.insertBefore(chip, input);
  });
}

async function submitQueuemate() {
  if (!requireAuth()) return;
  const game     = document.getElementById('qmGame')?.value;
  const rank     = document.getElementById('qmRank')?.value;
  const playType = document.getElementById('qmPlayType')?.value;
  const teammate = document.getElementById('qmTeammate')?.value;
  const time     = document.getElementById('qmPlayingTime')?.value.trim();
  const note     = document.getElementById('qmNote')?.value.trim();
  if (!game)     return showToast('Select a game', 'error');
  if (!rank)     return showToast('Select a rank', 'error');
  if (!playType) return showToast('Select play type', 'error');
  if (!teammate) return showToast('Select teammate need', 'error');
  if (!time)     return showToast('Playing time required', 'error');
  if (!note)     return showToast('Note required', 'error');
  const me = getCurrentUser();
  const existingOwnGamePost = _allQm.find(p => (p.user?._id === me?._id || p.user?.id === me?._id) && p.game === game);
  if (existingOwnGamePost) {
    showToast('You already have an active post for this game. Delete the previous one first.', 'error');
    document.getElementById(`qm-${existingOwnGamePost._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = document.getElementById('submitQmBtn');
  setSubmitting(btn, true);
  try {
    await apiPost('/queuemates', { game, rank, playType, teammateRequirement: teammate, playingTime: time, languages: _langChips, note }, true);
    showToast('QueueMate post created!', 'success');
    _langChips = [];
    _qmCreateExpanded = false;
    renderQmForm();
    await loadQueuemates();
  } catch(e) { showToast(e.message||'Failed to create post', 'error'); setSubmitting(btn, false); }
}

async function loadQueuemates() {
  const el = document.getElementById('qmList');
  if (!el) return;
  setLoading(el, 'Loading posts...');
  try {
    const d = await apiGet('/queuemates');
    _allQm = d.queuemates || [];
    renderQueuemates();
  } catch { setError(el, 'Failed to load QueueMate posts.'); }
}

function renderQueuemates() {
  const el = document.getElementById('qmList');
  if (!el) return;
  let posts = [..._allQm];
  const { game, playType, teammate, search } = _qmFilters;
  if (game)     posts = posts.filter(p => p.game === game);
  if (playType) posts = posts.filter(p => p.playType === playType);
  if (teammate) posts = posts.filter(p => p.teammateRequirement === teammate);
  if (search)   { const q = search.toLowerCase(); posts = posts.filter(p => p.note?.toLowerCase().includes(q) || p.user?.name?.toLowerCase().includes(q)); }
  if (!posts.length) return setEmpty(el, 'G', 'No QueueMate posts', 'Be the first to post a teammate request!');
  el.innerHTML = `<div class="qm-grid">${posts.map(renderQmCard).join('')}</div>`;
}

function renderQmCard(p) {
  const me = getCurrentUser();
  const isOwn = me && (p.user?._id === me._id || p.user?.id === me._id);
  const cfg = GAME_CONFIG[p.game] || {};
  const exp = expiryLabel(p.createdAt);
  const langs = (p.languages||[]).map(l => `<span class="lang-chip" style="pointer-events:none">${escHtml(l)}</span>`).join('');
  const userAvatar = profileAnchor(p.user, `<img src="${avatarFallback(p.user?.avatarUrl)}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`, 'profile-entry-link profile-avatar-link');
  const userName = profileAnchor(p.user, `<div class="post-user-name">${escHtml(p.user?.name||'Unknown')}</div>`, 'profile-entry-link');
  return `<div class="card qm-card qm-card-featured qm-card-game-${escHtml(p.game)}" id="qm-${escHtml(p._id)}">
    <div class="qm-card-cover" style="background-image:url('${escHtml(coverFallback(p.user?.coverPhotoUrl))}')"></div>
    <div class="qm-card-cover-overlay"></div>
    <div class="qm-card-accent-bar ${cfg.accentClass||''}"></div>
    <div class="card-body qm-card-body">
      <div class="qm-card-header">
        ${userAvatar}
        <div style="flex:1">${userName}<div class="post-time">${formatRelative(p.createdAt)}</div></div>
        ${gameBadgeHTML(p.game)}
        <span class="badge badge-news">${escHtml(p.teammateRequirement||'')}</span>
      </div>
      <div class="qm-meta-grid">
        <div><div class="qm-meta-label">Rank</div><div class="qm-meta-val">${escHtml(p.rank||'-')}</div></div>
        <div><div class="qm-meta-label">Play Type</div><div class="qm-meta-val">${escHtml(p.playType||'-')}</div></div>
        <div><div class="qm-meta-label">Playing Time</div><div class="qm-meta-val">${escHtml(p.playingTime||'-')}</div></div>
        <div><div class="qm-meta-label">Team Size</div><div class="qm-meta-val">${escHtml(cfg.teamSize||'-')}</div></div>
      </div>
      ${langs ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0 0;min-height:30px">${langs}</div>` : '<div style="min-height:30px"></div>'}
      <div class="qm-note">${escHtml(p.note)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:var(--space-sm);flex-wrap:wrap;gap:8px">
        <span class="expiry-label ${exp.soon?'expiring-soon':''}">Time left: ${exp.text}</span>
        <div style="display:flex;gap:8px">
          ${isOwn
            ? `<button class="btn btn-danger btn-sm" onclick="deleteQueuemate('${escHtml(p._id)}')">Delete</button>`
            : `<button class="btn btn-primary btn-sm" onclick="openMatchupModal('${escHtml(p._id)}','${escHtml(p.user?.name||'')}','${escHtml(p.user?.avatarUrl||'')}')">Matchup Request</button>`}
        </div>
      </div>
    </div>
  </div>`;
}

function openMatchupModal(postId, name, avatar) {
  if (!requireAuth()) return;
  const body = `
    <div style="display:flex;align-items:center;gap:10px;padding:var(--space-md);background:var(--bg-surface);border-radius:var(--radius-md);margin-bottom:var(--space-md)">
      <img src="${avatarFallback(avatar)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border-default)" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div><div style="font-weight:600">${escHtml(name)}</div><div class="text-muted text-sm">Send a matchup request</div></div>
    </div>
    <div class="form-group"><label class="form-label">Intro Message (optional)</label>
      <textarea id="matchupMsg" rows="3" placeholder="Introduce yourself - playstyle, schedule, goals..." maxlength="300"></textarea></div>`;
  const footer = `<button class="btn btn-ghost" onclick="closeModal(document.getElementById('matchupModal'))">Cancel</button>
    <button class="btn btn-primary" onclick="sendMatchupRequest('${escHtml(postId)}')">Send Request</button>`;
  openModal(createModal('matchupModal', 'Matchup Request', body, footer));
}

async function sendMatchupRequest(postId) {
  const msg = document.getElementById('matchupMsg')?.value.trim();
  try {
    await apiPost(`/queuemates/${postId}/request`, { introMessage: msg }, true);
    closeModal(document.getElementById('matchupModal'));
    showToast('Matchup request sent!', 'success');
  } catch(e) { showToast(e.message||'Failed to send request', 'error'); }
}

async function deleteQueuemate(id) {
  if (!requireAuth()) return;
  showConfirm('Delete QueueMate Post', 'Delete this QueueMate listing permanently?', async () => {
    try {
      await apiDelete(`/queuemates/${id}`, true);
      _allQm = _allQm.filter(p => p._id !== id);
      renderQueuemates();
      showToast('Post deleted', 'success');
    } catch(e) { showToast(e.message||'Failed to delete', 'error'); }
  });
}
