/**
 * UAPI 客户端：B站视频信息查询。
 * 文档：https://uapis.cn/docs/api-reference/get-social-bilibili-videoinfo
 * 端点：GET https://uapis.cn/api/v1/social/bilibili/videoinfo
 * 鉴权：Authorization: Bearer uapi-xxxxxxxx
 *
 * 策略：
 *   - 请求队列：最多 2 并发，两次请求间隔 ≥ 300ms
 *   - 429 / 5xx：退避重试，最多 2 次，优先读 Retry-After
 *   - 缓存：localStorage + 内存双层，默认 TTL 24 小时
 *   - 超时：10 秒（AbortController）
 *   - 代理：proxyBase 非空时改走代理，避免浏览器 CORS 拦截
 */

import { UAPI_CONFIG } from '../config.js';

const API_BASE = 'https://uapis.cn/api/v1';
const ENDPOINT = '/social/bilibili/videoinfo';
const CACHE_PREFIX = 'uapi:bili:';
const DEFAULT_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT = 10000;

/* ---------- 限流参数 ---------- */
const MAX_CONCURRENT = 2;
const MIN_INTERVAL = 300;
const MAX_RETRY = 2;
const RETRY_BASE_DELAY = 1200;

const memCache = new Map();

/* ---------- 请求队列 ---------- */

let activeCount = 0;
let lastRequestTime = 0;
let pumpTimer = null;
const queue = [];

function schedule(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });
}

function pump() {
  if (queue.length === 0) return;

  const now = Date.now();
  const hasSlot = activeCount < MAX_CONCURRENT;
  const intervalOk = now - lastRequestTime >= MIN_INTERVAL;

  if (!hasSlot || !intervalOk) {
    if (!pumpTimer) {
      const wait = Math.max(50, MIN_INTERVAL - (now - lastRequestTime));
      pumpTimer = setTimeout(() => {
        pumpTimer = null;
        pump();
      }, wait);
    }
    return;
  }

  const { task, resolve, reject } = queue.shift();
  activeCount++;
  lastRequestTime = Date.now();

  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeCount--;
      pump();
    });
}

/* ---------- 错误类型 ---------- */

export class UapiError extends Error {
  constructor(message, { kind = 'unknown', status = 0, code = 0, retryAfter = null } = {}) {
    super(message);
    this.name = 'UapiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/* ---------- 配置读取 ---------- */

function getApiKey() {
  const fromStorage = (localStorage.getItem('uapi.key') || '').trim();
  const raw = fromStorage || (UAPI_CONFIG.apiKey || '').trim();
  if (!raw) return '';
  if (!/^uapi-/.test(raw)) {
    console.warn('[uapi] Key 应以 "uapi-" 开头，当前值被忽略。请用 UAPI.setKey("uapi-xxxx") 重新设置。');
    return '';
  }
  return '';
}

function resolveUrl() {
  const proxy = (UAPI_CONFIG.proxyBase || '').trim().replace(/\/+$/, '');
  return proxy ? `${proxy}${ENDPOINT}` : `${API_BASE}${ENDPOINT}`;
}

/* ---------- 缓存 ---------- */

function cacheKeyOf(bvid, aid) {
  return CACHE_PREFIX + (bvid ? `bv:${bvid}` : `av:${aid}`);
}

function readCache(key) {
  if (memCache.has(key)) return memCache.get(key);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.t !== 'number' || typeof obj.d !== 'object') return null;
    const ttl = UAPI_CONFIG.cacheTTL ?? DEFAULT_TTL;
    if (ttl > 0 && Date.now() - obj.t > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    memCache.set(key, obj.d);
    return obj.d;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  memCache.set(key, data);
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
  } catch {
    /* localStorage 满 / 隐私模式，忽略 */
  }
}

export function clearVideoCache({ bvid, aid } = {}) {
  if (!bvid && !aid) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    memCache.clear();
    return;
  }
  const key = cacheKeyOf(bvid, aid);
  localStorage.removeItem(key);
  memCache.delete(key);
}

/* ---------- 网络请求 ---------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestOnce(url, headers, timeout) {
  let res;
  try {
    res = await fetchWithTimeout(url, { method: 'GET', headers }, timeout);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new UapiError('请求超时', { kind: 'timeout' });
    }
    // fetch 失败通常是网络/CORS/代理不可达
    throw new UapiError(
      `网络异常：${err.message}（若为 CORS 报错，请检查 proxyBase 是否已正确指向代理）`,
      { kind: 'network' }
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new UapiError('鉴权失败：请检查 UAPI Key', { kind: 'auth', status: res.status });
  }
  if (res.status === 429) {
    const raw = res.headers.get('Retry-After');
    const retryAfter = raw ? Number(raw) : null;
    throw new UapiError(
      `请求过于频繁${retryAfter ? `，${retryAfter}s 后重试` : ''}`,
      { kind: 'rate_limit', status: 429, retryAfter }
    );
  }
  if (res.status >= 500) {
    throw new UapiError(`服务端错误 HTTP ${res.status}`, { kind: 'server', status: res.status });
  }
  if (!res.ok) {
    throw new UapiError(`HTTP ${res.status}`, { kind: 'http', status: res.status });
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new UapiError('响应不是合法 JSON', { kind: 'parse' });
  }

  if (!data || typeof data !== 'object') {
    throw new UapiError('响应格式不正确', { kind: 'malformed' });
  }
  // 文档中成功响应为扁平结构，顶层必有 bvid
  if (!data.bvid) {
    const msg = data.message || data.msg || data.error || '响应缺少 bvid 字段';
    throw new UapiError(String(msg), { kind: 'api' });
  }

  // 头像/封面统一升为 https，避免混合内容被浏览器拦截
  if (typeof data.pic === 'string' && data.pic.startsWith('http://')) {
    data.pic = 'https://' + data.pic.slice(7);
  }
  if (data.owner && typeof data.owner.face === 'string' && data.owner.face.startsWith('http://')) {
    data.owner.face = 'https://' + data.owner.face.slice(7);
  }

  return data;
}

async function requestWithRetry(url, headers, timeout) {
  let attempt = 0;
  while (true) {
    try {
      return await schedule(() => requestOnce(url, headers, timeout));
    } catch (err) {
      const retryable = err.kind === 'rate_limit' || err.kind === 'server';
      if (!retryable || attempt >= MAX_RETRY) throw err;

      let delay;
      if (err.kind === 'rate_limit' && err.retryAfter != null) {
        delay = err.retryAfter * 1000;
      } else {
        delay = RETRY_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 400;
      }

      console.warn(
        `[uapi] ${err.kind} 触发重试（${attempt + 1}/${MAX_RETRY}），${(delay / 1000).toFixed(1)}s 后重发`
      );
      await sleep(delay);
      attempt++;
    }
  }
}

/* ---------- 对外接口 ---------- */

export async function getBilibiliVideoInfo({ bvid, aid, forceRefresh = false, timeout } = {}) {
  const bv = (bvid || '').trim();
  const av = aid != null ? String(aid).trim() : '';

  if (!bv && !av) {
    throw new UapiError('缺少 bvid 或 aid 参数', { kind: 'param' });
  }
  if (bv && !/^BV[0-9A-Za-z]+$/.test(bv)) {
    throw new UapiError(`bvid 格式不正确：${bv}`, { kind: 'param' });
  }
  if (!bv && av && !/^\d+$/.test(av)) {
    throw new UapiError(`aid 必须是纯数字：${av}`, { kind: 'param' });
  }

  const cKey = cacheKeyOf(bv, av);
  if (!forceRefresh) {
    const cached = readCache(cKey);
    if (cached) return cached;
  }

  const qs = new URLSearchParams();
  if (bv) qs.set('bvid', bv);
  else qs.set('aid', av);

  const url = `${resolveUrl()}?${qs.toString()}`;

  const headers = { Accept: 'application/json' };
  const key = getApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;

  const data = await requestWithRetry(url, headers, timeout ?? DEFAULT_TIMEOUT);
  writeCache(cKey, data);
  return data;
}

/* ---------- 工具函数 ---------- */

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 10000) return String(n);
  if (n < 100000000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
}

export function getQueueStatus() {
  return { active: activeCount, pending: queue.length };
}

/** 返回当前运行时配置（脱敏），用于控制台诊断。 */
export function describeRuntime() {
  const rawKey = (localStorage.getItem('uapi.key') || '').trim() || (UAPI_CONFIG.apiKey || '').trim();
  const proxy = (UAPI_CONFIG.proxyBase || '').trim();
  return {
    请求地址: resolveUrl(),
    是否走代理: !!proxy,
    代理地址: proxy || '（直连 uapis.cn，浏览器会触发 CORS）',
    Key来源: rawKey
      ? (localStorage.getItem('uapi.key') ? 'localStorage' : 'js/config.js')
      : '未配置',
    Key格式: rawKey ? (/^uapi-/.test(rawKey) ? '✅ 正确' : '❌ 应以 uapi- 开头') : '—',
    Key脱敏: rawKey ? rawKey.slice(0, 10) + '****' + rawKey.slice(-4) : '—',
    缓存TTL: UAPI_CONFIG.cacheTTL
  };
}
