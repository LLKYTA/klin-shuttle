import { practiceItems } from '../data/practice.js';
import { cardHTML, bindFavoriteButtons, hydrateCards } from '../components/card.js';

const ALL_TAGS = [...new Set(practiceItems.flatMap((i) => i.tags))];

export function renderPractice(app, params, query = {}) {
  const activeTag = query.tag || '';

  const filtered = activeTag
    ? practiceItems.filter((i) => i.tags.includes(activeTag))
    : practiceItems;

  const chips = ALL_TAGS.map((t) => {
    const active = t === activeTag;
    const href = active ? '#/practice' : `#/practice?tag=${encodeURIComponent(t)}`;
    return `<a class="chip"${active ? ' data-active' : ''} href="${href}">${t}</a>`;
  }).join('');

  const cards = filtered.length
    ? filtered.map((item) => cardHTML(item, 'practice')).join('')
    : `<div class="empty-state" style="grid-column: 1 / -1;">
         <div class="empty-state-icon">🔍</div>
         <div class="empty-state-title">没有找到匹配的实战解析</div>
         <p>试试其他标签，或清空筛选。</p>
       </div>`;

  app.innerHTML = `
    <div class="list-header">
      <h1>羽毛球实战</h1>
      <p>战术解析与实战场景，帮你把技术用出来。</p>
    </div>
    <div class="toolbar">
      <input class="search-input" type="search" placeholder="搜索实战标题、描述或标签…">
      <div class="chips">${chips}</div>
    </div>
    <div class="grid-2">${cards}</div>
  `;

  bindFavoriteButtons(app);
  hydrateCards(app);

  const input = app.querySelector('.search-input');
  input.addEventListener('input', () => {
    const value = input.value.trim().toLowerCase();
    app.querySelectorAll('.card').forEach((card) => {
      const text = card.dataset.search || '';
      card.style.display = !value || text.includes(value) ? '' : 'none';
    });
  });
}