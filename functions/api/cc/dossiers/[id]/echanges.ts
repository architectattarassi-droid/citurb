/** GET /api/cc/dossiers/<id>/echanges — RDV, appels vidéo et messages du dossier, au même endroit (functions/_lib/dossierEchanges.ts). */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { echangesDuDossier } from "../../../../_lib/dossierEchanges";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try { return json(200, { ok: true, ...(await echangesDuDossier(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""))) }); }
  catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}
