// web/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-map": ["leaflet", "react-leaflet"],
          "vendor-ws": ["socket.io-client"],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "https://hills-appraisal-bracket-except.trycloudflare.com",
      ...String(process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ],

    // Windows'ta bazen dosya değişikliklerini kaçırır → HMR çalışmaz.
    // Polling ile garanti altına alıyoruz.
    watch: {
      usePolling: true,
      interval: 250,
    },

    proxy: {
      // REST API
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },

      // Socket.IO (web/src/live/ws.js bunu kullanır)
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
      },

      // Eğer backend'de raw WebSocket endpoint'i varsa (örn: /ws)
      "/ws": {
        target: "ws://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
