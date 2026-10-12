import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { P5_REPORTS, computeP5Quote } from "./quoteLocal";

const API = fileURLToPath(new URL("../../../../api/src/tomes/tome-6/p5/pricing.service.ts", import.meta.url));

describe("P5 — devis local des rapports", () => {
  it("reprend forfait et minimums de l'API", () => {
    const src = readFileSync(API, "utf8");
    expect(Number(/flatHT: (\d+)/.exec(src)?.[1])).toBe(P5_REPORTS.ESTIMATION_EXPRESS.flatHT);
    const mins = [...src.matchAll(/minHT: (\d+),/g)].map(m => Number(m[1]));
    expect(mins).toEqual([990, 1500, 2500, 15000]);
    expect(Object.values(P5_REPORTS).map(r => r.minHT)).toEqual(mins);
  });

  it("Estimation Express : 990 DH HT, × 1,4 en délai express", () => {
    expect(computeP5Quote({ reportType: "ESTIMATION_EXPRESS" }).amounts.totalHT).toBe(990);
    expect(computeP5Quote({ reportType: "ESTIMATION_EXPRESS", delayMode: "EXPRESS" }).amounts.totalHT).toBe(1386);
  });

  it("Expertise prix : tranches dégressives sur la valeur estimée du terrain", () => {
    // Villa, 400 m², zone URBAIN : 400 × 7 500 = 3 000 000 DH
    const q = computeP5Quote({ reportType: "EXPERTISE_PRIX", bienFamily: "VILLA", surfaceTerrainM2: 400, zoneTier: "URBAIN" });
    expect(q.meta.assietteMAD).toBe(3_000_000);
    // 500k × 0,5 % + 1,5M × 0,4 % + 1M × 0,3 % = 2 500 + 6 000 + 3 000
    expect(q.amounts.totalHT).toBe(11_500);
  });

  it("applique le minimum quand l'assiette est faible", () => {
    const q = computeP5Quote({ reportType: "READY_TO_INVEST", bienFamily: "VILLA", surfaceTerrainM2: 100, zoneTier: "RURAL" });
    expect(q.base.minApplied).toBe(true);
    expect(q.amounts.totalHT).toBe(15_000);
  });
});
