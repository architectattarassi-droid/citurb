import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { P4_FLOOR_HT, P4_PACK_RATES, computeP4Quote, honorairesHTParPack, listP4Packs } from "./quoteLocal";

const API = fileURLToPath(new URL("../../../../api/src/tomes/tome-4/p4/pricing.service.ts", import.meta.url));

describe("P4 — packs et devis locaux", () => {
  it("reprend les taux et le plancher de l'API", () => {
    const src = readFileSync(API, "utf8");
    expect(Number(/BASIQUE: ([\d.]+)/.exec(src)?.[1])).toBe(P4_PACK_RATES.BASIQUE);
    expect(Number(/MOYEN: ([\d.]+)/.exec(src)?.[1])).toBe(P4_PACK_RATES.MOYEN);
    expect(Number(/RENTABILITE: ([\d.]+)/.exec(src)?.[1])).toBe(P4_PACK_RATES.RENTABILITE);
    expect(Number(/FLOOR_HT = (\d+)/.exec(src)?.[1])).toBe(P4_FLOOR_HT);
  });

  it("liste les 3 packs", () => {
    expect(listP4Packs().map(p => p.code)).toEqual(["BASIQUE", "MOYEN", "RENTABILITE"]);
  });

  it("calcule 0,3 / 0,6 / 1 % du prix de vente avec un minimum de 3 000 DH HT", () => {
    const q = computeP4Quote({ pack: "RENTABILITE", prixVenteFoncierDH: 2_500_000 });
    expect(q.amounts.totalHT).toBe(25_000);
    expect(q.amounts.totalTTC).toBe(30_000);
    expect(honorairesHTParPack(2_500_000)).toEqual({ BASIQUE: 7_500, MOYEN: 15_000, RENTABILITE: 25_000 });
    const petit = computeP4Quote({ pack: "BASIQUE", prixVenteFoncierDH: 300_000 });
    expect(petit.base.flooredApplied).toBe(true);
    expect(petit.amounts.totalHT).toBe(3000);
    expect(() => computeP4Quote({ pack: "MOYEN", prixVenteFoncierDH: 0 })).toThrow();
  });
});
