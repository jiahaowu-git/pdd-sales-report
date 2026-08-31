import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 默认与 ecosystem.config.js 中的后端 PORT（9002）保持一致；可通过 .env 中 VITE_API_BASE 覆盖
  const backend = env.VITE_API_BASE || "http://localhost:9002";
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      // 与 PM2 配置保持一致：8002（如要改端口，PM2 ecosystem.config.js + package.json dev:pm2 一起改）
      port: Number(env.VITE_PORT) || 8002,
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
