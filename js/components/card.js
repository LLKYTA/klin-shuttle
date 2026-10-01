import { isFavorite, toggleFavorite } from '../store.js';
import { getBilibiliVideoInfo, formatDuration } from '../services/uapi.js';

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

/* ---------- 视口懒加载 ---------- */

let currentObserver = null;

/**
 * 只加载视口内可见的卡片。
 *
 * 原理：
 *   - IntersectionObserver 的 rootMargin 设为 '0px'，卡片完全未进入视口时不触发
 *   - 卡片首次进入视口 → 立即发请求 → 渲染 → unobserve（不再重复观察）
 *   - 滚出视口不影响已发出的请求（避免浪费），但不会重发
 *   - 路由切换时断开旧 observer，防止跨页面误触发
 */
export function hydrateCards(container) {
  // 断开上一次的观察器（路由切换场景）
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }

  const cards = [...container.querySelectorAll('.card[data-bvid], .card[data-aid]')]
    .filter((card) => card.dataset.hydrated !== '1');

  if (cards.length === 0) return;

  // 兜底：老浏览器不支持 IntersectionObserver，退化为全部加载
  if (!('IntersectionObserver' in window)) {
    cards.forEach((card) => hydrateOneCard(card));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const card = entry.target;
        observer.unobserve(card);
        hydrateOneCard(card);
      }
    },
    {
    root: null,
    rootMargin: '100px 0px',  // 提前 100px 就开始加载
    threshold: 0
    }
  );

  currentObserver = observer;
  cards.forEach((card) => observer.observe(card));
}

async function hydrateOneCard(card) {
  if (card.dataset.hydrated === '1') return;

  const bvid = card.dataset.bvid || '';
  const aid = card.dataset.aid || '';
  if (!bvid && !aid) {
    card.dataset.hydrated = '1';
    return;
  }

  // 先打标记，防止同一张卡片被重复触发
  card.dataset.hydrated = '1';

  try {
    const info = await getBilibiliVideoInfo({ bvid, aid });
    applyInfoToCard(card, info);
  } catch (err) {
    console.warn('[uapi] 卡片数据加载失败:', err.message);
    // 失败也保留标记，滚动回来不会重发；用户可手动清缓存再试
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
}
