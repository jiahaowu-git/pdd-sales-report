import axios from 'axios';

// baseURL 解析顺序：
// 1) 构建时 VITE_API_BASE（绝对 URL，例如 http://localhost:9002）
// 2) 运行时 window.__API_BASE__（绝对 URL，由 scripts/serve.js 注入）
// 3) 回落到当前 origin（依赖 vite/serve 反向代理 /api）
// 使用绝对 URL 可以让浏览器在 sandbox/preview 等场景下避开跨 origin 问题
const envBase = import.meta.env.VITE_API_BASE;
const runtimeBase = typeof window !== 'undefined' ? window.__API_BASE__ : '';
const defaultBase = typeof window !== 'undefined' ? window.location.origin : '';
const baseURL = envBase || runtimeBase || defaultBase;

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