/**
 * Dépôt de documents commun — client des Pages Functions (contrat
 * docs/architecture/contrat-depot-fichiers.md). Le front ne choisit pas le
 * support : il suit le plan renvoyé par le serveur (Neon en un morceau, R2
 * direct, ou R2 en morceaux de 20 Mo pour les vidéos).
 */
export type PorteDepot = { type: "admin" } | { type: "client" } | { type: "pro" } | { type: "membre" } | { type: "lien"; acces: string };
export type ContexteDepot = "conversation" | "appel" | "dossier" | "rdv" | "projet" | "demande-prix";
export type MetaDocument = { phase?: string; categorie?: string; niveau?: string; version?: string; legende?: string };
export type DocumentVue = {
  id: string; contexte: string; objetId: string; nom: string; type: string; taille: number; statut: string; version: number; meta: MetaDocument;
  deposant: string; moi: boolean; largeur: number | null; hauteur: number | null; aVignette: boolean; createdAt: string; motif: string | null;
  support?: string; archiveDrive?: boolean; supprimePar?: string | null; supprimeLe?: string | null;
};
type Res<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const base = (p: PorteDepot) =>
  p.type === "admin" ? "/api/cc/depot" : p.type === "client" ? "/api/client/depot" : p.type === "pro" ? "/api/cercles/espace/depot" : p.type === "membre" ? "/api/projets/depot" : "/api/depot";
const entetes = (p: PorteDepot, extra: Record<string, string> = {}) => ({ ...(p.type === "lien" ? { "x-acces": p.acces } : {}), ...extra });

async function appel<T>(p: PorteDepot, chemin: string, init: RequestInit = {}): Promise<Res<T>> {
  try {
    const r = await fetch(`${base(p)}${chemin}`, { credentials: "include", cache: "no-store", ...init, headers: entetes(p, (init.headers as Record<string, string>) || {}) });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    return r.ok && j?.ok ? { ok: true, data: j as T } : { ok: false, status: r.status, error: String(j?.error || "defaut") };
  } catch { return { ok: false, status: 0, error: "reseau" }; }
}

export const apiDepot = {
  lister: (p: PorteDepot, contexte: ContexteDepot, objetId: string) =>
    appel<{ documents: DocumentVue[]; support: "NEON" | "R2" }>(p, `?contexte=${encodeURIComponent(contexte)}&objetId=${encodeURIComponent(objetId)}`),
  lien: (p: PorteDepot, id: string, vignette = false) => appel<{ url: string; expire: string }>(p, `/${encodeURIComponent(id)}/lien${vignette ? "?taille=vignette" : ""}`),
  supprimer: (p: PorteDepot, id: string) => appel<{ supprime: boolean }>(p, `/${encodeURIComponent(id)}`, { method: "DELETE" }),
  moderer: (id: string, decision: "VISIBLE" | "REFUSE", motif?: string) =>
    appel<{ document: DocumentVue }>({ type: "admin" }, `/${encodeURIComponent(id)}/moderer`, { method: "POST", body: JSON.stringify({ decision, motif }), headers: { "content-type": "application/json" } }),
  aModerer: () => appel<{ documents: DocumentVue[] }>({ type: "admin" }, "/a-moderer"),

  /** Envoi complet : démarrer, morceaux (avec progression), vignette éventuelle, terminer. */
  /** `brouillon` (cabinet seulement) : déposé mais non publié, visible du cabinet seul jusqu'à la publication (moderer → VISIBLE). */
  async televerser(p: PorteDepot, o: { contexte: ContexteDepot; objetId: string; nom: string; type: string; octets: Blob; vignette?: Blob | null; meta?: MetaDocument; brouillon?: boolean },
    progression?: (fraction: number) => void): Promise<Res<{ document: DocumentVue }>> {
    const d = await appel<{ id: string; mode: string; taillePartie: number; parties: number }>(p, "/televersements", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contexte: o.contexte, objetId: o.objetId, nom: o.nom, type: o.type, taille: o.octets.size, meta: o.meta, ...(o.brouillon ? { brouillon: true } : {}) }),
    });
    if (!d.ok) return d;
    const { id, taillePartie, parties } = d.data;
    for (let n = 1; n <= parties; n++) {
      const r = await appel(p, `/televersements/${id}/${n}`, { method: "PUT", body: o.octets.slice((n - 1) * taillePartie, n * taillePartie) });
      if (!r.ok) return r;
      progression?.(n / parties);
    }
    if (o.vignette) await appel(p, `/televersements/${id}/vignette`, { method: "PUT", body: o.vignette });
    return appel<{ document: DocumentVue }>(p, `/televersements/${id}/terminer`, { method: "POST" });
  },
};

/** Ouvre un document dans un nouvel onglet (lien signé, 15 min). */
export async function ouvrirDocument(p: PorteDepot, id: string): Promise<string | null> {
  // Onglet ouvert tout de suite (sinon bloqué après l'attente), relié à rien.
  const fenetre = window.open("", "_blank");
  if (fenetre) fenetre.opener = null;
  const r = await apiDepot.lien(p, id);
  if (!r.ok) { fenetre?.close(); return r.error; }
  if (fenetre) fenetre.location.href = r.data.url; else window.location.href = r.data.url;
  return null;
}
