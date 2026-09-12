import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tarification P2 : le front consomme les SOURCES du paquet, pas son dist.
      // Cloudflare Pages construit le front sans compiler les paquets ; l'alias
      // évite de dépendre d'un dist à jour ou d'un lien node_modules de workspace.
      "@citurbarea/pricing-cnoa": fileURLToPath(new URL("../../packages/pricing-cnoa/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
