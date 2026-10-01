/**
 * Hash 路由核心。
 * 注册路由表，监听 hashchange，渲染对应视图。
 * 支持 :param 占位符与 ?query=value 查询参数。
 */

const routes = [];

export function register(path, viewFn) {
  routes.push({ path, viewFn });
}

function parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((value, key) => {
      query[key] = value;
    });
  }
  return { parts, query };
}

function matchRoute(parts) {
  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== parts.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < routeParts.length; i++) {
      const rp = routeParts[i];
      const actual = parts[i];

      if (rp.startsWith(':')) {
        params[rp.slice(1)] = actual;
      } else if (rp !== actual) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { viewFn: route.viewFn, params };
    }
  }
  return null;
}

function render() {
  const { parts, query } = parseHash();
  const matched = matchRoute(parts);
  const app = document.getElementById('app');

  if (!matched) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏸</div>
        <div class="empty-state-title">页面不存在</div>
        <p>请检查地址是否正确，或返回首页。</p>
      </div>`;
    return;
  }

  matched.viewFn(app, matched.params, query);
  updateNav(parts);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNav(parts) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.removeAttribute('data-active');
  });
  if (parts[0]) {
    const link = document.querySelector(`[data-nav="${parts[0]}"]`);
    if (link) link.setAttribute('data-active', '');
  }
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}