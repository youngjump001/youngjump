// ============ YoungJump UI 工具：图标、Toast、Sheet ============

const Icons = {
  import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  favorite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3.5C14 6 15.5 5 17.5 5 21 5 23 8.5 21.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  favoriteFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3.5C14 6 15.5 5 17.5 5 21 5 23 8.5 21.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
  bookmarkFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12l-8 8-8-8V4h8z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>',
  setting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z"/></svg>',
  cache: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a5 5 0 0 0-10 0"/><path d="M3 8a5 5 0 0 0 10 0"/><path d="M3 8v8a5 5 0 0 0 10 0V8"/><path d="M13 12a5 5 0 0 1 10 0v6a2 2 0 0 1-2 2h-6"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
};

function icon(name, size) {
  const s = Icons[name] || '';
  const sz = size || 20;
  return `<span class="icon-inline" style="width:${sz}px;height:${sz}px;display:inline-flex;flex:none">${s.replace('<svg ', `<svg width="${sz}" height="${sz}" `)}</span>`;
}

// ============ Toast ============
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ============ Sheet（底部弹出） ============
function showSheet({ title, options, onSelect }) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = '';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  const optsHtml = options.map((o, i) => {
    const active = o.active ? ' active' : '';
    const check = o.active ? '<svg class="check" viewBox="0 0 24 24"><path d="M5 12l5 5 9-9"/></svg>' : '<svg class="check" viewBox="0 0 24 24"><path d="M5 12l5 5 9-9"/></svg>';
    return `<div class="sheet-option${active}" data-i="${i}">
      <span>${o.label}</span>${check}
    </div>`;
  }).join('');
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${title || ''}</div>
    <div class="sheet-body">${optsHtml}</div>
  `;
  overlay.appendChild(sheet);
  overlay.classList.add('show');
  requestAnimationFrame(() => sheet.classList.add('show'));

  function close() {
    sheet.classList.remove('show');
    overlay.classList.remove('show');
    setTimeout(() => overlay.innerHTML = '', 300);
    document.removeEventListener('click', outsideHandler);
  }
  function outsideHandler(e) {
    if (e.target === overlay) close();
  }
  document.addEventListener('click', outsideHandler);

  sheet.querySelectorAll('.sheet-option').forEach(el => {
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.i);
      close();
      onSelect && onSelect(i, options[i]);
    });
  });
}

// ============ 确认对话框 ============
function showConfirm({ title, message, onConfirm }) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = '';
  const dlg = document.createElement('div');
  dlg.className = 'dialog';
  dlg.innerHTML = `
    <div class="dialog-box">
      <div class="dialog-title">${title || '确认'}</div>
      <div class="dialog-msg">${message || ''}</div>
      <div class="dialog-actions">
        <button class="dialog-btn cancel">取消</button>
        <button class="dialog-btn ok">确定</button>
      </div>
    </div>
  `;
  overlay.appendChild(dlg);
  overlay.classList.add('show');
  function close() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
  dlg.querySelector('.cancel').onclick = close;
  dlg.querySelector('.ok').onclick = () => { close(); onConfirm && onConfirm(); };
  dlg.querySelector('.dialog-box').onclick = (e) => e.stopPropagation();
  overlay.onclick = close;
}

// 对话框样式（注入）
const dialogStyle = document.createElement('style');
dialogStyle.textContent = `
.dialog { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:30px; z-index:102; }
.dialog-box { background:var(--bg-elevated); border-radius:18px; padding:22px; width:100%; max-width:320px; box-shadow:var(--shadow-lg); }
.dialog-title { font-size:16px; font-weight:700; }
.dialog-msg { margin-top:10px; font-size:14px; color:var(--text-2); line-height:1.6; word-break:break-all; }
.dialog-actions { display:flex; gap:10px; margin-top:20px; }
.dialog-btn { flex:1; height:40px; border-radius:20px; border:none; font-size:14px; font-weight:600; cursor:pointer; }
.dialog-btn.cancel { background:var(--bg); color:var(--text-2); }
.dialog-btn.ok { background:var(--brand-grad); color:#fff; }
`;
document.head.appendChild(dialogStyle);

export { Icons, icon, toast, showSheet, showConfirm };
