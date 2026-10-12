import { describe, expect, it } from "vitest";
import { score } from "../../../../../functions/api/lead-funnel/capture";
import { traiterQualification } from "../../../../../functions/api/lead-funnel/qualify";

describe("score des leads (Pages Function)", () => {
  it("un MRE (numéro étranger) qui accepte WhatsApp obtient les points de contact", () => {
    const s = score({ budget: 1_300_000, email: null, telephone: "+33612345678", delaiMois: null, ville: "Kénitra", returnVisitor: false, whatsapp: true });
    expect(s.breakdown.contact).toBe(15);
    expect(s.breakdown.ville).toBe(10);
  });
  it("terrain détenu : +10", () => {
    const s = score({ budget: null, email: null, telephone: "0612345678", delaiMois: 3, ville: null, returnVisitor: false, terrain: "TITRE" });
    expect(s.breakdown.terrain).toBe(10);
    expect(s.breakdown.urgency).toBe(15);
  });
});

describe("qualification palier 2", () => {
  const lead = { id: "lead_abc123", budget: 1_300_000, email: null, telephone: "0612345678", ville: "Salé", returnVisitor: false, delaiMois: null, meta: { idempotencyKey: "cle-secrete-123", whatsapp: true }, events: [] };
  const faux = () => {
    const appels: string[] = [];
    const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join("?");
      appels.push(q);
      if (q.startsWith("SELECT")) return values[1] === "cle-secrete-123" && values[0] === "lead_abc123" ? [lead] : [];
      return [];
    }) as never;
    return { sql, appels };
  };

  it("met à jour le lead quand la clé correspond", async () => {
    const { sql, appels } = faux();
    const r = await traiterQualification({ leadId: "lead_abc123", cle: "cle-secrete-123", terrain: "TITRE", delai: "MOINS_6", residence: "MAROC" }, sql);
    expect(r.status).toBe(200);
    expect(appels.some((q) => q.startsWith("UPDATE"))).toBe(true);
  });
  it("refuse une clé qui ne correspond pas (aucune écriture)", async () => {
    const { sql, appels } = faux();
    const r = await traiterQualification({ leadId: "lead_abc123", cle: "mauvaise-cle-999", terrain: "TITRE" }, sql);
    expect(r.status).toBe(404);
    expect(appels.some((q) => q.startsWith("UPDATE"))).toBe(false);
  });
  it("refuse des valeurs hors liste", async () => {
    const { sql } = faux();
    const r = await traiterQualification({ leadId: "lead_abc123", cle: "cle-secrete-123", terrain: "DROP TABLE" }, sql);
    expect(r.status).toBe(400);
  });
});
