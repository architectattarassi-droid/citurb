/**
 * /api/cc/devis/<id> — un devis (admin).
 *   GET    : devis complet (saisie, document figé, empreinte, statut effectif) + contexte du dossier.
 *   PATCH  : { entree } → modifie un BROUILLON (un devis émis est figé : révision).
 *   DELETE : supprime un BROUILLON (aucun numéro consommé).
 *   POST   : { action: "emettre" | "reviser" | "refuser" }
 *            | { action: "accepter", pack?, commandees[], inclureHorsHonoraires?, dateAcceptation, justificatif: { nom, contenu (base64) } }
 *              (devis signé scanné obligatoire : spec §6.2 ; acceptation en ligne par le client : /api/client/dossiers/<id>/devis).
 * Logique : functions/_lib/devisDepot.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { lireJson } from "../../../_lib/cercles";
import { GRILLE_COURANTE, RefusDevis, contexteDevis, emettre, lireDevis, modifierBrouillon, refuser, reparerDocument, reviser, supprimerBrouillon, tablesDevis } from "../../../_lib/devisDepot";
import type { Sql } from "../../../_lib/dossierAdmin";
import { RefusFacturation, accepterDevis, deposerJustificatif, lireAcceptation, tablesFacturation } from "../../../_lib/facturationDepot";
import { validerEntreeDevis } from "../../../../apps/web/src/domain/honoraires/validationEntree";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> };

async function executer(ctx: Ctx, f: (sql: Sql, id: string, admin: string, maintenant: string) => Promise<Response>): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await tablesDevis(sql))) return json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" });
    return await f(sql, String(ctx.params.id || ""), String(ctx.data.adminEmail || "admin"), new Date().toISOString());
  } catch (e) {
    if (e instanceof RefusDevis || e instanceof RefusFacturation) return json(e.status, { ok: false, error: e.code, message: e.message, erreurs: e.details });
    console.error(`[cc/devis] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export const onRequestGet = (ctx: Ctx) => executer(ctx, async (sql, id, _a, maintenant) => {
  const d = await lireDevis(sql, id, maintenant.slice(0, 10));
  if (!d) return json(404, { ok: false, error: "not_found" });
  const devis = await reparerDocument(sql, d);
  return json(200, { ok: true, devis, contexte: await contexteDevis(sql, d.dossierId) });
});

export const onRequestPatch = (ctx: Ctx) => executer(ctx, async (sql, id, _a, maintenant) => {
  const b = await lireJson(ctx.request, 64 * 1024) as { entree?: unknown } | null;
  const v = validerEntreeDevis(b?.entree, GRILLE_COURANTE);
  if (!v.ok) return json(400, { ok: false, error: "validation", erreurs: v.erreurs });
  await modifierBrouillon(sql, id, v.entree, maintenant);
  return json(200, { ok: true });
});

export const onRequestDelete = (ctx: Ctx) => executer(ctx, async (sql, id, admin, maintenant) => {
  await supprimerBrouillon(sql, id, admin, maintenant);
  return json(200, { ok: true });
});

export const onRequestPost = (ctx: Ctx) => executer(ctx, async (sql, id, admin, maintenant) => {
  const b = await lireJson(ctx.request, 7 * 1024 * 1024) as ({ action?: string } & Record<string, unknown>) | null;
  switch (b?.action) {
    case "emettre": return json(200, { ok: true, ...(await emettre(sql, id, admin, maintenant)) });
    case "reviser": return json(201, { ok: true, devisId: await reviser(sql, id, admin, maintenant) });
    case "refuser": await refuser(sql, id, admin, maintenant); return json(200, { ok: true });
    case "accepter": {
      if (!(await tablesFacturation(sql))) return json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" });
      const a = lireAcceptation(b, maintenant.slice(0, 10));
      if ("erreur" in a) return json(400, { ok: false, error: "validation", message: a.erreur });
      const j = b.justificatif && typeof b.justificatif === "object" ? (b.justificatif as Record<string, unknown>) : null;
      if (!j) return json(400, { ok: false, error: "preuve_requise", message: "Joindre le devis signé scanné (PDF, JPEG ou WebP)." });
      const d = await lireDevis(sql, id, maintenant.slice(0, 10));
      if (!d) return json(404, { ok: false, error: "not_found" });
      const documentId = await deposerJustificatif(sql, d.dossierId, j, `admin:${admin}`, maintenant);
      return json(200, { ok: true, ...(await accepterDevis(sql, id, { ...a, preuve: { type: "SIGNE_SCANNE", documentId, saisiPar: admin } }, admin, maintenant)) });
    }
    default: return json(400, { ok: false, error: "action_inconnue" });
  }
});
