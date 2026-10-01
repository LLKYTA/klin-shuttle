/**
 * 本地存储封装：主题、收藏、最近浏览。
 * 所有 key 统一加前缀，避免与同域其他应用冲突。
 */

const KEYS = {
  theme: 'bc.theme',
  favorites: 'bc.favorites',
  recent: 'bc.recent'
};

/* ---------- 主题 ---------- */

export function getTheme() {
  const saved = localStorage.getItem(KEYS.theme);
  if (saved === 'dark' || saved === 'light') return saved;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/* ---------- 通用读写 ---------- */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- 收藏 ---------- */

export function getFavorites() {
  return readJSON(KEYS.favorites, []);
}

export function isFavorite(key) {
  return getFavorites().includes(key);
}

export function toggleFavorite(key) {
  const list = getFavorites();
  const idx = list.indexOf(key);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(key);
  }
  writeJSON(KEYS.favorites, list);
  return idx < 0;
}

/* ---------- 最近浏览 ---------- */

export function pushRecent(key) {
  let list = readJSON(KEYS.recent, []);
  list = list.filter((k) => k !== key);
  list.unshift(key);
  list = list.slice(0, 8);
  writeJSON(KEYS.recent, list);
}

export function getRecent() {
  return readJSON(KEYS.recent, []);
}