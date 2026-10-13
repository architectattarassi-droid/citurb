/**
 * « Tout passe par CITURBAREA » : aucune coordonnée d'un pro dans les lectures
 * publiques ; détection (téléphones, e-mails, liens, messageries) avec
 * signalement à l'admin et masquage à la publication.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  annuaire, catalogueFournisseur, catalogueFournisseurs, catalogueProduits, catalogueServices, enregistrerProduit, enregistrerService, fichePro,
  modererProduit, modererService,
} from "../../../../../functions/_lib/catalogue";
import { reinitialiserLimites } from "../../../../../functions/_lib/cercles";
import { detecterCoordonnees, masquerCoordonnees, MASQUE } from "../../../../../functions/_lib/coordonnees";
import { inscrire, listerPourAdmin, majProfil, modererFournisseur, moi } from "../../../../../functions/_lib/fournisseurs";
import { versBase64 } from "../../../../../functions/_lib/images";
import { deposerImage, modererImage } from "../../../../../functions/_lib/imagesCatalogue";
import { depotMemoire } from "../../../../../tests/functions/depotMemoire";

type J = Record<string, unknown>;
const json = (r: { json: unknown }) => r.json as J;
let ip = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.6.0.${++ip}` });
afterEach(() => reinitialiserLimites());

describe("détection", () => {
  it.each([
    "Appelez le 06 12 34 56 78", "tél : 0612345678", "+212 6 61 22 33 44", "00212661223344", "WhatsApp 0661-22-33-44",
    "واتساب ٠٦٦١٢٢٣٣٤٤", "contact@negoce-exemple.ma", "contact (at) negoce (dot) ma", "www.negoce-exemple.ma", "https://exemple.com/prix",
    "negoce-exemple.ma", "wa.me/212661223344", "suivez-nous sur instagram", "t.me/negoce",
  ])("détecte : %s", (t) => {
    expect(detecterCoordonnees(t).length).toBeGreaterThan(0);
    expect(masquerCoordonnees(t)).toContain(MASQUE);
  });
  it.each([
    "Carrelage grès cérame 60×60 rectifié", "Norme NM 10.1.004, classe CPJ 45", "Prix 1 250 DH le m²", "Béton B25, livraison en 48 h",
    "Agglo 20×20×40, 7 MPa", "Depuis 1998 à Fès", "زليج فاسي 10×10", "Sac de 50 kg, palette de 40 sacs",
  ])("ne touche pas : %s", (t) => {
    expect(detecterCoordonnees(t)).toEqual([]);
    expect(masquerCoordonnees(t)).toBe(t);
  });
});

async function pro(m: ReturnType<typeof depotMemoire>, n: number, metier = "FOURNISSEUR_MATERIAUX") {
  const email = `coord${n}@exemple.invalid`;
  await inscrire({ metier, raisonSociale: `Négoce Atlas ${n}`, ville: "Rabat", telephone: "0677889900", email, ice: "001234567000089",
    siteWeb: "https://negoce-atlas.ma", accepteConditions: true }, entetes(), m.depot, {});
  const f = [...m.fournisseurs.values()].find((x) => x.email === email)!;
  await modererFournisseur(String(f.id), { statut: "APPROVED" }, "admin@test", m.depot);
  return String(f.id);
}

describe("fiches et lectures publiques", () => {
  it("produit avec un numéro : signalé (en vérification), masqué au public, brut pour le pro", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 1);
    const r = json(await enregistrerProduit(fid, null, { famille: "CIMENT_LIANT", designationFr: "Ciment CPJ 45", descriptionFr: "Livraison rapide, appelez le 06 12 34 56 78",
      uniteRef: "kg", uniteVente: "Sac 50 kg", facteur: 50, prixHT: 78 }, m.depot));
    expect(r).toMatchObject({ avertissement: "coordonnees", champs: ["descriptionFr"] });
    expect(r.produit).toMatchObject({ statut: "PENDING", signalement: "COORDONNEES", descriptionFr: "Livraison rapide, appelez le 06 12 34 56 78" });
    // L'admin approuve quand même (texte jugé acceptable) : le public ne voit jamais le numéro.
    await modererProduit(String((r.produit as J).id), { action: "APPROUVER", materiauCode: "CIT-GO-008" }, "admin@test", m.depot);
    const cat = JSON.stringify(json(await catalogueProduits(new URLSearchParams(""), m.depot)));
    expect(cat).not.toMatch(/06 12 34 56 78|0612345678/);
    expect(cat).toContain("coordonnées masquées");
    const slug = String(m.fournisseurs.get(fid)!.slug);
    expect(JSON.stringify(json(await fichePro(slug, m.depot)))).not.toMatch(/06 12 34 56 78/);
    expect(JSON.stringify(json(await moi(fid, m.depot)))).toContain("06 12 34 56 78");
  });

  it("prestation avec e-mail dans les conditions : signalée et masquée", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 2, "ARTISAN_QUALIFIE");
    const r = json(await enregistrerService(fid, null, { nature: "POSE", ouvrageCode: "RSO.02", prixHT: 60, conditions: "Devis à artisan@exemple.ma" }, m.depot));
    expect(r.service).toMatchObject({ statut: "PENDING", signalement: "COORDONNEES" });
    await modererService(String((r.service as J).id), { action: "APPROUVER" }, "admin@test", m.depot);
    expect(JSON.stringify(json(await catalogueServices(new URLSearchParams(""), m.depot)))).not.toMatch(/artisan@exemple/);
  });

  it("fiche société : présentation, références et légendes masquées ; alerte côté admin ; aucune coordonnée d'inscription publiée", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 3);
    await majProfil(fid, { description: "Négoce depuis 1998, WhatsApp 0661223344", descriptionAr: "اتصلوا بنا على www.negoce-atlas.ma",
      fiche: { horaires: "Lun–Sam, tél 0537 11 22 33", references: [{ titre: "Villa à Salé", ville: "Salé", description: "Infos sur negoce-atlas.ma" }] } }, m.depot);
    const p = json(await enregistrerProduit(fid, null, { famille: "CIMENT_LIANT", designationFr: "Ciment CPJ 45", uniteRef: "kg", uniteVente: "Sac 50 kg", facteur: 50, prixHT: 78 }, m.depot)).produit as J;
    await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-GO-008" }, "admin@test", m.depot);
    const im = json(await deposerImage(fid, { objetType: "SOCIETE", objetId: fid, legendeFr: "Notre dépôt, appelez le 0661223344",
      image: versBase64(webpMinimal(800, 600)), vignette: versBase64(webpMinimal(400, 300)) }, m.depot)).image as J;
    await modererImage(String(im.id), { statut: "APPROVED" }, "admin@test", m.depot);

    const slug = String(m.fournisseurs.get(fid)!.slug);
    const publics = [
      await annuaire(new URLSearchParams(""), m.depot), await fichePro(slug, m.depot), await catalogueFournisseurs(new URLSearchParams(""), m.depot),
      await catalogueFournisseur(slug, m.depot), await catalogueProduits(new URLSearchParams(""), m.depot),
    ].map((r) => JSON.stringify(r.json));
    for (const t of publics) {
      expect(t).not.toMatch(/0677889900|0661223344|0537 11 22 33|coord3@exemple|001234567000089|negoce-atlas\.ma|"telephone"|"email"|"ice"|"siteWeb"|"contactNom"/);
    }
    expect(publics[1]).toContain("coordonnées masquées");
    const admin = (json(await listerPourAdmin(null, m.depot)).fournisseurs as J[])[0];
    expect(Object.keys(admin.alerteCoordonnees as J)).toEqual(expect.arrayContaining(["description", "descriptionAr", "fiche.horaires", "fiche.references.0.description"]));
    expect((json(await moi(fid, m.depot)).fournisseur as J).description).toBe("Négoce depuis 1998, WhatsApp 0661223344");
  });
});

/** WebP minimal valide (VP8X + VP8L) pour les dépôts d'image. */
function webpMinimal(l: number, h: number): Uint8Array {
  const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const w = l - 1, hh = h - 1;
  const morceau = (t: string, d: number[]) => [...enc(t), ...le32(d.length), ...d, ...(d.length & 1 ? [0] : [])];
  const corps = [...enc("WEBP"), ...morceau("VP8X", [0, 0, 0, 0, w & 0xff, (w >> 8) & 0xff, 0, hh & 0xff, (hh >> 8) & 0xff, 0]),
    ...morceau("VP8L", [0x2f, w & 0xff, ((w >> 8) & 0x3f) | ((hh & 3) << 6), (hh >> 2) & 0xff, (hh >> 10) & 0x0f, 1, 2, 3, 4, 5, 6, 7, 8])];
  return new Uint8Array([...enc("RIFF"), ...le32(corps.length), ...corps]);
}
