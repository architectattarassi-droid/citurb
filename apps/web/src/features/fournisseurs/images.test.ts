/**
 * Images du catalogue Cercles : type réel, métadonnées EXIF retirées, plafonds,
 * quotas, aucune image publique avant approbation ; navigation par fournisseur.
 */
import { afterEach, describe, expect, it } from "vitest";
import { catalogueFournisseur, catalogueFournisseurs, catalogueProduits, enregistrerProduit, fichePro, modererProduit } from "../../../../../functions/_lib/catalogue";
import { reinitialiserLimites } from "../../../../../functions/_lib/cercles";
import { inscrire, modererFournisseur } from "../../../../../functions/_lib/fournisseurs";
import { aDesMetadonnees, dimensions, IMAGES_PAR_OBJET, sansMetadonnees, typeImage, validerImage, versBase64 } from "../../../../../functions/_lib/images";
import { deposerImage, majImage, modererImage, octetsProprietaire, reponseImage, supprimerImage } from "../../../../../functions/_lib/imagesCatalogue";
import { depotMemoire } from "../../../../../tests/functions/depotMemoire";

type J = Record<string, unknown>;
const json = (r: { json: unknown }) => r.json as J;
const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
const morceau = (type: string, data: number[]) => [...enc(type), ...le32(data.length), ...data, ...(data.length & 1 ? [0] : [])];

/** WebP minimal (VP8X + VP8L) de l×h avec un morceau EXIF (coordonnées GPS fictives). */
function webp(l: number, h: number, exif = true, remplissage = 0): Uint8Array {
  const w = l - 1, hh = h - 1;
  const vp8x = [exif ? 0x08 : 0, 0, 0, 0, w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, hh & 0xff, (hh >> 8) & 0xff, (hh >> 16) & 0xff];
  const vp8l = [0x2f, w & 0xff, ((w >> 8) & 0x3f) | ((hh & 0x3) << 6), (hh >> 2) & 0xff, (hh >> 10) & 0x0f, ...new Array(8 + remplissage).fill(7)];
  const corps = [...enc("WEBP"), ...morceau("VP8X", vp8x), ...morceau("VP8L", vp8l), ...(exif ? morceau("EXIF", enc("Exif\0\0GPS 34.02N 6.84W")) : [])];
  return new Uint8Array([...enc("RIFF"), ...le32(corps.length), ...corps]);
}
/** JPEG minimal : APP1 EXIF, SOF0 l×h, SOS, données, EOI. */
function jpeg(l: number, h: number): Uint8Array {
  const app1 = enc("Exif\0\0GPS 33.57N 7.58W");
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, app1.length + 2, ...app1, 0xff, 0xc0, 0, 11, 8, h >> 8, h & 0xff, l >> 8, l & 0xff, 1, 1, 0x11, 0,
    0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 1, 2, 3, 4, 0xff, 0xd9]);
}

let ip = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.7.0.${++ip}` });
afterEach(() => reinitialiserLimites());

async function pro(m: ReturnType<typeof depotMemoire>, n: number, fictif = false) {
  const email = `img${n}@exemple.invalid`;
  await inscrire({ metier: "FABRICANT", raisonSociale: `${fictif ? "TEST " : ""}Céramique Exemple ${n}`, ville: "Fès", telephone: "0611112222", email, accepteConditions: true }, entetes(), m.depot, {});
  const f = [...m.fournisseurs.values()].find((x) => x.email === email)!;
  await modererFournisseur(String(f.id), { statut: "APPROVED" }, "admin@test", m.depot);
  return String(f.id);
}
const PRODUIT = { famille: "CARRELAGE", designationFr: "Zellige de Fès 10×10", designationAr: "زليج فاسي 10×10", marque: "Atelier Exemple", uniteRef: "m2", prixHT: 450 };
const image = () => ({ image: versBase64(webp(1600, 1200)), vignette: versBase64(webp(400, 300)) });

describe("contrôle des octets", () => {
  it("type réel par signature ; PNG, SVG, texte refusés", () => {
    expect(typeImage(webp(20, 20))).toBe("image/webp");
    expect(typeImage(jpeg(20, 20))).toBe("image/jpeg");
    expect(typeImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]))).toBeNull();
    expect(typeImage(new Uint8Array(enc("<svg onload=alert(1)>")))).toBeNull();
    expect(validerImage(new Uint8Array(enc("<?php echo 1; ?>")), 1e6, 2000)).toMatchObject({ ok: false, error: "image_type_invalide" });
  });
  it("EXIF / GPS retirés (WebP et JPEG), dimensions conservées", () => {
    for (const o of [webp(1600, 1200), jpeg(1600, 1200)]) {
      expect(aDesMetadonnees(o)).toBe(true);
      const p = sansMetadonnees(o)!;
      expect(aDesMetadonnees(p)).toBe(false);
      expect(String.fromCharCode(...p)).not.toContain("GPS");
      expect(dimensions(p)).toEqual({ largeur: 1600, hauteur: 1200 });
    }
    const p = sansMetadonnees(webp(800, 600))!;
    expect(p[20] & 0x08).toBe(0); // drapeau EXIF du VP8X retiré
    expect(p[4] | (p[5] << 8) | (p[6] << 16)).toBe(p.length - 8); // taille RIFF recalculée
  });
  it("plafonds de taille et de dimensions", () => {
    expect(validerImage(webp(1600, 1200), 10, 2000)).toMatchObject({ ok: false, error: "image_trop_lourde" });
    expect(validerImage(webp(3000, 1200), 1e6, 2000)).toMatchObject({ ok: false, error: "image_trop_grande" });
    expect(validerImage(webp(8, 8), 1e6, 2000)).toMatchObject({ ok: false, error: "image_illisible" });
    const ok = validerImage(webp(1600, 1200), 1e6, 2000);
    expect(ok.ok && aDesMetadonnees(ok.image.octets)).toBe(false);
  });
});

describe("cycle de vie d'une image", () => {
  it("dépôt en vérification, invisible du public ; visible après approbation de la fiche", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 1);
    const p = json(await enregistrerProduit(fid, null, PRODUIT, m.depot)).produit as J;
    const r = await deposerImage(fid, { objetType: "PRODUIT", objetId: p.id, legendeFr: "Pose en damier", legendeAr: "تركيب بالتناوب", ...image() }, m.depot);
    expect(r.status).toBe(201);
    const im = json(r).image as J;
    expect(im).toMatchObject({ statut: "PENDING", principale: true, legendeAr: "تركيب بالتناوب" });
    expect(String(im.id)).toMatch(/^img_[A-Za-z0-9_-]{22}$/);
    const stocke = m.images.get(String(im.id))!;
    expect(String(stocke.octets)).not.toContain(Array.from(new TextEncoder().encode("GPS"), (b) => b.toString(16).padStart(2, "0")).join(""));

    // Avant approbation : ni octets publics, ni image dans le catalogue ; le propriétaire voit son aperçu.
    expect(await m.depot.imOctetsPublics(String(im.id), false, false)).toBeNull();
    expect(await octetsProprietaire(fid, String(im.id), false, m.depot)).toBeTruthy();
    expect(await octetsProprietaire("frn_autre", String(im.id), false, m.depot)).toBeNull();
    expect(reponseImage(null, new Request("https://x"), true).status).toBe(404);

    // Approbation de la fiche : ses images en attente sont approuvées avec elle.
    const a = json(await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-MA-007" }, "admin@test", m.depot));
    expect(a.imagesApprouvees).toBe(1);
    const o = await m.depot.imOctetsPublics(String(im.id), true, false);
    expect(o?.type).toBe("image/webp");
    const rep = reponseImage(o, new Request("https://x"), true);
    expect(rep.headers.get("cache-control")).toContain("immutable");
    expect(reponseImage(o, new Request("https://x", { headers: { "if-none-match": `"${o!.empreinte}"` } }), true).status).toBe(304);
    const cat = json(await catalogueProduits(new URLSearchParams("code=CIT-MA-007"), m.depot));
    const v = (cat.produits as J[])[0];
    expect(v.photoUrl).toBe(`/api/catalogue/images/${im.id}?v=${o!.empreinte}`);
    expect((v.images as J[])[0]).toMatchObject({ principale: true, legende: { fr: "Pose en damier", ar: "تركيب بالتناوب" }, largeur: 1600, hauteur: 1200 });

    // Légende modifiée : repasse en vérification et disparaît du public.
    await majImage(fid, String(im.id), { legendeFr: "Autre légende" }, m.depot);
    expect(await m.depot.imOctetsPublics(String(im.id), false, false)).toBeNull();
    await modererImage(String(im.id), { statut: "APPROVED" }, "admin@test", m.depot);
    expect(await m.depot.imOctetsPublics(String(im.id), false, false)).toBeTruthy();

    // Image refusée (motif obligatoire) ; fiche archivée → image retirée du public.
    expect((await modererImage(String(im.id), { statut: "REJECTED" }, "admin@test", m.depot)).status).toBe(400);
    await modererProduit(String(p.id), { action: "ARCHIVER" }, "admin@test", m.depot);
    expect(await m.depot.imOctetsPublics(String(im.id), false, false)).toBeNull();
  });

  it("quotas, propriété, ordre et image principale", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 2), autre = await pro(m, 3);
    const p = json(await enregistrerProduit(fid, null, PRODUIT, m.depot)).produit as J;
    expect((await deposerImage(autre, { objetType: "PRODUIT", objetId: p.id, ...image() }, m.depot)).status).toBe(404);
    expect((await deposerImage(fid, { objetType: "AUTRE", objetId: p.id, ...image() }, m.depot)).status).toBe(400);
    expect(json(await deposerImage(fid, { objetType: "PRODUIT", objetId: p.id, image: versBase64(new Uint8Array(enc("<svg/>"))), vignette: image().vignette }, m.depot)).error).toBe("image_type_invalide");
    const ids: string[] = [];
    for (let i = 0; i < IMAGES_PAR_OBJET; i++) ids.push(String((json(await deposerImage(fid, { objetType: "PRODUIT", objetId: p.id, ...image() }, m.depot)).image as J).id));
    expect(json(await deposerImage(fid, { objetType: "PRODUIT", objetId: p.id, ...image() }, m.depot)).error).toBe("trop_d_images_fiche");
    // Principale : une seule ; retirer la principale promeut la suivante.
    await majImage(fid, ids[3], { principale: true }, m.depot);
    expect([...m.images.values()].filter((i) => i.principale).map((i) => i.id)).toEqual([ids[3]]);
    expect((await supprimerImage(autre, ids[3], m.depot)).status).toBe(404);
    await supprimerImage(fid, ids[3], m.depot);
    expect([...m.images.values()].filter((i) => i.principale)).toHaveLength(1);
    // Galerie société : quota par pro (poids total).
    const lourde = { image: versBase64(webp(1600, 1200, false, 380_000)), vignette: image().vignette };
    let erreur = "";
    for (let i = 0; i < 40 && !erreur; i++) erreur = String(json(await deposerImage(fid, { objetType: "SOCIETE", objetId: fid, ...lourde }, m.depot)).error || "");
    expect(["quota_images", "trop_d_images_fiche"]).toContain(erreur);
  });
});

describe("navigation par fournisseur", () => {
  it("liste des pros avec offres, familles, produits groupés par famille, galerie société ; fictifs exclus", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 4), fictif = await pro(m, 5, true);
    for (const id of [fid, fictif]) {
      const p = json(await enregistrerProduit(id, null, PRODUIT, m.depot)).produit as J;
      await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-MA-007" }, "admin@test", m.depot);
    }
    const s = json(await deposerImage(fid, { objetType: "SOCIETE", objetId: fid, ...image() }, m.depot)).image as J;
    await modererImage(String(s.id), { statut: "APPROVED" }, "admin@test", m.depot);

    const l = json(await catalogueFournisseurs(new URLSearchParams(""), m.depot));
    expect(l.total).toBe(1);
    const f = (l.fournisseurs as J[])[0];
    expect(f).toMatchObject({ nbProduits: 1, familles: [{ famille: "CARRELAGE", nb: 1 }] });
    expect(String(f.logoUrl)).toContain(String(s.id));
    expect(JSON.stringify(l)).not.toMatch(/0611112222|exemple\.invalid|"documents":|prixHT/);
    expect(json(await catalogueFournisseurs(new URLSearchParams(""), m.depot, { inclureFictifs: true })).total).toBe(2);

    const d = json(await catalogueFournisseur(String(f.slug), m.depot));
    expect((d.familles as J[])[0]).toMatchObject({ famille: "CARRELAGE", libelle: { ar: expect.any(String) } });
    expect(((d.familles as J[])[0].produits as J[])[0]).toMatchObject({ codeReference: "CIT-MA-007", designation: { ar: "زليج فاسي 10×10" }, prix: null });
    expect((d.fournisseur as J).images).toHaveLength(1);
    const slugFictif = String(m.fournisseurs.get(fictif)!.slug);
    expect((await catalogueFournisseur(slugFictif, m.depot)).status).toBe(404);
    expect((json(await fichePro(String(f.slug), m.depot)).imagesSociete as J[]).length).toBe(1);
  });
});
