import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("maplibre-gl")) {
            return "maplibre";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      // 列表接口 — 必须放在通用 typhoon 代理前面
      "/api/typhoon/list": {
        target: "https://typhoon.slt.zj.gov.cn",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/typhoon\/list/, "/Api/TyphoonList"),
      },
      // 详情接口
      "/api/typhoon": {
        target: "https://typhoon.slt.zj.gov.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/typhoon/, "/Api/TyphoonInfo"),
      },
    },
  },
});
