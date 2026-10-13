import { describe, expect, it } from "vitest";
import { applicable, controler, fusionner, jalonsDuProjet, referentiel } from "./index";
import type { FichierReferentiel } from "./types";

const MINI: FichierReferentiel = {
  domaine: "test", version: "1", majLe: "2026-10-13", auteur: "test",
  normes: [{ id: "N1", code: "N 1", intitule: "Norme test", organisme: "AUTRE", portee: "REGLE_DE_L_ART", domaines: ["BETON"], objet: "Test.", verifie: true, majLe: "2026-10-13" }],
  exigences: [
    { id: "E1", normes: ["N1"], texte: "Vérifier X.", moment: "EXECUTION", criticite: "BLOQUANT", verification: { methode: "Contrôle visuel", preuves: ["PHOTO"], responsable: "ARCHITECTE" }, verifie: true },
    { id: "E2", normes: ["N1"], texte: "Sous-sol seulement.", moment: "CONCEPTION", criticite: "MAJEUR", verification: { methode: "Plan", preuves: ["PLAN"], responsable: "BET_STRUCTURE" }, conditions: { sousSol: true }, verifie: true },
  ],
  modeles: [{ id: "PV1", titre: "PV test", nature: "PV", objet: "Test", sections: [{ titre: "S", champs: [{ id: "c", libelle: "C", type: "texte" }] }], signataires: ["ARCHITECTE"] }],
  jalons: [{ code: "84_FONDATIONS.FON.01", phase: "84_FONDATIONS", lot: "FON", ordre: 1, titre: "J", objectif: "O", acteurs: ["ENTREPRISE"], validateurs: ["ARCHITECTE"], exigences: ["E1", "E2"], checklist: [{ id: "c1", texte: "t", moment: "EXECUTION", exigence: "E1", responsable: "ARCHITECTE" }], documents: ["PV1"] }],
};

describe("référentiel des jalons", () => {
  it("fusionne et contrôle un fichier cohérent", () => {
    const r = fusionner([MINI]);
    expect(r.problemes).toEqual([]);
    expect(controler(r)).toEqual([]);
  });
  it("signale les références cassées et les doublons", () => {
    const casse = { ...MINI, jalons: [{ ...MINI.jalons[0], exigences: ["E9"], documents: ["PVX"] }] };
    const r = fusionner([casse, { ...MINI, domaine: "b", jalons: [] }]);
    expect(r.problemes.some((p) => p.includes("en double"))).toBe(true);
    const p = controler(r);
    expect(p.some((x) => x.includes("E9"))).toBe(true);
    expect(p.some((x) => x.includes("PVX"))).toBe(true);
  });
  it("filtre les exigences selon le projet", () => {
    const r = fusionner([MINI]);
    expect(jalonsDuProjet({ type: "VILLA" }, r)[0].exigencesDetail.map((e) => e.id)).toEqual(["E1"]);
    expect(jalonsDuProjet({ type: "VILLA", sousSol: true }, r)[0].exigencesDetail.map((e) => e.id)).toEqual(["E1", "E2"]);
    expect(applicable({ types: ["IMMEUBLE"] }, { type: "VILLA" })).toBe(false);
  });
  it("démultiplie les jalons par niveau (sous-sols, planchers)", () => {
    const pl = { ...MINI.jalons[0], code: "86_PLANCHER.STR.01", phase: "86_PLANCHER", prerequis: [] as string[] };
    const pl2 = { ...pl, code: "86_PLANCHER.STR.02", ordre: 2, prerequis: ["86_PLANCHER.STR.01"] };
    const r = fusionner([{ ...MINI, jalons: [pl, pl2] }]);
    const js = jalonsDuProjet({ type: "VILLA", etagesHorsSol: 1 }, r);
    expect(js.map((j) => j.code)).toEqual(["86_PLANCHER_RDC.STR.01", "86_PLANCHER_RDC.STR.02", "86_PLANCHER_R1.STR.01", "86_PLANCHER_R1.STR.02"]);
    expect(js.find((j) => j.code === "86_PLANCHER_R1.STR.02")!.prerequis).toEqual(["86_PLANCHER_R1.STR.01"]);
    const ss = fusionner([{ ...MINI, jalons: [{ ...pl, code: "85_SOUS_SOL.STR.01", phase: "85_SOUS_SOL" }] }]);
    expect(jalonsDuProjet({ type: "IMMEUBLE", sousSols: 2 }, ss).map((j) => j.phase)).toEqual(["85_SOUS_SOL_1", "85_SOUS_SOL_2"]);
    expect(jalonsDuProjet({ type: "VILLA" }, ss)).toEqual([]);
  });
  it("les données du dépôt sont intègres", () => {
    const r = referentiel();
    expect(controler(r)).toEqual([]);
  });
});
