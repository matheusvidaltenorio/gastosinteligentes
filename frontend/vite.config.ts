import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Em desenvolvimento, requisições relativas batem no Vite e são
 * encaminhadas ao Flask (porta 5000). Em produção, defina VITE_API_URL.
 */
export default defineConfig({
  /** Em produção: Flask serve em /app/. Dev: http://127.0.0.1:5173/app/ */
  base: "/app/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/transactions": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/balance": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/insights": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/reports": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
});
