import { defineConfig } from "vite";

// Static landing page — no framework, no SSR.
// We keep the build pure-static (output goes to ./dist) and avoid auto-open.
export default defineConfig({
  server: {
    open: false, // never auto-open a browser
    host: "127.0.0.1",
    strictPort: false
  },
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false
  }
});
