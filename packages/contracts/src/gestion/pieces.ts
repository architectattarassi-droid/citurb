/**
 * Documents attendus, normes et checklists PAR PHASE et PAR LOT (lot GP2,
 * exigences A et B du fondateur). Calcul pur, partagé par la fiche admin,
 * l'espace client et l'espace projet.
 *
 * Exigence A : chaque phase affiche TOUS ses documents attendus, lot par lot ;
 * une pièce absente est « Document manquant », avec le compteur de la phase.
 * Statuts : MANQUANT, DEPOSE, VALIDE, REFUSE (motif), SANS_OBJET (motif).
 * Les pièces conditionnelles n'apparaissent que si leur condition est remplie
 * (ou « à confirmer » quand le profil ne permet pas de trancher).
 *
 * Exigence B : normes de la phase, par lot, séparées entre « préparation des
 * documents » (conception) et « exécution » (chantier, essais).
 */
import {
  CHECKLISTS_REF, LIVRABLES_REF, NORMES_REF, PHASES_REF, REF, jalonRef, libelleActeur, libelleLot,
  type ChecklistRef, type DocRef, type JalonRef,
} from "./referentiel";
import { applicabiliteDocument, jalonApplicable, type Applicabilite, type ProfilProjet } from "./profil";
import { libelleOrdre, type OrdreRegional } from "./ordres";

export const STATUTS_PIECE = ["MANQUANT", "DEPOSE", "VALIDE", "REFUSE", "SANS_OBJET"] as const;
export type StatutPiece = (typeof STATUTS_PIECE)[number];
export const LIBELLES_STATUT_PIECE: Record<StatutPiece, { fr: string; ar: string }> = {
  MANQUANT: { fr: "Document manquant", ar: "وثيقة ناقصة" },
  DEPOSE: { fr: "Déposé, à vérifier", ar: "مودعة، في انتظار التحقق" },
  VALIDE: { fr: "Validé", ar: "مصادق عليها" },
  REFUSE: { fr: "Refusé", ar: "مرفوضة" },
  SANS_OBJET: { fr: "Sans objet", ar: "غير معنية" },
};

export interface PieceAttendue {
  /** Clé stable dans le dossier : « <phase>:<code> ». */
  cle: string;
  code: string;
  phase: string;
  jalon: string | null;
  jalonTitre: string | null;
  lot: string;
  lotTitre: { fr: string; ar: string };
  libelleFr: string;
  libelleAr: string;
  obligatoire: "OBLIGATOIRE" | "CONDITIONNEL";
  applicabilite: Exclude<Applicabilite, "NON">;
  condition: string | null;
  producteur: string | null;
  producteurLib: { fr: string; ar: string };
  validateur: string | null;
  validateurLib: { fr: string; ar: string };
  format: string | null;
  detail: string | null;
  source: string;
  /** Pièce confidentielle (identité, estimation de référence, offres) : jamais montrée hors back-office. */
  backOffice: boolean;
  recurrent: boolean;
  pointArret: boolean;
}

const LOT_GENERAL = "GENERAL";
const BACK_OFFICE = /back-office uniquement|jamais transmise|jamais montrée|visibles? du seul back-office/i;

function docDeBranche(type: string | undefined, jalon: string | undefined, code: string): { doc: DocRef; jalon: JalonRef } | null {
  for (const b of REF.branches ?? []) if (!type || b.type === type) for (const j of b.jalons) if (!jalon || j.code === jalon) {
    const doc = (j.documents ?? []).find((d) => d.code === code);
    if (doc) return { doc, jalon: j };
  }
  return null;
}
function docDeProcessus(processus: string | undefined, code: string): DocRef | null {
  const ps = (REF as unknown as { processusTransversaux?: { code: string; documents?: DocRef[] }[] }).processusTransversaux ?? [];
  for (const p of ps) if (!processus || p.code === processus) { const d = (p.documents ?? []).find((x) => x.code === code); if (d) return d; }
  return null;
}

type Entree = { code: string; source: string; jalon?: string; lot?: string; obligatoire: true | false | "CONDITIONNEL"; condition?: string; type?: string; processus?: string; recurrent?: boolean };

/** Pièces attendues d'une phase pour ce profil (pièces « NON » exclues). */
export function piecesDeLaPhase(phaseCode: string, profil: ProfilProjet, ordre?: OrdreRegional | null): PieceAttendue[] {
  const phase = PHASES_REF.find((p) => p.code === phaseCode);
  if (!phase) return [];
  const out: PieceAttendue[] = [];
  const vues = new Set<string>();
  for (const e of phase.documentsAttendus as unknown as Entree[]) {
    if (vues.has(e.code)) continue;
    let doc: DocRef | null = null, jalon: (JalonRef & { phase?: string }) | null = null, lot = e.lot || LOT_GENERAL;
    if (e.source === "JALON") {
      jalon = e.jalon ? jalonRef(e.jalon) : null;
      doc = jalon?.documents?.find((d) => d.code === e.code) ?? null;
      if (jalon && !jalonApplicable(jalon, profil)) continue;
    } else if (e.source === "LIVRABLE_ETUDES") {
      const l = LIVRABLES_REF.find((x) => x.code === e.code);
      if (l) { doc = { code: l.code, libelleFr: l.libelleFr, libelleAr: l.libelleAr, obligatoire: l.obligatoire, producteur: l.producteur, validateur: l.validateur, format: [l.type, l.echelle].filter(Boolean).join(" · ") || undefined, detail: l.contenuMinimal?.join(" ; "), condition: l.condition ?? e.condition }; lot = l.lot || lot; }
    } else if (e.source === "BRANCHE") {
      if (e.type && profil.type && profil.type !== e.type) continue;
      if (e.type && !profil.type) continue;
      const b = docDeBranche(e.type, e.jalon, e.code);
      if (b) { doc = b.doc; jalon = b.jalon; }
    } else if (e.source === "PROCESSUS_TRANSVERSAL") {
      doc = docDeProcessus(e.processus, e.code);
    }
    if (!doc) continue;
    const condition = doc.condition ?? (e.source === "BRANCHE" ? undefined : e.condition) ?? null;
    const obligatoire = e.obligatoire === "CONDITIONNEL" || doc.obligatoire === "CONDITIONNEL" ? "CONDITIONNEL" : e.obligatoire === false && doc.obligatoire === false ? false : true;
    const app = applicabiliteDocument({ code: doc.code, obligatoire, condition: condition ?? undefined }, profil);
    if (app === "NON") continue;
    vues.add(e.code);
    let detail = doc.detail ?? null;
    if (doc.code === "VISA_ORDRE_REGIONAL") detail = `${libelleOrdre(ordre ?? null).fr}.`;
    out.push({
      cle: `${phase.code}:${doc.code}`, code: doc.code, phase: phase.code,
      jalon: jalon?.code ?? null, jalonTitre: jalon?.libelleFr ?? null,
      lot, lotTitre: libelleLot(lot === LOT_GENERAL ? null : lot),
      libelleFr: doc.libelleFr, libelleAr: doc.libelleAr ?? doc.libelleFr,
      obligatoire: obligatoire === true ? "OBLIGATOIRE" : "CONDITIONNEL",
      applicabilite: app, condition,
      producteur: doc.producteur ?? null, producteurLib: libelleActeur(doc.producteur),
      validateur: doc.validateur ?? null, validateurLib: libelleActeur(doc.validateur),
      format: doc.format ?? null, detail, source: e.source,
      backOffice: BACK_OFFICE.test(doc.detail ?? ""), recurrent: !!e.recurrent, pointArret: !!jalon?.pointArret,
    });
  }
  // Lot « Général » d'abord, puis les lots dans l'ordre du référentiel.
  const ordreLots = (REF.lotsLivrables ?? []).map((l) => l.code);
  return out.sort((a, b) => (a.lot === LOT_GENERAL ? -1 : ordreLots.indexOf(a.lot)) - (b.lot === LOT_GENERAL ? -1 : ordreLots.indexOf(b.lot)));
}

// ── Fusion avec l'état saisi ────────────────────────────────────────────

export interface EtatPiece {
  statut: Exclude<StatutPiece, "MANQUANT">;
  motif: string | null;
  documentIds: string[];
  deposePar: string | null; deposeLe: string | null; validePar: string | null; valideLe: string | null;
}
export type Piece = PieceAttendue & { statut: StatutPiece; motif: string | null; documentIds: string[]; deposePar: string | null; deposeLe: string | null; validePar: string | null; valideLe: string | null };
export interface Compteur { attendues: number; manquantes: number; deposees: number; validees: number; refusees: number; sansObjet: number; aConfirmer: number }

export function compter(pieces: Piece[]): Compteur {
  const c: Compteur = { attendues: 0, manquantes: 0, deposees: 0, validees: 0, refusees: 0, sansObjet: 0, aConfirmer: 0 };
  for (const p of pieces) {
    if (p.statut === "SANS_OBJET") { c.sansObjet++; continue; }
    c.attendues++;
    if (p.applicabilite === "A_CONFIRMER" && p.statut === "MANQUANT") c.aConfirmer++;
    if (p.statut === "MANQUANT") c.manquantes++;
    else if (p.statut === "DEPOSE") c.deposees++;
    else if (p.statut === "VALIDE") c.validees++;
    else if (p.statut === "REFUSE") { c.refusees++; c.manquantes++; }
  }
  return c;
}

export interface NormeAffichee { code: string; reference: string; objet: string; statut: string; preparation: string[]; execution: string[] }
export interface NormesDuLot { lot: string; lotTitre: { fr: string; ar: string }; normes: NormeAffichee[] }

/** Normes de la phase, par lot : préparation des documents (conception) et exécution (chantier, essais). */
export function normesDeLaPhase(phaseCode: string): NormesDuLot[] {
  const parLot = new Map<string, NormeAffichee[]>();
  for (const n of NORMES_REF.filter((x) => x.phases.includes(phaseCode))) {
    const a: NormeAffichee = {
      code: n.code, reference: n.reference, objet: n.objet, statut: n.statut,
      preparation: n.exigences.filter((e) => e.moment === "CONCEPTION").map((e) => e.texte + (e.verifie ? "" : " (à vérifier)")),
      execution: n.exigences.filter((e) => e.moment !== "CONCEPTION").map((e) => e.texte + (e.verifie ? "" : " (à vérifier)")),
    };
    for (const lot of n.lots.length ? n.lots : [LOT_GENERAL]) parLot.set(lot, [...(parLot.get(lot) ?? []), a]);
  }
  return [...parLot.entries()].map(([lot, normes]) => ({ lot, lotTitre: libelleLot(lot === LOT_GENERAL ? null : lot), normes }));
}

/** Checklists de chantier (PV numériques, GP3) de la phase. */
export const checklistsDeLaPhase = (phaseCode: string): ChecklistRef[] => CHECKLISTS_REF.filter((c) => c.phase === phaseCode);

export interface PhaseDocuments {
  code: string; ordre: number; titre: string; titreAr: string;
  pieces: Piece[]; compteur: Compteur; normes: NormesDuLot[];
  checklists: Array<{ code: string; titre: string; titreAr: string; lot: string | null; jalon: string | null; pointArret: boolean; nbPoints: number; nbPointsArret: number }>;
}

/** Toutes les phases avec leurs pièces (fusionnées avec l'état), compteurs, normes et checklists. */
export function documentsParPhase(profil: ProfilProjet, etats: Map<string, EtatPiece>, o: { ordre?: OrdreRegional | null; client?: boolean } = {}): PhaseDocuments[] {
  return PHASES_REF.map((ph) => {
    const pieces = piecesDeLaPhase(ph.code, profil, o.ordre)
      .filter((p) => !(o.client && p.backOffice))
      .map((p): Piece => {
        const e = etats.get(p.cle);
        return { ...p, statut: e?.statut ?? "MANQUANT", motif: e?.motif ?? null, documentIds: e?.documentIds ?? [], deposePar: e?.deposePar ?? null, deposeLe: e?.deposeLe ?? null, validePar: e?.validePar ?? null, valideLe: e?.valideLe ?? null };
      });
    return {
      code: ph.code, ordre: ph.ordre, titre: ph.libelleFr, titreAr: ph.libelleAr,
      pieces, compteur: compter(pieces), normes: o.client ? [] : normesDeLaPhase(ph.code),
      checklists: checklistsDeLaPhase(ph.code).map((c) => ({
        code: c.code, titre: c.libelleFr, titreAr: c.libelleAr ?? c.libelleFr, lot: c.lot ?? null, jalon: c.jalon ?? null, pointArret: c.pointArret,
        nbPoints: c.points.length, nbPointsArret: c.points.filter((x) => x.pointArret).length,
      })),
    };
  });
}

/** La pièce existe-t-elle pour ce profil ? (contrôle serveur avant un dépôt ou une validation) */
export function pieceConnue(cle: string, profil: ProfilProjet, ordre?: OrdreRegional | null): PieceAttendue | null {
  const [phase] = cle.split(":");
  return piecesDeLaPhase(phase, profil, ordre).find((p) => p.cle === cle) ?? null;
}
