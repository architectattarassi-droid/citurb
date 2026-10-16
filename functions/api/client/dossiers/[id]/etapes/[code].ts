/** GET /api/client/dossiers/<id>/etapes/<code> — page d'une étape vue par le client (sans données du cabinet ni coordonnées). */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../../_lib/adminSession";
import type { SessionClient } from "../../../../../_lib/clientSession";
import type { Sql } from "../../../../../_lib/dossierAdmin";
import { lireEtapeClient } from "../../../../../_lib/etapeDossier";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string; code?: string }; data: { client?: SessionClient } }): Promise<Response> {
  const id = String(ctx.params.id || "");
  if (!ctx.data.client?.dossierIds.includes(id)) return json(404, { ok: false, error: "not_found" });
  try {
    const e = await lireEtapeClient(neon(ctx.env.DATABASE_URL!) as unknown as Sql, id, String(ctx.params.code || ""));
    return e ? json(200, { ok: true, ...e }) : json(404, { ok: false, error: "not_found" });
  } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}
