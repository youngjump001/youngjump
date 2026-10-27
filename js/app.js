// ============ YoungJump 主应用 ============

import { Comics, Pages, Settings, Store, isImage, isZip, sortByNumber, guessTitle, fileToDataURL, makeThumb, uid, idbGetAll } from './storage.js';
import { icon, toast, showSheet, showConfirm } from './ui.js';
import { Reader } from './reader.js';

const pageContainer = document.getElementById('page-container');
const topbarTitle = document.getElementById('topbar-title');
const topbarActions = document.getElementById('topbar-actions');
const tabbar = document.getElementById('tabbar');

// 当前视图状态
let currentView = 'shelf';
let viewParams = {};

// ============ 主题 ============
function applyTheme(theme) {
  let resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#121216' : '#FF6B35');
}

async function initTheme() {
  const theme = await Settings.get('theme');
  Store.settings.theme = theme || 'system';
  applyTheme(Store.settings.theme);
}

// ============ 顶部栏 ============
function setTopbar(title, actionsHtml) {
  topbarTitle.innerHTML = title;
  topbarActions.innerHTML = actionsHtml || '';
}

// ============ 路由 ============
const routes = {
  shelf: renderShelf,
  search: renderSearch,
  mine: renderMine,
  detail: renderDetail,
  history: renderHistoryList,
  favorite: renderFavoriteList,
  settings: renderSettings,
  about: renderAbout,
};

function navigate(view, params) {
  currentView = view;
  viewParams = params || {};
  const fn = routes[view];
  if (fn) fn();
  // 更新 tabbar 激活
  const tabMap = { shelf: 'shelf', search: 'search', mine: 'mine' };
  const activeTab = tabMap[view];
  if (activeTab) {
    tabbar.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === activeTab);
    });
  }
}

// ============ 书架页面 ============
async function renderShelf() {
  setTopbar('<span class="accent">YoungJump</span>', `
    <button class="btn-icon" id="btn-import" title="导入漫画">${icon('import', 20)}</button>
  `);
  Store.comics = await Comics.list();

  const el = pageContainer;
  if (Store.comics.length === 0) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${icon('book', 44)}</div>
        <h3>书架空空如也</h3>
        <p>导入本地的漫画图片或 ZIP 压缩包<br/>即可开始免费阅读，无需注册</p>
        <button class="btn btn-primary" id="btn-import-empty">${icon('import', 18)} 导入漫画</button>
      </div>
    `;
  } else {
    // 分组：最近阅读 + 全部
    const recent = Store.comics.filter(c => c.lastReadAt).slice(0, 6);
    let html = '';
    if (recent.length > 0) {
      html += `<div class="section-title"><h2>最近阅读</h2></div>`;
      html += `<div class="comic-grid">${recent.map(comicCard).join('')}</div>`;
    }
    html += `<div class="section-title"><h2>全部漫画 <span style="color:var(--text-3);font-weight:400;font-size:13px">${Store.comics.length} 本</span></h2></div>`;
    html += `<div class="comic-grid">${Store.comics.map(comicCard).join('')}</div>`;
    el.innerHTML = html;
  }

  document.getElementById('btn-import')?.addEventListener('click', importComics);
  document.getElementById('btn-import-empty')?.addEventListener('click', importComics);
  el.querySelectorAll('.comic-card').forEach(card => {
    card.addEventListener('click', () => navigate('detail', { id: card.dataset.id }));
  });
  el.querySelectorAll('.comic-card').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showComicMenu(card.dataset.id);
    });
    card.addEventListener('longpress', () => showComicMenu(card.dataset.id));
  });
}

function comicCard(c) {
  const cover = c.cover
    ? `<img src="${c.cover}" loading="lazy" alt="${c.title}">`
    : `<div class="placeholder-cover">${c.title.slice(0, 1)}</div>`;
  const progress = c.lastPage ? `${c.lastPage}/${c.pageCount}页` : `${c.pageCount}页`;
  return `<div class="comic-card" data-id="${c.id}">
    <div class="comic-cover">${cover}</div>
    <div class="comic-title">${esc(c.title)}</div>
    <div class="comic-meta">${progress}</div>
  </div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showComicMenu(id) {
  showSheet({
    title: '漫画操作',
    options: [
      { label: '阅读', icon: 'book' },
      { label: '编辑信息', icon: 'tag' },
      { label: '收藏/取消收藏', icon: 'favorite' },
      { label: '删除漫画', icon: 'trash', danger: true },
    ],
    onSelect: async (i) => {
      const c = await Comics.get(id);
      if (i === 0) { navigate('detail', { id }); }
      else if (i === 1) { editComicInfo(id); }
      else if (i === 2) { c.favorite = !c.favorite; await Comics.save(c); Store.comics = await Comics.list(); toast(c.favorite ? '已收藏' : '已取消收藏'); renderShelf(); }
      else if (i === 3) {
        showConfirm({ title: '删除漫画', message: `确定删除「${c.title}」吗？此操作不可恢复。`, onConfirm: async () => { await Comics.remove(id); Store.comics = await Comics.list(); toast('已删除'); renderShelf(); } });
      }
    },
  });
}

// ============ 导入漫画 ============
function importComics() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,.cbz,.jpg,.jpeg,.png,.webp,.gif,.bmp';
  input.multiple = true;
  input.onchange = async () => {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    toast('正在导入...');
    const zips = files.filter(f => isZip(f.name));
    const imgs = files.filter(f => isImage(f.name));

    if (zips.length > 0) {
      for (const zip of zips) await importZip(zip);
    }
    if (imgs.length > 0) {
      await importImageGroup(imgs);
    }
    Store.comics = await Comics.list();
    toast(`导入完成`);
    renderShelf();
  };
  input.click();
}

// 动态加载 JSZip
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'js/jszip.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.JSZip;
}

async function importZip(file) {
  try {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(e => !e.dir && isImage(e.name));
    if (entries.length === 0) { toast(`${file.name} 中没有图片`); return; }
    entries.sort((a, b) => sortByNumber(a.name, b.name));

    const id = uid();
    // 封面
    let cover = null;
    const firstEntry = entries[0];
    const coverBlob = await firstEntry.async('blob');
    const coverURL = await fileToDataURL(coverBlob);
    cover = await makeThumb(coverURL);

    const comic = {
      id, title: guessTitle(file.name), cover, pageCount: entries.length,
      createdAt: Date.now(), lastReadAt: 0, lastPage: 0,
      favorite: false, author: '', tags: [], source: 'zip',
    };
    await Comics.save(comic);

    // 逐页保存 blob
    for (let i = 0; i < entries.length; i++) {
      const blob = await entries[i].async('blob');
      await Pages.savePage(id, i, blob);
    }
  } catch (e) {
    console.error(e);
    toast(`导入 ${file.name} 失败`);
  }
}

async function importImageGroup(files) {
  // 单张图片 → 一本单页漫画；多张 → 一本多页漫画
  const sorted = files.slice().sort((a, b) => sortByNumber(a.name, b.name));
  const id = uid();
  const cover = await makeThumb(await fileToDataURL(sorted[0]));
  const title = guessTitle(sorted[0].name);
  const comic = {
    id, title, cover, pageCount: sorted.length,
    createdAt: Date.now(), lastReadAt: 0, lastPage: 0,
    favorite: false, author: '', tags: [], source: 'images',
  };
  await Comics.save(comic);
  for (let i = 0; i < sorted.length; i++) {
    await Pages.savePage(id, i, sorted[i]);
  }
}

// ============ 详情页 ============
async function renderDetail() {
  const id = viewParams.id;
  const c = await Comics.get(id);
  if (!c) { navigate('shelf'); return; }
  setTopbar(esc(c.title), `
    <button class="btn-icon" id="detail-fav">${c.favorite ? icon('favoriteFill', 20) : icon('favorite', 20)}</button>
    <button class="btn-icon" id="detail-menu">${icon('more', 20)}</button>
  `);

  const cover = c.cover ? `<img src="${c.cover}">` : `<div class="placeholder-cover">${c.title.slice(0,1)}</div>`;
  const lastInfo = c.lastPage > 0 ? `上次读到第 ${c.lastPage} 页` : '尚未开始阅读';
  pageContainer.innerHTML = `
    <div class="detail-hero">
      <div class="detail-cover">${cover}</div>
      <div class="detail-info">
        <div class="detail-title">${esc(c.title)}</div>
        <div class="detail-sub">${c.author ? '作者：' + esc(c.author) + '<br/>' : ''}共 ${c.pageCount} 页<br/>${lastInfo}</div>
        <div class="detail-actions">
          <button class="btn btn-primary" id="btn-read">${c.lastPage > 0 ? '继续阅读' : '开始阅读'}</button>
        </div>
      </div>
    </div>
    ${c.tags && c.tags.length ? `<div class="tag-row">${c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="section-title"><h2>目录</h2></div>
    <div class="list-card" id="btn-catalog">
      <div class="list-thumb"><div class="placeholder-cover" style="font-size:20px">${icon('list', 20)}</div></div>
      <div class="list-info"><div class="list-title">全部 ${c.pageCount} 页</div><div class="list-sub">点击查看并跳转</div></div>
    </div>
  `;

  document.getElementById('btn-read').addEventListener('click', () => Reader.open(c.id, c.lastPage || 1));
  document.getElementById('detail-fav').addEventListener('click', async () => {
    c.favorite = !c.favorite;
    await Comics.save(c);
    document.getElementById('detail-fav').innerHTML = c.favorite ? icon('favoriteFill', 20) : icon('favorite', 20);
    toast(c.favorite ? '已收藏' : '已取消收藏');
  });
  document.getElementById('detail-menu').addEventListener('click', () => showComicMenu(id));
  document.getElementById('btn-catalog').addEventListener('click', () => showCatalog(id, c));
}

function showCatalog(comicId, c) {
  const opts = [];
  for (let i = 1; i <= c.pageCount; i++) opts.push({ label: `第 ${i} 页` });
  showSheet({ title: '目录', options: opts.slice(0, 200), onSelect: (i) => Reader.open(comicId, i + 1) });
}

// ============ 编辑信息 ============
function editComicInfo(id) {
  Comics.get(id).then(c => {
    showSheet({
      title: '编辑信息',
      options: [
        { label: '修改标题' },
        { label: '设置作者' },
        { label: '管理标签' },
      ],
      onSelect: async (i) => {
        if (i === 0) promptText('新标题', c.title, async (v) => { c.title = v; await Comics.save(c); renderDetail(); });
        if (i === 1) promptText('作者', c.author, async (v) => { c.author = v; await Comics.save(c); renderDetail(); });
        if (i === 2) promptText('标签（逗号分隔）', (c.tags || []).join(','), async (v) => { c.tags = v.split(/[,，]/).map(s => s.trim()).filter(Boolean); await Comics.save(c); renderDetail(); });
      },
    });
  });
}

function promptText(title, value, onSave) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = '';
  const dlg = document.createElement('div');
  dlg.className = 'dialog';
  dlg.innerHTML = `
    <div class="dialog-box">
      <div class="dialog-title">${title}</div>
      <input class="dialog-input" value="${esc(value)}" />
      <div class="dialog-actions">
        <button class="dialog-btn cancel">取消</button>
        <button class="dialog-btn ok">保存</button>
      </div>
    </div>
  `;
  overlay.appendChild(dlg);
  overlay.classList.add('show');
  const input = dlg.querySelector('.dialog-input');
  const close = () => { overlay.classList.remove('show'); overlay.innerHTML = ''; };
  dlg.querySelector('.cancel').onclick = close;
  dlg.querySelector('.ok').onclick = () => { const v = input.value.trim(); close(); if (v) onSave(v); };
  dlg.querySelector('.dialog-box').onclick = e => e.stopPropagation();
  overlay.onclick = close;
  setTimeout(() => input.focus(), 100);
}
// 输入框样式
const inputStyle = document.createElement('style');
inputStyle.textContent = `.dialog-input { width:100%; margin-top:14px; height:42px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); padding:0 12px; font-size:14px; outline:none; }`;
document.head.appendChild(inputStyle);

// ============ 搜索 ============
function renderSearch() {
  setTopbar('搜索', '');
  Store.comics = Store.comics.length ? Store.comics : [];
  pageContainer.innerHTML = `
    <div class="search-box">
      ${icon('search', 18)}
      <input id="search-input" placeholder="搜索漫画标题、作者、标签" />
    </div>
    <div class="chip-row" id="search-chips"></div>
    <div id="search-result"></div>
  `;

  const input = document.getElementById('search-input');
  const result = document.getElementById('search-result');
  const chips = document.getElementById('search-chips');

  // 历史搜索
  renderSearchHistory(chips, input, result);
  input.addEventListener('input', () => doSearch(input.value, result));
  setTimeout(() => input.focus(), 50);
}

async function doSearch(q, resultEl) {
  const list = await Comics.list();
  const k = q.trim().toLowerCase();
  if (!k) { resultEl.innerHTML = ''; renderSearchHistory(document.getElementById('search-chips'), document.getElementById('search-input'), resultEl); return; }
  const matched = list.filter(c =>
    c.title.toLowerCase().includes(k) ||
    (c.author || '').toLowerCase().includes(k) ||
    (c.tags || []).some(t => t.toLowerCase().includes(k))
  );
  resultEl.innerHTML = matched.length
    ? `<div class="section-title"><h2>结果 ${matched.length}</h2></div>` + matched.map(c => `
      <div class="list-card" data-id="${c.id}">
        <div class="list-thumb">${c.cover ? `<img src="${c.cover}">` : `<div class="placeholder-cover">${esc(c.title.slice(0,1))}</div>`}</div>
        <div class="list-info"><div class="list-title">${esc(c.title)}</div><div class="list-sub">${c.author || '未知作者'} · ${c.pageCount}页</div></div>
      </div>`).join('')
    : `<div class="empty"><div class="empty-icon">${icon('search', 40)}</div><h3>没有找到</h3><p>换个关键词试试</p></div>`;
  resultEl.querySelectorAll('.list-card').forEach(c => c.addEventListener('click', () => navigate('detail', { id: c.dataset.id })));
}

function renderSearchHistory(chipsEl, input, resultEl) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('yj_search_history') || '[]'); } catch {}
  chipsEl.innerHTML = hist.length ? `<div class="section-title"><h2>搜索历史</h2></div>` + hist.slice(0, 10).map(h => `<span class="chip" data-k="${esc(h)}">${esc(h)}</span>`).join('') : '';
  chipsEl.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.k;
      doSearch(chip.dataset.k, resultEl);
    });
  });
}

function saveSearchHistory(k) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('yj_search_history') || '[]'); } catch {}
  hist = [k, ...hist.filter(x => x !== k)].slice(0, 20);
  localStorage.setItem('yj_search_history', JSON.stringify(hist));
}

// ============ 我的页面 ============
async function renderMine() {
  setTopbar('我的', '');
  const comics = await Comics.list();
  const favCount = comics.filter(c => c.favorite).length;
  const total = comics.length;
  const totalPages = comics.reduce((s, c) => s + c.pageCount, 0);

  pageContainer.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">Y</div>
      <div>
        <div class="profile-name">YoungJump 用户</div>
        <div class="profile-sub">无需注册 · 免费使用 · 数据本地保存</div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-item"><div class="num">${total}</div><div class="label">漫画</div></div>
      <div class="stat-item"><div class="num">${favCount}</div><div class="label">收藏</div></div>
      <div class="stat-item"><div class="num">${totalPages}</div><div class="label">总页数</div></div>
    </div>
    <div class="menu-group">
      <div class="menu-item" data-nav="favorite">${icon('favorite')}<span class="menu-label">我的收藏</span>${icon('arrow', 16)}</div>
      <div class="menu-item" data-nav="history">${icon('clock')}<span class="menu-label">阅读历史</span>${icon('arrow', 16)}</div>
    </div>
    <div class="menu-group">
      <div class="menu-item" data-nav="settings">${icon('setting')}<span class="menu-label">设置</span>${icon('arrow', 16)}</div>
      <div class="menu-item" id="menu-theme">${icon('theme')}<span class="menu-label">外观主题</span><span id="theme-value" style="font-size:13px;color:var(--text-3)"></span></div>
      <div class="menu-item" id="menu-cache">${icon('cache')}<span class="menu-label">清除缓存</span><span id="cache-size" style="font-size:13px;color:var(--text-3)"></span></div>
      <div class="menu-item" data-nav="about">${icon('about')}<span class="menu-label">关于</span>${icon('arrow', 16)}</div>
    </div>
  `;

  // 主题显示
  const themeName = { system: '跟随系统', light: '浅色', dark: '深色' };
  document.getElementById('theme-value').textContent = themeName[Store.settings.theme] || '跟随系统';

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });

  document.getElementById('menu-theme').addEventListener('click', () => {
    showSheet({
      title: '外观主题',
      options: [
        { label: '跟随系统', active: Store.settings.theme === 'system' },
        { label: '浅色', active: Store.settings.theme === 'light' },
        { label: '深色', active: Store.settings.theme === 'dark' },
      ],
      onSelect: async (i) => {
        const v = ['system', 'light', 'dark'][i];
        Store.settings.theme = v;
        await Settings.set('theme', v);
        applyTheme(v);
        renderMine();
      },
    });
  });

  document.getElementById('menu-cache').addEventListener('click', () => {
    showConfirm({
      title: '清除缓存',
      message: '将清除所有本地漫画数据（漫画、书签、设置）。确定吗？',
      onConfirm: async () => {
        localStorage.clear();
        const d = await import('./storage.js').then(m => m.openDB());
        // 清空所有 store
        const req = indexedDB.deleteDatabase('youngjump');
        req.onsuccess = () => { toast('缓存已清除'); setTimeout(() => location.reload(), 800); };
      },
    });
  });

  // 计算缓存大小
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const mb = ((est.usage || 0) / 1024 / 1024).toFixed(1);
      document.getElementById('cache-size').textContent = mb + ' MB';
    }
  } catch {}
}

// ============ 收藏列表 ============
async function renderFavoriteList() {
  setTopbar('我的收藏', `<button class="btn-icon" id="back">${icon('back', 20)}</button>`);
  const list = (await Comics.list()).filter(c => c.favorite);
  pageContainer.innerHTML = list.length
    ? list.map(c => listCard(c)).join('')
    : `<div class="empty"><div class="empty-icon">${icon('favorite', 40)}</div><h3>还没有收藏</h3><p>在漫画详情页点击心形即可收藏</p></div>`;
  document.getElementById('back').addEventListener('click', () => navigate('mine'));
  pageContainer.querySelectorAll('.list-card').forEach(c => c.addEventListener('click', () => navigate('detail', { id: c.dataset.id })));
}

// ============ 历史列表 ============
async function renderHistoryList() {
  setTopbar('阅读历史', `<button class="btn-icon" id="back">${icon('back', 20)}</button>`);
  const list = (await Comics.list()).filter(c => c.lastReadAt);
  pageContainer.innerHTML = list.length
    ? list.map(c => listCard(c, true)).join('')
    : `<div class="empty"><div class="empty-icon">${icon('clock', 40)}</div><h3>暂无阅读记录</h3><p>开始阅读后会自动记录</p></div>`;
  document.getElementById('back').addEventListener('click', () => navigate('mine'));
  pageContainer.querySelectorAll('.list-card').forEach(c => c.addEventListener('click', () => navigate('detail', { id: c.dataset.id })));
}

function listCard(c, showTime) {
  const time = showTime && c.lastReadAt ? `<div class="list-sub">${new Date(c.lastReadAt).toLocaleString()}</div>` : '';
  return `<div class="list-card" data-id="${c.id}">
    <div class="list-thumb">${c.cover ? `<img src="${c.cover}">` : `<div class="placeholder-cover">${esc(c.title.slice(0,1))}</div>`}</div>
    <div class="list-info"><div class="list-title">${esc(c.title)}</div><div class="list-sub">${c.author || '未知作者'} · ${c.pageCount}页</div>${time}</div>
  </div>`;
}

// ============ 设置 ============
async function renderSettings() {
  setTopbar('设置', `<button class="btn-icon" id="back">${icon('back', 20)}</button>`);
  const s = Store.settings;
  const modeName = { scroll: '滚动', paged: '翻页' };
  pageContainer.innerHTML = `
    <div class="menu-group">
      <div class="menu-item" id="set-mode">${icon('eye')}<span class="menu-label">阅读模式</span><span id="mode-value" style="font-size:13px;color:var(--text-3)"></span></div>
      <div class="menu-item" id="set-direction">${icon('list')}<span class="menu-label">翻页方向</span><span id="dir-value" style="font-size:13px;color:var(--text-3)"></span></div>
      <div class="menu-item" id="set-bg">${icon('theme')}<span class="menu-label">阅读背景色</span><span id="bg-value" style="font-size:13px;color:var(--text-3)"></span></div>
    </div>
    <div class="menu-group">
      <div class="menu-item" id="set-autofill">${icon('clock')}<span class="menu-label">自动翻页间隔</span><span id="autofill-value" style="font-size:13px;color:var(--text-3)"></span></div>
    </div>
  `;
  document.getElementById('back').addEventListener('click', () => navigate('mine'));
  document.getElementById('mode-value').textContent = modeName[s.readMode] || '滚动';
  document.getElementById('dir-value').textContent = s.direction === 'vertical' ? '上下' : '左右';
  document.getElementById('bg-value').textContent = s.background;
  document.getElementById('autofill-value').textContent = s.autoFlip ? s.autoFlip + ' 秒' : '关闭';

  document.getElementById('set-mode').addEventListener('click', () => showSheet({
    title: '阅读模式', options: [
      { label: '滚动模式', active: s.readMode === 'scroll' },
      { label: '翻页模式', active: s.readMode === 'paged' },
    ], onSelect: async (i) => { Store.settings.readMode = i === 0 ? 'scroll' : 'paged'; await Settings.set('readMode', Store.settings.readMode); renderSettings(); }
  }));
  document.getElementById('set-direction').addEventListener('click', () => showSheet({
    title: '翻页方向', options: [
      { label: '上下翻页', active: s.direction === 'vertical' },
      { label: '左右翻页', active: s.direction === 'horizontal' },
    ], onSelect: async (i) => { Store.settings.direction = i === 0 ? 'vertical' : 'horizontal'; await Settings.set('direction', Store.settings.direction); renderSettings(); }
  }));
  document.getElementById('set-bg').addEventListener('click', () => showSheet({
    title: '阅读背景色', options: [
      { label: '黑色', active: s.background === '#000000' },
      { label: '深灰', active: s.background === '#1a1a1a' },
      { label: '米白', active: s.background === '#f5f0e6' },
      { label: '纯白', active: s.background === '#ffffff' },
    ], onSelect: async (i) => { const v = ['#000000', '#1a1a1a', '#f5f0e6', '#ffffff'][i]; Store.settings.background = v; await Settings.set('background', v); renderSettings(); }
  }));
  document.getElementById('set-autofill').addEventListener('click', () => showSheet({
    title: '自动翻页', options: [
      { label: '关闭', active: !s.autoFlip },
      { label: '3 秒', active: s.autoFlip === 3 },
      { label: '5 秒', active: s.autoFlip === 5 },
      { label: '10 秒', active: s.autoFlip === 10 },
    ], onSelect: async (i) => { const v = [0, 3, 5, 10][i]; Store.settings.autoFlip = v; await Settings.set('autoFlip', v); renderSettings(); }
  }));
}

// ============ 关于 ============
function renderAbout() {
  setTopbar('关于', `<button class="btn-icon" id="back">${icon('back', 20)}</button>`);
  pageContainer.innerHTML = `
    <div style="text-align:center;padding:50px 30px">
      <div style="width:80px;height:80px;border-radius:22px;background:var(--brand-grad);display:inline-flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#fff;box-shadow:0 8px 24px rgba(255,107,53,0.35)">Y</div>
      <h2 style="margin-top:18px;font-size:22px;font-weight:800">YoungJump</h2>
      <p style="margin-top:6px;color:var(--text-3);font-size:13px">本地漫画阅读器 · v1.0.0</p>
      <div style="margin-top:30px;text-align:left;background:var(--bg-card);border-radius:16px;padding:20px;box-shadow:var(--shadow)">
        <p style="font-size:13px;color:var(--text-2);line-height:1.8">YoungJump 是一款免费、无需注册的本地漫画阅读器。支持导入图片与 ZIP 漫画，提供滚动/翻页阅读、手势缩放、书签、收藏、历史、标签与主题切换。</p>
        <p style="font-size:13px;color:var(--text-3);line-height:1.8;margin-top:12px">所有数据仅保存在您的设备本地，不会上传至任何服务器。</p>
      </div>
    </div>
  `;
  document.getElementById('back').addEventListener('click', () => navigate('mine'));
}

// ============ 初始化 ============
async function init() {
  await initTheme();
  Store.settings = await Settings.getAll();
  Store.comics = await Comics.list();

  // tabbar 事件
  tabbar.querySelectorAll('.tab-item').forEach(t => {
    t.addEventListener('click', () => navigate(t.dataset.tab));
  });

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (Store.settings.theme === 'system') applyTheme('system');
  });

  navigate('shelf');
}

// 长按事件支持
document.addEventListener('touchstart', handleLongPress, { passive: false });

function handleLongPress(e) {
  const target = e.target.closest('.comic-card');
  if (!target) return;
  const startX = e.touches[0].clientX;
  const startY = e.touches[0].clientY;
  let moved = false;
  const timer = setTimeout(() => {
    if (!moved) {
      target.dispatchEvent(new CustomEvent('longpress', { bubbles: true }));
      navigator.vibrate && navigator.vibrate(20);
    }
  }, 600);
  function onMove(ev) {
    const dx = Math.abs(ev.touches[0].clientX - startX);
    const dy = Math.abs(ev.touches[0].clientY - startY);
    if (dx > 10 || dy > 10) moved = true;
  }
  function onEnd() { clearTimeout(timer); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); }
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd);
}

// 搜索回车保存历史
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && currentView === 'search') {
    const input = document.getElementById('search-input');
    if (input && input.value.trim()) saveSearchHistory(input.value.trim());
  }
});

// 导出给全局
window.YJ = { navigate, Store, Comics, Pages, Settings, toast };

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

init();
