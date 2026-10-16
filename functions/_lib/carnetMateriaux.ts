/**
 * Carnet des matériaux du projet — accès Neon à "DossierMateriau"
 * (SQL : docs/sql/carnet-materiaux-neon.sql ; contrat :
 * docs/architecture/contrat-carnet-materiaux.md ; règles pures :
 * apps/web/src/domain/materiaux/carnet.ts).
 *
 * Utilisé par les routes client (/api/client/dossiers/:id/materiaux), admin
 * (/api/cc/dossiers/:id/materiaux) et par la gestion de projet (pages
 * d'étape, etapeCode). Table absente → TableAbsente (les routes répondent
 * 503 sql_a_coller, les écrans le disent). Jamais de CREATE TABLE ici.
 */
import {
  lireDecision, proposableEnPhase, type EntreeProposition, type LigneCarnet, type StatutCarnet,
} from "../../apps/web/src/domain/materiaux/carnet";
import { materiau } from "../../apps/web/src/domain/materiaux/catalogue";
import { masquerCoordonnees } from "./coordonnees";
import { journaliser, type Sql } from "./dossierAdmin";

export class TableAbsente extends Error { constructor() { super("sql_a_coller"); } }
export const FICHIER_SQL = "docs/sql/carnet-materiaux-neon.sql";

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));
const idCarnet = () => `dma_${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(2)).reduce((a, n) => a + n.toString(36), "")}`;

export async function tablePrete(sql: Sql): Promise<{ carnet: boolean; journal: boolean }> {
  const r = await sql`SELECT to_regclass('public."DossierMateriau"') IS NOT NULL AS c, to_regclass('public."DossierEvenement"') IS NOT NULL AS j`;
  return { carnet: !!r[0]?.c, journal: !!r[0]?.j };
}

/** Ligne de la table → vue (aucun auteur ni décideur : jamais d'identité ni de coordonnée d'un tiers). */
export function vueLigne(r: Record<string, unknown>): LigneCarnet {
  return {
    id: String(r.id), dossierId: String(r.dossierId), etapeCode: (r.etapeCode as string) || null,
    source: r.source === "produit" ? "produit" : "referentiel", refId: String(r.refId), code: String(r.code), nom: String(r.nom),
    categorie: (r.categorie as string) || null, lot: (r.lot as string) || null, emplacement: (r.emplacement as string) || null,
    unite: (r.unite as string) || null, quantite: num(r.quantite), prixIndicatif: num(r.prixIndicatif), note: (r.note as string) || null,
    origine: (["CLIENT", "ARCHITECTE", "ETAPE"].includes(String(r.origine)) ? r.origine : "CLIENT") as LigneCarnet["origine"],
    proposePar: r.proposePar === "ARCHITECTE" ? "ARCHITECTE" : "CLIENT", statut: String(r.statut) as StatutCarnet,
    motif: (r.motif as string) || null, varianteCode: (r.varianteCode as string) || null, decideLe: iso(r.decideLe), proposeLe: iso(r.createdAt) || "",
  };
}

export async function lireCarnet(sql: Sql, dossierId: string, opts: { etape?: string | null } = {}): Promise<LigneCarnet[]> {
  if (!(await tablePrete(sql)).carnet) throw new TableAbsente();
  const lignes = opts.etape
    ? await sql`SELECT * FROM "DossierMateriau" WHERE "dossierId" = ${dossierId} AND "etapeCode" = ${opts.etape} ORDER BY "createdAt" DESC LIMIT 500`
    : await sql`SELECT * FROM "DossierMateriau" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt" DESC LIMIT 500`;
  return lignes.map(vueLigne);
}

export type Acteur = { genre: "client"; clientId: string } | { genre: "admin"; email: string };

export type ResultatCarnet = { ok: true; ligne: LigneCarnet } | { ok: false; status: number; erreur: string };

/**
 * Proposition. Client : son dossier seulement (contrôlé par la route), à partir de l'APD.
 * Admin / page d'étape : à toute phase (l'architecte prescrit), origine ARCHITECTE ou ETAPE.
 */
export async function proposer(sql: Sql, dossierId: string, e: EntreeProposition, acteur: Acteur, maintenant = new Date().toISOString()): Promise<ResultatCarnet> {
  const pret = await tablePrete(sql);
  if (!pret.carnet) throw new TableAbsente();
  const d = (await sql`SELECT "id", "phase" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return { ok: false, status: 404, erreur: "not_found" };
  if (acteur.genre === "client" && !proposableEnPhase(String(d.phase || ""))) return { ok: false, status: 409, erreur: "avant_apd" };
  const client = acteur.genre === "client";
  const origine = client ? "CLIENT" : e.etapeCode ? "ETAPE" : "ARCHITECTE";
  const id = idCarnet();
  const note = masquerCoordonnees(e.note);
  const emplacement = masquerCoordonnees(e.emplacement);
  const r = await sql`INSERT INTO "DossierMateriau" ("id", "dossierId", "etapeCode", "source", "refId", "code", "nom", "categorie", "lot", "emplacement",
      "unite", "quantite", "prixIndicatif", "note", "origine", "proposePar", "auteur", "statut", "createdAt", "updatedAt")
    VALUES (${id}, ${dossierId}, ${e.etapeCode}, ${e.source}, ${e.refId}, ${e.code}, ${e.nom}, ${e.categorie}, ${e.lot}, ${emplacement},
      ${e.unite}, ${e.quantite}, ${e.prixIndicatif}, ${note}, ${origine}, ${client ? "CLIENT" : "ARCHITECTE"},
      ${client ? acteur.clientId : acteur.email}, ${client ? "PROPOSE" : "VALIDE"}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))
    RETURNING *`;
  if (pret.journal)
    await journaliser(sql, dossierId, client ? "client" : acteur.email, client ? "MATERIAU_PROPOSE" : "MATERIAU_PRESCRIT",
      { ligne: id, code: e.code, nom: e.nom, lot: e.lot, etape: e.etapeCode }, maintenant);
  return { ok: true, ligne: vueLigne(r[0]) };
}

/** Décision de l'architecte (back-office seulement : la route client n'expose pas cette fonction). */
export async function statuer(sql: Sql, dossierId: string, id: string, corps: unknown, admin: string, maintenant = new Date().toISOString()): Promise<ResultatCarnet> {
  const pret = await tablePrete(sql);
  if (!pret.carnet) throw new TableAbsente();
  const actuel = (await sql`SELECT * FROM "DossierMateriau" WHERE "id" = ${id} AND "dossierId" = ${dossierId} LIMIT 1`)[0];
  if (!actuel) return { ok: false, status: 404, erreur: "not_found" };
  const avant = { statut: String(actuel.statut) as StatutCarnet, code: String(actuel.code) };
  const d = lireDecision(corps, avant);
  if (!d.ok) return { ok: false, status: 400, erreur: d.erreur };
  const motif = masquerCoordonnees(d.v.motif);
  const r = await sql`UPDATE "DossierMateriau" SET "statut" = ${d.v.statut}, "motif" = ${motif}, "varianteCode" = ${d.v.varianteCode},
      "decidePar" = ${admin}, "decideLe" = ${maintenant}::timestamp(3), "updatedAt" = ${maintenant}::timestamp(3)
    WHERE "id" = ${id} AND "dossierId" = ${dossierId} RETURNING *`;
  if (pret.journal)
    await journaliser(sql, dossierId, admin, "MATERIAU_STATUE", {
      ligne: id, code: avant.code, de: avant.statut, vers: d.v.statut, motif, variante: d.v.varianteCode,
    }, maintenant);
  return { ok: true, ligne: vueLigne(r[0]) };
}

/** Texte du message envoyé au client par la messagerie de la plateforme (aucune coordonnée). */
export function messageDecision(l: LigneCarnet): string {
  const v = l.varianteCode ? materiau(l.varianteCode)?.libelle || l.varianteCode : null;
  const quoi = `« ${l.nom} »${l.emplacement ? ` (${l.emplacement})` : ""}`;
  switch (l.statut) {
    case "VALIDE": return `Votre proposition de matériau ${quoi} est validée par l'architecte. Elle rejoint le carnet des matériaux de votre projet.`;
    case "REFUSE": return `Votre proposition de matériau ${quoi} n'est pas retenue par l'architecte. Motif : ${l.motif || "—"}.`;
    case "VARIANTE_PROPOSEE": return `Pour votre proposition ${quoi}, l'architecte propose une variante : ${v}.${l.motif ? ` ${l.motif}` : ""}`;
    default: return `Votre proposition de matériau ${quoi} est à l'étude par l'architecte.`;
  }
}
