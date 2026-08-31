/**
 * PM2 进程管理配置（后端 + 前端静态服务）。
 *
 * 推荐启动方式（开发）：
 *   终端 1：cd 代码 && pm2 start ecosystem.config.js             # 后端（PM2）
 *   终端 2：cd 代码/frontend && npm run dev:pm2                  # 前端（vite dev server + HMR）
 *
 * 推荐启动方式（生产部署到任意 Win/Linux 机器）：
 *   cd 代码/frontend && npm run build                            # 生成 dist/
 *   pm2 start ecosystem.config.js                                # 同时跑后端 + 前端静态服务
 *
 * 路径说明：
 *   - cwd 用 path.resolve(__dirname, ...) 相对此文件计算，机器无关。
 *   - PDD_REPORTS_ROOT 默认由后端 config.js 按 NODE_ENV 选择：
 *       development → <项目根>/../拼多多销售报表
 *       production  → D:\下载\影刀RPA下载\拼多多销售报表
 *     也可手动覆盖：
 *       PDD_REPORTS_ROOT=D:\data\pdd pm2 start ecosystem.config.js
 *
 * 端口与环境变量集中在 apps.env：
 *   - 后端 PORT: 9002
 *   - 前端 PORT: 8002（托管 dist/，并把 /api 反代到后端 9002）
 *   - 前端 API_BASE: http://<IP>:9002（注入前端 axios）
 *   如需修改端口，改这里后 pm2 restart。
 *
 * 局域网访问：
 *   前端: http://<服务器IP>:8002
 *   后端: http://<服务器IP>:9002
 */
const path = require("path");

const APP_ROOT = __dirname;
const BACKEND_CWD = path.resolve(APP_ROOT, "backend");
const FRONTEND_CWD = path.resolve(APP_ROOT, "frontend");

module.exports = {
  apps: [
    {
      name: "pdd-backend",
      cwd: BACKEND_CWD,
      script: "src/server.js",
      interpreter: "node",
      env: {
        // 默认 development —— 本地开发用，读 <代码>/../拼多多销售报表。
        // 生产部署到目标机器前，在启动命令前加 NODE_ENV=production 即可。
        // 如有需要也可显式覆盖 PDD_REPORTS_ROOT：
        //   $env:PDD_REPORTS_ROOT="D:\data\pdd"; pm2 start ecosystem.config.js
        NODE_ENV: "development",
        PORT: 9002,
        HOST: "0.0.0.0",
      },
      max_memory_restart: "512M",
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "pdd-frontend",
      cwd: FRONTEND_CWD,
      script: "scripts/serve.js",
      interpreter: "node",
      // serve.js 用 ES Modules，需通过 --input-type=module 或直接 node 14+ 支持 .mjs
      // 这里用 node 直跑 .js（package.json 里 "type": "module" 让 .js 视为 ESM）
      env: {
        // 默认 development —— 本地开发用。
        // 生产部署前改成 production（与 backend 一致）。
        NODE_ENV: "development",
        PORT: 8002,
        HOST: "0.0.0.0",
        // /api 反代目标（与后端端口一致）
        API_BASE: "http://127.0.0.1:9002",
      },
      max_memory_restart: "256M",
      out_file: "./logs/frontend-out.log",
      error_file: "./logs/frontend-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
