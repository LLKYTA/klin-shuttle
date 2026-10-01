/**
 * UAPI 客户端：B站视频信息查询。
 *
 * 文档：https://uapis.cn/docs/api-reference/get-social-bilibili-videoinfo
 * 端点：GET https://uapis.cn/api/v1/social/bilibili/videoinfo
 * 鉴权：Authorization: Bearer uapi-xxxxxxxx
 *
 * 特性：
 *   - localStorage + 内存双层缓存（默认 TTL 24 小时）
 *   - 10 秒超时（AbortController）
 *   - 网络异常、非 2xx、401/403、429 限流等错误分类
 *   - 支持 proxyBase 代理（隐藏 Key / 绕过 CORS）
 */

import { UAPI_CONFIG } from '../config.js';

const API_BASE = 'https://uapis.cn/api/v1';
const ENDPOINT = '/social/bilibili/videoinfo';
const CACHE_PREFIX = 'uapi:bili:';
const DEFAULT_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT = 10000;

const memCache = new Map();

export class UapiError extends Error {
  constructor(message, { kind = 'unknown', status = 0, code = 0 } = {}) {
    super(message);
    this.name = 'UapiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

function getApiKey() {
  const fromStorage = (localStorage.getItem('uapi.key') || '').trim();
  if (fromStorage) return fromStorage;
  return (UAPI_CONFIG.apiKey || '').trim();
}

function resolveUrl() {
  const proxy = (UAPI_CONFIG.proxyBase || '').trim().replace(/\/+$/, '');
  return proxy ? `${proxy}${ENDPOINT}` : `${API_BASE}${ENDPOINT}`;
}

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

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 查询 B 站视频信息。
 * @param {object} opts
 * @param {string} [opts.bvid]
 * @param {string|number} [opts.aid]
 * @param {boolean} [opts.forceRefresh]
 * @param {number} [opts.timeout]
 * @returns {Promise<object>}
 */
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

  let res;
  try {
    res = await fetchWithTimeout(url, { method: 'GET', headers }, timeout ?? DEFAULT_TIMEOUT);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new UapiError('请求超时', { kind: 'timeout' });
    }
    throw new UapiError(`网络异常：${err.message}`, { kind: 'network' });
  }

  if (res.status === 401 || res.status === 403) {
    throw new UapiError('鉴权失败：请检查 UAPI Key 是否正确', { kind: 'auth', status: res.status });
  }
  if (res.status === 429) {
    const retry = res.headers.get('Retry-After');
    throw new UapiError(
      `请求过于频繁${retry ? `，请 ${retry} 秒后重试` : ''}`,
      { kind: 'rate_limit', status: 429 }
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
  if (!data.bvid) {
    const msg = data.message || data.msg || data.error || '响应缺少 bvid 字段';
    throw new UapiError(String(msg), { kind: 'api' });
  }

  if (typeof data.pic === 'string' && data.pic.startsWith('http://')) {
    data.pic = 'https://' + data.pic.slice(7);
  }

  writeCache(cKey, data);
  return data;
}

/** 秒 → mm:ss 或 h:mm:ss */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 数字简化：12345 → 1.2万 */
export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 10000) return String(n);
  if (n < 100000000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
}