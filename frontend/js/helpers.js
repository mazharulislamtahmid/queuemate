function formatDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
function formatRelative(d) {
  if(!d) return '';
  const diff=(new Date()-new Date(d))/1000;
  if(diff<60) return 'just now';
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  if(diff<604800) return `${Math.floor(diff/86400)}d ago`;
  return formatDate(d);
}
function truncate(s,n=120){if(!s)return '';return s.length>n?s.slice(0,n)+'…':s;}
function escHtml(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escJsArg(s){return escHtml(JSON.stringify(String(s ?? '')));}
function avatarFallback(url){return url||'assets/default-avatar.svg';}
function coverFallback(url){return url||'assets/default-poster.svg';}
function posterFallback(url){return url||'assets/default-poster.svg';}
function isValidDataImage(s){return typeof s==='string'&&/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s);}
function isValidUrl(s){if(!s)return true;if(isValidDataImage(s))return true;try{const u=new URL(s);return u.protocol==='http:'||u.protocol==='https:';}catch{return false;}}
function isValidEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
function calcTier(p){const n=Number(p)||0;if(n>50000)return 'S';if(n>20000)return 'A';if(n>5000)return 'B';return 'C';}
function calcStatus(s,e){const now=new Date(),start=new Date(s),end=new Date(e);if(now<start)return 'upcoming';if(now<=end)return 'ongoing';return 'over';}
function calcQmExpiry(createdAt){const exp=new Date(new Date(createdAt).getTime()+7*24*60*60*1000);return Math.ceil((exp-new Date())/(1000*60*60*24));}
function isQmExpired(createdAt){return calcQmExpiry(createdAt)<=0;}
function expiryLabel(createdAt){const d=calcQmExpiry(createdAt);if(d<=0)return{text:'Expired',soon:false,expired:true};if(d===1)return{text:'Expires today',soon:true,expired:false};return{text:`Expires in ${d} day${d!==1?'s':''}`,soon:d<=2,expired:false};}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file, options = {}) {
  const maxWidth = options.maxWidth || 1280;
  const maxHeight = options.maxHeight || 1280;
  const quality = options.quality || 0.74;

  if (!file || !file.type?.startsWith('image/')) throw new Error('Please choose an image file');

  const originalDataUrl = await readFileAsDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const probe = new Image();
    probe.onload = () => resolve(probe);
    probe.onerror = () => reject(new Error('Failed to read image'));
    probe.src = originalDataUrl;
  });

  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  if (!sourceWidth || !sourceHeight) return { dataUrl: originalDataUrl, width: 0, height: 0 };

  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: originalDataUrl, width: sourceWidth, height: sourceHeight };

  ctx.drawImage(img, 0, 0, width, height);
  const type = file.type === 'image/png' && file.size < 700 * 1024 ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(type, type === 'image/jpeg' ? quality : undefined);
  return { dataUrl: dataUrl.length < originalDataUrl.length ? dataUrl : originalDataUrl, width, height };
}

function populateRankDropdown(sel,game){sel.innerHTML='<option value="">— Select Rank —</option>';const cfg=GAME_CONFIG[game];if(!cfg)return;cfg.ranks.forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;sel.appendChild(o);});}
function populateTeammateDropdown(sel,game){sel.innerHTML='<option value="">— Select Need —</option>';const cfg=GAME_CONFIG[game];if(!cfg)return;cfg.teammates.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o);});}

function gameBadgeHTML(g){const cfg=GAME_CONFIG[g];if(!cfg)return `<span class="badge">${escHtml(g)}</span>`;return `<span class="badge badge-game ${cfg.badgeClass}">${cfg.label}</span>`;}
function tierBadgeHTML(t){return `<span class="badge badge-tier-${(t||'c').toLowerCase()}">Tier ${escHtml(t)}</span>`;}
function statusBadgeHTML(s){const m={upcoming:'badge-upcoming',ongoing:'badge-ongoing',over:'badge-over'};return `<span class="badge ${m[s]||'badge-over'}">${escHtml((s||'').charAt(0).toUpperCase()+(s||'').slice(1))}</span>`;}
function categoryBadgeHTML(c){const m={news:'badge-news',result:'badge-result',recruitment:'badge-recruitment'};return `<span class="badge ${m[c]||'badge-news'}">${escHtml(c)}</span>`;}
function getUserId(user){return user?._id||user?.id||user||'';}
function profileHref(user){const id=getUserId(user);return id?`dashboard.html?user=${encodeURIComponent(id)}`:'dashboard.html';}
function profileAnchor(user, inner, className=''){const id=getUserId(user);return id?`<a href="${profileHref(id)}" class="${className}">${inner}</a>`:inner;}
