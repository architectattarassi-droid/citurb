/**
 * Quantitatif GÉNÉRAL (niveau 1 du dossier) : coût par grande famille en
 * DH/m², ratios de gros œuvre comparables aux repères de praticien
 * (« gros œuvre ≈ 1 200 DH/m² », « fondations ≈ 600 DH/m² d'emprise »),
 * et besoins cumulés en matériaux et en heures de main-d'œuvre, obtenus en
 * déroulant les sous-détails de chaque ligne du DQE (niveau 2, détaillé).
 */
import { LOT_PAR_CODE, type CodeLot } from "./lots";
import { OUVRAGES } from "./ouvrages";
import { MAIN_OEUVRE, MATERIAUX, type Metier } from "./referentiel";
import type { Resultat } from "./dqe";

export type Famille = "INSTALLATION" | "TERRASSEMENTS_FONDATIONS" | "STRUCTURE_MACONNERIE" | "ETANCHEITE" | "SECOND_OEUVRE" | "EQUIPEMENTS" | "EXTERIEURS";

export const LIBELLE_FAMILLE: Record<Famille, string> = {
  INSTALLATION: "Installation de chantier",
  TERRASSEMENTS_FONDATIONS: "Terrassements, fondations et soutènements",
  STRUCTURE_MACONNERIE: "Structure, maçonnerie et enduits (gros œuvre hors fondations)",
  ETANCHEITE: "Étanchéité et isolation",
  SECOND_OEUVRE: "Second œuvre et finitions",
  EQUIPEMENTS: "Équipements (climatisation, ascenseur, solaire)",
  EXTERIEURS: "Extérieurs, réseaux et options",
};

function famille(lot: CodeLot, tags: string[]): Famille {
  if (lot === "INS") return "INSTALLATION";
  if (lot === "EXT" || lot === "VRD" || tags.includes("option")) return "EXTERIEURS";
  if (lot === "TER" || lot === "FON") return "TERRASSEMENTS_FONDATIONS";
  if (lot === "STR" || lot === "MAC") return "STRUCTURE_MACONNERIE";
  if (lot === "ETA") return "ETANCHEITE";
  if (LOT_PAR_CODE[lot].famille === "EQUIPEMENTS") return "EQUIPEMENTS";
  return "SECOND_OEUVRE";
}

export type LigneGenerale = { famille: Famille; libelle: string; montantHT: number; dhM2: number; part: number };

export type BesoinMateriau = { id: string; libelle: string; unite: string; quantite: number;
  /** Ouvrages du DQE qui consomment ce matériau (code → quantité), du plus gros au plus petit. */
  ouvrages: { code: string; quantite: number }[] };
export type BesoinMO = { metier: Metier; libelle: string; heures: number; jours: number };

export type Quantitatif = {
  surfaceReference: number;
  general: LigneGenerale[];
  /** Repères de praticien. */
  ratios: {
    /** Semelles, longrines, amorces, béton de propreté, par m² d'emprise (repère praticien : ≈ 600 en semelles isolées). */
    fondationsStrictesDhM2Emprise: number;
    /** Hérisson + dallage, par m² de dallage. */
    dallageDhM2: number;
    /** Terrassements hors sous-sol, par m² d'emprise. */
    terrassementsDhM2Emprise: number;
    /** Structure béton armé + murs extérieurs + acrotères, par m² de plancher total (repère praticien : ≈ 1 200, MO + matière). */
    grosOeuvreStrictDhM2: number;
    /** Cloisons, enduits intérieurs et chapes, par m² de plancher hors sous-sol. */
    cloisonsEnduitsChapesDhM2: number;
    grosOeuvreDhM2: number;
    grosOeuvreHorsFondationsDhM2: number;
    fondationsDhM2Emprise: number;
    soutenementsHT: number;
    betonM3ParM2: number;
    acierKgParM2: number;
    acierKgParM3: number;
  };
  materiaux: BesoinMateriau[];
  mainOeuvre: BesoinMO[];
};

/** Déroule le sous-détail d'un ouvrage (sous-ouvrages compris) pour une quantité donnée. */
function derouler(code: string, qte: number, mat: Map<string, number>, mo: Map<Metier, number>, parOuvrage?: Map<string, Map<string, number>>, racine = code) {
  const o = OUVRAGES[code];
  for (const c of o.composants) {
    if (c.type === "mat") {
      const v = qte * c.qte * (1 + (c.perte ?? 0));
      mat.set(c.ref, (mat.get(c.ref) ?? 0) + v);
      if (parOuvrage) {
        const m = parOuvrage.get(c.ref) ?? new Map<string, number>();
        m.set(racine, (m.get(racine) ?? 0) + v);
        parOuvrage.set(c.ref, m);
      }
    } else if (c.type === "mo") mo.set(c.metier, (mo.get(c.metier) ?? 0) + qte * c.h);
    else derouler(c.ref, qte * c.qte, mat, mo, parOuvrage, racine);
  }
}

export function quantitatif(r: Resultat): Quantitatif {
  const S = r.geometrie.surfaceTotale;
  const ins = r.installationHT / (r.ouvragesHT || 1);
  const tot = new Map<Famille, number>();
  for (const l of r.lignes) {
    const f = famille(l.lot, l.tags);
    tot.set(f, (tot.get(f) ?? 0) + l.montant * (1 + ins));
  }
  // L'installation est déjà répartie au prorata dans chaque famille : on l'affiche à part.
  const general: LigneGenerale[] = (Object.keys(LIBELLE_FAMILLE) as Famille[])
    .map((f) => {
      const m = f === "INSTALLATION" ? r.installationHT : (tot.get(f) ?? 0) / (1 + ins);
      return { famille: f, libelle: LIBELLE_FAMILLE[f], montantHT: m, dhM2: m / S, part: m / r.travauxHT };
    })
    .filter((x) => x.montantHT > 0);

  const somme = (pred: (l: Resultat["lignes"][number]) => boolean) => r.lignes.filter(pred).reduce((s, l) => s + l.montant, 0);
  const fondations = somme((l) => (l.lot === "FON" || l.lot === "TER") && !l.tags.includes("sous_sol") && !l.tags.includes("soutenement") && !l.tags.includes("pente") && !l.tags.includes("option"));
  const horsFond = somme((l) => (l.lot === "STR" || l.lot === "MAC" || l.lot === "ETA") && !l.tags.includes("sous_sol"));
  const soutenements = somme((l) => l.tags.includes("soutenement"));
  const horsSS = (l: Resultat["lignes"][number]) => !l.tags.includes("sous_sol") && !l.tags.includes("soutenement") && !l.tags.includes("pente") && !l.tags.includes("option");
  const fondStrictes = somme((l) => horsSS(l) && ["FON.01", "FON.02", "FON.03", "FON.04", "FON.05", "FON.06", "FON.09"].includes(l.ouvrage));
  const lignesDallage = r.lignes.filter((l) => !l.tags.includes("soutenement") && ["FON.07", "FON.08"].includes(l.ouvrage));
  const dallage = lignesDallage.reduce((s, l) => s + l.montant, 0);
  const surfDallage = lignesDallage.filter((l) => l.ouvrage === "FON.08").reduce((s, l) => s + l.qte, 0);
  const terrassements = somme((l) => horsSS(l) && l.lot === "TER");
  const goStrict = somme((l) => !l.tags.includes("sous_sol") && (l.lot === "STR" || ["MAC.01", "MAC.02"].includes(l.ouvrage)));
  const cloisonsEnduits = somme((l) => !l.tags.includes("sous_sol") && ["MAC.03", "MAC.05", "MAC.06", "MAC.07"].includes(l.ouvrage));

  const mat = new Map<string, number>();
  const mo = new Map<Metier, number>();
  const parOuvrage = new Map<string, Map<string, number>>();
  for (const l of r.lignes) derouler(l.ouvrage, l.qte, mat, mo, parOuvrage);
  const beton = ["BPE_B15", "BPE_B25", "BPE_B30"].reduce((s, k) => s + (mat.get(k) ?? 0), 0);
  const betonArme = ["BPE_B25", "BPE_B30"].reduce((s, k) => s + (mat.get(k) ?? 0), 0);
  const acier = mat.get("ACIER_HA") ?? 0;
  const surfaceHorsSousSol = S - r.geometrie.surfaceSousSol;

  return {
    surfaceReference: S,
    general,
    ratios: {
      fondationsStrictesDhM2Emprise: fondStrictes * (1 + ins) / r.geometrie.emprise,
      dallageDhM2: surfDallage ? dallage * (1 + ins) / surfDallage : 0,
      terrassementsDhM2Emprise: terrassements * (1 + ins) / r.geometrie.emprise,
      grosOeuvreStrictDhM2: goStrict * (1 + ins) / S,
      cloisonsEnduitsChapesDhM2: cloisonsEnduits * (1 + ins) / (surfaceHorsSousSol || S),
      grosOeuvreDhM2: (fondations + horsFond) * (1 + ins) / S,
      grosOeuvreHorsFondationsDhM2: horsFond * (1 + ins) / (surfaceHorsSousSol || S),
      fondationsDhM2Emprise: fondations * (1 + ins) / r.geometrie.emprise,
      soutenementsHT: soutenements * (1 + ins),
      betonM3ParM2: beton / S,
      acierKgParM2: acier / S,
      acierKgParM3: betonArme ? acier / betonArme : 0,
    },
    materiaux: [...mat.entries()]
      .map(([id, q]) => ({ id, libelle: MATERIAUX[id].libelle, unite: MATERIAUX[id].unite, quantite: q,
        ouvrages: [...(parOuvrage.get(id) ?? new Map()).entries()].map(([code, v]) => ({ code, quantite: v })).sort((a, b) => b.quantite - a.quantite) }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr")),
    mainOeuvre: [...mo.entries()]
      .map(([metier, h]) => ({ metier, libelle: MAIN_OEUVRE[metier].libelle, heures: h, jours: h / 8 }))
      .sort((a, b) => b.heures - a.heures),
  };
}
