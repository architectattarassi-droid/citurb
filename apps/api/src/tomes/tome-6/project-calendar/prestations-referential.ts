/**
 * prestations-referential.ts — Mirror serveur du référentiel front
 * `apps/web/src/data/prestations.ts`.
 *
 * Sert de source unique pour seed le ProjectCalendar à partir des prestations
 * normalisées (7 phases archi + 3 tâches topo + 3 lots BE + 9 PV cadence
 * chantier). Les durées sont estimatives par défaut (jours calendaires) — elles
 * peuvent être surchargées via options.durationOverrides du service.
 *
 * NB : on ne réimporte pas le fichier web (frontière monorepo). Les ids ici
 * matchent par convention ceux du front (archi.phase_N / topo.task_N / be.lot_N
 * / pv.<jalon>) afin d'autoriser des correspondances inter-couches.
 *
 * Tome 6 — workflows dossiers, planning, orchestration projet.
 */

import type { ProjectPhase } from "./project-calendar.types";

export type PrestationRefItem = {
  /** ID stable mirroir du front. */
  id: string;
  /** Libellé FR par défaut (utilisé directement en MVP — i18n côté UI ensuite). */
  titre: string;
  /** Description courte (facultative). */
  description?: string;
  /** Durée estimative en jours calendaires. */
  durationDays: number;
  /** Phase canonique du tome (mapping vers ProjectPhase). */
  phase: ProjectPhase;
  /** Tâche jalon (déclenche PV / livrable contractuel). */
  isMilestone?: boolean;
};

/**
 * Architecte — 7 phases en cascade (FS).
 *  1. Esquisse                14j   ESQ
 *  2. APS                     21j   APS
 *  3. APD                     30j   APD       (note géotechnique)
 *  4. Dossier permis (instr.) 60j   APD       (jalon dépôt + instruction)
 *  5. DCE                     21j   DCE
 *  6. CPS / CCTP              14j   DAO
 *  7. Suivi de chantier      180j   EXEC      (jalon réception)
 */
export const ARCHI_PHASES: PrestationRefItem[] = [
  {
    id: "archi.phase_1",
    titre: "Esquisse",
    description: "Études d'esquisse, faisabilité volumétrique et programme.",
    durationDays: 14,
    phase: "ESQ",
    isMilestone: true,
  },
  {
    id: "archi.phase_2",
    titre: "Avant-Projet Sommaire (APS)",
    description: "Plans masse, plans niveaux, élévations principales.",
    durationDays: 21,
    phase: "APS",
    isMilestone: true,
  },
  {
    id: "archi.phase_3",
    titre: "Avant-Projet Détaillé (APD)",
    description: "Plans détaillés, coupes, matériaux, première estimation chiffrée. Note géotechnique requise.",
    durationDays: 30,
    phase: "APD",
    isMilestone: true,
  },
  {
    id: "archi.phase_4",
    titre: "Dossier Permis de construire",
    description: "Constitution dossier permis + instruction commune.",
    durationDays: 60,
    phase: "APD",
    isMilestone: true,
  },
  {
    id: "archi.phase_5",
    titre: "Dossier Consultation Entreprises (DCE)",
    description: "Plans EXE indicatifs, descriptifs, quantitatifs détaillés.",
    durationDays: 21,
    phase: "DCE",
    isMilestone: true,
  },
  {
    id: "archi.phase_6",
    titre: "CPS / CCTP",
    description: "Cahier des prescriptions spéciales, clauses techniques.",
    durationDays: 14,
    phase: "DAO",
    isMilestone: true,
  },
  {
    id: "archi.phase_7",
    titre: "Suivi de chantier",
    description: "Direction de l'exécution, visites hebdomadaires, PV cadence.",
    durationDays: 180,
    phase: "EXEC",
    isMilestone: true,
  },
];

/**
 * Topographe — 3 tâches.
 *  - Bornage (T0, en parallèle de l'esquisse)
 *  - Réception axes implantation (avant fondations)
 *  - Métré post-travaux (en fin de chantier)
 */
export const TOPO_TASKS: PrestationRefItem[] = [
  {
    id: "topo.task_1",
    titre: "Bornage contradictoire",
    description: "Implantation des limites, PV de bornage signé.",
    durationDays: 1,
    phase: "ESQ",
    isMilestone: true,
  },
  {
    id: "topo.task_2",
    titre: "Réception axes implantation",
    description: "Vérification des axes avant fondations.",
    durationDays: 1,
    phase: "EXEC",
    isMilestone: true,
  },
  {
    id: "topo.task_3",
    titre: "Métré post-travaux",
    description: "Relevés contradictoires de fin de chantier.",
    durationDays: 2,
    phase: "RECEPTION",
    isMilestone: true,
  },
];

/**
 * Bureau d'études — 3 lots techniques.
 *  - Lot 1 : Béton armé + plans de ferraillage (en parallèle APD)
 *  - Lot 2 : Fluides (plomberie, CVC)                 (en parallèle DCE)
 *  - Lot 3 : Électricité TGBT + courants faibles      (en parallèle DCE)
 */
export const BE_LOTS: PrestationRefItem[] = [
  {
    id: "be.lot_1",
    titre: "BE — Béton armé + ferraillage",
    description: "Notes de calcul, plans de coffrage et ferraillage.",
    durationDays: 14,
    phase: "APD",
    isMilestone: false,
  },
  {
    id: "be.lot_2",
    titre: "BE — Fluides (plomberie / CVC)",
    description: "Plans réseaux fluides + dimensionnement.",
    durationDays: 10,
    phase: "DCE",
    isMilestone: false,
  },
  {
    id: "be.lot_3",
    titre: "BE — Électricité TGBT + courants faibles",
    description: "Schémas TGBT, distribution + lots CF.",
    durationDays: 10,
    phase: "DCE",
    isMilestone: false,
  },
];

/**
 * 9 PV de cadence (suivi chantier) — jalons récurrents à programmer pendant
 * la phase EXEC. Le cron pv-compliance détecte ensuite l'absence de PV
 * sur 15j ; ces slots constituent les jalons prévisionnels.
 *
 * Durée 0j (milestone instantané). L'ordre induit un échéancier régulier
 * (offset défini dans le service ; par défaut cadence ~20j entre jalons).
 */
export const PV_CADENCE_MILESTONES: PrestationRefItem[] = [
  { id: "pv.fondations",        titre: "PV réception — Fondations",       durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.dalle_rdc",         titre: "PV réception — Dalle RDC",        durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.dalle_etage",       titre: "PV réception — Dalle étage",      durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.toiture",           titre: "PV réception — Toiture",          durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.plomberie",         titre: "PV réception — Plomberie",        durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.elec",              titre: "PV réception — Électricité",      durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.clim",              titre: "PV réception — Climatisation",    durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.isolation",         titre: "PV réception — Isolation",        durationDays: 0, phase: "EXEC", isMilestone: true },
  { id: "pv.lots_secondaires",  titre: "PV réception — Lots secondaires", durationDays: 0, phase: "EXEC", isMilestone: true },
];

export const PRESTATIONS_REFERENTIAL = {
  archi: ARCHI_PHASES,
  topo: TOPO_TASKS,
  be: BE_LOTS,
  pvCadence: PV_CADENCE_MILESTONES,
};
