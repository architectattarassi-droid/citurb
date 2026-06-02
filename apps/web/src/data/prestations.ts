/**
 * data/prestations.ts — Référentiel des phases de prestations BTP
 *
 * Source unique de vérité pour les fiches "Que comprend la prestation ?"
 * affichées sur les portes P1 (particulier), P2 (promoteur), P3 (MOD).
 *
 * Trois métiers couverts :
 *   - archi  : Architecte, 7 phases (de l'esquisse au suivi chantier)
 *   - topo   : Topographe, 3 tâches (bornage / réception axes / métré fin)
 *   - be     : Bureau d'études, 3 lots techniques (béton armé / fluides / élec)
 *
 * Chaque phase porte uniquement des clés i18n (titleKey, deliverableKeys,
 * pvCadenceKeys, noteKey) — les traductions vivent dans
 * `locales/{fr,ar,en}/prestations.json`.
 */

export type PrestationMetier = "archi" | "topo" | "be";

export interface PrestationPhase {
  /** Identifiant stable, ex: "archi.phase_1" — utilisé comme React key. */
  id: string;
  /** Numéro de phase affiché dans la carte (1, 2, 3 ...). */
  number: number;
  /** Clé i18n du titre de la phase. */
  titleKey: string;
  /** Clés i18n des livrables (puces principales de la carte). */
  deliverableKeys: string[];
  /**
   * Clés i18n de la sous-liste "PV de cadence" — utilisée uniquement pour
   * la phase 7 de l'architecte (suivi chantier).
   */
  pvCadenceKeys?: string[];
  /** Clé i18n d'une note d'avertissement / précision (ex: géotechnique). */
  noteKey?: string;
}

const archi: PrestationPhase[] = [
  {
    id: "archi.phase_1",
    number: 1,
    titleKey: "prestations.archi.phase_1.title",
    deliverableKeys: [
      "prestations.archi.phase_1.deliv_1",
      "prestations.archi.phase_1.deliv_2",
    ],
  },
  {
    id: "archi.phase_2",
    number: 2,
    titleKey: "prestations.archi.phase_2.title",
    deliverableKeys: [
      "prestations.archi.phase_2.deliv_1",
      "prestations.archi.phase_2.deliv_2",
    ],
  },
  {
    id: "archi.phase_3",
    number: 3,
    titleKey: "prestations.archi.phase_3.title",
    deliverableKeys: [
      "prestations.archi.phase_3.deliv_1",
      "prestations.archi.phase_3.deliv_2",
    ],
    noteKey: "prestations.archi.phase_3.note",
  },
  {
    id: "archi.phase_4",
    number: 4,
    titleKey: "prestations.archi.phase_4.title",
    deliverableKeys: [
      "prestations.archi.phase_4.deliv_1",
      "prestations.archi.phase_4.deliv_2",
    ],
  },
  {
    id: "archi.phase_5",
    number: 5,
    titleKey: "prestations.archi.phase_5.title",
    deliverableKeys: [
      "prestations.archi.phase_5.deliv_1",
      "prestations.archi.phase_5.deliv_2",
      "prestations.archi.phase_5.deliv_3",
    ],
    noteKey: "prestations.archi.phase_5.note",
  },
  {
    id: "archi.phase_6",
    number: 6,
    titleKey: "prestations.archi.phase_6.title",
    deliverableKeys: [
      "prestations.archi.phase_6.deliv_1",
      "prestations.archi.phase_6.deliv_2",
    ],
    noteKey: "prestations.archi.phase_6.note",
  },
  {
    id: "archi.phase_7",
    number: 7,
    titleKey: "prestations.archi.phase_7.title",
    deliverableKeys: [
      "prestations.archi.phase_7.deliv_1",
      "prestations.archi.phase_7.deliv_2",
    ],
    pvCadenceKeys: [
      "prestations.archi.phase_7.pv.plancher",
      "prestations.archi.phase_7.pv.maconnerie",
      "prestations.archi.phase_7.pv.plomberie",
      "prestations.archi.phase_7.pv.elec",
      "prestations.archi.phase_7.pv.clim",
      "prestations.archi.phase_7.pv.isolation",
      "prestations.archi.phase_7.pv.echantillon",
      "prestations.archi.phase_7.pv.reception_secondaires",
      "prestations.archi.phase_7.pv.metre",
    ],
  },
];

const topo: PrestationPhase[] = [
  {
    id: "topo.task_1",
    number: 1,
    titleKey: "prestations.topo.task_1.title",
    deliverableKeys: [
      "prestations.topo.task_1.deliv_1",
      "prestations.topo.task_1.deliv_2",
    ],
  },
  {
    id: "topo.task_2",
    number: 2,
    titleKey: "prestations.topo.task_2.title",
    deliverableKeys: [
      "prestations.topo.task_2.deliv_1",
      "prestations.topo.task_2.deliv_2",
    ],
  },
  {
    id: "topo.task_3",
    number: 3,
    titleKey: "prestations.topo.task_3.title",
    deliverableKeys: [
      "prestations.topo.task_3.deliv_1",
      "prestations.topo.task_3.deliv_2",
    ],
  },
];

const be: PrestationPhase[] = [
  {
    id: "be.lot_1",
    number: 1,
    titleKey: "prestations.be.lot_1.title",
    deliverableKeys: [
      "prestations.be.lot_1.deliv_1",
      "prestations.be.lot_1.deliv_2",
      "prestations.be.lot_1.deliv_3",
    ],
  },
  {
    id: "be.lot_2",
    number: 2,
    titleKey: "prestations.be.lot_2.title",
    deliverableKeys: [
      "prestations.be.lot_2.deliv_1",
      "prestations.be.lot_2.deliv_2",
    ],
  },
  {
    id: "be.lot_3",
    number: 3,
    titleKey: "prestations.be.lot_3.title",
    deliverableKeys: [
      "prestations.be.lot_3.deliv_1",
      "prestations.be.lot_3.deliv_2",
    ],
  },
];

export const PRESTATIONS: Record<PrestationMetier, PrestationPhase[]> = {
  archi,
  topo,
  be,
};
