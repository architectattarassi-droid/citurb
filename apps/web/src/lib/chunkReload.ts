/**
 * Récupération des chunks lazy introuvables après un redéploiement.
 *
 * Un onglet ouvert avant un déploiement garde en mémoire l'ancien bundle
 * principal : à la navigation suivante, `import()` réclame un chunk hashé
 * (ex. ChiffragePage-Bh1l95Wy.js) qui n'existe plus. Seul un rechargement
 * complet récupère le nouvel index.html et les bons hashes.
 *
 * Garde anti-boucle : au plus UN rechargement automatique par fenêtre de
 * RELOAD_WINDOW_MS (horodatage en sessionStorage). Si l'erreur persiste
 * après rechargement, on laisse l'erreur s'afficher.
 */

const STORAGE_KEY = "cit:chunk-reload-at";
const RELOAD_WINDOW_MS = 10_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i,
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown }).name;
  if (name === "ChunkLoadError") return true;
  const message =
    typeof error === "string"
      ? error
      : String((error as { message?: unknown }).message ?? "");
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(message));
}

/**
 * Recharge la page une seule fois. Renvoie true si un rechargement a été
 * déclenché, false si la garde l'a bloqué (rechargement récent).
 */
export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(STORAGE_KEY) || 0);
    if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponible (navigation privée stricte) : sans garde
    // possible, on ne recharge pas pour ne pas risquer une boucle.
    return false;
  }
  window.location.reload();
  return true;
}

/** Écoute `vite:preloadError` (Vite ≥ 4.4) et recharge une fois. */
export function installChunkReloadHandler(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}
