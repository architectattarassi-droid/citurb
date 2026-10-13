/**
 * Catalogue Cercles — une seule source de vérité pour les offres des pros :
 *   - fiches PRODUIT (matériaux, équipements) listées par les fournisseurs ;
 *   - fiches SERVICE (pose, fourni-posé, études, essais, topographie…) ;
 *   - codes du référentiel créés à la modération (CIT-<PFX>-9NN) ;
 *   - lectures publiques : catalogue, prix marché par code et par région
 *     (matériaux, ouvrages), annuaire, fiche publique d'un pro ;
 *   - contact via la plateforme (lead), jamais de coordonnées publiées.
 * Contrat d'interface : docs/architecture/contrat-catalogue.md.
 *
 * Indépendante du runtime : chaque fonction reçoit un dépôt et renvoie une
 * `Reponse` (tests : apps/web/src/features/fournisseurs/catalogue*.test.ts).
 */
import { CATALOGUE, CATALOGUE_VERSION, materiau } from "../../apps/web/src/domain/materiaux/catalogue";
import { ecartReference } from "../../apps/web/src/domain/materiaux/conversions";
import { agregerMarche, livreRegion, type FicheMarche } from "../../apps/web/src/domain/materiaux/marche";
import { regionDe } from "../../apps/web/src/domain/materiaux/regions";
import { CATEGORIES, UNITES_REF } from "../../apps/web/src/domain/materiaux/types";
import { TYPES_SOCIETE, libelleMetier } from "../../apps/web/src/domain/cercles/gabarits";
import { FAMILLES_PRODUIT, GAMMES, NATURES_SERVICE, PRESTATIONS, UNITES_SERVICE } from "../../apps/web/src/domain/cercles/offres";
import { LOT_PAR_CODE, type CodeLot } from "../../apps/web/src/domain/chiffrage/lots";
import { OUVRAGES } from "../../apps/web/src/domain/chiffrage/ouvrages";
import { coefK, prixOuvrage } from "../../apps/web/src/domain/chiffrage/prix";
import {
  accepter, clip, destinatairesAdmin, echapperHtml, envoyerEmail, erreur, ipDe, maintenantIso, nombre, nouvelId, RE_EMAIL, slugifier,
  telephone, urlHttps, type EnvCercles, type Reponse,
} from "./cercles";
import type { DepotCatalogue, ProduitEcrit, ServiceEcrit } from "./catalogueDepot";
import {
  fournisseurResume, vueProduitAdmin, vueProduitProprietaire, vueProduitPublique, vueServiceAdmin, vueServiceProprietaire, vueServicePublique,
} from "./catalogueVues";
import { DISPONIBILITES, METIERS_AVEC_FICHES, TAUX_TVA, iso, jour, jsonObj, liste, vueFiche, vuePublique, zonesValides } from "./fournisseurs";
import type { Depot, Ligne } from "./fournisseursDepot";
import { coordonneesDans, masquerCoordonnees as m_ } from "./coordonnees";
import { imagesParObjet, vueImagePublique } from "./imagesCatalogue";
import type { DepotImages } from "./imagesDepot";

type DepotC = Depot & DepotCatalogue & DepotImages;
const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const STATUTS_OFFRE = ["PENDING", "APPROVED", "REJECTED", "ARCHIVED"];
export const PRODUITS_MAX = 500;
export const SERVICES_MAX = 200;
export const PHOTOS_MAX = 8;
const arrondi4 = (x: number) => Math.round(x * 10_000) / 10_000;
const accesOuvert = (f: Ligne | null): f is Ligne => !!f && (f.statut === "PENDING" || f.statut === "APPROVED");
const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ───────────────────────── référentiel (statique + codes créés) ─────────────────────────

/** Préfixes des codes CIT par catégorie (domain/materiaux/catalogue.ts). */
export const PREFIXES: Record<string, string> = {
  GROS_OEUVRE: "GO", ETANCHEITE: "ET", ISOLATION: "IS", VRD: "VRD", ELECTRICITE: "EL", PLOMBERIE: "PL", CVC: "CVC",
  STRUCTURE_METALLIQUE: "SM", MENUISERIE_ALU: "AL", MENUISERIE_BOIS: "MB", FAUX_PLAFOND: "FP", REVETEMENT: "REV",
  MARBRERIE: "MA", PEINTURE: "PE", QUINCAILLERIE: "QU",
};
/** Les codes créés à la modération commencent à 901 : la numérotation du catalogue statique reste libre en dessous. */
export const DEBUT_CODES_CREES = 901;

export interface CodeRef {
  code: string; libelleFr: string; libelleAr: string | null; libelleEn: string | null; categorie: string; famille: string;
  uniteRef: string; parent: string | null; lots: string[]; gamme: string | null; dynamique: boolean;
  recherche: { min: number; ref: number; max: number; fiabilite: "B" | "C" } | null;
}

export function referentiel(dynamiques: Ligne[]): Map<string, CodeRef> {
  const m = new Map<string, CodeRef>();
  for (const r of CATALOGUE) {
    if (r.actif === false) continue;
    m.set(r.code, {
      code: r.code, libelleFr: r.libelle, libelleAr: null, libelleEn: null, categorie: r.categorie, famille: r.famille, uniteRef: r.uniteRef,
      parent: r.parent ?? null, lots: r.lots, gamme: null, dynamique: false,
      recherche: { min: r.prix.min, ref: r.prix.ref, max: r.prix.max, fiabilite: r.prix.fiabilite },
    });
  }
  for (const d of dynamiques) {
    if (d.actif === false || m.has(String(d.code))) continue;
    m.set(String(d.code), {
      code: String(d.code), libelleFr: String(d.libelleFr), libelleAr: (d.libelleAr as string) || null, libelleEn: (d.libelleEn as string) || null,
      categorie: String(d.categorie), famille: String(d.famille), uniteRef: String(d.uniteRef), parent: (d.parent as string) || null,
      lots: liste(d.lots), gamme: (d.gamme as string) || null, dynamique: true, recherche: null,
    });
  }
  return m;
}

/** Prochain code libre d'une catégorie dans la plage des codes créés (CIT-REV-901, 902…). */
export function prochainCode(categorie: string, existants: Iterable<string>): string | null {
  const pfx = PREFIXES[categorie];
  if (!pfx) return null;
  let n = DEBUT_CODES_CREES - 1;
  const re = new RegExp(`^CIT-${pfx}-(\\d+)$`);
  for (const c of existants) { const x = re.exec(c); if (x && Number(x[1]) > n) n = Number(x[1]); }
  return `CIT-${pfx}-${String(n + 1).padStart(3, "0")}`;
}

// ───────────────────────── validation commune ─────────────────────────

function validite(v: unknown): string | null | false {
  let s = clip(v, 10);
  const j0 = aujourdhui();
  if (!s) s = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
  if (!ISO_JOUR.test(s) || Number.isNaN(Date.parse(s)) || s < j0) return false;
  if (Date.parse(s) - Date.now() > 400 * 86400_000) return false;
  return s;
}

function degressifs(v: unknown, prixHT: number): { aPartirDe: number; prixHT: number }[] | false {
  const out: { aPartirDe: number; prixHT: number }[] = [];
  for (const d of Array.isArray(v) ? v.slice(0, 5) : []) {
    const q = nombre(jsonObj(d).aPartirDe), p = nombre(jsonObj(d).prixHT);
    if (q === null || p === null || q <= 0 || p <= 0 || p > prixHT) return false;
    out.push({ aPartirDe: q, prixHT: p });
  }
  out.sort((a, b) => a.aPartirDe - b.aPartirDe);
  for (let i = 1; i < out.length; i++) if (out[i].prixHT > out[i - 1].prixHT) return false;
  return out;
}

function photos(v: unknown): string[] | false {
  const l = liste(v).slice(0, PHOTOS_MAX).map((u) => urlHttps(u));
  return l.some((u) => !u) ? false : (l as string[]);
}

const tva = (v: unknown): number | null => {
  const t = v === undefined || v === "" || v === null ? 20 : nombre(v);
  return t !== null && TAUX_TVA.includes(t) ? t : null;
};

// ───────────────────────── fiches produit ─────────────────────────

type ProduitValide = Omit<ProduitEcrit, "id" | "fournisseurId" | "slug" | "statut" | "materiauCode" | "motifRejet">;

/** Valide une fiche produit saisie par un fournisseur. `codes` : référentiel courant (statique + créés). */
export function validerProduit(b: Ligne, codes: Map<string, CodeRef>, regionSiege: string | null): { ok: true; p: ProduitValide } | { ok: false; error: string } {
  const famille = clip(b.famille, 40);
  const fam = FAMILLES_PRODUIT[famille];
  if (!fam) return { ok: false, error: "famille_invalide" };
  const categorie = clip(b.categorie, 40) || fam.categorie;
  if (!(categorie in CATEGORIES)) return { ok: false, error: "categorie_invalide" };
  const designationFr = clip(b.designationFr, 140) || null, designationAr = clip(b.designationAr, 140) || null;
  if ((designationFr || "").length < 3 && (designationAr || "").length < 3) return { ok: false, error: "designation_requise" };
  const gamme = clip(b.gamme, 10) || null;
  if (gamme && !(gamme in GAMMES)) return { ok: false, error: "gamme_invalide" };

  const car: Ligne = {};
  const brut = jsonObj(b.caracteristiques);
  for (const c of fam.champs) {
    const x = brut[c.cle];
    if (x === undefined || x === null || x === "") continue;
    if (c.type === "nombre") { const n = nombre(x); if (n === null || n < 0 || n > 1e7) return { ok: false, error: "caracteristique_invalide" }; car[c.cle] = n; }
    else if (c.type === "choix") { if (!c.options?.some(([k]) => k === String(x))) return { ok: false, error: "caracteristique_invalide" }; car[c.cle] = String(x); }
    else if (c.type === "oui_non") { if (typeof x === "boolean") car[c.cle] = x; }
    else car[c.cle] = clip(x, 120);
  }

  const uniteRef = clip(b.uniteRef, 10) || fam.uniteRef;
  if (!(uniteRef in UNITES_REF)) return { ok: false, error: "unite_invalide" };
  const uniteVente = clip(b.uniteVente, 60) || UNITES_REF[uniteRef as keyof typeof UNITES_REF];
  const facteur = b.facteur === undefined || b.facteur === "" ? 1 : nombre(b.facteur);
  if (facteur === null || facteur <= 0 || facteur > 1e6) return { ok: false, error: "facteur_invalide" };
  const prixHT = nombre(b.prixHT);
  if (prixHT === null || prixHT <= 0 || prixHT > 10_000_000) return { ok: false, error: "prix_invalide" };
  const tvaPct = tva(b.tvaPct);
  if (tvaPct === null) return { ok: false, error: "tva_invalide" };
  const quantiteMin = nombre(b.quantiteMin);
  if (quantiteMin !== null && (quantiteMin < 0 || quantiteMin > 1e7)) return { ok: false, error: "quantite_min_invalide" };
  const deg = degressifs(b.degressifs, prixHT);
  if (deg === false) return { ok: false, error: "degressif_invalide" };
  const delaiJours = nombre(b.delaiJours);
  if (delaiJours !== null && (delaiJours < 0 || delaiJours > 365)) return { ok: false, error: "delai_invalide" };
  const disponibilite = clip(b.disponibilite, 20) || "EN_STOCK";
  if (!DISPONIBILITES.includes(disponibilite)) return { ok: false, error: "disponibilite_invalide" };
  const val = validite(b.validiteJusquau);
  if (val === false) return { ok: false, error: "validite_invalide" };
  const ph = photos(b.photos);
  if (ph === false) return { ok: false, error: "photo_invalide" };
  const ficheTechniqueUrl = b.ficheTechniqueUrl ? urlHttps(b.ficheTechniqueUrl) : null;
  if (b.ficheTechniqueUrl && !ficheTechniqueUrl) return { ok: false, error: "fiche_technique_invalide" };

  const prixRefHT = arrondi4(prixHT / facteur);
  let codePropose = clip(b.codePropose, 20).toUpperCase() || null;
  if (codePropose && codes.get(codePropose)?.uniteRef !== uniteRef) codePropose = null;
  const ecart = codePropose && materiau(codePropose) ? ecartReference(codePropose, prixRefHT) : null;
  return {
    ok: true,
    p: {
      famille, categorie, designationFr, designationAr, descriptionFr: clip(b.descriptionFr, 2000) || null, descriptionAr: clip(b.descriptionAr, 2000) || null,
      marque: clip(b.marque, 80) || null, modele: clip(b.modele, 80) || null, gamme, caracteristiques: car, uniteVente,
      conditionnement: clip(b.conditionnement, 120) || null, uniteRef, facteur, prixHT, tvaPct, prixRefHT, quantiteMin, degressifs: deg,
      delaiJours: delaiJours === null ? null : Math.round(delaiJours), zones: zonesValides(b.zones, regionSiege), disponibilite, validiteJusquau: val,
      photos: ph, ficheTechniqueUrl, codePropose, ecartRef: ecart, signalement: ecart !== null && Math.abs(ecart) > 0.5 ? (ecart > 0 ? "ABERRANT_HAUT" : "ABERRANT_BAS") : null,
    },
  };
}

/** Champs dont la modification renvoie un produit approuvé en modération (son identité change). */
/** Champs dont la modification renvoie un produit approuvé en modération (identité, textes publiés, liens externes). */
const IDENTITE_PRODUIT = ["famille", "uniteRef", "facteur", "designationFr", "designationAr", "descriptionFr", "descriptionAr", "marque", "modele",
  "conditionnement", "uniteVente", "ficheTechniqueUrl", "photos"] as const;
const identique = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || String(a ?? "") === String(b ?? "");
/** « Tout passe par CITURBAREA » : coordonnées dans les textes d'une fiche → signalement à l'admin, fiche en vérification. */
const COORDONNEES = "COORDONNEES";

export async function enregistrerProduit(fid: string, produitId: string | null, body: unknown, depot: DepotC): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  if (!METIERS_AVEC_FICHES.has(String(f.metier))) return erreur(403, "metier_sans_produits");
  const avant = produitId ? await depot.prParId(produitId) : null;
  if (produitId && (!avant || avant.fournisseurId !== fid)) return erreur(404, "not_found");
  if (!avant && (await depot.prLister(fid)).length >= PRODUITS_MAX) return erreur(400, "trop_de_produits");
  const codes = referentiel(await depot.refLister());
  const v = validerProduit(jsonObj(body), codes, (f.region as string) || null);
  if (!v.ok) return erreur(400, v.error);

  // Un produit déjà approuvé reste approuvé si seuls le prix, le stock, les délais ou les zones changent
  // et que le prix reste dans ±50 % de la référence du code rattaché.
  let statut = "PENDING";
  let materiauCode: string | null = avant ? ((avant.materiauCode as string) || null) : null;
  let ecartRef = v.p.ecartRef, signalement = v.p.signalement;
  if (materiauCode && materiau(materiauCode)) {
    ecartRef = ecartReference(materiauCode, v.p.prixRefHT);
    signalement = ecartRef !== null && Math.abs(ecartRef) > 0.5 ? (ecartRef > 0 ? "ABERRANT_HAUT" : "ABERRANT_BAS") : null;
  }
  const coord = coordonneesDans({ designationFr: v.p.designationFr, designationAr: v.p.designationAr, descriptionFr: v.p.descriptionFr, descriptionAr: v.p.descriptionAr,
    marque: v.p.marque, modele: v.p.modele, conditionnement: v.p.conditionnement, uniteVente: v.p.uniteVente, caracteristiques: v.p.caracteristiques });
  if (Object.keys(coord).length) signalement = COORDONNEES;
  const memeIdentite = !!avant && IDENTITE_PRODUIT.every((k) => identique(avant[k], v.p[k]));
  if (avant?.statut === "APPROVED" && materiauCode && !signalement && memeIdentite) statut = "APPROVED";
  // Le rattachement au code tient tant que la nature du produit (famille, unité, conversion) ne change pas.
  if (statut === "PENDING" && avant && !IDENTITE_PRODUIT.slice(0, 3).every((k) => identique(avant[k], v.p[k]))) materiauCode = null;

  let slug = (avant?.slug as string) || "";
  if (!slug) {
    const base = slugifier(`${v.p.designationFr || ""} ${v.p.marque || ""}`.trim() || FAMILLES_PRODUIT[v.p.famille].libelle.fr);
    slug = `${base}-${nouvelId("p").slice(-6)}`.slice(0, 80);
    while (await depot.prSlugPris(slug)) slug = `${base}-${nouvelId("p").slice(-6)}`.slice(0, 80);
  }
  const ligne = await depot.prEnregistrer(
    { id: (avant?.id as string) || nouvelId("prd"), fournisseurId: fid, slug, statut, materiauCode, motifRejet: null, ...v.p, ecartRef, signalement },
    { at: maintenantIso(), kind: avant ? "MISE_A_JOUR" : "CREATION", payload: { statut, prixHT: v.p.prixHT, auteur: `fournisseur:${fid}` } },
  );
  return { status: 200, json: { ok: true, produit: vueProduitProprietaire(ligne), ...(Object.keys(coord).length ? { avertissement: "coordonnees", champs: Object.keys(coord) } : {}) } };
}

export async function supprimerProduit(fid: string, id: string, depot: DepotC): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const p = await depot.prSupprimer(fid, id);
  return p ? { status: 200, json: { ok: true } } : erreur(404, "not_found");
}

// ───────────────────────── fiches service ─────────────────────────

type ServiceValide = Omit<ServiceEcrit, "id" | "fournisseurId" | "statut" | "motifRejet">;

/** Prix de référence du chiffrage pour une offre de service sur un ouvrage (fourni-posé : PU ; pose : MO + matériel × K). */
export function referenceOuvrage(code: string, nature: string): number | null {
  const o = OUVRAGES[code];
  if (!o) return null;
  const p = prixOuvrage(code);
  if (nature === "FOURNI_POSE") return p.pu;
  if (nature === "POSE") return (p.repartition.mainOeuvre + p.repartition.materiel) * coefK(o, "ref");
  return null;
}

export function validerService(b: Ligne): { ok: true; s: ServiceValide } | { ok: false; error: string } {
  let nature = clip(b.nature, 20);
  const ouvrageCode = clip(b.ouvrageCode, 20) || null;
  const prestationCode = clip(b.prestationCode, 40) || null;
  let unite = clip(b.unite, 12);
  let libelleDefaut: string | null = null;
  if (ouvrageCode) {
    const o = OUVRAGES[ouvrageCode];
    if (!o || o.interne) return { ok: false, error: "ouvrage_inconnu" };
    if (nature !== "POSE" && nature !== "FOURNI_POSE") return { ok: false, error: "nature_invalide" };
    unite = o.unite;
    libelleDefaut = nature === "POSE" ? `${o.libelle} — pose seule` : o.libelle;
  } else if (prestationCode) {
    const p = PRESTATIONS[prestationCode];
    if (!p) return { ok: false, error: "prestation_inconnue" };
    nature = p.nature;
    unite = p.unite;
    libelleDefaut = p.libelle.fr;
  } else {
    if (!(nature in NATURES_SERVICE)) return { ok: false, error: "nature_invalide" };
    if (!UNITES_SERVICE.includes(unite)) return { ok: false, error: "unite_invalide" };
  }
  if (!(nature in NATURES_SERVICE)) return { ok: false, error: "nature_invalide" };
  const designationFr = clip(b.designationFr, 140) || libelleDefaut, designationAr = clip(b.designationAr, 140) || null;
  if ((designationFr || "").length < 3 && (designationAr || "").length < 3) return { ok: false, error: "designation_requise" };
  const prixHT = nombre(b.prixHT);
  if (prixHT === null || prixHT <= 0 || prixHT > 50_000_000) return { ok: false, error: "prix_invalide" };
  const tvaPct = tva(b.tvaPct);
  if (tvaPct === null) return { ok: false, error: "tva_invalide" };
  const delaiJours = nombre(b.delaiJours);
  if (delaiJours !== null && (delaiJours < 0 || delaiJours > 365)) return { ok: false, error: "delai_invalide" };
  const val = validite(b.validiteJusquau);
  if (val === false) return { ok: false, error: "validite_invalide" };
  const ph = photos(b.photos);
  if (ph === false) return { ok: false, error: "photo_invalide" };
  const ref = ouvrageCode ? referenceOuvrage(ouvrageCode, nature) : null;
  const ecart = ref ? Math.round((prixHT / ref - 1) * 1000) / 1000 : null;
  return {
    ok: true,
    s: {
      nature, ouvrageCode, prestationCode, designationFr, designationAr, descriptionFr: clip(b.descriptionFr, 2000) || null,
      descriptionAr: clip(b.descriptionAr, 2000) || null, unite, prixHT, tvaPct, zones: [], delaiJours: delaiJours === null ? null : Math.round(delaiJours),
      conditions: clip(b.conditions, 500) || null, validiteJusquau: val, photos: ph, ecartRef: ecart,
      signalement: ecart !== null && Math.abs(ecart) > 0.5 ? (ecart > 0 ? "ABERRANT_HAUT" : "ABERRANT_BAS") : null,
    },
  };
}

const IDENTITE_SERVICE = ["nature", "ouvrageCode", "prestationCode", "unite", "designationFr", "designationAr", "descriptionFr", "descriptionAr", "conditions", "photos"] as const;

export async function enregistrerService(fid: string, serviceId: string | null, body: unknown, depot: DepotC): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const avant = serviceId ? await depot.svParId(serviceId) : null;
  if (serviceId && (!avant || avant.fournisseurId !== fid)) return erreur(404, "not_found");
  if (!avant && (await depot.svLister(fid)).length >= SERVICES_MAX) return erreur(400, "trop_de_services");
  const b = jsonObj(body);
  const v = validerService(b);
  if (!v.ok) return erreur(400, v.error);
  v.s.zones = zonesValides(b.zones, (f.region as string) || null);
  const coord = coordonneesDans({ designationFr: v.s.designationFr, designationAr: v.s.designationAr, descriptionFr: v.s.descriptionFr, descriptionAr: v.s.descriptionAr, conditions: v.s.conditions });
  if (Object.keys(coord).length) v.s.signalement = COORDONNEES;
  const statut = avant?.statut === "APPROVED" && !v.s.signalement && IDENTITE_SERVICE.every((k) => identique(avant[k], v.s[k])) ? "APPROVED" : "PENDING";
  const ligne = await depot.svEnregistrer(
    { id: (avant?.id as string) || nouvelId("svc"), fournisseurId: fid, statut, motifRejet: null, ...v.s },
    { at: maintenantIso(), kind: avant ? "MISE_A_JOUR" : "CREATION", payload: { statut, prixHT: v.s.prixHT, auteur: `fournisseur:${fid}` } },
  );
  return { status: 200, json: { ok: true, service: vueServiceProprietaire(ligne), ...(Object.keys(coord).length ? { avertissement: "coordonnees", champs: Object.keys(coord) } : {}) } };
}

export async function supprimerService(fid: string, id: string, depot: DepotC): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const s = await depot.svSupprimer(fid, id);
  return s ? { status: 200, json: { ok: true } } : erreur(404, "not_found");
}

// ───────────────────────── modération (back-office) ─────────────────────────

export async function produitsAModerer(statut: string | null, depot: DepotC): Promise<Reponse> {
  if (statut && !STATUTS_OFFRE.includes(statut)) return erreur(400, "statut_invalide");
  const [lignes, dyn] = await Promise.all([depot.prAModerer(statut), depot.refLister()]);
  return {
    status: 200,
    json: {
      ok: true, produits: lignes.map(vueProduitAdmin),
      codesCrees: dyn.map((d) => ({ code: d.code, libelleFr: d.libelleFr, libelleAr: d.libelleAr ?? null, categorie: d.categorie, famille: d.famille, uniteRef: d.uniteRef, parent: d.parent ?? null })),
    },
  };
}

/**
 * Modération d'une fiche produit :
 *   { action: "APPROUVER", materiauCode }               rattache à un code existant ;
 *   { action: "APPROUVER", nouveauCode: { libelleFr, libelleAr?, categorie?, famille?, uniteRef?, parent?, lots?, gamme? } }
 *                                                       crée le code CIT-<PFX>-9NN puis rattache ;
 *   { action: "REJETER", motif } ;  { action: "ARCHIVER" }.
 * `facteur` (facultatif) corrige la conversion unité de vente → unité du code.
 */
export async function modererProduit(id: string, body: unknown, auteur: string, depot: DepotC): Promise<Reponse> {
  const p = await depot.prParId(id);
  if (!p) return erreur(404, "not_found");
  const b = jsonObj(body);
  const action = clip(b.action, 20);
  const ev = (payload: Ligne) => ({ at: maintenantIso(), kind: "MODERATION", payload: { action, auteur, ...payload } });
  const base = { uniteRef: String(p.uniteRef), facteur: Number(p.facteur), prixRefHT: Number(p.prixRefHT), ecartRef: (p.ecartRef as number) ?? null, signalement: (p.signalement as string) || null, auteur };
  if (action === "REJETER") {
    const motif = clip(b.motif, 500);
    if (!motif) return erreur(400, "motif_requis");
    const r = await depot.prModerer(id, { ...base, statut: "REJECTED", materiauCode: (p.materiauCode as string) || null, motifRejet: motif }, ev({ motif }));
    return { status: 200, json: { ok: true, produit: vueProduitAdmin(r || p) } };
  }
  if (action === "ARCHIVER") {
    const r = await depot.prModerer(id, { ...base, statut: "ARCHIVED", materiauCode: (p.materiauCode as string) || null, motifRejet: null }, ev({}));
    return { status: 200, json: { ok: true, produit: vueProduitAdmin(r || p) } };
  }
  if (action !== "APPROUVER") return erreur(400, "action_invalide");

  const dyn = await depot.refLister();
  const codes = referentiel(dyn);
  let code = clip(b.materiauCode, 20).toUpperCase();
  let cree: string | null = null;
  if (!code) {
    const n = jsonObj(b.nouveauCode);
    const libelleFr = clip(n.libelleFr, 140) || (p.designationFr as string) || "";
    if (libelleFr.length < 3) return erreur(400, "libelle_requis");
    const categorie = clip(n.categorie, 40) || String(p.categorie);
    if (!(categorie in CATEGORIES)) return erreur(400, "categorie_invalide");
    const uniteRef = clip(n.uniteRef, 10) || String(p.uniteRef);
    if (!(uniteRef in UNITES_REF)) return erreur(400, "unite_invalide");
    const parent = clip(n.parent, 20).toUpperCase() || null;
    if (parent && codes.get(parent)?.uniteRef !== uniteRef) return erreur(400, "parent_invalide");
    const nouveau = prochainCode(categorie, [...codes.keys(), ...dyn.map((d) => String(d.code))]);
    if (!nouveau) return erreur(400, "categorie_invalide");
    await depot.refCreer({
      code: nouveau, libelleFr, libelleAr: clip(n.libelleAr, 140) || (p.designationAr as string) || null, libelleEn: clip(n.libelleEn, 140) || null,
      categorie, famille: clip(n.famille, 60) || FAMILLES_PRODUIT[String(p.famille)]?.libelle.fr || "Autres", uniteRef, parent,
      lots: [...new Set(liste(n.lots).map((l) => clip(l, 40)).filter((l) => /^LOT_\d{2}/.test(l)))].slice(0, 6),
      gamme: (p.gamme as string) || null, auteur, origineProduitId: id,
    });
    code = nouveau;
    cree = nouveau;
    codes.set(nouveau, { code: nouveau, libelleFr, libelleAr: null, libelleEn: null, categorie, famille: "", uniteRef, parent, lots: [], gamme: null, dynamique: true, recherche: null });
  }
  const ref = codes.get(code);
  if (!ref) return erreur(400, "code_inconnu");
  const facteur = b.facteur === undefined || b.facteur === "" ? Number(p.facteur) : nombre(b.facteur);
  if (facteur === null || facteur <= 0 || facteur > 1e6) return erreur(400, "facteur_invalide");
  // L'unité du produit devient celle du code : le facteur convertit l'unité de vente dans l'unité du code.
  if (ref.uniteRef !== p.uniteRef && b.facteur === undefined) return erreur(400, "unite_incompatible", { uniteCode: ref.uniteRef, uniteProduit: p.uniteRef });
  const prixRefHT = arrondi4(Number(p.prixHT) / facteur);
  const ecart = materiau(code) ? ecartReference(code, prixRefHT) : null;
  const r = await depot.prModerer(id, {
    statut: "APPROVED", materiauCode: code, uniteRef: ref.uniteRef, facteur, prixRefHT, ecartRef: ecart,
    signalement: ecart !== null && Math.abs(ecart) > 0.5 ? (ecart > 0 ? "ABERRANT_HAUT" : "ABERRANT_BAS") : null, motifRejet: null, auteur,
  }, ev({ materiauCode: code, codeCree: cree, facteur }));
  // Les images en attente de la fiche sont approuvées avec elle (l'admin les a vues dans la même carte).
  const images = await depot.imApprouverObjet("PRODUIT", id, auteur);
  return { status: 200, json: { ok: true, produit: vueProduitAdmin(r || p), codeCree: cree, imagesApprouvees: images } };
}

export async function servicesAModerer(statut: string | null, depot: DepotC): Promise<Reponse> {
  if (statut && !STATUTS_OFFRE.includes(statut)) return erreur(400, "statut_invalide");
  const lignes = await depot.svAModerer(statut);
  return {
    status: 200,
    json: { ok: true, services: lignes.map((s) => ({ ...vueServiceAdmin(s), reference: s.ouvrageCode ? referenceOuvrage(String(s.ouvrageCode), String(s.nature)) : null })) },
  };
}

/** { action: "APPROUVER", ouvrageCode?, prestationCode? } | { action: "REJETER", motif } | { action: "ARCHIVER" }. */
export async function modererService(id: string, body: unknown, auteur: string, depot: DepotC): Promise<Reponse> {
  const s = await depot.svParId(id);
  if (!s) return erreur(404, "not_found");
  const b = jsonObj(body);
  const action = clip(b.action, 20);
  let ouvrageCode = (s.ouvrageCode as string) || null, prestationCode = (s.prestationCode as string) || null;
  let statut: string, motif: string | null = null;
  if (action === "REJETER") { motif = clip(b.motif, 500) || null; if (!motif) return erreur(400, "motif_requis"); statut = "REJECTED"; }
  else if (action === "ARCHIVER") statut = "ARCHIVED";
  else if (action === "APPROUVER") {
    statut = "APPROVED";
    // Rattachement corrigé par l'admin : l'unité doit rester celle de l'offre.
    if (b.ouvrageCode !== undefined) {
      const c = clip(b.ouvrageCode, 20) || null;
      if (c && (!OUVRAGES[c] || OUVRAGES[c].interne || OUVRAGES[c].unite !== s.unite || !["POSE", "FOURNI_POSE"].includes(String(s.nature)))) return erreur(400, "ouvrage_incompatible");
      ouvrageCode = c;
      if (c) prestationCode = null;
    }
    if (b.prestationCode !== undefined) {
      const c = clip(b.prestationCode, 40) || null;
      if (c && (!PRESTATIONS[c] || PRESTATIONS[c].unite !== s.unite)) return erreur(400, "prestation_incompatible");
      prestationCode = c;
      if (c) ouvrageCode = null;
    }
  } else return erreur(400, "action_invalide");
  const r = await depot.svModerer(id, { statut, ouvrageCode, prestationCode, motifRejet: motif, auteur },
    { at: maintenantIso(), kind: "MODERATION", payload: { action, auteur, motif, ouvrageCode, prestationCode } });
  if (statut === "APPROVED") await depot.imApprouverObjet("SERVICE", id, auteur);
  return { status: 200, json: { ok: true, service: vueServiceAdmin(r || s) } };
}

// ───────────────────────── lectures publiques ─────────────────────────
//
// Règles communes (docs/architecture/contrat-catalogue.md) : seuls les éléments
// APPROVED de pros APPROVED, non fictifs (sauf aperçu sur *.pages.dev), valides
// à la date du jour. Aucun prix nominatif d'un pro, aucune coordonnée : prix
// publiés seulement agrégés à partir de 3 fournisseurs distincts.

/** Lecture publique : fournisseurs fictifs inclus seulement en aperçu (hôtes de prévisualisation). */
export interface OptionsLecture { inclureFictifs?: boolean; /** https://hôte de la requête, pour des URL d'images absolues. */ origine?: string }
export type Texte = { fr: string; ar?: string; en?: string };

const normaliser = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const contient = (cible: (string | null | undefined)[], q: string) => {
  const n = normaliser(q.trim());
  return !n || cible.some((c) => c && normaliser(c).includes(n));
};
const regionParam = (v: string | null): string | null => (v ? (v === "national" ? null : regionDe(v)) : null);
const valideAujourdhui = (v: unknown) => { const j = jour(v); return !j || j >= aujourdhui(); };
const entier = (v: string | null, def: number, max: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : def; };
/** Texte bilingue d'un contenu saisi : `fr` toujours rempli (repli sur l'arabe), `ar` si saisi. */
const texte = (fr: unknown, ar: unknown): Texte | null => {
  // Textes publiés : coordonnées masquées (défense en profondeur ; la fiche est aussi signalée à l'enregistrement).
  const f = typeof fr === "string" ? m_(fr.trim()) : "", a = typeof ar === "string" ? m_(ar.trim()) : "";
  return f || a ? { fr: f || a, ...(a ? { ar: a } : {}) } : null;
};
const zonesDe = (l: Ligne, zonesF: unknown) => (liste(l.zones).length ? liste(l.zones) : liste(zonesF));
const couvre = (l: Ligne, region: string | null) => livreRegion({ zonesLivraison: zonesDe(l, l.fZones), fournisseurRegion: (l.fRegion as string) || null }, region);

/** Codes d'un lot : nomenclature du chiffrage (STR, RSO…) ou des CPS (LOT_02_GO_BETON…). Les deux nomenclatures CPS diffèrent après le numéro : on compare « LOT_NN ». */
export function codesDuLot(lot: string): Set<string> {
  const out = new Set<string>();
  const num = (s: string) => s.slice(0, 6);
  const cps = (/^LOT_\d{2}/.test(lot) ? [lot] : LOT_PAR_CODE[lot as CodeLot]?.cps || []).map(num);
  for (const m of CATALOGUE) if (m.lots.some((l) => cps.includes(num(l)))) out.add(m.code);
  for (const o of Object.values(OUVRAGES)) if (o.lot === lot) out.add(o.code);
  return out;
}

/** Offres → fiches de marché (agregerMarche) : prix par unité du code, zones du produit sinon du pro. */
export const fichesMarche = (offres: Ligne[], code: (o: Ligne) => string): FicheMarche[] => offres.map((o) => ({
  materiauCode: code(o), prixRefHT: Number(o.prix), updatedAt: iso(o.misAJour) || "", validiteJusquau: jour(o.validiteJusquau),
  fournisseurId: String(o.fournisseurId), fournisseurRegion: (o.regionFournisseur as string) || null, zonesLivraison: liste(o.zones),
}));

/** Parents des codes créés (pour compter une déclinaison dans le code générique). */
export const parentsCrees = (dyn: Ligne[]): Record<string, string> =>
  Object.fromEntries(dyn.filter((d) => d.parent).map((d) => [String(d.code), String(d.parent)]));

function valeurCaracteristique(famille: string, cle: string, v: unknown): { libelle: Texte; valeur: Texte } | null {
  const c = FAMILLES_PRODUIT[famille]?.champs.find((x) => x.cle === cle);
  if (!c || v === undefined || v === null || v === "") return null;
  const libelle = { fr: c.libelle.fr, ar: c.libelle.ar, en: c.libelle.en };
  if (c.type === "choix") { const o = c.options?.find(([k]) => k === v)?.[1]; return o ? { libelle, valeur: { fr: o.fr, ar: o.ar, en: o.en } } : null; }
  if (c.type === "oui_non") return { libelle, valeur: v === true ? { fr: "Oui", ar: "نعم", en: "Yes" } : { fr: "Non", ar: "لا", en: "No" } };
  const s = m_(`${v}${c.unite ? ` ${c.unite}` : ""}`);
  return { libelle, valeur: { fr: s } };
}

/** Variantes : fiches d'un même code, d'une même marque et d'un même modèle (sinon même désignation). */
function grouperVariantes(l: Ligne[]): Map<string, Ligne[]> {
  const groupes = new Map<string, Ligne[]>();
  for (const p of l) {
    const cle = [p.materiauCode, normaliser(String(p.marque || "")), normaliser(String(p.modele || "")), p.marque || p.modele ? "" : normaliser(String(p.designationFr || p.designationAr || ""))].join("|");
    groupes.set(cle, [...(groupes.get(cle) || []), p]);
  }
  return groupes;
}

/** Entrée publique d'une variante (forme du contrat catalogue), prix agrégé à partir de 3 fournisseurs. */
function variante(cle: string, g: Ligne[], images: Map<string, ReturnType<typeof vueImagePublique>[]>, parents: Record<string, string>, region: string | null) {
  const reference = (c: string) => parents[c] || c;
  g.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const p = g[0];
  const m = agregerMarche(fichesMarche(g.map((x) => ({ prix: x.prixRefHT, misAJour: x.updatedAt, validiteJusquau: x.validiteJusquau, fournisseurId: x.fournisseurId,
    regionFournisseur: x.fRegion, zones: zonesDe(x, x.fZones) })), () => cle), region)[cle];
  const fournisseurs = [...new Map(g.map((x) => [String(x.fournisseurId), x])).values()];
  const conditionnements = [...new Map(g.map((x) => [`${x.uniteVente}|${x.facteur}`, {
    code: slugifier(String(x.uniteVente)).slice(0, 30), libelle: { fr: m_(String(x.uniteVente)) }, facteur: Number(x.facteur) }])).values()];
  const car = jsonObj(p.caracteristiques);
  // Galerie de la variante : images approuvées de ses fiches (la plus récente d'abord), sans doublon.
  const galerie = [...new Map(g.flatMap((x) => images.get(`PRODUIT:${x.id}`) || []).map((i) => [i.id, i])).values()].slice(0, MAX_IMAGES_VARIANTE);
  return {
    id: String(p.id), codeReference: reference(String(p.materiauCode)),
    ...(parents[String(p.materiauCode)] ? { codeVariante: String(p.materiauCode) } : {}),
    marque: m_((p.marque as string) || null), modele: m_((p.modele as string) || null),
    designation: texte(p.designationFr, p.designationAr)!, description: texte(p.descriptionFr, p.descriptionAr),
    caracteristiques: Object.keys(car).map((k) => valeurCaracteristique(String(p.famille), k, car[k])).filter(Boolean),
    conditionnements, photoUrl: galerie[0]?.url || liste(p.photos)[0] || null, vignetteUrl: galerie[0]?.vignette || null, images: galerie,
    ficheTechniqueUrl: (p.ficheTechniqueUrl as string) || null,
    gamme: (p.gamme as string) || null, famille: String(p.famille), categorie: String(p.categorie), uniteRef: String(p.uniteRef),
    nbFournisseurs: fournisseurs.length,
    prix: m && m.mediane != null ? { mediane: m.mediane, min: m.min, max: m.max, nbFournisseurs: m.nbFournisseurs, majLe: m.plusRecente } : null,
    majLe: jour(p.updatedAt),
    fournisseurs: fournisseurs.map((x) => { const f = fournisseurResume(x); return { slug: f.slug, nom: texte(f.raisonSociale, f.raisonSocialeAr), ville: f.ville, documentsVerifies: f.documentsVerifies }; }),
  };
}

/** Images publiques par objet (« PRODUIT:id », « SERVICE:id », « SOCIETE:id ») ; table absente → aucune image. */
async function imagesPubliques(depot: DepotC, fictifs: boolean, origine = "") {
  try { return imagesParObjet(await depot.imPubliques(fictifs), origine); } catch { return new Map<string, ReturnType<typeof vueImagePublique>[]>(); }
}
const MAX_IMAGES_VARIANTE = 8;

/**
 * GET /api/catalogue/produits?code=&region=&categorie=&famille=&gamme=&q=&fournisseur= — forme du contrat
 * docs/architecture/contrat-catalogue.md : variantes groupées par (code, marque, modèle), textes bilingues,
 * prix agrégé par unité de référence à partir de 3 fournisseurs distincts (sinon null). `depot` null → disponible false.
 */
export async function catalogueProduits(q: URLSearchParams, depot: DepotC | null, opts: OptionsLecture = {}): Promise<Reponse> {
  const entetes = { "cache-control": "public, max-age=60, s-maxage=300" };
  const vide = (disponible: boolean): Reponse => ({ status: 200, json: { ok: true, disponible, total: 0, produits: [] }, entetes });
  if (!depot) return vide(false);
  let lignes: Ligne[], dyn: Ligne[];
  try { [lignes, dyn] = await Promise.all([depot.prPublics(!!opts.inclureFictifs), depot.refLister()]); } catch { return vide(false); }
  const images = await imagesPubliques(depot, !!opts.inclureFictifs, opts.origine);
  const region = regionParam(q.get("region"));
  const categorie = q.get("categorie"), famille = q.get("famille"), gamme = q.get("gamme"), fournisseur = q.get("fournisseur");
  const code = (q.get("code") || "").toUpperCase(), recherche = q.get("q") || "";
  const parents = parentsCrees(dyn);
  // Code de référence publié : le code générique pour une déclinaison créée à la modération (la variante reste en `codeVariante`).
  const reference = (c: string) => parents[c] || c;
  const retenus = lignes.filter((p) => p.materiauCode && valideAujourdhui(p.validiteJusquau) && couvre(p, region)
    && (!categorie || p.categorie === categorie) && (!famille || p.famille === famille) && (!gamme || p.gamme === gamme)
    && (!fournisseur || p.fSlug === fournisseur) && (!code || p.materiauCode === code || reference(String(p.materiauCode)) === code)
    && contient([p.designationFr as string, p.designationAr as string, p.marque as string, p.modele as string, p.descriptionFr as string], recherche));

  const produits = [...grouperVariantes(retenus).entries()].map(([cle, g]) => variante(cle, g, images, parents, region));
  const offset = entier(q.get("offset"), 0, 10_000), limite = entier(q.get("limite"), 2000, 2000) || 2000;
  return { status: 200, json: { ok: true, disponible: true, region, total: produits.length, produits: produits.slice(offset, offset + limite) }, entetes };
}

/**
 * GET /api/catalogue/services?ouvrage=&prestation=&nature=&lot=&region=&q=&fournisseur= — prestations approuvées
 * de pros vérifiés, textes bilingues, prix agrégés par (code, nature) à partir de 3 pros (`prix`), sinon null.
 */
export async function catalogueServices(q: URLSearchParams, depot: DepotC | null, opts: OptionsLecture = {}): Promise<Reponse> {
  const entetes = { "cache-control": "public, max-age=60, s-maxage=300" };
  if (!depot) return { status: 200, json: { ok: true, disponible: false, total: 0, services: [] }, entetes };
  let lignes: Ligne[];
  try { lignes = await depot.svPublics(!!opts.inclureFictifs); } catch { return { status: 200, json: { ok: true, disponible: false, total: 0, services: [] }, entetes }; }
  const images = await imagesPubliques(depot, !!opts.inclureFictifs, opts.origine);
  const region = regionParam(q.get("region"));
  const nature = q.get("nature"), ouvrage = q.get("ouvrage") || q.get("code"), prestation = q.get("prestation"), lot = q.get("lot"), fournisseur = q.get("fournisseur");
  const duLot = lot ? codesDuLot(lot) : null;
  const l = lignes.filter((s) => valideAujourdhui(s.validiteJusquau) && couvre(s, region)
    && (!nature || s.nature === nature) && (!ouvrage || s.ouvrageCode === ouvrage) && (!prestation || s.prestationCode === prestation)
    && (!duLot || duLot.has(String(s.ouvrageCode))) && (!fournisseur || s.fSlug === fournisseur)
    && contient([s.designationFr as string, s.designationAr as string, s.descriptionFr as string, s.descriptionAr as string], q.get("q") || ""));
  const cleCode = (s: Ligne) => `${s.ouvrageCode || s.prestationCode || ""}|${s.nature}`;
  const marche = agregerMarche(fichesMarche(l.filter((s) => s.ouvrageCode || s.prestationCode).map((s) => ({ prix: s.prixHT, misAJour: s.updatedAt, validiteJusquau: s.validiteJusquau,
    fournisseurId: s.fournisseurId, regionFournisseur: s.fRegion, zones: zonesDe(s, s.fZones), cle: cleCode(s) })), (o) => String(o.cle)), region);
  const offset = entier(q.get("offset"), 0, 10_000), limite = entier(q.get("limite"), 200, 1000) || 200;
  return {
    status: 200,
    json: {
      ok: true, disponible: true, region, total: l.length,
      services: l.slice(offset, offset + limite).map((s) => {
        const m = marche[cleCode(s)];
        const f = fournisseurResume(s);
        return {
          id: String(s.id), nature: String(s.nature), ouvrageCode: (s.ouvrageCode as string) || null, prestationCode: (s.prestationCode as string) || null,
          designation: texte(s.designationFr, s.designationAr)!, description: texte(s.descriptionFr, s.descriptionAr), unite: String(s.unite),
          delaiJours: s.delaiJours == null ? null : Number(s.delaiJours), conditions: m_((s.conditions as string) || null), zones: zonesDe(s, s.fZones),
          photoUrl: images.get(`SERVICE:${s.id}`)?.[0]?.url || liste(s.photos)[0] || null, images: images.get(`SERVICE:${s.id}`) || [], majLe: jour(s.updatedAt),
          prix: m && m.mediane != null ? { mediane: m.mediane, min: m.min, max: m.max, nbFournisseurs: m.nbFournisseurs, majLe: m.plusRecente } : null,
          fournisseur: { slug: f.slug, nom: texte(f.raisonSociale, f.raisonSocialeAr), ville: f.ville, documentsVerifies: f.documentsVerifies },
        };
      }),
    },
    entetes,
  };
}

/** GET /api/catalogue/referentiel — codes créés à la modération (le catalogue statique est déjà dans le front). */
export async function referentielPublic(depot: DepotC | null): Promise<Reponse> {
  const dyn = depot ? await depot.refLister().catch(() => [] as Ligne[]) : [];
  return {
    status: 200,
    json: {
      ok: true, disponible: !!depot, catalogueVersion: CATALOGUE_VERSION,
      codes: [...referentiel(dyn).values()].filter((c) => c.dynamique)
        .map(({ code, libelleFr, libelleAr, libelleEn, categorie, famille, uniteRef, parent, lots, gamme }) => ({
          code, libelle: { fr: libelleFr, ...(libelleAr ? { ar: libelleAr } : {}), ...(libelleEn ? { en: libelleEn } : {}) }, categorie, famille, uniteRef, parent, lots, gamme,
        })),
    },
    entetes: { "cache-control": "public, max-age=60, s-maxage=300" },
  };
}

/**
 * Offres de produits rattachés, au format des fiches de marché, pour GET /api/prix/materiaux
 * (à ajouter aux fiches de prix lues par functions/_lib/prixMateriaux.ts).
 */
export async function fichesMarcheProduits(depot: DepotCatalogue, opts: OptionsLecture = {}): Promise<{ fiches: FicheMarche[]; parents: Record<string, string> }> {
  const [offres, dyn] = await Promise.all([depot.offresProduits(!!opts.inclureFictifs), depot.refLister()]);
  return { fiches: fichesMarche(offres, (o) => String(o.code)), parents: parentsCrees(dyn) };
}

/** GET /api/prix/ouvrages?region=&codes= — prix d'ouvrage du chiffrage + agrégats des offres de services (fourni-posé, pose seule) et des prestations. */
export async function prixOuvrages(q: URLSearchParams, depot: DepotC | null, opts: OptionsLecture = {}): Promise<Reponse> {
  const region = regionParam(q.get("region"));
  let offres: Ligne[] = [], disponible = !!depot;
  if (depot) { try { offres = await depot.offresServices(!!opts.inclureFictifs); } catch { disponible = false; offres = []; } }
  const parNature = (nature: string) => agregerMarche(fichesMarche(offres.filter((o) => o.ouvrageCode && o.nature === nature), (o) => String(o.ouvrageCode)), region);
  const fp = parNature("FOURNI_POSE"), pose = parNature("POSE");
  const presta = agregerMarche(fichesMarche(offres.filter((o) => o.prestationCode), (o) => String(o.prestationCode)), region);
  const demandes = new Set((q.get("codes") || "").split(",").map((c) => c.trim()).filter(Boolean));
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const ouvrages = Object.values(OUVRAGES).filter((o) => !o.interne && (!demandes.size || demandes.has(o.code))).map((o) => {
    const p = prixOuvrage(o.code);
    return {
      code: o.code, lot: o.lot, unite: o.unite, libelle: o.libelle, recherche: { pu: r2(p.pu), min: r2(p.min), max: r2(p.max) },
      marche: { ...(fp[o.code] ? { FOURNI_POSE: fp[o.code] } : {}), ...(pose[o.code] ? { POSE: pose[o.code] } : {}) },
    };
  });
  return {
    status: 200,
    json: {
      ok: true, region, genereLe: maintenantIso(), marcheDisponible: disponible, ouvrages,
      prestations: Object.entries(PRESTATIONS).filter(([c]) => !demandes.size || demandes.has(c))
        .map(([code, p]) => ({ code, unite: p.unite, nature: p.nature, libelle: p.libelle, marche: presta[code] || null })),
    },
    entetes: { "cache-control": "public, max-age=60, s-maxage=300" },
  };
}

/** GET /api/cercles/annuaire — pros vérifiés ; filtres métier, groupe, région, catégorie, texte, codes couverts, lot (ciblage des demandes de prix). */
export async function annuaire(q: URLSearchParams, depot: DepotC, opts: OptionsLecture = {}): Promise<Reponse> {
  const region = regionParam(q.get("region"));
  const metier = q.get("metier"), groupe = q.get("groupe"), categorie = q.get("categorie"), recherche = q.get("q") || "";
  const codes = new Set((q.get("codes") || "").split(",").map((c) => c.trim()).filter(Boolean));
  const lot = q.get("lot");
  if (lot) for (const c of codesDuLot(lot)) codes.add(c);
  const l = (await depot.annuaire(!!opts.inclureFictifs)).filter((f) =>
    (!metier || f.metier === metier) && (!groupe || TYPES_SOCIETE[String(f.metier)]?.groupe === groupe)
    && livreRegion({ zonesLivraison: liste(f.zonesLivraison), fournisseurRegion: (f.region as string) || null }, region)
    && (!categorie || liste(f.categories).includes(categorie))
    && (!codes.size || liste(f.codes).some((c) => codes.has(c)))
    && contient([f.raisonSociale as string, f.raisonSocialeAr as string, f.ville as string, f.description as string, f.descriptionAr as string, ...liste(jsonObj(f.fiche).marques)], recherche));
  const offset = entier(q.get("offset"), 0, 10_000), limite = entier(q.get("limite"), 60, 200) || 60;
  return {
    status: 200,
    json: {
      ok: true, total: l.length, region,
      fournisseurs: l.slice(offset, offset + limite).map((f) => ({
        ...vuePublique(f), nbProduits: Number(f.nbProduits ?? 0), nbServices: Number(f.nbServices ?? 0), nbFiches: Number(f.nbFiches ?? 0),
        ...(codes.size ? { codesCouverts: liste(f.codes).filter((c) => codes.has(c)) } : {}),
      })),
    },
    entetes: { "cache-control": "public, max-age=60, s-maxage=300" },
  };
}

/**
 * GET /api/cercles/pro/:slug — fiche publique d'un pro vérifié : société, produits, services et matériaux
 * chiffrés, SANS prix nominatif ni coordonnées (prix sur demande via la plateforme).
 */
export async function fichePro(slug: string, depot: DepotC, opts: OptionsLecture = {}): Promise<Reponse> {
  const f = await depot.fParSlug(slug);
  if (!f || f.statut !== "APPROVED" || (jsonObj(f.meta).fictif === true && !opts.inclureFictifs)) return erreur(404, "not_found");
  const [produits, services, fiches, images] = await Promise.all([depot.prPublics(true), depot.svPublics(true), depot.fichesApprouvees(String(f.id)), imagesPubliques(depot, true, opts.origine)]);
  return {
    status: 200,
    json: {
      ok: true, fournisseur: vuePublique(f), imagesSociete: images.get(`SOCIETE:${f.id}`) || [],
      produits: produits.filter((p) => p.fournisseurId === f.id && valideAujourdhui(p.validiteJusquau)).map((p) => ({ ...vueProduitPublique(p), images: images.get(`PRODUIT:${p.id}`) || [] })),
      services: services.filter((s) => s.fournisseurId === f.id && valideAujourdhui(s.validiteJusquau)).map((s) => ({ ...vueServicePublique(s), images: images.get(`SERVICE:${s.id}`) || [] })),
      materiauxChiffres: fiches.filter((p) => valideAujourdhui(p.validiteJusquau)).map((p) => {
        const v = vueFiche(p);
        return { materiauCode: v.materiauCode, libelle: v.libelle, uniteVenteLibelle: v.uniteVenteLibelle, disponibilite: v.disponibilite, marque: v.marque, majLe: jour(p.updatedAt) };
      }),
    },
    entetes: { "cache-control": "public, max-age=60, s-maxage=300" },
  };
}

// ───────────────────────── navigation par fournisseur ─────────────────────────

/** Fiche société publique au format du contrat (textes bilingues, galerie, sans coordonnées ni documents). */
function societePublique(f: Ligne, galerie: ReturnType<typeof vueImagePublique>[]) {
  const v = vuePublique(f);
  const m = libelleMetier(v.metier);
  return {
    slug: v.slug, nom: texte(v.raisonSociale, v.raisonSocialeAr)!, metier: v.metier, metierLibelle: { fr: m.fr, ar: m.ar, en: m.en },
    ville: v.ville, region: v.region, zonesLivraison: v.zonesLivraison, categories: v.categories, description: texte(v.description, v.descriptionAr),
    logoUrl: galerie.find((i) => i.principale)?.vignette || v.logoUrl, images: galerie, verifie: v.verifie, documentsVerifies: v.documentsVerifies,
    fiche: v.fiche, membreDepuis: v.membreDepuis, url: `/cercles/pro/${v.slug}`,
  };
}

/**
 * GET /api/catalogue/fournisseurs?region=&categorie=&famille=&metier=&q= — pros vérifiés qui ont au moins
 * un produit ou une prestation publiés, avec leurs familles de produits (nombre de variantes) et leur galerie.
 */
export async function catalogueFournisseurs(q: URLSearchParams, depot: DepotC | null, opts: OptionsLecture = {}): Promise<Reponse> {
  const entetes = { "cache-control": "public, max-age=60, s-maxage=300" };
  const vide = (disponible: boolean): Reponse => ({ status: 200, json: { ok: true, disponible, total: 0, fournisseurs: [] }, entetes });
  if (!depot) return vide(false);
  let pros: Ligne[], produits: Ligne[];
  try { [pros, produits] = await Promise.all([depot.annuaire(!!opts.inclureFictifs), depot.prPublics(!!opts.inclureFictifs)]); } catch { return vide(false); }
  const images = await imagesPubliques(depot, !!opts.inclureFictifs, opts.origine);
  const region = regionParam(q.get("region"));
  const categorie = q.get("categorie"), famille = q.get("famille"), metier = q.get("metier"), recherche = q.get("q") || "";
  const parPro = new Map<string, Ligne[]>();
  for (const p of produits) if (p.materiauCode && valideAujourdhui(p.validiteJusquau)) parPro.set(String(p.fournisseurId), [...(parPro.get(String(p.fournisseurId)) || []), p]);
  const l = pros.filter((f) => Number(f.nbProduits ?? 0) + Number(f.nbServices ?? 0) > 0
    && (!metier || f.metier === metier) && (!categorie || liste(f.categories).includes(categorie))
    && livreRegion({ zonesLivraison: liste(f.zonesLivraison), fournisseurRegion: (f.region as string) || null }, region)
    && (!famille || (parPro.get(String(f.id)) || []).some((p) => p.famille === famille))
    && contient([f.raisonSociale as string, f.raisonSocialeAr as string, f.ville as string, ...liste(jsonObj(f.fiche).marques), ...(parPro.get(String(f.id)) || []).map((p) => String(p.marque || ""))], recherche));
  return {
    status: 200,
    json: {
      ok: true, disponible: true, region, total: l.length,
      fournisseurs: l.slice(0, 500).map((f) => {
        const familles = new Map<string, number>();
        for (const cle of grouperVariantes(parPro.get(String(f.id)) || []).keys()) {
          const fam = String((parPro.get(String(f.id)) || []).find((p) => cle.startsWith(`${p.materiauCode}|`))?.famille || "AUTRE");
          familles.set(fam, (familles.get(fam) || 0) + 1);
        }
        return {
          ...societePublique(f, images.get(`SOCIETE:${f.id}`) || []), nbProduits: Number(f.nbProduits ?? 0), nbServices: Number(f.nbServices ?? 0),
          familles: [...familles].map(([k, nb]) => ({ famille: k, libelle: FAMILLES_PRODUIT[k]?.libelle || { fr: k, ar: k, en: k }, nb })),
        };
      }),
    },
    entetes,
  };
}

/**
 * GET /api/catalogue/fournisseurs/:slug/produits — fiche société publique, produits approuvés groupés par
 * famille (même forme que /api/catalogue/produits : prix agrégé seulement à partir de 3 fournisseurs, donc
 * null ici sauf variante partagée), prestations groupées par nature, galeries.
 */
export async function catalogueFournisseur(slug: string, depot: DepotC | null, opts: OptionsLecture = {}): Promise<Reponse> {
  const entetes = { "cache-control": "public, max-age=60, s-maxage=300" };
  if (!depot) return { status: 200, json: { ok: true, disponible: false, fournisseur: null, familles: [], services: [] }, entetes };
  const f = await depot.fParSlug(slug);
  if (!f || f.statut !== "APPROVED" || (jsonObj(f.meta).fictif === true && !opts.inclureFictifs)) return erreur(404, "not_found");
  const [produits, services, dyn, images] = await Promise.all([depot.prPublics(true), depot.svPublics(true), depot.refLister(), imagesPubliques(depot, true, opts.origine)]);
  const parents = parentsCrees(dyn);
  const siens = produits.filter((p) => p.fournisseurId === f.id && p.materiauCode && valideAujourdhui(p.validiteJusquau));
  const familles = new Map<string, ReturnType<typeof variante>[]>();
  for (const [cle, g] of grouperVariantes(siens)) {
    const v = variante(cle, g, images, parents, null);
    familles.set(v.famille, [...(familles.get(v.famille) || []), v]);
  }
  const natures = new Map<string, Ligne[]>();
  for (const s of services.filter((x) => x.fournisseurId === f.id && valideAujourdhui(x.validiteJusquau))) natures.set(String(s.nature), [...(natures.get(String(s.nature)) || []), s]);
  return {
    status: 200,
    json: {
      ok: true, disponible: true, fournisseur: societePublique(f, images.get(`SOCIETE:${f.id}`) || []),
      familles: [...familles].map(([k, l]) => ({ famille: k, libelle: FAMILLES_PRODUIT[k]?.libelle || { fr: k, ar: k, en: k }, produits: l })),
      services: [...natures].map(([n, l]) => ({
        nature: n, libelle: NATURES_SERVICE[n] || { fr: n, ar: n, en: n },
        services: l.map((s) => ({
          id: String(s.id), ouvrageCode: (s.ouvrageCode as string) || null, prestationCode: (s.prestationCode as string) || null,
          designation: texte(s.designationFr, s.designationAr)!, description: texte(s.descriptionFr, s.descriptionAr), unite: String(s.unite),
          delaiJours: s.delaiJours == null ? null : Number(s.delaiJours), zones: zonesDe(s, s.fZones), images: images.get(`SERVICE:${s.id}`) || [], majLe: jour(s.updatedAt),
        })),
      })),
    },
    entetes,
  };
}

// ───────────────────────── contact via la plateforme ─────────────────────────

export const MESSAGE_CONTACT = "Demande transmise. L'équipe CITURBAREA vous met en relation avec ce professionnel sous 24 h ouvrées.";

/**
 * POST /api/cercles/contact — demande de mise en relation avec un pro (lead
 * « P6_CONTACT_PRO » dans /cc/leads). Les coordonnées du pro ne sont jamais
 * renvoyées : l'équipe relaie (anti-désintermédiation, commission préparée).
 */
export async function contacter(body: unknown, headers: Headers, depot: DepotC, env: EnvCercles, attendre?: (p: Promise<unknown>) => void): Promise<Reponse> {
  const b = jsonObj(body);
  if (!accepter(`contact:${ipDe(headers)}`, 5, 10 * 60_000)) return erreur(429, "too_many_requests");
  if (typeof b.website === "string" && b.website.trim()) return { status: 201, json: { ok: true, message: MESSAGE_CONTACT } };
  const nom = clip(b.nom, 80);
  if (nom.length < 2) return erreur(400, "nom_invalide");
  const tel = telephone(b.telephone);
  if (!tel) return erreur(400, "phone_invalid");
  const email = clip(b.email, 160).toLowerCase() || null;
  if (email && !RE_EMAIL.test(email)) return erreur(400, "email_invalid");
  const message = clip(b.message, 1500);
  if (message.length < 5) return erreur(400, "message_requis");
  const f = await depot.fParSlug(clip(b.slug, 80));
  if (!f || f.statut !== "APPROVED") return erreur(404, "not_found");
  const objet = jsonObj(b.objet);
  const typeObjet = ["produit", "service", "fiche"].includes(String(objet.type)) ? String(objet.type) : null;
  const lang = ["fr", "ar", "en"].includes(String(b.lang)) ? String(b.lang) : "fr";
  const id = nouvelId("lead");
  await depot.leadInserer({
    id, nom, telephone: tel, email, ville: clip(b.ville, 80) || null, lang, pageContext: `/cercles/pro/${String(f.slug)}`,
    meta: {
      cercles: { fournisseurId: String(f.id), fournisseurSlug: String(f.slug), raisonSociale: String(f.raisonSociale), metier: String(f.metier),
        objet: typeObjet ? { type: typeObjet, id: clip(objet.id, 40), libelle: clip(objet.libelle, 140) } : null, message },
      idempotencyKey: clip(b.idempotencyKey, 80) || null, ip: ipDe(headers), ua: clip(headers.get("user-agent"), 300),
    },
    events: [{ at: maintenantIso(), kind: "CONTACT_PRO", payload: { fournisseurSlug: String(f.slug) } }],
  });
  const alerte = envoyerEmail(env, {
    to: destinatairesAdmin(env),
    subject: `Contact Cercles — ${nom} → ${String(f.raisonSociale)}`,
    text: `${nom} (${tel}) souhaite contacter ${String(f.raisonSociale)}.\n${message}\nÀ relayer : https://admin.citurbarea.com/cc/leads`,
    html: `<p><strong>${echapperHtml(nom)}</strong> souhaite contacter <strong>${echapperHtml(String(f.raisonSociale))}</strong>.</p><p>${echapperHtml(message)}</p><p><a href="https://admin.citurbarea.com/cc/leads">À relayer dans le back-office</a></p>`,
  });
  if (attendre) attendre(alerte);
  return { status: 201, json: { ok: true, message: MESSAGE_CONTACT } };
}
