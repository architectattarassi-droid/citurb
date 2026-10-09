import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { P1_COUT_M2, coefRegional, coutM2Median } from "./grille2026";
import { COST_RANGES_MA } from "../../command-center/modules/dossiers/costRangesMA";

const API_P1 = fileURLToPath(new URL("../../../../api/src/tomes/tome-4/public/p1-packs-quote.service.ts", import.meta.url));

describe("grille unique 2026", () => {
  it("le moteur P1 hors ligne reprend exactement les coûts/m² de l'API", () => {
    const src = readFileSync(API_P1, "utf8");
    const val = (re: RegExp) => Number(re.exec(src)?.[1]);
    expect(val(/"ECONOMIQUE"\)\s*return (\d+)/)).toBe(P1_COUT_M2.ECONOMIQUE);
    expect(val(/"STANDING"\)\s*return (\d+)/)).toBe(P1_COUT_M2.STANDING);
    expect(val(/"HAUT_STANDING"\)\s*return (\d+)/)).toBe(P1_COUT_M2.HAUT_STANDING);
    expect(val(/"PREMIUM"\)\s*return (\d+)/)).toBe(P1_COUT_M2.PREMIUM);
    expect(val(/Math\.max\((\d+), Math\.round\(blackBudgetMAD/)).toBe(P1_COUT_M2.BLACK_MIN);
    expect(val(/return (\d+);\s*\/\/ était 7000/)).toBe(P1_COUT_M2.BLACK);
  });

  it("les fourchettes villa restent dans le marché privé observé (±25 %)", () => {
    // docs/prix/recherche/marche-prive-main-oeuvre.md : éco 3 500, moyen 5 350, haut 9 100, luxe 13 000.
    const marche: [keyof typeof COST_RANGES_MA.VIL.ranges, number][] = [["ULTRA_ECO", 3500], ["ECONOMIQUE", 5350], ["STANDING", 9100], ["PREMIUM", 13000]];
    for (const [s, ref] of marche) {
      const m = coutM2Median("VIL", s)!;
      expect(Math.abs(m - ref) / ref).toBeLessThan(0.25);
    }
  });

  it("chaque fourchette est croissante et sans trou entre standings", () => {
    for (const cfg of Object.values(COST_RANGES_MA)) {
      for (const r of Object.values(cfg.ranges)) expect(r![0]).toBeLessThanOrEqual(r![1]);
      const s = Object.values(cfg.lots).reduce((a, b) => a + b, 0);
      expect(s).toBeGreaterThan(0.95);
      expect(s).toBeLessThan(1.05);
    }
  });

  it("coefficients régionaux : base RSK, accents et casse ignorés", () => {
    expect(coefRegional("Kénitra")).toBe(0.93);
    expect(coefRegional("  CASABLANCA ")).toBe(1.06);
    expect(coefRegional("Ville inconnue")).toBe(1);
    expect(coefRegional(undefined)).toBe(1);
  });
});
