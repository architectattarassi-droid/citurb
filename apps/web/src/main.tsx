import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/tailwind.css";
import "./styles/citurbarea.css";
import { registerServiceWorker } from "./sw/register";
import { startWebVitals } from "./lib/web-vitals";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: enregistrement du service worker (no-op en dev/http non sécurisé).
registerServiceWorker();

// Telemetry: collecte des Web Vitals et POST vers /api/telemetry/vitals.
startWebVitals();
