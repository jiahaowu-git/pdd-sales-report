import axios from 'axios';

// 同源相对路径（前端静态服务会代理 /api 到后端 9002），避免跨域
const baseURL = import.meta.env.VITE_API_BASE || '/';

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