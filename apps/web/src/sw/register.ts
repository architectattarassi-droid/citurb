/**
 * CITURBAREA — Service Worker registration helper.
 *
 * Importé par main.tsx. Enregistre `/sw.js` en production (https/localhost),
 * skip silencieusement en dev (Vite HMR + SW = douleur).
 *
 * Mises à jour : si un nouveau SW est trouvé en background, on déclenche
 * un event custom `cit:sw-update-available` que l'app peut écouter pour
 * proposer un toast "nouvelle version disponible".
 */

import { flagUpdatePending } from "../lib/deployWatch";

export interface RegisterOptions {
  /** URL du SW (par défaut /sw.js). */
  swUrl?: string;
  /** Désactive l'enregistrement même en prod (utile pour debug). */
  disabled?: boolean;
}

const isLocalhost = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    /^192\.168\./.test(h)
  );
};

const isDevMode = (): boolean => {
  try {
    return Boolean(
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV,
    );
  } catch {
    return false;
  }
};

const isHttps = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
};

export function registerServiceWorker(opts: RegisterOptions = {}): void {
  if (opts.disabled) return;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Skip en dev (le SW interfère avec Vite HMR).
  if (isDevMode()) return;

  // Skip si pas HTTPS (sauf localhost qui est exempt par les browsers).
  if (!isHttps() && !isLocalhost()) return;

  const swUrl = opts.swUrl ?? "/sw.js";

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swUrl, { scope: "/" })
      .then((registration) => {
        // Détecte un update en arrière-plan.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Une nouvelle version est prête → l'app peut proposer un refresh.
              window.dispatchEvent(
                new CustomEvent("cit:sw-update-available", {
                  detail: { registration },
                }),
              );
            }
          });
        });
      })
      .catch(() => {
        // Pas d'incident — le SW est un nice-to-have, pas un bloquant.
      });
  });

  // Quand un nouveau SW remplace l'ancien, recharger la page — mais à la
  // navigation suivante (DeployWatcher), jamais au milieu d'une saisie.
  // Première installation (aucun contrôleur au chargement) : clients.claim()
  // déclenche aussi controllerchange, mais rien à rafraîchir — sans cette
  // garde, chaque nouveau visiteur subissait un rechargement complet.
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    flagUpdatePending("sw");
  });
}

export function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!("serviceWorker" in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then((results) => results.every(Boolean));
}
