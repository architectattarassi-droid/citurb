/* CITURBAREA — Service Worker (offline-ready, vanilla, no Workbox).
 *
 * Stratégies :
 *  - Précache du shell app (/, /manifest, icônes) installé au premier lancement.
 *  - Network-first pour /api/* (toujours frais, fallback offline JSON).
 *  - Stale-while-revalidate pour les assets hashés Vite (/assets/*.js, *.css, *.woff2).
 *  - Cache-first pour les icônes et le manifest.
 *  - Toute navigation (request.mode === 'navigate') retombe sur "/" depuis le précache si offline,
 *    pour que la SPA puisse au moins se charger et afficher un écran cohérent.
 *
 * Anti-pattern évité :
 *  - JAMAIS de cache pour POST/PUT/DELETE (passthrough direct).
 *  - JAMAIS de cache pour /auth, /webhooks, /uploads (passthrough).
 *  - skipWaiting + clients.claim pour un déploiement rapide.
 */
const SW_VERSION = "citurbarea-sw-v2";
const PRECACHE = `${SW_VERSION}-precache`;
const RUNTIME = `${SW_VERSION}-runtime`;
const API_CACHE = `${SW_VERSION}-api`;

// Resources critiques précachées à l'install. Pas d'asset hashé ici (le hash
// change à chaque build) — uniquement le shell stable.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Préfixes qu'on n'intercepte JAMAIS — passthrough direct au réseau.
const BYPASS_PREFIXES = [
  "/auth",
  "/webhooks",
  "/uploads",
  "/api/payment",
  "/api/cc",
  "/api/telemetry",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS).catch(() => {
          // tolère l'échec d'un asset individuel — l'install ne doit pas bloquer.
        }),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isBypass(url) {
  return BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p));
}

function isHashedAsset(url) {
  // Vite émet /assets/<name>-<hash>.{js,css}
  return (
    url.pathname.startsWith("/assets/") &&
    (url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".woff"))
  );
}

function isStaticIcon(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        error: "OFFLINE",
        message:
          "Vous êtes hors-ligne. Cette ressource n'est pas disponible en cache.",
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || networkPromise || fetch(request);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function navigationFallback(request) {
  try {
    // no-store : ne JAMAIS resservir un index.html du cache HTTP navigateur,
    // sinon l'app reste sur un ancien bundle après déploiement.
    const fresh = await fetch(request, { cache: "no-store" });
    return fresh;
  } catch {
    const cache = await caches.open(PRECACHE);
    const cached =
      (await cache.match("/index.html")) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Hors-ligne</title>
      <body style="font-family:system-ui;padding:40px;text-align:center;color:#0a0f1e;background:#f6f5f0">
      <h1 style="color:#0d3566">Vous êtes hors-ligne</h1>
      <p>L'application n'est pas encore mise en cache. Reconnectez-vous au réseau puis rechargez.</p>
      </body>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ne JAMAIS toucher aux mutations.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin → laisser le navigateur gérer (CORS, etc.)
  if (url.origin !== self.location.origin) return;

  // Bypass explicite.
  if (isBypass(url)) return;

  // Navigations SPA → tenter network, fallback shell offline.
  if (request.mode === "navigate") {
    event.respondWith(navigationFallback(request));
    return;
  }

  // Assets Vite hashés → stale-while-revalidate (immutables sur leur hash).
  if (isHashedAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  // Icônes / manifest → cache-first.
  if (isStaticIcon(url)) {
    event.respondWith(cacheFirst(request, PRECACHE));
    return;
  }

  // API GET → network-first (toujours frais).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Par défaut, stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request, RUNTIME));
});

// Permet à l'app d'invalider tout le cache (utile au logout par ex.)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});
