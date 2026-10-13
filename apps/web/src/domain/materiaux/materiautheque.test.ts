import { describe, expect, it } from "vitest";
import { MATERIAUX, prixHT } from "../chiffrage/referentiel";
import { CATALOGUE } from "./catalogue";
import { prixAberrant, prixParUniteVente } from "./conversions";
import { ajouterAuPanier, construireDemande, normaliserLigne, resumeDemande, wizardDemande } from "./demandePrix";
import { agregerMarche, fournisseursParCategorie, type FicheMarche } from "./marche";
import { peutPasser, totaux } from "./achat";
import {
  FAMILLES, MATERIAUX_PUBLICS, categorieParSlug, coefMateriaux, familleDe, materiauParSlug, prixReference, prixTTC, prixVille, slugMateriau, SLUG_CATEGORIE,
} from "./reference";
import { indicesMateriau, sourcesCitees } from "./sources";
import { usagesMateriau } from "./usages";

describe("prix de référence publics", () => {
  it("aucun prix sans source : fiabilité A/B/C, date ou libellé de source, au moins une source citée", () => {
    expect(MATERIAUX_PUBLICS.length).toBeGreaterThan(250);
    for (const r of MATERIAUX_PUBLICS) {
      const p = prixReference(r.code)!;
      expect(["A", "B", "C"]).toContain(p.fiabilite);
      expect(p.min).toBeLessThanOrEqual(p.ref);
      expect(p.ref).toBeLessThanOrEqual(p.max);
      expect(p.ref).toBeGreaterThan(0);
      const s = sourcesCitees(r.code);
      expect(s.length).toBeGreaterThan(0);
      for (const x of s) expect(x.nom.length).toBeGreaterThan(3);
      if (p.origine === "chiffrage") expect(p.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("même prix que le moteur de chiffrage (HT, ramené à l'unité de référence)", () => {
    // Ciment : 80 DH le sac de 50 kg → 1,6 DH/kg
    expect(prixReference("CIT-GO-008")).toMatchObject({ ref: 1.6, origine: "chiffrage", composant: "CIMENT_CPJ45", fiabilite: "B" });
    // Membrane présumée TTC (prix public) → HT
    expect(prixReference("CIT-ET-004")!.ref).toBeCloseTo(prixHT(MATERIAUX.MEMBRANE_SBS4), 1);
    // Fil 2,5 mm² : devis réel (A)
    expect(prixReference("CIT-EL-004")).toMatchObject({ ref: 4.2, fiabilite: "A" });
  });

  it("une hypothèse du moteur (H) n'est jamais publiée : repli sur le catalogue", () => {
    expect(MATERIAUX.COLLE_C2.source.fiabilite).toBe("H");
    const p = prixReference("CIT-REV-001")!;
    expect(p.origine).toBe("catalogue");
    expect(p.fiabilite).not.toBe("H");
  });

  it("TTC = HT × 1,20 ; équivalences d'unités de vente", () => {
    expect(prixTTC(100)).toBe(120);
    expect(prixParUniteVente("CIT-GO-008", "sac50", prixReference("CIT-GO-008")!.ref)).toBe(80);
    expect(prixParUniteVente("CIT-GO-008", "tonne", 1.6)).toBe(1600);
  });

  it("écart et prix aberrant calculés sur la même référence", () => {
    expect(prixAberrant("CIT-GO-008", 2.4)).toBe(false);
    expect(prixAberrant("CIT-GO-008", 2.5)).toBe(true);
  });

  it("sources citées avec URL https et relevé ; indices d'évolution du ciment", () => {
    const s = sourcesCitees("CIT-GO-008");
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(s.every((x) => !x.url || x.url.startsWith("https://"))).toBe(true);
    expect(s.some((x) => x.releve)).toBe(true);
    expect(indicesMateriau("CIT-GO-008").map((i) => i.source).join(" ")).toMatch(/LeChantier/);
  });
});

describe("régions", () => {
  it("coefficient matériaux = écart global × 0,8 (moteur), base RSK", () => {
    expect(coefMateriaux("Salé")).toEqual({ coef: 1, etabli: true });
    expect(coefMateriaux("Casablanca").coef).toBeCloseTo(1.048, 3);
    expect(coefMateriaux("Oujda").coef).toBeCloseTo(0.904, 3);
    expect(coefMateriaux("Errachidia")).toEqual({ coef: 1, etabli: false });
    expect(prixVille("CIT-GO-008", "Casablanca")!.ref).toBeCloseTo(1.68, 2);
  });
});

describe("adresses publiques", () => {
  it("slugs uniques et réversibles ; ancien lien par code CIT", () => {
    const slugs = MATERIAUX_PUBLICS.map((r) => slugMateriau(r.code));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const r of MATERIAUX_PUBLICS) expect(materiauParSlug(slugMateriau(r.code))?.code).toBe(r.code);
    expect(materiauParSlug("cit-go-008")?.code).toBe("CIT-GO-008");
    expect(slugMateriau("CIT-GO-008")).toBe("ciment-cpj-45");
  });
  it("chaque catégorie a une page et une grande famille", () => {
    const toutes = Object.values(FAMILLES).flatMap((f) => f.categories as readonly string[]);
    for (const r of CATALOGUE) expect(toutes).toContain(r.categorie);
    for (const [c, s] of Object.entries(SLUG_CATEGORIE)) expect(categorieParSlug(s)).toBe(c);
    expect(familleDe("PEINTURE")).toBe("FINITIONS");
  });
});

describe("« ce matériau sert à… »", () => {
  it("le ciment sert aux maçonneries ; l'acier Ø12 hérite de l'acier HA", () => {
    expect(usagesMateriau("CIT-GO-008").length).toBeGreaterThan(3);
    expect(usagesMateriau("CIT-GO-024").length).toBeGreaterThan(3);
    expect(usagesMateriau("CIT-GO-024")).toEqual(usagesMateriau("CIT-GO-001"));
  });
});

describe("prix fournisseurs (médiane)", () => {
  const f = (fournisseurId: string, prixRefHT: number, o: Partial<FicheMarche> = {}): FicheMarche => ({
    materiauCode: "CIT-GO-008", prixRefHT, updatedAt: "2026-10-01T10:00:00.000Z", validiteJusquau: null, fournisseurId,
    fournisseurRegion: "rabat-sale-kenitra", zonesLivraison: [], ...o,
  });
  const maintenant = Date.parse("2026-10-13T12:00:00Z");

  it("≥ 3 fournisseurs distincts → médiane publiée (A) ; sinon aucun prix", () => {
    const m = agregerMarche([f("a", 1.5), f("b", 1.6), f("c", 1.62)], "Kénitra", maintenant);
    expect(m["CIT-GO-008"]).toMatchObject({ mediane: 1.6, min: 1.5, max: 1.62, nbFournisseurs: 3, fiabilite: "A" });
    const deux = agregerMarche([f("a", 1.5), f("b", 1.6)], null, maintenant);
    expect(deux["CIT-GO-008"]).toMatchObject({ mediane: null, min: null, max: null, nbFournisseurs: 2, fiabilite: null });
  });

  it("une voix par fournisseur, fiches périmées / hors région exclues, déclinaison → générique", () => {
    const m = agregerMarche([
      f("a", 1.5), f("a", 9, { updatedAt: "2026-09-01T00:00:00Z" }), f("b", 1.6), f("c", 1.7),
      f("d", 1.0, { updatedAt: "2026-01-01T00:00:00Z" }),
      f("e", 1.0, { validiteJusquau: "2026-10-01" }),
      f("g", 1.0, { fournisseurRegion: "oriental" }),
      f("h", 1.0, { fournisseurRegion: "oriental", zonesLivraison: ["national"] }),
    ], "rabat-sale-kenitra", maintenant);
    expect(m["CIT-GO-008"]).toMatchObject({ nbFournisseurs: 4, mediane: 1.55 });
    const acier = agregerMarche([f("a", 10, { materiauCode: "CIT-GO-024" }), f("b", 11, { materiauCode: "CIT-GO-024" }), f("c", 12, { materiauCode: "CIT-GO-025" })], null, maintenant);
    expect(acier["CIT-GO-001"]).toMatchObject({ nbFournisseurs: 3, mediane: 11 });
  });

  it("fournisseurs par catégorie dans la région", () => {
    const n = fournisseursParCategorie([
      { region: "rabat-sale-kenitra", zonesLivraison: [], categories: ["GROS_OEUVRE", "GROS_OEUVRE"] },
      { region: "oriental", zonesLivraison: ["national"], categories: ["GROS_OEUVRE", "PEINTURE"] },
      { region: "oriental", zonesLivraison: [], categories: ["PEINTURE"] },
    ], "Kénitra");
    expect(n).toEqual({ GROS_OEUVRE: 2, PEINTURE: 1 });
  });
});

describe("demande de prix (panier)", () => {
  it("convertit les unités de vente, estime au prix de la ville, résume", () => {
    let p = ajouterAuPanier([], { code: "CIT-GO-008", quantite: 20, unite: "sac50" });
    p = ajouterAuPanier(p, { code: "CIT-GO-008", quantite: 10, unite: "sac50" });
    p = ajouterAuPanier(p, { code: "CIT-GO-011", quantite: 6, unite: "m3" });
    expect(p).toHaveLength(2);
    const d = construireDemande(p, "Salé");
    expect(d.region).toBe("rabat-sale-kenitra");
    expect(d.lignes[0]).toMatchObject({ quantite: 30, quantiteRef: 1500, uniteRef: "kg", estimationHT: 2400 });
    expect(d.estimationHT).toBe(2400 + 6 * prixReference("CIT-GO-011")!.ref);
    expect(resumeDemande(d)).toMatch(/Ciment CPJ 45 × 30 Sac 50 kg/);
    expect(JSON.stringify(wizardDemande(d, 0)).length).toBeLessThan(16 * 1024);
  });
  it("lignes invalides écartées", () => {
    expect(normaliserLigne({ code: "CIT-ZZ-999", quantite: 1, unite: "u" })).toBeNull();
    expect(normaliserLigne({ code: "CIT-GO-008", quantite: 0, unite: "sac50" })).toBeNull();
    expect(normaliserLigne({ code: "CIT-GO-008", quantite: 2, unite: "inconnue" })!.unite).toBe("kg");
  });
});

describe("achat en ligne (phase 2, modèle)", () => {
  it("cycle de vie et totaux avec commission", () => {
    expect(peutPasser("BROUILLON", "PAYEE")).toBe(false);
    expect(peutPasser("PAYEE", "EN_PREPARATION")).toBe(true);
    const t = totaux([{ quantite: 10, prixUnitaireHT: 80, tvaPct: 20 }], 100, 4);
    expect(t).toEqual({ marchandisesHT: 800, totalHT: 900, totalTVA: 180, totalTTC: 1080, commissionHT: 32, margeHT: null });
    // Négoce : CITURBAREA vend en son nom, marge = ventes − achats, pas de commission
    const n = totaux([{ quantite: 10, prixUnitaireHT: 80, tvaPct: 20, prixAchatHT: 70 }], 0, 4, "NEGOCE");
    expect(n).toMatchObject({ marchandisesHT: 800, commissionHT: 0, margeHT: 100 });
  });
});

describe("produits fournisseurs (contrat catalogue)", () => {
  it("normalisation défensive et repli bilingue", async () => {
    const { normaliserProduits, texteLocal } = await import("../../features/materiaux/catalogueProduits");
    const l = normaliserProduits({ produits: [
      { id: "p1", codeReference: "CIT-GO-008", marque: "X", modele: null, designation: { fr: "Ciment", ar: "إسمنت" }, photoUrl: "javascript:alert(1)", prix: { mediane: 1.5, min: 1.4, max: 1.6, nbFournisseurs: 2 } },
      { id: "p2", codeReference: "pas-un-code", designation: { fr: "?" } },
      { id: "p3", codeReference: "CIT-GO-008", designation: { ar: "sans fr" } },
    ] });
    expect(l.map((p) => p.id)).toEqual(["p1"]);
    expect(l[0].photoUrl).toBeNull();
    expect(l[0].prix).toBeNull();
    expect(texteLocal(l[0].designation, "ar")).toBe("إسمنت");
    expect(texteLocal(l[0].designation, "en")).toBe("Ciment");
    expect(normaliserProduits("<html>")).toEqual([]);
  });
});
