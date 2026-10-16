/** GET /api/client/projets — espaces projet (chantier) des dossiers du client (session cli_session). */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { SessionClient } from "../../../_lib/clientSession";
import type { Sql } from "../../../_lib/projetsNeon";
import { projetsDuClient } from "../../../_lib/projetsClient";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; data: { client?: SessionClient } }): Promise<Response> {
  if (!ctx.data.client) return json(401, { ok: false, error: "unauthenticated" });
  try {
    return json(200, { ok: true, projets: await projetsDuClient(neon(ctx.env.DATABASE_URL!) as unknown as Sql, ctx.data.client) });
  } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}
