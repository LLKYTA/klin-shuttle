import { isFavorite, toggleFavorite } from '../store.js';
import { getBilibiliVideoInfo, formatDuration } from '../services/uapi.js';

/**
 * 生成一张视频卡片 HTML。
 * 若 item 带 bvid/aid，卡片渲染后由 hydrateCards 异步补齐封面、标题、时长。
 */
export function cardHTML(item, section) {
  const key = `${section}:${item.id}`;
  const fav = isFavorite(key);
  const searchText = (item.title + ' ' + item.desc + ' ' + item.tags.join(' ')).toLowerCase();

  const coverHTML = item.cover
    ? `<img class="card-cover" src="${item.cover}" alt="" loading="lazy">`
    : `<span class="card-thumb-icon">🏸</span>`;

  const durationHTML = item.duration
    ? `<span class="badge" data-role="duration">${item.duration}</span>`
    : '';

  const dataAttrs = [
    `data-item-id="${item.id}"`,
    `data-section="${section}"`,
    item.bvid ? `data-bvid="${item.bvid}"` : '',
    item.aid ? `data-aid="${item.aid}"` : ''
  ].filter(Boolean).join(' ');

  return `
    <a class="card fade-in" href="#/${section}/${item.id}" data-search="${searchText}" ${dataAttrs}>
      <div class="card-thumb" data-role="thumb">
        ${coverHTML}
        <span class="level-badge" data-level="${item.level || ''}">${item.level || ''}</span>
        <button class="fav-btn" data-key="${key}" data-fav="${fav ? '1' : ''}" aria-label="收藏">${fav ? '♥' : '♡'}</button>
        <div class="card-badges">${durationHTML}</div>
      </div>
      <div class="card-body">
        <div class="card-title" data-role="title">${item.title || ''}</div>
        <div class="card-desc" data-role="desc">${item.desc || ''}</div>
        <div style="margin-top: 8px;">
          ${item.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </a>
  `;
}

export function bindFavoriteButtons(container) {
  container.querySelectorAll('.fav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = btn.dataset.key;
      const nowFav = toggleFavorite(key);
      btn.dataset.fav = nowFav ? '1' : '';
      btn.textContent = nowFav ? '♥' : '♡';
      updateFavCount();
    });
  });
}

export function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (!el) return;
  let count = 0;
  try {
    count = JSON.parse(localStorage.getItem('bc.favorites') || '[]').length;
  } catch {
    count = 0;
  }
  el.textContent = count;
  el.toggleAttribute('data-empty', count === 0);
}

/**
 * 异步为容器内所有带 bvid/aid 的卡片补齐封面、标题、时长。
 * 并发请求，失败的卡片静默降级为本地字段。
 */
export async function hydrateCards(container) {
  const cards = container.querySelectorAll('.card[data-bvid], .card[data-aid]');
  await Promise.all([...cards].map((card) => hydrateOneCard(card)));
}

async function hydrateOneCard(card) {
  const bvid = card.dataset.bvid || '';
  const aid = card.dataset.aid || '';
  if (!bvid && !aid) return;
  try {
    const info = await getBilibiliVideoInfo({ bvid, aid });
    applyInfoToCard(card, info);
  } catch (err) {
    console.warn('[uapi] 卡片数据加载失败:', err.message);
  }
}

function applyInfoToCard(card, info) {
  const thumb = card.querySelector('[data-role="thumb"]');
  if (thumb && info.pic) {
    let img = thumb.querySelector('img.card-cover');
    if (!img) {
      img = document.createElement('img');
      img.className = 'card-cover';
      img.alt = '';
      img.loading = 'lazy';
      thumb.insertBefore(img, thumb.firstChild);
      const icon = thumb.querySelector('.card-thumb-icon');
      if (icon) icon.remove();
    }
    img.src = info.pic;
  }

  if (info.duration) {
    const badges = card.querySelector('.card-badges');
    if (badges) {
      let durEl = badges.querySelector('[data-role="duration"]');
      if (!durEl) {
        durEl = document.createElement('span');
        durEl.className = 'badge';
        durEl.dataset.role = 'duration';
        badges.appendChild(durEl);
      }
      durEl.textContent = formatDuration(info.duration);
    }
  }

  const titleEl = card.querySelector('[data-role="title"]');
  if (titleEl && !titleEl.textContent.trim() && info.title) {
    titleEl.textContent = info.title;
  }
  const descEl = card.querySelector('[data-role="desc"]');
  if (descEl && !descEl.textContent.trim() && info.desc) {
    descEl.textContent = info.desc;
  }

  card.dataset.hydrated = '1';
}