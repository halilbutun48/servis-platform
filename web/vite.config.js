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
      ...String(process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ],

    watch: {
      usePolling: true,
      interval: 250,
    },

    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});