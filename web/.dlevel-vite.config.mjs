import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    watch: { usePolling: true, interval: 250 },
    proxy: {
      "/health": { target: "http://127.0.0.1:3400", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:3400", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:3400", ws: true, changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:3400", ws: true, changeOrigin: true },
    },
  },
});
