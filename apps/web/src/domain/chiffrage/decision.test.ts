import { describe, expect, it } from "vitest";
import { aideDecision, chiffrer, type ProjetInput } from "./index";

const VILLA: ProjetInput = { type: "VILLA", ville: "Kénitra", surfacePlancher: 0, niveaux: 2, surfaceTerrain: 300, parcelle: { villaType: "jumelee" }, sousSol: { profondeur: 3 }, sol: "BON", standing: "ECONOMIQUE", etapes: { terrain: true, finitions: true } };
const IMMEUBLE: ProjetInput = { type: "IMMEUBLE", ville: "Casablanca", surfacePlancher: 1200, niveaux: 5, parcelle: null, sol: "BON", standing: "STANDARD", etapes: { terrain: true, finitions: true } };

describe("aide à la décision", () => {
  it("compare standings, régime, sous-sol, niveaux et formules de conception pour une villa", () => {
    const a = aideDecision(VILLA);
    const groupes = new Set(a.scenarios.map((s) => s.groupe));
    for (const g of ["standing", "regime", "sousSol", "niveaux", "conception"]) expect(groupes.has(g as never), g).toBe(true);
    const sansSs = a.scenarios.find((s) => s.cle === "sousSol:sans")!;
    expect(sansSs.ecart).toBeLessThan(0);
  });

  it("le plan type coûte moins cher que le plan personnalisé complet", () => {
    const complet = chiffrer({ ...VILLA, conception: "COMPLET" }, { impacts: false });
    const type = chiffrer({ ...VILLA, conception: "PLAN_TYPE" }, { impacts: false });
    expect(type.honoraires.totalHT).toBeLessThan(complet.honoraires.totalHT);
  });

  it("budget serré : propose des leviers qui ramènent le projet dans le budget", () => {
    const a = aideDecision(VILLA, 1_500_000);
    expect(a.leviers.length).toBeGreaterThan(0);
    expect(a.projetAjuste!.budgetTTC).toBeLessThan(a.actuel.budgetTTC);
    for (let i = 1; i < a.leviers.length; i++) expect(a.leviers[i].economie).toBeGreaterThan(0);
  });

  it("budget large : standing le plus élevé compatible, aucun levier", () => {
    const a = aideDecision(VILLA, 10_000_000);
    expect(a.leviers).toHaveLength(0);
    expect(a.meilleurStanding?.projet.standing).toBe("PREMIUM");
  });

  it("immeuble : pas de scénario tâcheron, mais standings et conception", () => {
    const a = aideDecision(IMMEUBLE, 8_000_000);
    expect(a.scenarios.some((s) => s.groupe === "regime")).toBe(false);
    expect(a.scenarios.some((s) => s.groupe === "conception")).toBe(true);
    expect(a.scenarios.every((s) => Number.isFinite(s.budgetTTC) && s.budgetTTC > 0)).toBe(true);
  });
});
