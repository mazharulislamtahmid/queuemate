let _mailboxOverview = null;
let _mailboxActiveFriendshipId = '';
let _mailboxMessages = [];
let _mailboxPoller = null;
let _mailboxLoadingFriendshipId = '';

function initNavbar() {
  const el = document.getElementById('navbar');
  if (!el) return;

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const active = href => href === page ? 'active' : '';

  const mailboxHTML = loggedIn
    ? `<button class="btn btn-ghost btn-sm navbar-mailbox-btn" type="button" onclick="openMailbox()">
         Mailbox
         <span class="navbar-mailbox-badge" id="navbarMailboxBadge" style="display:none">0</span>
       </button>`
    : '';

  const authHTML = loggedIn
    ? `${mailboxHTML}
       <a href="dashboard.html" class="btn btn-ghost btn-sm navbar-profile-btn" style="gap:6px">
         <img src="${avatarFallback(user?.avatarUrl)}" class="navbar-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
         ${escHtml(user?.name?.split(' ')[0] || 'Me')}
       </a>
       ${admin ? `<a href="admin.html" class="btn btn-warning btn-sm">Admin</a>` : ''}
       <button class="btn btn-ghost btn-sm" onclick="handleLogout()">Logout</button>`
    : `<a href="login.html" class="btn btn-ghost btn-sm">Login</a>
       <a href="register.html" class="btn btn-primary btn-sm">Register</a>`;

  el.innerHTML = `
    <a href="index.html" class="navbar-logo">
      <div class="logo-icon">Q</div>
      <span class="logo-text">Queue<span>Mate</span></span>
    </a>
    <nav class="navbar-nav">
      <a href="index.html" class="${active('index.html')}">Home</a>
      <a href="find-queuemate.html" class="${active('find-queuemate.html')}">Find QueueMate</a>
      <a href="tournaments.html" class="${active('tournaments.html')}">Tournaments</a>
    </nav>
    <div class="navbar-actions">${authHTML}</div>
    <div class="navbar-hamburger" onclick="toggleMobileMenu()"><span></span><span></span><span></span></div>
  `;

  let menu = document.getElementById('mobileMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobileMenu';
    menu.innerHTML = `
      <a href="index.html">Home</a>
      <a href="find-queuemate.html">Find QueueMate</a>
      <a href="tournaments.html">Tournaments</a>
      ${loggedIn
        ? `<a href="#" onclick="openMailbox();return false;">Mailbox</a>
           <a href="dashboard.html">My Profile</a>
           ${admin ? `<a href="admin.html">Admin</a>` : ''}
           <a href="#" onclick="handleLogout()">Logout</a>`
        : `<a href="login.html">Login</a><a href="register.html">Register</a>`}
    `;
    const ref = el.nextSibling;
    document.body.insertBefore(menu, ref);
  }

  if (loggedIn) loadMailboxOverview();
  if (loggedIn && !_mailboxPoller) {
    _mailboxPoller = setInterval(() => loadMailboxOverview(), 30000);
  }
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('open');
}

function handleLogout() {
  logoutUser();
  showToast('Logged out successfully', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 500);
}

function getFriendRelationship(targetUserId, overview = _mailboxOverview) {
  const userId = String(targetUserId || '');
  if (!userId || !overview) {
    return { friend: null, incomingRequest: null, outgoingRequest: null, friendshipId: '' };
  }

  const friend = (overview.friends || []).find(item => String(item.friend?._id || item.friend) === userId) || null;
  const incomingRequest = (overview.incomingFriendRequests || []).find(request =>
    String(request.sender?._id || request.sender) === userId
  ) || null;
  const outgoingRequest = (overview.outgoingFriendRequests || []).find(request =>
    String(request.receiver?._id || request.receiver) === userId
  ) || null;

  return {
    friend,
    incomingRequest,
    outgoingRequest,
    friendshipId: friend?._id || '',
  };
}

function syncSocialRailWidgets() {
  renderFriendRequestRailCard('socialFriendRequestsRail', _mailboxOverview, {
    eyebrow: 'Social',
    title: 'Friend Requests',
    emptyText: 'No pending friend requests.',
    limit: 4,
    showOpenMailbox: true,
  });

  renderFriendListRailCard('socialFriendsRail', _mailboxOverview, {
    eyebrow: 'Crew',
    title: 'Friend List',
    emptyText: 'No friends yet. Send requests to build your squad.',
    limit: 6,
  });

  if (typeof renderDashboardFriendRequestsRail === 'function') {
    renderDashboardFriendRequestsRail(_mailboxOverview);
  }
  if (typeof renderDashboardFriendsRail === 'function') {
    renderDashboardFriendsRail(_mailboxOverview);
  }
}

function syncSocialUIAfterOverview({ rerenderMailbox = false, rerenderDashboardPage = false } = {}) {
  syncSocialRailWidgets();

  if (rerenderDashboardPage && typeof renderDashboardPage === 'function' && document.getElementById('dashboardProfileContent')) {
    renderDashboardPage();
  }

  if (rerenderMailbox && document.getElementById('mailboxModal')) {
    renderMailboxModal();
  }
}

async function loadMailboxOverview(silent = true) {
  if (!isLoggedIn()) return null;
  try {
    _mailboxOverview = await apiGet('/social/overview', true);
    updateMailboxBadge();
    syncSocialRailWidgets();
    return _mailboxOverview;
  } catch (e) {
    if (!silent) showToast(e.message || 'Failed to load mailbox', 'error');
    return null;
  }
}

function updateMailboxBadge() {
  const badge = document.getElementById('navbarMailboxBadge');
  if (!badge) return;
  const total = (_mailboxOverview?.pendingCount || 0) + (_mailboxOverview?.unreadCount || 0);
  badge.textContent = `${total}`;
  badge.style.display = total ? 'inline-flex' : 'none';
}

async function refreshSocialSurfaces({ rerenderMailbox = false, rerenderDashboardPage = false } = {}) {
  await loadMailboxOverview(true);
  syncSocialUIAfterOverview({ rerenderMailbox, rerenderDashboardPage });
}

async function sendFriendRequest(userId, options = {}) {
  if (!requireAuth()) return;
  try {
    await apiPost(`/social/requests/${userId}`, {}, true);
    showToast('Friend request sent', 'success');
    await refreshSocialSurfaces({
      rerenderMailbox: !!document.getElementById('mailboxModal') || !!options.rerenderMailbox,
      rerenderDashboardPage: !!options.rerenderDashboardPage,
    });
  } catch (e) {
    showToast(e.message || 'Failed to send friend request', 'error');
  }
}

async function respondFriendRequest(requestId, status, options = {}) {
  try {
    const d = await apiPut(`/social/requests/${requestId}/respond`, { status }, true);
    if (status === 'accepted' && d?.friendshipId) {
      _mailboxActiveFriendshipId = d.friendshipId;
      _mailboxMessages = [];
    }
    showToast(status === 'accepted' ? 'Friend request accepted' : 'Friend request rejected', 'success');
    await refreshSocialSurfaces({
      rerenderMailbox: !!document.getElementById('mailboxModal') || !!options.rerenderMailbox,
      rerenderDashboardPage: !!options.rerenderDashboardPage,
    });
  } catch (e) {
    showToast(e.message || 'Failed to update friend request', 'error');
  }
}

async function openMailbox(friendshipId = '') {
  if (!requireAuth()) return;
  if (!_mailboxOverview) await loadMailboxOverview(false);

  if (friendshipId && String(friendshipId) !== String(_mailboxActiveFriendshipId)) {
    _mailboxMessages = [];
  }
  if (friendshipId) _mailboxActiveFriendshipId = friendshipId;

  renderMailboxModal();

  if (_mailboxActiveFriendshipId) {
    _mailboxMessages = [];
    await loadMailboxMessages(_mailboxActiveFriendshipId, true);
  }
}

function renderMailboxModal() {
  const overview = _mailboxOverview || {
    incomingRequests: [],
    outgoingRequests: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    conversations: [],
  };
  const activeConversation = overview.conversations?.find(c => String(c.friendshipId) === String(_mailboxActiveFriendshipId)) || null;

  const body = `
    <div class="mailbox-shell">
      <div class="mailbox-topline">
        <div class="mailbox-summary-card">
          <span>Friend Requests</span>
          <strong>${overview.pendingFriendRequestCount || 0}</strong>
        </div>
        <div class="mailbox-summary-card">
          <span>Match Requests</span>
          <strong>${overview.pendingMatchRequestCount || 0}</strong>
        </div>
        <div class="mailbox-summary-card">
          <span>Unread Chats</span>
          <strong>${overview.unreadCount || 0}</strong>
        </div>
        <div class="mailbox-summary-card">
          <span>Friends</span>
          <strong>${overview.friends?.length || 0}</strong>
        </div>
      </div>
      <div class="mailbox-grid">
        <div class="mailbox-panel">
          <div class="mailbox-section">
            <div class="mailbox-section-title">Incoming Match Requests</div>
            ${renderMailboxMatchRequestList(overview.incomingRequests, true)}
          </div>
          <div class="mailbox-section">
            <div class="mailbox-section-title">Outgoing Match Requests</div>
            ${renderMailboxMatchRequestList(overview.outgoingRequests, false)}
          </div>
          <div class="mailbox-section">
            <div class="mailbox-section-title">Friend Requests</div>
            ${renderMailboxFriendRequestList(overview.incomingFriendRequests, overview.outgoingFriendRequests)}
          </div>
          <div class="mailbox-section">
            <div class="mailbox-section-title">Friend List and Chats</div>
            ${renderMailboxConversationList(overview.conversations)}
          </div>
        </div>
        <div class="mailbox-panel mailbox-chat-panel">
          ${renderMailboxChatPanel(activeConversation)}
        </div>
      </div>
    </div>
  `;

  const modal = createModal('mailboxModal', 'Mailbox', body);
  openModal(modal);
}

function renderMailboxMatchRequestList(requests, incoming) {
  if (!requests?.length) return `<p class="text-muted text-sm">No ${incoming ? 'incoming' : 'outgoing'} match requests yet.</p>`;

  return `<div class="mailbox-list">${requests.map(request => {
    const user = incoming ? request.sender : request.receiver;
    const actions = incoming && request.status === 'pending'
      ? `<div class="mailbox-actions">
           <button class="btn btn-success btn-sm" onclick="respondMailboxRequest('${escHtml(request._id)}','accepted')">Accept</button>
           <button class="btn btn-danger btn-sm" onclick="respondMailboxRequest('${escHtml(request._id)}','rejected')">Reject</button>
         </div>`
      : request.friendshipId
        ? `<div class="mailbox-actions">
             <button class="btn btn-primary btn-sm" onclick="openMailboxChat('${escHtml(request.friendshipId)}')">Chat</button>
           </div>`
        : `<div class="mailbox-status-pill">${escHtml(request.status || 'pending')}</div>`;

    return `<div class="mailbox-item">
      <img src="${avatarFallback(user?.avatarUrl)}" class="mailbox-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div class="mailbox-copy">
        <div class="mailbox-title">${escHtml(user?.name || 'Player')}</div>
        <div class="mailbox-sub">${request.queuematePost ? `${escHtml(request.queuematePost.game || '')} · ${escHtml(request.queuematePost.playType || '')}` : 'QueueMate request'}</div>
        ${request.introMessage ? `<div class="mailbox-message-preview">${escHtml(truncate(request.introMessage, 110))}</div>` : ''}
        <div class="mailbox-time">${formatRelative(request.createdAt)}</div>
      </div>
      ${actions}
    </div>`;
  }).join('')}</div>`;
}

function renderMailboxFriendRequestList(incomingRequests, outgoingRequests) {
  const incoming = incomingRequests || [];
  const outgoing = outgoingRequests || [];

  if (!incoming.length && !outgoing.length) {
    return `<p class="text-muted text-sm">No friend requests right now.</p>`;
  }

  const items = [];

  incoming.forEach(request => {
    const user = request.sender || request.otherUser;
    items.push(`
      <div class="mailbox-item">
        <img src="${avatarFallback(user?.avatarUrl)}" class="mailbox-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
        <div class="mailbox-copy">
          <div class="mailbox-title">${escHtml(user?.name || 'Player')}</div>
          <div class="mailbox-sub">Sent you a friend request</div>
          <div class="mailbox-time">${formatRelative(request.createdAt)}</div>
        </div>
        <div class="mailbox-actions">
          <button class="btn btn-success btn-sm" onclick="respondFriendRequest('${escHtml(request._id)}','accepted',{ rerenderMailbox: true })">Accept</button>
          <button class="btn btn-danger btn-sm" onclick="respondFriendRequest('${escHtml(request._id)}','rejected',{ rerenderMailbox: true })">Reject</button>
        </div>
      </div>
    `);
  });

  outgoing.forEach(request => {
    const user = request.receiver || request.otherUser;
    items.push(`
      <div class="mailbox-item">
        <img src="${avatarFallback(user?.avatarUrl)}" class="mailbox-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
        <div class="mailbox-copy">
          <div class="mailbox-title">${escHtml(user?.name || 'Player')}</div>
          <div class="mailbox-sub">Friend request sent</div>
          <div class="mailbox-time">${formatRelative(request.createdAt)}</div>
        </div>
        <div class="mailbox-status-pill">Pending</div>
      </div>
    `);
  });

  return `<div class="mailbox-list">${items.join('')}</div>`;
}

function renderMailboxConversationList(conversations) {
  if (!conversations?.length) {
    return `<p class="text-muted text-sm">No friends yet. Send or accept friend requests to unlock chat.</p>`;
  }

  return `<div class="mailbox-list">${conversations.map(conversation => `
    <button type="button" class="mailbox-item mailbox-chat-trigger ${String(conversation.friendshipId) === String(_mailboxActiveFriendshipId) ? 'active' : ''}" onclick="openMailboxChat('${escHtml(conversation.friendshipId)}')">
      <img src="${avatarFallback(conversation.friend?.avatarUrl)}" class="mailbox-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
      <div class="mailbox-copy">
        <div class="mailbox-title">${escHtml(conversation.friend?.name || 'Friend')}</div>
        <div class="mailbox-sub">${conversation.latestMessage ? escHtml(truncate(conversation.latestMessage.text || '', 56)) : 'Start a conversation'}</div>
      </div>
      ${conversation.unreadCount ? `<span class="mailbox-unread">${conversation.unreadCount}</span>` : ''}
    </button>
  `).join('')}</div>`;
}

function renderMailboxChatPanel(conversation) {
  if (!conversation) {
    return `<div class="mailbox-chat-empty">
      <h3>Direct Messages</h3>
      <p>Select a friend from the mailbox to start chatting.</p>
    </div>`;
  }

  return `
    <div class="mailbox-chat-header">
      <div class="mailbox-chat-user">
        <img src="${avatarFallback(conversation.friend?.avatarUrl)}" class="mailbox-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
        <div>
          <div class="mailbox-title">${escHtml(conversation.friend?.name || 'Friend')}</div>
          <div class="mailbox-sub">Friends can chat here</div>
        </div>
      </div>
    </div>
    <div class="mailbox-chat-messages" id="mailboxChatMessages">
      ${renderMailboxMessages()}
    </div>
    <div class="mailbox-chat-compose">
      <textarea id="mailboxMessageInput" rows="3" placeholder="Type a message..."></textarea>
      <div class="mailbox-actions">
        <button class="btn btn-primary btn-sm" onclick="sendMailboxMessage('${escHtml(conversation.friendshipId)}')">Send</button>
      </div>
    </div>
  `;
}

function renderMailboxMessages() {
  if (!_mailboxMessages.length) {
    return `<p class="text-muted text-sm">No messages yet. Say hello and start planning your match.</p>`;
  }

  const me = getCurrentUser();
  return _mailboxMessages.map(message => {
    const mine = String(message.sender?._id || message.sender) === String(me?._id);
    return `<div class="mailbox-bubble-row ${mine ? 'mine' : ''}">
      <div class="mailbox-bubble ${mine ? 'mine' : ''}">
        <div>${escHtml(message.text || '')}</div>
        <div class="mailbox-bubble-time">${formatRelative(message.createdAt)}</div>
      </div>
    </div>`;
  }).join('');
}

async function respondMailboxRequest(requestId, status) {
  try {
    const d = await apiPut(`/queuemates/requests/${requestId}/respond`, { status }, true);
    showToast(`Request ${status}`, 'success');
    await loadMailboxOverview(false);

    if (status === 'accepted' && d?.friendshipId) {
      _mailboxActiveFriendshipId = d.friendshipId;
      _mailboxMessages = [];
      await loadMailboxMessages(d.friendshipId, false);
    }

    syncSocialUIAfterOverview({ rerenderMailbox: true, rerenderDashboardPage: true });
  } catch (e) {
    showToast(e.message || 'Failed to update request', 'error');
  }
}

async function openMailboxChat(friendshipId) {
  _mailboxActiveFriendshipId = friendshipId;
  _mailboxMessages = [];
  renderMailboxModal();
  await loadMailboxMessages(friendshipId, true);
}

async function loadMailboxMessages(friendshipId, rerender = true) {
  const targetId = String(friendshipId || '');
  _mailboxLoadingFriendshipId = targetId;

  try {
    const d = await apiGet(`/social/conversations/${friendshipId}/messages`, true);
    if (_mailboxLoadingFriendshipId !== targetId || String(_mailboxActiveFriendshipId) !== targetId) return;

    _mailboxMessages = d.messages || [];
    await loadMailboxOverview();
    if (rerender) renderMailboxModal();
  } catch (e) {
    showToast(e.message || 'Failed to load messages', 'error');
  }
}

async function sendMailboxMessage(friendshipId) {
  const input = document.getElementById('mailboxMessageInput');
  const text = input?.value.trim();
  if (!text) return;

  try {
    await apiPost(`/social/conversations/${friendshipId}/messages`, { text }, true);
    if (input) input.value = '';
    await loadMailboxMessages(friendshipId, false);
    renderMailboxModal();
  } catch (e) {
    showToast(e.message || 'Failed to send message', 'error');
  }
}

function renderFriendRequestRailCard(elementId, data, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const incoming = (data?.incomingFriendRequests || []).slice(0, options.limit || 4);
  const outgoing = incoming.length ? [] : (data?.outgoingFriendRequests || []).slice(0, 2);

  let content = '';

  if (incoming.length) {
    content = incoming.map(request => {
      const user = request.sender || request.otherUser;
      const avatar = profileAnchor(
        user,
        `<img src="${avatarFallback(user?.avatarUrl)}" class="widget-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`,
        'profile-entry-link profile-avatar-link'
      );
      const name = profileAnchor(
        user,
        `<div class="widget-item-title">${escHtml(user?.name || 'Player')}</div>`,
        'profile-entry-link'
      );
      return `
        <div class="widget-item widget-item-card widget-item-static">
          ${avatar}
          <div class="widget-item-stack">
            ${name}
            <div class="widget-item-sub">Sent you a friend request · ${formatRelative(request.createdAt)}</div>
            <div class="widget-inline-actions">
              <button class="btn btn-success btn-sm" onclick="respondFriendRequest('${escHtml(request._id)}','accepted',{ rerenderDashboardPage: true })">Accept</button>
              <button class="btn btn-danger btn-sm" onclick="respondFriendRequest('${escHtml(request._id)}','rejected',{ rerenderDashboardPage: true })">Reject</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else if (outgoing.length) {
    content = outgoing.map(request => {
      const user = request.receiver || request.otherUser;
      const avatar = profileAnchor(
        user,
        `<img src="${avatarFallback(user?.avatarUrl)}" class="widget-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">`,
        'profile-entry-link profile-avatar-link'
      );
      const name = profileAnchor(
        user,
        `<div class="widget-item-title">${escHtml(user?.name || 'Player')}</div>`,
        'profile-entry-link'
      );
      return `
        <div class="widget-item widget-item-card widget-item-static">
          ${avatar}
          <div class="widget-item-stack">
            ${name}
            <div class="widget-item-sub">Request sent · ${formatRelative(request.createdAt)}</div>
          </div>
          <div class="mailbox-status-pill">Pending</div>
        </div>
      `;
    }).join('');
  } else {
    content = `<p class="text-muted text-sm">${escHtml(options.emptyText || 'No pending friend requests.')}</p>`;
  }

  if (options.showOpenMailbox) {
    content += `<button class="btn btn-ghost btn-sm btn-full" style="margin-top:12px" onclick="openMailbox()">Open Mailbox</button>`;
  }

  el.innerHTML = `
    <div class="widget-header">
      <div>
        <div class="widget-eyebrow">${escHtml(options.eyebrow || 'Social')}</div>
        <h4>${escHtml(options.title || 'Friend Requests')}</h4>
      </div>
    </div>
    ${content}
  `;
}

function renderFriendListRailCard(elementId, data, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const friends = (data?.friends || []).slice().sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return new Date(b.lastSeenAt || b.createdAt || 0) - new Date(a.lastSeenAt || a.createdAt || 0);
  }).slice(0, options.limit || 6);

  const content = friends.length
    ? friends.map(item => `
      <div class="widget-item widget-item-card widget-item-static widget-friend-card ${item.isActive ? 'active' : ''}">
        ${profileAnchor(item.friend, `<div class="widget-avatar-wrap">
          <img src="${avatarFallback(item.friend?.avatarUrl)}" class="widget-avatar" alt="" onerror="this.src='assets/default-avatar.svg'">
          <span class="friend-status-dot ${item.isActive ? 'online' : 'offline'}"></span>
        </div>`, 'profile-entry-link profile-avatar-link')}
        <div class="widget-item-stack">
          ${profileAnchor(item.friend, `<div class="widget-item-title">${escHtml(item.friend?.name || 'Friend')}</div>`, 'profile-entry-link')}
          <div class="widget-item-sub">${item.isActive ? 'Online now' : (item.lastSeenAt ? `Active ${formatRelative(item.lastSeenAt)}` : `Connected ${formatRelative(item.createdAt)}`)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openMailbox('${escHtml(item._id)}')">Chat</button>
      </div>
    `).join('')
    : `<p class="text-muted text-sm">${escHtml(options.emptyText || 'No friends yet.')}</p>`;

  el.innerHTML = `
    <div class="widget-header">
      <div>
        <div class="widget-eyebrow">${escHtml(options.eyebrow || 'Crew')}</div>
        <h4>${escHtml(options.title || 'Friend List')}</h4>
      </div>
    </div>
    ${content}
  `;
}

function initSidebar() {
  const el = document.getElementById('sidebarLeft');
  if (!el) return;

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const active = href => href === page ? 'active' : '';

  el.innerHTML = `
    <div class="sidebar-panel">
      <div class="sidebar-panel-glow"></div>
      <div class="sidebar-brand-block">
        <div class="sidebar-brand-icon">Q</div>
        <div>
          <div class="sidebar-brand-title">QueueMate</div>
          <div class="sidebar-brand-subtitle">Gaming social feed</div>
        </div>
      </div>

      ${loggedIn && user
        ? `<a href="dashboard.html" class="sidebar-mini-profile premium-profile">
             <img src="${avatarFallback(user.avatarUrl)}" alt="avatar" onerror="this.src='assets/default-avatar.svg'">
             <div>
               <div class="mini-name">${escHtml(user.name)}</div>
               <div class="mini-sub">${escHtml(user.email || '')}</div>
             </div>
           </a>`
        : `<div class="sidebar-card sidebar-cta-card">
             <div class="sidebar-card-chip">Join QueueMate</div>
             <h4>Build your local gaming presence</h4>
             <p>Post updates, find teammates, and track upcoming tournaments from one premium home feed.</p>
             <a href="register.html" class="btn btn-primary btn-sm btn-full">Get Started</a>
           </div>`}

      <div class="sidebar-card sidebar-nav-card">
        <div class="sidebar-card-title">Navigation</div>
        <div class="sidebar-nav-links">
          <a href="index.html" class="${active('index.html')}">Home</a>
          <a href="find-queuemate.html" class="${active('find-queuemate.html')}">Find QueueMate</a>
          <a href="tournaments.html" class="${active('tournaments.html')}">Tournaments</a>
          ${loggedIn ? `<a href="dashboard.html" class="${active('dashboard.html')}">My Profile</a>` : ''}
          ${isAdmin() ? `<a href="admin.html" class="${active('admin.html')}">Admin Panel</a>` : ''}
        </div>
      </div>

      <div class="sidebar-card">
        <div class="game-chips game-chip-logos" aria-label="Tracked games">
          <span class="game-chip game-chip-logo" data-game="valorant" title="Valorant">
            <img src="assets/game-valorant.jpg" alt="Valorant">
          </span>
          <span class="game-chip game-chip-logo" data-game="pubgm" title="PUBG Mobile">
            <img src="assets/game-pubgm.jpg" alt="PUBG Mobile">
          </span>
          <span class="game-chip game-chip-logo" data-game="ff" title="Free Fire">
            <img src="assets/game-ff.jpg" alt="Free Fire">
          </span>
          <span class="game-chip game-chip-logo" data-game="mlbb" title="Mobile Legends">
            <img src="assets/game-mlbb.jpg" alt="Mobile Legends">
          </span>
        </div>
      </div>

      ${loggedIn ? `<div class="sidebar-card">
        <div class="sidebar-card-title">Quick Actions</div>
        <div class="sidebar-nav-links quick-links">
          <a href="index.html">New Post</a>
          <a href="find-queuemate.html">Find Teammate</a>
          <a href="tournaments.html#create-tournament">Post Tournament</a>
          <a href="#" onclick="openMailbox();return false;">Mailbox</a>
        </div>
      </div>` : ''}
    </div>
  `;
}

async function initSidebarRight() {
  const el = document.getElementById('sidebarRight');
  if (!el) return;

  const loggedIn = isLoggedIn();
  el.innerHTML = `
    <div class="right-rail">
      <div class="sidebar-card rail-card" id="socialFriendRequestsRail">
        <div class="widget-header">
          <div>
            <div class="widget-eyebrow">Social</div>
            <h4>Friend Requests</h4>
          </div>
        </div>
        <p class="text-muted text-sm">${loggedIn ? 'Loading...' : 'Log in to see your friend requests.'}</p>
      </div>
      <div class="sidebar-card rail-card" id="socialFriendsRail">
        <div class="widget-header">
          <div>
            <div class="widget-eyebrow">Crew</div>
            <h4>Friend List</h4>
          </div>
        </div>
        <p class="text-muted text-sm">${loggedIn ? 'Loading...' : 'Log in to see your friend list.'}</p>
      </div>
    </div>
  `;

  if (loggedIn) {
    if (!_mailboxOverview) await loadMailboxOverview();
    else syncSocialRailWidgets();
  }

  return;

  try {
    const d = await apiGet('/queuemates?limit=3');
    const items = (d.queuemates || []).slice(0, 3);
    const wq = document.getElementById('wQueuemates');
    if (wq) {
      wq.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Right Rail</div><h4>Active QueueMate Posts</h4></div></div>` +
        (items.length ? items.map(q => `
          <div class="widget-item" onclick="location.href='find-queuemate.html'">
            <div class="widget-item-stack">
              <div class="widget-item-badges">${gameBadgeHTML(q.game)}</div>
              <div class="widget-item-title">${escHtml(q.user?.name || 'Unknown')}</div>
              <div class="widget-item-sub">${escHtml(q.rank || '')} · ${escHtml(q.playType || '')}</div>
            </div>
          </div>`).join('') : '<p class="text-muted text-sm">No active posts</p>');
    }
  } catch {}

  try {
    const d = await apiGet('/tournaments?limit=3');
    const items = (d.tournaments || []).slice(0, 3).map(t => ({
      ...t,
      _tier: calcTier(t.prizePool),
      _status: calcStatus(t.startDate, t.endDate),
    }));
    const wt = document.getElementById('wTournaments');
    if (wt) {
      wt.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Events</div><h4>Latest Tournaments</h4></div></div>` +
        (items.length ? items.map(t => `
          <div class="widget-item" onclick="location.href='tournaments.html'">
            <div class="widget-item-stack">
              <div class="widget-item-badges">${gameBadgeHTML(t.game)}${tierBadgeHTML(t._tier)}</div>
              <div class="widget-item-title">${escHtml(truncate(t.title, 38))}</div>
              <div class="widget-item-sub">${escHtml(t.organizerName || '')} · ${formatDate(t.startDate)}</div>
            </div>
          </div>`).join('') : '<p class="text-muted text-sm">No tournaments yet</p>');
    }
  } catch {}

  try {
    const d = await apiGet('/posts?limit=3');
    const items = (d.posts || []).slice(0, 3);
    const wp = document.getElementById('wPosts');
    if (wp) {
      wp.innerHTML = `<div class="widget-header"><div><div class="widget-eyebrow">Community</div><h4>Latest Updates</h4></div></div>` +
        (items.length ? items.map(post => `
          <div class="widget-item" onclick="location.href='index.html'">
            <div class="widget-item-stack">
              <div class="widget-item-badges">${categoryBadgeHTML(post.category || 'news')}</div>
              <div class="widget-item-title">${escHtml(truncate(post.content, 52))}</div>
              <div class="widget-item-sub">${escHtml(post.user?.name || '')} · ${formatRelative(post.createdAt)}</div>
            </div>
          </div>`).join('') : '<p class="text-muted text-sm">No posts yet</p>');
    }
  } catch {}
}
