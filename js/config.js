/**
 * UAPI 配置。
 *
 * 关键：浏览器直连 uapis.cn 会被 CORS 拦截，必须配置 proxyBase。
 *
 * 三种获取代理的方式：
 *   1. 生产：部署 Cloudflare Worker（见 uapi-proxy-worker.js），把 URL 填到 proxyBase
 *   2. 本地：`UAPI_KEY=uapi-xxx node scripts/dev-proxy.mjs`，proxyBase 填 http://127.0.0.1:8787
 *   3. 兜底：proxyBase 留空 → 直连 uapis.cn（仅当上游开放 CORS 时才可用）
 *
 * Key 的填写方式（三选一，优先级从高到低）：
 *   1. 浏览器控制台：UAPI.setKey('uapi-xxxxxxxx')   → 存入 localStorage
 *   2. 本文件 apiKey 字段（本地调试用，勿提交公开仓库）
 *   3. 部署代理时把 Key 存在 Worker 环境变量 UAPI_KEY 里（前端完全接触不到）
 *
 * 获取 Key：https://uapis.cn
 */

export const UAPI_CONFIG = {
  /** API Key，形如 uapi-xxxxxxxx。留空则从 localStorage 的 'uapi.key' 读取。 */
  apiKey: '',

  /** 代理地址前缀，例如：
   *    本地：'http://127.0.0.1:8787'
   *    生产：'https://uapi-proxy.<your-name>.workers.dev'
   *  留空则直连 https://uapis.cn/api/v1（大概率被 CORS 拦）。
   */
  proxyBase: '',

  /** 缓存有效期（毫秒），默认 24 小时。设为 0 表示永不过期。 */
  cacheTTL: 24 * 60 * 60 * 1000
};
