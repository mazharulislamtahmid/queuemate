let _toastCont = null;
function _getToast(){if(!_toastCont){_toastCont=document.createElement('div');_toastCont.className='toast-container';document.body.appendChild(_toastCont);}return _toastCont;}
function showToast(msg,type='info',dur=3500){
  const c=_getToast();
  const icons={success:'✓',error:'✕',info:'ℹ'};
  const t=document.createElement('div');
  t.className=`toast toast-${type}`;
  t.innerHTML=`<span>${icons[type]||'ℹ'}</span><span>${escHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(()=>t.remove(),300);},dur);
}
function spinnerHTML(msg='Loading…'){return `<div class="spinner-wrap"><div class="spinner"></div><span class="text-muted text-sm">${escHtml(msg)}</span></div>`;}
function emptyStateHTML(icon,title,sub=''){return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${escHtml(title)}</h3>${sub?`<p>${escHtml(sub)}</p>`:''}</div>`;}
function errorStateHTML(msg='Failed to load content.'){return `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Something went wrong</h3><p>${escHtml(msg)}</p></div>`;}
function setLoading(el,msg){el.innerHTML=spinnerHTML(msg);}
function setEmpty(el,icon,title,sub){el.innerHTML=emptyStateHTML(icon,title,sub);}
function setError(el,msg){el.innerHTML=errorStateHTML(msg);}
function openModal(el){el.classList.add('open');document.body.style.overflow='hidden';}
function closeModal(el){if(el){el.classList.remove('open');document.body.style.overflow='';}}
function createModal(id,title,body,footer=''){
  const ex=document.getElementById(id);if(ex)ex.remove();
  const ov=document.createElement('div');
  ov.className='modal-overlay';ov.id=id;
  ov.innerHTML=`<div class="modal"><div class="modal-header"><span class="modal-title">${escHtml(title)}</span><button class="modal-close" onclick="closeModal(document.getElementById('${escHtml(id)}'))">✕</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)closeModal(ov);});
  document.body.appendChild(ov);return ov;
}
function setSubmitting(btn,loading){
  if(loading){btn.dataset.orig=btn.textContent;btn.textContent='Submitting…';btn.disabled=true;}
  else{btn.textContent=btn.dataset.orig||'Submit';btn.disabled=false;}
}

// Confirm dialog
let _pendingConfirm=null;
function showConfirm(title,msg,onConfirm,confirmLabel='Delete'){
  let box=document.getElementById('confirmOverlay');
  if(!box){
    box=document.createElement('div');box.className='confirm-overlay';box.id='confirmOverlay';
    box.innerHTML=`<div class="confirm-box"><div class="confirm-icon">⚠️</div><h3 id="confirmTitle"></h3><p id="confirmMsg"></p><div class="confirm-actions"><button class="btn btn-ghost" onclick="closeConfirm()">Cancel</button><button class="btn btn-danger" id="confirmOkBtn">Delete</button></div></div>`;
    document.body.appendChild(box);
    document.getElementById('confirmOkBtn').addEventListener('click',()=>{if(_pendingConfirm){_pendingConfirm();_pendingConfirm=null;}closeConfirm();});
  }
  document.getElementById('confirmTitle').textContent=title;
  document.getElementById('confirmMsg').textContent=msg;
  document.getElementById('confirmOkBtn').textContent=confirmLabel;
  _pendingConfirm=onConfirm;
  box.classList.add('open');
}
function closeConfirm(){const b=document.getElementById('confirmOverlay');if(b)b.classList.remove('open');}
