/**
 * Vues des fiches produit et service (publique, propriétaire, admin) et du
 * fournisseur résumé dans le catalogue. Sans dépendance vers fournisseurs.ts
 * (évite un import circulaire). Aucune coordonnée de contact n'est exposée.
 *
 * Vues PUBLIQUES sans prix : aucun tarif nominatif d'un pro n'est publié
 * (docs/architecture/contrat-catalogue.md, confidentialité, loi 104-12) ; prix
 * sur demande via la plateforme, agrégats à partir de 3 pros dans le catalogue.
 */
import { documentsVerifies, type DocumentPro } from "../../apps/web/src/domain/cercles/gabarits";
import type { Ligne } from "./fournisseursDepot";

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const obj = (v: unknown): Ligne => (v && typeof v === "object" && !Array.isArray(v) ? (v as Ligne) : {});
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const jour = (v: unknown): string | null => { const s = iso(v); return s ? s.slice(0, 10) : null; };
const num = (v: unknown): number | null => (v == null ? null : Number(v));
const txt = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
export const ttc = (ht: number, tva: number) => Math.round(ht * (1 + tva / 100) * 100) / 100;

/** Fournisseur résumé (colonnes préfixées f… des requêtes publiques). */
export function fournisseurResume(p: Ligne) {
  return {
    slug: String(p.fSlug), raisonSociale: String(p.fNom), raisonSocialeAr: txt(p.fNomAr), ville: String(p.fVille), region: txt(p.fRegion),
    metier: String(p.fMetier), verifie: true, documentsVerifies: documentsVerifies(String(p.fMetier), (Array.isArray(p.fDocuments) ? p.fDocuments : []) as DocumentPro[]),
  };
}

export function vueProduitPublique(p: Ligne) {
  return {
    id: String(p.id), slug: String(p.slug), famille: String(p.famille), categorie: String(p.categorie),
    designationFr: txt(p.designationFr), designationAr: txt(p.designationAr), descriptionFr: txt(p.descriptionFr), descriptionAr: txt(p.descriptionAr),
    marque: txt(p.marque), modele: txt(p.modele), gamme: txt(p.gamme), caracteristiques: obj(p.caracteristiques),
    uniteVente: String(p.uniteVente), conditionnement: txt(p.conditionnement), uniteRef: String(p.uniteRef), facteur: Number(p.facteur),
    quantiteMin: num(p.quantiteMin), delaiJours: num(p.delaiJours), zones: liste(p.zones), disponibilite: String(p.disponibilite),
    validiteJusquau: jour(p.validiteJusquau), photos: liste(p.photos), ficheTechniqueUrl: txt(p.ficheTechniqueUrl), materiauCode: txt(p.materiauCode),
    misAJour: jour(p.updatedAt),
  };
}

export function vueProduitProprietaire(p: Ligne) {
  return {
    ...vueProduitPublique(p), prixHT: Number(p.prixHT), tvaPct: Number(p.tvaPct), prixTTC: ttc(Number(p.prixHT), Number(p.tvaPct)),
    prixRefHT: Number(p.prixRefHT), degressifs: Array.isArray(p.degressifs) ? p.degressifs : [], statut: String(p.statut), codePropose: txt(p.codePropose), signalement: txt(p.signalement),
    ecartRef: num(p.ecartRef), motifRejet: p.statut === "REJECTED" ? txt(p.motifRejet) : null,
  };
}

export function vueProduitAdmin(p: Ligne) {
  return {
    ...vueProduitProprietaire(p), motifRejet: txt(p.motifRejet), fournisseurId: String(p.fournisseurId), raisonSociale: txt(p.raisonSociale),
    ville: txt(p.ville), metier: txt(p.metier), statutFournisseur: txt(p.statutFournisseur), moderePar: txt(p.moderePar), modereLe: iso(p.modereLe),
    createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt),
  };
}

export function vueServicePublique(s: Ligne) {
  return {
    id: String(s.id), nature: String(s.nature), ouvrageCode: txt(s.ouvrageCode), prestationCode: txt(s.prestationCode),
    designationFr: txt(s.designationFr), designationAr: txt(s.designationAr), descriptionFr: txt(s.descriptionFr), descriptionAr: txt(s.descriptionAr),
    unite: String(s.unite), zones: liste(s.zones), delaiJours: num(s.delaiJours), conditions: txt(s.conditions), validiteJusquau: jour(s.validiteJusquau),
    photos: liste(s.photos), misAJour: jour(s.updatedAt),
  };
}

export function vueServiceProprietaire(s: Ligne) {
  return {
    ...vueServicePublique(s), prixHT: Number(s.prixHT), tvaPct: Number(s.tvaPct), prixTTC: ttc(Number(s.prixHT), Number(s.tvaPct)),
    statut: String(s.statut), signalement: txt(s.signalement), ecartRef: num(s.ecartRef), motifRejet: s.statut === "REJECTED" ? txt(s.motifRejet) : null,
  };
}

export function vueServiceAdmin(s: Ligne) {
  return {
    ...vueServiceProprietaire(s), motifRejet: txt(s.motifRejet), fournisseurId: String(s.fournisseurId), raisonSociale: txt(s.raisonSociale),
    ville: txt(s.ville), metier: txt(s.metier), statutFournisseur: txt(s.statutFournisseur), moderePar: txt(s.moderePar), modereLe: iso(s.modereLe),
    createdAt: iso(s.createdAt), updatedAt: iso(s.updatedAt),
  };
}
