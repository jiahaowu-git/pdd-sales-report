/**
 * PM2 进程管理配置（前后端联合启动）
 * 在 代码 目录下执行：
 *   1) cd backend  && npm install && cd ..
 *   2) cd frontend && npm install && npm run build && cd ..
 *   3) pm2 start ecosystem.config.js
 *
 * 端口与环境变量全部集中在下方 apps.env，PM2 启动时注入到子进程：
 *   - 后端 PORT: 9002（后端服务）
 *   - 前端 PORT: 8002（前端静态）
 *   - API_BASE: 前端会调用该地址作为后端
 *   如需修改端口，改这里 + 重启 pm2 即可（pm2 restart pdd-frontend pdd-backend）
 *
 * 局域网访问：
 *   前端: http://<服务器IP>:8002
 *   后端: http://<服务器IP>:9002
 */
module.exports = {
  apps: [
    {
      name: "pdd-backend",
      cwd: "./backend",
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
    {
      name: "pdd-frontend",
      cwd: "./frontend",
      script: "scripts/serve.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 8002,
        HOST: "0.0.0.0",
        // 前端调用后端时使用此地址；如后端端口变更请同步修改
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
