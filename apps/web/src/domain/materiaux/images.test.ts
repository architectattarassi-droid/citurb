import { describe, expect, it } from "vitest";
import { imageReference, imageValide, toutesImagesReference } from "./images";
import { normaliserFournisseur, normaliserImages, normaliserProduitFournisseur } from "../../features/materiaux/fournisseursCatalogue";
import { normaliserProduits } from "../../features/materiaux/catalogueProduits";

describe("images de référence", () => {
  it("toute image du manifeste est hébergée par CITURBAREA et documente licence et source", () => {
    for (const [cle, i] of toutesImagesReference()) expect(imageValide(i), cle).toBe(true);
  });
  it("refuse une image externe ou sans licence ; repli sur l'icône (null)", () => {
    expect(imageValide({ url: "https://www.bricoma.ma/x.jpg", legende: { fr: "x" }, licence: "Pixabay", source: "https://pixabay.com/x" })).toBe(false);
    expect(imageValide({ url: "/materiaux/img/ciment.jpg", legende: { fr: "Ciment" }, licence: "", source: "https://pixabay.com/x" })).toBe(false);
    expect(imageValide({ url: "/materiaux/img/ciment.jpg", legende: { fr: "Ciment" }, licence: "Pixabay Content License", source: "https://pixabay.com/x" })).toBe(true);
    expect(imageReference("CIT-ZZ-999")).toBeNull();
  });
});

describe("galeries et fournisseurs (lectures publiques Cercles)", () => {
  it("images : https seulement, légendes FR/AR, photos et photoUrl repris, 12 au plus", () => {
    const l = normaliserImages({
      images: [{ url: "https://cdn.x/1.jpg", vignette: "https://cdn.x/1-v.jpg", legende: { fr: "Face", ar: "واجهة" } }, { url: "http://x/2.jpg" }, { url: "javascript:alert(1)" }],
      photos: ["https://cdn.x/3.jpg", "https://cdn.x/1.jpg"], photoUrl: "https://cdn.x/4.jpg",
    });
    expect(l.map((i) => i.url)).toEqual(["https://cdn.x/1.jpg", "https://cdn.x/3.jpg", "https://cdn.x/4.jpg"]);
    expect(l[0]).toMatchObject({ vignette: "https://cdn.x/1-v.jpg", legende: { fr: "Face", ar: "واجهة" } });
    expect(normaliserImages({ photos: Array.from({ length: 20 }, (_, i) => `https://c/${i}.jpg`) })).toHaveLength(12);
  });
  it("fournisseur : aucune coordonnée conservée, même renvoyée par erreur", () => {
    const f = normaliserFournisseur({ slug: "negoce-atlas-kenitra", raisonSociale: "Négoce Atlas", raisonSocialeAr: "أطلس", ville: "Kénitra", verifie: true,
      telephone: "0600000000", email: "a@b.ma", zonesLivraison: ["rabat-sale-kenitra"], nbProduits: 4 })!;
    expect(f).toMatchObject({ slug: "negoce-atlas-kenitra", nom: { fr: "Négoce Atlas", ar: "أطلس" }, verifie: true, nbProduits: 4 });
    expect(JSON.stringify(f)).not.toMatch(/0600000000|a@b\.ma/);
    expect(normaliserFournisseur({ slug: "../x", raisonSociale: "X" })).toBeNull();
  });
  it("produit d'un fournisseur et produit du catalogue : code CIT valide, fournisseurs listés sans coordonnées", () => {
    const p = normaliserProduitFournisseur({ id: "prd_1", designationFr: "Ciment CPJ 45", designationAr: "إسمنت", materiauCode: "CIT-GO-008", photos: ["https://c/1.jpg"], prixHT: 80 })!;
    expect(p).toMatchObject({ materiauCode: "CIT-GO-008", designation: { fr: "Ciment CPJ 45", ar: "إسمنت" } });
    expect(JSON.stringify(p)).not.toMatch(/prixHT/);
    const c = normaliserProduits({ produits: [{ id: "p", codeReference: "CIT-GO-008", designation: { fr: "Ciment" }, marque: "M", modele: null,
      fournisseurs: [{ slug: "atlas", nom: { fr: "Atlas" }, ville: "Rabat", documentsVerifies: true, telephone: "06" }, { slug: "x y", nom: { fr: "?" } }] }] });
    expect(c[0].fournisseurs).toEqual([{ slug: "atlas", nom: { fr: "Atlas" }, ville: "Rabat", documentsVerifies: true }]);
  });
});
