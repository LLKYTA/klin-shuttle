#!/usr/bin/env node
/**
 * 本地开发代理：把浏览器请求转发到 uapis.cn，并补上 CORS 头。
 *
 * 用法：
 *   UAPI_KEY=uapi-xxxxxxxx node scripts/dev-proxy.mjs
 *   （或先 export UAPI_KEY=... 再跑）
 *
 * 然后在 js/config.js 里设置：
 *   proxyBase: 'http://127.0.0.1:8787'
 *
 * 注意：这是开发工具，不要部署到生产。
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_ORIGIN = 'https://uapis.cn';
const UPSTREAM_PREFIX = '/api/v1';
const UAPI_KEY = (process.env.UAPI_KEY || '').trim();

if (!UAPI_KEY) {
  console.warn('[dev-proxy] ⚠️  未设置环境变量 UAPI_KEY。');
  console.warn('[dev-proxy] 示例：UAPI_KEY=uapi-xxxxxxxx node scripts/dev-proxy.mjs');
  console.warn('[dev-proxy] 若请求头里已带 Authorization，Key 缺失不影响。');
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Max-Age': '86400'
};

const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'method not allowed' }));
  }

  if (!req.url.startsWith('/social/')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'path not allowed' }));
  }

  const target = `${UPSTREAM_ORIGIN}${UPSTREAM_PREFIX}${req.url}`;
  const headers = { Accept: 'application/json' };

  const incoming = req.headers.authorization;
  if (incoming && /^Bearer\s+\S+/i.test(incoming)) {
    headers.Authorization = incoming;
  } else if (UAPI_KEY) {
    headers.Authorization = `Bearer ${UAPI_KEY}`;
  }

  console.log(`[dev-proxy] GET ${target}`);

  try {
    const upstream = await fetch(target, { method: 'GET', headers });
    const ct = upstream.headers.get('content-type') || 'application/json';
    const ra = upstream.headers.get('retry-after');
    res.writeHead(upstream.status, {
      'Content-Type': ct,
      ...(ra ? { 'Retry-After': ra } : {})
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('[dev-proxy] upstream error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream failed', detail: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-proxy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[dev-proxy] 把 js/config.js 的 proxyBase 设为 'http://127.0.0.1:${PORT}'`);
});
