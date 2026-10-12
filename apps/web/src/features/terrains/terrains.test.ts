import { describe, expect, it } from "vitest";
import { validerDepot, vuePublique, slugifier } from "../../../../../functions/_lib/terrains";
import { deposer } from "../../../../../functions/api/terrains/index";

const BASE = { deposant: "PROPRIETAIRE", consentement: true, nom: "Test QA", telephone: "+212600000000", ville: "Kénitra", surface: 300, prix: 900000, titre: "TITRE", usage: "VILLA" };

describe("annonces de terrains : validation du dépôt", () => {
  it("accepte un dépôt complet de propriétaire", () => {
    const d = validerDepot(BASE);
    expect("erreur" in d).toBe(false);
  });
  it("exige le mandat pour un intermédiaire et le consentement", () => {
    expect(validerDepot({ ...BASE, deposant: "INTERMEDIAIRE" })).toEqual({ erreur: "mandat_requis" });
    expect(validerDepot({ ...BASE, consentement: false })).toEqual({ erreur: "consentement_requis" });
  });
  it("retire les coordonnées glissées dans la description", () => {
    const d = validerDepot({ ...BASE, description: "Appelez le 06 12 34 56 78 ou x@y.ma, voir https://exemple.ma" });
    if ("erreur" in d) throw new Error(d.erreur);
    expect(d.description).not.toMatch(/06 12|x@y|https/);
  });
  it("la vue publique ne contient jamais nom, téléphone ni e-mail", () => {
    const v = vuePublique({ slug: "terrain-300m2-kenitra-abc123", nom: "Test QA", telephone: "+212600000000", email: "qa@example.test", ville: "Kénitra", surface: 300, prix: 900000, titre: "TITRE", usage: "VILLA", deposant: "PROPRIETAIRE", statut: "PUBLIE" });
    expect(JSON.stringify(v)).not.toMatch(/Test QA|212600000000|example\.test/);
    expect(v.prixM2).toBe(3000);
  });
  it("slug lisible et sans accents", () => {
    expect(slugifier("Kénitra", "Bir Rami", 300, "ter_abcdef123456")).toBe("terrain-300m2-bir-rami-kenitra-123456");
  });
});

describe("annonces de terrains : dépôt (fausse base)", () => {
  it("insère l'annonce en attente et un lead P4", async () => {
    const requetes: string[] = [];
    const sql = (async (s: TemplateStringsArray) => {
      const q = s.join("?");
      requetes.push(q);
      if (q.includes("to_regclass")) return [{ t: true, l: true }];
      return [];
    }) as never;
    const r = await deposer(BASE, sql, "1.2.3.4");
    expect(r.status).toBe(201);
    expect(requetes.some((q) => q.startsWith('INSERT INTO "TerrainAnnonce"') && q.includes("'EN_ATTENTE'"))).toBe(true);
    expect(requetes.some((q) => q.startsWith('INSERT INTO "Lead"'))).toBe(true);
  });
});
