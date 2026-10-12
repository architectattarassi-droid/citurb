/**
 * Attribution : d'où vient le visiteur qui devient lead ?
 *
 * Au premier chargement de chaque visite, on lit l'URL et le référent :
 *   - identifiants de clic publicitaire : gclid / gbraid / wbraid (Google Ads),
 *     fbclid (Meta), ttclid (TikTok) ;
 *   - paramètres utm_* ;
 *   - domaine du référent (jamais l'URL complète).
 * On en déduit un « canal » lisible (google_ads, google_organique, youtube,
 * facebook, whatsapp, direct…).
 *
 * Premier contact : localStorage, 90 jours (durée de validité d'un gclid).
 * Dernier contact : sessionStorage. Les deux partent avec le lead
 * (colonne "utm" de la table Lead) : le back-office voit le vrai canal, et les
 * leads Google Ads gardent leur gclid pour l'import des conversions hors ligne.
 * Aucune donnée personnelle ici.
 */

export type Canal =
  | "google_ads" | "google_organique" | "youtube" | "bing" | "facebook" | "instagram"
  | "tiktok" | "whatsapp" | "linkedin" | "email" | "ia" | "referent" | "direct";

export interface Touche {
  canal: Canal;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  ttclid?: string;
  referrer?: string;
  landing?: string;
  /** ISO — heure du clic, utile pour l'import hors ligne Google Ads. */
  at: string;
}

const PREMIER = "citurbarea:attribution:premier:v1";
const DERNIER = "citurbarea:attribution:dernier:v1";
const DUREE_MS = 90 * 86_400_000;
const CLICS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid"] as const;
const UTM = ["source", "medium", "campaign", "term", "content"] as const;

const court = (v: string | null | undefined, max = 200) => (v ? v.trim().slice(0, max) : undefined) || undefined;

/** Canal d'un contact — fonction pure (testée). */
export function canalDe(t: Omit<Touche, "canal" | "at">): Canal {
  const src = (t.source || "").toLowerCase();
  const med = (t.medium || "").toLowerCase();
  const ref = (t.referrer || "").toLowerCase();
  const payant = /cpc|ppc|paid|ads?$|display|video|cpm/.test(med);
  if (t.gclid || t.gbraid || t.wbraid) return src.includes("youtube") ? "youtube" : "google_ads";
  if ((src === "google" || src === "youtube") && payant) return src === "youtube" ? "youtube" : "google_ads";
  if (t.fbclid || /facebook|fb|meta/.test(src)) return /instagram|ig/.test(src) || ref.includes("instagram") ? "instagram" : "facebook";
  if (/instagram|^ig$/.test(src)) return "instagram";
  if (t.ttclid || src.includes("tiktok") || ref.includes("tiktok")) return "tiktok";
  if (src.includes("whatsapp") || ref.includes("whatsapp") || ref === "wa.me") return "whatsapp";
  if (src.includes("youtube") || /youtube\.com$|youtu\.be$/.test(ref)) return "youtube";
  if (src.includes("linkedin") || ref.includes("linkedin")) return "linkedin";
  if (med === "email" || src.includes("mail")) return "email";
  if (src === "google" || /(^|\.)google\.[a-z.]+$/.test(ref)) return "google_organique";
  if (src === "bing" || /bing\.com$/.test(ref)) return "bing";
  if (/facebook\.com$|fb\.com$|^l\.facebook|^lm\.facebook/.test(ref)) return "facebook";
  if (/instagram\.com$/.test(ref)) return "instagram";
  if (/chatgpt\.com$|openai\.com$|perplexity\.ai$|claude\.ai$|gemini\.google|copilot\.microsoft/.test(ref)) return "ia";
  if (src || ref) return "referent";
  return "direct";
}

function lire(stockage: Storage, cle: string): Touche | null {
  try {
    const raw = stockage.getItem(cle);
    return raw ? (JSON.parse(raw) as Touche) : null;
  } catch { return null; }
}

let calcule = false;

/** À appeler au démarrage (idempotent) : enregistre le contact de cette visite. */
export function memoriserAttribution(): void {
  if (calcule || typeof window === "undefined") return;
  calcule = true;
  try {
    const p = new URLSearchParams(window.location.search);
    let referrer: string | undefined;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.hostname !== window.location.hostname) referrer = r.hostname.replace(/^www\./, "");
    } catch { /* référent illisible */ }
    const base: Omit<Touche, "canal" | "at"> = { referrer, landing: window.location.pathname.slice(0, 200) };
    for (const k of UTM) { const v = court(p.get(`utm_${k}`)); if (v) base[k] = v; }
    for (const k of CLICS) { const v = court(p.get(k), 300); if (v) base[k] = v; }
    const nouveau = !!(referrer || UTM.some((k) => base[k]) || CLICS.some((k) => base[k]));
    const existant = lire(sessionStorage, DERNIER);
    // Navigation interne (sans paramètre ni référent) : on garde le contact de la visite.
    if (!nouveau && existant) return;
    const touche: Touche = { ...base, canal: canalDe(base), at: new Date().toISOString() };
    sessionStorage.setItem(DERNIER, JSON.stringify(touche));
    const premier = lire(localStorage, PREMIER);
    if (!premier || Date.now() - Date.parse(premier.at) > DUREE_MS) localStorage.setItem(PREMIER, JSON.stringify(touche));
  } catch { /* stockage indisponible : pas d'attribution */ }
}

export function dernierContact(): Touche | null {
  memoriserAttribution();
  return typeof window === "undefined" ? null : lire(sessionStorage, DERNIER);
}

export function premierContact(): Touche | null {
  memoriserAttribution();
  if (typeof window === "undefined") return null;
  const t = lire(localStorage, PREMIER);
  return t && Date.now() - Date.parse(t.at) <= DUREE_MS ? t : null;
}

/**
 * Objet à joindre au lead (colonne "utm") : dernier contact à plat (compatible
 * avec l'ancien format source/medium/campaign…), + canal du premier contact.
 * Le gclid le plus récent connu dans les 90 jours est conservé.
 */
export function attributionLead(): Record<string, string> | undefined {
  const d = dernierContact();
  const p = premierContact();
  if (!d && !p) return undefined;
  const o: Record<string, string> = {};
  const src = d || p!;
  for (const [k, v] of Object.entries(src)) if (typeof v === "string" && v) o[k] = v;
  if (p) {
    o.premier_canal = p.canal;
    o.premier_at = p.at;
    for (const k of CLICS) if (!o[k] && p[k]) { o[k] = p[k]!; o.clic_at = p.at; }
  }
  if (d && CLICS.some((k) => d[k])) o.clic_at = d.at;
  return o;
}
