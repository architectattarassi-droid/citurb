import { describe, expect, it } from "vitest";
import { chiffrer, type ProjetInput } from "../chiffrage";
import { controlerCps, genererCps } from "./index";

const VILLA: ProjetInput = {
  type: "VILLA", ville: "Salé", surfacePlancher: 0, niveaux: 2, surfaceTerrain: 294, parcelle: { villaType: "jumelee" },
  sousSol: { profondeur: 3 }, sol: "BON", standing: "ECONOMIQUE", etapes: { terrain: true, finitions: true },
  soutenements: [{ emplacement: "COUR_ANGLAISE", longueur: 8 }],
};

describe("contrôle de conformité du CPS généré", () => {
  it("aucun point bloquant sur la villa type", () => {
    const r = chiffrer(VILLA, { impacts: false });
    const pts = controlerCps(r, genererCps(r, { nomProjet: "Villa", commune: "Salé" }));
    expect(pts.filter((p) => p.statut === "BLOQUANT").map((p) => `${p.id} ${p.preuve}`)).toEqual([]);
    expect(pts.length).toBeGreaterThan(15);
  });
});
