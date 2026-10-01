import { teachingItems } from '../data/teaching.js';
import { practiceItems } from '../data/practice.js';
import { getFavorites } from '../store.js';
import { cardHTML, bindFavoriteButtons } from '../components/card.js';

const ALL_ITEMS = { teaching: teachingItems, practice: practiceItems };

export function renderFavorites(app) {
  const keys = getFavorites();

  const resolved = keys
    .map((key) => {
      const [section, id] = key.split(':');
      const item = ALL_ITEMS[section]?.find((i) => i.id === id);
      return item ? { item, section } : null;
    })
    .filter(Boolean);

  const content = resolved.length
    ? `<div class="grid-2">${resolved.map(({ item, section }) => cardHTML(item, section)).join('')}</div>`
    : `<div class="empty-state">
         <div class="empty-state-icon">♡</div>
         <div class="empty-state-title">还没有收藏</div>
         <p>在视频卡片上点小心心，方便以后回看。</p>
       </div>`;

  app.innerHTML = `
    <div class="list-header">
      <h1>我的收藏</h1>
      <p>${resolved.length} 条已收藏的内容。</p>
    </div>
    ${content}
  `;

  bindFavoriteButtons(app);
}