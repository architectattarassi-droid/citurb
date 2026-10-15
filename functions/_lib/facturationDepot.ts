/**
 * Acceptation des devis, échéancier par phase, factures, encaissements, avoirs
 * et état des paiements (Neon) — spec Devis & Facturation §1.9, §6, §7 ;
 * décision du 15/10/2026 : chaque phase démarre après paiement de son échéance.
 * Contrat : docs/architecture/contrat-devis-facturation.md (section Facturation).
 *
 * Numérotation FAC / AVO : le numéro est alloué DANS l'instruction qui crée la
 * facture émise (compteur "SequenceDocument") : si l'insertion échoue, rien
 * n'est consommé — séquence sans trou. Une facture émise est immuable ;
 * correction par avoir uniquement (règle 5).
 */
import { calculerDevisComplet } from "../../apps/web/src/domain/honoraires/devisComplet";
import { Dec } from "../../apps/web/src/domain/honoraires/decimal";
import { empreinteDocument } from "../../apps/web/src/domain/honoraires/documentDevis";
import { construireDocumentFacture, type ContexteFacture } from "../../apps/web/src/domain/honoraires/documentFacture";
import {
  DELAI_PAIEMENT_DEFAUT, PHASES_PAIEMENT, TVA_DEFAUT, echeancierParDefaut, etatPaiementPhases, lignesAcceptees, statutFacture, totauxFacture, verifierEcheancier,
  type EcheanceEtat, type FactureEtat, type LigneAcceptee, type PhasePaiement,
} from "../../apps/web/src/domain/honoraires/facturation";
import { GRILLES } from "../../apps/web/src/domain/honoraires/grilleArcBati";
import type { DefinitionPack } from "../../apps/web/src/domain/honoraires/types";
import { phaseDuCatalogue } from "../../packages/contracts/src/gestion/referentiel";
import { GRILLE_COURANTE, contexteDevis, lireDevis } from "./devisDepot";
import { journaliser, type Sql } from "./dossierAdmin";
import { OCTETS_PAR_OBJET, depotDocumentsNeon, validerDocument } from "./documents";
import { depuisBase64 } from "./images";

export class RefusFacturation extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: string[]) { super(message); }
}

const s = (v: unknown) => (v == null ? null : String(v));
const dec2 = (v: unknown) => Dec.de(String(v ?? "0")).fixe2();
const id = (p: string) => `${p}${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
const jour = (iso: string) => iso.slice(0, 10);
const plusJours = (j: string, n: number) => { const d = new Date(`${j}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const libellePhase = (code: string) => PHASES_PAIEMENT.find((p) => p.code === code)?.libelle ?? code;

export async function tablesFacturation(sql: Sql): Promise<boolean> {
  const r = await sql`SELECT to_regclass('public."EcheancePaiement"') IS NOT NULL AS e, to_regclass('public."Facture"') IS NOT NULL AS f,
    to_regclass('public."Encaissement"') IS NOT NULL AS n, to_regclass('public."DeblocagePaiement"') IS NOT NULL AS d,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Devis' AND column_name = 'montantAccepte') AS c`;
  const x = r[0] || {};
  return !!x.e && !!x.f && !!x.n && !!x.d && !!x.c;
}

// ── Acceptation ─────────────────────────────────────────────────────────

export type PreuveAcceptation =
  | { type: "SIGNE_SCANNE"; documentId: string; saisiPar: string }
  | { type: "EN_LIGNE"; horodatage: string; clientId: string; empreinteDevis: string | null };

export interface Acceptation {
  pack: DefinitionPack["code"] | null;
  commandees: string[];
  inclureHorsHonoraires: boolean;
  dateAcceptation: string;
  preuve: PreuveAcceptation;
}

/** Devis émis → ACCEPTE : lignes acceptées figées, échéancier par défaut créé (modifiable ensuite). */
export async function accepterDevis(sql: Sql, devisId: string, a: Acceptation, auteur: string, maintenant: string): Promise<{ montantAccepte: string; echeances: number }> {
  const d = await lireDevis(sql, devisId, jour(maintenant));
  if (!d) throw new RefusFacturation(404, "not_found", "Devis introuvable");
  if (d.statut !== "EMIS") throw new RefusFacturation(409, "statut_invalide", "Seul un devis émis peut être accepté.");
  if (d.statutEffectif === "EXPIRE") throw new RefusFacturation(409, "devis_expire", "Devis expiré : émettre une révision avant acceptation.");
  if (d.remplacePar) throw new RefusFacturation(409, "devis_remplace", "Ce devis a été remplacé par une révision.");
  const ctx = await contexteDevis(sql, d.dossierId);
  if (!ctx) throw new RefusFacturation(404, "not_found", "Dossier introuvable");
  const grille = GRILLES[d.grilleVersionId] ?? GRILLE_COURANTE;
  const calc = calculerDevisComplet(d.entree, grille, ctx);
  if (!calc.ok || (d.montantTotal && !calc.resultat.totalToutesPrestations.egal(d.montantTotal))) {
    throw new RefusFacturation(409, "devis_a_reviser", "Les données du dossier ont changé depuis l'émission : émettre une révision.");
  }
  const l = lignesAcceptees(calc.resultat, grille, { pack: a.pack, commandees: a.commandees, inclureHorsHonoraires: a.inclureHorsHonoraires });
  if (!l.ok) throw new RefusFacturation(400, "acceptation_invalide", l.erreur);

  const u = await sql`UPDATE "Devis" SET "statut" = 'ACCEPTE', "packChoisi" = ${a.pack}, "dateAcceptation" = ${a.dateAcceptation}::timestamp(3),
      "preuveAcceptation" = ${JSON.stringify(a.preuve)}::jsonb, "montantAccepte" = ${l.total.fixe2()}::numeric, "lignesAcceptees" = ${JSON.stringify(l.lignes)}::jsonb,
      "updatedAt" = ${maintenant}::timestamp(3)
    WHERE "id" = ${devisId} AND "statut" = 'EMIS' RETURNING "id"`;
  if (!u.length) throw new RefusFacturation(409, "statut_invalide", "Devis déjà accepté ou modifié entre-temps.");

  const ech = echeancierParDefaut(l.lignes, d.entree.modalitesPaiement);
  for (const e of ech) {
    await sql`INSERT INTO "EcheancePaiement" ("id", "dossierId", "devisId", "phaseCode", "ordre", "libelle", "montantHT", "declencheur", "prestations", "createdAt", "updatedAt")
      VALUES (${id("ech_")}, ${d.dossierId}, ${devisId}, ${e.phaseCode}, ${e.ordre}, ${e.libelle}, ${e.montantHT}::numeric, ${e.declencheur}, ${JSON.stringify(e.prestations)}::jsonb, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))`;
  }
  await journaliser(sql, d.dossierId, auteur, "DEVIS_ACCEPTE", {
    devisId, numero: d.numero, pack: a.pack, montantAccepte: l.total.fixe2(), preuve: a.preuve.type, echeances: ech.map((e) => `${e.phaseCode}:${e.montantHT}`),
  }, maintenant);
  return { montantAccepte: l.total.fixe2(), echeances: ech.length };
}

// ── Échéancier ──────────────────────────────────────────────────────────

export interface EcheanceSaisie { id?: string; phaseCode: string; libelle: string; montantHT: string; declencheur: "SIGNATURE" | "DEBUT_PHASE" }

/** Remplace l'échéancier d'un devis accepté. Les échéances déjà facturées restent identiques ; somme = montant accepté. */
export async function remplacerEcheancier(sql: Sql, devisId: string, saisies: EcheanceSaisie[], auteur: string, maintenant: string): Promise<void> {
  const d = (await sql`SELECT "dossierId", "statut", "montantAccepte" FROM "Devis" WHERE "id" = ${devisId}`)[0];
  if (!d || !["ACCEPTE", "FACTURE"].includes(String(d.statut))) throw new RefusFacturation(409, "statut_invalide", "Échéancier modifiable seulement sur un devis accepté.");
  const actuelles = await sql`SELECT e.*, EXISTS (SELECT 1 FROM "Facture" f WHERE f."echeanceId" = e."id" AND f."type" <> 'AVOIR' AND f."statut" <> 'ANNULEE') AS "facturee"
    FROM "EcheancePaiement" e WHERE e."devisId" = ${devisId}`;
  const erreurs = verifierEcheancier(saisies, String(d.montantAccepte));
  for (const f of actuelles.filter((x) => x.facturee)) {
    const x = saisies.find((y) => y.id === f.id);
    if (!x || x.phaseCode !== f.phaseCode || !Dec.de(x.montantHT).egal(String(f.montantHT))) erreurs.push(`L'échéance « ${String(f.libelle)} » est déjà facturée : elle ne peut être ni modifiée ni supprimée (avoir d'abord).`);
  }
  if (saisies.some((x) => x.id && !actuelles.some((a) => a.id === x.id))) erreurs.push("Échéance inconnue");
  if (erreurs.length) throw new RefusFacturation(400, "echeancier_invalide", "Échéancier refusé.", erreurs);

  const garder = new Set(saisies.map((x) => x.id).filter(Boolean));
  for (const a of actuelles) if (!a.facturee && !garder.has(String(a.id))) await sql`DELETE FROM "EcheancePaiement" WHERE "id" = ${String(a.id)}`;
  let ordre = 0;
  for (const x of [...saisies].sort((p, q) => PHASES_PAIEMENT.findIndex((z) => z.code === p.phaseCode) - PHASES_PAIEMENT.findIndex((z) => z.code === q.phaseCode))) {
    ordre++;
    const deja = actuelles.find((a) => a.id === x.id);
    if (deja?.facturee) { await sql`UPDATE "EcheancePaiement" SET "ordre" = ${ordre} WHERE "id" = ${String(deja.id)}`; continue; }
    if (deja) {
      await sql`UPDATE "EcheancePaiement" SET "phaseCode" = ${x.phaseCode}, "libelle" = ${x.libelle}, "montantHT" = ${Dec.de(x.montantHT).fixe2()}::numeric, "declencheur" = ${x.declencheur}, "ordre" = ${ordre}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${String(deja.id)}`;
    } else {
      await sql`INSERT INTO "EcheancePaiement" ("id", "dossierId", "devisId", "phaseCode", "ordre", "libelle", "montantHT", "declencheur", "prestations", "createdAt", "updatedAt")
        VALUES (${id("ech_")}, ${String(d.dossierId)}, ${devisId}, ${x.phaseCode}, ${ordre}, ${x.libelle}, ${Dec.de(x.montantHT).fixe2()}::numeric, ${x.declencheur}, '[]'::jsonb, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))`;
    }
  }
  await journaliser(sql, String(d.dossierId), auteur, "ECHEANCIER_MODIFIE", {
    devisId,
    avant: actuelles.map((a) => `${String(a.phaseCode)}:${dec2(a.montantHT)}`),
    apres: saisies.map((x) => `${x.phaseCode}:${Dec.de(x.montantHT).fixe2()}`),
  }, maintenant);
}

// ── Factures ────────────────────────────────────────────────────────────

async function contexteFacture(sql: Sql, f: Record<string, unknown>): Promise<ContexteFacture> {
  const ctx = await contexteDevis(sql, String(f.dossierId));
  const dv = f.devisId ? (await sql`SELECT "numero", to_char("dateAcceptation", 'YYYY-MM-DD') AS "acc" FROM "Devis" WHERE "id" = ${String(f.devisId)}`)[0] : null;
  const ech = f.echeanceId ? (await sql`SELECT "libelle", "phaseCode" FROM "EcheancePaiement" WHERE "id" = ${String(f.echeanceId)}`)[0] : null;
  const ori = f.factureOrigineId ? (await sql`SELECT "numero", to_char("dateEmission", 'YYYY-MM-DD') AS "de" FROM "Facture" WHERE "id" = ${String(f.factureOrigineId)}`)[0] : null;
  const client = (await sql`SELECT "clientAdresse", "clientVille" FROM "Dossier" WHERE "id" = ${String(f.dossierId)}`)[0];
  const doc = ctx?.document;
  return {
    numero: String(f.numero), type: String(f.type) as ContexteFacture["type"], dateEmission: String(f.de), dateEcheance: String(f.dech),
    client: { ...(doc?.client ?? { nomAffiche: "", type: "PERSONNE" }), adresse: s(client?.clientAdresse), ville: s(client?.clientVille) },
    projet: doc?.projet ?? { intitule: "", commune: "" },
    architecte: doc?.architecte ?? null,
    devis: dv?.numero ? { numero: String(dv.numero), dateAcceptation: s(dv.acc) } : null,
    echeance: ech ? { libelle: String(ech.libelle), phase: libellePhase(String(ech.phaseCode)) } : null,
    factureOrigine: ori ? { numero: String(ori.numero), dateEmission: String(ori.de) } : null,
    motif: s(f.motif),
    lignes: (f.lignes as ContexteFacture["lignes"]) ?? [],
    tauxTVA: Dec.de(String(f.tauxTVA)).toString(),
    retenueSource: f.retenueSource != null ? dec2(f.retenueSource) : null,
  };
}

async function figerDocument(sql: Sql, factureId: string): Promise<{ numero: string; hash: string }> {
  const f = (await sql`SELECT *, to_char("dateEmission", 'YYYY-MM-DD') AS "de", to_char("dateEcheance", 'YYYY-MM-DD') AS "dech" FROM "Facture" WHERE "id" = ${factureId}`)[0];
  const document = construireDocumentFacture(await contexteFacture(sql, f));
  const hash = await empreinteDocument(document);
  await sql`UPDATE "Facture" SET "document" = ${JSON.stringify(document)}::jsonb, "hashContenu" = ${hash} WHERE "id" = ${factureId} AND "document" IS NULL`;
  return { numero: String(f.numero), hash };
}

const estConflit = (e: unknown) => (e as { code?: string })?.code === "23505";

/** Facture d'une échéance : FAC-AAAA-NNNN, au nom de CITURBAREA / HSE DECO. */
export async function emettreFacture(sql: Sql, echeanceId: string, o: { dateEcheance?: string; tauxTVA?: string; retenue?: string }, auteur: string, maintenant: string): Promise<{ numero: string; hash: string; factureId: string }> {
  const e = (await sql`SELECT e.*, d."numero" AS "devisNumero", d."statut" AS "devisStatut", (SELECT count(*)::int FROM "EcheancePaiement" x WHERE x."devisId" = e."devisId") AS "nb",
      (SELECT max(x."ordre")::int FROM "EcheancePaiement" x WHERE x."devisId" = e."devisId") AS "dernier", d."lignesAcceptees"
    FROM "EcheancePaiement" e JOIN "Devis" d ON d."id" = e."devisId" WHERE e."id" = ${echeanceId}`)[0];
  if (!e) throw new RefusFacturation(404, "not_found", "Échéance introuvable");
  if (!["ACCEPTE", "FACTURE"].includes(String(e.devisStatut))) throw new RefusFacturation(409, "statut_invalide", "Le devis n'est pas accepté.");
  const j = jour(maintenant), annee = Number(j.slice(0, 4));
  const dateEcheance = o.dateEcheance && /^\d{4}-\d{2}-\d{2}$/.test(o.dateEcheance) && o.dateEcheance >= j ? o.dateEcheance : plusJours(j, DELAI_PAIEMENT_DEFAUT);
  const t = totauxFacture(String(e.montantHT), o.tauxTVA ?? TVA_DEFAUT, o.retenue ?? 0);
  const type = Number(e.nb) === 1 ? "FORFAIT_UNIQUE" : e.declencheur === "SIGNATURE" && Number(e.ordre) === 1 ? "ACOMPTE" : Number(e.ordre) === Number(e.dernier) ? "SOLDE" : "SITUATION";
  const acceptees = (e.lignesAcceptees as LigneAcceptee[] | null) ?? [];
  const detail = ((e.prestations as string[]) ?? []).map((c) => acceptees.find((l) => l.code === c)?.libelle ?? c).join(" ; ");
  const lignes = [{ libelle: `${String(e.libelle)} — ${libellePhase(String(e.phaseCode))}`, detail: detail || undefined, montantHT: t.ht.fixe2() }];
  const fid = id("fac_");
  try {
    await sql`WITH q AS (INSERT INTO "SequenceDocument" ("type", "annee", "dernier") VALUES ('FAC', ${annee}::int, 1)
        ON CONFLICT ("type", "annee") DO UPDATE SET "dernier" = "SequenceDocument"."dernier" + 1 RETURNING "dernier")
      INSERT INTO "Facture" ("id", "dossierId", "devisId", "echeanceId", "numero", "type", "statut", "dateEmission", "dateEcheance", "montantHT", "tauxTVA", "montantTVA", "montantTTC", "retenueSource", "netAPayer", "lignes", "creePar", "createdAt", "updatedAt")
      SELECT ${fid}, ${String(e.dossierId)}, ${String(e.devisId)}, ${echeanceId}, 'FAC-' || ${annee}::text || '-' || lpad(q."dernier"::text, 4, '0'), ${type}, 'EMISE', ${j}::date, ${dateEcheance}::date,
        ${t.ht.fixe2()}::numeric, ${t.tauxTVA.toString()}::numeric, ${t.tva.fixe2()}::numeric, ${t.ttc.fixe2()}::numeric, ${t.retenue.estNul() ? null : t.retenue.fixe2()}::numeric, ${t.netAPayer.fixe2()}::numeric,
        ${JSON.stringify(lignes)}::jsonb, ${auteur}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3) FROM q`;
  } catch (err) {
    if (estConflit(err)) throw new RefusFacturation(409, "deja_facturee", "Cette échéance est déjà facturée.");
    throw err;
  }
  const r = await figerDocument(sql, fid);
  // Devis entièrement facturé → FACTURE.
  await sql`UPDATE "Devis" d SET "statut" = 'FACTURE', "updatedAt" = ${maintenant}::timestamp(3) WHERE d."id" = ${String(e.devisId)} AND d."statut" = 'ACCEPTE'
    AND NOT EXISTS (SELECT 1 FROM "EcheancePaiement" x WHERE x."devisId" = d."id" AND NOT EXISTS (SELECT 1 FROM "Facture" f WHERE f."echeanceId" = x."id" AND f."type" <> 'AVOIR' AND f."statut" <> 'ANNULEE'))`;
  await journaliser(sql, String(e.dossierId), auteur, "FACTURE_EMISE", { factureId: fid, numero: r.numero, echeance: String(e.phaseCode), netAPayer: t.netAPayer.fixe2() }, maintenant);
  return { ...r, factureId: fid };
}

async function soldeFacture(sql: Sql, factureId: string) {
  const r = (await sql`SELECT f."netAPayer", f."montantHT",
      coalesce((SELECT sum(e."montant") FROM "Encaissement" e WHERE e."factureId" = f."id"), 0) AS "encaisse",
      coalesce((SELECT sum(a."netAPayer") FROM "Facture" a WHERE a."factureOrigineId" = f."id" AND a."type" = 'AVOIR'), 0) AS "avoirsTTC",
      coalesce((SELECT sum(a."montantHT") FROM "Facture" a WHERE a."factureOrigineId" = f."id" AND a."type" = 'AVOIR'), 0) AS "avoirsHT"
    FROM "Facture" f WHERE f."id" = ${factureId}`)[0];
  const net = Dec.de(String(r.netAPayer)).plus(String(r.avoirsTTC));
  return { net, encaisse: Dec.de(String(r.encaisse)), restant: net.moins(String(r.encaisse)), avoirsTTC: String(r.avoirsTTC), creditableHT: Dec.de(String(r.montantHT)).plus(String(r.avoirsHT)) };
}

async function majStatutFacture(sql: Sql, factureId: string, maintenant: string) {
  const f = (await sql`SELECT "netAPayer" FROM "Facture" WHERE "id" = ${factureId}`)[0];
  const sd = await soldeFacture(sql, factureId);
  const statut = statutFacture(String(f.netAPayer), sd.encaisse, sd.avoirsTTC);
  await sql`UPDATE "Facture" SET "statut" = ${statut}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${factureId} AND "type" <> 'AVOIR'`;
  return statut;
}

export const MODES_ENCAISSEMENT = ["VIREMENT", "CHEQUE", "ESPECES", "EFFET"] as const;

/** Encaissement partiel ou total (aucun paiement en ligne) ; le justificatif est dans le dépôt commun. */
export async function enregistrerEncaissement(sql: Sql, factureId: string, e: { montant: string; date: string; mode: (typeof MODES_ENCAISSEMENT)[number]; reference: string | null; justificatifId: string | null }, auteur: string, maintenant: string): Promise<{ statut: string; restant: string }> {
  const f = (await sql`SELECT "dossierId", "numero", "type", "statut" FROM "Facture" WHERE "id" = ${factureId}`)[0];
  if (!f) throw new RefusFacturation(404, "not_found", "Facture introuvable");
  if (f.type === "AVOIR" || !["EMISE", "PARTIELLEMENT_REGLEE"].includes(String(f.statut))) throw new RefusFacturation(409, "statut_invalide", "Facture déjà réglée, annulée ou avoir.");
  const m = Dec.de(e.montant).centimes();
  const sd = await soldeFacture(sql, factureId);
  if (m.cmp(0) <= 0) throw new RefusFacturation(400, "montant_invalide", "Montant positif attendu.");
  if (m.cmp(sd.restant) > 0) throw new RefusFacturation(400, "montant_trop_eleve", `Le reste à payer est de ${sd.restant.fixe2()} DH.`);
  await sql`INSERT INTO "Encaissement" ("id", "factureId", "dossierId", "montant", "date", "mode", "reference", "justificatifId", "saisiPar", "createdAt")
    VALUES (${id("enc_")}, ${factureId}, ${String(f.dossierId)}, ${m.fixe2()}::numeric, ${e.date}::date, ${e.mode}, ${e.reference}, ${e.justificatifId}, ${auteur}, ${maintenant}::timestamp(3))`;
  const statut = await majStatutFacture(sql, factureId, maintenant);
  await journaliser(sql, String(f.dossierId), auteur, "ENCAISSEMENT", { factureId, numero: f.numero, montant: m.fixe2(), mode: e.mode, justificatif: !!e.justificatifId, statut }, maintenant);
  return { statut, restant: sd.restant.moins(m).fixe2() };
}

/** Avoir (AVO-AAAA-NNNN) sur une facture émise : total par défaut, partiel possible, motif obligatoire. */
export async function emettreAvoir(sql: Sql, factureId: string, o: { montantHT?: string; motif: string }, auteur: string, maintenant: string): Promise<{ numero: string; hash: string; statutFacture: string }> {
  const f = (await sql`SELECT * FROM "Facture" WHERE "id" = ${factureId}`)[0];
  if (!f) throw new RefusFacturation(404, "not_found", "Facture introuvable");
  if (f.type === "AVOIR" || f.statut === "ANNULEE") throw new RefusFacturation(409, "statut_invalide", "Facture déjà annulée ou avoir.");
  if (!o.motif.trim()) throw new RefusFacturation(400, "motif_requis", "Motif de l'avoir obligatoire.");
  const sd = await soldeFacture(sql, factureId);
  const m = (o.montantHT ? Dec.de(o.montantHT) : sd.creditableHT).centimes();
  if (m.cmp(0) <= 0 || m.cmp(sd.creditableHT) > 0) throw new RefusFacturation(400, "montant_invalide", `Montant de l'avoir entre 0,01 et ${sd.creditableHT.fixe2()} DH HT.`);
  const t = totauxFacture(m.fois(-1), String(f.tauxTVA));
  const j = jour(maintenant), annee = Number(j.slice(0, 4)), aid = id("avo_");
  const lignes = [{ libelle: `Avoir sur la facture ${String(f.numero)}`, detail: o.motif.trim(), montantHT: t.ht.fixe2() }];
  await sql`WITH q AS (INSERT INTO "SequenceDocument" ("type", "annee", "dernier") VALUES ('AVO', ${annee}::int, 1)
      ON CONFLICT ("type", "annee") DO UPDATE SET "dernier" = "SequenceDocument"."dernier" + 1 RETURNING "dernier")
    INSERT INTO "Facture" ("id", "dossierId", "devisId", "factureOrigineId", "numero", "type", "statut", "dateEmission", "dateEcheance", "montantHT", "tauxTVA", "montantTVA", "montantTTC", "netAPayer", "lignes", "motif", "creePar", "createdAt", "updatedAt")
    SELECT ${aid}, ${String(f.dossierId)}, ${s(f.devisId)}, ${factureId}, 'AVO-' || ${annee}::text || '-' || lpad(q."dernier"::text, 4, '0'), 'AVOIR', 'EMISE', ${j}::date, ${j}::date,
      ${t.ht.fixe2()}::numeric, ${t.tauxTVA.toString()}::numeric, ${t.tva.fixe2()}::numeric, ${t.ttc.fixe2()}::numeric, ${t.ttc.fixe2()}::numeric,
      ${JSON.stringify(lignes)}::jsonb, ${o.motif.trim().slice(0, 500)}, ${auteur}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3) FROM q`;
  const r = await figerDocument(sql, aid);
  const statut = await majStatutFacture(sql, factureId, maintenant);
  if (statut === "ANNULEE" && f.devisId) await sql`UPDATE "Devis" SET "statut" = 'ACCEPTE', "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${String(f.devisId)} AND "statut" = 'FACTURE'`;
  await journaliser(sql, String(f.dossierId), auteur, "AVOIR_EMIS", { avoirId: aid, numero: r.numero, facture: f.numero, montantHT: t.ht.fixe2(), statutFacture: statut }, maintenant);
  return { ...r, statutFacture: statut };
}

/** Point d'arrêt levé par l'admin : motif écrit obligatoire, journalisé. */
export async function debloquerPhase(sql: Sql, dossierId: string, phaseCode: string, motif: string, auteur: string, maintenant: string): Promise<void> {
  if (!PHASES_PAIEMENT.some((p) => p.code === phaseCode)) throw new RefusFacturation(400, "phase_inconnue", "Phase inconnue");
  if (motif.trim().length < 10) throw new RefusFacturation(400, "motif_requis", "Motif écrit obligatoire (10 caractères au moins).");
  await sql`INSERT INTO "DeblocagePaiement" ("id", "dossierId", "phaseCode", "motif", "par", "createdAt") VALUES (${id("deb_")}, ${dossierId}, ${phaseCode}, ${motif.trim().slice(0, 500)}, ${auteur}, ${maintenant}::timestamp(3))`;
  await journaliser(sql, dossierId, auteur, "PHASE_DEBLOQUEE_SANS_PAIEMENT", { phase: phaseCode, motif: motif.trim().slice(0, 500) }, maintenant);
}

// ── Lectures ────────────────────────────────────────────────────────────

export interface FactureLue {
  id: string; numero: string; type: string; statut: string; echeanceId: string | null; factureOrigineId: string | null; devisId: string | null;
  dateEmission: string; dateEcheance: string; montantHT: string; montantTVA: string; montantTTC: string; netAPayer: string; hashContenu: string | null;
  encaissements: Array<{ id: string; montant: string; date: string; mode: string; reference: string | null; justificatifId: string | null }>;
  paye: string; restant: string;
}

async function lireTout(sql: Sql, dossierId: string) {
  const [devis, echeances, factures, encaissements, deblocages, dossier] = await Promise.all([
    sql`SELECT "id", "numero", "statut", "montantAccepte", "packChoisi", to_char("dateAcceptation", 'YYYY-MM-DD') AS "acc" FROM "Devis" WHERE "dossierId" = ${dossierId} AND "statut" IN ('ACCEPTE', 'FACTURE') ORDER BY "createdAt"`,
    sql`SELECT * FROM "EcheancePaiement" WHERE "dossierId" = ${dossierId} ORDER BY "devisId", "ordre"`,
    sql`SELECT "id", "numero", "type", "statut", "echeanceId", "factureOrigineId", "devisId", to_char("dateEmission", 'YYYY-MM-DD') AS "de", to_char("dateEcheance", 'YYYY-MM-DD') AS "dech",
        "montantHT", "montantTVA", "montantTTC", "netAPayer", "hashContenu" FROM "Facture" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt"`,
    sql`SELECT "id", "factureId", "montant", to_char("date", 'YYYY-MM-DD') AS "d", "mode", "reference", "justificatifId" FROM "Encaissement" WHERE "dossierId" = ${dossierId} ORDER BY "date", "createdAt"`,
    sql`SELECT "phaseCode", "motif", "par", to_char("createdAt", 'YYYY-MM-DD') AS "le" FROM "DeblocagePaiement" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt"`,
    sql`SELECT "phase" FROM "Dossier" WHERE "id" = ${dossierId}`,
  ]);
  return { devis, echeances, factures, encaissements, deblocages, phaseCatalogue: s(dossier[0]?.phase) };
}

/**
 * ÉTAT DES PAIEMENTS PAR PHASE d'un dossier — interface lue par la gestion de projet (timeline, blocage
 * du démarrage d'une phase non payée). Pour chaque phase P00…P14 : devis, échéances, factures, dû / payé /
 * restant (TTC net d'avoirs), statut, date du paiement complet, `bloquante`, déblocage motivé éventuel.
 * Tables absentes (SQL non collé) → null : la gestion de projet ne bloque alors rien.
 */
export async function etatPaiementPhasesDossier(sql: Sql, dossierId: string, aujourdhui: string): Promise<PhasePaiement[] | null> {
  if (!(await tablesFacturation(sql))) return null;
  const t = await lireTout(sql, dossierId);
  return calculerEtat(t, aujourdhui);
}

function calculerEtat(t: Awaited<ReturnType<typeof lireTout>>, aujourdhui: string): PhasePaiement[] {
  return etatPaiementPhases({
    phaseActuelle: phaseDuCatalogue(t.phaseCatalogue) ?? t.phaseCatalogue, aujourdhui,
    devis: t.devis.map((d) => ({ id: String(d.id), numero: s(d.numero), statut: String(d.statut) })),
    echeances: t.echeances.map((e): EcheanceEtat => ({ id: String(e.id), devisId: String(e.devisId), phaseCode: String(e.phaseCode), libelle: String(e.libelle), montantHT: dec2(e.montantHT), declencheur: e.declencheur === "SIGNATURE" ? "SIGNATURE" : "DEBUT_PHASE" })),
    factures: t.factures.map((f): FactureEtat => ({ id: String(f.id), numero: String(f.numero), type: String(f.type), statut: String(f.statut), echeanceId: s(f.echeanceId), factureOrigineId: s(f.factureOrigineId), montantTTC: dec2(f.montantTTC), netAPayer: dec2(f.netAPayer), dateEmission: String(f.de), dateEcheance: String(f.dech) })),
    encaissements: t.encaissements.map((e) => ({ factureId: String(e.factureId), montant: dec2(e.montant), date: String(e.d) })),
    deblocages: t.deblocages.map((d) => ({ phaseCode: String(d.phaseCode), motif: String(d.motif), par: String(d.par), le: String(d.le) })),
  });
}

/** Vue complète de la facturation d'un dossier (admin ; le client reçoit une vue filtrée). */
export async function lireFacturation(sql: Sql, dossierId: string, aujourdhui: string) {
  const t = await lireTout(sql, dossierId);
  const factures: FactureLue[] = t.factures.map((f) => {
    const encs = t.encaissements.filter((e) => e.factureId === f.id);
    const avoirs = t.factures.filter((a) => a.type === "AVOIR" && a.factureOrigineId === f.id);
    const net = Dec.de(dec2(f.netAPayer)).plus(Dec.somme(avoirs.map((a) => dec2(a.netAPayer))));
    const paye = Dec.somme(encs.map((e) => dec2(e.montant)));
    const restant = f.type === "AVOIR" ? Dec.ZERO : net.moins(paye);
    return {
      id: String(f.id), numero: String(f.numero), type: String(f.type), statut: String(f.statut), echeanceId: s(f.echeanceId), factureOrigineId: s(f.factureOrigineId), devisId: s(f.devisId),
      dateEmission: String(f.de), dateEcheance: String(f.dech), montantHT: dec2(f.montantHT), montantTVA: dec2(f.montantTVA), montantTTC: dec2(f.montantTTC), netAPayer: dec2(f.netAPayer), hashContenu: s(f.hashContenu),
      encaissements: encs.map((e) => ({ id: String(e.id), montant: dec2(e.montant), date: String(e.d), mode: String(e.mode), reference: s(e.reference), justificatifId: s(e.justificatifId) })),
      paye: paye.fixe2(), restant: (restant.estNegatif() ? Dec.ZERO : restant).fixe2(),
    };
  });
  return {
    etat: calculerEtat(t, aujourdhui),
    devis: t.devis.map((d) => ({ id: String(d.id), numero: s(d.numero), statut: String(d.statut), montantAccepte: d.montantAccepte != null ? dec2(d.montantAccepte) : null, pack: s(d.packChoisi), dateAcceptation: s(d.acc) })),
    echeances: t.echeances.map((e) => ({
      id: String(e.id), devisId: String(e.devisId), phaseCode: String(e.phaseCode), phase: libellePhase(String(e.phaseCode)), ordre: Number(e.ordre), libelle: String(e.libelle),
      montantHT: dec2(e.montantHT), declencheur: String(e.declencheur), facture: factures.find((f) => f.echeanceId === e.id && f.type !== "AVOIR" && f.statut !== "ANNULEE")?.numero ?? null,
    })),
    factures,
  };
}

/** Document figé d'une facture ou d'un avoir (reconstruit s'il manque après une coupure). */
export async function lireDocumentFacture(sql: Sql, factureId: string): Promise<{ dossierId: string; document: unknown; hash: string | null } | null> {
  const f = (await sql`SELECT "dossierId", "document", "hashContenu" FROM "Facture" WHERE "id" = ${factureId}`)[0];
  if (!f) return null;
  if (!f.document) {
    const r = await figerDocument(sql, factureId);
    const g = (await sql`SELECT "document" FROM "Facture" WHERE "id" = ${factureId}`)[0];
    return { dossierId: String(f.dossierId), document: g?.document ?? null, hash: r.hash };
  }
  return { dossierId: String(f.dossierId), document: f.document, hash: s(f.hashContenu) };
}

// ── Justificatifs (devis signé scanné, preuve de paiement) : dépôt commun ──

/** Dépose un justificatif (PDF ou image, contrôlé par documents.ts) rattaché au dossier ; renvoie son id. */
export async function deposerJustificatif(sql: Sql, dossierId: string, fichier: { nom?: unknown; contenu?: unknown }, proprietaire: string, maintenant: string): Promise<string> {
  const depot = depotDocumentsNeon(sql);
  if (!(await depot.pret())) throw new RefusFacturation(503, "depot_absent", "Dépôt de documents non installé (docs/sql/gestion-projet-neon.sql).");
  const octets = typeof fichier.contenu === "string" && fichier.contenu.length <= 6_000_000 ? depuisBase64(fichier.contenu) : null;
  if (!octets) throw new RefusFacturation(413, "fichier_trop_lourd", "Fichier absent ou trop lourd.");
  const v = validerDocument(octets, fichier.nom);
  if (!v.ok) throw new RefusFacturation(400, v.error, "Fichier refusé (PDF, JPEG ou WebP).");
  if ((await depot.occupe(CONTEXTE_JUSTIFICATIFS, dossierId)) + v.doc.octets.length > OCTETS_PAR_OBJET) throw new RefusFacturation(413, "quota_atteint", "Quota de documents du dossier atteint.");
  return (await depot.inserer({ contexte: CONTEXTE_JUSTIFICATIFS, objetId: dossierId, proprietaire, doc: v.doc }, maintenant)).id;
}

export const CONTEXTE_JUSTIFICATIFS = "facturation";

/** Relecture d'une demande d'acceptation (admin ou client). */
export function lireAcceptation(b: Record<string, unknown>, aujourdhui: string): Omit<Acceptation, "preuve"> | { erreur: string } {
  const pack = b.pack == null || b.pack === "" ? null : (["ESSENTIEL", "PERSONNALISE", "PREMIUM"] as const).find((p) => p === b.pack);
  if (pack === undefined) return { erreur: "Pack inconnu" };
  const commandees = Array.isArray(b.commandees) ? b.commandees.filter((x): x is string => typeof x === "string").slice(0, 40).map((x) => x.slice(0, 40)) : [];
  const date = typeof b.dateAcceptation === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dateAcceptation) ? b.dateAcceptation : aujourdhui;
  if (date > aujourdhui) return { erreur: "Date d'acceptation future" };
  return { pack, commandees, inclureHorsHonoraires: b.inclureHorsHonoraires === true, dateAcceptation: date };
}

// ── Vue client (/mon-espace) : ses devis émis, ses factures, l'état par phase ──

/** Aucun montant interne, aucun justificatif, aucune coordonnée : documents figés et statuts seulement. */
export async function vueFacturationClient(sql: Sql, dossierId: string, aujourdhui: string) {
  const ctx = await contexteDevis(sql, dossierId);
  const devisRows = await sql`SELECT *, to_char("dateEmission", 'YYYY-MM-DD') AS "dateEm", to_char("dateAcceptation", 'YYYY-MM-DD') AS "acc" FROM "Devis"
    WHERE "dossierId" = ${dossierId} AND "statut" <> 'BROUILLON' AND "remplacePar" IS NULL ORDER BY "createdAt" DESC LIMIT 30`;
  const devis = devisRows.map((r) => {
    const statut = String(r.statut);
    const fin = new Date(`${String(r.dateEm)}T00:00:00Z`); fin.setUTCDate(fin.getUTCDate() + (Number(r.validiteJours) || 30));
    const statutEffectif = statut === "EMIS" && aujourdhui > fin.toISOString().slice(0, 10) ? "EXPIRE" : statut;
    // Prestations facultatives que le client peut commander à l'acceptation (règle 4).
    let options: Array<{ code: string; libelle: string; montantHT: string }> = [];
    if (statutEffectif === "EMIS" && ctx) {
      const c = calculerDevisComplet(r.entree as Parameters<typeof calculerDevisComplet>[0], GRILLES[String(r.grilleVersionId)] ?? GRILLE_COURANTE, ctx);
      if (c.ok) options = c.resultat.lignes.filter((l) => l.caractere !== "OBLIGATOIRE" && l.montant && !l.horsHonoraires && !(c.resultat.presentation === "PACKS"))
        .map((l) => ({ code: l.code, libelle: l.libelle, montantHT: (l.montant as Dec).fixe2() }));
    }
    return {
      id: String(r.id), numero: s(r.numero), statut: statutEffectif, presentation: String(r.presentation), dateEmission: s(r.dateEm), dateAcceptation: s(r.acc),
      montantTotal: r.montantTotal != null ? dec2(r.montantTotal) : null, montantAccepte: r.montantAccepte != null ? dec2(r.montantAccepte) : null, pack: s(r.packChoisi),
      document: r.document ?? null, hash: s(r.hashContenu), options,
    };
  });
  const f = await tablesFacturation(sql) ? await lireFacturation(sql, dossierId, aujourdhui) : null;
  const docs = f && f.factures.length ? await sql`SELECT "id", "document" FROM "Facture" WHERE "dossierId" = ${dossierId}` : [];
  return {
    devis,
    factures: (f?.factures ?? []).map((x) => ({
      id: x.id, numero: x.numero, type: x.type, statut: x.statut, dateEmission: x.dateEmission, dateEcheance: x.dateEcheance, montantTTC: x.montantTTC, netAPayer: x.netAPayer,
      paye: x.paye, restant: x.restant, enRetard: x.type !== "AVOIR" && Dec.de(x.restant).cmp(0) > 0 && x.dateEcheance < aujourdhui,
      document: docs.find((d) => d.id === x.id)?.document ?? null, hash: x.hashContenu,
    })),
    phases: (f?.etat ?? []).filter((p) => !p.aucuneEcheance).map((p) => ({ phase: p.phase, libelle: p.libelle, statut: p.statut, du: p.du, paye: p.paye, restant: p.restant, estime: p.estime, datePaiementComplet: p.datePaiementComplet })),
  };
}
