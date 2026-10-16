/**
 * Espace client — carnet des matériaux de SON dossier (contrat docs/architecture/contrat-carnet-materiaux.md).
 *   GET  /api/client/dossiers/:id/materiaux[?etape=<code>]   propositions et carnet (statut, motif)
 *   POST /api/client/dossiers/:id/materiaux                   proposer un matériau du catalogue (à partir de l'APD)
 * Garde : ../../_middleware.ts (cookie cli_session) ; dossier hors de la session → 404.
 * Le client ne peut jamais statuer (aucune route PATCH ici).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { SessionClient } from "../../../../_lib/clientSession";
import { FICHIER_SQL, TableAbsente, lireCarnet, proposer } from "../../../../_lib/carnetMateriaux";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { lireJson } from "../../../../_lib/cercles";
import { lireProposition } from "../../../../../apps/web/src/domain/materiaux/carnet";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: { client?: SessionClient } };

function garde(ctx: Ctx): { id: string; c: SessionClient } | Response {
  const c = ctx.data.client;
  const id = String(ctx.params.id || "");
  if (!c) return json(401, { ok: false, error: "unauthenticated" });
  if (!c.dossierIds.includes(id)) return json(404, { ok: false, error: "not_found" });
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  return { id, c };
}

async function proteger(f: () => Promise<Response>): Promise<Response> {
  try { return await f(); } catch (e) {
    if (e instanceof TableAbsente) return json(503, { ok: false, error: "sql_a_coller", fichier: FICHIER_SQL });
    console.error(`[client/materiaux] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export function onRequestGet(ctx: Ctx): Promise<Response> {
  const g = garde(ctx);
  if (g instanceof Response) return Promise.resolve(g);
  const etape = new URL(ctx.request.url).searchParams.get("etape");
  return proteger(async () => json(200, { ok: true, lignes: await lireCarnet(neon(ctx.env.DATABASE_URL!) as unknown as Sql, g.id, { etape }) }));
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const g = garde(ctx);
  if (g instanceof Response) return g;
  const corps = await lireJson(ctx.request, 8 * 1024);
  const e = lireProposition(corps);
  if (!e.ok) return json(400, { ok: false, error: e.erreur });
  return proteger(async () => {
    const r = await proposer(neon(ctx.env.DATABASE_URL!) as unknown as Sql, g.id, e.v, { genre: "client", clientId: g.c.clientId });
    return r.ok ? json(201, { ok: true, ligne: r.ligne }) : json(r.status, { ok: false, error: r.erreur });
  });
}
