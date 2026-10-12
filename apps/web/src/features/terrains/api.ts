/**
 * Annonces de terrains (porte P4) — client des Pages Functions /api/terrains.
 * Vue publique seulement : aucune coordonnée du déposant n'est jamais reçue.
 */

export type Terrain = {
  slug: string; ville: string; quartier: string | null; surface: number; prix: number | null; prixM2: number | null;
  titre: "TITRE" | "EN_COURS" | "NON_TITRE"; usage: "VILLA" | "IMMEUBLE" | "COMMERCIAL" | "AGRICOLE" | "AUTRE";
  description: string | null; deposant: string; statut: string; publieAt: string | null;
};

export const LIB_USAGE: Record<string, string> = { VILLA: "Terrain à villa", IMMEUBLE: "Terrain à immeuble", COMMERCIAL: "Terrain commercial", AGRICOLE: "Terrain agricole", AUTRE: "Terrain" };
export const LIB_TITRE: Record<string, string> = { TITRE: "Titré", EN_COURS: "Titre en cours", NON_TITRE: "Non titré (melk)" };

export const dh = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} DH`;

async function lire<T>(url: string, repli: T): Promise<T> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return repli;
    return (await r.json()) as T;
  } catch {
    return repli;
  }
}

export const listerTerrains = (ville?: string, limite?: number) =>
  lire<Terrain[]>(`/api/terrains?${new URLSearchParams({ ...(ville ? { ville } : {}), ...(limite ? { limite: String(limite) } : {}) })}`, []).then((l) => (Array.isArray(l) ? l : []));

export const terrainParSlug = (slug: string) => lire<Terrain | null>(`/api/terrains/${encodeURIComponent(slug)}`, null);

export type DepotTerrain = {
  deposant: "PROPRIETAIRE" | "INTERMEDIAIRE"; mandat: boolean; consentement: boolean; nom: string; telephone: string; email?: string;
  ville: string; quartier?: string; surface: number; prix?: number; titre: string; usage: string; description?: string; website?: string;
};

/** Dépose une annonce ; renvoie { ok, error? }. */
export async function deposerTerrain(d: DepotTerrain): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch("/api/terrains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const j = await r.json().catch(() => null);
    return r.ok && j?.ok ? { ok: true } : { ok: false, error: j?.error || `http_${r.status}` };
  } catch {
    return { ok: false, error: "reseau" };
  }
}
