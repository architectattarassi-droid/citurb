import { describe, expect, it } from "vitest";
import { chiffrer, type ProjetInput } from "../chiffrage";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { CORRESPONDANCE_CPS, LOTS_SANS_GABARIT, LOT_CPS_PAR_CODE, bordereau, documentHtml, genererCps, uniteCps } from "./index";

const VILLA: ProjetInput = {
  type: "VILLA", ville: "Salé", surfacePlancher: 0, niveaux: 2, surfaceTerrain: 294, parcelle: { villaType: "jumelee" },
  sousSol: { profondeur: 3 }, sol: "BON", standing: "ECONOMIQUE", etapes: { terrain: true, finitions: true },
  soutenements: [{ emplacement: "COUR_ANGLAISE", longueur: 8 }, { emplacement: "JARDIN", longueur: 15, hauteur: 1.2 }],
};

describe("correspondance chiffrage → CPS", () => {
  it("chaque ouvrage (hors sous-ouvrages) a un lot CPS existant, et chaque poste existe avec une unité concordante", () => {
    for (const o of Object.values(OUVRAGES).filter((x) => !x.interne)) {
      const c = CORRESPONDANCE_CPS[o.code];
      expect(c, `${o.code} sans correspondance`).toBeDefined();
      const lot = LOT_CPS_PAR_CODE[c.lot];
      expect(lot || LOTS_SANS_GABARIT[c.lot], `${o.code} → ${c.lot}`).toBeTruthy();
      if (!c.poste) continue;
      const poste = lot.bordereau.find((p) => p.code === c.poste);
      expect(poste, `${o.code} → ${c.lot}#${c.poste}`).toBeDefined();
      if (!c.facteur && !c.fusionAvec) expect(uniteCps(poste!.unite), `${o.code} (${o.unite}) → ${c.poste} (${poste!.unite})`).toBe(uniteCps(o.unite));
    }
  });
});

describe("CPS type généré depuis le chiffrage", () => {
  const r = chiffrer(VILLA, { impacts: false });
  const d = genererCps(r, { nomProjet: "Villa jumelée — terrain 294 m²", commune: "Salé" });

  it("le BPDE redonne exactement le montant des travaux HT", () => {
    const total = bordereau(r).reduce((s, l) => s + l.total, 0);
    // BPDE arrondi au centime poste par poste : écart d'arrondi < 0,01 %.
    expect(Math.abs(total - r.travauxHT)).toBeLessThan(r.travauxHT * 1e-4);
    expect(d.totalHT).toBeCloseTo(total, 2);
  });

  it("chaque montant du BPDE se recalcule exactement (quantité × PU)", () => {
    for (const l of d.bpde) for (const p of l.postes) expect(Math.round(p.quantite * p.pu * 100) / 100, p.numero).toBeCloseTo(p.montant, 2);
  });

  it("contient les quatre titres, les lots du projet et les soutènements localisés", () => {
    for (const t of ["TITRE I — CLAUSES ADMINISTRATIVES", "TITRE II — PRESCRIPTIONS TECHNIQUES", "TITRE III — QUANTITATIF GÉNÉRAL", "TITRE IV — BORDEREAU DES PRIX", "ANNEXE 1 — MODES DE MÉTRÉ"]) expect(d.markdown).toContain(t);
    expect(d.markdown).toContain("Lot 02 — ");
    expect(d.markdown).not.toMatch(/Lot \d+ — Lot n°/);
    expect(d.markdown).toContain("Mur de soutènement en béton armé");
    expect(d.markdown).not.toContain("{{");
    expect((d.markdown.match(/\[à compléter/g) ?? []).length).toBeLessThan(6);
  });

  it("clauses privées corrigées après contre-audit (DOC, assurances, pénalités, statut)", () => {
    expect(d.markdown).toContain("Statut");
    expect(d.markdown).toContain("Arbitrages");
    expect(d.markdown).not.toMatch(/forclusion[^\n]*770|770[^\n]*forclusion/i);
    expect(d.markdown).not.toMatch(/assurances?[^\n]{0,40}obligatoires/i);
    expect(d.markdown).toContain("8 %");
    expect(d.markdown).toContain("ANNEXE 3 — RÉSERVES TECHNIQUES");
    expect(d.markdown).toContain("Principaux postes consommateurs");
  });

  it("ouvrages enterrés regroupés au lot 02", () => {
    for (const ov of ["FON.12", "FON.13", "FON.14"]) expect(CORRESPONDANCE_CPS[ov].lot).toBe("LOT_02_GO_BETON");
  });

  it("hérisson compris dans le dallage 2.08 (pas de double poste)", () => {
    const lot02 = d.bpde.find((l) => l.code === "LOT_02_GO_BETON")!;
    expect(lot02.postes.filter((p) => p.ouvrages.includes("FON.07"))).toHaveLength(0);
    expect(lot02.postes.find((p) => p.numero === "2.08")).toBeDefined();
  });

  it("rendu HTML imprimable sans balise non échappée", () => {
    const html = documentHtml("CPS", d.markdown);
    expect(html).toContain("<table>");
    expect(html).toContain("<h2>TITRE IV");
    expect(html).not.toContain("<script");
  });
});
