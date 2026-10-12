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

describe("contrôle de conformité : pas de faux bloquant (audit du 12/10/2026)", () => {
  const cas: [string, ProjetInput][] = [
    ["villa sans sous-sol, standing", { type: "VILLA", ville: "Rabat", surfacePlancher: 220, niveaux: 2, parcelle: null, sol: "BON", standing: "STANDARD", etapes: { terrain: true, finitions: true } }],
    ["immeuble R+4", { type: "IMMEUBLE", ville: "Casablanca", surfacePlancher: 1500, niveaux: 5, parcelle: null, sol: "BON", standing: "STANDARD", etapes: { terrain: true, finitions: true } }],
    ["villa très économique (tâcheron)", { type: "VILLA", ville: "Rabat", surfacePlancher: 220, niveaux: 2, parcelle: null, sol: "BON", standing: "ULTRA_ECO", etapes: { terrain: true, finitions: true } }],
  ];
  for (const [nom, p] of cas) {
    it(nom, () => {
      const r = chiffrer(p, { impacts: false });
      const pts = controlerCps(r, genererCps(r, { nomProjet: nom, commune: p.ville }));
      expect(pts.filter((x) => x.statut === "BLOQUANT").map((x) => `${x.id} ${x.preuve}`)).toEqual([]);
    });
  }

  it("argile / remblai avec semelles forcées : chiffré avec purge, sans exception", () => {
    const r = chiffrer({ type: "VILLA", ville: "Rabat", standing: "STANDARD", niveaux: 2, surfacePlancher: 220, parcelle: null, sol: "ARGILE_REMBLAI", fondation: "SEMELLES_ISOLEES" } as ProjetInput, { impacts: false });
    expect(r.lignes.some((l) => l.id === "TER.purge")).toBe(true);
  });

  it("immeuble très économique : entreprise par défaut, jamais tâcheron", () => {
    const r = chiffrer({ type: "IMMEUBLE", ville: "Rabat", standing: "ULTRA_ECO", niveaux: 5, surfacePlancher: 1500, parcelle: null, sol: "BON" } as ProjetInput, { impacts: false });
    expect(r.regime).toBe("ENTREPRISE");
  });
});
