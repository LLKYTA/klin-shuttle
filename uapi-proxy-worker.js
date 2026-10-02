/**
 * Cloudflare Worker 代理：把前端请求转发到 uapis.cn。
 *
 * 部署步骤：
 *   1. 打开 https://workers.cloudflare.com → Create application → Create Worker
 *   2. 把本文件全部粘贴进去 → Deploy
 *   3. Worker 页面 → Settings → Variables and Secrets → 添加
 *        Name: UAPI_KEY   Value: uapi-xxxxxxxx   Type: Secret
 *   4. 把 Worker 的 URL（形如 https://uapi-proxy.xxx.workers.dev）
 *      填入 js/config.js 的 proxyBase
 *
 * 这样浏览器只跟你的 Worker 通信，Key 存在 Worker 环境变量里，前端完全接触不到。
 */

const UPSTREAM_ORIGIN = 'https://uapis.cn';
const UPSTREAM_PREFIX = '/api/v1';

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '86400'
    };

    // 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    const url = new URL(request.url);
    // 只允许白名单路径，防止被当作开放代理滥用
    if (!url.pathname.startsWith('/social/')) {
      return json({ error: 'path not allowed' }, 403, cors);
    }

    const target = `${UPSTREAM_ORIGIN}${UPSTREAM_PREFIX}${url.pathname}${url.search}`;

    // 组装上游请求头
    const headers = new Headers();
    headers.set('Accept', 'application/json');

    const incoming = request.headers.get('Authorization');
    if (incoming && /^Bearer\s+\S+/i.test(incoming)) {
      headers.set('Authorization', incoming);
    } else if (env.UAPI_KEY) {
      headers.set('Authorization', `Bearer ${env.UAPI_KEY}`);
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        method: 'GET',
        headers,
        cf: { cacheTtl: 300, cacheEverything: true }
      });
    } catch (err) {
      return json({ error: 'upstream fetch failed', detail: err.message }, 502, cors);
    }

    const respHeaders = new Headers(cors);
    respHeaders.set(
      'Content-Type',
      upstream.headers.get('Content-Type') || 'application/json'
    );
    // 转发限流提示，让前端能读取 Retry-After
    const retryAfter = upstream.headers.get('Retry-After');
    if (retryAfter) respHeaders.set('Retry-After', retryAfter);

    // 仅成功响应才做缓存
    if (upstream.status === 200) {
      respHeaders.set('Cache-Control', 'public, max-age=300');
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, { status: upstream.status, headers: respHeaders });
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
