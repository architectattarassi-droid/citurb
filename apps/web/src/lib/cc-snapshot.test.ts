import { describe, expect, it } from "vitest";
import { lireSnapshot } from "../../../../functions/api/cc/snapshot/current";
import { onRequestPost as clientError } from "../../../../functions/api/telemetry/client-error";

type Ligne = Record<string, unknown>;
/** Faux client Neon : répond selon un fragment de la requête. */
const fauxSql = (reponses: [string, Ligne[]][]) =>
  (async (strings: TemplateStringsArray) => {
    const q = strings.join("?");
    for (const [frag, lignes] of reponses) if (q.includes(frag)) return lignes;
    throw new Error(`requête inattendue : ${q}`);
  }) as unknown as Parameters<typeof lireSnapshot>[0];

describe("GET /api/cc/snapshot/current", () => {
  it("compte les tables présentes", async () => {
    const sql = fauxSql([
      ["to_regclass", [{ lead: true, rdv: true, dossier: true, fournisseur: true, terrain: true }]],
      ['FROM "Lead"', [{ a: 3, b: 41 }]],
      ['FROM "RendezVous"', [{ a: 2 }]],
      ['FROM "Dossier"', [{ a: 9 }]],
      ['FROM "Fournisseur"', [{ a: 1 }]],
      ['FROM "TerrainAnnonce"', [{ a: 0 }]],
    ]);
    expect(await lireSnapshot(sql)).toEqual({ leads7j: 3, leadsTotal: 41, rdvAVenir: 2, dossiers: 9, fournisseursEnAttente: 1, terrainsEnAttente: 0 });
  });

  it("table absente → null, sans requête sur elle", async () => {
    const sql = fauxSql([
      ["to_regclass", [{ lead: true, rdv: false, dossier: false, fournisseur: false, terrain: false }]],
      ['FROM "Lead"', [{ a: 0, b: 5 }]],
    ]);
    expect(await lireSnapshot(sql)).toEqual({ leads7j: 0, leadsTotal: 5, rdvAVenir: null, dossiers: null, fournisseursEnAttente: null, terrainsEnAttente: null });
  });
});

describe("POST /api/telemetry/client-error", () => {
  it("répond toujours 204, même sur un corps illisible", async () => {
    const ok = await clientError({ request: new Request("https://x/api/telemetry/client-error", { method: "POST", body: JSON.stringify({ incidentId: "i1", message: "boom", url: "https://citurbarea.com/p2?tel=06" }) }) });
    expect(ok.status).toBe(204);
    const ko = await clientError({ request: new Request("https://x/api/telemetry/client-error", { method: "POST", body: "{pas du json" }) });
    expect(ko.status).toBe(204);
  });
});
