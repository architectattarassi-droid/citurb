/**
 * Prix de référence PUBLIC d'un matériau du catalogue (matériauthèque
 * /materiaux), en DH HT par uniteRef — une seule source de vérité :
 *
 *   1. le code CIT correspond à un composant du moteur de chiffrage
 *      (chiffrage/correspondanceCIT.ts) dont le prix est sourcé (A, B ou C) :
 *      on affiche LE prix du moteur (referentiel.ts, ramené au HT et à
 *      l'uniteRef) — le chiffrage et la matériauthèque disent la même chose ;
 *   2. sinon, le prix de recherche du catalogue (catalogue.ts, B ou C).
 *
 * Les hypothèses du moteur (fiabilité H, sans source) ne sont JAMAIS publiées
 * comme prix de référence : on retombe sur le catalogue.
 * Module pur, sans JSON lourd : importé aussi par les Pages Functions.
 */
import { CORRESPONDANCE_CIT } from "../chiffrage/correspondanceCIT";
import { MATERIAUX, TVA_PRIX_PUBLICS, coefsRegionaux, prixHT, regimeFiscal, type FichierRecherche, type RegimeFiscal } from "../chiffrage/referentiel";
import { COEF_REGIONAL, coefRegional } from "../prix/grille2026";
import { CATALOGUE, materiau } from "./catalogue";
import { CATEGORIES, type Categorie, type MaterialRef } from "./types";

/** Taux de TVA affiché pour passer du HT au TTC (taux normal 20 %). */
export const TVA_AFFICHAGE = TVA_PRIX_PUBLICS;
/** Mois de mise à jour de la matériauthèque (titre « Prix … 2026 », priceValidUntil). */
export const MATERIAUTHEQUE_MAJ = "2026-10";

export type FiabilitePublique = "A" | "B" | "C";

export interface ReferencePrix {
  code: string;
  /** DH HT par uniteRef. */
  min: number;
  ref: number;
  max: number;
  fiabilite: FiabilitePublique;
  /** « chiffrage » : prix du moteur ; « catalogue » : prix de recherche du catalogue. */
  origine: "chiffrage" | "catalogue";
  /** Date du prix (AAAA-MM ou plage), null si la source n'est pas datée. */
  date: string | null;
  /** Origine lisible (catalogue) ou note du moteur. */
  libelleSource: string;
  /** Identifiants d'entrées des recherches docs/prix/recherche (moteur). */
  sourceIds: string[];
  fichier?: FichierRecherche;
  /** Composant du moteur de chiffrage dont le prix est repris. */
  composant?: string;
  /** Ce que la source dit de la TVA (le prix affiché est toujours HT). */
  regime: RegimeFiscal;
}

const arrondi = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);

/** Code CIT → composant(s) du moteur (inverse de CORRESPONDANCE_CIT). */
export const COMPOSANTS_PAR_CIT: Record<string, { id: string; facteur: number }[]> = {};
for (const [id, c] of Object.entries(CORRESPONDANCE_CIT)) (COMPOSANTS_PAR_CIT[c.cit] ||= []).push({ id, facteur: c.facteur });

/** Date affichée d'un prix de catalogue selon son origine (constantes de catalogue.ts). */
function dateCatalogue(source: string): string | null {
  if (/Recherche 2026-10/.test(source)) return "2026-10";
  if (/2026-07/.test(source)) return "2026-07";
  return null;
}

const cache = new Map<string, ReferencePrix | null>();

export function prixReference(code: string): ReferencePrix | null {
  if (cache.has(code)) return cache.get(code)!;
  const r = materiau(code);
  let out: ReferencePrix | null = null;
  if (r) {
    const comp = (COMPOSANTS_PAR_CIT[code] || []).find((c) => MATERIAUX[c.id] && MATERIAUX[c.id].source.fiabilite !== "H");
    if (comp) {
      const p = MATERIAUX[comp.id];
      const f = p.source.fiabilite as FiabilitePublique;
      out = {
        code, min: arrondi(prixHT(p, "min") / comp.facteur), ref: arrondi(prixHT(p, "ref") / comp.facteur), max: arrondi(prixHT(p, "max") / comp.facteur),
        fiabilite: f, origine: "chiffrage", date: p.source.date, libelleSource: p.source.note || "", sourceIds: p.source.ids,
        fichier: p.source.fichier, composant: p.id, regime: regimeFiscal(p),
      };
    } else {
      out = {
        code, min: r.prix.min, ref: r.prix.ref, max: r.prix.max, fiabilite: r.prix.fiabilite, origine: "catalogue",
        date: dateCatalogue(r.prix.source), libelleSource: r.prix.source, sourceIds: [],
        regime: { observe: "NON_INDIQUE", suppose: "HT", verifie: false },
      };
    }
  }
  cache.set(code, out);
  return out;
}

export const prixTTC = (ht: number) => Math.round(ht * (1 + TVA_AFFICHAGE) * 100) / 100;

// ───────────────────────── familles publiques ─────────────────────────

/** Grandes familles de la matériauthèque (regroupent les catégories du catalogue). */
export const FAMILLES = {
  GROS_OEUVRE: { libelle: "Gros œuvre", categories: ["GROS_OEUVRE", "ETANCHEITE", "ISOLATION", "STRUCTURE_METALLIQUE"] },
  VRD: { libelle: "VRD & extérieurs", categories: ["VRD"] },
  SECOND_OEUVRE: { libelle: "Second œuvre", categories: ["FAUX_PLAFOND", "MENUISERIE_ALU", "MENUISERIE_BOIS", "QUINCAILLERIE"] },
  FINITIONS: { libelle: "Finitions", categories: ["REVETEMENT", "MARBRERIE", "PEINTURE"] },
  EQUIPEMENTS: { libelle: "Équipements techniques", categories: ["ELECTRICITE", "PLOMBERIE", "CVC"] },
} as const satisfies Record<string, { libelle: string; categories: Categorie[] }>;
export type Famille = keyof typeof FAMILLES;

export function familleDe(c: Categorie): Famille {
  return (Object.keys(FAMILLES) as Famille[]).find((f) => (FAMILLES[f].categories as readonly Categorie[]).includes(c))!;
}

// ───────────────────────── adresses publiques ─────────────────────────

export const slugifier = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");

/** Matériaux publiés : actifs et dotés d'un prix de référence. */
export const MATERIAUX_PUBLICS: MaterialRef[] = CATALOGUE.filter((r) => r.actif !== false && prixReference(r.code));

const SLUG_PAR_CODE = new Map<string, string>();
const CODE_PAR_SLUG = new Map<string, string>();
for (const r of MATERIAUX_PUBLICS) {
  let s = slugifier(r.libelle);
  if (CODE_PAR_SLUG.has(s)) s = `${s}-${r.code.slice(4).toLowerCase()}`;
  SLUG_PAR_CODE.set(r.code, s);
  CODE_PAR_SLUG.set(s, r.code);
}
export const slugMateriau = (code: string) => SLUG_PAR_CODE.get(code) || code.toLowerCase();
/** Matériau depuis un slug ou un code CIT (ancien lien /materiaux/CIT-GO-008). */
export function materiauParSlug(s: string): MaterialRef | undefined {
  const code = CODE_PAR_SLUG.get(s.toLowerCase()) || (s.toUpperCase().startsWith("CIT-") ? s.toUpperCase() : "");
  return code ? MATERIAUX_PUBLICS.find((r) => r.code === code) : undefined;
}

export const SLUG_CATEGORIE: Record<Categorie, string> = Object.fromEntries(
  (Object.keys(CATEGORIES) as Categorie[]).map((c) => [c, slugifier(CATEGORIES[c].replace(/&/g, "et"))]),
) as Record<Categorie, string>;
export const categorieParSlug = (s: string): Categorie | undefined =>
  (Object.keys(SLUG_CATEGORIE) as Categorie[]).find((c) => SLUG_CATEGORIE[c] === s);

// ───────────────────────── régions ─────────────────────────

/** Villes dotées d'un coefficient (grille2026), libellé affiché. */
export const VILLES_COEF: { cle: string; nom: string }[] = Object.keys(COEF_REGIONAL).map((cle) => ({
  cle,
  nom: ({ fes: "Fès", meknes: "Meknès", sale: "Salé", temara: "Témara", kenitra: "Kénitra", tetouan: "Tétouan", "el jadida": "El Jadida" } as Record<string, string>)[cle]
    || cle.charAt(0).toUpperCase() + cle.slice(1),
}));

/**
 * Coefficient MATÉRIAUX d'une ville (moteur de chiffrage : écart global × 0,8,
 * base Rabat-Salé-Kénitra = 1). Ville inconnue : 1 (prix de base, non établi).
 */
export function coefMateriaux(ville: string | null | undefined): { coef: number; etabli: boolean } {
  const cle = (ville || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return { coef: coefsRegionaux(coefRegional(ville)).mat, etabli: Object.prototype.hasOwnProperty.call(COEF_REGIONAL, cle) };
}

/** Prix HT par uniteRef dans une ville (référence × coefficient matériaux). */
export function prixVille(code: string, ville: string | null | undefined): { min: number; ref: number; max: number } | null {
  const p = prixReference(code);
  if (!p) return null;
  const { coef } = coefMateriaux(ville);
  return { min: arrondi(p.min * coef), ref: arrondi(p.ref * coef), max: arrondi(p.max * coef) };
}

// ───────────────────────── gamme ─────────────────────────

export type Gamme = "eco" | "courante" | "haut";
/** Gamme déduite du libellé (le catalogue n'a pas de champ dédié). */
export function gammeDe(r: MaterialRef): Gamme {
  const l = r.libelle.toLowerCase();
  if (/(haut de gamme|premium|luxe|design|massif|importé|schüco|reynaers|grohe|geberit|inox 316)/.test(l)) return "haut";
  if (/(éco|économique|basique|entrée de gamme|standard simple)/.test(l)) return "eco";
  return "courante";
}

/** Désignation en milieu de phrase : « Prix ciment CPJ 45 », mais « Prix BA13 ». */
export const enPhrase = (s: string) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
