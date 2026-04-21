let _allTournaments = [];
let _tFilters = { game: '', tier: '', status: '', search: '' };
let _tournResultImageDraft = '';
let _tournCreateExpanded = false;
let _createTournamentPoster = '';
const TOURNAMENT_CURRENCY = 'Tk';

function formatTournamentCurrency(amount) {
  return `${TOURNAMENT_CURRENCY} ${Number(amount || 0).toLocaleString()}`;
}

async function initTournaments() {
  initNavbar(); initSidebar(); initSidebarRight();
  renderTournamentCreateBox();
  await loadTournaments();
  document.getElementById('tFilterGame')?.addEventListener('change', e => { _tFilters.game = e.target.value; renderTournaments(); });
  document.getElementById('tFilterTier')?.addEventListener('change', e => { _tFilters.tier = e.target.value; renderTournaments(); });
  document.getElementById('tFilterStatus')?.addEventListener('change', e => { _tFilters.status = e.target.value; renderTournaments(); });
  document.getElementById('tSearch')?.addEventListener('input', e => { _tFilters.search = e.target.value.trim(); renderTournaments(); });
  maybeOpenTournamentFromQuery();
  maybeOpenTournamentCreateFromHash();
}

function renderTournamentCreateBox() {
  const el = document.getElementById('tournamentCreateBox');
  if (!el) return;
  if (!isLoggedIn()) {
    el.innerHTML = `<div class="create-box"><p class="text-secondary" style="font-size:0.9rem"><a href="login.html" class="text-accent font-600">Log in</a> to post a tournament.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="create-box create-box-shell ${_tournCreateExpanded ? 'expanded' : ''}">
    <div class="create-box-collapsed" onclick="expandTournamentCreateBox()">
      <img src="${avatarFallback(getCurrentUser()?.avatarUrl)}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div class="create-box-collapsed-copy">
        <div class="create-box-collapsed-title">Post a tournament</div>
        <div class="create-box-collapsed-subtitle">Share a new event, prize pool, and registration details.</div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm">${_tournCreateExpanded ? 'Open' : 'Create'}</button>
    </div>
    <div class="create-box-expander">
      <div class="create-box-header">
        <div class="create-box-title-wrap">
          <div class="create-box-badge">Tournament</div>
          <h3>Publish a tournament</h3>
          <p>Add the poster, event details, and dates. Other players will see it in the tournament feed.</p>
        </div>
        <span id="ttTeamSizeLabel" class="badge badge-news">-</span>
      </div>
      <div class="form-group"><label class="form-label">Tournament Title *</label>
        <input type="text" id="ttTitle" placeholder="e.g. BD Valorant Championship Season 3"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Game *</label>
          <select id="ttGame" onchange="onTournamentCreateGameChange()"><option value="">Select Game</option>
            <option value="valorant">Valorant</option><option value="pubgm">PUBG Mobile</option><option value="ff">Free Fire</option><option value="mlbb">Mobile Legends</option>
          </select></div>
        <div class="form-group"><label class="form-label">Prize Pool (${TOURNAMENT_CURRENCY}) *</label>
          <input type="number" id="ttPrize" placeholder="e.g. 10000" min="0" oninput="renderTournamentCreateTierPreview()">
          <div class="tier-preview" id="ttTierPreview"></div></div>
      </div>
      <div class="form-group"><label class="form-label">Poster <span class="text-muted">(optional)</span></label>
        <div class="device-upload-box">
          <input type="file" id="ttPoster" accept="image/*" hidden onchange="handleTournamentCreatePosterSelect(event)">
          <div class="device-upload-header">
            <div>
              <div class="device-upload-title">Choose from your device</div>
              <div class="device-upload-subtitle">Browse and upload a tournament poster.</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('ttPoster')?.click()">Browse</button>
          </div>
          <div id="ttPosterPreviewWrap" class="device-upload-preview" style="display:none">
            <img id="ttPosterPreview" class="poster-preview" alt="Tournament poster preview" onerror="this.style.display='none'">
            <button type="button" class="btn btn-danger btn-sm" onclick="clearTournamentCreatePoster()">Remove</button>
          </div>
        </div></div>
      <div class="form-group"><label class="form-label">Description</label>
        <textarea id="ttDesc" rows="4" placeholder="Rules, format, eligibility..." style="resize:vertical"></textarea></div>
      <div class="form-group"><label class="form-label">Organizer / Host *</label><input type="text" id="ttOrg" placeholder="Your name or org name"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Registration Link</label><input type="url" id="ttRegLink" placeholder="https://forms.gle/..."></div>
        <div class="form-group"><label class="form-label">Explore / Social Link</label><input type="url" id="ttSocialLink" placeholder="https://discord.gg/your-event"></div>
      </div>
      <div class="date-row">
        <div class="form-group"><label class="form-label">Start Date *</label><input type="date" id="ttStart"></div>
        <div class="form-group"><label class="form-label">End Date *</label><input type="date" id="ttEnd"></div>
      </div>
      <div class="create-box-footer">
        <button type="button" class="btn btn-ghost" onclick="collapseTournamentCreateBox()">Cancel</button>
        <button class="btn btn-primary" id="ttSubmitBtn" onclick="submitTournamentCreate()">Publish Tournament</button>
      </div>
    </div>
  </div>`;
}

function expandTournamentCreateBox() {
  _tournCreateExpanded = true;
  renderTournamentCreateBox();
  requestAnimationFrame(() => document.getElementById('ttTitle')?.focus());
}

function collapseTournamentCreateBox() {
  _tournCreateExpanded = false;
  _createTournamentPoster = '';
  renderTournamentCreateBox();
}

function maybeOpenTournamentCreateFromHash() {
  if (window.location.hash === '#create-tournament') expandTournamentCreateBox();
}

function onTournamentCreateGameChange() {
  const game = document.getElementById('ttGame')?.value;
  const cfg = GAME_CONFIG[game];
  const lbl = document.getElementById('ttTeamSizeLabel');
  if (lbl) {
    lbl.textContent = cfg ? cfg.teamSize : '-';
    lbl.className = `badge ${cfg ? cfg.badgeClass : 'badge-news'}`;
  }
}

function renderTournamentCreateTierPreview() {
  const prize = document.getElementById('ttPrize')?.value;
  const tp = document.getElementById('ttTierPreview');
  if (tp) tp.innerHTML = prize ? `Tier: ${tierBadgeHTML(calcTier(prize))}` : '';
}

function readTournamentCreateImageFile(event, onLoad) {
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
  reader.onerror = () => showToast('Failed to read image', 'error');
  reader.readAsDataURL(file);
  event.target.value = '';
}

function handleTournamentCreatePosterSelect(event) {
  readTournamentCreateImageFile(event, result => {
    _createTournamentPoster = result;
    const wrap = document.getElementById('ttPosterPreviewWrap');
    const img = document.getElementById('ttPosterPreview');
    if (wrap && img) {
      img.src = result;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
  });
}

function clearTournamentCreatePoster() {
  _createTournamentPoster = '';
  const input = document.getElementById('ttPoster');
  const wrap = document.getElementById('ttPosterPreviewWrap');
  const img = document.getElementById('ttPosterPreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
}

async function submitTournamentCreate() {
  if (!requireAuth()) return;
  const title = document.getElementById('ttTitle')?.value.trim();
  const game = document.getElementById('ttGame')?.value;
  const prize = document.getElementById('ttPrize')?.value;
  const desc = document.getElementById('ttDesc')?.value.trim();
  const org = document.getElementById('ttOrg')?.value.trim();
  const regLink = document.getElementById('ttRegLink')?.value.trim();
  const socialLink = document.getElementById('ttSocialLink')?.value.trim();
  const startDate = document.getElementById('ttStart')?.value;
  const endDate = document.getElementById('ttEnd')?.value;

  if (!title) return showToast('Title required', 'error');
  if (!game) return showToast('Select a game', 'error');
  if (!prize) return showToast('Prize pool required', 'error');
  if (!org) return showToast('Organizer name required', 'error');
  if (!startDate) return showToast('Start date required', 'error');
  if (!endDate) return showToast('End date required', 'error');
  if (new Date(endDate) <= new Date(startDate)) return showToast('End date must be after start date', 'error');
  if (regLink && !isValidUrl(regLink)) return showToast('Invalid registration link', 'error');
  if (socialLink && !isValidUrl(socialLink)) return showToast('Invalid social link', 'error');

  const btn = document.getElementById('ttSubmitBtn');
  setSubmitting(btn, true);
  try {
    await apiPost('/tournaments', {
      title,
      game,
      prizePool: Number(prize),
      posterUrl: _createTournamentPoster || '',
      description: desc,
      organizerName: org,
      registrationLink: regLink,
      socialLink,
      startDate,
      endDate,
    }, true);
    showToast('Tournament posted!', 'success');
    _tournCreateExpanded = false;
    _createTournamentPoster = '';
    renderTournamentCreateBox();
    await loadTournaments();
  } catch (e) {
    showToast(e.message || 'Failed to create tournament', 'error');
  } finally {
    setSubmitting(btn, false);
  }
}

async function loadTournaments() {
  const el = document.getElementById('tournamentList');
  if (!el) return;
  setLoading(el, 'Loading tournaments...');
  try {
    const d = await apiGet('/tournaments');
    _allTournaments = (d.tournaments || []).map(t => ({ ...t, _status: calcStatus(t.startDate, t.endDate), _tier: calcTier(t.prizePool) }));
    renderTournaments();
  } catch {
    setError(el, 'Failed to load tournaments.');
  }
}

function maybeOpenTournamentFromQuery() {
  const id = new URLSearchParams(window.location.search).get('t');
  if (!id || !_allTournaments.length) return;
  const found = _allTournaments.find(t => t._id === id);
  if (found) openTournDetail(id);
}

function renderTournaments() {
  const el = document.getElementById('tournamentList');
  if (!el) return;
  let list = [..._allTournaments];
  const { game, tier, status, search } = _tFilters;
  if (game) list = list.filter(t => t.game === game);
  if (tier) list = list.filter(t => t._tier === tier);
  if (status) list = list.filter(t => t._status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(t => t.title?.toLowerCase().includes(q) || t.organizerName?.toLowerCase().includes(q));
  }
  if (!list.length) {
    el.innerHTML = emptyStateHTML('T', 'No tournaments found', 'Try adjusting your filters');
    return;
  }

  const ongoing = list.filter(t => t._status === 'ongoing');
  const upcoming = list.filter(t => t._status === 'upcoming');
  const over = list.filter(t => t._status === 'over');
  let html = '';
  if (ongoing.length) html += `<div class="tourn-section-title"><span class="dot dot-ongoing"></span>Ongoing</div><div class="tourn-grid">${ongoing.map(renderTournCard).join('')}</div>`;
  if (upcoming.length) html += `<div class="tourn-section-title"><span class="dot dot-upcoming"></span>Upcoming</div><div class="tourn-grid">${upcoming.map(renderTournCard).join('')}</div>`;
  if (over.length) html += `<div class="tourn-section-title"><span class="dot dot-over"></span>Finished</div><div class="tourn-grid">${over.map(renderTournCard).join('')}</div>`;
  el.innerHTML = html;
}

function getTournamentExploreLink(tournament) {
  if (typeof tournament?.socialLink !== 'string' || !tournament.socialLink.trim()) return '';
  try {
    const parsed = new URL(tournament.socialLink);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? tournament.socialLink : '';
  } catch {
    return '';
  }
}

function renderTournCard(t) {
  const cfg = GAME_CONFIG[t.game] || {};
  const hasResult = t._status === 'over' && t.resultImageUrl;
  const exploreLink = getTournamentExploreLink(t);
  const hostLine = t.createdBy
    ? profileAnchor(t.createdBy, `<div class="tourn-organizer">by ${escHtml(t.organizerName || t.createdBy?.name || 'Unknown')}</div>`, 'profile-entry-link')
    : `<div class="tourn-organizer">by ${escHtml(t.organizerName || 'Unknown')}</div>`;
  const postedBy = t.createdBy ? `<div class="tourn-organizer">posted by ${profileAnchor(t.createdBy, escHtml(t.createdBy?.name || 'Player'), 'profile-entry-link')}</div>` : '';
  return `<div class="card tourn-card" id="tourn-${escHtml(t._id)}">
    <img src="${posterFallback(t.posterUrl)}" class="tourn-poster" alt="poster" onerror="this.src='assets/default-poster.svg'" loading="lazy">
    <div class="tourn-card-body">
      <div class="tourn-meta">${gameBadgeHTML(t.game)}${tierBadgeHTML(t._tier)}${statusBadgeHTML(t._status)}${cfg.teamSize ? `<span class="badge badge-news">${escHtml(cfg.teamSize)}</span>` : ''}</div>
      <div class="tourn-title">${escHtml(t.title)}</div>
      ${hostLine}
      ${postedBy}
      <div class="tourn-prize">${formatTournamentCurrency(t.prizePool)}</div>
      <div class="tourn-dates">${formatDate(t.startDate)} -> ${formatDate(t.endDate)}</div>
      <p class="tourn-desc">${escHtml(t.description || '')}</p>
      ${hasResult ? `<div class="result-indicator" style="margin-top:8px">Result posted</div>` : ''}
      <div class="tourn-card-footer">
        <button class="btn btn-ghost btn-sm" onclick="openTournDetail('${escHtml(t._id)}')">View Details</button>
        ${t._status !== 'over' && t.registrationLink ? `<a href="${escHtml(t.registrationLink)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Register Now</a>` : ''}
        ${exploreLink ? `<a href="${escHtml(exploreLink)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Explore</a>` : ''}
      </div>
    </div>
  </div>`;
}

function openTournDetail(id) {
  const t = _allTournaments.find(x => x._id === id);
  if (!t) return;
  const me = getCurrentUser();
  const isCreator = me && (t.createdBy?._id === me._id || t.createdBy === me._id);
  const cfg = GAME_CONFIG[t.game] || {};
  const exploreLink = getTournamentExploreLink(t);
  _tournResultImageDraft = t.resultImageUrl || '';

  const resultBlock = t._status === 'over' && t.resultImageUrl
    ? `<div class="result-image-block"><div class="result-label">Tournament Result</div><img src="${escHtml(t.resultImageUrl)}" alt="Result" onerror="this.style.display='none'">${t.resultText ? `<div style="padding:10px var(--space-md);font-size:0.86rem;color:var(--text-secondary)">${escHtml(t.resultText)}</div>` : ''}</div>`
    : t._status === 'over' ? `<div class="empty-state" style="padding:var(--space-md)"><p>No result image added yet.</p></div>` : '';

  const creatorEdit = isCreator && t._status === 'over' ? `
    <div class="creator-edit-panel">
      <h4>Add / Update Result</h4>
      <div class="form-group">
        <label class="form-label">Result Image</label>
        <div class="device-upload-box">
          <input type="file" id="riFile" accept="image/*" hidden onchange="handleTournamentResultSelect(event)">
          <div class="device-upload-header">
            <div>
              <div class="device-upload-title">Choose from your device</div>
              <div class="device-upload-subtitle">Upload the winner poster or final standings image.</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('riFile')?.click()">Browse</button>
          </div>
          <div id="riPreviewWrap" class="device-upload-preview" style="display:${t.resultImageUrl ? 'flex' : 'none'}">
            <img id="riPreview" class="poster-preview" src="${escHtml(t.resultImageUrl || '')}" alt="Result preview" onerror="this.style.display='none'">
            <button type="button" class="btn btn-danger btn-sm" onclick="clearTournamentResultImage()">Remove</button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Winner / Result Text (optional)</label>
        <textarea id="riText" rows="2" placeholder="e.g. Team Alpha won!">${escHtml(t.resultText || '')}</textarea>
      </div>
      <button class="btn btn-accent btn-sm" onclick="saveTournResult('${escHtml(t._id)}')">Save Result</button>
    </div>` : '';

  const body = `
    <img src="${posterFallback(t.posterUrl)}" class="tourn-detail-poster" alt="" onerror="this.src='assets/default-poster.svg'">
    <div class="tourn-meta" style="margin-bottom:8px">${gameBadgeHTML(t.game)}${tierBadgeHTML(t._tier)}${statusBadgeHTML(t._status)}${cfg.teamSize ? `<span class="badge badge-news">${escHtml(cfg.teamSize)}</span>` : ''}</div>
    <h2 style="font-family:var(--font-display);font-size:1.28rem;font-weight:700;margin-bottom:6px">${escHtml(t.title)}</h2>
    <div style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:var(--space-md)">${t.createdBy
      ? profileAnchor(t.createdBy, `by ${escHtml(t.organizerName || t.createdBy?.name || 'Unknown')}`, 'profile-entry-link')
      : `by ${escHtml(t.organizerName || 'Unknown')}`}</div>
    <div class="tourn-info-grid">
      <div class="tourn-info-item"><label>Prize Pool</label><span style="color:var(--tier-s)">${formatTournamentCurrency(t.prizePool)}</span></div>
      <div class="tourn-info-item"><label>Tier</label><span>${t._tier}</span></div>
      <div class="tourn-info-item"><label>Start Date</label><span>${formatDate(t.startDate)}</span></div>
      <div class="tourn-info-item"><label>End Date</label><span>${formatDate(t.endDate)}</span></div>
      <div class="tourn-info-item"><label>Status</label><span>${t._status.charAt(0).toUpperCase() + t._status.slice(1)}</span></div>
      <div class="tourn-info-item"><label>Team Size</label><span>${escHtml(cfg.teamSize || '-')}</span></div>
    </div>
    ${t.description ? `<p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.65;margin:var(--space-md) 0">${escHtml(t.description)}</p>` : ''}
    ${(t._status !== 'over' && t.registrationLink) || exploreLink ? `<div class="tourn-detail-actions">
      ${t._status !== 'over' && t.registrationLink ? `<a href="${escHtml(t.registrationLink)}" target="_blank" rel="noopener" class="btn btn-primary">Register Now</a>` : ''}
      ${exploreLink ? `<a href="${escHtml(exploreLink)}" target="_blank" rel="noopener" class="btn btn-ghost">Explore</a>` : ''}
    </div>` : ''}
    ${t._status === 'over' ? `<div class="badge badge-over" style="margin-bottom:var(--space-md);padding:8px 16px;font-size:0.87rem">Tournament is Over</div>` : ''}
    ${resultBlock}
    ${creatorEdit}`;

  const modal = createModal('tournDetailModal', 'Tournament Details', body);
  openModal(modal);
}

function handleTournamentResultSelect(event) {
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
  reader.onload = () => {
    _tournResultImageDraft = typeof reader.result === 'string' ? reader.result : '';
    const wrap = document.getElementById('riPreviewWrap');
    const img = document.getElementById('riPreview');
    if (wrap && img) {
      img.src = _tournResultImageDraft;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
  };
  reader.onerror = () => showToast('Failed to read image', 'error');
  reader.readAsDataURL(file);
  event.target.value = '';
}

function clearTournamentResultImage() {
  _tournResultImageDraft = '';
  const input = document.getElementById('riFile');
  const wrap = document.getElementById('riPreviewWrap');
  const img = document.getElementById('riPreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
}

async function saveTournResult(id) {
  const imgUrl = _tournResultImageDraft || '';
  const text = document.getElementById('riText')?.value.trim();
  if (imgUrl && !isValidUrl(imgUrl)) return showToast('Invalid image URL', 'error');
  try {
    await apiPut(`/tournaments/${id}`, { resultImageUrl: imgUrl, resultText: text }, true);
    showToast('Result saved!', 'success');
    const idx = _allTournaments.findIndex(t => t._id === id);
    if (idx !== -1) {
      _allTournaments[idx].resultImageUrl = imgUrl;
      _allTournaments[idx].resultText = text;
    }
    closeModal(document.getElementById('tournDetailModal'));
    renderTournaments();
  } catch (e) {
    showToast(e.message || 'Failed to save', 'error');
  }
}
