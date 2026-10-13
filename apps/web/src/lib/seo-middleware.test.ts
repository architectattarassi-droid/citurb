import { describe, expect, it } from "vitest";
import { adresseConnue } from "../../../../functions/_middleware";
import { PAGES_SEO } from "../../../../functions/_lib/seo";

describe("middleware : adresses connues (anti soft 404)", () => {
  it("garde les routes de l'application et les pages statiques", () => {
    for (const p of ["/", "/chiffrage", "/chiffrage/devis", "/p4/terrains/deposer", "/architecte-kenitra", "/fr/porte-01-projet-personnel",
      "/services/architecte-rabat", "/guide/prix-construction-villa-maroc", "/cc/leads", "/mon-espace", "/sitemap.xml", "/confidentialite.html"]) {
      expect(adresseConnue(p), p).toBe(true);
    }
  });
  it("signale les adresses inventées", () => {
    for (const p of ["/page-qui-nexiste-pas-xyz", "/wp-admin", "/villa-pas-chere"]) expect(adresseConnue(p), p).toBe(false);
  });
});

describe("SEO servi : page de dépôt de terrain", () => {
  it("a son propre titre et sa canonique (elle est dans sitemap-terrains.xml)", () => {
    const p = PAGES_SEO["/p4/terrains/deposer"];
    expect(p.canonique).toBe("https://citurbarea.com/p4/terrains/deposer");
    expect(p.titre.length).toBeLessThanOrEqual(70);
    expect(p.description.length).toBeLessThanOrEqual(200);
    expect(p.noindex).toBeFalsy();
  });
});

describe("SEO servi : rendez-vous visio", () => {
  it("/rendez-vous et /rdv/<jeton> sont des adresses de l'application", () => {
    expect(adresseConnue("/rendez-vous")).toBe(true);
    expect(adresseConnue("/rdv/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde")).toBe(true);
  });
  it("/rendez-vous est indexable, avec titre et description bornés", () => {
    const p = PAGES_SEO["/rendez-vous"];
    expect(p.canonique).toBe("https://citurbarea.com/rendez-vous");
    expect(p.titre.length).toBeLessThanOrEqual(70);
    expect(p.description.length).toBeLessThanOrEqual(200);
    expect(p.noindex).toBeFalsy();
  });
});
