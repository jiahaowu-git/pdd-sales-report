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
      // 开发服务器端口可通过 VITE_PORT 调整，如 VITE_PORT=8081 npm run dev
      port: Number(env.VITE_PORT) || 5173,
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
