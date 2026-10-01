import { teachingItems } from '../data/teaching.js';
import { practiceItems } from '../data/practice.js';
import { isFavorite, toggleFavorite, pushRecent } from '../store.js';
import { cardHTML, bindFavoriteButtons, hydrateCards } from '../components/card.js';
import { getBilibiliVideoInfo, formatDuration, formatCount } from '../services/uapi.js';

const SECTION_META = {
  teaching: { label: '教学', items: teachingItems },
  practice: { label: '实战', items: practiceItems }
};

function buildVideoHTML(item) {
  if (item.bvid) {
    const src = `https://player.bilibili.com/player.html?bvid=${item.bvid}&p=1&danmaku=0&high_quality=1&autoplay=0`;
    return `<iframe src="${src}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen></iframe>`;
  }
  if (item.type === 'local' && item.src) {
    return `<video controls playsinline preload="metadata" src="${item.src}"></video>`;
  }
  return '<p>视频源不可用。</p>';
}

function relatedItems(section, current) {
  const all = SECTION_META[section].items;
  return all
    .filter((i) => i.id !== current.id)
    .map((i) => ({
      item: i,
      score: i.tags.filter((t) => current.tags.includes(t)).length
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.item);
}

export function renderDetail(app, params, query, section) {
  const meta = SECTION_META[section];
  const item = meta.items.find((i) => i.id === params.id);

  if (!item) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">未找到该内容</div>
        <p>它可能已被移除，或链接有误。</p>
      </div>`;
    return;
  }

  const key = `${section}:${item.id}`;
  pushRecent(key);
  const fav = isFavorite(key);

  const related = relatedItems(section, item);
  const relatedHTML = related.length
    ? `<h2 class="section-title">相关推荐</h2>
       <div class="grid-2">${related.map((i) => cardHTML(i, section)).join('')}</div>`
    : '';

  app.innerHTML = `
    <nav class="breadcrumb">
      <a href="#/">首页</a>
      <span class="breadcrumb-sep">/</span>
      <a href="#/${section}">${meta.label}</a>
      <span class="breadcrumb-sep">/</span>
      <span data-role="breadcrumb-title">${item.title || '加载中…'}</span>
    </nav>

    <div class="detail-header">
      <h1 data-role="title">${item.title || '加载中…'}</h1>
      <p data-role="desc" style="margin-top: 4px;">${item.desc || ''}</p>
      <div class="detail-meta" style="margin-top: var(--space-sm);">
        ${item.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
        ${item.level ? `<span class="tag">${item.level}</span>` : ''}
        <span class="tag" data-role="duration">${item.duration || ''}</span>
      </div>
    </div>

    <div class="detail-actions">
      <button class="btn" id="detail-fav" ${fav ? 'data-fav' : ''}>
        ${fav ? '♥ 已收藏' : '♡ 收藏'}
      </button>
      <button class="btn" id="detail-share">分享</button>
      ${item.bvid ? `<button class="btn" id="detail-refresh" title="忽略缓存重新拉取接口数据">刷新数据</button>` : ''}
    </div>

    <div class="video-container" id="video-box">
      ${buildVideoHTML(item)}
    </div>

    <div class="detail-content">
      <div data-role="owner" style="margin-bottom: var(--space-md);"></div>
      <div data-role="stat" style="margin-bottom: var(--space-md);"></div>
      <p data-role="api-desc" style="white-space: pre-wrap;"></p>
      <p style="margin-top: var(--space-sm);">${item.content || ''}</p>
    </div>

    ${relatedHTML}
  `;

  bindFavoriteButtons(app);
  bindDetailActions(app, key, item);
  hydrateDetail(app, item);

  if (related.length) {
    hydrateCards(app);
  }
}

async function hydrateDetail(app, item) {
  if (!item.bvid && !item.aid) return;
  try {
    const info = await getBilibiliVideoInfo({ bvid: item.bvid, aid: item.aid });
    applyInfoToDetail(app, info);
  } catch (err) {
    console.warn('[uapi] 详情数据加载失败:', err.message);
    const descEl = app.querySelector('[data-role="api-desc"]');
    if (descEl) {
      descEl.textContent = `接口数据加载失败：${err.message}`;
      descEl.style.color = '#ff453a';
    }
  }
}

function applyInfoToDetail(app, info) {
  const setText = (role, text) => {
    const el = app.querySelector(`[data-role="${role}"]`);
    if (el && text != null) el.textContent = text;
  };

  setText('title', info.title);
  setText('breadcrumb-title', info.title);
  if (info.desc) {
    const firstLine = String(info.desc).split('\n')[0].slice(0, 80);
    setText('desc', firstLine);
  }
  if (info.duration) setText('duration', formatDuration(info.duration));

  if (info.title) document.title = `${info.title} · 羽球社区`;

  const ownerEl = app.querySelector('[data-role="owner"]');
  if (ownerEl && info.owner) {
    const face = (info.owner.face || '').replace(/^http:/, 'https:');
    ownerEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${face}" alt=""
             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
             onerror="this.style.display='none'">
        <div>
          <div style="font-weight: 600; color: var(--color-text);">${info.owner.name || ''}</div>
          <div style="font-size: 0.82rem; color: var(--color-text-secondary);">UID ${info.owner.mid || ''}</div>
        </div>
      </div>
    `;
  }

  const statEl = app.querySelector('[data-role="stat"]');
  if (statEl && info.stat) {
    const stats = [
      ['播放', info.stat.view],
      ['点赞', info.stat.like],
      ['投币', info.stat.coin],
      ['收藏', info.stat.favorite],
      ['分享', info.stat.share]
    ];
    statEl.innerHTML = `
      <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; font-size: 0.88rem;">
        ${stats.map(([label, value]) => `
          <div>
            <div style="color: var(--color-text-secondary); font-size: 0.78rem;">${label}</div>
            <div style="font-weight: 600; color: var(--color-text);">${formatCount(Number(value) || 0)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const descEl = app.querySelector('[data-role="api-desc"]');
  if (descEl && info.desc) {
    descEl.textContent = info.desc;
    descEl.style.color = '';
  }
}

function bindDetailActions(app, key, item) {
  const favBtn = app.querySelector('#detail-fav');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const nowFav = toggleFavorite(key);
      favBtn.toggleAttribute('data-fav', nowFav);
      favBtn.textContent = nowFav ? '♥ 已收藏' : '♡ 收藏';
    });
  }

  const shareBtn = app.querySelector('#detail-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
        } catch { /* 用户取消 */ }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = '已复制链接';
        setTimeout(() => { shareBtn.textContent = '分享'; }, 1500);
      }
    });
  }

  const refreshBtn = app.querySelector('#detail-refresh');
  if (refreshBtn && item) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.textContent = '刷新中…';
      refreshBtn.disabled = true;
      try {
        const info = await getBilibiliVideoInfo({
          bvid: item.bvid,
          aid: item.aid,
          forceRefresh: true
        });
        applyInfoToDetail(app, info);
        refreshBtn.textContent = '已更新';
      } catch (err) {
        refreshBtn.textContent = '刷新失败';
        console.warn('[uapi] 手动刷新失败:', err.message);
      } finally {
        setTimeout(() => {
          refreshBtn.textContent = '刷新数据';
          refreshBtn.disabled = false;
        }, 1500);
      }
    });
  }
}