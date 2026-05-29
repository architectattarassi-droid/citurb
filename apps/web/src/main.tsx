import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/tailwind.css";
import "./styles/citurbarea.css";
import { registerServiceWorker } from "./sw/register";
import { startWebVitals } from "./lib/web-vitals";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root introuvable dans index.html");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: enregistrement du service worker (no-op en dev/http non sécurisé).
registerServiceWorker();

// Telemetry: collecte des Web Vitals et POST vers /api/telemetry/vitals.
startWebVitals();
