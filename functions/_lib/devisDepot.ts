/**
 * Devis en base (Neon) — spec Devis & Facturation §1.7, §6.1, §6.2.
 * Contrat : docs/architecture/contrat-devis-facturation.md ; SQL : docs/sql/devis-facturation-neon.sql.
 *
 *   BROUILLON (sans numéro, modifiable, supprimable)
 *     → EMIS : numéro DEV-AAAA-NNNN alloué dans la MÊME instruction que le
 *       passage à EMIS (compteur "SequenceDocument", jamais au brouillon) ;
 *       le serveur recalcule tout, fige montants, document et empreinte ;
 *     → REFUSE ; EXPIRE (date d'émission + validité dépassée : statut effectif
 *       calculé à la lecture, sans tâche planifiée).
 *   Une modification d'un devis émis = RÉVISION : nouveau brouillon qui, émis,
 *   prend le numéro DEV-AAAA-NNNN-R2 (même base, sans consommer de numéro).
 * ACCEPTE / FACTURE : étape suivante (packs, acceptation, factures).
 */
import { calculerDevisComplet, montantDevis, type EntreeDevisComplet } from "../../apps/web/src/domain/honoraires/devisComplet";
import { construireDocument, empreinteDocument, type ContexteDocument } from "../../apps/web/src/domain/honoraires/documentDevis";
import { GRILLES, GRILLE_ARC_BATI_2026_10 } from "../../apps/web/src/domain/honoraires/grilleArcBati";
import type { Typologie } from "../../apps/web/src/domain/honoraires/types";
import { journaliser, type Sql } from "./dossierAdmin";

export const GRILLE_COURANTE = GRILLE_ARC_BATI_2026_10;

export class RefusDevis extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: string[]) { super(message); }
}

const s = (v: unknown) => (v == null ? null : String(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const idDevis = () => `dvs_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

export async function tablesDevis(sql: Sql): Promise<boolean> {
  const r = await sql`SELECT to_regclass('public."Devis"') IS NOT NULL AS d, to_regclass('public."SequenceDocument"') IS NOT NULL AS q, to_regclass('public."Cabinet"') IS NOT NULL AS c`;
  return !!r[0]?.d && !!r[0]?.q && !!r[0]?.c;
}

export interface ContexteDevis {
  typologie: Typologie | null;
  commune: string;
  missionsDejaReglees: string[];
  document: Omit<ContexteDocument, "numero" | "dateEmission">;
  autorisationExpiration: string | null;
}

/** Données du dossier utiles au devis. Aucune coordonnée (téléphone, e-mail) n'entre dans le document. */
export async function contexteDevis(sql: Sql, dossierId: string): Promise<ContexteDevis | null> {
  const r = (await sql`SELECT d."clientNom", d."raisonSociale", d."ice", d."payload", d."title", d."gabarit", d."lot", d."lotissement", d."commune", d."prefecture",
      d."titreFoncier", d."autorisationNum", to_char(d."autorisationDate", 'YYYY-MM-DD') AS "autDate", to_char(d."autorisationExpiration", 'YYYY-MM-DD') AS "autExp",
      d."etatChantier", d."typologie", c."nom" AS "cabNom", c."architecte" AS "cabArchi", c."titre" AS "cabTitre", c."numeroOrdre" AS "cabOrdre",
      (u."passwordHash" IS NOT NULL AND u."passwordHash" NOT LIKE '!sans-mot-de-passe%') AS "compteActif"
    FROM "Dossier" d LEFT JOIN "Cabinet" c ON c."id" = d."cabinetId" LEFT JOIN "User" u ON u."id" = d."ownerId" WHERE d."id" = ${dossierId}`)[0];
  if (!r) return null;
  const payload = (r.payload && typeof r.payload === "object" ? r.payload : {}) as { client?: { type?: string }; missionsReglees?: Array<{ code: string; libelle: string; date: string | null }> };
  const societe = payload.client?.type === "SOCIETE";
  const reglees = payload.missionsReglees ?? [];
  return {
    typologie: (s(r.typologie) as Typologie | null) ?? null,
    commune: s(r.commune) ?? "",
    missionsDejaReglees: reglees.map((m) => m.code).filter((c) => c && c !== "AUTRE"),
    autorisationExpiration: s(r.autExp),
    document: {
      client: { nomAffiche: (societe ? s(r.raisonSociale) : s(r.clientNom)) ?? "", type: societe ? "SOCIETE" : "PERSONNE", ice: s(r.ice) },
      projet: {
        intitule: s(r.title) ?? "", gabarit: s(r.gabarit), lot: s(r.lot), lotissement: s(r.lotissement), commune: s(r.commune) ?? "", prefecture: s(r.prefecture),
        titreFoncier: s(r.titreFoncier), autorisationNum: s(r.autorisationNum), autorisationDate: s(r.autDate), etatChantier: s(r.etatChantier),
      },
      architecte: r.cabNom ? { nom: String(r.cabNom), architecte: s(r.cabArchi), titre: s(r.cabTitre), numeroOrdre: s(r.cabOrdre) } : null,
      missionsReglees: reglees.map((m) => ({ libelle: m.libelle, date: m.date ?? null })),
      compteActif: r.compteActif === true,
    },
  };
}

export function statutEffectif(statut: string, dateEmission: string | null, validiteJours: number, aujourdhui: string): string {
  if (statut !== "EMIS" || !dateEmission) return statut;
  const fin = new Date(`${dateEmission}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + validiteJours);
  return aujourdhui > fin.toISOString().slice(0, 10) ? "EXPIRE" : statut;
}

export interface DevisLu {
  id: string; dossierId: string; numero: string | null; revision: number; devisOrigineId: string | null; remplacePar: string | null;
  type: string; presentation: string; statut: string; statutEffectif: string; grilleVersionId: string; dateEmission: string | null;
  validiteJours: number; montantTotal: string | null; assietteHonoraires: string | null; hashContenu: string | null;
  entree: EntreeDevisComplet; document: unknown | null; createdAt: string | null; creePar: string | null;
}

const versDevis = (r: Record<string, unknown>, aujourdhui: string, avecDocument: boolean): DevisLu => ({
  id: String(r.id), dossierId: String(r.dossierId), numero: s(r.numero), revision: Number(r.revision) || 1, devisOrigineId: s(r.devisOrigineId), remplacePar: s(r.remplacePar),
  type: String(r.type), presentation: String(r.presentation), statut: String(r.statut),
  statutEffectif: statutEffectif(String(r.statut), s(r.dateEm), Number(r.validiteJours) || 30, aujourdhui),
  grilleVersionId: String(r.grilleVersionId), dateEmission: s(r.dateEm), validiteJours: Number(r.validiteJours) || 30,
  montantTotal: s(r.montantTotal), assietteHonoraires: s(r.assietteHonoraires), hashContenu: s(r.hashContenu),
  entree: r.entree as EntreeDevisComplet, document: avecDocument ? r.document ?? null : null, createdAt: iso(r.createdAt), creePar: s(r.creePar),
});

export async function listerDevis(sql: Sql, dossierId: string, aujourdhui: string): Promise<DevisLu[]> {
  const rows = await sql`SELECT *, to_char("dateEmission", 'YYYY-MM-DD') AS "dateEm" FROM "Devis" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt" DESC LIMIT 100`;
  return rows.map((r) => versDevis(r, aujourdhui, false));
}

export async function lireDevis(sql: Sql, id: string, aujourdhui: string): Promise<DevisLu | null> {
  const r = (await sql`SELECT *, to_char("dateEmission", 'YYYY-MM-DD') AS "dateEm" FROM "Devis" WHERE "id" = ${id}`)[0];
  return r ? versDevis(r, aujourdhui, true) : null;
}

export async function creerBrouillon(sql: Sql, dossierId: string, entree: EntreeDevisComplet, admin: string, maintenant: string): Promise<string> {
  const id = idDevis();
  await sql`INSERT INTO "Devis" ("id", "dossierId", "type", "presentation", "statut", "grilleVersionId", "validiteJours", "modalitesPaiement", "entree", "creePar", "createdAt", "updatedAt")
    VALUES (${id}, ${dossierId}, ${entree.type}, ${entree.presentation}, 'BROUILLON', ${GRILLE_COURANTE.id}, ${entree.validiteJours}, ${entree.modalitesPaiement}, ${JSON.stringify(entree)}::jsonb, ${admin}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))`;
  await journaliser(sql, dossierId, admin, "DEVIS_BROUILLON_CREE", { devisId: id, type: entree.type }, maintenant);
  return id;
}

export async function modifierBrouillon(sql: Sql, id: string, entree: EntreeDevisComplet, maintenant: string): Promise<void> {
  const r = await sql`UPDATE "Devis" SET "entree" = ${JSON.stringify(entree)}::jsonb, "type" = ${entree.type}, "presentation" = ${entree.presentation},
      "validiteJours" = ${entree.validiteJours}, "modalitesPaiement" = ${entree.modalitesPaiement}, "updatedAt" = ${maintenant}::timestamp(3)
    WHERE "id" = ${id} AND "statut" = 'BROUILLON' RETURNING "id"`;
  if (!r.length) throw new RefusDevis(409, "devis_fige", "Devis émis : toute modification passe par une révision.");
}

export async function supprimerBrouillon(sql: Sql, id: string, admin: string, maintenant: string): Promise<void> {
  const r = await sql`DELETE FROM "Devis" WHERE "id" = ${id} AND "statut" = 'BROUILLON' RETURNING "dossierId"`;
  if (!r.length) throw new RefusDevis(409, "devis_fige", "Seul un brouillon (sans numéro) peut être supprimé.");
  await journaliser(sql, String(r[0].dossierId), admin, "DEVIS_BROUILLON_SUPPRIME", { devisId: id }, maintenant);
}

/** Émet un brouillon : recalcul serveur, numéro, montants, document et empreinte figés. */
export async function emettre(sql: Sql, id: string, admin: string, maintenant: string): Promise<{ numero: string; hash: string }> {
  const d = await lireDevis(sql, id, maintenant.slice(0, 10));
  if (!d) throw new RefusDevis(404, "not_found", "Devis introuvable");
  if (d.statut !== "BROUILLON") throw new RefusDevis(409, "devis_fige", "Ce devis est déjà émis.");
  const ctx = await contexteDevis(sql, d.dossierId);
  if (!ctx) throw new RefusDevis(404, "not_found", "Dossier introuvable");
  const grille = GRILLES[d.grilleVersionId] ?? GRILLE_COURANTE;
  const calc = calculerDevisComplet(d.entree, grille, ctx);
  if (!calc.ok) throw new RefusDevis(400, "devis_incomplet", "Le devis ne peut pas être émis en l'état.", calc.questions);
  const r = calc.resultat;
  const jour = maintenant.slice(0, 10), annee = Number(jour.slice(0, 4));
  const montant = montantDevis(r).fixe2(), assiette = r.assietteHonoraires?.fixe2() ?? null, cout = calc.cout?.coutTravaux.fixe2() ?? null, taux = r.tauxHonoraires.toString();

  let numero: string;
  if (d.devisOrigineId) {
    // Révision : même base, suffixe -R<n>, aucun numéro consommé.
    const o = (await sql`SELECT "numeroBase" FROM "Devis" WHERE "id" = ${d.devisOrigineId}`)[0];
    if (!o?.numeroBase) throw new RefusDevis(409, "origine_invalide", "Devis d'origine introuvable ou non émis.");
    numero = `${String(o.numeroBase)}-R${d.revision}`;
    const u = await sql`UPDATE "Devis" SET "numero" = ${numero}, "numeroBase" = ${String(o.numeroBase)}, "statut" = 'EMIS', "dateEmission" = ${jour}::date,
        "coutPrevisionnelTravaux" = ${cout}::numeric, "tauxHonoraires" = ${taux}::numeric, "assietteHonoraires" = ${assiette}::numeric, "montantTotal" = ${montant}::numeric,
        "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${id} AND "statut" = 'BROUILLON' RETURNING "numero"`;
    if (!u.length) throw new RefusDevis(409, "devis_fige", "Ce devis est déjà émis.");
    await sql`UPDATE "Devis" SET "remplacePar" = ${id}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${d.devisOrigineId}`;
  } else {
    // Le compteur n'avance que si le brouillon existe encore (même instruction : pas de trou en usage normal).
    const u = await sql`WITH b AS (SELECT "id" FROM "Devis" WHERE "id" = ${id} AND "statut" = 'BROUILLON' FOR UPDATE),
      q AS (INSERT INTO "SequenceDocument" ("type", "annee", "dernier") SELECT 'DEV', ${annee}::int, 1 FROM b
            ON CONFLICT ("type", "annee") DO UPDATE SET "dernier" = "SequenceDocument"."dernier" + 1 RETURNING "dernier")
      UPDATE "Devis" v SET "numero" = 'DEV-' || ${annee}::text || '-' || lpad(q."dernier"::text, 4, '0'),
        "numeroBase" = 'DEV-' || ${annee}::text || '-' || lpad(q."dernier"::text, 4, '0'), "statut" = 'EMIS', "dateEmission" = ${jour}::date,
        "coutPrevisionnelTravaux" = ${cout}::numeric, "tauxHonoraires" = ${taux}::numeric, "assietteHonoraires" = ${assiette}::numeric, "montantTotal" = ${montant}::numeric,
        "updatedAt" = ${maintenant}::timestamp(3)
      FROM q WHERE v."id" = ${id} RETURNING v."numero"`;
    if (!u.length) throw new RefusDevis(409, "devis_fige", "Ce devis est déjà émis.");
    numero = String(u[0].numero);
  }

  const document = construireDocument(d.entree, calc, { ...ctx.document, numero, dateEmission: jour });
  const hash = await empreinteDocument(document);
  await sql`UPDATE "Devis" SET "document" = ${JSON.stringify(document)}::jsonb, "hashContenu" = ${hash} WHERE "id" = ${id}`;
  await journaliser(sql, d.dossierId, admin, "DEVIS_EMIS", { devisId: id, numero, montantTotal: montant, empreinte: hash.slice(0, 16) }, maintenant);
  return { numero, hash };
}

/** Nouvelle révision (brouillon) d'un devis émis. */
export async function reviser(sql: Sql, id: string, admin: string, maintenant: string): Promise<string> {
  const d = await lireDevis(sql, id, maintenant.slice(0, 10));
  if (!d) throw new RefusDevis(404, "not_found", "Devis introuvable");
  if (d.statut === "BROUILLON") throw new RefusDevis(409, "deja_brouillon", "Un brouillon se modifie directement.");
  const base = d.devisOrigineId ?? d.id;
  const enCours = await sql`SELECT "id" FROM "Devis" WHERE ("devisOrigineId" = ${base} OR "id" = ${base}) AND "statut" = 'BROUILLON' LIMIT 1`;
  if (enCours.length) throw new RefusDevis(409, "revision_en_cours", "Une révision est déjà en cours de rédaction.");
  const max = await sql`SELECT coalesce(max("revision"), 1)::int AS m FROM "Devis" WHERE "id" = ${base} OR "devisOrigineId" = ${base}`;
  const nouv = idDevis();
  await sql`INSERT INTO "Devis" ("id", "dossierId", "revision", "devisOrigineId", "type", "presentation", "statut", "grilleVersionId", "validiteJours", "modalitesPaiement", "entree", "creePar", "createdAt", "updatedAt")
    VALUES (${nouv}, ${d.dossierId}, ${(Number(max[0]?.m) || 1) + 1}, ${base}, ${d.type}, ${d.presentation}, 'BROUILLON', ${GRILLE_COURANTE.id}, ${d.validiteJours}, ${d.entree.modalitesPaiement}, ${JSON.stringify(d.entree)}::jsonb, ${admin}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3))`;
  await journaliser(sql, d.dossierId, admin, "DEVIS_REVISION_OUVERTE", { devisId: nouv, origine: d.numero }, maintenant);
  return nouv;
}

export async function refuser(sql: Sql, id: string, admin: string, maintenant: string): Promise<void> {
  const r = await sql`UPDATE "Devis" SET "statut" = 'REFUSE', "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${id} AND "statut" = 'EMIS' RETURNING "dossierId", "numero"`;
  if (!r.length) throw new RefusDevis(409, "statut_invalide", "Seul un devis émis peut être marqué refusé.");
  await journaliser(sql, String(r[0].dossierId), admin, "DEVIS_REFUSE", { devisId: id, numero: r[0].numero }, maintenant);
}

/** Devis émis dont le document n'a pas été enregistré (coupure entre deux écritures) : reconstruit à l'identique. */
export async function reparerDocument(sql: Sql, d: DevisLu): Promise<DevisLu> {
  if (!d.numero || d.document || !d.dateEmission) return d;
  const ctx = await contexteDevis(sql, d.dossierId);
  if (!ctx) return d;
  const calc = calculerDevisComplet(d.entree, GRILLES[d.grilleVersionId] ?? GRILLE_COURANTE, ctx);
  if (!calc.ok) return d;
  const document = construireDocument(d.entree, calc, { ...ctx.document, numero: d.numero, dateEmission: d.dateEmission });
  const hash = await empreinteDocument(document);
  await sql`UPDATE "Devis" SET "document" = ${JSON.stringify(document)}::jsonb, "hashContenu" = ${hash} WHERE "id" = ${d.id} AND "document" IS NULL`;
  return { ...d, document, hashContenu: hash };
}
