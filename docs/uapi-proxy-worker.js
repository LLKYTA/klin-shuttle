/**
 * Cloudflare Worker 代理：把前端的请求转发到 uapis.cn。
 * 用途：绕过 CORS 限制，或把 Key 藏在 Worker 环境变量里。
 *
 * 部署步骤：
 *   1. 打开 https://workers.cloudflare.com，新建 Worker，粘贴本文件
 *   2. 在 Worker 的 Settings → Variables 里加 UAPI_KEY = uapi-xxxxxxxx
 *   3. 部署后把 Worker URL 填到项目的 js/config.js 的 proxyBase
 *
 * 例：proxyBase = 'https://uapi-proxy.your-name.workers.dev'
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type'
        }
      });
    }

    const url = new URL(request.url);
    const target = 'https://uapis.cn/api/v1' + url.pathname + url.search;

    const headers = new Headers();
    const incoming = request.headers.get('Authorization');
    const key = incoming || (env.UAPI_KEY ? `Bearer ${env.UAPI_KEY}` : '');
    if (key) headers.set('Authorization', key);
    headers.set('Accept', 'application/json');

    let res;
    try {
      res = await fetch(target, { headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'upstream fetch failed', detail: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
};