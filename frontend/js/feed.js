let _allPosts = [];
let _allFeedTournaments = [];
let _featuredTournament = null;
let _featuredTournamentPool = [];
let _featuredTournamentIndex = 0;
let _featuredTournamentTimer = null;
let _feedCat = '';
let _feedSearch = '';
let _selectedPostImage = '';
let _selectedPostImageAspect = '';
let _createPostExpanded = false;
let _feedEditPostImage = '';
let _feedEditPostImageAspect = '';

const POST_IMAGE_ASPECTS = [
  { value: '1:1', label: '1:1', ratio: 1, className: 'post-media-1-1' },
  { value: '3:4', label: '3:4', ratio: 3 / 4, className: 'post-media-3-4' },
  { value: '4:3', label: '4:3', ratio: 4 / 3, className: 'post-media-4-3' },
];

function normalizePostImageAspect(aspect) {
  return POST_IMAGE_ASPECTS.find(item => item.value === aspect)?.value || '4:3';
}

function getPostImageAspectMeta(aspect) {
  return POST_IMAGE_ASPECTS.find(item => item.value === normalizePostImageAspect(aspect)) || POST_IMAGE_ASPECTS[2];
}

function getClosestPostImageAspect(width, height) {
  if (!width || !height) return '4:3';
  const actualRatio = width / height;
  let best = POST_IMAGE_ASPECTS[0];
  let minDiff = Infinity;
  POST_IMAGE_ASPECTS.forEach(item => {
    const diff = Math.abs(actualRatio - item.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      best = item;
    }
  });
  return best.value;
}

function postImageAspectClass(aspect) {
  return getPostImageAspectMeta(aspect).className;
}

async function readPostImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  const imageAspect = await new Promise(resolve => {
    const probe = new Image();
    probe.onload = () => resolve(getClosestPostImageAspect(probe.naturalWidth, probe.naturalHeight));
    probe.onerror = () => resolve('4:3');
    probe.src = dataUrl;
  });

  return { dataUrl, imageAspect };
}

async function initFeed() {
  initNavbar();
  initSidebar();
  initSidebarRight();
  renderCreateBox();

  await Promise.all([loadFeaturedTournament(), loadPosts()]);

  document.getElementById('feedCatFilter')?.addEventListener('change', e => {
    _feedCat = e.target.value;
    renderPosts();
  });

  bindFeedSearchInput();

  document.addEventListener('click', handleFeedDocumentClick);
}

function bindFeedSearchInput() {
  const input = document.getElementById('navbarFeedSearch');
  if (!input || input.dataset.bound === 'true') return;
  input.value = _feedSearch;
  input.addEventListener('input', e => {
    _feedSearch = e.target.value.trim();
    renderPosts();
  });
  input.dataset.bound = 'true';
}

async function loadFeaturedTournament() {
  const hero = document.getElementById('featuredTournamentHero');
  if (!hero) return;

  hero.classList.add('loading');
  stopFeaturedTournamentRotation();

  try {
    const d = await apiGet('/tournaments');
    _allFeedTournaments = (d.tournaments || []).map(t => ({
      ...t,
      _status: calcStatus(t.startDate, t.endDate),
      _tier: calcTier(t.prizePool),
    }));

    _featuredTournamentPool = pickFeaturedTournaments(_allFeedTournaments);
    _featuredTournamentIndex = 0;
    _featuredTournament = _featuredTournamentPool[0] || null;
    renderFeaturedTournament();
    startFeaturedTournamentRotation();
  } catch {
    _featuredTournament = null;
    _featuredTournamentPool = [];
    renderFeaturedTournament(true);
  } finally {
    hero.classList.remove('loading');
  }
}

function pickFeaturedTournaments(tournaments) {
  const active = (tournaments || []).filter(t => t._status === 'upcoming' || t._status === 'ongoing');

  const tierRank = { S: 4, A: 3, B: 2, C: 1 };
  const statusRank = { upcoming: 0, ongoing: 1 };
  const sortByPriority = (a, b) => {
    const statusDiff = (statusRank[a._status] ?? 99) - (statusRank[b._status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    const tierDiff = (tierRank[b._tier] || 0) - (tierRank[a._tier] || 0);
    if (tierDiff !== 0) return tierDiff;
    return new Date(a.startDate) - new Date(b.startDate);
  };

  if (active.length) return active.sort(sortByPriority);
  return [];
}

function startFeaturedTournamentRotation() {
  if (_featuredTournamentPool.length <= 1) return;
  _featuredTournamentTimer = setInterval(() => {
    _featuredTournamentIndex = (_featuredTournamentIndex + 1) % _featuredTournamentPool.length;
    _featuredTournament = _featuredTournamentPool[_featuredTournamentIndex];
    renderFeaturedTournament();
  }, 5000);
}

function stopFeaturedTournamentRotation() {
  if (_featuredTournamentTimer) {
    clearInterval(_featuredTournamentTimer);
    _featuredTournamentTimer = null;
  }
}

function renderFeaturedTournament(hasError = false) {
  const hero = document.getElementById('featuredTournamentHero');
  if (!hero) return;

  if (!_featuredTournament) {
    hero.className = 'featured-hero featured-hero-fallback';
    hero.innerHTML = `
      <div class="featured-hero-backdrop" style="background-image:url('${posterFallback('')}')"></div>
      <div class="featured-hero-overlay"></div>
      <div class="featured-hero-content">
        <div class="featured-hero-minimal">
          <div class="featured-hero-minimal-copy">
            <div class="featured-hero-game">${hasError ? 'Spotlight unavailable' : 'Tournament spotlight'}</div>
            <h1>${hasError ? 'Could not load event' : 'No featured tournament yet'}</h1>
          </div>
          <div class="featured-hero-actions">
            <a href="tournaments.html" class="btn btn-primary btn-sm featured-hero-btn">Explore</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const t = _featuredTournament;
  const cfg = GAME_CONFIG[t.game] || {};
  const detailsHref = `tournaments.html?t=${encodeURIComponent(t._id)}`;

  hero.className = 'featured-hero';
  hero.setAttribute('role', 'link');
  hero.setAttribute('tabindex', '0');
  hero.onclick = () => { window.location.href = detailsHref; };
  hero.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = detailsHref;
    }
  };
  hero.innerHTML = `
    <div class="featured-hero-backdrop" style="background-image:url('${escHtml(posterFallback(t.posterUrl))}')"></div>
    <div class="featured-hero-overlay"></div>
    <div class="featured-hero-noise"></div>
    <div class="featured-hero-content">
      <div class="featured-hero-minimal">
        <div class="featured-hero-minimal-copy">
          <div class="featured-hero-game">${escHtml(cfg.label || t.game || 'Tournament')}</div>
          <h1>${escHtml(t.title)}</h1>
        </div>
        <div class="featured-hero-actions">
          <a href="${detailsHref}" class="btn btn-primary btn-sm featured-hero-btn" onclick="event.stopPropagation()">Explore</a>
        </div>
      </div>
    </div>
  `;
}

function renderCreateBox() {
  const el = document.getElementById('createPostBox');
  if (!el) return;

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();

  el.innerHTML = `<div class="create-box create-box-shell feed-create-shell ${_createPostExpanded ? 'expanded' : ''}">
    <div class="create-box-collapsed feed-create-collapsed" ${loggedIn ? 'onclick="expandCreateBox()"' : ''}>
      <img src="${avatarFallback(user?.avatarUrl)}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div class="create-box-collapsed-copy">
        <div class="create-box-collapsed-title">${loggedIn ? `What's on your mind, ${escHtml(user?.name?.split(' ')[0] || 'player')}?` : 'Join the QueueMate conversation'}</div>
        <div class="create-box-collapsed-subtitle">${loggedIn ? 'Share a quick update with one compact post.' : 'Log in to create a post for the community.'}</div>
      </div>
      ${loggedIn ? '<button type="button" class="btn btn-ghost btn-sm">Post</button>' : '<a href="login.html" class="btn btn-ghost btn-sm">Login</a>'}
    </div>
    ${loggedIn ? `
      <div class="create-box-expander feed-create-expander">
        <div class="create-box-header feed-create-header">
          <div class="create-box-title-wrap feed-create-title-wrap">
            <div class="create-box-badge">Quick Share</div>
            <h3>Post an update</h3>
            <p>Choose a category, add a photo if you want, and publish fast.</p>
          </div>
        </div>
        <div class="form-group">
          <textarea id="postContent" class="feed-create-textarea" rows="3" placeholder="Share news, results, recruitment calls..." style="resize:vertical" maxlength="2000"></textarea>
        </div>
        <input type="hidden" id="postCategory" value="">
        <div class="feed-create-meta-row">
          <div class="feed-category-picker" role="group" aria-label="Choose post category">
            <button type="button" class="feed-category-pill" data-category="news" onclick="setPostCategory('news')">News</button>
            <button type="button" class="feed-category-pill" data-category="result" onclick="setPostCategory('result')">Result</button>
            <button type="button" class="feed-category-pill" data-category="recruitment" onclick="setPostCategory('recruitment')">Recruitment</button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('postImageFile')?.click()">Add Photo</button>
        </div>
        <div class="form-group">
          <div class="device-upload-box feed-upload-box">
            <input type="file" id="postImageFile" accept="image/*" hidden onchange="handlePostImageSelect(event)">
            <div class="device-upload-header">
              <div>
                <div class="device-upload-title">Photo upload</div>
                <div class="device-upload-subtitle">Supports 1:1, 3:4, and 4:3 post photos.</div>
              </div>
            </div>
            <div id="postImagePreviewWrap" class="device-upload-preview feed-upload-preview" style="display:none">
              <img id="postImagePreview" class="feed-post-preview" alt="Selected upload preview">
              <button type="button" class="btn btn-danger btn-sm" onclick="clearPostImage()">Remove</button>
            </div>
            <div id="postImageAspectHint" class="form-hint feed-image-hint">No photo selected</div>
          </div>
        </div>
        <div class="create-box-footer">
          <button type="button" class="btn btn-ghost" onclick="collapseCreateBox()">Cancel</button>
          <button class="btn btn-primary" id="submitPostBtn" onclick="submitPost()">Post Update</button>
        </div>
      </div>` : ''}
  </div>`;
}

function setPostCategory(category) {
  const input = document.getElementById('postCategory');
  if (!input) return;
  input.value = input.value === category ? '' : category;
  document.querySelectorAll('#createPostBox .feed-category-pill').forEach(button => {
    button.classList.toggle('active', button.dataset.category === input.value);
  });
}

function setPostImageHint(targetId, aspect) {
  const hint = document.getElementById(targetId);
  if (!hint) return;
  hint.textContent = aspect ? `Detected format: ${normalizePostImageAspect(aspect)}` : 'No photo selected';
}

async function submitPost() {
  if (!requireAuth()) return;
  const content = document.getElementById('postContent')?.value.trim();
  const category = document.getElementById('postCategory')?.value;
  if (!content) return showToast('Content is required', 'error');
  if (!category) return showToast('Please select a category', 'error');
  const btn = document.getElementById('submitPostBtn');
  setSubmitting(btn, true);
  try {
    await apiPost('/posts', {
      content,
      category,
      imageUrl: _selectedPostImage || '',
      imageAspect: _selectedPostImage ? normalizePostImageAspect(_selectedPostImageAspect) : '',
    }, true);
    document.getElementById('postContent').value = '';
    clearPostImage();
    collapseCreateBox();
    showToast('Post created!', 'success');
    await loadPosts();
  } catch (e) {
    showToast(e.message || 'Failed to create post', 'error');
  } finally {
    setSubmitting(btn, false);
  }
}

async function handlePostImageSelect(event) {
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
  try {
    const { dataUrl, imageAspect } = await readPostImageFile(file);
    _selectedPostImage = dataUrl;
    _selectedPostImageAspect = imageAspect;
    const wrap = document.getElementById('postImagePreviewWrap');
    const img = document.getElementById('postImagePreview');
    if (wrap && img && _selectedPostImage) {
      img.src = _selectedPostImage;
      img.className = `feed-post-preview ${postImageAspectClass(_selectedPostImageAspect)}`;
      wrap.style.display = 'flex';
    }
    setPostImageHint('postImageAspectHint', _selectedPostImageAspect);
  } catch (error) {
    showToast(error.message || 'Failed to read image', 'error');
  } finally {
    event.target.value = '';
  }
}

function clearPostImage() {
  _selectedPostImage = '';
  _selectedPostImageAspect = '';
  const input = document.getElementById('postImageFile');
  const wrap = document.getElementById('postImagePreviewWrap');
  const img = document.getElementById('postImagePreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.className = 'feed-post-preview';
  }
  if (wrap) wrap.style.display = 'none';
  setPostImageHint('postImageAspectHint', '');
}

function expandCreateBox() {
  _createPostExpanded = true;
  renderCreateBox();
  requestAnimationFrame(() => document.getElementById('postContent')?.focus());
}

function collapseCreateBox() {
  _createPostExpanded = false;
  clearPostImage();
  renderCreateBox();
}

async function loadPosts() {
  const el = document.getElementById('feedList');
  if (!el) return;
  setLoading(el, 'Loading posts...');
  try {
    const d = await apiGet('/posts');
    _allPosts = d.posts || [];
    renderPosts();
  } catch (e) {
    setError(el, 'Failed to load posts.');
  }
}

function renderPosts() {
  const el = document.getElementById('feedList');
  if (!el) return;
  let posts = [..._allPosts];
  if (_feedCat) posts = posts.filter(p => p.category === _feedCat);
  if (_feedSearch) {
    const q = _feedSearch.toLowerCase();
    posts = posts.filter(p => p.content?.toLowerCase().includes(q) || p.user?.name?.toLowerCase().includes(q));
  }
  if (!posts.length) return setEmpty(el, 'N', 'No posts yet', 'Be the first to share something!');
  el.innerHTML = posts.map(renderPostCard).join('');
}

function renderPostContentBlock(postId, content) {
  const safeContent = escHtml(content || '');
  const needsCollapse = (content || '').length > 30;
  return `
    <div class="post-content-shell ${needsCollapse ? 'collapsed' : ''}" id="postContentShell-${escHtml(postId)}">
      <div class="post-content">${safeContent}</div>
      ${needsCollapse ? `<button type="button" class="post-see-more" onclick="togglePostContent('${escHtml(postId)}')">See more</button>` : ''}
    </div>
  `;
}

function renderPostMenu(post) {
  const me = getCurrentUser();
  const isOwn = me && (post.user?._id === me._id || post.user?.id === me._id);
  const canReport = isLoggedIn() && !isOwn;
  if (!isOwn && !canReport) return '';

  return `
    <div class="post-menu-wrap">
      <button type="button" class="post-menu-trigger" onclick="togglePostMenu(event, '${escHtml(post._id)}')" aria-label="Post actions">...</button>
      <div class="post-menu-dropdown" id="postMenu-${escHtml(post._id)}">
        ${isOwn ? `<button type="button" class="post-menu-item" onclick="openFeedEditPostModal('${escHtml(post._id)}')">Edit</button>` : ''}
        ${isOwn ? `<button type="button" class="post-menu-item danger" onclick="deletePost('${escHtml(post._id)}')">Delete</button>` : ''}
        ${canReport ? `<button type="button" class="post-menu-item" onclick="reportPostToAdmin('${escHtml(post._id)}')">Report to admin</button>` : ''}
      </div>
    </div>
  `;
}

function renderPostCard(p) {
  const me = getCurrentUser();
  const isOwn = me && (p.user?._id === me._id || p.user?.id === me._id);
  const liked = p.likedByMe || false;
  const likeCount = p.likesCount ?? p.likes?.length ?? 0;
  const commentCount = p.comments?.length || 0;
  const hasImage = !!p.imageUrl;
  const imageAspectClass = postImageAspectClass(p.imageAspect);
  const userAvatar = profileAnchor(p.user, `<img src="${avatarFallback(p.user?.avatarUrl)}" class="post-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`, 'profile-entry-link profile-avatar-link');
  const userName = profileAnchor(p.user, `<div class="post-user-name">${escHtml(p.user?.name || 'Unknown')}</div>`, 'profile-entry-link');
  return `<div class="card post-card ${hasImage ? 'post-card-hero' : 'post-card-text'}" id="post-${escHtml(p._id)}">
    <div class="card-body">
      ${renderPostMenu(p)}
      ${hasImage ? `
        <div class="post-hero-media ${imageAspectClass}">
          <img src="${escHtml(p.imageUrl)}" class="post-image post-image-clickable" alt="${escHtml(`${p.user?.name || 'Player'} post photo`)}" data-fullsrc="${escHtml(p.imageUrl)}" onclick="openImageViewer(this.dataset.fullsrc, this.alt)" onerror="this.style.display='none'">
          <div class="post-image-overlay"></div>
          <div class="post-floating-profile">
            <div class="post-card-header">
              <div class="post-card-header-main">
                ${userAvatar}
                <div>${userName}<div class="post-time">${formatRelative(p.createdAt)}</div></div>
              </div>
              <div class="post-card-header-side">
                <div class="post-inline-actions">
                  <button type="button" class="post-inline-action like-btn ${liked ? 'liked' : ''}" id="likeBtn-${escHtml(p._id)}" onclick="toggleLike('${escHtml(p._id)}')" aria-label="Like post">
                    <span class="post-icon-symbol">&#10084;</span>
                    <span class="post-inline-count" id="postLikesLabel-${escHtml(p._id)}">${likeCount || ''}</span>
                  </button>
                  <button type="button" class="post-inline-action comment-btn" id="postCommentsLabel-${escHtml(p._id)}" onclick="toggleComments('${escHtml(p._id)}')" aria-label="Show comments">
                    <span class="post-icon-symbol">&#128172;</span>
                    <span class="post-inline-count">${commentCount || ''}</span>
                  </button>
                </div>
                ${categoryBadgeHTML(p.category)}
              </div>
            </div>
            <div class="post-caption-bar">
              ${renderPostContentBlock(p._id, p.content)}
            </div>
          </div>
        </div>
      ` : `
        <div class="post-card-header">
          <div class="post-card-header-main">
            ${userAvatar}
              <div>${userName}<div class="post-time">${formatRelative(p.createdAt)}</div></div>
            </div>
            <div class="post-card-header-side">
              <div class="post-inline-actions">
                <button type="button" class="post-inline-action like-btn ${liked ? 'liked' : ''}" id="likeBtn-${escHtml(p._id)}" onclick="toggleLike('${escHtml(p._id)}')" aria-label="Like post">
                  <span class="post-icon-symbol">&#10084;</span>
                <span class="post-inline-count" id="postLikesLabel-${escHtml(p._id)}">${likeCount || ''}</span>
              </button>
              <button type="button" class="post-inline-action comment-btn" id="postCommentsLabel-${escHtml(p._id)}" onclick="toggleComments('${escHtml(p._id)}')" aria-label="Show comments">
                <span class="post-icon-symbol">&#128172;</span>
                <span class="post-inline-count">${commentCount || ''}</span>
              </button>
            </div>
            ${categoryBadgeHTML(p.category)}
          </div>
        </div>
        <div class="post-copy-wrap">
          ${renderPostContentBlock(p._id, p.content)}
        </div>
      `}
      <div class="comment-section" id="comments-${escHtml(p._id)}" style="display:none">
        <div id="commentList-${escHtml(p._id)}">${(p.comments || []).map(renderComment).join('')}</div>
        ${isLoggedIn() ? `<div class="comment-input-row">
          <img src="${avatarFallback(getCurrentUser()?.avatarUrl)}" class="comment-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
          <input type="text" id="ci-${escHtml(p._id)}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter')submitComment('${escHtml(p._id)}')">
          <button class="btn btn-accent btn-sm" onclick="submitComment('${escHtml(p._id)}')">Send</button>
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

function renderComment(c) {
  return `<div class="comment-item">
    ${profileAnchor(c.user, `<img src="${avatarFallback(c.user?.avatarUrl)}" class="comment-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`, 'profile-entry-link profile-avatar-link')}
    <div class="comment-bubble">
      ${profileAnchor(c.user, `<div class="comment-author">${escHtml(c.user?.name || 'Unknown')}</div>`, 'profile-entry-link')}
      <div class="comment-text">${escHtml(c.text)}</div>
      <div class="comment-time">${formatRelative(c.createdAt)}</div>
    </div>
  </div>`;
}

function handleFeedDocumentClick(event) {
  if (event.target.closest('.post-menu-wrap')) return;
  document.querySelectorAll('.post-menu-dropdown.open').forEach(menu => menu.classList.remove('open'));
}

function togglePostMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById(`postMenu-${id}`);
  if (!menu) return;
  document.querySelectorAll('.post-menu-dropdown.open').forEach(item => {
    if (item !== menu) item.classList.remove('open');
  });
  menu.classList.toggle('open');
}

function togglePostContent(id) {
  const shell = document.getElementById(`postContentShell-${id}`);
  if (!shell) return;
  shell.classList.toggle('collapsed');
  const button = shell.querySelector('.post-see-more');
  if (button) button.textContent = shell.classList.contains('collapsed') ? 'See more' : 'See less';
}

function toggleComments(id) {
  const s = document.getElementById(`comments-${id}`);
  if (s) s.style.display = s.style.display === 'none' ? 'block' : 'none';
}

async function toggleLike(id) {
  if (!requireAuth()) return;
  const btn = document.getElementById(`likeBtn-${id}`);
  if (!btn) return;
  const wasLiked = btn.classList.contains('liked');
  const post = _allPosts.find(p => p._id === id);
  const cur = post ? (post.likesCount ?? post.likes?.length ?? 0) : 0;
  btn.classList.toggle('liked');
  updatePostStatsUI(id, wasLiked ? Math.max(0, cur - 1) : cur + 1, post?.comments?.length || 0);
  try {
    const d = await apiPut(`/posts/${id}/like`, {}, true);
    const target = _allPosts.find(p => p._id === id);
    if (target) {
      target.likedByMe = !!d?.liked;
      target.likesCount = d?.likesCount ?? target.likesCount ?? cur;
    }
    btn.classList.toggle('liked', !!d?.liked);
    updatePostStatsUI(id, d?.likesCount ?? cur, target?.comments?.length || 0);
  } catch {
    btn.classList.toggle('liked');
    updatePostStatsUI(id, cur, post?.comments?.length || 0);
    showToast('Failed to update like', 'error');
  }
}

async function submitComment(id) {
  if (!requireAuth()) return;
  const input = document.getElementById(`ci-${id}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  try {
    const d = await apiPost(`/posts/${id}/comments`, { text }, true);
    const list = document.getElementById(`commentList-${id}`);
    const c = d.comment || { user: getCurrentUser(), text, createdAt: new Date().toISOString() };
    if (list) list.insertAdjacentHTML('beforeend', renderComment(c));
    const section = document.getElementById(`comments-${id}`);
    if (section) section.style.display = 'block';
    const target = _allPosts.find(p => p._id === id);
    if (target) {
      target.comments = [...(target.comments || []), c];
      updatePostStatsUI(id, target.likesCount ?? target.likes?.length ?? 0, target.comments.length);
    }
    input.value = '';
  } catch (e) {
    showToast(e.message || 'Failed to comment', 'error');
  }
}

function updatePostStatsUI(id, likeCount, commentCount) {
  const likesLabel = document.getElementById(`postLikesLabel-${id}`);
  const commentsLabel = document.getElementById(`postCommentsLabel-${id}`);
  if (likesLabel) likesLabel.textContent = likeCount ? `${likeCount}` : '';
  if (commentsLabel) {
    const countEl = commentsLabel.querySelector('.post-inline-count');
    if (countEl) countEl.textContent = commentCount ? `${commentCount}` : '';
  }
}

async function deletePost(id) {
  if (!requireAuth()) return;
  showConfirm('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', async () => {
    try {
      await apiDelete(`/posts/${id}`, true);
      _allPosts = _allPosts.filter(p => p._id !== id);
      document.getElementById(`post-${id}`)?.remove();
      showToast('Post deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to delete', 'error');
    }
  });
}

function openFeedEditPostModal(postId) {
  const post = _allPosts.find(p => p._id === postId);
  if (!post) return;
  _feedEditPostImage = post.imageUrl || '';
  _feedEditPostImageAspect = post.imageAspect || '';
  document.querySelectorAll('.post-menu-dropdown.open').forEach(menu => menu.classList.remove('open'));
  const body = `
    <div class="form-group">
      <label class="form-label">Content</label>
      <textarea id="feedEditPostContent" rows="5" maxlength="2000">${escHtml(post.content || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Category</label>
      <select id="feedEditPostCategory">
        <option value="news" ${post.category === 'news' ? 'selected' : ''}>News</option>
        <option value="result" ${post.category === 'result' ? 'selected' : ''}>Result</option>
        <option value="recruitment" ${post.category === 'recruitment' ? 'selected' : ''}>Recruitment</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Photo</label>
      <div class="device-upload-box feed-upload-box">
        <input type="file" id="feedEditPostImageFile" accept="image/*" hidden onchange="handleFeedEditPostImageSelect(event)">
        <div class="device-upload-header">
          <div>
            <div class="device-upload-title">Choose from your device</div>
            <div class="device-upload-subtitle">Supports 1:1, 3:4, and 4:3 post photos.</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('feedEditPostImageFile')?.click()">Browse</button>
        </div>
        <div id="feedEditPostImagePreviewWrap" class="device-upload-preview feed-upload-preview" style="display:${post.imageUrl ? 'flex' : 'none'}">
          <img id="feedEditPostImagePreview" class="feed-post-preview ${post.imageUrl ? postImageAspectClass(post.imageAspect) : ''}" src="${escHtml(post.imageUrl || '')}" alt="Post image preview" onerror="this.style.display='none'">
          <button type="button" class="btn btn-danger btn-sm" onclick="clearFeedEditPostImage()">Remove</button>
        </div>
        <div id="feedEditPostImageAspectHint" class="form-hint feed-image-hint">${post.imageUrl ? `Detected format: ${normalizePostImageAspect(post.imageAspect)}` : 'No photo selected'}</div>
      </div>
    </div>
  `;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal(document.getElementById('feedEditPostModal'))">Cancel</button>
    <button class="btn btn-primary" onclick="saveFeedEditedPost('${escHtml(postId)}')">Save Changes</button>
  `;
  openModal(createModal('feedEditPostModal', 'Edit Post', body, footer));
}

function readFeedImageFile(event, onLoad) {
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
  readPostImageFile(file)
    .then(result => onLoad(result))
    .catch(error => showToast(error.message || 'Failed to read image', 'error'))
    .finally(() => { event.target.value = ''; });
}

function handleFeedEditPostImageSelect(event) {
  readFeedImageFile(event, ({ dataUrl, imageAspect }) => {
    _feedEditPostImage = dataUrl;
    _feedEditPostImageAspect = imageAspect;
    const wrap = document.getElementById('feedEditPostImagePreviewWrap');
    const img = document.getElementById('feedEditPostImagePreview');
    if (wrap && img) {
      img.src = dataUrl;
      img.className = `feed-post-preview ${postImageAspectClass(_feedEditPostImageAspect)}`;
      img.style.display = 'block';
      wrap.style.display = 'flex';
    }
    setPostImageHint('feedEditPostImageAspectHint', _feedEditPostImageAspect);
  });
}

function clearFeedEditPostImage() {
  _feedEditPostImage = '';
  _feedEditPostImageAspect = '';
  const input = document.getElementById('feedEditPostImageFile');
  const wrap = document.getElementById('feedEditPostImagePreviewWrap');
  const img = document.getElementById('feedEditPostImagePreview');
  if (input) input.value = '';
  if (img) {
    img.src = '';
    img.className = 'feed-post-preview';
    img.style.display = 'none';
  }
  if (wrap) wrap.style.display = 'none';
  setPostImageHint('feedEditPostImageAspectHint', '');
}

async function saveFeedEditedPost(postId) {
  const content = document.getElementById('feedEditPostContent')?.value.trim();
  const category = document.getElementById('feedEditPostCategory')?.value;
  const imageUrl = _feedEditPostImage || '';
  if (!content) return showToast('Content is required', 'error');
  if (!category) return showToast('Please select a category', 'error');
  if (imageUrl && !isValidUrl(imageUrl)) return showToast('Invalid image URL', 'error');

  try {
    const d = await apiPut(`/posts/${postId}`, {
      content,
      category,
      imageUrl,
      imageAspect: imageUrl ? normalizePostImageAspect(_feedEditPostImageAspect) : '',
    }, true);
    const idx = _allPosts.findIndex(p => p._id === postId);
    if (idx !== -1) _allPosts[idx] = { ..._allPosts[idx], ...d.post };
    closeModal(document.getElementById('feedEditPostModal'));
    renderPosts();
    showToast('Post updated', 'success');
  } catch (e) {
    showToast(e.message || 'Failed to update post', 'error');
  }
}

function reportPostToAdmin(id) {
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
