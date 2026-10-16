/**
 * Recherche dans le référentiel des matériaux (catalogue statique + codes créés
 * en modération) : texte, lot du chiffrage, phase d'achat, catégorie.
 * Fonction pure, utilisée par GET /api/materiaux/recherche (gestion de projet,
 * pages d'étape) et par le front sans réseau.
 */
import { LOTS } from "../chiffrage/lots";
import { CATALOGUE } from "./catalogue";
import { phasesMateriau, type PhaseReal } from "./phases";
import { prixReference, slugMateriau } from "./reference";
import { CATEGORIES, type Categorie, type MaterialRef } from "./types";

export interface ResultatRecherche {
  code: string;
  nom: { fr: string; ar?: string };
  categorie: string;
  famille: string;
  /** Lots du chiffrage (STR, RSO…) des ouvrages qui l'utilisent, sinon lots CPS du catalogue. */
  lots: string[];
  unite: string;
  prixReference: { min: number; ref: number; max: number; fiabilite: string } | null;
  phasesAchat: PhaseReal[];
  nbVariantes: number;
  /** Adresse de la fiche publique (/materiaux/<slug>) ; null pour un code créé sans fiche statique. */
  slug: string | null;
}

export interface CodeDynamique { code: string; libelleFr: string; libelleAr?: string | null; categorie: string; famille: string; uniteRef: string; lots?: string[] }

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const LOT_CPS_VERS_CHIFFRAGE = new Map(LOTS.flatMap((l) => l.cps.map((c) => [c.split(" ")[0], l.code as string] as [string, string])));

function lotsDe(r: MaterialRef): string[] {
  const ph = phasesMateriau(r.code);
  const parOuvrages = (ph?.ouvrages || []).map((o) => o.split(".")[0]);
  const parCps = r.lots.map((l) => LOT_CPS_VERS_CHIFFRAGE.get(l)).filter((x): x is string => !!x);
  return [...new Set([...parOuvrages, ...parCps])];
}

export function rechercherMateriaux(
  q: { texte?: string | null; lot?: string | null; phase?: string | null; categorie?: string | null; limite?: number },
  opts: { dynamiques?: CodeDynamique[]; variantes?: Record<string, number> } = {},
): { total: number; resultats: ResultatRecherche[] } {
  const k = sansAccent((q.texte || "").trim());
  const lot = (q.lot || "").toUpperCase();
  const statiques: ResultatRecherche[] = CATALOGUE.filter((r) => r.actif !== false).map((r) => {
    const p = prixReference(r.code);
    return {
      code: r.code, nom: { fr: r.libelle }, categorie: r.categorie, famille: r.famille, lots: lotsDe(r), unite: r.uniteRef,
      prixReference: p ? { min: p.min, ref: p.ref, max: p.max, fiabilite: p.fiabilite } : null,
      phasesAchat: phasesMateriau(r.code)?.realisation || [], nbVariantes: opts.variantes?.[r.code] || 0, slug: slugMateriau(r.code),
    };
  });
  const connus = new Set(statiques.map((s) => s.code));
  const dyn: ResultatRecherche[] = (opts.dynamiques || []).filter((d) => !connus.has(d.code)).map((d) => ({
    code: d.code, nom: { fr: d.libelleFr, ...(d.libelleAr ? { ar: d.libelleAr } : {}) }, categorie: d.categorie, famille: d.famille,
    lots: (d.lots || []).map((l) => LOT_CPS_VERS_CHIFFRAGE.get(l) || l), unite: d.uniteRef, prixReference: null, phasesAchat: [],
    nbVariantes: opts.variantes?.[d.code] || 0, slug: null,
  }));
  const tous = [...statiques, ...dyn].filter((r) =>
    (!lot || r.lots.includes(lot)) && (!q.phase || r.phasesAchat.includes(q.phase as PhaseReal)) && (!q.categorie || r.categorie === q.categorie)
    && (!k || sansAccent(`${r.nom.fr} ${r.nom.ar || ""} ${r.famille} ${CATEGORIES[r.categorie as Categorie] || ""} ${r.code}`).includes(k)));
  // Les mots en tête du libellé d'abord, puis les variantes fournisseurs, puis l'ordre du catalogue.
  tous.sort((a, b) => Number(k && sansAccent(b.nom.fr).startsWith(k)) - Number(k && sansAccent(a.nom.fr).startsWith(k)) || b.nbVariantes - a.nbVariantes);
  const limite = Math.max(1, Math.min(200, q.limite || 50));
  return { total: tous.length, resultats: tous.slice(0, limite) };
}
