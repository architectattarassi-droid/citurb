/**
 * Balises marketing et événements de conversion.
 *
 * Les balises (Google Tag Manager → GA4 / Google Ads, pixel Meta, pixel TikTok)
 * ne se chargent QUE si leurs identifiants sont fournis à la compilation :
 *   VITE_GTM_ID (GTM-XXXXXXX), VITE_META_PIXEL_ID (TikTok : via GTM)
 * (Cloudflare Pages → Settings → Variables). Sans identifiant, rien n'est
 * chargé ; les événements partent seulement dans window.dataLayer.
 *
 * Événements de l'entonnoir (noms stables, à déclarer comme conversions) :
 *   chiffrage_start, chiffrage_etape, decision_aid_used, devis_vu,
 *   lead_submit (conversion principale), palier2_repondu, whatsapp_click.
 * Aucune donnée personnelle n'est jamais envoyée dans ces événements.
 */

type Fenetre = Window & {
  dataLayer?: Record<string, unknown>[];
  fbq?: (...a: unknown[]) => void;
  ttq?: { track: (n: string, p?: Record<string, unknown>) => void; page?: () => void };
};

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const GTM = env.VITE_GTM_ID;
const META = env.VITE_META_PIXEL_ID;

const deja = new Set<string>();

/** Pousse un événement (dataLayer + pixels chargés). `unique` : une seule fois par page vue. */
export function evenement(nom: string, params: Record<string, string | number | boolean | undefined> = {}, unique = false): void {
  if (typeof window === "undefined") return;
  const cle = `${nom}|${window.location.pathname}`;
  if (unique) { if (deja.has(cle)) return; deja.add(cle); }
  const w = window as Fenetre;
  try {
    (w.dataLayer = w.dataLayer || []).push({ event: nom, ...params });
    if (w.fbq) {
      if (nom === "lead_submit") w.fbq("track", "Lead", params);
      else if (nom === "whatsapp_click") w.fbq("track", "Contact", params);
      else w.fbq("trackCustom", nom, params);
    }
    if (w.ttq) w.ttq.track(nom === "lead_submit" ? "SubmitForm" : nom === "whatsapp_click" ? "Contact" : nom, params);
  } catch { /* une balise défaillante ne doit jamais casser la page */ }
}

function script(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.async = true; s.src = src; s.id = id;
  document.head.appendChild(s);
}

/** Charge les balises configurées (appelé une fois au démarrage, hors back-office). */
export function chargerBalises(): void {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/cc")) return;
  const w = window as Fenetre;
  if (GTM && /^GTM-[A-Z0-9]+$/.test(GTM)) {
    (w.dataLayer = w.dataLayer || []).push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${GTM}`, "gtm-script");
  }
  if (META && /^\d{6,20}$/.test(META) && !w.fbq) {
    // Équivalent de l'extrait officiel Meta : file d'attente jusqu'au chargement de fbevents.js.
    type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; push?: unknown; loaded?: boolean; version?: string };
    const n = function (...a: unknown[]) { if (n.callMethod) n.callMethod(...a); else n.queue.push(a); } as Fbq;
    n.queue = []; n.push = n; n.loaded = true; n.version = "2.0";
    w.fbq = n;
    (w as unknown as { _fbq?: unknown })._fbq = n;
    script("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    n("init", META);
    n("track", "PageView");
  }
  // TikTok : à déclarer dans GTM (modèle officiel TikTok Pixel), pas de chargement direct.
}
