/**
 * Lot GP5 — une seule vérité d'avancement : phase du dossier synchronisée sur les jalons
 * de l'espace projet, frise des 15 phases pour le client (FR/AR) avec durées types.
 */
import { describe, expect, it } from "vitest";
import { frise, phaseCourante, phaseFixe } from "../../../../../packages/contracts/src/gestion/frise";
import { gestionNeon } from "../../../../../functions/_lib/projetsGestion";
import { lireVueDossierClient } from "../../../../../functions/_lib/vueDossierClient";

describe("GP5 — phase courante et frise", () => {
  it("phase du premier jalon non terminé ; phases générées ramenées à une phase fixe déjà atteinte", () => {
    const js = [
      { phase: "84_FONDATIONS", statut: "VALIDE", rang: 1 },
      { phase: "86_PLANCHER_R1", phaseGabarit: "86_PLANCHER", statut: "EN_COURS", rang: 2 },
      { phase: "LOT_PEINTURE", statut: "A_FAIRE", rang: 3 },
    ];
    expect(phaseCourante(js)).toMatchObject({ catalogue: "84_FONDATIONS", phaseRef: "P09_GROS_OEUVRE_ELEVATION", termine: false });
    expect(phaseFixe("LOT_PEINTURE")).toBe("90_RECEPTION_GROS_OEUVRE");
    expect(phaseFixe("54_ATTRIBUTION_MARCHE")).toBe("54_ATTRIBUTION_MARCHE");
  });
  it("frise : 15 phases, fait / en cours / à venir, durées selon le type, FR et AR", () => {
    const f = frise("P04_AUTORISATION", { type: "VILLA", sousSols: 1 });
    expect(f.phases).toHaveLength(15);
    expect(f.phases.filter((p) => p.statut === "FAIT").map((p) => p.code)).toHaveLength(4);
    expect(f.phases.find((p) => p.statut === "EN_COURS")?.code).toBe("P04_AUTORISATION");
    expect(f.phases.every((p) => p.titreAr)).toBe(true);
    expect(f.dureeTotaleMois).toEqual([17, 24]);
    const imm = frise("P04_AUTORISATION", { type: "IMMEUBLE", etagesHorsSol: 4 });
    expect(imm.phases[4].dureeSemaines![1]).toBeGreaterThan(f.phases[4].dureeSemaines![1]);
  });
});

type Ligne = Record<string, unknown>;
function base(dossier: Ligne, etapes: Ligne[] = []) {
  const requetes: Array<{ q: string; v: unknown[] }> = [];
  const sql = (async (s: TemplateStringsArray, ...v: unknown[]) => {
    const q = s.join("?");
    requetes.push({ q, v });
    if (q.includes("to_regclass")) return [{ p: true, d: true, j: true, ok: false, u: true, c: true, e: true, col: true }];
    if (q.startsWith('SELECT "phase", "payload" FROM "Dossier"')) return [dossier];
    if (q.startsWith('SELECT "phaseCode", "statut" FROM "DossierEtape"')) return etapes;
    return [];
  }) as never;
  return { sql, requetes };
}

describe("GP5 — synchronisation espace projet → dossier", () => {
  const jalons = (statuts: string[]) => statuts.map((statut, i) => ({
    projetId: "prj_x", code: `J${i}`, phase: ["54_ATTRIBUTION_MARCHE", "80_OUVERTURE_CHANTIER", "84_FONDATIONS"][i], rang: i, statut,
    definition: { phase: ["54_ATTRIBUTION_MARCHE", "80_OUVERTURE_CHANTIER", "84_FONDATIONS"][i] }, checklist: {}, validePar: null, valideLe: null, salle: null, updatedAt: "",
  }));
  const ctx = (js: unknown[]) => ({ depot: { jalons: async () => js }, maintenant: () => "2026-10-15T10:00:00.000Z" }) as never;
  const projet = { id: "prj_x", dossierId: "dos_1" } as never;

  it("un jalon validé fait avancer la phase du dossier (jamais reculer), étape précédente faite, journal", async () => {
    const { sql, requetes } = base({ phase: "54_ATTRIBUTION_MARCHE", payload: {} });
    await gestionNeon(sql).synchroDossier!(ctx(jalons(["VALIDE", "EN_COURS", "A_FAIRE"])), projet, "admin:test");
    const maj = requetes.find((r) => r.q.startsWith('UPDATE "Dossier" SET "phase"'))!;
    expect(maj.v[0]).toBe("80_OUVERTURE_CHANTIER");
    expect(JSON.parse(String(maj.v[1])).gestion.phaseRef).toBe("P07_PREPARATION_CHANTIER");
    expect(requetes.some((r) => r.q.includes("'FAITE'") && r.v.includes("54_ATTRIBUTION_MARCHE"))).toBe(true);
    expect(requetes.some((r) => r.q.includes('INSERT INTO "DossierEvenement"') && r.v.includes("PHASE_SYNCHRONISEE"))).toBe(true);

    const recul = base({ phase: "84_FONDATIONS", payload: { gestion: { phaseRef: "P08_GROS_OEUVRE_INFRASTRUCTURE" } } });
    await gestionNeon(recul.sql).synchroDossier!(ctx(jalons(["VALIDE", "EN_COURS", "A_FAIRE"])), projet, "admin:test");
    expect(recul.requetes.some((r) => r.q.startsWith('UPDATE "Dossier" SET "phase"'))).toBe(false);
  });

  it("création depuis un dossier : étapes faites hors plateforme → jalons validés, sans objet → sans objet", async () => {
    const { sql } = base({}, [{ phaseCode: "54_ATTRIBUTION_MARCHE", statut: "FAITE_HORS_PLATEFORME" }, { phaseCode: "80_OUVERTURE_CHANTIER", statut: "SANS_OBJET" }]);
    const maj: string[] = [];
    const c = { depot: { jalons: async () => jalons(["A_FAIRE", "A_FAIRE", "A_FAIRE"]), majStatut: async (_p: string, code: string, _de: string, vers: string) => { maj.push(`${code}:${vers}`); return true; }, journaliser: async () => undefined }, maintenant: () => "2026-10-15T10:00:00.000Z" } as never;
    await gestionNeon(sql).apresCreation!(c, "prj_x", "dos_1", "admin:test");
    expect(maj).toEqual(["J0:VALIDE", "J1:SANS_OBJET"]);
  });

  it("vue client : frise et pièces à fournir, même sans le SQL devis-facturation", async () => {
    const sql = (async (s: TemplateStringsArray) => {
      const q = s.join("?");
      if (q.includes("to_regclass")) return [{ d: true, u: true, c: false, e: false, j: false, col: false }];
      if (q.startsWith('SELECT "id", "title"')) return [{ id: "dos_1", title: "Villa", commune: "Kénitra", phase: "10_ESQUISSE", clientNom: "Test QA", payload: {} }];
      return [];
    }) as never;
    const v = await lireVueDossierClient(sql, "dos_1", "2026-10-15");
    expect(v?.frise?.find((p) => p.statut === "EN_COURS")?.code).toBe("P02_ESQUISSE_APS");
    expect(v?.piecesClient?.length).toBeGreaterThan(0);
  });
});
