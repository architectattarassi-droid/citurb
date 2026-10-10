/**
 * Détection proactive des redéploiements.
 *
 * Le build embarque son identifiant (__APP_BUILD_ID__, cf. vite.config.ts) et
 * publie le même dans /version.json. Quand l'onglet redevient visible (et au
 * plus toutes les CHECK_INTERVAL_MS), on compare : si le serveur annonce un
 * autre build, la prochaine navigation se fait par rechargement complet
 * (DeployWatcher) au lieu d'une navigation SPA — l'utilisateur ne voit jamais
 * l'erreur de chunk introuvable, et ne perd aucune saisie en cours.
 *
 * Garde anti-boucle : au plus un rechargement par build distant (si un CDN
 * servait encore l'ancien index.html, on n'insiste pas).
 */

declare const __APP_BUILD_ID__: string | undefined;

const CHECK_INTERVAL_MS = 5 * 60_000;
const RELOADED_FOR_KEY = "cit:deploy-reloaded-for";

export const CURRENT_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";

let pendingBuildId: string | null = null;
let lastCheck = 0;
let inflight: Promise<void> | null = null;

/** Build distant différent du build courant, ou null. */
export function pendingUpdate(): string | null {
  return pendingBuildId;
}

/** Signale une mise à jour connue par ailleurs (ex. nouveau service worker). */
export function flagUpdatePending(id: string): void {
  if (!pendingBuildId) pendingBuildId = id;
}

/** Interroge /version.json et met à jour pendingUpdate(). Jamais d'exception. */
export function checkForUpdate(
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
  currentId: string = CURRENT_BUILD_ID,
): Promise<void> {
  if (!currentId || inflight) return inflight ?? Promise.resolve();
  if (now - lastCheck < CHECK_INTERVAL_MS && lastCheck !== 0) return Promise.resolve();
  lastCheck = now;
  inflight = fetchImpl("/version.json", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { buildId?: unknown };
      if (typeof data.buildId === "string" && data.buildId && data.buildId !== currentId) {
        pendingBuildId = data.buildId;
      }
    })
    .catch(() => {
      // Hors ligne ou version.json absent (dev) : rien à signaler.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * À appeler après une navigation SPA : si un nouveau build est en ligne,
 * recharge une fois la page (l'URL est déjà celle de la destination).
 */
export function reloadIfUpdatePending(): boolean {
  const target = pendingBuildId;
  if (!target) return false;
  try {
    if (window.sessionStorage.getItem(RELOADED_FOR_KEY) === target) return false;
    window.sessionStorage.setItem(RELOADED_FOR_KEY, target);
  } catch {
    return false; // pas de garde possible → pas de rechargement automatique
  }
  window.location.reload();
  return true;
}

/** Branche les vérifications (retour au premier plan + intervalle). */
export function startDeployWatch(): void {
  if (typeof window === "undefined" || !CURRENT_BUILD_ID) return;
  const check = () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.setInterval(check, CHECK_INTERVAL_MS);
}

/** Réservé aux tests. */
export function __resetDeployWatch(): void {
  pendingBuildId = null;
  lastCheck = 0;
  inflight = null;
}
