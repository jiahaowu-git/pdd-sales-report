import axios from 'axios';

// baseURL 解析顺序：
// 1) 运行时 window.__API_BASE__（由 scripts/serve.js 根据 PM2 env.API_BASE 注入）
//    仅当前后端不在同一台机器时使用。
// 2) 构建时 VITE_API_BASE（仅本地 vite dev server 用）。
// 3) 默认空字符串 → axios 走相对路径，请求当前 origin/api/**，
//    由 serve.js 的 /api 反代转发到后端。同机部署时最简单、不会出 CORS 问题。
const runtimeBase = typeof window !== 'undefined' ? window.__API_BASE__ : '';
const envBase = import.meta.env.VITE_API_BASE;
const baseURL = runtimeBase || envBase || '';

const http = axios.create({
  baseURL,
  timeout: 60000,
  paramsSerializer: {
    serialize: (params) => {
      // 自定义序列化：只对中文字符 URL 编码，避免 axios 默认行为的二次编码
      const usp = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        usp.append(k, String(v));
      });
      return usp.toString();
    },
  },
});

if (typeof window !== 'undefined') {
  http.interceptors.request.use((cfg) => {
    // eslint-disable-next-line no-console
    console.log('[http]', cfg.method?.toUpperCase(), cfg.url, cfg.params);
    return cfg;
  });
}

http.interceptors.response.use(
  (resp) => resp.data,
  (err) => {
    // eslint-disable-next-line no-console
    console.log('[http error]', err?.config?.url, err?.message, 'response?', !!err?.response);
    const msg = err?.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  },
);

export default http;