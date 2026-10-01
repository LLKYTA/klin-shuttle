/**
 * UAPI 配置。
 *
 * 三种填写 API Key 的方式（任选其一）：
 *   1. 修改本文件 apiKey 字段（本地开发用，注意别提交公开仓库）
 *   2. 打开浏览器控制台执行：UAPI.setKey('uapi-xxxxxxxx')
 *   3. 部署代理（见 docs/uapi-proxy-worker.js），把 proxyBase 指向代理地址，
 *      Key 存在代理端的环境变量里，前端完全接触不到 Key。
 *
 * 获取 Key：https://uapis.cn
 */

export const UAPI_CONFIG = {
  // API Key，形如 uapi-xxxxxxxx。留空则从 localStorage 的 'uapi.key' 读取。
  apiKey: '',

  // 代理地址前缀，留空则直接请求 https://uapis.cn/api/v1。
  // 例：https://uapi-proxy.your-name.workers.dev
  proxyBase: '',

  // 缓存有效期（毫秒），默认 24 小时。设为 0 表示永不过期。
  cacheTTL: 24 * 60 * 60 * 1000
};
