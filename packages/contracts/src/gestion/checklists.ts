/**
 * Checklists de chantier = PV numériques (lot GP3, exigence C du fondateur).
 *
 * Chaque checklist du référentiel (docs/gestion-projet/normes-et-checklists-chantier.md)
 * devient un modèle de PV de l'ESPACE PROJET existant (même formulaire, mêmes photos,
 * mêmes signatures horodatées par rôle, même impression) — pas de second système :
 *   - un point de contrôle = critère et tolérance, norme, méthode, contrôleur,
 *     verdict (conforme / non conforme / sans objet), mesure ou observation, photos ;
 *   - réserves numérotées (description, localisation, responsable, délai) ;
 *   - décision : autorisé à poursuivre / sous réserve / refusé ;
 *   - signatures des rôles signataires.
 * Point d'arrêt : le jalon « porte » (ex. réception des armatures avant bétonnage)
 * ne passe pas à « validé » sans le PV signé et non refusé ; seul l'administrateur
 * le débloque, avec un motif écrit (journalisé).
 */
import type { ModeleDocument, Role } from "../../../../apps/web/src/domain/referentiel/types";
import { CHECKLISTS_REF, NORMES_REF, libelleActeur, rolesEspaceProjet, type ChecklistRef } from "./referentiel";

/**
 * Où chaque checklist s'utilise dans l'espace projet :
 *   offres = phases du catalogue (préfixe du code de phase) où le PV peut être rempli ;
 *   arrets = jalons « porte » (code sans le niveau) qui exigent le PV signé.
 */
export const RATTACHEMENT_CHECKLISTS: Record<string, { offres: string[]; arrets: string[]; condition?: "piscine" | "sousSol" }> = {
  CL01_INSTALLATION_CHANTIER: { offres: ["80_OUVERTURE_CHANTIER", "82_INSTALLATION_CHANTIER"], arrets: [] },
  CL02_IMPLANTATION: { offres: ["80_OUVERTURE_CHANTIER", "83_TERRASSEMENT"], arrets: ["80_OUVERTURE_CHANTIER.GEN.54", "83_TERRASSEMENT.TER.03"] },
  CL03_TERRASSEMENT_FONDS_FOUILLE: { offres: ["83_TERRASSEMENT"], arrets: ["83_TERRASSEMENT.TER.09"] },
  CL04_FONDATIONS_AVANT_COULAGE: { offres: ["84_FONDATIONS"], arrets: ["84_FONDATIONS.FON.10"] },
  CL05_SOUTENEMENT_SOUS_SOL: { offres: ["85_SOUS_SOL"], arrets: ["85_SOUS_SOL.STR.05"], condition: "sousSol" },
  CL06_DALLAGE_HERISSON: { offres: ["84_FONDATIONS", "85_SOUS_SOL", "86_PLANCHER"], arrets: ["84_FONDATIONS.FON.16"] },
  CL07_POTEAUX_POUTRES_PLANCHERS: { offres: ["86_PLANCHER"], arrets: ["86_PLANCHER.STR.14"] },
  CL08_MACONNERIE: { offres: ["LOT_MACONNERIE"], arrets: ["LOT_MACONNERIE.MAC.09"] },
  CL09_RESEAUX_AVANT_ENDUITS: { offres: ["LOT_PLOMBERIE", "LOT_ELECTRICITE", "LOT_ENDUITS", "91_TESTS_RESEAUX"], arrets: ["LOT_ENDUITS.MAC.01"] },
  CL10_ENDUITS: { offres: ["LOT_ENDUITS", "LOT_PEINTURE"], arrets: ["LOT_PEINTURE.PEI.01"] },
  CL11_ETANCHEITE_TERRASSE: { offres: ["LOT_ETANCHEITE", "86_PLANCHER_TERRASSE"], arrets: ["LOT_ETANCHEITE.ETA.07"] },
  CL12_MENUISERIES: { offres: ["LOT_MENUISERIE_ALU", "LOT_MENUISERIE_BOIS"], arrets: [] },
  CL13_REVETEMENTS: { offres: ["LOT_CARRELAGE", "LOT_REVETEMENT_SOL"], arrets: [] },
  CL14_CVC: { offres: ["LOT_CVC"], arrets: ["LOT_CVC.CVC.02"] },
  CL15_ESSAIS_RESEAUX: { offres: ["91_TESTS_RESEAUX", "LOT_ELECTRICITE", "LOT_PLOMBERIE"], arrets: ["91_TESTS_RESEAUX.FLU.01"] },
  CL16_VRD_RACCORDEMENTS: { offres: ["LOT_AMENAGEMENT_EXT", "95B_RACCORDEMENTS_DEFINITIFS"], arrets: [] },
  CL17_PISCINE: { offres: ["LOT_AMENAGEMENT_EXT"], arrets: ["LOT_AMENAGEMENT_EXT.PIS.01"], condition: "piscine" },
  CL18_PRE_RECEPTION: { offres: ["92_FIN_SECOND_OEUVRE", "93_RECEPTION_PROVISOIRE"], arrets: ["93_RECEPTION_PROVISOIRE.GEN.02"] },
  CL19_RECEPTION_PROVISOIRE: { offres: ["93_RECEPTION_PROVISOIRE"], arrets: ["93_RECEPTION_PROVISOIRE.GEN.02"] },
  CL20_LEVEE_RESERVES: { offres: ["94_LEVEE_RESERVES"], arrets: ["94_LEVEE_RESERVES.GEN.03"] },
  CL21_RECEPTION_DEFINITIVE: { offres: ["97_RECEPTION_DEFINITIVE"], arrets: ["97_RECEPTION_DEFINITIVE.GEN.02"] },
};

export const DECISIONS_PV = ["Autorisé à poursuivre (point d'arrêt levé)", "Autorisé sous réserve de levée avant l'étape suivante", "Refusé : reprise et nouvelle visite"] as const;
export const VERDICTS = ["Conforme", "Non conforme", "Sans objet"] as const;
export const PREFIXE_PV = "CL";
export const estChecklist = (id: string) => /^CL\d\d_[A-Z0-9_]+$/.test(id) && CHECKLISTS_REF.some((c) => c.code === id);

type JalonDef = { code: string; phase: string; phaseGabarit?: string };
type Carac = { piscine?: boolean; sousSols?: number } | null | undefined;

/** Code du jalon sans le niveau : « 86_PLANCHER_R1.STR.14 » → « 86_PLANCHER.STR.14 ». */
export const codeDeBase = (j: JalonDef) => (j.phaseGabarit && j.code.startsWith(`${j.phase}.`) ? `${j.phaseGabarit}${j.code.slice(j.phase.length)}` : j.code);

function applicable(code: string, c: Carac): boolean {
  const r = RATTACHEMENT_CHECKLISTS[code];
  if (r?.condition === "piscine") return !!c?.piscine;
  if (r?.condition === "sousSol") return (c?.sousSols ?? 0) > 0;
  return true;
}

/** PV de chantier proposés dans ce jalon. */
export function checklistsDuJalon(j: JalonDef, c?: Carac): string[] {
  const phase = j.phaseGabarit ?? j.phase;
  const base = codeDeBase(j);
  return CHECKLISTS_REF.map((x) => x.code).filter((code) => {
    const r = RATTACHEMENT_CHECKLISTS[code];
    if (!r || !applicable(code, c)) return false;
    return r.arrets.includes(base) || r.offres.some((o) => phase === o || j.phase === o || phase.startsWith(`${o}_`));
  });
}

/** PV exigés (signés, non refusés) avant que ce jalon passe à « validé ». */
export function checklistsBloquantes(j: JalonDef, c?: Carac): string[] {
  const base = codeDeBase(j);
  return CHECKLISTS_REF.filter((x) => x.pointArret && applicable(x.code, c) && (RATTACHEMENT_CHECKLISTS[x.code]?.arrets ?? []).includes(base)).map((x) => x.code);
}

const ROLES_PROJET: readonly Role[] = [
  "CLIENT", "ARCHITECTE", "BET_STRUCTURE", "BET_FLUIDES", "GEOTECHNICIEN", "TOPOGRAPHE", "BUREAU_CONTROLE", "LABORATOIRE",
  "ENTREPRISE", "SOUS_TRAITANT", "COORDINATEUR_SPS", "ADMINISTRATION", "NOTAIRE", "ADMIN_CITURBAREA",
];
const roleProjet = (r: string): Role | null => (rolesEspaceProjet(r).find((x) => ROLES_PROJET.includes(x as Role)) as Role | undefined) ?? (ROLES_PROJET.includes(r as Role) ? (r as Role) : null);
const METHODES: Record<string, string> = { VISUEL: "contrôle visuel", MESURE: "mesure", DOCUMENT: "vérification de document", ESSAI: "essai", PHOTO: "photo" };

/** Le modèle de PV d'une checklist, au format des documents types de l'espace projet. */
export function modeleChecklist(code: string): ModeleDocument | null {
  const c: ChecklistRef | undefined = CHECKLISTS_REF.find((x) => x.code === code);
  if (!c) return null;
  const signataires = [...new Set(c.signataires.map(roleProjet).filter((r): r is Role => !!r))];
  const normeRef = (n?: string) => (n ? NORMES_REF.find((x) => x.code === n)?.reference ?? n : "—");
  return {
    id: c.code,
    titre: `PV de contrôle — ${c.libelleFr}`,
    nature: "PV",
    objet: `Checklist de chantier ${c.code}${c.pointArret ? " — point d'arrêt : l'étape suivante attend ce PV signé" : ""}.`,
    sections: [
      {
        titre: "Visite",
        champs: [
          { id: "date", libelle: "Date de la visite", type: "date", obligatoire: true },
          { id: "zone", libelle: "Niveau ou zone contrôlés", type: "texte" },
          { id: "presents", libelle: "Intervenants présents (rôle et raison sociale, sans coordonnées)", type: "texte_long" },
          { id: "plans", libelle: "Plans de référence et indice", type: "texte" },
          { id: "meteo", libelle: "Météo (béton, étanchéité)", type: "texte" },
        ],
      },
      ...c.points.map((p, i) => ({
        titre: `${i + 1}. ${p.libelleFr}${p.pointArret ? " — POINT D'ARRÊT" : ""}`,
        champs: [
          {
            id: `${p.code}.verdict`, libelle: `Critère / tolérance : ${p.tolerance ?? p.critere} · Norme : ${normeRef(p.norme)} · Méthode : ${METHODES[p.methode] ?? p.methode.toLowerCase()} · Contrôleur : ${libelleActeur(p.controleur).fr}`,
            type: "choix" as const, options: [...VERDICTS], obligatoire: true,
          },
          { id: `${p.code}.mesure`, libelle: "Mesure relevée ou observation", type: "texte" as const },
          { id: `${p.code}.photos`, libelle: `Preuves (${(p.preuves ?? ["PHOTO"]).join(", ").toLowerCase()})`, type: "photo" as const },
        ],
      })),
      {
        titre: "Réserves",
        champs: [{ id: "reserves", libelle: "Réserves numérotées", type: "tableau", colonnes: ["N°", "Description", "Localisation", "Responsable (rôle)", "Délai"] }],
      },
      {
        titre: "Décision",
        champs: [
          { id: "decision", libelle: "Décision", type: "choix", options: [...DECISIONS_PV], obligatoire: true },
          { id: "observations", libelle: "Observations", type: "texte_long" },
        ],
      },
    ],
    signataires: signataires.length ? signataires : ["ARCHITECTE"],
    mentions: c.modelePV?.mentions ?? ["Signature électronique horodatée dans l'espace projet"],
  };
}

export type EtatPV = "ABSENT" | "BROUILLON" | "REFUSE" | "LEVE";
/** Un PV lève-t-il le point d'arrêt ? Signé par tous les signataires et décision non « refusé ». */
export function etatPV(docs: Array<{ modeleId: string; statut: string; valeurs: Record<string, unknown> }>, code: string): EtatPV {
  const d = docs.filter((x) => x.modeleId === code);
  if (!d.length) return "ABSENT";
  if (d.some((x) => x.statut === "SIGNE" && x.valeurs.decision && x.valeurs.decision !== DECISIONS_PV[2])) return "LEVE";
  if (d.some((x) => x.statut === "SIGNE" && x.valeurs.decision === DECISIONS_PV[2])) return "REFUSE";
  return "BROUILLON";
}
