/**
 * Pièces d'un dossier, phase par phase (lot GP2) — admin (/api/cc/dossiers/:id/pieces),
 * client (/api/client/dossiers/:id/pieces), espace projet (/api/projets/:id/pieces).
 *
 * Liste attendue = référentiel × profil du dossier (packages/contracts/src/gestion/pieces.ts) ;
 * état saisi = table "DossierPiece" ; fichiers = dépôt commun "DocumentDepose" (documents.ts).
 * SQL absent (docs/sql/gestion-projet-neon.sql) : lecture complète, tout « Document manquant »,
 * actions refusées avec « sql_a_coller » — jamais d'erreur 500.
 *
 * Droits : l'admin fait tout ; le client dépose les pièces dont il est le producteur
 * (maître d'ouvrage) et ne voit jamais les pièces « back-office » ; un membre de
 * l'espace projet dépose les pièces de son rôle, l'architecte valide.
 * Chaque action est journalisée (journaliser(), "DossierEvenement").
 */
import { depuisBase64 } from "./images";
import { depotDocumentsNeon, OCTETS_PAR_OBJET, validerDocument, type DepotDocuments, type MetaDocument, type Sql } from "./documents";
import { journaliser } from "./dossierAdmin";
import { masquerCoordonnees } from "./coordonnees";
import { phaseDuCatalogue, typeProjetDepuis, rolesEspaceProjet } from "../../packages/contracts/src/gestion/referentiel";
import { profilDuDossier, type ProfilProjet } from "../../packages/contracts/src/gestion/profil";
import { ordreRegional, type OrdreRegional } from "../../packages/contracts/src/gestion/ordres";
import { documentsParPhase, pieceConnue, type EtatPiece, type PieceAttendue } from "../../packages/contracts/src/gestion/pieces";

export const FICHIER_SQL_GESTION = "docs/sql/gestion-projet-neon.sql";
const s = (v: unknown) => (v == null || v === "" ? null : String(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : s(v));

export type ActeurPiece =
  | { kind: "admin"; email: string }
  | { kind: "client"; userId: string }
  | { kind: "membre"; id: string; role: string; nom: string; superviseur: boolean };
const auteur = (a: ActeurPiece) => (a.kind === "admin" ? `admin:${a.email || "cabinet"}` : a.kind === "client" ? `client:${a.userId}` : `membre:${a.id}`);
const peutValider = (a: ActeurPiece) => a.kind === "admin" || (a.kind === "membre" && a.superviseur);

/** Le client et les membres ne déposent que les pièces de leur rôle (le superviseur, toutes). */
export function peutDeposer(a: ActeurPiece, p: Pick<PieceAttendue, "producteur" | "backOffice">): boolean {
  if (a.kind === "admin") return true;
  if (p.backOffice) return false;
  if (a.kind === "client") return p.producteur === "MAITRE_OUVRAGE";
  if (a.superviseur) return true;
  return !!p.producteur && rolesEspaceProjet(p.producteur).includes(a.role);
}

export async function tablesPieces(sql: Sql): Promise<{ pieces: boolean; documents: boolean; journal: boolean }> {
  const r = (await sql`SELECT to_regclass('public."DossierPiece"') IS NOT NULL AS p, to_regclass('public."DocumentDepose"') IS NOT NULL AS d,
    to_regclass('public."DossierEvenement"') IS NOT NULL AS j`)[0] || {};
  return { pieces: !!r.p, documents: !!r.d, journal: !!r.j };
}

type Contexte = { dossier: Record<string, unknown>; profil: ProfilProjet; ordre: OrdreRegional | null };
async function contexte(sql: Sql, dossierId: string): Promise<Contexte | null> {
  const d = (await sql`SELECT * FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return null;
  return { dossier: d, profil: profilDuDossier(d, typeProjetDepuis(s(d.typologie))), ordre: ordreRegional({ prefecture: s(d.prefecture), commune: s(d.commune) }) };
}

async function etats(sql: Sql, dossierId: string): Promise<Map<string, EtatPiece>> {
  const r = await sql`SELECT "cle", "statut", "motif", "documentIds", "deposePar", "deposeLe", "validePar", "valideLe" FROM "DossierPiece" WHERE "dossierId" = ${dossierId}`;
  return new Map(r.map((x) => [String(x.cle), {
    statut: String(x.statut) as EtatPiece["statut"], motif: s(x.motif),
    documentIds: Array.isArray(x.documentIds) ? (x.documentIds as string[]) : [],
    deposePar: s(x.deposePar), deposeLe: iso(x.deposeLe), validePar: s(x.validePar), valideLe: iso(x.valideLe),
  }]));
}

/** Pièces du dossier par phase (+ normes et checklists pour l'admin et l'espace projet). */
export async function lirePieces(sql: Sql, dossierId: string, o: { client?: boolean } = {}) {
  const c = await contexte(sql, dossierId);
  if (!c) return null;
  const t = await tablesPieces(sql);
  const e = t.pieces ? await etats(sql, dossierId) : new Map<string, EtatPiece>();
  const phases = documentsParPhase(c.profil, e, { ordre: c.ordre, client: o.client });
  const ids = [...new Set(phases.flatMap((p) => p.pieces.flatMap((x) => x.documentIds)))];
  const metas = t.documents && ids.length ? await depotDocumentsNeon(sql).metas(ids) : [];
  const fichiers = Object.fromEntries(metas.map((m) => [m.id, { id: m.id, nom: m.nom, type: m.type, taille: m.taille, createdAt: m.createdAt }]));
  return {
    phaseActuelle: phaseDuCatalogue(s(c.dossier.phase)), profil: o.client ? null : c.profil, phases, fichiers,
    sqlACollerGestion: !t.pieces || !t.documents, fichierSql: FICHIER_SQL_GESTION,
  };
}

// ── Actions ─────────────────────────────────────────────────────────────

export type ActionPiece =
  | { action: "deposer"; cle: string; nom: string; octets: Uint8Array }
  | { action: "valider"; cle: string }
  | { action: "refuser"; cle: string; motif: string }
  | { action: "sans_objet"; cle: string; motif: string }
  | { action: "reinitialiser"; cle: string };

const CLE_RE = /^P\d\d_[A-Z0-9_]{2,60}:[A-Z0-9_]{2,80}$/;
const motifDe = (v: unknown) => (typeof v === "string" && v.trim() ? masquerCoordonnees(v.trim().slice(0, 500)) : null);

export function lireActionPiece(b: unknown): ActionPiece | { erreur: string } {
  const o = (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
  const cle = String(o.cle ?? "");
  if (!CLE_RE.test(cle)) return { erreur: "piece_invalide" };
  switch (o.action) {
    case "deposer": {
      const octets = typeof o.contenu === "string" && o.contenu.length <= 6_000_000 ? depuisBase64(o.contenu) : null;
      if (!octets || !octets.length) return { erreur: "fichier_invalide" };
      return { action: "deposer", cle, nom: String(o.nom ?? "document"), octets };
    }
    case "valider": return { action: "valider", cle };
    case "refuser": { const m = motifDe(o.motif); return m ? { action: "refuser", cle, motif: m } : { erreur: "motif_obligatoire" }; }
    case "sans_objet": { const m = motifDe(o.motif); return m ? { action: "sans_objet", cle, motif: m } : { erreur: "motif_obligatoire" }; }
    case "reinitialiser": return { action: "reinitialiser", cle };
    default: return { erreur: "action_inconnue" };
  }
}

export type Resultat = { status: number; json: Record<string, unknown> };
const ko = (status: number, error: string, extra: Record<string, unknown> = {}): Resultat => ({ status, json: { ok: false, error, ...extra } });

export async function appliquerActionPiece(sql: Sql, dossierId: string, a: ActionPiece, acteur: ActeurPiece, o: { maintenant?: string; documents?: DepotDocuments } = {}): Promise<Resultat> {
  const maintenant = o.maintenant ?? new Date().toISOString();
  const c = await contexte(sql, dossierId);
  if (!c) return ko(404, "not_found");
  const t = await tablesPieces(sql);
  if (!t.pieces || !t.documents) return ko(503, "sql_a_coller", { fichier: FICHIER_SQL_GESTION });
  const piece = pieceConnue(a.cle, c.profil, c.ordre);
  if (!piece) return ko(404, "piece_inconnue");
  if (acteur.kind === "client" && piece.backOffice) return ko(404, "piece_inconnue");
  const qui = auteur(acteur);
  const tracer = (action: string, details: Record<string, unknown>) => (t.journal ? journaliser(sql, dossierId, qui, action, { cle: a.cle, ...details }, maintenant) : Promise.resolve());

  if (a.action === "deposer") {
    if (!peutDeposer(acteur, piece)) return ko(403, "interdit");
    const v = validerDocument(a.octets, a.nom);
    if (!v.ok) return ko(400, v.error);
    const depot = o.documents ?? depotDocumentsNeon(sql);
    if ((await depot.occupe("dossier", dossierId)) + v.doc.octets.length > OCTETS_PAR_OBJET) return ko(413, "quota_depasse");
    const m: MetaDocument = await depot.inserer({ contexte: "dossier", objetId: dossierId, proprietaire: qui, doc: v.doc }, maintenant);
    await sql`INSERT INTO "DossierPiece" ("dossierId", "cle", "statut", "motif", "documentIds", "deposePar", "deposeLe", "updatedAt")
      VALUES (${dossierId}, ${a.cle}, 'DEPOSE', NULL, ${JSON.stringify([m.id])}::jsonb, ${qui}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))
      ON CONFLICT ("dossierId", "cle") DO UPDATE SET "statut" = 'DEPOSE', "motif" = NULL,
        "documentIds" = "DossierPiece"."documentIds" || EXCLUDED."documentIds", "deposePar" = EXCLUDED."deposePar", "deposeLe" = EXCLUDED."deposeLe",
        "validePar" = NULL, "valideLe" = NULL, "updatedAt" = EXCLUDED."updatedAt"`;
    await tracer("PIECE_DEPOSEE", { document: m.id, type: m.type, taille: m.taille });
    return { status: 200, json: { ok: true, document: { id: m.id, nom: m.nom, type: m.type, taille: m.taille } } };
  }

  if (!peutValider(acteur)) return ko(403, "interdit");
  if (a.action === "valider") {
    const r = await sql`UPDATE "DossierPiece" SET "statut" = 'VALIDE', "motif" = NULL, "validePar" = ${qui}, "valideLe" = ${maintenant}::timestamp(3), "updatedAt" = ${maintenant}::timestamp(3)
      WHERE "dossierId" = ${dossierId} AND "cle" = ${a.cle} AND jsonb_array_length("documentIds") > 0 RETURNING "cle"`;
    if (!r.length) return ko(409, "aucun_document_depose");
    await tracer("PIECE_VALIDEE", {});
  } else if (a.action === "refuser" || a.action === "sans_objet") {
    const statut = a.action === "refuser" ? "REFUSE" : "SANS_OBJET";
    await sql`INSERT INTO "DossierPiece" ("dossierId", "cle", "statut", "motif", "validePar", "valideLe", "updatedAt")
      VALUES (${dossierId}, ${a.cle}, ${statut}, ${a.motif}, ${qui}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))
      ON CONFLICT ("dossierId", "cle") DO UPDATE SET "statut" = EXCLUDED."statut", "motif" = EXCLUDED."motif", "validePar" = EXCLUDED."validePar",
        "valideLe" = EXCLUDED."valideLe", "updatedAt" = EXCLUDED."updatedAt"`;
    await tracer(statut === "REFUSE" ? "PIECE_REFUSEE" : "PIECE_SANS_OBJET", { motif: a.motif });
  } else {
    await sql`DELETE FROM "DossierPiece" WHERE "dossierId" = ${dossierId} AND "cle" = ${a.cle}`;
    await tracer("PIECE_REINITIALISEE", {});
  }
  return { status: 200, json: { ok: true } };
}

/** Un document appartient-il à une pièce visible de ce dossier ? (avant de servir ses octets) */
export async function documentDuDossier(sql: Sql, dossierId: string, docId: string, o: { client?: boolean } = {}): Promise<boolean> {
  if (!/^doc_[0-9a-f]{32}$/.test(docId)) return false;
  const t = await tablesPieces(sql);
  if (!t.pieces || !t.documents) return false;
  const r = await sql`SELECT "cle" FROM "DossierPiece" WHERE "dossierId" = ${dossierId} AND "documentIds" ? ${docId} LIMIT 1`;
  if (!r.length) return false;
  if (!o.client) return true;
  const c = await contexte(sql, dossierId);
  const p = c ? pieceConnue(String(r[0].cle), c.profil, c.ordre) : null;
  return !!p && !p.backOffice;
}
