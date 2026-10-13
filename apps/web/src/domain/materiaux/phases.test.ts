import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { LOTS_SECOND_OEUVRE, PHASES_FIXES } from "../../../../../packages/contracts/src/phases.catalog";
import { chiffrer, type ProjetInput } from "../chiffrage";
import { CORRESPONDANCE_CIT } from "../chiffrage/correspondanceCIT";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { quantitatif } from "../chiffrage/quantitatif";
import { MATERIAUX_PUBLICS } from "./reference";
import { PHASES_ETUDE, PHASES_REALISATION, PHASE_REAL, delaiComposant, delaiMateriau, ouvragesDuComposant, phaseComposant, phaseOuvrage, phasesMateriau } from "./phases";
import { calendrier, planningAchat } from "./planning";

const VILLA: ProjetInput = { type: "VILLA", ville: "Kénitra", surfacePlancher: 150, niveaux: 2, sol: "BON", standing: "ECONOMIQUE", etapes: { terrain: true, finitions: true } };

describe("phases : identifiants de phases.catalog.ts", () => {
  const connus = new Set([...PHASES_FIXES.map((p) => p.code), ...LOTS_SECOND_OEUVRE.map((l) => l.code),
    "85_SOUS_SOL", "86_PLANCHER", "86_PLANCHER_TERRASSE", "LOT_ASCENSEUR"]);
  it("tous les codes d'étude et de réalisation existent", () => {
    for (const p of [...PHASES_ETUDE, ...PHASES_REALISATION]) for (const c of p.codes) expect(connus, `${p.id} → ${c}`).toContain(c);
  });
  it("chaque lot du chiffrage tombe dans une phase recoupée par les jalons du référentiel", () => {
    const dir = new URL("../referentiel/data/", import.meta.url);
    const jalons = readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")).jalons as { lot?: string; phase: string }[]);
    const lots = new Set(Object.values(OUVRAGES).filter((o) => !o.interne).map((o) => o.lot));
    for (const lot of lots) {
      const phasesRef = new Set(jalons.filter((j) => j.lot === lot).map((j) => j.phase));
      if (!phasesRef.size) continue;
      const nos = new Set(Object.values(OUVRAGES).filter((o) => o.lot === lot && !o.interne).flatMap((o) => PHASE_REAL[phaseOuvrage(o.code)].codes));
      expect([...nos].some((c) => phasesRef.has(c)), `lot ${lot}`).toBe(true);
    }
  });
});

describe("rattachement des matériaux", () => {
  it("tout composant utilisé par un ouvrage a une phase de réalisation (sans « à valider »)", () => {
    const utilises = new Set(Object.values(OUVRAGES).flatMap((o) => o.composants.filter((c) => c.type === "mat").map((c) => c.ref)));
    for (const id of utilises) if (ouvragesDuComposant(id).length) for (const o of ouvragesDuComposant(id)) expect(PHASE_REAL[phaseComposant(id, o)]).toBeTruthy();
    for (const [id, c] of Object.entries(CORRESPONDANCE_CIT)) if (ouvragesDuComposant(id).length) expect(phasesMateriau(c.cit)!.aValider, c.cit).toBe(false);
  });
  it("chaque matériau publié a au moins une phase d'étude et de réalisation, et un délai", () => {
    for (const r of MATERIAUX_PUBLICS) {
      const p = phasesMateriau(r.code)!;
      expect(p.realisation.length).toBeGreaterThan(0);
      expect(p.etude.length).toBeGreaterThan(0);
      expect(delaiMateriau(r.code).jours).toBeGreaterThan(0);
      expect(delaiMateriau(r.code).hypothese).toBe(true);
    }
  });
  it("exemples : ciment au gros œuvre et à la maçonnerie, gaine aux réseaux, prise aux équipements, fenêtre aux menuiseries", () => {
    expect(phasesMateriau("CIT-GO-008")!.realisation).toEqual(expect.arrayContaining(["MACONNERIE", "ENDUITS"]));
    expect(phasesMateriau("CIT-EL-012")!.realisation).toEqual(["RESEAUX"]);
    expect(phasesMateriau("CIT-EL-015")!.realisation).toEqual(["EQUIPEMENTS"]);
    expect(phasesMateriau("CIT-AL-009")!.realisation).toEqual(["MENUISERIES"]);
    expect(phaseOuvrage("FON.10")).toBe("SOUS_SOL");
    expect(phaseOuvrage("FON.02", ["sous_sol"])).toBe("SOUS_SOL");
    expect(phaseOuvrage("STR.03")).toBe("PLANCHERS");
    expect(delaiComposant("ASCENSEUR_480").jours).toBeGreaterThanOrEqual(90);
    expect(delaiComposant("BPE_B25").jours).toBeLessThanOrEqual(3);
  });
});

describe("planning d'achat", () => {
  const r = chiffrer(VILLA, { impacts: false });
  const p = planningAchat(r, "2027-03-01");

  it("mêmes quantités que le quantitatif du moteur, réparties par phase", () => {
    const parId = new Map<string, number>();
    for (const ph of p.phases) for (const l of ph.lignes) parId.set(l.composant, (parId.get(l.composant) ?? 0) + l.quantite);
    for (const b of quantitatif(r).materiaux) expect(parId.get(b.id) ?? 0, b.id).toBeCloseTo(b.quantite, 0);
  });
  it("phases dans l'ordre du chantier, budgets cohérents", () => {
    expect(p.phases[0].phase).toBe("TERRASSEMENT");
    expect(p.phases.map((x) => x.debutSemaine)).toEqual([...p.phases.map((x) => x.debutSemaine)].sort((a, b) => a - b));
    expect(p.totalHT).toBe(p.phases.reduce((s, x) => s + x.budgetHT, 0));
    for (const ph of p.phases) expect(ph.budgetHT).toBe(ph.lignes.reduce((s, l) => s + l.montantHT, 0));
  });
  it("conversion en unités de vente et date limite = début de phase − délai", () => {
    const ciment = p.phases.flatMap((x) => x.lignes).find((l) => l.composant === "CIMENT_CPJ45")!;
    expect(ciment.unite).toBe("sac");
    expect(ciment.commande!.unite).toBe("sac50");
    const acier = p.phases.flatMap((x) => x.lignes).find((l) => l.composant === "ACIER_HA")!;
    expect(acier.commande!.unite).toBe("tonne");
    expect(acier.commande!.quantite).toBe(Math.ceil(Math.round(acier.quantite * 1e6) / 1e9));
    for (const ph of p.phases) for (const l of ph.lignes) {
      const d = new Date(`${ph.debut}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - l.delai.jours);
      expect(l.dateLimite).toBe(d.toISOString().slice(0, 10));
    }
    const fondations = p.phases.find((x) => x.phase === "FONDATIONS")!;
    expect(fondations.debut).toBe("2027-03-22");
  });
  it("calendrier allongé par niveaux et sous-sol", () => {
    expect(calendrier(4, false).MENUISERIES.debut).toBeGreaterThan(calendrier(2, false).MENUISERIES.debut);
    expect(calendrier(2, true).GROS_OEUVRE.debut).toBe(calendrier(2, false).GROS_OEUVRE.debut + 4);
    expect(planningAchat(r).phases[0].debut).toBeNull();
  });
});
