// ============ YoungJump 数据层：本地存储与漫画导入 ============

const DB_NAME = 'youngjump';
const DB_VERSION = 1;

// 漫画元数据存储结构
// comic = {
//   id, title, cover (dataURL), pageCount,
//   createdAt, lastReadAt, lastPage, progress,
//   favorite (bool), author, tags: [], 
// }

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('comics')) {
        d.createObjectStore('comics', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('pages')) {
        // pages 存每本漫画的图片数据: { id, comicId, index, blob }
        d.createObjectStore('pages', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('history')) {
        d.createObjectStore('history', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store, value) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(store, key) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readonly');
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGetAll(store) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readonly');
    const r = tx.objectStore(store).getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}
async function idbDelete(store, key) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbClear(store) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ============ 漫画 CRUD ============
const Comics = {
  async list() {
    const list = await idbGetAll('comics');
    return list.sort((a, b) => (b.lastReadAt || b.createdAt) - (a.lastReadAt || a.createdAt));
  },
  async get(id) { return idbGet('comics', id); },
  async save(comic) { return idbPut('comics', comic); },
  async remove(id) {
    await idbDelete('comics', id);
    // 删除该漫画所有页
    const pages = await idbGetAll('pages');
    for (const p of pages) {
      if (p.comicId === id) await idbDelete('pages', p.key);
    }
  },
};

// ============ 页面存储 ============
const Pages = {
  async savePage(comicId, index, blob) {
    await idbPut('pages', { key: `${comicId}_${index}`, comicId, index, blob });
  },
  async getPage(comicId, index) {
    const r = await idbGet('pages', `${comicId}_${index}`);
    return r ? r.blob : null;
  },
  async pageCount(comicId) {
    const pages = await idbGetAll('pages');
    return pages.filter(p => p.comicId === comicId).length;
  },
  async deleteAll(comicId) {
    const pages = await idbGetAll('pages');
    for (const p of pages) {
      if (p.comicId === comicId) await idbDelete('pages', p.key);
    }
  },
};

// ============ 设置 ============
const Settings = {
  DEFAULTS: {
    theme: 'system',        // system | light | dark
    readMode: 'scroll',     // scroll | paged
    direction: 'vertical',  // vertical | horizontal
    background: '#000000',
    autoFlip: 0,            // 秒, 0=关
    compress: true,
  },
  async get(key) {
    const r = await idbGet('settings', key);
    return r ? r.value : undefined;
  },
  async getAll() {
    const all = await idbGetAll('settings');
    const obj = { ...Settings.DEFAULTS };
    for (const s of all) obj[s.key] = s.value;
    return obj;
  },
  async set(key, value) {
    await idbPut('settings', { key, value });
  },
};

// ============ 文件导入工具 ============
const IMG_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'];

function isImage(name) {
  const ext = name.split('.').pop().toLowerCase();
  return IMG_EXT.includes(ext);
}

function isZip(name) {
  return name.toLowerCase().endsWith('.zip') || name.toLowerCase().endsWith('.cbz');
}

function sortByNumber(a, b) {
  const na = parseInt(a.replace(/\D/g, '')) || 0;
  const nb = parseInt(b.replace(/\D/g, '')) || 0;
  const naName = a.replace(/\d/g, '');
  const nbName = b.replace(/\d/g, '');
  return na - nb || naName.localeCompare(nbName) || a.localeCompare(b);
}

// 从文件名猜测漫画名
function guessTitle(name) {
  let t = name.replace(/\.(zip|cbz|rar|cbr|pdf|mobi|epub)$/i, '');
  t = t.replace(/[[(（].*?[\])）]/g, '');       // 去掉括号内
  t = t.replace(/[_\-\s]+/g, ' ').trim();
  t = t.replace(/\s+(第?\d+[卷话章节]?|vol\.?\s*\d+|ch\.?\s*\d+)/i, '');
  return t || name;
}

// 读取图片文件为 dataURL（生成封面）
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// 压缩图片生成封面缩略图
function makeThumb(dataURL, maxW = 240) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => res(dataURL);
    img.src = dataURL;
  });
}

// 生成唯一 id
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============ 全局状态 ============
const Store = {
  comics: [],
  settings: Settings.DEFAULTS,
  currentTab: 'shelf',
};

export {
  openDB, idbPut, idbGet, idbGetAll, idbDelete, idbClear,
  Comics, Pages, Settings, Store,
  isImage, isZip, sortByNumber, guessTitle, fileToDataURL, makeThumb, uid,
};
