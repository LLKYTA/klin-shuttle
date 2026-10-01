import { register, start } from './router.js';
import { getTheme, applyTheme, toggleTheme } from './store.js';
import { updateFavCount } from './components/card.js';
import { clearVideoCache } from './services/uapi.js';

import { renderHome } from './views/home.js';
import { renderTeaching } from './views/teaching.js';
import { renderPractice } from './views/practice.js';
import { renderDetail } from './views/detail.js';
import { renderFavorites } from './views/favorites.js';

applyTheme(getTheme());

register('/', (app) => renderHome(app));
register('teaching', (app, params, query) => renderTeaching(app, params, query));
register('practice', (app, params, query) => renderPractice(app, params, query));
register('teaching/:id', (app, params, query) => renderDetail(app, params, query, 'teaching'));
register('practice/:id', (app, params, query) => renderDetail(app, params, query, 'practice'));
register('favorites', (app) => renderFavorites(app));

const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => toggleTheme());
}

updateFavCount();
start();

/* ---------- 控制台工具：UAPI.xxx ---------- */
window.UAPI = {
  setKey(key) {
    localStorage.setItem('uapi.key', String(key).trim());
    console.log('[UAPI] Key 已保存到 localStorage，刷新页面生效。');
  },
  clearKey() {
    localStorage.removeItem('uapi.key');
    console.log('[UAPI] Key 已清除。');
  },
  clearCache() {
    clearVideoCache();
    console.log('[UAPI] 视频缓存已清空，刷新页面重新拉取。');
  }
};