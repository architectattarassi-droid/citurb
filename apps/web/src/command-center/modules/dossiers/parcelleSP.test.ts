import { describe, expect, it } from "vitest";
import { computeParcelleSP, decomposeParcelleSP, type ParcelleInput } from "./parcelleSP";

describe("décomposition de la surface plancher par parcelle", () => {
  it("villa jumelée 294 m², R+1 + sous-sol : 117,6 × 3 + 24 = 376,8 m²", () => {
    const d = decomposeParcelleSP({ bati: "villa", villaType: "jumelee", surfaceTerrain: 294, etages: 1, sousSol: true, voieLarge: false })!;
    expect(d.ces).toBe(0.4);
    expect(d.rdc).toBeCloseTo(117.6, 6);
    expect(d.etages).toHaveLength(1);
    expect(d.sousSol).toBeCloseTo(117.6, 6);
    expect(d.forfait).toBe(24);
    expect(d.total).toBe(computeParcelleSP({ bati: "villa", villaType: "jumelee", surfaceTerrain: 294, etages: 1, sousSol: true, voieLarge: false }));
  });

  it("la somme des niveaux redonne exactement computeParcelleSP, pour toutes les variantes", () => {
    const cas: ParcelleInput[] = [];
    for (const surfaceTerrain of [96, 150, 294, 512])
      for (const etages of [0, 1, 2, 3, 4, 5])
        for (const sousSol of [false, true])
          for (const voieLarge of [false, true]) {
            for (const villaType of ["isolee", "jumelee", "bande"] as const) cas.push({ bati: "villa", villaType, surfaceTerrain, etages, sousSol, voieLarge });
            for (const immeubleType of ["standard", "maison_ville", "rdc_commercial"] as const)
              for (const facades of [1, 2])
                for (const rdcCourMode of ["unknown", "with_cour", "without_cour"] as const)
                  cas.push({ bati: "immeuble", immeubleType, facades, rdcCourMode, courSurface: 12, galerie: surfaceTerrain > 200, surfaceTerrain, etages, sousSol, voieLarge });
          }
    for (const p of cas) {
      const d = decomposeParcelleSP(p)!;
      const somme = d.rdc + d.etages.reduce((s, x) => s + x, 0) + d.sousSol + d.forfait;
      expect(Math.abs(somme - computeParcelleSP(p)!), JSON.stringify(p)).toBeLessThanOrEqual(0.5);
    }
  });
});
