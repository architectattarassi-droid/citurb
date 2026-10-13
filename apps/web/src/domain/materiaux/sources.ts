/**
 * Sources citées d'un prix de référence : entrées des recherches de prix
 * (docs/prix/recherche/materiaux-*.json, ≈ 560 relevés datés, avec URL) et
 * indices d'évolution (HCP, historiques de distributeurs).
 * Séparé de reference.ts : ce module embarque les JSON (≈ 400 Ko), réservé
 * aux pages matériaux et aux Pages Functions SEO.
 */
import go from "../../../../../docs/prix/recherche/materiaux-gros-oeuvre.json";
import so from "../../../../../docs/prix/recherche/materiaux-second-oeuvre.json";
import { materiau } from "./catalogue";
import { prixReference, type FiabilitePublique } from "./reference";

type Entree = {
  id: string; article?: string; marque_ou_spec?: string; unite?: string; prix_min?: number | null; prix_max?: number | null; prix_ref?: number | null;
  taxes?: string; region?: string; date_prix?: string; source_nom?: string; source_url?: string; source_type?: string; fiabilite?: string; note?: string;
};
type Indice = { id: string; indicateur: string; periode: string; valeur: number; unite: string; source_nom: string; source_url?: string; fiabilite: string; note?: string };

const ENTREES = new Map<string, Entree>();
for (const e of [...(go as { entrees: Entree[] }).entrees, ...(so as { entrees: Entree[] }).entrees]) ENTREES.set(e.id, e);
const INDICES = (go as { indices: Indice[] }).indices;

export interface SourceCitee {
  nom: string;
  url?: string;
  date?: string;
  fiabilite: FiabilitePublique;
  /** Prix relevé tel que publié par la source (unité de la source). */
  releve?: string;
  taxes?: string;
  region?: string;
}

const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const urlSure = (u?: string) => (u && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : undefined);

function releve(e: Entree): string | undefined {
  const a = e.prix_min ?? e.prix_ref, b = e.prix_max ?? e.prix_ref;
  if (a == null && b == null) return undefined;
  const p = a != null && b != null && a !== b ? `${nombre(a)} à ${nombre(b)}` : nombre((a ?? b) as number);
  return `${p} DH${e.unite ? ` / ${e.unite}` : ""}`;
}

/** Relevés cités pour le prix de référence d'un matériau (vides si le prix vient du catalogue). */
export function sourcesCitees(code: string): SourceCitee[] {
  const p = prixReference(code);
  if (!p) return [];
  if (p.origine === "catalogue")
    return [{ nom: p.libelleSource, fiabilite: p.fiabilite, ...(p.date ? { date: p.date } : {}) }];
  const out: SourceCitee[] = [];
  for (const id of p.sourceIds) {
    const kenitra = id.match(/^dqe-reel-kenitra#(\d+)$/);
    if (kenitra) {
      out.push({ nom: `Devis fournisseur réel, chantier de Kénitra (ligne ${kenitra[1]})`, date: p.date || undefined, fiabilite: "A", taxes: "prix comptoir" });
      continue;
    }
    const e = ENTREES.get(id);
    if (!e) continue;
    out.push({
      nom: e.source_nom || id, url: urlSure(e.source_url), date: e.date_prix, fiabilite: (e.fiabilite === "B" ? "B" : e.fiabilite === "A" ? "A" : "C"),
      releve: releve(e), taxes: e.taxes, region: e.region,
    });
  }
  return out.length ? out : [{ nom: "Recherche de prix CITURBAREA 2026", fiabilite: p.fiabilite, ...(p.date ? { date: p.date } : {}) }];
}

/** Indices d'évolution pertinents par famille du catalogue (et catégorie). */
const INDICES_PAR_FAMILLE: Record<string, string[]> = {
  "Liants": ["lc-ciment-6m", "ciment-livr-jul26", "hcp-ippi-pmnm-2026-06"],
  "Mortiers": ["lc-ciment-6m", "hcp-ippi-pmnm-2026-06"],
  "Aciers d'armature": ["lc-acier-6m", "hcp-ippi-metal-2026-06"],
  "Granulats": ["lc-sable-6m", "hcp-ippi-extract-2026-06"],
  "Bétons": ["lc-bpe-6m", "hcp-ippi-pmnm-2026-06"],
  "Blocs & briques": ["francobat-parpaing-1an", "hcp-ippi-pmnm-2026-06"],
  "Planchers": ["hcp-ippi-pmnm-2026-06"],
  "Canalisations": ["hcp-ippi-plast-2025-12"],
  "Évacuation": ["hcp-ippi-plast-2025-12"],
  "Profilés acier": ["hcp-ippi-metal-2026-06"],
};

export interface IndiceCite { libelle: string; periode: string; valeur: string; source: string; url?: string; fiabilite: string }

export function indicesMateriau(code: string): IndiceCite[] {
  const r = materiau(code);
  if (!r) return [];
  const ids = INDICES_PAR_FAMILLE[r.famille] || (r.categorie === "STRUCTURE_METALLIQUE" ? ["hcp-ippi-metal-2026-06"] : []);
  return ids.map((id) => INDICES.find((i) => i.id === id)).filter((i): i is Indice => !!i).map((i) => ({
    libelle: i.indicateur.replace(/\bIPPI HCP\b/, "Indice des prix à la production (HCP)"),
    periode: i.periode, valeur: `${i.valeur > 0 ? "+" : ""}${nombre(i.valeur)} ${i.unite}`, source: i.source_nom, url: urlSure(i.source_url), fiabilite: i.fiabilite,
  }));
}

/** Nombre de relevés de prix dans les recherches (affiché en page d'accueil). */
export const NB_RELEVES = ENTREES.size;
