import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  resolve: {
    alias: { "@": "/src" },
  },
  server: { port: 5173, strictPort: true },
});
