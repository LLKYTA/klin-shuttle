import { teachingItems } from '../data/teaching.js';
import { practiceItems } from '../data/practice.js';
import { getRecent } from '../store.js';
import { cardHTML, bindFavoriteButtons, hydrateCards } from '../components/card.js';

function findByKey(key) {
  const [section, id] = key.split(':');
  const items = section === 'teaching' ? teachingItems : practiceItems;
  const item = items.find((i) => i.id === id);
  return item ? { item, section } : null;
}

export function renderHome(app) {
  const recent = getRecent()
    .map(findByKey)
    .filter(Boolean)
    .slice(0, 2);

  const featured = [...teachingItems, ...practiceItems]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 2);

  const recentHTML = recent.length
    ? `<h2 class="section-title">最近浏览</h2>
       <div class="grid-2">
         ${recent.map(({ item, section }) => cardHTML(item, section)).join('')}
       </div>`
    : '';

  app.innerHTML = `
    <section class="hero">
      <h1>用更好的方式学羽毛球</h1>
      <p>精选教学视频与实战解析，帮助你系统提升球技。</p>
    </section>

    <div class="grid-2">
      <a class="module-entry" href="#/teaching">
        <h2>羽毛球教学</h2>
        <p>${teachingItems.length} 个教程 · 基础到进阶</p>
      </a>
      <a class="module-entry" href="#/practice">
        <h2>羽毛球实战</h2>
        <p>${practiceItems.length} 个解析 · 战术与节奏</p>
      </a>
    </div>

    ${recentHTML}

    <h2 class="section-title">热门推荐</h2>
    <div class="grid-2">
      ${featured.map((item) => {
        const section = teachingItems.includes(item) ? 'teaching' : 'practice';
        return cardHTML(item, section);
      }).join('')}
    </div>
  `;

  bindFavoriteButtons(app);
  hydrateCards(app);
}