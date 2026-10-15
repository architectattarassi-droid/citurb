/**
 * Pièces graphiques des études (ESQ, APS, APD, EXE) — demande du fondateur du 15/10/2026.
 *
 * Les fichiers passent par le dépôt de documents commun (contrat v2,
 * docs/architecture/contrat-depot-fichiers.md, contexte « dossier ») avec les
 * métadonnées libres { phase, categorie, niveau, legende }. Le NOM du fichier est
 * fixé par la case occupée (phase + catégorie + niveau) : le service numérote alors
 * lui-même les versions (v1, v2…) et garde les précédentes consultables.
 *
 * Vidéos : tant que R2 n'est pas activé, un lien YouTube (non répertorié) ou Vimeo,
 * lu dans un lecteur intégré, « vidéo hébergée hors CITURBAREA ». Ces liens sont de
 * simples références rangées dans Dossier.payload.gestion.videos (aucun fichier stocké).
 */

export const PHASES_PLANS = [
  { code: "ESQ", fr: "Esquisse", ar: "الرسم الأولي" },
  { code: "APS", fr: "Avant-projet sommaire (APS)", ar: "المشروع التمهيدي الموجز" },
  { code: "APD", fr: "Avant-projet détaillé (APD)", ar: "المشروع التمهيدي المفصل" },
  { code: "EXE", fr: "Études d'exécution (EXE)", ar: "دراسات التنفيذ" },
] as const;
export type PhasePlan = (typeof PHASES_PLANS)[number]["code"];

/** Catégories (codes alignés sur le composant DepotDocuments du dépôt commun). */
export const CATEGORIES_PLANS = [
  { code: "situation-masse", fr: "Plan de situation et plan de masse", ar: "تصميم الموقع والتصميم الكتلي", par: null },
  { code: "plan-niveau", fr: "Plans d'étage", ar: "تصاميم الطوابق", par: "niveau" },
  { code: "coupe", fr: "Coupes", ar: "المقاطع", par: null },
  { code: "facade", fr: "Façades", ar: "الواجهات", par: "orientation" },
  { code: "vue-3d", fr: "Vues et perspectives 3D", ar: "مناظر ومنظورات ثلاثية الأبعاد", par: null },
  { code: "detail", fr: "Détails", ar: "التفاصيل", par: null },
  { code: "video", fr: "Vidéos", ar: "فيديوهات", par: null },
  { code: "notice", fr: "Notices et autres PDF", ar: "المذكرات ووثائق PDF أخرى", par: null },
] as const;
export type CategoriePlan = (typeof CATEGORIES_PLANS)[number]["code"];

/** Niveaux (onglets des plans d'étage) et orientations (façades). Rangés dans meta.niveau. */
export function niveauxDuProjet(sousSols = 0, etagesHorsSol = 1): string[] {
  return [...Array.from({ length: Math.max(0, sousSols) }, (_, i) => `SS${sousSols - i}`), "RDC", ...Array.from({ length: Math.max(0, etagesHorsSol) }, (_, i) => `R+${i + 1}`), "Terrasse"];
}
export const ORIENTATIONS = ["Nord", "Sud", "Est", "Ouest", "Nord-Est", "Nord-Ouest", "Sud-Est", "Sud-Ouest", "Sur rue", "Sur jardin"];
const ORDRE_NIVEAU = (n: string) => (/^SS(\d+)$/.test(n) ? -Number(n.slice(2)) : n === "RDC" ? 0 : /^R\+(\d+)$/.test(n) ? Number(n.slice(2)) : 99);
export const trierNiveaux = (l: string[]) => [...l].sort((a, b) => ORDRE_NIVEAU(a) - ORDRE_NIVEAU(b) || a.localeCompare(b, "fr"));

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Nom fixé par la case : même case = nouvelle version du même document. */
export function nomCanonique(phase: string, categorie: string, niveau: string | null | undefined, ext: string, titre?: string | null): string {
  const parties = [phase, categorie, niveau ? slug(niveau) : "", titre ? slug(titre).slice(0, 40) : ""].filter(Boolean);
  return `${parties.join("-")}.${ext.replace(/^\./, "").toLowerCase()}`;
}
/** Extension d'après le type réel déclaré (le serveur revérifie dans les octets). */
export const extensionDe = (type: string) => ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" } as Record<string, string>)[type] ?? null;

// ── Liens vidéo (YouTube non répertorié, Vimeo) ─────────────────────────

export type LienVideo = { fournisseur: "youtube" | "vimeo"; id: string; integration: string; lien: string };

/** Lien accepté seulement s'il vient de YouTube ou Vimeo ; renvoie l'adresse du lecteur intégré. */
export function lienVideo(brut: unknown): LienVideo | null {
  if (typeof brut !== "string" || brut.length > 300) return null;
  let u: URL;
  try { u = new URL(brut.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (h === "youtu.be") id = u.pathname.slice(1);
  else if (h === "youtube.com" || h === "youtube-nocookie.com") id = u.searchParams.get("v") ?? (u.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/)?.[2] ?? null);
  if (id !== null) return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? { fournisseur: "youtube", id, integration: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, lien: `https://youtu.be/${id}` } : null;
  if (h === "vimeo.com" || h === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,12})(?:\/([0-9a-f]{6,20}))?/);
    if (!m) return null;
    const hash = m[2] ?? u.searchParams.get("h");
    const h2 = hash && /^[0-9a-f]{6,20}$/.test(hash) ? hash : null;
    return { fournisseur: "vimeo", id: m[1], integration: `https://player.vimeo.com/video/${m[1]}${h2 ? `?h=${h2}` : ""}`, lien: `https://vimeo.com/${m[1]}${h2 ? `/${h2}` : ""}` };
  }
  return null;
}

export interface VideoLien {
  id: string; phase: PhasePlan; titre: string; lien: string; integration: string; fournisseur: "youtube" | "vimeo";
  version: number; publie: boolean; auteur: string; createdAt: string;
}

/** Ajoute un lien vidéo (nouvelle version si même phase et même titre). */
export function ajouterVideo(liste: VideoLien[], o: { phase: unknown; titre: unknown; url: unknown; publie?: unknown }, auteur: string, le: string, id: string): { ok: true; liste: VideoLien[]; video: VideoLien } | { ok: false; erreur: string } {
  const phase = PHASES_PLANS.find((p) => p.code === o.phase)?.code;
  if (!phase) return { ok: false, erreur: "phase_invalide" };
  const titre = typeof o.titre === "string" ? o.titre.trim().slice(0, 120) : "";
  if (!titre) return { ok: false, erreur: "titre_requis" };
  const l = lienVideo(o.url);
  if (!l) return { ok: false, erreur: "lien_video_invalide" };
  const version = 1 + Math.max(0, ...liste.filter((v) => v.phase === phase && slug(v.titre) === slug(titre)).map((v) => v.version));
  const video: VideoLien = { id, phase, titre, lien: l.lien, integration: l.integration, fournisseur: l.fournisseur, version, publie: o.publie === true, auteur, createdAt: le };
  return { ok: true, liste: [...liste, video].slice(-200), video };
}

export const videosDe = (payload: unknown): VideoLien[] => {
  const g = (payload && typeof payload === "object" ? (payload as Record<string, unknown>).gestion : null) as Record<string, unknown> | null;
  return Array.isArray(g?.videos) ? (g!.videos as VideoLien[]).filter((v) => v && typeof v.integration === "string" && lienVideo(v.lien)) : [];
};
