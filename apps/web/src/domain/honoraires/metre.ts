/**
 * Métré « honoraires » (spec §1.4, §2.1–2.3) : surfaces par niveau, surface
 * de plancher, coût prévisionnel des travaux. Distinct du métré paramétrique
 * du chiffrage (domain/chiffrage) — seule passerelle : `surfacesDepuisChiffrage`.
 *
 * Règle de la spec : ne jamais supposer. Les choix de déduction (sous-sol,
 * cour au RDC) et le traitement des fondations sont des réponses explicites :
 *   - statut TRANCHE   : réponse du cabinet, rien n'est affiché au client ;
 *   - statut HYPOTHESE : retenue pour chiffrer, affichée en bandeau d'hypothèse ;
 *   - absente          : le calcul s'arrête et liste la question à trancher.
 */
import { Dec, type EntreeDecimal } from "./decimal";
import type { CodeNiveau, Typologie, UsageNiveau } from "./types";

export interface Niveau {
  code: CodeNiveau;
  rang: number;
  usage?: UsageNiveau;
  /** Surface saisie (surfaceSource SAISIE) ; absente → calculée. */
  surface?: EntreeDecimal;
  surfaceSource?: "CALCULEE" | "SAISIE";
}

export type StatutChoix = "TRANCHE" | "HYPOTHESE";

export interface ReglesMetre {
  /** Sous-sol : emprise totale du terrain, ou réduite de la déduction d'emprise ; cour déduite ou non. */
  sousSol?: { emprise: "TOTALE" | "REDUITE"; courDeduite: boolean; statut: StatutChoix };
  /** Cour déduite au RDC (aux étages elle l'est toujours, §2.2). */
  courRdc?: { deduite: boolean; statut: StatutChoix };
}

export interface Metre {
  superficieTerrain: EntreeDecimal;
  deductionEmprise?: EntreeDecimal;
  surfaceCour?: EntreeDecimal;
  encorbellementProfondeur?: EntreeDecimal;
  empriseEtageAvecEncorbellement?: EntreeDecimal;
  niveaux: Niveau[];
  regles?: ReglesMetre;
}

export interface NiveauCalcule {
  code: CodeNiveau;
  rang: number;
  usage?: UsageNiveau;
  libelle: string;
  surface: Dec;
  source: "CALCULEE" | "SAISIE";
  /** Détail affiché littéralement : « 192 − 16 ». */
  detail: string;
}

export type ResultatSurfaces =
  | { ok: true; niveaux: NiveauCalcule[]; surfacePlancher: Dec; empriseAuSol: Dec; hypotheses: string[] }
  | { ok: false; questions: string[] };

const LIB: Record<CodeNiveau, string> = { SOUS_SOL: "Sous-sol", RDC: "Rez-de-chaussée", ETAGE: "Étage", TERRASSE: "Terrasse", MEZZANINE: "Mezzanine" };

export function libelleNiveau(n: { code: CodeNiveau; rang: number }): string {
  if (n.code === "ETAGE") return n.rang === 1 ? "1er étage" : `${n.rang}e étage`;
  if (n.code === "SOUS_SOL" && n.rang < -1) return `Sous-sol ${-n.rang}`;
  return LIB[n.code];
}

/**
 * Gabarit → niveaux PROPOSÉS (§2.1), à confirmer par l'utilisateur.
 * « R+2 » → RDC + 2 étages ; « R+3+SS » / « SS+R+3 » → sous-sol + RDC + 3 étages ;
 * « 2SS+R+4 » → 2 sous-sols. Gabarit illisible → null (jamais de niveau inventé).
 */
export function parserGabarit(gabarit: string): Array<{ code: CodeNiveau; rang: number }> | null {
  const g = gabarit.toUpperCase().replace(/\s+/g, "").replace(/RDC/g, "R");
  const parts = g.split("+");
  if (parts.some((p) => !p)) return null;
  let etages: number | null = null, sousSols = 0, r = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const ss = /^(\d*)SS$/.exec(p);
    if (ss) { sousSols += ss[1] ? Number(ss[1]) : 1; continue; }
    if (p === "R") {
      r = true;
      const suivant = parts[i + 1];
      if (suivant && /^\d+$/.test(suivant)) { etages = Number(suivant); i++; } else etages = 0;
      continue;
    }
    return null;
  }
  if (!r || etages === null || etages > 60 || sousSols > 6) return null;
  const out: Array<{ code: CodeNiveau; rang: number }> = [];
  for (let s = sousSols; s >= 1; s--) out.push({ code: "SOUS_SOL", rang: -s });
  out.push({ code: "RDC", rang: 0 });
  for (let e = 1; e <= etages; e++) out.push({ code: "ETAGE", rang: e });
  return out;
}

const txt = (d: Dec) => d.toString().replace(".", ",");

export function calculerSurfaces(m: Metre): ResultatSurfaces {
  const terrain = Dec.de(m.superficieTerrain);
  const deduction = Dec.de(m.deductionEmprise ?? 0);
  const cour = Dec.de(m.surfaceCour ?? 0);
  const encorb = m.empriseEtageAvecEncorbellement != null ? Dec.de(m.empriseEtageAvecEncorbellement) : null;
  const questions: string[] = [];
  const hypotheses: string[] = [];
  const aCalculer = (code: CodeNiveau) => m.niveaux.some((n) => n.code === code && n.surface == null);

  if (!m.niveaux.length) questions.push("Confirmer la liste des niveaux (proposée depuis le gabarit).");
  const ss = m.regles?.sousSol;
  if (aCalculer("SOUS_SOL") && !ss && (!deduction.estNul() || !cour.estNul())) {
    questions.push("Sous-sol : emprise totale du terrain ou emprise réduite ? Cour déduite au sous-sol ?");
  }
  const cr = m.regles?.courRdc;
  if (aCalculer("RDC") && !cr && !cour.estNul()) questions.push(`Cour de ${txt(cour)} m² : déduite au RDC, ou seulement aux étages ?`);
  if (questions.length) return { ok: false, questions };

  if (ss?.statut === "HYPOTHESE") {
    hypotheses.push(
      ss.emprise === "TOTALE"
        ? `Sous-sol compté à l'emprise totale du terrain, ${ss.courDeduite ? "cour déduite" : "sans déduction de cour"}`
        : `Sous-sol compté à l'emprise réduite (terrain − ${txt(deduction)} m²), ${ss.courDeduite ? "cour déduite" : "sans déduction de cour"}`,
    );
  }
  if (cr?.statut === "HYPOTHESE") {
    hypotheses.push(cr.deduite ? `Cour de ${txt(cour)} m² déduite également au RDC` : `Cour de ${txt(cour)} m² non déduite au RDC`);
  }

  const niveaux: NiveauCalcule[] = m.niveaux.map((n) => {
    const libelle = libelleNiveau(n);
    if (n.surface != null) {
      const s = Dec.de(n.surface);
      return { code: n.code, rang: n.rang, usage: n.usage, libelle, surface: s, source: "SAISIE", detail: "surface saisie" };
    }
    const termes: Dec[] = [];
    let base: Dec;
    switch (n.code) {
      case "SOUS_SOL":
        base = ss?.emprise === "REDUITE" ? terrain.moins(deduction) : terrain;
        termes.push(terrain);
        if (ss?.emprise === "REDUITE" && !deduction.estNul()) termes.push(deduction);
        if (ss?.courDeduite && !cour.estNul()) { base = base.moins(cour); termes.push(cour); }
        break;
      case "RDC":
        base = terrain.moins(deduction);
        termes.push(terrain);
        if (!deduction.estNul()) termes.push(deduction);
        if (cr?.deduite && !cour.estNul()) { base = base.moins(cour); termes.push(cour); }
        break;
      default:
        // Étage, mezzanine, terrasse : emprise d'étage (encorbellement) sinon terrain − emprise, moins la cour.
        if (encorb) { base = encorb; termes.push(encorb); }
        else { base = terrain.moins(deduction); termes.push(terrain); if (!deduction.estNul()) termes.push(deduction); }
        if (!cour.estNul()) { base = base.moins(cour); termes.push(cour); }
    }
    return { code: n.code, rang: n.rang, usage: n.usage, libelle, surface: base, source: "CALCULEE", detail: termes.map(txt).join(" − ") };
  });

  const neg = niveaux.find((n) => n.surface.estNegatif());
  if (neg) return { ok: false, questions: [`Surface négative au niveau « ${neg.libelle} » : vérifier les déductions.`] };

  const surfacePlancher = Dec.somme(niveaux.map((n) => n.surface));
  // Fondations : un seul niveau, celui posé sur le sol (le plus bas).
  const plusBas = [...niveaux].sort((a, b) => a.rang - b.rang)[0];
  return { ok: true, niveaux, surfacePlancher, empriseAuSol: plusBas ? plusBas.surface : Dec.ZERO, hypotheses };
}

export interface LigneBaseCalcul { niveaux: string; detail: string; surface: Dec }

/**
 * Tableau « Niveau | Détail du calcul | Surface » du devis (§5.1) : les étages
 * consécutifs de même calcul sont regroupés, « (192 − 16) × 3 ».
 */
export function lignesBaseCalcul(niveaux: NiveauCalcule[]): LigneBaseCalcul[] {
  const out: Array<{ membres: NiveauCalcule[] }> = [];
  for (const n of niveaux) {
    const der = out[out.length - 1];
    const ref = der?.membres[0];
    if (ref && ref.code === "ETAGE" && n.code === "ETAGE" && ref.detail === n.detail && ref.surface.egal(n.surface) && ref.usage === n.usage) der.membres.push(n);
    else out.push({ membres: [n] });
  }
  return out.map(({ membres }) => {
    const p = membres[0];
    if (membres.length === 1) return { niveaux: p.libelle, detail: p.detail, surface: p.surface };
    const premier = membres[0].rang, dernier = membres[membres.length - 1].rang;
    const detail = p.detail.includes(" ") ? `(${p.detail}) × ${membres.length}` : `${p.detail} × ${membres.length}`;
    return { niveaux: `Étages ${premier} à ${dernier}`, detail, surface: p.surface.fois(membres.length) };
  });
}

export type Fondations =
  | { incluses: true; statut?: StatutChoix }
  | { incluses: false; pu: EntreeDecimal; statut?: StatutChoix };

export interface ResultatCout {
  coutElevation: Dec;
  coutFondations: Dec;
  coutTravaux: Dec;
  hypotheses: string[];
}

/**
 * Coût prévisionnel (§2.3). `fondations` est obligatoire : poste isolé ou PU
 * réputé tout compris — choix explicite, jamais implicite (§10, point 2).
 */
export function calculerCoutTravaux(a: { surfacePlancher: Dec; empriseAuSol: Dec; puElevation: EntreeDecimal; fondations: Fondations }): ResultatCout {
  const coutElevation = a.surfacePlancher.fois(a.puElevation).centimes();
  const coutFondations = a.fondations.incluses ? Dec.ZERO : a.empriseAuSol.fois(a.fondations.pu).centimes();
  const hypotheses = a.fondations.statut === "HYPOTHESE"
    ? [a.fondations.incluses ? "Fondations comprises dans le prix unitaire d'élévation" : "Fondations chiffrées séparément sur l'emprise au sol"]
    : [];
  return { coutElevation, coutFondations, coutTravaux: coutElevation.plus(coutFondations), hypotheses };
}

/** PU d'élévation proposé (§1.6) — jamais imposé ; null = à saisir. */
export function puElevationPropose(grille: { puElevationParTypologie: Partial<Record<Typologie, string>> }, typologie: Typologie): string | null {
  return grille.puElevationParTypologie[typologie] ?? null;
}

/**
 * Visites de contrôle proposées (§3.3) : fondations + une par dalle, soit
 * une par niveau construit. Formule à confirmer (§10, point 4).
 */
export function visitesProposees(niveaux: Array<{ code: CodeNiveau }>): number {
  return 1 + niveaux.filter((n) => n.code !== "TERRASSE").length;
}

/** Message d'écart si la saisie diffère de la proposition (signalé, jamais imposé). */
export function ecartVisites(niveaux: Array<{ code: CodeNiveau }>, saisi: number): string | null {
  const p = visitesProposees(niveaux);
  return saisi === p ? null : `${saisi} visites saisies ; le gabarit en appelle normalement ${p} (fondations + une par dalle).`;
}

/** Import des surfaces d'un chiffrage existant (domain/chiffrage) : surfaces saisies, à confirmer. */
export function surfacesDepuisChiffrage(niveaux: Array<{ code: CodeNiveau; rang: number; surface: number | string }>): Niveau[] {
  return niveaux.map((n) => ({ code: n.code, rang: n.rang, surface: Dec.de(n.surface).toString(), surfaceSource: "SAISIE" }));
}
