import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { P3_SECTIONS, categoriesP3, computeP3Quote, sectionBareme } from "./quoteLocal";
import { CORPS_METIERS, listCorpsMetiersGrouped } from "./corpsMetiers";

const API_DIR = "../../../../api/src/tomes/tome-3/p3/";
const lire = (f: string) => readFileSync(fileURLToPath(new URL(API_DIR + f, import.meta.url)), "utf8");

describe("P3 — devis local MOD", () => {
  it("applique 10 % du coût de réalisation (surface × barème × bâtiments) + TVA 20 %", () => {
    const q = computeP3Quote({ section: "VILLA", categoryCode: "4.5", surfacePlancherM2: 300 });
    expect(q.base.coutRealisation).toBe(300 * 4000);
    expect(q.honoraires.totalHT).toBe(120_000);
    expect(q.honoraires.tva).toBe(24_000);
    expect(q.honoraires.totalTTC).toBe(144_000);
    const gr = computeP3Quote({ section: "GR", categoryCode: "3.2", surfacePlancherM2: 800, nbBatiments: 3 });
    expect(gr.base.coutRealisation).toBe(800 * 3700 * 3);
  });

  it("reprend le taux de l'API", () => {
    expect(lire("pricing.service.ts")).toMatch(/HONO_RATE = 0\.10;/);
  });

  it("propose une section villa / maison individuelle, transmise à l'API comme IMM", () => {
    expect(P3_SECTIONS).toContain("VILLA");
    expect(sectionBareme("VILLA")).toBe("IMM");
    const codes = categoriesP3("VILLA").map(c => c.code);
    expect(codes).toEqual(["1.1", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]);
    expect(categoriesP3("IMM").some(c => c.code.startsWith("4."))).toBe(false);
    for (const s of P3_SECTIONS) expect(categoriesP3(s).length).toBeGreaterThan(0);
  });

  it("refuse une catégorie hors section ou une surface nulle", () => {
    expect(() => computeP3Quote({ section: "AMG", categoryCode: "4.5", surfacePlancherM2: 100 })).toThrow();
    expect(() => computeP3Quote({ section: "VILLA", categoryCode: "4.5", surfacePlancherM2: 0 })).toThrow();
  });

  it("la liste locale des corps de métier est identique à celle de l'API", () => {
    const slugsApi = [...lire("corps-metiers.ts").matchAll(/slug: "([^"]+)"/g)].map(m => m[1]);
    expect(CORPS_METIERS.map(c => c.slug)).toEqual(slugsApi);
    expect(listCorpsMetiersGrouped().reduce((n, g) => n + g.items.length, 0)).toBe(CORPS_METIERS.length);
  });
});
