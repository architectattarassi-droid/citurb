/** Pages Functions de la matériauthèque : SEO, API publique des prix, back-office, alerte lead. */
import { describe, expect, it } from "vitest";
import { pageMateriaux, sitemapMateriaux } from "../../../../../functions/_lib/seoMateriaux";
import { reponsePrix } from "../../../../../functions/_lib/prixMateriaux";
import { validerPrixManuel } from "../../../../../functions/api/cc/prix-reference/index";
import { resumeEstimation } from "../../../../../functions/api/lead-funnel/capture";
import { construireDemande, wizardDemande } from "./demandePrix";
import { MATERIAUX_PUBLICS } from "./reference";

describe("SEO /materiaux", () => {
  it("catalogue : titre, canonique, Dataset sans offre commerciale", () => {
    const p = pageMateriaux("/materiaux")!;
    expect(p.titre).toMatch(/^Prix des matériaux de construction au Maroc 2026/);
    expect(p.canonique).toBe("https://citurbarea.com/materiaux");
    expect(p.description.length).toBeLessThanOrEqual(160);
    const ld = JSON.parse(p.jsonLd);
    expect(ld["@graph"][0]["@type"]).toBe("Dataset");
    expect(p.jsonLd).not.toMatch(/"Offer"|AggregateOffer|"Product"/);
    expect(p.contenu).toContain('href="/materiaux/ciment-cpj-45"');
  });

  it("fiche : « Prix ciment CPJ 45 au Maroc 2026 », prix, sources, ville, données structurées", () => {
    const p = pageMateriaux("/materiaux/ciment-cpj-45")!;
    expect(p.titre).toBe("Prix ciment CPJ 45 au Maroc 2026 | CITURBAREA");
    expect(p.contenu).toMatch(/1,6 DH HT par kg/);
    expect(p.contenu).toMatch(/80 DH HT sac 50 kg/);
    expect(p.contenu).toMatch(/Casablanca/);
    expect(p.contenu).toMatch(/LeChantier/);
    const ds = JSON.parse(p.jsonLd)["@graph"][0];
    expect(ds.variableMeasured[0]).toMatchObject({ value: 1.6, unitText: "MAD/kg" });
    expect(p.contenu).not.toMatch(/<script/i);
  });

  it("famille, slug inconnu (404 noindex), commande ignorée", () => {
    expect(pageMateriaux("/materiaux/famille/peinture-et-enduits")!.titre).toMatch(/^Prix peinture & enduits au Maroc/);
    expect(pageMateriaux("/materiaux/famille/inconnue")).toBeNull();
    expect(pageMateriaux("/materiaux/nimporte-quoi")).toMatchObject({ introuvable: true, noindex: true });
    expect(pageMateriaux("/materiaux/commande")).toBeNull();
  });

  it("sitemap : catalogue, familles et toutes les fiches", () => {
    const xml = sitemapMateriaux();
    expect((xml.match(/<url>/g) || []).length).toBeGreaterThan(MATERIAUX_PUBLICS.length);
    expect(xml).toContain("https://citurbarea.com/materiaux/ciment-cpj-45");
  });
});

describe("GET /api/prix/materiaux", () => {
  it("sans base : prix de référence, marché indisponible", () => {
    const r = reponsePrix({ fiches: null, fournisseurs: null, manuels: {} }, "Kénitra", ["CIT-GO-008"]);
    expect(r).toMatchObject({ ok: true, region: "rabat-sale-kenitra", marcheDisponible: false });
    expect(r.materiaux).toHaveLength(1);
    expect(r.materiaux[0]).toMatchObject({ code: "CIT-GO-008", marche: null, retenu: { prix: 1.6, source: "recherche" } });
  });
  it("médiane fournisseurs retenue à partir de 3 ; mise à jour manuelle sinon", () => {
    const f = (id: string, p: number) => ({ materiauCode: "CIT-GO-008", prixRefHT: p, updatedAt: new Date().toISOString(), validiteJusquau: null, fournisseurId: id, fournisseurRegion: null, zonesLivraison: ["national"] });
    const r = reponsePrix({
      fiches: [f("a", 1.5), f("b", 1.55), f("c", 1.7)], fournisseurs: [],
      manuels: { "CIT-GO-011": { code: "CIT-GO-011", min: 180, ref: 210, max: 240, source: "Devis", sourceUrl: null, datePrix: "2026-10-10", auteur: "x", at: "" } },
    }, null, ["CIT-GO-008", "CIT-GO-011"]);
    expect(r.materiaux.find((m) => m.code === "CIT-GO-008")!.retenu).toEqual({ prix: 1.55, fiabilite: "A", source: "fournisseurs" });
    expect(r.materiaux.find((m) => m.code === "CIT-GO-011")!.retenu).toEqual({ prix: 210, fiabilite: "B", source: "manuel" });
  });
});

describe("back-office : mise à jour manuelle d'un prix", () => {
  const ok = { code: "CIT-GO-008", prixHT: 1.7, source: "Devis négoce Kénitra", datePrix: "2026-10-12" };
  it("source et date obligatoires, fourchette cohérente", () => {
    expect(validerPrixManuel(ok, new Date("2026-10-13"))).toMatchObject({ ok: true, v: { prixMinHT: 1.7, prixMaxHT: 1.7 } });
    expect(validerPrixManuel({ ...ok, source: "" })).toEqual({ ok: false, error: "source_requise" });
    expect(validerPrixManuel({ ...ok, datePrix: "2030-01-01" }, new Date("2026-10-13"))).toEqual({ ok: false, error: "date_invalide" });
    expect(validerPrixManuel({ ...ok, prixMinHT: 2 })).toEqual({ ok: false, error: "fourchette_invalide" });
    expect(validerPrixManuel({ ...ok, code: "CIT-ZZ-999" })).toEqual({ ok: false, error: "code_invalide" });
  });
});

describe("alerte e-mail du lead", () => {
  it("résume la demande de prix", () => {
    const d = construireDemande([{ code: "CIT-GO-008", quantite: 20, unite: "sac50" }], "Rabat");
    expect(resumeEstimation(wizardDemande(d, 0))).toMatch(/^Demande de prix matériaux, livraison Rabat .*Ciment CPJ 45 × 20 Sac 50 kg/);
  });
});
