/**
 * Balises marketing, consentement et conversions.
 *
 * Identifiants fournis à la compilation (Cloudflare Pages → Settings →
 * Variables, puis redéployer). Sans identifiant, rien n'est chargé ; les
 * événements partent seulement dans window.dataLayer.
 *   VITE_GA4_ID          G-XXXXXXXXXX   Google Analytics 4 (trafic, sources)
 *   VITE_GADS_ID         AW-123456789   Google Ads (balise globale)
 *   VITE_GADS_LEAD       libellé de l'action de conversion « Lead » (formulaire)
 *   VITE_GADS_WHATSAPP   libellé de l'action « Contact WhatsApp » (facultatif)
 *   VITE_GADS_TERRAIN    libellé de l'action « Dépôt de terrain » (facultatif)
 *   VITE_GTM_ID          GTM-XXXXXXX    (option : si GA4/Ads sont gérés dans GTM,
 *                                        ne pas renseigner aussi VITE_GA4_ID)
 *   VITE_META_PIXEL_ID   pixel Meta     (TikTok : via GTM)
 *
 * Consentement (Google Consent Mode v2, mode avancé) : posé AVANT toute balise.
 * Visiteurs de l'Espace économique européen, du Royaume-Uni et de Suisse
 * (pays fourni par Cloudflare, cf. functions/_middleware.ts) : tout refusé
 * jusqu'à leur accord — Google modélise alors les conversions. Ailleurs
 * (Maroc…) : accordé par défaut, refus possible dans le bandeau.
 *
 * Événements de l'entonnoir (noms stables) :
 *   chiffrage_start, chiffrage_etape, decision_aid_used, devis_vu,
 *   lead_submit (conversion principale), palier2_repondu, whatsapp_click,
 *   terrain_depose, video_lecture, reseau_click, terrains_vus, terrain_vu…
 * Aucune donnée personnelle dans les événements. Seule exception, Google
 * recommandée : les conversions améliorées (e-mail / téléphone hachés en
 * SHA-256 DANS le navigateur, jamais en clair), seulement si le visiteur a
 * accordé ad_user_data.
 */

type Gtag = (...a: unknown[]) => void;
type Fenetre = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
  fbq?: (...a: unknown[]) => void;
  ttq?: { track: (n: string, p?: Record<string, unknown>) => void; page?: () => void };
};

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const GTM = valide(env.VITE_GTM_ID, /^GTM-[A-Z0-9]+$/);
const GA4 = valide(env.VITE_GA4_ID, /^G-[A-Z0-9]+$/);
const GADS = valide(env.VITE_GADS_ID, /^AW-\d+$/);
const LIBELLES: Record<string, string | undefined> = {
  lead_submit: valide(env.VITE_GADS_LEAD, /^[\w-]+$/),
  whatsapp_click: valide(env.VITE_GADS_WHATSAPP, /^[\w-]+$/),
  terrain_depose: valide(env.VITE_GADS_TERRAIN, /^[\w-]+$/),
};
const META = valide(env.VITE_META_PIXEL_ID, /^\d{6,20}$/);

function valide(v: string | undefined, re: RegExp): string | undefined {
  const x = (v || "").trim();
  return re.test(x) ? x : undefined;
}

/** GA4 : noms d'événements recommandés pour les conversions clés. */
const GA4_NOM: Record<string, string> = { lead_submit: "generate_lead" };

// ── Consentement ───────────────────────────────────────────────────────

export const CLE_CONSENTEMENT = "citurbarea:consentement:v1";
export type Choix = "accepte" | "refuse";

/** EEE + Royaume-Uni + Suisse : consentement préalable exigé (RGPD / ePrivacy). */
export const PAYS_CONSENTEMENT = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
]);

export function paysVisiteur(): string | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('meta[name="cf-pays"]')?.getAttribute("content") || null;
}

/** Pays inconnu (local, pas de Cloudflare) : on applique la règle stricte. */
export function consentementPrealable(pays = paysVisiteur()): boolean {
  return !pays || PAYS_CONSENTEMENT.has(pays.toUpperCase());
}

export function choixConsentement(): Choix | null {
  try {
    const v = localStorage.getItem(CLE_CONSENTEMENT);
    return v === "accepte" || v === "refuse" ? v : null;
  } catch { return null; }
}

const etat = (ok: boolean) => {
  const v = ok ? "granted" : "denied";
  return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v };
};

/** true si les balises peuvent utiliser cookies / données utilisateur. */
export function consentementAccorde(): boolean {
  const c = choixConsentement();
  return c ? c === "accepte" : !consentementPrealable();
}

function gtagFn(): Gtag {
  const w = window as Fenetre;
  w.dataLayer = w.dataLayer || [];
  // gtag exige l'objet `arguments` (pas un tableau) : fonction classique.
  if (!w.gtag) w.gtag = function () { (w.dataLayer as unknown[]).push(arguments); } as Gtag;
  return w.gtag;
}

/** Enregistre le choix du visiteur et met à jour les balises. */
export function enregistrerConsentement(c: Choix): void {
  try { localStorage.setItem(CLE_CONSENTEMENT, c); } catch { /* stockage indisponible */ }
  if (typeof window === "undefined") return;
  gtagFn()("consent", "update", etat(c === "accepte"));
  const w = window as Fenetre;
  if (w.fbq) w.fbq("consent", c === "accepte" ? "grant" : "revoke");
  evenement("consentement", { choix: c });
}

// ── Événements ─────────────────────────────────────────────────────────

const deja = new Set<string>();
type Params = Record<string, string | number | boolean | undefined>;

/** Pousse un événement (dataLayer + balises chargées). `unique` : une seule fois par page vue. */
export function evenement(nom: string, params: Params = {}, unique = false): void {
  if (typeof window === "undefined") return;
  const cle = `${nom}|${window.location.pathname}`;
  if (unique) { if (deja.has(cle)) return; deja.add(cle); }
  const w = window as Fenetre;
  try {
    (w.dataLayer = w.dataLayer || []).push({ event: nom, ...params });
    if (GA4 || GADS) {
      const g = gtagFn();
      const { transaction_id: idConversion, valeur, ...reste } = params;
      if (GA4) g("event", GA4_NOM[nom] || nom, { ...reste, ...(typeof valeur === "number" ? { value: valeur, currency: "MAD" } : {}) });
      const libelle = LIBELLES[nom];
      if (GADS && libelle) {
        g("event", "conversion", {
          send_to: `${GADS}/${libelle}`,
          ...(typeof valeur === "number" ? { value: valeur, currency: "MAD" } : {}),
          // Déduplication côté Google : même lead envoyé deux fois = une conversion.
          ...(idConversion ? { transaction_id: String(idConversion) } : {}),
        });
      }
    }
    if (w.fbq) {
      if (nom === "lead_submit") w.fbq("track", "Lead", params);
      else if (nom === "whatsapp_click") w.fbq("track", "Contact", params);
      else w.fbq("trackCustom", nom, params);
    }
    if (w.ttq) w.ttq.track(nom === "lead_submit" ? "SubmitForm" : nom === "whatsapp_click" ? "Contact" : nom, params);
  } catch { /* une balise défaillante ne doit jamais casser la page */ }
}

// ── Conversions améliorées (Google Ads) ────────────────────────────────

async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normalisation Google : minuscules, sans espaces ; Gmail sans points avant @. */
export function normaliserEmail(e: string): string {
  const [u, d] = e.trim().toLowerCase().split("@");
  if (!d) return "";
  return `${/^(gmail|googlemail)\.com$/.test(d) ? u.replace(/\./g, "") : u}@${d}`;
}

/** E.164 : 06… → +2126… ; 00… → +… */
export function normaliserTelephone(t: string): string {
  const c = t.replace(/[^\d+]/g, "");
  if (/^0[5-7]\d{8}$/.test(c)) return `+212${c.slice(1)}`;
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  return c.startsWith("+") ? c : "";
}

/**
 * Conversion « lead » : hache e-mail / téléphone (si consentement), les donne
 * à Google Ads pour les conversions améliorées, puis pousse lead_submit.
 * `transaction_id` = identifiant opaque du lead (déduplication), jamais le téléphone.
 */
export async function conversionLead(params: Params, contact?: { email?: string; telephone?: string }): Promise<void> {
  try {
    if (GADS && contact && consentementAccorde() && typeof crypto !== "undefined" && crypto.subtle) {
      const email = contact.email ? normaliserEmail(contact.email) : "";
      const tel = contact.telephone ? normaliserTelephone(contact.telephone) : "";
      const user_data: Record<string, string> = {};
      if (email) user_data.sha256_email_address = await sha256(email);
      if (tel) user_data.sha256_phone_number = await sha256(tel);
      if (Object.keys(user_data).length) gtagFn()("set", "user_data", user_data);
    }
  } catch { /* conversions améliorées indisponibles : la conversion part quand même */ }
  evenement("lead_submit", params);
}

// ── Chargement ─────────────────────────────────────────────────────────

function script(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.async = true; s.src = src; s.id = id;
  document.head.appendChild(s);
}

/** Des balises sont-elles configurées (et donc un bandeau utile) ? */
export const balisesConfigurees = !!(GTM || GA4 || GADS || META);

/** Charge les balises configurées (appelé une fois au démarrage, hors back-office). */
export function chargerBalises(): void {
  // Ni back-office, ni espace rendez-vous (/rdv/<jeton> : l'adresse contient un jeton secret).
  if (typeof window === "undefined" || window.location.pathname.startsWith("/cc") || window.location.pathname.startsWith("/rdv/")) return;
  const w = window as Fenetre;
  if (GTM || GA4 || GADS) {
    const g = gtagFn();
    // Consent Mode v2 : valeurs par défaut AVANT le chargement des balises.
    g("consent", "default", { ...etat(consentementAccorde()), wait_for_update: 500 });
    g("set", "ads_data_redaction", !consentementAccorde());
  }
  if (GTM) {
    (w.dataLayer = w.dataLayer || []).push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${GTM}`, "gtm-script");
  }
  if (GA4 || GADS) {
    const g = gtagFn();
    script(`https://www.googletagmanager.com/gtag/js?id=${GA4 || GADS}`, "gtag-script");
    g("js", new Date());
    // GA4 suit seul les changements de page de l'application (historique navigateur).
    if (GA4) g("config", GA4);
    if (GADS) g("config", GADS, { allow_enhanced_conversions: true });
  }
  if (META && !w.fbq) {
    // Équivalent de l'extrait officiel Meta : file d'attente jusqu'au chargement de fbevents.js.
    type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; push?: unknown; loaded?: boolean; version?: string };
    const n = function (...a: unknown[]) { if (n.callMethod) n.callMethod(...a); else n.queue.push(a); } as Fbq;
    n.queue = []; n.push = n; n.loaded = true; n.version = "2.0";
    w.fbq = n;
    (w as unknown as { _fbq?: unknown })._fbq = n;
    if (!consentementAccorde()) n("consent", "revoke");
    script("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    n("init", META);
    n("track", "PageView");
  }
  // TikTok : à déclarer dans GTM (modèle officiel TikTok Pixel), pas de chargement direct.
}
