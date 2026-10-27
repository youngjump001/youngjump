// ============ YoungJump 阅读器 ============

import { Comics, Pages, Settings } from './storage.js';
import { icon, toast, showSheet } from './ui.js';

let currentComic = null;
let currentPage = 1;      // 从 1 开始
let readerEl = null;
let stageEl = null;
let scrollEl = null;
let settings = {};
let autoFlipTimer = null;
let panelEl = null;
let lastTap = { t: 0, x: 0, y: 0 };
let currentBlobURL = null;
let zoomScale = 1;
let zoomed = false;

const Reader = {
  async open(comicId, startPage) {
    currentComic = await Comics.get(comicId);
    if (!currentComic) return;
    currentPage = Math.max(1, Math.min(startPage || 1, currentComic.pageCount));
    settings = await Settings.getAll();

    // 创建阅读器 DOM
    buildReader();
    await loadPage(currentPage);
    showControls();
    setTimeout(hideControls, 2500);
  },

  close() {
    clearInterval(autoFlipTimer);
    if (currentBlobURL) URL.revokeObjectURL(currentBlobURL);
    if (readerEl) readerEl.remove();
    readerEl = null;
  },
};

function buildReader() {
  readerEl = document.createElement('div');
  readerEl.className = 'reader';
  readerEl.innerHTML = `
    <div class="reader-strip top hidden" id="r-top">
      <button class="r-btn" id="r-back">${icon('back', 22)}</button>
      <div class="r-title" id="r-title">${escapeHtml(currentComic.title)}</div>
      <button class="r-btn" id="r-fav">${currentComic.favorite ? icon('favoriteFill', 22) : icon('favorite', 22)}</button>
      <button class="r-btn" id="r-setting">${icon('setting', 22)}</button>
    </div>
    <div class="reader-stage" id="r-stage">
      <div class="reader-scroll" id="r-scroll"></div>
      <div class="reader-progress"><div class="bar" id="r-bar"></div></div>
      <div class="reader-page-hint" id="r-hint"></div>
    </div>
    <div class="reader-strip bottom hidden" id="r-bottom">
      <button class="r-btn" id="r-prev">${icon('back', 22)}</button>
      <div style="font-size:13px" id="r-pagenum"></div>
      <button class="r-btn" id="r-next"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
      <button class="r-btn" id="r-catalog">${icon('list', 22)}</button>
      <button class="r-btn" id="r-bookmark">${icon('bookmark', 22)}</button>
    </div>
    <div class="reader-panel" id="r-panel"></div>
  `;
  document.body.appendChild(readerEl);
  readerEl.style.background = settings.background || '#000000';

  stageEl = document.getElementById('r-stage');
  scrollEl = document.getElementById('r-scroll');
  panelEl = document.getElementById('r-panel');

  // 事件绑定
  document.getElementById('r-back').addEventListener('click', () => { saveProgress(); Reader.close(); });
  document.getElementById('r-fav').addEventListener('click', toggleFav);
  document.getElementById('r-setting').addEventListener('click', togglePanel);
  document.getElementById('r-prev').addEventListener('click', () => goto(currentPage - 1));
  document.getElementById('r-next').addEventListener('click', () => goto(currentPage + 1));
  document.getElementById('r-catalog').addEventListener('click', openCatalog);
  document.getElementById('r-bookmark').addEventListener('click', toggleBookmark);
  document.getElementById('r-pagenum').addEventListener('click', () => gotoPageInput());

  buildPanel();
  bindGestures();
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ============ 页面加载 ============
async function loadPage(page) {
  currentPage = page;
  const blob = await Pages.getPage(currentComic.id, page - 1);
  if (!blob) { scrollEl.innerHTML = '<div style="color:#fff;padding:40px;text-align:center">页面数据缺失</div>'; return; }
  if (currentBlobURL) URL.revokeObjectURL(currentBlobURL);
  currentBlobURL = URL.createObjectURL(blob);
  zoomed = false;
  zoomScale = 1;

  scrollEl.innerHTML = `<div class="reader-img-wrap" id="r-wrap"><img id="r-img" src="${currentBlobURL}" /></div>`;
  const img = document.getElementById('r-img');
  const wrap = document.getElementById('r-wrap');

  img.addEventListener('load', () => {
    wrap.style.minHeight = '100%';
    if (settings.readMode === 'scroll') {
      // 滚动模式
      scrollEl.scrollTop = 0;
    }
  });
  img.addEventListener('error', () => {
    wrap.innerHTML = '<div style="color:#fff;padding:40px;text-align:center">图片加载失败</div>';
  });

  updateProgress();
}

async function goto(page) {
  if (page < 1) { toast('已经是第一页了'); return; }
  if (page > currentComic.pageCount) { toast('已经是最后一页了'); return; }
  await loadPage(page);
  if (settings.readMode === 'scroll') {
    scrollEl.scrollTop = 0;
  }
  saveProgress();
}

function updateProgress() {
  const pct = (currentPage / currentComic.pageCount) * 100;
  document.getElementById('r-bar').style.width = pct + '%';
  document.getElementById('r-hint').textContent = `${currentPage} / ${currentComic.pageCount}`;
  document.getElementById('r-pagenum').textContent = `${currentPage} / ${currentComic.pageCount}`;
}

async function saveProgress() {
  if (!currentComic) return;
  currentComic.lastPage = currentPage;
  currentComic.lastReadAt = Date.now();
  await Comics.save(currentComic);
}

// ============ 收藏/书签 ============
async function toggleFav() {
  currentComic.favorite = !currentComic.favorite;
  await Comics.save(currentComic);
  document.getElementById('r-fav').innerHTML = currentComic.favorite ? icon('favoriteFill', 22) : icon('favorite', 22);
  toast(currentComic.favorite ? '已收藏' : '已取消收藏');
}

async function toggleBookmark() {
  let bookmarks = [];
  try { bookmarks = JSON.parse(localStorage.getItem('yj_bookmarks') || '[]'); } catch {}
  const key = `${currentComic.id}_${currentPage}`;
  const exist = bookmarks.find(b => b.key === key);
  if (exist) {
    bookmarks = bookmarks.filter(b => b.key !== key);
    toast('已移除书签');
  } else {
    bookmarks.push({ key, comicId: currentComic.id, page: currentPage, title: currentComic.title, time: Date.now() });
    toast(`已添加书签：第 ${currentPage} 页`);
  }
  localStorage.setItem('yj_bookmarks', JSON.stringify(bookmarks));
  document.getElementById('r-bookmark').innerHTML = exist ? icon('bookmark', 22) : icon('bookmarkFill', 22);
}

function gotoPageInput() {
  showSheet({
    title: '跳转页码',
    options: Array.from({ length: Math.min(currentComic.pageCount, 100) }, (_, i) => ({ label: `第 ${i + 1} 页` })),
    onSelect: (i) => goto(i + 1),
  });
}

// ============ 目录 ============
function openCatalog() {
  const opts = [];
  for (let i = 1; i <= currentComic.pageCount; i++) opts.push({ label: `第 ${i} 页`, active: i === currentPage });
  showSheet({ title: '目录', options: opts.slice(0, 200), onSelect: (i) => goto(i + 1) });
}

// ============ 控制栏显隐 ============
function showControls() {
  document.getElementById('r-top').classList.remove('hidden');
  document.getElementById('r-bottom').classList.remove('hidden');
}
function hideControls() {
  document.getElementById('r-top').classList.add('hidden');
  document.getElementById('r-bottom').classList.add('hidden');
  panelEl.classList.remove('show');
}
function toggleControls() {
  const hidden = document.getElementById('r-top').classList.contains('hidden');
  if (hidden) { showControls(); setTimeout(hideControls, 2500); }
  else hideControls();
}

// ============ 设置面板 ============
function buildPanel() {
  panelEl.innerHTML = `
    <div class="panel-title">阅读设置</div>
    <div class="panel-section">
      <h4>阅读模式</h4>
      <div class="option-row">
        <span>模式</span>
        <div class="opt-seg" id="p-mode">
          <button data-v="scroll" class="${settings.readMode === 'scroll' ? 'active' : ''}">滚动</button>
          <button data-v="paged" class="${settings.readMode === 'paged' ? 'active' : ''}">翻页</button>
        </div>
      </div>
      <div class="option-row">
        <span>翻页方向</span>
        <div class="opt-seg" id="p-dir">
          <button data-v="vertical" class="${settings.direction === 'vertical' ? 'active' : ''}">上下</button>
          <button data-v="horizontal" class="${settings.direction === 'horizontal' ? 'active' : ''}">左右</button>
        </div>
      </div>
    </div>
    <div class="panel-section">
      <h4>背景色</h4>
      <div class="color-swatches">
        ${['#000000', '#1a1a1a', '#333333', '#f5f0e6', '#ffffff'].map(c => `<div class="swatch ${settings.background === c ? 'active' : ''}" data-c="${c}" style="background:${c}"></div>`).join('')}
      </div>
    </div>
    <div class="panel-section">
      <h4>自动翻页</h4>
      <div class="option-row">
        <span>间隔</span>
        <div class="opt-seg" id="p-auto">
          <button data-v="0" class="${!settings.autoFlip ? 'active' : ''}">关</button>
          <button data-v="3" class="${settings.autoFlip === 3 ? 'active' : ''}">3s</button>
          <button data-v="5" class="${settings.autoFlip === 5 ? 'active' : ''}">5s</button>
          <button data-v="10" class="${settings.autoFlip === 10 ? 'active' : ''}">10s</button>
        </div>
      </div>
    </div>
  `;

  function segHandler(id, key, map) {
    const seg = document.getElementById(id);
    seg.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const v = map ? map(btn.dataset.v) : btn.dataset.v;
        settings[key] = v;
        await Settings.set(key, v);
        seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === btn.dataset.v));
        if (key === 'background') readerEl.style.background = v;
        if (key === 'autoFlip') setupAutoFlip();
      });
    });
  }
  segHandler('p-mode', 'readMode', v => v);
  segHandler('p-dir', 'direction', v => v);
  segHandler('p-auto', 'autoFlip', v => parseInt(v));

  panelEl.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', async () => {
      const c = sw.dataset.c;
      settings.background = c;
      await Settings.set('background', c);
      readerEl.style.background = c;
      panelEl.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.c === c));
    });
  });
}

function togglePanel() {
  panelEl.classList.toggle('show');
}

function setupAutoFlip() {
  clearInterval(autoFlipTimer);
  if (settings.autoFlip > 0) {
    autoFlipTimer = setInterval(() => {
      if (currentPage < currentComic.pageCount) goto(currentPage + 1);
      else { clearInterval(autoFlipTimer); toast('已读完'); }
    }, settings.autoFlip * 1000);
  }
}

// ============ 手势 ============
function bindGestures() {
  // 点击翻页 / 显示控制栏
  stageEl.addEventListener('click', (e) => {
    if (e.target.closest('.reader-panel') || e.target.closest('.reader-strip')) return;
    const now = Date.now();
    const rect = stageEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width, h = rect.height;

    // 双击缩放
    if (now - lastTap.t < 300 && Math.abs(x - lastTap.x) < 30 && Math.abs(y - lastTap.y) < 30) {
      toggleZoom(e);
      lastTap = { t: 0, x: 0, y: 0 };
      return;
    }
    lastTap = { t: now, x, y };

    if (settings.readMode === 'paged') {
      // 翻页模式：左右或上下分区点击
      if (settings.direction === 'horizontal') {
        if (x < w / 3) goto(currentPage - 1);
        else if (x > w * 2 / 3) goto(currentPage + 1);
        else toggleControls();
      } else {
        if (y < h / 3) goto(currentPage - 1);
        else if (y > h * 2 / 3) goto(currentPage + 1);
        else toggleControls();
      }
    } else {
      toggleControls();
    }
  });

  // 双指缩放
  let startDist = 0;
  let startScale = 1;
  stageEl.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      startDist = dist(e.touches[0], e.touches[1]);
      startScale = zoomScale;
    }
  }, { passive: true });
  stageEl.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      if (startDist > 0) {
        const s = Math.max(1, Math.min(4, startScale * (d / startDist)));
        applyZoom(s);
      }
    }
  }, { passive: true });
}

function dist(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function applyZoom(s) {
  zoomScale = s;
  zoomed = s > 1.01;
  const img = document.getElementById('r-img');
  if (img) {
    img.style.transform = `scale(${s})`;
    img.style.transformOrigin = 'center center';
    img.style.transition = 'transform .1s';
  }
}

function toggleZoom(e) {
  if (zoomed) { applyZoom(1); }
  else { applyZoom(2.2); }
}

export { Reader };
