/**
 * Une seule vérité d'avancement (lot GP5) : la phase du dossier suit les jalons de
 * l'espace projet, et le client voit une frise des 15 phases (FR/AR) avec les
 * durées types de son type de projet.
 */
import { PHASES_FIXES } from "../phases.catalog";
import { PHASES_REF, dureePhase, dureeType, phaseDuCatalogue, ordrePhase } from "./referentiel";
import type { ProfilProjet } from "./profil";

const FIXES = [...PHASES_FIXES].sort((a, b) => a.order - b.order);
const ORDRE_FIXE = new Map(FIXES.map((p) => [p.code, p.order]));
export const ordreCatalogue = (code: string | null | undefined) => (code ? ORDRE_FIXE.get(code) ?? -1 : -1);

/**
 * Phase FIXE du catalogue (celle que stocke Dossier.phase) pour une phase de jalon,
 * y compris les phases générées par niveau ou par lot (86_PLANCHER_R1, LOT_PEINTURE…) :
 * la dernière phase fixe déjà atteinte (sous-sols et planchers → fondations ; lots et
 * essais → réception du gros œuvre), sinon la première phase fixe de la même phase P...
 * Jamais une phase plus avancée que la réalité.
 */
export function phaseFixe(phase: string): string | null {
  if (ORDRE_FIXE.has(phase)) return phase;
  if (/^8[56]_/.test(phase)) return "84_FONDATIONS";
  if (/^(LOT_|91_)/.test(phase)) return "90_RECEPTION_GROS_OEUVRE";
  const ref = phaseDuCatalogue(phase);
  return FIXES.find((p) => phaseDuCatalogue(p.code) === ref)?.code ?? null;
}

type JalonEtat = { phase: string; phaseGabarit?: string | null; statut: string; rang: number };
const TERMINE = new Set(["VALIDE", "SANS_OBJET"]);

/** Phase en cours d'un espace projet : celle du premier jalon non terminé (ou du dernier si tout est fini). */
export function phaseCourante(jalons: JalonEtat[]): { catalogue: string; phaseRef: string; termine: boolean } | null {
  if (!jalons.length) return null;
  const tries = [...jalons].sort((a, b) => a.rang - b.rang);
  const j = tries.find((x) => !TERMINE.has(x.statut)) ?? tries[tries.length - 1];
  const brute = j.phase;
  const catalogue = phaseFixe(brute) ?? phaseFixe(j.phaseGabarit ?? "") ?? null;
  const phaseRef = phaseDuCatalogue(brute) ?? phaseDuCatalogue(j.phaseGabarit ?? "");
  if (!catalogue || !phaseRef) return null;
  return { catalogue, phaseRef, termine: tries.every((x) => TERMINE.has(x.statut)) };
}

export interface PhaseFrise {
  code: string; ordre: number; titre: string; titreAr: string;
  statut: "FAIT" | "EN_COURS" | "A_VENIR";
  /** Phase menée en parallèle d'une autre (ex. DEXE pendant l'instruction du permis). */
  parallele?: boolean;
  /** Durée type en semaines [min, max] pour ce type de projet. */
  dureeSemaines: [number, number] | null;
}

/** Frise des 15 phases pour le client. */
export function frise(phaseRef: string | null, profil: Pick<ProfilProjet, "type" | "sousSols" | "etagesHorsSol">, paralleles: string[] = []): { phases: PhaseFrise[]; dureeTotaleMois: [number, number] | null; libelleDuree: string | null } {
  const o = ordrePhase(phaseRef);
  const phases = PHASES_REF.map((p): PhaseFrise => {
    const statut: PhaseFrise["statut"] = o < 0 ? (p.ordre === 0 ? "EN_COURS" : "A_VENIR") : p.ordre < o ? "FAIT" : p.ordre === o ? "EN_COURS" : "A_VENIR";
    const parallele = statut === "A_VENIR" && paralleles.includes(p.code);
    return { code: p.code, ordre: p.ordre, titre: p.libelleFr, titreAr: p.libelleAr, statut: parallele ? "EN_COURS" : statut, ...(parallele ? { parallele: true } : {}), dureeSemaines: dureePhase(p, profil.type) };
  });
  const d = dureeType(profil);
  return { phases, dureeTotaleMois: d?.totalMois ?? null, libelleDuree: d?.libelle ?? null };
}
