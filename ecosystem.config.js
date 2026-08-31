/**
 * PM2 进程管理配置（仅后端；前端请在另一个终端独立启动）
 *
 * 推荐启动方式（开发）：
 *   终端 1：cd 代码 && pm2 start ecosystem.config.js            # 后端（PM2）
 *   终端 2：cd 代码/frontend && npm run dev:pm2                  # 前端（vite dev server + HMR）
 *
 * 推荐启动方式（生产部署）：
 *   cd 代码/frontend && npm run build                            # 生成 dist/
 *   终端 1：cd 代码 && pm2 start ecosystem.config.js            # 后端
 *   终端 2：cd 代码/frontend && npm run serve                    # 用 scripts/serve.js 跑 dist
 *
 * 端口与环境变量全部集中在下方 apps.env：
 *   - 后端 PORT: 9002（后端服务）
 *   - 前端 PORT: 8002（vite dev server，与 package.json dev:pm2 保持一致）
 *   - VITE_API_BASE: vite 启动时注入，前端 axios 用来访问后端
 *   如需修改端口，后端改这里 + 重启 pm2；前端改 vite.config.js + package.json 的 dev:pm2
 *
 * 局域网访问：
 *   前端: http://<服务器IP>:8002
 *   后端: http://<服务器IP>:9002
 */
module.exports = {
  apps: [
    {
      name: "pdd-backend",
      cwd: "E:/秀水泱泱开发/pdd-sales-report/代码/backend",
      script: "src/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 9002,
        HOST: "0.0.0.0",
        // 拼多多销售报表根目录
        PDD_REPORTS_ROOT: "E:\\秀水泱泱开发\\pdd-sales-report\\拼多多销售报表",
      },
      max_memory_restart: "512M",
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      merge_logs: true,
      time: true,
      // 注意：不要 push 提交 PM2 dump
    },
  ],
};
