/**
 * Fiches Cercles : fiche société par métier (gabarit, champs privés), documents
 * vérifiés, score, fiches produit / service (validation, statut après mise à
 * jour), modération, annuaire, contact via la plateforme.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  annuaire, codesDuLot, contacter, enregistrerProduit, enregistrerService, modererProduit, prochainCode, produitsAModerer, servicesAModerer,
  supprimerProduit, validerProduit, validerService, referentiel,
} from "../../../../../functions/_lib/catalogue";
import { reinitialiserLimites } from "../../../../../functions/_lib/cercles";
import {
  ajouterDocument, inscrire, listerPourAdmin, majProfil, modererFournisseur, moi, validerFicheSociete, verifierDocument, vuePublique,
} from "../../../../../functions/_lib/fournisseurs";
import { depotMemoire } from "../../../../../tests/functions/depotMemoire";
import { CHAMPS_FICHE, TYPES_SOCIETE, champsDuType, scoreProfil } from "../../domain/cercles/gabarits";
import { CATEGORIES_L3, FAMILLES_L3, LOTS_L3, bilingue } from "../../domain/cercles/libelles";
import { FAMILLES_PRODUIT, PRESTATIONS } from "../../domain/cercles/offres";
import { CATALOGUE } from "../../domain/materiaux/catalogue";
import { CATEGORIES } from "../../domain/materiaux/types";
import { LOTS } from "../../domain/chiffrage/lots";
import { OUVRAGES } from "../../domain/chiffrage/ouvrages";

type J = Record<string, unknown>;
const json = (r: { json: unknown }) => r.json as J;
let ip = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.8.0.${++ip}` });
afterEach(() => reinitialiserLimites());

async function pro(m: ReturnType<typeof depotMemoire>, metier: string, n: number, valider = true) {
  const email = `fictif${n}@exemple.invalid`;
  await inscrire({ metier, raisonSociale: `Société Exemple ${n}`, ville: "Casablanca", telephone: "0698765432", email, accepteConditions: true }, entetes(), m.depot, {});
  const f = [...m.fournisseurs.values()].find((x) => x.email === email)!;
  if (valider) await modererFournisseur(String(f.id), { statut: "APPROVED" }, "admin@test", m.depot);
  return String(f.id);
}

describe("libellés et gabarits", () => {
  it("toutes les catégories, familles et lots sont traduits en arabe et en anglais", () => {
    for (const c of Object.keys(CATEGORIES)) expect(CATEGORIES_L3[c]?.ar, c).toBeTruthy();
    for (const f of new Set(CATALOGUE.map((m) => m.famille))) expect(FAMILLES_L3[f]?.ar, f).toBeTruthy();
    for (const l of LOTS) expect(LOTS_L3[l.code]?.ar, l.code).toBeTruthy();
    for (const t of Object.values(TYPES_SOCIETE)) expect(t.libelle.ar && t.libelle.en).toBeTruthy();
  });
  it("chaque type de société a des champs connus ; familles et prestations cohérentes", () => {
    for (const [k, t] of Object.entries(TYPES_SOCIETE)) {
      for (const c of t.champs) expect(CHAMPS_FICHE[c], `${k}.${c}`).toBeTruthy();
      expect(champsDuType(k).length).toBe(new Set(t.champs).size);
    }
    for (const f of Object.values(FAMILLES_PRODUIT)) expect(f.categorie in CATEGORIES).toBe(true);
    for (const p of Object.values(PRESTATIONS)) expect(p.libelle.ar).toBeTruthy();
  });
  it("bilingue : langue du visiteur, sinon l'autre", () => {
    expect(bilingue("Ciment", "إسمنت", "ar")).toEqual({ texte: "إسمنت", langue: "ar" });
    expect(bilingue("Ciment", "", "ar")).toEqual({ texte: "Ciment", langue: "fr" });
    expect(bilingue("", "إسمنت", "fr")).toEqual({ texte: "إسمنت", langue: "ar" });
    expect(bilingue("Ciment", "إسمنت", "en").texte).toBe("Ciment");
  });
});

describe("fiche société", () => {
  it("valide selon le métier : champs hors gabarit ignorés, types contrôlés", () => {
    const v = validerFicheSociete("ENTREPRISE_GO", { classeBTP: "5", agrements: ["A.1", "Z.9"], decennale: true, effectif: "6-20", essais: ["BETON"], references: [{ titre: "Villa R+1", ville: "Rabat", annee: 2025, client: "M. X", photos: ["https://exemple.invalid/a.jpg"] }] });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.valeur).toMatchObject({ classeBTP: "5", agrements: ["A.1"], decennale: true, effectif: "6-20" });
      expect(v.valeur.essais).toBeUndefined();
    }
    expect(validerFicheSociete("ENTREPRISE_GO", { classeBTP: "9" })).toMatchObject({ ok: false, champ: "classeBTP" });
    expect(validerFicheSociete("ENTREPRISE_GO", { references: [{ titre: "x", photos: ["http://non-securise"] }] }).ok).toBe(false);
    expect(validerFicheSociete("LABORATOIRE", { essais: ["BETON", "SOLS"] })).toMatchObject({ ok: true, valeur: { essais: ["BETON", "SOLS"] } });
  });

  it("mise à jour du profil bilingue ; vue publique sans RC, client ni documents", async () => {
    const m = depotMemoire();
    const id = await pro(m, "FOURNISSEUR_MATERIAUX", 1);
    const r = await majProfil(id, { raisonSocialeAr: "شركة تجريبية", descriptionAr: "تاجر مواد البناء", fiche: { rc: "12345", marques: ["Holcim", "Holcim", "LafargeHolcim"], horaires: "Lun–Sam 8 h–18 h", references: [{ titre: "Immeuble R+4", ville: "Salé", client: "Promoteur Y" }] } }, m.depot);
    expect(r.status).toBe(200);
    const f = m.fournisseurs.get(id)!;
    const pub = vuePublique(f);
    expect(pub.raisonSocialeAr).toBe("شركة تجريبية");
    expect(pub.fiche.marques).toEqual(["Holcim", "LafargeHolcim"]);
    expect(pub.fiche.rc).toBeUndefined();
    expect(JSON.stringify(pub)).not.toMatch(/Promoteur Y|12345|0698765432|exemple\.invalid|"documents":/);
  });

  it("documents : dépôt, vérification admin, badge et score", async () => {
    const m = depotMemoire();
    const id = await pro(m, "FOURNISSEUR_MATERIAUX", 2);
    expect((await ajouterDocument(id, { type: "INCONNU", url: "https://x.invalid/a.pdf" }, m.depot)).status).toBe(400);
    expect((await ajouterDocument(id, { type: "RC", url: "http://x.invalid/a.pdf" }, m.depot)).status).toBe(400);
    for (const type of ["RC", "ICE"]) expect((await ajouterDocument(id, { type, note: "Transmis par WhatsApp à l'équipe" }, m.depot)).status).toBe(200);
    const docs = (m.fournisseurs.get(id)!.documents as J[]);
    expect(vuePublique(m.fournisseurs.get(id)!).documentsVerifies).toBe(false);
    expect((await verifierDocument(id, String(docs[0].id), { statut: "REFUSE" }, "admin@test", m.depot)).status).toBe(400);
    for (const d of docs) expect((await verifierDocument(id, String(d.id), { statut: "VERIFIE" }, "admin@test", m.depot)).status).toBe(200);
    expect(vuePublique(m.fournisseurs.get(id)!).documentsVerifies).toBe(true);
    const admin = (json(await listerPourAdmin(null, m.depot)).fournisseurs as J[])[0];
    expect((admin.score as J).confiance).toBe(35);
    expect((admin.score as J).documentsManquants).toEqual([]);
  });

  it("score : complétude, confiance, activité", () => {
    const vide = scoreProfil({ metier: "TOPOGRAPHE", statut: "PENDING" }, { offresApprouvees: 0, plusRecente: null });
    expect(vide.total).toBeLessThan(15);
    expect(vide.documentsManquants).toEqual(["INSCRIPTION_ORDRE"]);
    const plein = scoreProfil({
      metier: "TOPOGRAPHE", statut: "APPROVED", description: "x", logoUrl: "https://l.invalid/l.png", zonesLivraison: ["national"],
      fiche: Object.fromEntries(champsDuType("TOPOGRAPHE").map((c) => [c.cle, c.type === "oui_non" ? false : c.type === "nombre" ? 1 : c.type === "texte" || c.type === "choix" ? "x" : ["x"]])),
      documents: [{ id: "d", type: "INSCRIPTION_ORDRE", url: null, note: "n", expireLe: null, statut: "VERIFIE", deposeLe: "", verifieLe: "", verifiePar: "a", motif: null }],
    }, { offresApprouvees: 2, plusRecente: new Date().toISOString() });
    expect(plein.total).toBe(100);
  });
});

describe("fiches produit et service", () => {
  it("validation produit : famille, désignation, conversion, photos, code proposé incompatible ignoré", () => {
    const codes = referentiel([]);
    expect(validerProduit({ famille: "INCONNUE" }, codes, null)).toMatchObject({ ok: false, error: "famille_invalide" });
    expect(validerProduit({ famille: "CIMENT_LIANT", designationFr: "x", prixHT: 80 }, codes, null)).toMatchObject({ ok: false, error: "designation_requise" });
    const v = validerProduit({ famille: "CIMENT_LIANT", designationAr: "إسمنت 45", uniteVente: "Sac 50 kg", facteur: 50, prixHT: 80, codePropose: "CIT-GO-024", photos: ["https://p.invalid/1.jpg"] }, codes, "rabat-sale-kenitra");
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.p).toMatchObject({ uniteRef: "kg", prixRefHT: 1.6, zones: ["rabat-sale-kenitra"], codePropose: "CIT-GO-024", categorie: "GROS_OEUVRE" });
    }
    const m3 = validerProduit({ famille: "GRANULAT", designationFr: "Sable 0/4", prixHT: 200, codePropose: "CIT-GO-008" }, codes, null);
    expect(m3.ok && m3.p.codePropose).toBe(null);
    expect(validerProduit({ famille: "AUTRE", designationFr: "Produit", prixHT: 10, photos: ["javascript:alert(1)"] }, codes, null).ok).toBe(false);
  });

  it("validation service : ouvrage (unité imposée), prestation, libre", () => {
    expect(validerService({ nature: "POSE", ouvrageCode: "X.ACIER", prixHT: 5 })).toMatchObject({ ok: false, error: "ouvrage_inconnu" });
    expect(validerService({ nature: "ETUDE", ouvrageCode: "RSO.02", prixHT: 5 })).toMatchObject({ ok: false, error: "nature_invalide" });
    const s = validerService({ nature: "POSE", ouvrageCode: "MAC.01", prixHT: 60 });
    expect(s.ok && s.s.unite).toBe(OUVRAGES["MAC.01"].unite);
    const e = validerService({ prestationCode: "LEVE_TOPOGRAPHIQUE", prixHT: 3000 });
    expect(e.ok && [e.s.nature, e.s.unite]).toEqual(["TOPO", "ha"]);
    expect(validerService({ nature: "LOCATION", unite: "parsec", designationFr: "Location", prixHT: 1 })).toMatchObject({ ok: false, error: "unite_invalide" });
    const prixFou = validerService({ nature: "POSE", ouvrageCode: "RSO.02", prixHT: 10_000 });
    expect(prixFou.ok && prixFou.s.signalement).toBe("ABERRANT_HAUT");
  });

  it("produit approuvé : reste approuvé si seul le prix change, repasse en vérification si l'identité change", async () => {
    const m = depotMemoire();
    const id = await pro(m, "FABRICANT", 3);
    const base = { famille: "BLOC_BRIQUE", designationFr: "Agglo creux 20×20×40 TEST", uniteRef: "u", prixHT: 7, caracteristiques: { type: "AGGLO_CREUX", dimensions: "20×20×40" } };
    const p = json(await enregistrerProduit(id, null, base, m.depot)).produit as J;
    await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-GO-003" }, "admin@test", m.depot);
    const r1 = json(await enregistrerProduit(id, String(p.id), { ...base, prixHT: 7.2 }, m.depot)).produit as J;
    expect(r1).toMatchObject({ statut: "APPROVED", materiauCode: "CIT-GO-003" });
    const r2 = json(await enregistrerProduit(id, String(p.id), { ...base, designationFr: "Autre produit TEST" }, m.depot)).produit as J;
    expect(r2).toMatchObject({ statut: "PENDING", materiauCode: null });
    // Un autre fournisseur ne peut ni modifier ni supprimer ce produit.
    const autre = await pro(m, "FABRICANT", 4);
    expect((await enregistrerProduit(autre, String(p.id), base, m.depot)).status).toBe(404);
    expect((await supprimerProduit(autre, String(p.id), m.depot)).status).toBe(404);
  });

  it("modération : unité incompatible refusée sans facteur ; rejet motivé ; listes admin", async () => {
    const m = depotMemoire();
    const id = await pro(m, "FOURNISSEUR_MATERIAUX", 5);
    const p = json(await enregistrerProduit(id, null, { famille: "CIMENT_LIANT", designationFr: "Ciment CPJ45 TEST", uniteRef: "u", uniteVente: "Sac", prixHT: 78 }, m.depot)).produit as J;
    expect(json(await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-GO-008" }, "admin@test", m.depot)).error).toBe("unite_incompatible");
    const ok = json(await modererProduit(String(p.id), { action: "APPROUVER", materiauCode: "CIT-GO-008", facteur: 50 }, "admin@test", m.depot)).produit as J;
    expect(ok).toMatchObject({ statut: "APPROVED", uniteRef: "kg", prixRefHT: 1.56 });
    expect((await modererProduit(String(p.id), { action: "REJETER" }, "admin@test", m.depot)).status).toBe(400);
    expect((json(await produitsAModerer("APPROVED", m.depot)).produits as J[]).length).toBe(1);
    expect((json(await servicesAModerer(null, m.depot)).services as J[]).length).toBe(0);
    expect(json(await enregistrerProduit(await pro(m, "BET_STRUCTURE", 6), null, { famille: "AUTRE" }, m.depot)).error).toBe("metier_sans_produits");
  });

  it("codes créés : plage 901 et suivants, par préfixe", () => {
    expect(prochainCode("REVETEMENT", ["CIT-REV-027", "CIT-REV-901"])).toBe("CIT-REV-902");
    expect(prochainCode("VRD", [])).toBe("CIT-VRD-901");
    expect(prochainCode("INCONNUE", [])).toBeNull();
  });
});

describe("annuaire et contact", () => {
  it("annuaire : pros vérifiés, filtres métier / région / codes / lot, sans coordonnées", async () => {
    const m = depotMemoire();
    const a = await pro(m, "ARTISAN_QUALIFIE", 7);
    await pro(m, "LABORATOIRE", 8);
    await pro(m, "TOPOGRAPHE", 9, false);
    const s = json(await enregistrerService(a, null, { nature: "POSE", ouvrageCode: "RSO.02", prixHT: 60 }, m.depot)).service as J;
    const { modererService } = await import("../../../../../functions/_lib/catalogue");
    await modererService(String(s.id), { action: "APPROUVER" }, "admin@test", m.depot);
    expect(json(await annuaire(new URLSearchParams(""), m.depot)).total).toBe(2);
    expect(json(await annuaire(new URLSearchParams("metier=LABORATOIRE"), m.depot)).total).toBe(1);
    expect(json(await annuaire(new URLSearchParams("groupe=ETUDES"), m.depot)).total).toBe(1);
    expect(json(await annuaire(new URLSearchParams("region=Agadir"), m.depot)).total).toBe(0);
    const parLot = json(await annuaire(new URLSearchParams("lot=RSO"), m.depot));
    expect(parLot.total).toBe(1);
    expect((parLot.fournisseurs as J[])[0].codesCouverts).toEqual(["RSO.02"]);
    expect(JSON.stringify(json(await annuaire(new URLSearchParams(""), m.depot)))).not.toMatch(/0698765432|exemple\.invalid/);
    expect(codesDuLot("LOT_02_GO_BETON").has("CIT-GO-008")).toBe(true);
  });

  it("contact : lead créé via la plateforme, pro non vérifié refusé, pot de miel silencieux", async () => {
    const m = depotMemoire();
    const id = await pro(m, "FOURNISSEUR_MATERIAUX", 10);
    const slug = String(m.fournisseurs.get(id)!.slug);
    const corps = { slug, nom: "Client Fictif", telephone: "0611223344", message: "Bonjour, un devis pour 40 m² de carrelage svp.", lang: "ar", objet: { type: "produit", id: "prd_x", libelle: "Carrelage" } };
    const r = await contacter(corps, entetes(), m.depot, {});
    expect(r.status).toBe(201);
    expect(JSON.stringify(r.json)).not.toMatch(/0698765432|exemple\.invalid/);
    expect(m.leads).toHaveLength(1);
    expect(m.leads[0]).toMatchObject({ lang: "ar", pageContext: `/cercles/pro/${slug}` });
    expect((await contacter({ ...corps, website: "spam" }, entetes(), m.depot, {})).status).toBe(201);
    expect(m.leads).toHaveLength(1);
    const enAttente = await pro(m, "FOURNISSEUR_MATERIAUX", 11, false);
    expect((await contacter({ ...corps, slug: String(m.fournisseurs.get(enAttente)!.slug) }, entetes(), m.depot, {})).status).toBe(404);
  });

  it("espace : moi renvoie produits, services et score", async () => {
    const m = depotMemoire();
    const id = await pro(m, "ENTREPRISE_SECOND_OEUVRE", 12);
    await enregistrerService(id, null, { prestationCode: "NETTOYAGE_FIN_CHANTIER", prixHT: 8 }, m.depot);
    const r = json(await moi(id, m.depot));
    expect((r.services as J[]).length).toBe(1);
    expect((r.produits as J[]).length).toBe(0);
    expect(typeof (r.score as J).total).toBe("number");
  });
});
