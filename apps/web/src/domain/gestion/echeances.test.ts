/**
 * Lot GP4 — échéances et rappels J−90 / J−30 / J−7 (péremption du permis, loi 12-90 art. 49 ;
 * assurances, cautions, parfait achèvement, décennale).
 */
import { describe, expect, it, vi } from "vitest";
import { ajouter, echeancesDuDossier, niveau, rappelsDus, validerDates } from "../../../../../packages/contracts/src/gestion/echeances";
import { envoyerRappels } from "../../../../../functions/_lib/echeances";

describe("GP4 — calcul des échéances", () => {
  it("permis délivré il y a 11 mois sans fondations : péremption à J−30", () => {
    const e = echeancesDuDossier({ autorisationDate: "2025-11-14", dates: {}, fondationsCommencees: false }, "2026-10-15");
    expect(e[0]).toMatchObject({ type: "PEREMPTION_PERMIS", date: "2026-11-14", niveau: "J30" });
    expect(e[0].base).toMatch(/12-90.*49/);
  });
  it("fondations commencées (étape ou date) : plus de péremption", () => {
    expect(echeancesDuDossier({ autorisationDate: "2025-11-14", dates: {}, fondationsCommencees: true }, "2026-10-15")).toEqual([]);
    expect(echeancesDuDossier({ autorisationDate: "2025-11-14", dates: { debutFondations: "2026-01-10" }, fondationsCommencees: false }, "2026-10-15")).toEqual([]);
  });
  it("réception provisoire : parfait achèvement à 12 mois, décennale à 10 ans ; assurances et cautions", () => {
    const e = echeancesDuDossier({ dates: { receptionProvisoire: "2026-01-31", assurances: [{ libelle: "TRC", fin: "2026-10-20" }], cautions: [{ libelle: "Bonne fin", fin: "2027-01-31" }] }, fondationsCommencees: true }, "2026-10-15");
    const par = Object.fromEntries(e.map((x) => [x.type, x]));
    expect(par.PARFAIT_ACHEVEMENT.date).toBe("2027-01-31");
    expect(par.DECENNALE.date).toBe("2036-01-31");
    expect(par.ASSURANCE.niveau).toBe("J7");
    expect(e[0].type).toBe("ASSURANCE");
  });
  it("niveaux et dates de fin de mois", () => {
    expect([niveau(-1), niveau(7), niveau(30), niveau(90), niveau(91)]).toEqual(["DEPASSEE", "J7", "J30", "J90", null]);
    expect(ajouter("2024-02-29", { ans: 1 })).toBe("2025-02-28");
    expect(ajouter("2026-01-31", { mois: 1 })).toBe("2026-02-28");
  });
  it("saisie bornée : dates invalides et libellés vides ignorés", () => {
    expect(validerDates({ receptionProvisoire: "31/01/2026", assurances: [{ libelle: "", fin: "2026-01-01" }, { libelle: "TRC", fin: "2026-12-31" }] }))
      .toEqual({ assurances: [{ libelle: "TRC", fin: "2026-12-31" }] });
  });
});

describe("GP4 — rappels", () => {
  const e = echeancesDuDossier({ autorisationDate: "2025-11-14", dates: {}, fondationsCommencees: false }, "2026-10-15");
  it("un seul rappel par seuil : J−30 envoyé une fois, puis J−7 plus tard", () => {
    expect(rappelsDus(e, {})).toEqual([expect.objectContaining({ seuil: 30 })]);
    expect(rappelsDus(e, { "PEREMPTION_PERMIS|2026-11-14": [30] })).toEqual([]);
    const tard = echeancesDuDossier({ autorisationDate: "2025-11-14", dates: {}, fondationsCommencees: false }, "2026-11-10");
    expect(rappelsDus(tard, { "PEREMPTION_PERMIS|2026-11-14": [90, 30] })).toEqual([expect.objectContaining({ seuil: 7 })]);
  });
  it("e-mail récapitulatif à l'administration, sans coordonnées de tiers, puis noté dans le dossier", async () => {
    const majs: string[] = [];
    const sql = (async (strings: TemplateStringsArray, ...v: unknown[]) => {
      const q = strings.join("?");
      if (q.includes("to_regclass")) return [{ d: true, u: true, c: true, e: true, j: true, col: true }];
      if (q.includes('FROM "Dossier" WHERE "archivedAt" IS NULL')) return [{ id: "dos_1", title: "Villa Test QA", clientNom: "Test QA", commune: "Kénitra", phase: "54_ATTRIBUTION_MARCHE", payload: {}, autDate: "2025-11-14", autExp: null }];
      if (q.includes('FROM "DossierEtape"')) return [];
      if (q.startsWith('UPDATE "Dossier"')) { majs.push(String(v[0])); return []; }
      return [];
    }) as never;
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await envoyerRappels(sql, { RESEND_API_KEY: "re_test", LEAD_NOTIFY_TO: "qa-test@example.test" }, "2026-10-15");
    vi.unstubAllGlobals();
    expect(r.envoyes).toBe(1);
    const corps = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(corps.subject).toMatch(/1 échéance/);
    expect(corps.text).toMatch(/Villa Test QA.*Kénitra.*Péremption/);
    expect(JSON.parse(majs[0]).gestion.rappels).toEqual({ "PEREMPTION_PERMIS|2026-11-14": [30] });
  });
});
