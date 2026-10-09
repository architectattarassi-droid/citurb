import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE, HORS_CATALOGUE_SEED, RE_CODE, famillePrix, materiau } from "./catalogue";
import { ecartReference, mediane, prixAberrant, prixParUniteRef, prixParUniteVente, quantiteACommander, unitesVente } from "./conversions";
import { CATEGORIES, UNITES_REF } from "./types";

const RACINE = resolve(__dirname, "../../../../..");

describe("catalogue de référence des matériaux", () => {
  it("codes uniques, au format CIT-XX-NNN, parents existants et de même unité", () => {
    const codes = CATALOGUE.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const r of CATALOGUE) {
      expect(r.code).toMatch(RE_CODE);
      expect(CATEGORIES[r.categorie]).toBeTruthy();
      expect(UNITES_REF[r.uniteRef]).toBeTruthy();
      expect(r.lots.length).toBeGreaterThan(0);
      for (const l of r.lots) expect(l).toMatch(/^LOT_\d{2}_[A-Z_]+$/);
      expect(r.prix.min).toBeLessThanOrEqual(r.prix.ref);
      expect(r.prix.ref).toBeLessThanOrEqual(r.prix.max);
      expect(r.prix.ref).toBeGreaterThan(0);
      for (const u of r.ventes) expect(u.facteur).toBeGreaterThan(0);
      expect(new Set(unitesVente(r).map((u) => u.code)).size).toBe(unitesVente(r).length);
      if (r.parent) {
        const p = materiau(r.parent);
        expect(p, r.code).toBeTruthy();
        expect(p!.uniteRef).toBe(r.uniteRef);
        expect(p!.parent).toBeUndefined();
      }
    }
  });

  it("les lots cités existent dans les cps-templates", () => {
    const dir = resolve(RACINE, "apps/api/data/cps-templates/lots");
    const lots = new Set(readdirSync(dir).map((f) => (JSON.parse(readFileSync(resolve(dir, f), "utf8")) as { code: string }).code));
    for (const r of CATALOGUE) for (const l of r.lots) expect(lots.has(l), `${r.code} ${l}`).toBe(true);
  });

  it("réconcilie les 197 produits du seed marketplace (chacun une seule fois, ou hors catalogue)", () => {
    const src = readFileSync(resolve(RACINE, "apps/api/scripts/seed-referentiel.ts"), "utf8");
    const noms = [...src.matchAll(/\["([^"]+)", "[A-Z0-9]+", [\d.]+, [\d.]+\]/g)].map((x) => x[1]);
    expect(noms.length).toBe(197);
    const vus = new Map<string, string>();
    for (const r of CATALOGUE) for (const n of r.alias.seed || []) {
      expect(vus.has(n), `${n} en double (${vus.get(n)} / ${r.code})`).toBe(false);
      vus.set(n, r.code);
    }
    for (const n of noms) expect(vus.has(n) || HORS_CATALOGUE_SEED.includes(n), n).toBe(true);
    for (const n of vus.keys()) expect(noms, n).toContain(n);
  });

  it("réconcilie les 80 matériaux de catalog.json", () => {
    const cat = JSON.parse(readFileSync(resolve(RACINE, "apps/api/data/materials/catalog.json"), "utf8")) as { materials: { code: string }[] };
    const vus = new Map<string, string>();
    for (const r of CATALOGUE) for (const c of r.alias.catalog || []) {
      expect(vus.has(c), c).toBe(false);
      vus.set(c, r.code);
    }
    expect(cat.materials.length).toBe(80);
    for (const m of cat.materials) expect(vus.has(m.code), m.code).toBe(true);
  });

  it("reprend les 122 clés TerriScan avec leur code d'origine (préfixe cohérent)", () => {
    const ts = CATALOGUE.filter((r) => r.alias.terriscan);
    expect(ts.length).toBe(122);
    expect(new Set(ts.map((r) => r.alias.terriscan)).size).toBe(122);
  });
});

describe("conversions d'unités", () => {
  it("sac de ciment → kg", () => {
    expect(prixParUniteRef("CIT-GO-008", "sac50", 80)).toBe(1.6);
    expect(prixParUniteVente("CIT-GO-008", "sac50", 1.6)).toBe(80);
    expect(prixParUniteRef("CIT-GO-008", "tonne", 1600)).toBe(1.6);
    // Dosage 350 kg/m³ pour 2,4 m³ de béton = 840 kg → 17 sacs de 50 kg.
    expect(quantiteACommander("CIT-GO-008", "sac50", 350 * 2.4)).toBe(17);
  });

  it("barre d'acier HA Ø12 de 12 m → kg (0,888 kg/ml)", () => {
    const r = materiau("CIT-GO-024")!;
    expect(r.libelle).toContain("Ø12");
    expect(unitesVente(r).find((u) => u.code === "barre12")!.facteur).toBeCloseTo(10.656, 3);
    expect(prixParUniteRef("CIT-GO-024", "barre12", 106.56)).toBeCloseTo(10, 3);
    expect(quantiteACommander("CIT-GO-024", "barre12", 1000)).toBe(94);
    expect(famillePrix("CIT-GO-001")).toContain("CIT-GO-024");
  });

  it("couronne de câble, rouleau de membrane, seau de peinture, tonne de sable", () => {
    expect(prixParUniteRef("CIT-EL-004", "couronne100", 425)).toBe(4.25);
    expect(prixParUniteRef("CIT-ET-004", "rouleau10", 445)).toBe(44.5);
    expect(prixParUniteRef("CIT-PE-001", "seau30", 299)).toBeCloseTo(9.967, 3);
    expect(prixParUniteRef("CIT-GO-011", "tonne", 125)).toBe(200);
    expect(quantiteACommander("CIT-ET-004", "rouleau10", 73)).toBe(8);
  });

  it("unité inconnue ou matériau inconnu → null", () => {
    expect(prixParUniteRef("CIT-GO-008", "barre12", 10)).toBeNull();
    expect(prixParUniteRef("CIT-ZZ-999", "u", 10)).toBeNull();
  });

  it("médiane, écart à la référence, prix aberrant (±50 %)", () => {
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 2, 3])).toBe(2.5);
    expect(mediane([])).toBeNull();
    expect(ecartReference("CIT-GO-008", 2.4)).toBe(0.5);
    expect(prixAberrant("CIT-GO-008", 2.4)).toBe(false);
    expect(prixAberrant("CIT-GO-008", 2.5)).toBe(true);
    expect(prixAberrant("CIT-GO-008", 0.7)).toBe(true);
  });
});

describe("régions", () => {
  it("ville, nom ou code → code de région", async () => {
    const { regionDe, REGIONS_MA } = await import("./regions");
    expect(REGIONS_MA.length).toBe(12);
    expect(regionDe("Témara")).toBe("rabat-sale-kenitra");
    expect(regionDe("  CASABLANCA ")).toBe("casablanca-settat");
    expect(regionDe("Marrakech-Safi")).toBe("marrakech-safi");
    expect(regionDe("fes-meknes")).toBe("fes-meknes");
    expect(regionDe("Atlantide")).toBeNull();
  });
});
