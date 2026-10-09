/**
 * Logique Cercles fournisseurs : inscription, accès par code à usage unique,
 * profil, fiches de prix (saisie, import, historique), modération.
 * Indépendante du runtime : chaque fonction reçoit un `Depot`
 * (fournisseursDepot.ts) et renvoie une `Reponse`.
 *
 * Champs privés (téléphone, e-mail, ICE, code, idempotence, meta, events) :
 * jamais dans vuePublique ; seulement dans vueProprietaire (le fournisseur
 * connecté) et vueAdmin (back-office).
 */

import { CATALOGUE, materiau } from "../../apps/web/src/domain/materiaux/catalogue";
import { ecartReference, prixAberrant, prixParUniteRef, uniteVente } from "../../apps/web/src/domain/materiaux/conversions";
import { REGIONS_MA, regionDe } from "../../apps/web/src/domain/materiaux/regions";
import { CATEGORIES } from "../../apps/web/src/domain/materiaux/types";
import {
  accepter, clip, codeAcces, destinatairesAdmin, echapperHtml, envoyerEmail, erreur, hacherCode, ipDe, maintenantIso,
  nombre, nouvelId, RE_EMAIL, slugifier, telephone, urlHttps, type EnvCercles, type Reponse,
} from "./cercles";
import type { Depot, FicheEcrite, Ligne } from "./fournisseursDepot";

/** Métiers acceptés (sous-ensemble de l'enum ProMetier de prisma/schema.prisma). */
export const METIERS_PRO: Record<string, string> = {
  FOURNISSEUR_MATERIAUX: "Fournisseur / négociant de matériaux",
  ENTREPRISE_GO: "Entreprise de gros œuvre",
  ENTREPRISE_SECOND_OEUVRE: "Entreprise de second œuvre",
  ARTISAN_QUALIFIE: "Artisan qualifié",
  BET_STRUCTURE: "BET structure",
  BET_FLUIDES: "BET fluides",
  BET_VRD: "BET VRD",
  LABORATOIRE: "Laboratoire",
  TOPOGRAPHE: "Topographe",
  GEOMETRE: "Géomètre",
  CONTROLE_TECHNIQUE: "Bureau de contrôle",
};
export const METIERS_AVEC_FICHES = new Set(["FOURNISSEUR_MATERIAUX", "ENTREPRISE_GO", "ENTREPRISE_SECOND_OEUVRE", "ARTISAN_QUALIFIE"]);
export const STATUTS_FOURNISSEUR = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
const CODES_REGION = new Set<string>(REGIONS_MA.map((r) => r.code));

const CODE_TTL_MS = 15 * 60_000;
const CODE_ESSAIS = 5;
const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const jsonObj = (v: unknown): Ligne => (v && typeof v === "object" && !Array.isArray(v) ? (v as Ligne) : {});
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const jour = (v: unknown): string | null => { const s = iso(v); return s ? s.slice(0, 10) : null; };

function zonesValides(v: unknown, region: string | null): string[] {
  const z = [...new Set(liste(v).map((x) => (x === "national" ? x : regionDe(x) || "")).filter(Boolean))].slice(0, 12);
  if (z.includes("national")) return ["national"];
  return z.length ? z : region ? [region] : [];
}
const categoriesValides = (v: unknown): string[] => [...new Set(liste(v).filter((c) => c in CATEGORIES))];

// ───────────────────────── vues ─────────────────────────

/** Ce que tout visiteur peut voir : aucune coordonnée. */
export function vuePublique(f: Ligne) {
  return {
    slug: String(f.slug), raisonSociale: String(f.raisonSociale), metier: String(f.metier), metierLibelle: METIERS_PRO[String(f.metier)] || String(f.metier),
    ville: String(f.ville), region: (f.region as string) || null, zonesLivraison: liste(f.zonesLivraison), categories: liste(f.categories),
    logoUrl: (f.logoUrl as string) || null, description: (f.description as string) || null, verifie: f.statut === "APPROVED",
    membreDepuis: jour(f.createdAt),
  };
}

export function vueProprietaire(f: Ligne) {
  return {
    ...vuePublique(f), id: String(f.id), statut: String(f.statut), contactNom: (f.contactNom as string) || null,
    telephone: String(f.telephone), email: String(f.email), ice: (f.ice as string) || null, siteWeb: (f.siteWeb as string) || null,
    motifRejet: f.statut === "REJECTED" ? (f.motifRejet as string) || null : null,
  };
}

export function vueAdmin(f: Ligne) {
  const meta = jsonObj(f.meta);
  return {
    ...vueProprietaire(f), createdAt: iso(f.createdAt), updatedAt: iso(f.updatedAt), commissionPct: f.commissionPct ?? null,
    motifRejet: (f.motifRejet as string) || null, derniereConnexion: iso(f.derniereConnexion), nbFiches: Number(f.nbFiches ?? 0),
    codeDemandeLe: (meta.codeDemandeLe as string) || null, events: Array.isArray(f.events) ? f.events : [],
    fictif: meta.fictif === true,
  };
}

export function vueFiche(p: Ligne) {
  const ref = materiau(String(p.materiauCode));
  return {
    id: String(p.id), materiauCode: String(p.materiauCode), libelle: ref?.libelle || String(p.materiauCode), uniteRef: ref?.uniteRef || null,
    uniteVente: String(p.uniteVente), uniteVenteLibelle: (ref && uniteVente(ref, String(p.uniteVente))?.libelle) || String(p.uniteVente),
    prixHT: Number(p.prixHT), tvaPct: Number(p.tvaPct), prixTTC: Math.round(Number(p.prixHT) * (1 + Number(p.tvaPct) / 100) * 100) / 100,
    prixRefHT: Number(p.prixRefHT), quantiteMin: p.quantiteMin == null ? null : Number(p.quantiteMin),
    degressifs: Array.isArray(p.degressifs) ? p.degressifs : [], livraison: Array.isArray(p.livraison) ? p.livraison : [],
    disponibilite: String(p.disponibilite), validiteJusquau: jour(p.validiteJusquau), marque: (p.marque as string) || null, note: (p.note as string) || null,
    statut: String(p.statut), signalement: (p.signalement as string) || null, ecartRef: p.ecartRef == null ? null : Number(p.ecartRef),
    updatedAt: iso(p.updatedAt),
  };
}

// ───────────────────────── inscription ─────────────────────────

export const MESSAGE_INSCRIPTION =
  "Inscription reçue. L'équipe CITURBAREA vérifie votre profil (sous 48 h ouvrées). Si cette adresse est déjà inscrite, utilisez « Accéder à mon espace ».";

export async function inscrire(body: unknown, headers: Headers, depot: Depot, env: EnvCercles, attendre?: (p: Promise<unknown>) => void): Promise<Reponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return erreur(400, "payload_invalid");
  const b = body as Ligne;
  if (!accepter(`ins:${ipDe(headers)}`, 5, 10 * 60_000)) return erreur(429, "too_many_requests");
  // Pot de miel : même réponse qu'un succès, rien n'est écrit.
  if (typeof b.website === "string" && b.website.trim()) return { status: 201, json: { ok: true, message: MESSAGE_INSCRIPTION } };

  const metier = clip(b.metier, 40);
  if (!(metier in METIERS_PRO)) return erreur(400, "metier_invalid");
  const raisonSociale = clip(b.raisonSociale, 120);
  if (raisonSociale.length < 2) return erreur(400, "raison_sociale_invalid");
  const ville = clip(b.ville, 80);
  if (ville.length < 2) return erreur(400, "ville_invalid");
  const tel = telephone(b.telephone);
  if (!tel) return erreur(400, "phone_invalid");
  const email = clip(b.email, 160).toLowerCase();
  if (!RE_EMAIL.test(email)) return erreur(400, "email_invalid");
  const iceBrut = clip(b.ice, 20).replace(/\s/g, "");
  if (iceBrut && !/^\d{15}$/.test(iceBrut)) return erreur(400, "ice_invalid");
  if (b.accepteConditions !== true) return erreur(400, "conditions_required");
  const logoUrl = b.logoUrl ? urlHttps(b.logoUrl) : null;
  if (b.logoUrl && !logoUrl) return erreur(400, "logo_invalid");
  const siteWeb = b.siteWeb ? urlHttps(b.siteWeb) : null;
  const region = regionDe(ville);
  const idempotencyKey = clip(b.idempotencyKey, 80) || null;

  if (idempotencyKey && (await depot.fParIdempotence(idempotencyKey))) return { status: 201, json: { ok: true, message: MESSAGE_INSCRIPTION } };
  // Adresse déjà inscrite : même réponse (pas d'énumération des comptes).
  if (await depot.fParEmail(email)) return { status: 201, json: { ok: true, message: MESSAGE_INSCRIPTION } };

  let slug = slugifier(`${raisonSociale} ${ville}`);
  for (let i = 2; await depot.fSlugPris(slug); i++) slug = `${slugifier(`${raisonSociale} ${ville}`)}-${i}`.slice(0, 64);

  const id = nouvelId("frn");
  const fictif = /\b(test|fictif|démo|demo)\b/i.test(raisonSociale);
  await depot.fInserer({
    id, metier, raisonSociale, slug, contactNom: clip(b.contactNom, 80) || null, ice: iceBrut || null, ville, region,
    zonesLivraison: zonesValides(b.zonesLivraison, region), categories: categoriesValides(b.categories), telephone: tel, email,
    logoUrl, siteWeb, description: clip(b.description, 1000) || null, idempotencyKey,
    events: [{ at: maintenantIso(), kind: "INSCRIPTION", payload: { metier } }],
    meta: { ip: ipDe(headers), ua: clip(headers.get("user-agent"), 300), conditionsAccepteesLe: maintenantIso(), ...(fictif ? { fictif: true } : {}) },
  });

  const alerte = envoyerEmail(env, {
    to: destinatairesAdmin(env),
    subject: `Nouvelle inscription Cercles — ${raisonSociale} (${ville})`,
    text: `${METIERS_PRO[metier]} — ${raisonSociale}, ${ville}\nÀ valider : https://admin.citurbarea.com/cc/fournisseurs`,
    html: `<p>${echapperHtml(METIERS_PRO[metier])} — <strong>${echapperHtml(raisonSociale)}</strong>, ${echapperHtml(ville)}</p><p><a href="https://admin.citurbarea.com/cc/fournisseurs">Valider dans le back-office</a></p>`,
  });
  if (attendre) attendre(alerte);
  return { status: 201, json: { ok: true, message: MESSAGE_INSCRIPTION } };
}

// ───────────────────────── accès par code ─────────────────────────

export const MESSAGE_CODE = "Si un espace existe pour cette adresse, un code d'accès vient d'être envoyé.";
export const MESSAGE_CODE_ADMIN = "Si un espace existe pour cette adresse, l'équipe CITURBAREA vous transmet votre code d'accès (téléphone ou WhatsApp) sous 24 h ouvrées.";

const accesOuvert = (f: Ligne | null): f is Ligne => !!f && (f.statut === "PENDING" || f.statut === "APPROVED");

export function messageCode(code: string, email: string, origine: string) {
  const lien = `${origine}/cercles/espace#email=${encodeURIComponent(email)}&code=${code}`;
  return {
    subject: `Votre code d'accès CITURBAREA : ${code}`,
    text: `Votre code d'accès à l'espace fournisseur CITURBAREA : ${code}\nValable 15 minutes.\n\nOu ouvrez : ${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: `<p>Votre code d'accès à l'espace fournisseur CITURBAREA :</p><p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p><p>Valable 15 minutes. <a href="${echapperHtml(lien)}">Ouvrir mon espace</a></p><p style="color:#666">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
  };
}

/** Émet un code (haché en base). Avec Resend : envoyé au fournisseur ; sans : demande signalée à l'admin. */
export async function demanderCode(body: unknown, headers: Headers, depot: Depot, env: EnvCercles, secret: string, origine: string): Promise<Reponse> {
  const email = clip(jsonObj(body).email, 160).toLowerCase();
  if (!RE_EMAIL.test(email)) return erreur(400, "email_invalid");
  if (!accepter(`code:${ipDe(headers)}`, 5, 15 * 60_000) || !accepter(`code:${email}`, 3, 15 * 60_000)) return erreur(429, "too_many_requests");
  const avecEmail = !!env.RESEND_API_KEY;
  const f = await depot.fParEmail(email);
  if (accesOuvert(f)) {
    const id = String(f.id);
    if (avecEmail) {
      const code = codeAcces();
      await depot.fMajCode(id, await hacherCode(secret, id, code), new Date(Date.now() + CODE_TTL_MS).toISOString());
      await envoyerEmail(env, { to: [email], ...messageCode(code, email, origine) });
    } else {
      await depot.fMajCode(id, null, null, { codeDemandeLe: maintenantIso() });
      await envoyerEmail(env, {
        to: destinatairesAdmin(env), subject: `Demande de code d'accès — ${String(f.raisonSociale)}`,
        text: "Générer le code dans le back-office : https://admin.citurbarea.com/cc/fournisseurs", html: "",
      });
    }
  }
  return { status: 200, json: { ok: true, envoi: avecEmail ? "email" : "admin", message: avecEmail ? MESSAGE_CODE : MESSAGE_CODE_ADMIN } };
}

/** Code saisi → identifiant du fournisseur si valide (consommé), sinon erreur uniforme. */
export async function verifierCode(body: unknown, headers: Headers, depot: Depot, secret: string, maintenant = Date.now()): Promise<{ id: string } | Reponse> {
  const b = jsonObj(body);
  const email = clip(b.email, 160).toLowerCase();
  const code = clip(b.code, 12).replace(/\s/g, "");
  if (!accepter(`verif:${ipDe(headers)}`, 10, 15 * 60_000)) return erreur(429, "too_many_requests");
  const refus = erreur(401, "code_invalid");
  if (!RE_EMAIL.test(email) || !/^\d{6}$/.test(code)) return refus;
  const f = await depot.fParEmail(email);
  if (!accesOuvert(f) || !f.codeHash || !f.codeExpire) return refus;
  const id = String(f.id);
  if (Number(f.codeTentatives) >= CODE_ESSAIS || new Date(String(iso(f.codeExpire))).getTime() < maintenant) return erreur(401, "code_expired");
  if ((await hacherCode(secret, id, code)) !== f.codeHash) { await depot.fTentative(id); return refus; }
  await depot.fConnecte(id);
  return { id };
}

/** Back-office : code généré pour être transmis par l'administration (sans Resend). */
export async function codePourAdmin(id: string, depot: Depot, secret: string): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!f) return erreur(404, "not_found");
  if (!accesOuvert(f)) return erreur(409, "statut_incompatible");
  const code = codeAcces();
  const expire = new Date(Date.now() + 24 * 3600_000).toISOString();
  await depot.fMajCode(id, await hacherCode(secret, id, code), expire);
  return { status: 200, json: { ok: true, code, expire, email: String(f.email), telephone: String(f.telephone) } };
}

// ───────────────────────── espace fournisseur ─────────────────────────

export async function moi(id: string, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const fiches = (await depot.pLister(id)).map(vueFiche);
  return { status: 200, json: { ok: true, fournisseur: vueProprietaire(f), fiches, peutPublierFiches: METIERS_AVEC_FICHES.has(String(f.metier)) } };
}

export async function majProfil(id: string, body: unknown, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const b = jsonObj(body);
  const ville = b.ville === undefined ? String(f.ville) : clip(b.ville, 80);
  if (ville.length < 2) return erreur(400, "ville_invalid");
  const tel = b.telephone === undefined ? String(f.telephone) : telephone(b.telephone);
  if (!tel) return erreur(400, "phone_invalid");
  const ice = b.ice === undefined ? ((f.ice as string) || null) : clip(b.ice, 20).replace(/\s/g, "") || null;
  if (ice && !/^\d{15}$/.test(ice)) return erreur(400, "ice_invalid");
  const logoUrl = b.logoUrl === undefined ? ((f.logoUrl as string) || null) : b.logoUrl ? urlHttps(b.logoUrl) : null;
  if (b.logoUrl && !logoUrl) return erreur(400, "logo_invalid");
  const region = regionDe(ville);
  const maj = await depot.fMajProfil(id, {
    contactNom: b.contactNom === undefined ? ((f.contactNom as string) || null) : clip(b.contactNom, 80) || null,
    ville, region, zonesLivraison: b.zonesLivraison === undefined ? liste(f.zonesLivraison) : zonesValides(b.zonesLivraison, region),
    categories: b.categories === undefined ? liste(f.categories) : categoriesValides(b.categories), telephone: tel, logoUrl,
    siteWeb: b.siteWeb === undefined ? ((f.siteWeb as string) || null) : urlHttps(b.siteWeb),
    description: b.description === undefined ? ((f.description as string) || null) : clip(b.description, 1000) || null, ice,
  });
  return { status: 200, json: { ok: true, fournisseur: vueProprietaire(maj || f) } };
}

// ───────────────────────── fiches de prix ─────────────────────────

export const DISPONIBILITES = ["EN_STOCK", "SUR_COMMANDE", "RUPTURE"];
export const TAUX_TVA = [0, 7, 10, 14, 20];

type Validation = { ok: true; fiche: Omit<FicheEcrite, "id" | "fournisseurId"> } | { ok: false; error: string };

/** Valide une fiche (saisie ou ligne d'import) et calcule prix par uniteRef, écart et signalement. */
export function validerFiche(b: Ligne, aujourdhui = new Date()): Validation {
  const code = clip(b.materiauCode, 20).toUpperCase();
  const ref = materiau(code);
  if (!ref || ref.actif === false) return { ok: false, error: "materiau_inconnu" };
  const unite = clip(b.uniteVente, 30) || ref.uniteRef;
  if (!uniteVente(ref, unite)) return { ok: false, error: "unite_invalide" };
  const prixHT = nombre(b.prixHT);
  if (prixHT === null || prixHT <= 0 || prixHT > 10_000_000) return { ok: false, error: "prix_invalide" };
  const tvaPct = b.tvaPct === undefined || b.tvaPct === "" ? 20 : nombre(b.tvaPct);
  if (tvaPct === null || !TAUX_TVA.includes(tvaPct)) return { ok: false, error: "tva_invalide" };
  const quantiteMin = nombre(b.quantiteMin);
  if (quantiteMin !== null && (quantiteMin < 0 || quantiteMin > 1e7)) return { ok: false, error: "quantite_min_invalide" };

  const degressifs: { aPartirDe: number; prixHT: number }[] = [];
  for (const d of Array.isArray(b.degressifs) ? b.degressifs.slice(0, 5) : []) {
    const q = nombre(jsonObj(d).aPartirDe), p = nombre(jsonObj(d).prixHT);
    if (q === null || p === null || q <= 0 || p <= 0 || p > prixHT) return { ok: false, error: "degressif_invalide" };
    degressifs.push({ aPartirDe: q, prixHT: p });
  }
  degressifs.sort((x, y) => x.aPartirDe - y.aPartirDe);
  for (let i = 1; i < degressifs.length; i++) if (degressifs[i].prixHT > degressifs[i - 1].prixHT) return { ok: false, error: "degressif_invalide" };

  const livraison: { zone: string; frais: number; delaiJours: number | null }[] = [];
  for (const l of Array.isArray(b.livraison) ? b.livraison.slice(0, 15) : []) {
    const o = jsonObj(l);
    const zone = clip(o.zone, 60) === "national" ? "national" : regionDe(clip(o.zone, 60)) || clip(o.zone, 60);
    const frais = nombre(o.frais) ?? 0, delai = nombre(o.delaiJours);
    if (!zone || frais < 0 || frais > 1e6 || (delai !== null && (delai < 0 || delai > 180))) return { ok: false, error: "livraison_invalide" };
    livraison.push({ zone, frais, delaiJours: delai === null ? null : Math.round(delai) });
  }

  const disponibilite = clip(b.disponibilite, 20) || "EN_STOCK";
  if (!DISPONIBILITES.includes(disponibilite)) return { ok: false, error: "disponibilite_invalide" };
  let validite = clip(b.validiteJusquau, 10);
  const j0 = aujourdhui.toISOString().slice(0, 10);
  if (!validite) validite = new Date(aujourdhui.getTime() + 90 * 86400_000).toISOString().slice(0, 10);
  if (!ISO_JOUR.test(validite) || Number.isNaN(Date.parse(validite)) || validite < j0) return { ok: false, error: "validite_invalide" };
  if (Date.parse(validite) - aujourdhui.getTime() > 400 * 86400_000) return { ok: false, error: "validite_invalide" };

  const prixRefHT = prixParUniteRef(code, unite, prixHT) as number;
  const ecart = ecartReference(code, prixRefHT);
  const aberrant = prixAberrant(code, prixRefHT);
  return {
    ok: true,
    fiche: {
      materiauCode: code, uniteVente: unite, prixHT, tvaPct, prixRefHT, quantiteMin, degressifs, livraison, disponibilite,
      validiteJusquau: validite, marque: clip(b.marque, 80) || null, note: clip(b.note, 500) || null,
      // Prix hors ±50 % de la référence : enregistré, mais en vérification (hors médiane) jusqu'à la modération.
      statut: aberrant ? "PENDING" : "APPROVED", signalement: aberrant ? (ecart! > 0 ? "ABERRANT_HAUT" : "ABERRANT_BAS") : null, ecartRef: ecart,
    },
  };
}

async function ecrireFiche(id: string, f: Ligne, b: Ligne, depot: Depot): Promise<{ ok: true; fiche: Ligne } | { ok: false; error: string }> {
  const v = validerFiche(b);
  if (!v.ok) return v;
  const avant = await depot.pParMateriau(id, v.fiche.materiauCode);
  const ligne = await depot.pEnregistrer({ id: (avant?.id as string) || nouvelId("sp"), fournisseurId: id, ...v.fiche });
  await depot.pHistoriser({
    priceId: String(ligne.id), fournisseurId: id, materiauCode: v.fiche.materiauCode, action: avant ? "MISE_A_JOUR" : "CREATION",
    auteur: `fournisseur:${id}`, prixHT: v.fiche.prixHT, prixRefHT: v.fiche.prixRefHT, uniteVente: v.fiche.uniteVente,
    donnees: { ...v.fiche, avant: avant ? { prixHT: avant.prixHT, uniteVente: avant.uniteVente } : null, raisonSociale: f.raisonSociale },
  });
  return { ok: true, fiche: ligne };
}

export async function enregistrerFiche(id: string, body: unknown, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  if (!METIERS_AVEC_FICHES.has(String(f.metier))) return erreur(403, "metier_sans_fiches");
  const r = await ecrireFiche(id, f, jsonObj(body), depot);
  if (!r.ok) return erreur(400, r.error);
  return { status: 200, json: { ok: true, fiche: vueFiche(r.fiche) } };
}

export const IMPORT_MAX = 300;

export async function importerFiches(id: string, body: unknown, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  if (!METIERS_AVEC_FICHES.has(String(f.metier))) return erreur(403, "metier_sans_fiches");
  const lignes = jsonObj(body).lignes;
  if (!Array.isArray(lignes) || !lignes.length) return erreur(400, "aucune_ligne");
  if (lignes.length > IMPORT_MAX) return erreur(400, "trop_de_lignes", { max: IMPORT_MAX });
  const resultats: { ligne: number; ok: boolean; materiauCode?: string; error?: string; signalement?: string | null }[] = [];
  const vus = new Set<string>();
  for (let i = 0; i < lignes.length; i++) {
    const b = jsonObj(lignes[i]);
    const code = clip(b.materiauCode, 20).toUpperCase();
    if (vus.has(code)) { resultats.push({ ligne: i + 1, ok: false, materiauCode: code, error: "doublon" }); continue; }
    vus.add(code);
    const r = await ecrireFiche(id, f, b, depot);
    resultats.push(r.ok
      ? { ligne: i + 1, ok: true, materiauCode: code, signalement: (r.fiche.signalement as string) || null }
      : { ligne: i + 1, ok: false, materiauCode: code, error: r.error });
  }
  return { status: 200, json: { ok: true, importees: resultats.filter((r) => r.ok).length, erreurs: resultats.filter((r) => !r.ok).length, resultats } };
}

export async function supprimerFiche(id: string, ficheId: string, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(id);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const p = await depot.pSupprimer(id, ficheId);
  if (!p) return erreur(404, "not_found");
  await depot.pHistoriser({ priceId: ficheId, fournisseurId: id, materiauCode: String(p.materiauCode), action: "SUPPRESSION", auteur: `fournisseur:${id}`, prixHT: Number(p.prixHT), prixRefHT: Number(p.prixRefHT), uniteVente: String(p.uniteVente), donnees: null });
  return { status: 200, json: { ok: true } };
}

export async function historiqueFiche(id: string, ficheId: string, depot: Depot): Promise<Reponse> {
  const fiches = await depot.pLister(id);
  if (!fiches.some((p) => p.id === ficheId)) return erreur(404, "not_found");
  const h = await depot.pHistorique(ficheId);
  return { status: 200, json: { ok: true, historique: h.map((x) => ({ at: iso(x.at), action: x.action, prixHT: x.prixHT, uniteVente: x.uniteVente, prixRefHT: x.prixRefHT })) } };
}

// ───────────────────────── modération (back-office) ─────────────────────────

export async function listerPourAdmin(statut: string | null, depot: Depot): Promise<Reponse> {
  if (statut && !STATUTS_FOURNISSEUR.includes(statut)) return erreur(400, "statut_invalide");
  return { status: 200, json: { ok: true, fournisseurs: (await depot.fLister(statut)).map(vueAdmin) } };
}

export async function modererFournisseur(id: string, body: unknown, auteur: string, depot: Depot): Promise<Reponse> {
  const b = jsonObj(body);
  const statut = clip(b.statut, 20);
  if (!STATUTS_FOURNISSEUR.includes(statut)) return erreur(400, "statut_invalide");
  const motif = clip(b.motif, 500) || null;
  if (statut === "REJECTED" && !motif) return erreur(400, "motif_requis");
  let commissionPct: number | null | undefined;
  if (b.commissionPct !== undefined) {
    commissionPct = b.commissionPct === null || b.commissionPct === "" ? null : nombre(b.commissionPct);
    if (commissionPct !== null && (commissionPct === undefined || commissionPct < 0 || commissionPct > 30)) return erreur(400, "commission_invalide");
  }
  const f = await depot.fModerer(id, statut, statut === "APPROVED" ? null : motif, commissionPct, { at: maintenantIso(), kind: "MODERATION", payload: { statut, motif, auteur } });
  if (!f) return erreur(404, "not_found");
  return { status: 200, json: { ok: true, fournisseur: vueAdmin(f) } };
}

export async function fichesAModerer(depot: Depot): Promise<Reponse> {
  const lignes = await depot.pAModerer();
  return {
    status: 200,
    json: {
      ok: true,
      fiches: lignes.map((p) => {
        const ref = materiau(String(p.materiauCode));
        return { ...vueFiche(p), fournisseurId: String(p.fournisseurId), raisonSociale: String(p.raisonSociale), ville: String(p.ville),
          statutFournisseur: String(p.statutFournisseur), prixReference: ref ? ref.prix.ref : null };
      }),
    },
  };
}

export async function modererFiche(ficheId: string, body: unknown, auteur: string, depot: Depot): Promise<Reponse> {
  const statut = clip(jsonObj(body).statut, 20);
  if (!["APPROVED", "REJECTED"].includes(statut)) return erreur(400, "statut_invalide");
  const p = await depot.pModerer(ficheId, statut, auteur);
  if (!p) return erreur(404, "not_found");
  await depot.pHistoriser({ priceId: ficheId, fournisseurId: String(p.fournisseurId), materiauCode: String(p.materiauCode), action: "MODERATION", auteur: `admin:${auteur}`, prixHT: Number(p.prixHT), prixRefHT: Number(p.prixRefHT), uniteVente: String(p.uniteVente), donnees: { statut } });
  return { status: 200, json: { ok: true, fiche: vueFiche(p) } };
}

/** Matériaux proposables à la saisie (catalogue actif), pour l'aide et le modèle CSV. */
export const materiauxSaisissables = () => CATALOGUE.filter((r) => r.actif !== false);
