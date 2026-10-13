import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/tailwind.css";
import "./styles/citurbarea.css";
import "./styles/responsive-desktop.css";
import "./styles/mobile-overrides.css";
import { registerServiceWorker } from "./sw/register";
import { initLeadBridge } from "./features/lead-funnel/leadBridge";
import { installChunkReloadHandler } from "./lib/chunkReload";
import { startDeployWatch } from "./lib/deployWatch";
import { chargerBalises } from "./lib/marketing";
import { afficherBandeauConsentement } from "./lib/consentement";
import { memoriserAttribution } from "./lib/attribution";

// Avant le rendu : chunk lazy disparu après redéploiement → un rechargement.
installChunkReloadHandler();
// Nouveau build en ligne → rechargement à la navigation suivante.
startDeployWatch();
// Provenance de la visite (gclid, utm, référent) avant toute navigation interne.
memoriserAttribution();
// Balises (GA4, Google Ads, GTM, Meta) : seulement si leurs identifiants sont configurés,
// précédées du consentement par défaut (Consent Mode v2).
chargerBalises();
afficherBandeauConsentement();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root introuvable dans index.html");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: enregistrement du service worker (no-op en dev/http non sécurisé).
registerServiceWorker();


// Lead funnel : mémorise les UTM et rejoue la file de reprise des captures.
initLeadBridge();
