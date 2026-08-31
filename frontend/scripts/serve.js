// 简单的静态资源服务（PM2 用法：node scripts/serve.js）
// 默认托管 dist 目录，监听 0.0.0.0:8080；支持 SPA history 模式
// 端口可通过环境变量修改：PORT=8081 node scripts/serve.js
// 反向代理：/api/** -> API_BASE；支持热改后端端口（修改后无需重新构建）
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const apiBase = process.env.API_BASE || `http://${host}:9002`;

let indexHtmlCache = null;
function getIndexHtml() {
  if (indexHtmlCache === null) {
    const file = path.join(root, 'index.html');
    indexHtmlCache = fs.readFileSync(file, 'utf8');
  }
  return indexHtmlCache;
}

function sendIndexHtml(req, res) {
  let html = getIndexHtml();
  // 在 head 里注入运行时 API base（绝对 URL），让 axios 知道真实后端位置
  const script = `\n<script>window.__API_BASE__=${JSON.stringify(apiBase)};</script>\n`;
  html = html.replace(/<head>/i, `<head>${script}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.end(html);
}

/** 把 /api/foo 代理到 API_BASE/api/foo */
function proxyApi(req, res) {
  const target = new URL(apiBase);
  const opts = {
    hostname: target.hostname,
    port: target.port || 80,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `${target.hostname}:${target.port || 80}` },
  };
  const proxy = http.request(opts, (upstream) => {
    res.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(res);
  });
  proxy.on('error', (err) => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: `bad gateway: ${err.code || err.message}` }));
  });
  req.pipe(proxy);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    sendIndexHtml(req, res);
    return;
  }
  handler(req, res, {
    public: root,
    cleanUrls: true,
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: [
      { source: '**/*.@(js|css)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ],
  }).catch((err) => {
    res.statusCode = 500;
    res.end(String(err));
  });
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] static server listening on http://${host}:${port} -> ${root}`);
  console.log(`[frontend] backend api (via /api proxy) -> ${apiBase}`);
});