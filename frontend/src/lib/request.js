import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || '';

const http = axios.create({
  baseURL,
  timeout: 60000,
});

http.interceptors.response.use(
  (resp) => resp.data,
  (err) => {
    const msg = err?.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  },
);

export default http;