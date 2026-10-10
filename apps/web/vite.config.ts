import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Identifiant du build : commit Cloudflare Pages si disponible + horodatage.
// Embarqué dans le bundle ET publié dans /version.json : l'app compare les
// deux pour détecter un redéploiement (lib/deployWatch).
const BUILD_ID = [
  (process.env.CF_PAGES_COMMIT_SHA || "").slice(0, 8),
  Date.now().toString(36),
].filter(Boolean).join("-");

function versionJson(): Plugin {
  return {
    name: "cit-version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId: BUILD_ID }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionJson()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
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
