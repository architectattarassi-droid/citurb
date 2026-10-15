/**
 * Décisions du fondateur du 15/10/2026 :
 *   1. DEXE en parallèle de l'instruction du permis ; mise à jour du DEXE à chaque révision du permis ;
 *   2. une phase démarre après le paiement de son échéance (« En attente de paiement », déblocage motivé).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../functions/_lib/gestionPhases", async (orig) => {
  const vrai = await orig<typeof import("../../../../../functions/_lib/gestionPhases")>();
  return {
    ...vrai,
    paiementsDossier: vi.fn(async () => [
      { phase: "P06_CONSULTATION_MARCHES", bloquante: true, statut: "A_EMETTRE", datePaiementComplet: null, deblocage: null, aucuneEcheance: false, factures: [], devis: [], echeances: [], du: "10000.00", paye: "0.00", restant: "10000.00", estime: true, ordre: 6, libelle: "" },
      { phase: "P04_AUTORISATION", bloquante: false, statut: "PAYEE", datePaiementComplet: "2026-09-01", deblocage: null, aucuneEcheance: false, factures: [{ id: "f1", numero: "FAC-2026-0001", type: "FACTURE", statut: "PAYEE", du: "6000.00", paye: "6000.00", restant: "0.00", dateEcheance: "2026-09-15" }], devis: [], echeances: [], du: "6000.00", paye: "6000.00", restant: "0.00", estime: false, ordre: 4, libelle: "" },
    ]),
  };
});

import { cloturerMajDexe, dexeEnParallele, ouvrirMajDexe } from "../../../../../packages/contracts/src/gestion/majDexe";
import { frise } from "../../../../../packages/contracts/src/gestion/frise";
import { appliquerAction, construireParcours, lireAction } from "../../../../../functions/_lib/ficheDossier";
import { lireVueDossierClient } from "../../../../../functions/_lib/vueDossierClient";

describe("DEXE en parallèle de l'instruction du permis", () => {
  it("le DEXE est en cours dès le dépôt du dossier d'autorisation", () => {
    expect(dexeEnParallele("32_VISA_CNOA", new Map())).toBe(true);
    expect(dexeEnParallele("30_DOSSIER_AUTORISATION", new Map([["30_DOSSIER_AUTORISATION", "FAITE"]]))).toBe(true);
    expect(dexeEnParallele("30_DOSSIER_AUTORISATION", new Map())).toBe(false);
    expect(dexeEnParallele("34_PERMIS_CONSTRUIRE", new Map([["40_DOSSIER_EXECUTION", "FAITE"]]))).toBe(false);
    const p = construireParcours({ phase: "34_PERMIS_CONSTRUIRE", createdAt: null, leads: [], rdv: [], devisPropose: false, etapes: new Map(), maintenant: "2026-10-15" });
    expect(p.find((e) => e.code === "40_DOSSIER_EXECUTION")).toMatchObject({ statut: "EN_COURS" });
    expect(p.find((e) => e.code === "54_ATTRIBUTION_MARCHE")?.statut).toBe("A_VENIR");
    const f = frise("P04_AUTORISATION", { type: "VILLA" }, ["P05_ETUDES_EXECUTION"]);
    expect(f.phases.find((x) => x.code === "P05_ETUDES_EXECUTION")).toMatchObject({ statut: "EN_COURS", parallele: true });
    expect(f.phases.find((x) => x.code === "P06_CONSULTATION_MARCHES")?.statut).toBe("A_VENIR");
  });
  it("révision du permis : mise à jour ouverte, écarts cumulés, pièces DEXE à reprendre, clôture puis historique", () => {
    const e = (texte: string) => ({ le: "2026-10-15T10:00:00Z", par: "admin", texte, source: "SAISIE" as const });
    const a = ouvrirMajDexe(null, e("Observations : recul de 2 m"), ["P05_ETUDES_EXECUTION:PLANS_EXE_STRUCTURE"]);
    const b = ouvrirMajDexe(a, e("Permis modificatif : R+2 retiré"), ["P05_ETUDES_EXECUTION:NOTE_CALCUL"]);
    expect(b.ecarts).toHaveLength(2);
    expect(b.piecesAReprendre).toHaveLength(2);
    const c = cloturerMajDexe(b, "admin", "2026-11-01", "DEXE repris");
    expect(c.ouverte).toBe(false);
    expect(ouvrirMajDexe(c, e("Nouveau modificatif"), []).historique).toHaveLength(1);
  });
  it("fiche : la révision du permis ouvre l'étape « Mise à jour du dossier d'exécution suite au permis »", async () => {
    let payload: Record<string, unknown> = {};
    const journal: unknown[][] = [];
    const sql = (async (s: TemplateStringsArray, ...v: unknown[]) => {
      const q = s.join("?");
      if (q.startsWith('SELECT "status", "phase", "payload"') || q.startsWith('SELECT "payload" FROM "Dossier"')) return [{ status: "APPROVED", phase: "34_PERMIS_CONSTRUIRE", payload }];
      if (q.includes("to_regclass")) return [{ d: true, u: true, c: true, e: true, j: true, col: true, p: true }];
      if (q.includes('FROM "DossierPiece"')) return [{ cle: "P05_ETUDES_EXECUTION:PLANS_EXE" }];
      if (q.startsWith('UPDATE "Dossier" SET "payload"')) { payload = JSON.parse(String(v[0])); return []; }
      if (q.includes('INSERT INTO "DossierEvenement"')) journal.push(v);
      return [];
    }) as never;
    const a = lireAction({ action: "revision_permis", texte: "Observations de la commission : recul" });
    if ("erreur" in a) throw new Error(a.erreur);
    expect((await appliquerAction(sql, "dos_1", a, "admin@test")).status).toBe(200);
    const m = (payload.gestion as Record<string, any>).majDexe;
    expect(m).toMatchObject({ ouverte: true, piecesAReprendre: ["P05_ETUDES_EXECUTION:PLANS_EXE"] });
    expect(journal.some((v) => v.includes("MAJ_DEXE_OUVERTE"))).toBe(true);
    const p = construireParcours({ phase: "34_PERMIS_CONSTRUIRE", createdAt: null, leads: [], rdv: [], devisPropose: false, etapes: new Map(), maintenant: "2026-10-15", majDexe: m });
    expect(p.find((e) => e.code === "GP_MAJ_DEXE")).toMatchObject({ statut: "EN_COURS", phaseRef: "P05_ETUDES_EXECUTION" });
  });
});

describe("phase démarrée après paiement", () => {
  const sql = (async (s: TemplateStringsArray) => {
    const q = s.join("?");
    if (q.startsWith('SELECT "status", "phase", "payload"')) return [{ status: "APPROVED", phase: "40_DOSSIER_EXECUTION", payload: {} }];
    if (q.includes("to_regclass")) return [{ d: true, u: true, c: true, e: true, j: true, col: true }];
    return [];
  }) as never;
  it("une phase dont l'échéance n'est pas payée ne démarre pas (phase actuelle ou étape en cours)", async () => {
    const r = await appliquerAction(sql, "dos_1", { action: "phase", phase: "50_DCE", motif: null }, "admin@test");
    expect(r).toEqual({ status: 409, json: { ok: false, error: "phase_en_attente_paiement", phase: "P06_CONSULTATION_MARCHES" } });
    const e = await appliquerAction(sql, "dos_1", { action: "etape", code: "54_ATTRIBUTION_MARCHE", statut: "EN_COURS", date: null, note: null }, "admin@test");
    expect(e.status).toBe(409);
    // Une phase payée se démarre normalement.
    expect((await appliquerAction(sql, "dos_1", { action: "phase", phase: "34_PERMIS_CONSTRUIRE", motif: null }, "admin@test")).status).toBe(200);
  });
  it("vue client : en attente de paiement, réglée avec date de démarrage, prochaine échéance", async () => {
    const sqlC = (async (s: TemplateStringsArray) => {
      const q = s.join("?");
      if (q.includes("to_regclass('public.\"Dossier\"')")) return [{ d: true, u: true, c: true, e: true, j: true, col: true }];
      if (q.includes("to_regclass")) return [{ ok: false }];
      if (q.startsWith("SELECT d.\"title\"")) return [{ title: "Villa", commune: "Kénitra", phase: "40_DOSSIER_EXECUTION", typologie: "VILLA", clientNom: "Test QA", payload: {} }];
      return [];
    }) as never;
    const v = await lireVueDossierClient(sqlC, "dos_1", "2026-10-15");
    expect(v?.frise?.find((p) => p.code === "P06_CONSULTATION_MARCHES")).toMatchObject({ paiement: { enAttente: true } });
    expect(v?.frise?.find((p) => p.code === "P04_AUTORISATION")).toMatchObject({ paiement: { statut: "PAYEE", dateDemarrage: "2026-09-01" } });
  });
});
