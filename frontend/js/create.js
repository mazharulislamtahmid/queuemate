let _cLangs = [];
let _createPostImage = '';
let _createTournamentPoster = '';

async function initCreate() {
  initNavbar();
  initSidebar();
  if (!requireAuth()) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  const hash = window.location.hash.replace('#', '');
  switchTab(hash === 'queuemate' ? 'tab-queuemate' : hash === 'tournament' ? 'tab-tournament' : 'tab-post');
  initQmTab();
  initTournTab();
}

function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
}

async function submitCreatePost() {
  const content = document.getElementById('cpContent')?.value.trim();
  const category = document.getElementById('cpCategory')?.value;
  if (!content) return showToast('Content is required', 'error');
  if (!category) return showToast('Select a category', 'error');
  const btn = document.getElementById('cpSubmitBtn');
  setSubmitting(btn, true);
  try {
    await apiPost('/posts', { content, category, imageUrl: _createPostImage || '' }, true);
    showToast('Post published!', 'success');
    document.getElementById('cpContent').value = '';
    document.getElementById('cpCategory').value = '';
    clearCreatePostImage();
  } catch (e) {
    showToast(e.message || 'Failed to create post', 'error');
  } finally {
    setSubmitting(btn, false);
  }
}

function handleCreatePostImageSelect(event) {
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
    _createPostImage = typeof reader.result === 'string' ? reader.result : '';
    const wrap = document.getElementById('cpImgPrevWrap');
    const img = document.getElementById('cpImgPrev');
    if (wrap && img && _createPostImage) {
      img.src = _createPostImage;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
  };
  reader.onerror = () => showToast('Failed to read image', 'error');
  reader.readAsDataURL(file);
}

function clearCreatePostImage() {
  _createPostImage = '';
  const input = document.getElementById('cpImage');
  const wrap = document.getElementById('cpImgPrevWrap');
  const img = document.getElementById('cpImgPrev');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
}

function initQmTab() {
  const gameEl = document.getElementById('cqGame');
  if (!gameEl) return;
  gameEl.addEventListener('change', () => {
    const game = gameEl.value;
    populateRankDropdown(document.getElementById('cqRank'), game);
    populateTeammateDropdown(document.getElementById('cqTeammate'), game);
    const cfg = GAME_CONFIG[game];
    const lbl = document.getElementById('cqTeamSizeLabel');
    if (lbl) {
      lbl.textContent = cfg ? cfg.teamSize : 'Select a game';
      lbl.className = `badge ${cfg ? cfg.badgeClass : 'badge-news'}`;
    }
  });
  document.getElementById('cqLangWrapper')?.addEventListener('click', () => document.getElementById('cqLangInput')?.focus());
  document.getElementById('cqLangInput')?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.target.value.trim();
    if (!val) return;
    if (_cLangs.length >= 3) return showToast('Max 3 languages', 'error');
    if (!_cLangs.includes(val)) _cLangs.push(val);
    e.target.value = '';
    renderCLangs();
  });
}

function renderCLangs() {
  const wrapper = document.getElementById('cqLangWrapper');
  const input = document.getElementById('cqLangInput');
  if (!wrapper || !input) return;
  wrapper.querySelectorAll('.lang-chip').forEach(c => c.remove());
  _cLangs.forEach(l => {
    const chip = document.createElement('span');
    chip.className = 'lang-chip';
    chip.innerHTML = `${escHtml(l)} <span class="chip-remove" onclick="removeCLang(${escJsArg(l)})">x</span>`;
    wrapper.insertBefore(chip, input);
  });
}

function removeCLang(l) {
  _cLangs = _cLangs.filter(x => x !== l);
  renderCLangs();
}

async function submitCreateQm() {
  const game = document.getElementById('cqGame')?.value;
  const rank = document.getElementById('cqRank')?.value;
  const playType = document.getElementById('cqPlayType')?.value;
  const teammate = document.getElementById('cqTeammate')?.value;
  const time = document.getElementById('cqTime')?.value.trim();
  const note = document.getElementById('cqNote')?.value.trim();
  if (!game) return showToast('Select a game', 'error');
  if (!rank) return showToast('Select a rank', 'error');
  if (!playType) return showToast('Select play type', 'error');
  if (!teammate) return showToast('Select teammate need', 'error');
  if (!time) return showToast('Playing time required', 'error');
  if (!note) return showToast('Note required', 'error');
  const btn = document.getElementById('cqSubmitBtn');
  setSubmitting(btn, true);
  try {
    await apiPost('/queuemates', { game, rank, playType, teammateRequirement: teammate, playingTime: time, languages: _cLangs, note }, true);
    showToast('QueueMate post created!', 'success');
    _cLangs = [];
    renderCLangs();
    ['cqNote', 'cqTime'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('cqGame').value = '';
    document.getElementById('cqRank').innerHTML = '<option>Select Game First</option>';
    document.getElementById('cqTeammate').innerHTML = '<option>Select Game First</option>';
    const lbl = document.getElementById('cqTeamSizeLabel');
    if (lbl) {
      lbl.textContent = 'Select a game';
      lbl.className = 'badge badge-news';
    }
  } catch (e) {
    showToast(e.message || 'Failed to create', 'error');
  } finally {
    setSubmitting(btn, false);
  }
}

function initTournTab() {
  document.getElementById('ctGame')?.addEventListener('change', e => {
    const cfg = GAME_CONFIG[e.target.value];
    const lbl = document.getElementById('ctTeamSizeLabel');
    if (lbl) {
      lbl.textContent = cfg ? cfg.teamSize : '-';
      lbl.className = `badge ${cfg ? cfg.badgeClass : 'badge-news'}`;
    }
  });
  document.getElementById('ctPrize')?.addEventListener('input', e => {
    const tp = document.getElementById('tierPreview');
    if (tp) tp.innerHTML = `Tier: ${tierBadgeHTML(calcTier(e.target.value))}`;
  });
}

async function submitCreateTournament() {
  const title = document.getElementById('ctTitle')?.value.trim();
  const game = document.getElementById('ctGame')?.value;
  const prize = document.getElementById('ctPrize')?.value;
  const desc = document.getElementById('ctDesc')?.value.trim();
  const org = document.getElementById('ctOrg')?.value.trim();
  const regLink = document.getElementById('ctRegLink')?.value.trim();
  const startDate = document.getElementById('ctStart')?.value;
  const endDate = document.getElementById('ctEnd')?.value;

  if (!title) return showToast('Title required', 'error');
  if (!game) return showToast('Select a game', 'error');
  if (!prize) return showToast('Prize pool required', 'error');
  if (!org) return showToast('Organizer name required', 'error');
  if (!startDate) return showToast('Start date required', 'error');
  if (!endDate) return showToast('End date required', 'error');
  if (new Date(endDate) <= new Date(startDate)) return showToast('End date must be after start date', 'error');
  if (regLink && !isValidUrl(regLink)) return showToast('Invalid registration link', 'error');

  const btn = document.getElementById('ctSubmitBtn');
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
      startDate,
      endDate,
    }, true);
    showToast('Tournament posted!', 'success');
    ['ctTitle', 'ctPrize', 'ctDesc', 'ctOrg', 'ctRegLink', 'ctStart', 'ctEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('ctGame').value = '';
    clearTournamentPoster();
    const tp = document.getElementById('tierPreview');
    if (tp) tp.innerHTML = '';
    const lbl = document.getElementById('ctTeamSizeLabel');
    if (lbl) {
      lbl.textContent = '-';
      lbl.className = 'badge badge-news';
    }
  } catch (e) {
    showToast(e.message || 'Failed to create tournament', 'error');
  } finally {
    setSubmitting(btn, false);
  }
}

function handleTournamentPosterSelect(event) {
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
    _createTournamentPoster = typeof reader.result === 'string' ? reader.result : '';
    const wrap = document.getElementById('ctPosterPreviewWrap');
    const img = document.getElementById('ctPosterPreview');
    if (wrap && img && _createTournamentPoster) {
      img.src = _createTournamentPoster;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
  };
  reader.onerror = () => showToast('Failed to read image', 'error');
  reader.readAsDataURL(file);
}

function clearTournamentPoster() {
  _createTournamentPoster = '';
  const input = document.getElementById('ctPoster');
  const wrap = document.getElementById('ctPosterPreviewWrap');
  const img = document.getElementById('ctPosterPreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
}
