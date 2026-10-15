import { describe, expect, it } from "vitest";
import { redirectionAncienne } from "../../../../functions/_lib/anciennesAdresses";
import { adresseConnue } from "../../../../functions/_middleware";

// URL relevées dans le rapport « Introuvable (404) » de Search Console (15/10/2026).
const CAS: [string, string | null][] = [
  ["/fr/porte-05-rapports-expertises-oriental.html", "/fr/porte-05-rapports-expertises"],
  ["/fr/porte-05-rapports-expertises-oriental", "/fr/porte-05-rapports-expertises"],
  ["/fr/porte-02-projet-immobilier-equipements-marrakech.html", "/fr/porte-02-projet-immobilier-equipements"],
  ["/fr/porte-02-projet-immobilier-equipements-dakhla", "/fr/porte-02-projet-immobilier-equipements"],
  ["/en/door-02-guelmim.html", "/en/door-02-real-estate-development-facilities"],
  ["/en/door-01-personal-family-project-tanger.html", "/en/door-01-personal-family-project"],
  ["/ar/mostathmir-aqari-wa-aard-beni-mellal", "/ar/bab-04-mostathmir-aqari-wa-aard"],
  ["/architecte-immeuble-rabat.html", "/architecte-rabat"],
  ["/promotion-immobiliere-rabat-sale-kenitra", "/fr/porte-02-projet-immobilier-equipements"],
  ["/promotion-immobiliere-rabat-sale-kenitra.html", "/fr/porte-02-projet-immobilier-equipements"],
  ["/etude-faisabilite-maroc.html", "/fr/porte-04-investisseur-foncier"],
  ["/portail/p5", "/p5"],
  // Pages vivantes : aucune redirection.
  ["/fr/porte-05-rapports-expertises", null],
  ["/fr/porte-01-projet-personnel.html", null],
  ["/ar/bab-01-mashrou-shakhsi-wa-usari", null],
  ["/ar/cercles/annuaire", null],
  ["/architecte-tanger", null],
  ["/chiffrage", null],
];

describe("anciennes adresses → 301 vers la page vivante", () => {
  for (const [de, vers] of CAS) it(de, () => expect(redirectionAncienne(de)).toBe(vers));
  it("chaque cible est une adresse de l'application", () => {
    for (const [, vers] of CAS) if (vers) expect(adresseConnue(vers), vers).toBe(true);
  });
});
