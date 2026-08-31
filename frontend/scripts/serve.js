// 简单的静态资源服务（PM2 用法：node scripts/serve.js）
// 默认托管 dist 目录，监听 0.0.0.0:8080；支持 SPA history 模式
// 端口可通过环境变量修改：PORT=8081 node scripts/serve.js
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const apiBase = process.env.API_BASE || `http://${host}:3001`;

const server = http.createServer((req, res) => {
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
  console.log(`[frontend] backend api expected at: ${apiBase}`);
});