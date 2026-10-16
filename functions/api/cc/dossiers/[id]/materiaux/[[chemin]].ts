/**
 * Back-office — carnet des matériaux d'un dossier (contrat docs/architecture/contrat-carnet-materiaux.md).
 *   GET   /api/cc/dossiers/:id/materiaux[?etape=<code>]  toutes les lignes (propositions et carnet)
 *   POST  /api/cc/dossiers/:id/materiaux                 l'architecte prescrit (statut VALIDE), y compris depuis une page d'étape (etapeCode)
 *   PATCH /api/cc/dossiers/:id/materiaux/<ligne>         décision : { statut: EN_ETUDE|VALIDE|REFUSE|VARIANTE_PROPOSEE, motif?, varianteCode? }
 * Chaque décision est journalisée (DossierEvenement) et le client est prévenu par la
 * messagerie de la plateforme (aucun e-mail de tiers). Garde : ../../../_middleware.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../../_lib/adminSession";
import { FICHIER_SQL, TableAbsente, lireCarnet, messageDecision, proposer, statuer } from "../../../../../_lib/carnetMateriaux";
import type { Sql } from "../../../../../_lib/dossierAdmin";
import { lireJson } from "../../../../../_lib/cercles";
import { contexteNeon } from "../../../../../_lib/contexteNeon";
import { creerFil } from "../../../../../_lib/messagerieService";
import type { EnvAppels } from "../../../../../_lib/appelsService";
import type { Sql as SqlAppels } from "../../../../../_lib/appelsDepot";
import { lireProposition } from "../../../../../../apps/web/src/domain/materiaux/carnet";

type Ctx = { request: Request; env: EnvAppels; params: { id?: string; chemin?: string | string[] }; data: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void };

const segs = (c: string | string[] | undefined) => (Array.isArray(c) ? c : c ? [c] : []).filter(Boolean);

async function proteger(f: () => Promise<Response>): Promise<Response> {
  try { return await f(); } catch (e) {
    if (e instanceof TableAbsente) return json(503, { ok: false, error: "sql_a_coller", fichier: FICHIER_SQL });
    console.error(`[cc/materiaux] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequest(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const id = String(ctx.params.id || "");
  const chemin = segs(ctx.params.chemin);
  const admin = String(ctx.data.adminEmail || "admin");
  const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
  const m = ctx.request.method;

  if (m === "GET" && !chemin.length)
    return proteger(async () => json(200, { ok: true, lignes: await lireCarnet(sql, id, { etape: new URL(ctx.request.url).searchParams.get("etape") }) }));

  if (m === "POST" && !chemin.length) {
    const e = lireProposition(await lireJson(ctx.request, 8 * 1024));
    if (!e.ok) return json(400, { ok: false, error: e.erreur });
    return proteger(async () => {
      const r = await proposer(sql, id, e.v, { genre: "admin", email: admin });
      return r.ok ? json(201, { ok: true, ligne: r.ligne }) : json(r.status, { ok: false, error: r.erreur });
    });
  }

  if (m === "PATCH" && chemin.length === 1) {
    const corps = await lireJson(ctx.request, 4 * 1024);
    return proteger(async () => {
      const r = await statuer(sql, id, chemin[0], corps, admin);
      if (!r.ok) return json(r.status, { ok: false, error: r.erreur });
      // Le client est prévenu par la messagerie de la plateforme (au mieux : un échec n'annule pas la décision).
      if (r.ligne.proposePar === "CLIENT") {
        const envoi = creerFil(contexteNeon(ctx.env, sql as unknown as SqlAppels), { genre: "admin", email: admin }, {
          contexte: "dossier", objetId: id, invites: [{ type: "client", dossierId: id }], sujet: "Carnet des matériaux", texte: messageDecision(r.ligne),
        }).catch(() => null);
        if (ctx.waitUntil) ctx.waitUntil(envoi); else await envoi;
      }
      return json(200, { ok: true, ligne: r.ligne });
    });
  }
  return json(405, { ok: false, error: "methode_non_permise" });
}
