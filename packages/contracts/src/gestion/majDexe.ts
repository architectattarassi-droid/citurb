/**
 * Études d'exécution en parallèle de l'instruction du permis (décision du fondateur, 15/10/2026).
 *
 *   - le dossier d'exécution (DEXE, phase P05) démarre dès le DÉPÔT du dossier d'autorisation,
 *     sans attendre la décision ; seuls les marchés de travaux et l'ouverture du chantier
 *     restent conditionnés au permis obtenu (packages/contracts/src/phases.catalog.ts) ;
 *   - si le permis est modifié (observations de la commission, permis modificatif, nouvelle
 *     version des pièces d'autorisation), l'étape « Mise à jour du dossier d'exécution suite
 *     au permis » s'ouvre automatiquement : journal des écarts et pièces DEXE « à reprendre ».
 * Données : Dossier.payload.gestion.majDexe (aucune table).
 */

export const CODE_MAJ_DEXE = "GP_MAJ_DEXE";
export const TITRE_MAJ_DEXE = { fr: "Mise à jour du dossier d'exécution suite au permis", ar: "تحيين ملف التنفيذ بعد الرخصة" };

/** Pièces dont une nouvelle version vaut révision du dossier d'autorisation ou de la décision. */
export const PIECES_REVISION_PERMIS = /^P04_AUTORISATION:/;

export interface Ecart { le: string; par: string; texte: string; source: "SAISIE" | "PIECE" | "ETAPE" }
export interface MajDexe {
  ouverte: boolean;
  ouverteLe: string; declencheur: string;
  ecarts: Ecart[];
  /** Pièces DEXE (P05) déjà déposées ou validées à reprendre. */
  piecesAReprendre: string[];
  clotureLe?: string | null; cloturePar?: string | null; motifCloture?: string | null;
  /** Historique des mises à jour précédentes (closes). */
  historique?: Array<Omit<MajDexe, "historique">>;
}

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export const lireMajDexe = (payload: unknown): MajDexe | null => {
  const m = objet(objet(objet(payload).gestion).majDexe);
  return typeof m.ouverteLe === "string" ? (m as unknown as MajDexe) : null;
};

/** Ouvre (ou complète) la mise à jour : nouvel écart, pièces DEXE à reprendre ajoutées. */
export function ouvrirMajDexe(avant: MajDexe | null, e: Ecart, piecesDexe: string[]): MajDexe {
  if (avant?.ouverte) {
    return { ...avant, ecarts: [...avant.ecarts, e].slice(-100), piecesAReprendre: [...new Set([...avant.piecesAReprendre, ...piecesDexe])] };
  }
  const historique = avant ? [...(avant.historique ?? []), { ...avant, historique: undefined }].slice(-20) : [];
  return { ouverte: true, ouverteLe: e.le, declencheur: e.texte, ecarts: [e], piecesAReprendre: [...new Set(piecesDexe)], historique };
}

export function cloturerMajDexe(m: MajDexe, par: string, le: string, motif: string | null): MajDexe {
  return { ...m, ouverte: false, clotureLe: le, cloturePar: par, motifCloture: motif };
}

/**
 * Le DEXE est-il « en cours en parallèle » ? Oui dès que le dossier d'autorisation est déposé
 * (étape 30 faite) ou que le dossier est au visa / à la décision, tant que le DEXE n'est pas fait.
 */
export function dexeEnParallele(phaseCatalogue: string | null, etapes: Map<string, string>): boolean {
  const fait = (c: string) => ["FAITE", "FAITE_HORS_PLATEFORME", "DEBLOQUEE"].includes(etapes.get(c) ?? "");
  if (fait("40_DOSSIER_EXECUTION") || etapes.get("40_DOSSIER_EXECUTION") === "SANS_OBJET") return false;
  return fait("30_DOSSIER_AUTORISATION") || phaseCatalogue === "32_VISA_CNOA" || phaseCatalogue === "34_PERMIS_CONSTRUIRE";
}
