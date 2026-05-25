/**
 * CITURBAREA — Web Vitals reporter "zero-dep".
 *
 * Pas d'install de la lib `web-vitals` (200+ ko gzipped + politique externe) :
 * on utilise les Performance APIs natives (PerformanceObserver) pour collecter
 * LCP, CLS, INP-approx, TTFB, et on POST batch vers /api/telemetry/vitals via
 * sendBeacon au moment du `pagehide` (survit aux fermetures d'onglets).
 *
 * Si l'endpoint n'existe pas côté API → l'envoi silencieux échoue, l'utilisateur
 * ne voit rien. Pas d'incident bloquant.
 *
 * Doctrine : pas de cookie tiers, pas d'identifiant utilisateur transmis,
 * uniquement des compteurs anonymes (URL + UA + perf metrics).
 */

interface VitalSample {
  name: "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
}

interface VitalsPayload {
  url: string;
  ua: string;
  ts: number;
  samples: VitalSample[];
  // Build/version pour faciliter l'analyse côté OPS
  v?: string;
}

const samples: VitalSample[] = [];
let started = false;

function rate(name: VitalSample["name"], v: number): VitalSample["rating"] {
  // Seuils Google Core Web Vitals (2025).
  switch (name) {
    case "LCP":
      return v <= 2500 ? "good" : v <= 4000 ? "needs-improvement" : "poor";
    case "CLS":
      return v <= 0.1 ? "good" : v <= 0.25 ? "needs-improvement" : "poor";
    case "INP":
      return v <= 200 ? "good" : v <= 500 ? "needs-improvement" : "poor";
    case "FCP":
      return v <= 1800 ? "good" : v <= 3000 ? "needs-improvement" : "poor";
    case "TTFB":
      return v <= 800 ? "good" : v <= 1800 ? "needs-improvement" : "poor";
    default:
      return undefined;
  }
}

function push(name: VitalSample["name"], value: number): void {
  samples.push({ name, value, rating: rate(name, value) });
}

function observe<T extends PerformanceEntry>(
  type: string,
  cb: (entries: T[]) => void,
): void {
  try {
    const po = new PerformanceObserver((list) => {
      cb(list.getEntries() as T[]);
    });
    po.observe({ type, buffered: true } as PerformanceObserverInit);
  } catch {
    /* type non supporté → silent skip */
  }
}

function flush(): void {
  if (!samples.length) return;
  const payload: VitalsPayload = {
    url: window.location.pathname + window.location.search,
    ua: navigator.userAgent,
    ts: Date.now(),
    samples: samples.splice(0, samples.length),
  };
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/telemetry/vitals", blob);
      return;
    }
    void fetch("/api/telemetry/vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* silent */
    });
  } catch {
    /* silent */
  }
}

export function startWebVitals(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  if (typeof PerformanceObserver === "undefined") return;
  started = true;

  // LCP — dernière entrée wins
  let lcp = 0;
  observe<PerformanceEntry & { startTime: number }>(
    "largest-contentful-paint",
    (entries) => {
      const last = entries[entries.length - 1];
      if (last && last.startTime > lcp) lcp = last.startTime;
    },
  );

  // CLS — somme des shifts non liés à un input
  let cls = 0;
  observe<PerformanceEntry & { value: number; hadRecentInput: boolean }>(
    "layout-shift",
    (entries) => {
      for (const e of entries) {
        if (!e.hadRecentInput) cls += e.value;
      }
    },
  );

  // INP-approx — interactions discrètes, on garde le max
  let inp = 0;
  observe<PerformanceEntry & { duration: number; interactionId?: number }>(
    "event",
    (entries) => {
      for (const e of entries) {
        if (e.interactionId && e.duration > inp) inp = e.duration;
      }
    },
  );

  // FCP & TTFB depuis navigation timing (snapshot 1 fois)
  setTimeout(() => {
    try {
      const navEntries = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const nav = navEntries[0];
      if (nav) push("TTFB", Math.max(0, nav.responseStart));
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint");
      if (fcp) push("FCP", fcp.startTime);
    } catch {
      /* silent */
    }
  }, 0);

  // Flush au moment du pagehide / visibilitychange (Safari friendly)
  const onHide = () => {
    if (lcp > 0) push("LCP", lcp);
    if (cls > 0) push("CLS", cls);
    if (inp > 0) push("INP", inp);
    flush();
  };
  window.addEventListener("pagehide", onHide, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });
}
