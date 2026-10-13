/**
 * Test d'intégration de la chaîne « tout branché » (dépôt en mémoire, mêmes
 * fonctions que les Pages Functions) :
 *   inscription → validation du pro → fiche produit → modération (rattachement
 *   au référentiel) → visible dans GET /api/catalogue/produits (matériauthèque)
 *   → agrégée dans GET /api/prix/materiaux → utilisée par le calcul de prix
 *   d'un ouvrage ; idem pour les services (pose, fourni-posé) via
 *   GET /api/prix/ouvrages.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  catalogueProduits, enregistrerProduit, enregistrerService, fichePro, fichesMarcheProduits, modererProduit, modererService, prixOuvrages, referentielPublic,
} from "../../../../../functions/_lib/catalogue";
import { reinitialiserLimites } from "../../../../../functions/_lib/cercles";
import { inscrire, modererFournisseur } from "../../../../../functions/_lib/fournisseurs";
import { reponsePrix } from "../../../../../functions/_lib/prixMateriaux";
import { depotMemoire } from "../../../../../tests/functions/depotMemoire";
import { definirPrixMarche, prixOuvrage, type DonneesMarche } from "../../domain/chiffrage";
import { CORRESPONDANCE_CIT } from "../../domain/chiffrage/correspondanceCIT";

type J = Record<string, unknown>;
type Memoire = ReturnType<typeof depotMemoire>;
const json = (r: { json: unknown }) => r.json as J;
let ip = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.9.0.${++ip}` });

/** Même assemblage que GET /api/prix/materiaux : fiches de prix + fiches produit rattachées. */
async function prixMateriaux(region: string, codes: string[], depot: Memoire["depot"]) {
  const p = await fichesMarcheProduits(depot);
  return reponsePrix({ fiches: p.fiches, fournisseurs: null, manuels: {}, parents: p.parents }, region, codes) as unknown as J;
}

async function proValide(m: Memoire, n: number, metier = "FOURNISSEUR_MATERIAUX") {
  const email = `pro${n}.${metier.toLowerCase()}@exemple.invalid`;
  await inscrire({ metier, raisonSociale: `Négoce Atlas ${n}`, ville: "Rabat", telephone: "0612345678", email,
    accepteConditions: true, zonesLivraison: ["rabat-sale-kenitra"] }, entetes(), m.depot, {});
  const f = [...m.fournisseurs.values()].find((x) => x.email === email)!;
  await modererFournisseur(String(f.id), { statut: "APPROVED" }, "admin@test", m.depot);
  return String(f.id);
}

const CARREAU = {
  famille: "CARRELAGE", designationFr: "Grès cérame 60×60 poli", designationAr: "خزف حجري 60×60 مصقول", marque: "MarqueExemple", modele: "GC-6060",
  caracteristiques: { matiere: "GRES_CERAME", format: "60×60", epaisseurMm: 9, finition: "POLI", rectifie: true, inconnu: "ignoré" },
  uniteRef: "m2", uniteVente: "Carton de 1,44 m²", facteur: 1.44, gamme: "MOYEN", zones: ["rabat-sale-kenitra"], codePropose: "CIT-REV-020",
};

afterEach(() => { definirPrixMarche(null); reinitialiserLimites(); });

describe("chaîne produit → matériauthèque → prix marché → chiffrage", () => {
  it("un produit approuvé chez 3 fournisseurs remplace le prix de recherche dans l'ouvrage (fiabilité A)", async () => {
    const m = depotMemoire();
    const ids = [await proValide(m, 1), await proValide(m, 2), await proValide(m, 3)];
    // Prix au carton de 1,44 m² → 180, 187,2 et 201,6 DH/m²
    const prixCarton = [259.2, 269.57, 290.3];
    const produits: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await enregistrerProduit(ids[i], null, { ...CARREAU, prixHT: prixCarton[i] }, m.depot);
      expect(r.status).toBe(200);
      const p = json(r).produit as J;
      expect(p.statut).toBe("PENDING");
      expect(p.prixRefHT).toBeCloseTo(prixCarton[i] / 1.44, 2);
      expect(p.caracteristiques).toEqual({ matiere: "GRES_CERAME", format: "60×60", epaisseurMm: 9, finition: "POLI", rectifie: true });
      produits.push(String(p.id));
    }

    // Avant modération : rien dans le catalogue public, pas de marché.
    expect(json(await catalogueProduits(new URLSearchParams("region=Rabat"), m.depot)).total).toBe(0);
    expect(((await prixMateriaux("rabat-sale-kenitra", ["CIT-REV-020"], m.depot)).materiaux as J[])[0].marche).toBeNull();

    // Modération : rattachement au code du référentiel proposé.
    for (const id of produits) expect((await modererProduit(id, { action: "APPROUVER", materiauCode: "CIT-REV-020" }, "admin@test", m.depot)).status).toBe(200);

    // (a) Matériauthèque (contrat docs/architecture/contrat-catalogue.md) : une variante (même marque, même modèle)
    // proposée par 3 fournisseurs, bilingue, prix agrégé par m², ni coordonnées ni prix nominatif.
    const cat = json(await catalogueProduits(new URLSearchParams("region=Rabat&code=CIT-REV-020"), m.depot));
    expect(cat).toMatchObject({ disponible: true, total: 1 });
    const v = (cat.produits as J[])[0];
    expect(v).toMatchObject({ codeReference: "CIT-REV-020", marque: "MarqueExemple", nbFournisseurs: 3, designation: { fr: "Grès cérame 60×60 poli", ar: "خزف حجري 60×60 مصقول" } });
    expect(v.prix).toMatchObject({ mediane: 187.2, nbFournisseurs: 3 });
    expect((v.caracteristiques as J[]).find((c) => (c.libelle as J).fr === "Finition")).toMatchObject({ valeur: { fr: "Poli", ar: "مصقول" } });
    expect(v.conditionnements).toEqual([{ code: "carton-de-1-44-m", libelle: { fr: "Carton de 1,44 m²" }, facteur: 1.44 }]);
    expect(JSON.stringify(cat)).not.toMatch(/0612345678|exemple\.invalid|prixHT|259\.2/);
    // Hors zone de livraison : absent.
    expect(json(await catalogueProduits(new URLSearchParams("region=Agadir"), m.depot)).total).toBe(0);

    // (b) Prix marché par région : médiane des 3 offres, fiabilité A, retenu = fournisseurs.
    const pm = await prixMateriaux("rabat-sale-kenitra", ["CIT-REV-020"], m.depot);
    const ligne = (pm.materiaux as J[])[0];
    expect(ligne.marche).toMatchObject({ nbFournisseurs: 3, fiabilite: "A", mediane: 187.2 });
    expect(ligne.retenu).toMatchObject({ source: "fournisseurs", fiabilite: "A" });

    // (c) Chiffrage : RSO.02 (carrelage 60×60 collé) utilise CARREAU_60 → CIT-REV-020.
    expect(CORRESPONDANCE_CIT.CARREAU_60.cit).toBe("CIT-REV-020");
    const recherche = prixOuvrage("RSO.02");
    expect(recherche.sousDetail.find((l) => l.ref === "CARREAU_60")!.fiabilite).toBe("B");

    const donnees: DonneesMarche = { region: String(pm.region), genereLe: String(pm.genereLe), ouvrages: {},
      materiaux: Object.fromEntries((pm.materiaux as J[]).filter((x) => x.marche).map((x) => [String(x.code), x.marche as never])) };
    definirPrixMarche(donnees);
    const avecMarche = prixOuvrage("RSO.02");
    const l = avecMarche.sousDetail.find((x) => x.ref === "CARREAU_60")!;
    expect(l.fiabilite).toBe("A");
    expect(l.pu).toBeCloseTo(187.2, 1);
    expect(l.sourceIds).toEqual(["cercles-fournisseurs"]);
    expect(l.note).toMatch(/médiane de 3 fournisseurs/);
    expect(avecMarche.pu).not.toBeCloseTo(recherche.pu, 2);
    expect(avecMarche.partFiabilite.A).toBeGreaterThan(0);

    // Retrait des prix marché : retour au prix de recherche (cache invalidé).
    definirPrixMarche(null);
    expect(prixOuvrage("RSO.02").pu).toBeCloseTo(recherche.pu, 6);
  });

  it("moins de 3 fournisseurs : aucun prix publié (confidentialité), nombre d'offres à côté, prix de recherche conservé", async () => {
    const m = depotMemoire();
    const id = await proValide(m, 4);
    const r = json(await enregistrerProduit(id, null, { ...CARREAU, prixHT: 300 }, m.depot)).produit as J;
    await modererProduit(String(r.id), { action: "APPROUVER", materiauCode: "CIT-REV-020" }, "admin@test", m.depot);
    const ligne = ((await prixMateriaux("rabat-sale-kenitra", ["CIT-REV-020"], m.depot)).materiaux as J[])[0];
    expect(ligne.marche).toMatchObject({ mediane: null, fiabilite: null, nbFournisseurs: 1 });
    expect((ligne.retenu as J).source).toBe("recherche");
    expect(((json(await catalogueProduits(new URLSearchParams("code=CIT-REV-020"), m.depot)).produits as J[])[0]).prix).toBeNull();

    const recherche = prixOuvrage("RSO.02");
    definirPrixMarche({ region: "rabat-sale-kenitra", genereLe: "", ouvrages: {}, materiaux: { "CIT-REV-020": ligne.marche as never } });
    const p = prixOuvrage("RSO.02");
    const l = p.sousDetail.find((x) => x.ref === "CARREAU_60")!;
    expect(p.pu).toBeCloseTo(recherche.pu, 6);
    expect(l.fiabilite).toBe("B");
    expect(l.marche).toMatchObject({ applique: false, mediane: null, nbFournisseurs: 1 });
  });

  it("fournisseur fictif (données de test) : jamais publié, sauf en aperçu", async () => {
    const m = depotMemoire();
    await inscrire({ metier: "FOURNISSEUR_MATERIAUX", raisonSociale: "TEST Négoce fictif", ville: "Rabat", telephone: "0612345678", email: "fictif@exemple.invalid", accepteConditions: true }, entetes(), m.depot, {});
    const id = String([...m.fournisseurs.values()][0].id);
    await modererFournisseur(id, { statut: "APPROVED" }, "admin@test", m.depot);
    const p = json(await enregistrerProduit(id, null, { ...CARREAU, prixHT: 260 }, m.depot)).produit as J;
    await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-REV-020" }, "admin@test", m.depot);
    expect(json(await catalogueProduits(new URLSearchParams(""), m.depot)).total).toBe(0);
    expect(json(await catalogueProduits(new URLSearchParams(""), m.depot, { inclureFictifs: true })).total).toBe(1);
    expect((await fichesMarcheProduits(m.depot)).fiches).toHaveLength(0);
  });

  it("nouveau code créé à la modération (déclinaison) : publié bilingue, compte pour le code générique", async () => {
    const m = depotMemoire();
    const ids = [await proValide(m, 5), await proValide(m, 6), await proValide(m, 7)];
    let code = "";
    for (const [i, id] of ids.entries()) {
      const p = json(await enregistrerProduit(id, null, { ...CARREAU, codePropose: undefined, designationFr: "Grès cérame 60×60 effet marbre", prixHT: 280 + i * 10 }, m.depot)).produit as J;
      const r = json(await modererProduit(String(p.id), code ? { action: "APPROUVER", materiauCode: code }
        : { action: "APPROUVER", nouveauCode: { libelleFr: "Grès cérame 60×60 effet marbre", libelleAr: "خزف حجري 60×60 بمظهر الرخام", parent: "CIT-REV-020", lots: ["LOT_11_REVETEMENTS_SOLS"] } }, "admin@test", m.depot));
      if (!code) { code = String(r.codeCree); expect(code).toBe("CIT-REV-901"); }
    }
    const ref = json(await referentielPublic(m.depot));
    expect((ref.codes as J[])[0]).toMatchObject({ code: "CIT-REV-901", parent: "CIT-REV-020", libelle: { fr: "Grès cérame 60×60 effet marbre", ar: "خزف حجري 60×60 بمظهر الرخام" } });
    const pm = await prixMateriaux("rabat-sale-kenitra", ["CIT-REV-020"], m.depot);
    expect((pm.materiaux as J[])[0].marche).toMatchObject({ nbFournisseurs: 3, fiabilite: "A" });
    const cat = json(await catalogueProduits(new URLSearchParams("code=CIT-REV-020"), m.depot));
    expect((cat.produits as J[])[0]).toMatchObject({ codeReference: "CIT-REV-020", codeVariante: "CIT-REV-901", nbFournisseurs: 3 });
  });

  it("services : pose seule et fourni-posé de 3 pros remplacent la main-d'œuvre ou le prix de l'ouvrage", async () => {
    const m = depotMemoire();
    const ids = [await proValide(m, 8, "ARTISAN_QUALIFIE"), await proValide(m, 9, "ARTISAN_QUALIFIE"), await proValide(m, 10, "ARTISAN_QUALIFIE")];
    const poses = [55, 60, 70];
    for (const [i, id] of ids.entries()) {
      const s = json(await enregistrerService(id, null, { nature: "POSE", ouvrageCode: "RSO.02", prixHT: poses[i], designationAr: "تركيب البلاط 60×60" }, m.depot)).service as J;
      expect(s).toMatchObject({ statut: "PENDING", unite: "m²" });
      await modererService(String(s.id), { action: "APPROUVER" }, "admin@test", m.depot);
    }
    const po = json(await prixOuvrages(new URLSearchParams("region=Témara&codes=RSO.02"), m.depot));
    const o = (po.ouvrages as J[])[0];
    const pose = (o.marche as J).POSE as J;
    expect(pose).toMatchObject({ mediane: 60, nbFournisseurs: 3, fiabilite: "A" });
    expect(o.recherche).toBeTruthy();

    const recherche = prixOuvrage("RSO.02");
    definirPrixMarche({ region: "rabat-sale-kenitra", genereLe: "", materiaux: {}, ouvrages: { "RSO.02": { POSE: pose as never } } });
    const p = prixOuvrage("RSO.02");
    expect(p.repartition.mainOeuvre).toBe(60);
    expect(p.repartition.materiel).toBe(0);
    expect(p.repartition.materiaux).toBeCloseTo(recherche.repartition.materiaux, 6);
    expect(p.sousDetail.find((l) => l.ref === "POSE")?.fiabilite).toBe("A");

    // Fourni-posé : 3 entreprises → prix de vente de l'ouvrage remplacé.
    const ent = [await proValide(m, 11, "ENTREPRISE_SECOND_OEUVRE"), await proValide(m, 12, "ENTREPRISE_SECOND_OEUVRE"), await proValide(m, 13, "ENTREPRISE_SECOND_OEUVRE")];
    for (const [i, id] of ent.entries()) {
      const s = json(await enregistrerService(id, null, { nature: "FOURNI_POSE", ouvrageCode: "RSO.02", prixHT: 330 + i * 20 }, m.depot)).service as J;
      await modererService(String(s.id), { action: "APPROUVER" }, "admin@test", m.depot);
    }
    const po2 = json(await prixOuvrages(new URLSearchParams("region=rabat-sale-kenitra&codes=RSO.02"), m.depot));
    const fp = ((po2.ouvrages as J[])[0].marche as J).FOURNI_POSE as J;
    definirPrixMarche({ region: "rabat-sale-kenitra", genereLe: "", materiaux: {}, ouvrages: { "RSO.02": { FOURNI_POSE: fp as never } } });
    const p2 = prixOuvrage("RSO.02");
    expect(p2.pu).toBe(350);
    expect(p2.min).toBe(330);
    expect(p2.partFiabilite.A).toBe(1);

    // Fiche publique : services visibles, ni coordonnées ni prix nominatif.
    const slug = String(m.fournisseurs.get(ent[0])!.slug);
    const fp2 = json(await fichePro(slug, m.depot));
    expect((fp2.services as J[]).length).toBe(1);
    expect(JSON.stringify(fp2)).not.toMatch(/0612345678|exemple\.invalid|telephone|email|prixHT|330/);
  });
});
