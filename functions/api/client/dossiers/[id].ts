/**
 * GET /api/client/dossiers/<id> — vue client d'un de SES dossiers (lot 3b).
 * Même vue que /api/mon-dossier (functions/_lib/vueDossierClient.ts) ; un dossier
 * d'un autre compte répond 404, comme un dossier inexistant.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { SessionClient, Sql } from "../../../_lib/clientSession";
import { lireVueDossierClient } from "../../../_lib/vueDossierClient";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string }; data: { client?: SessionClient } }): Promise<Response> {
  const c = ctx.data.client;
  const id = String(ctx.params.id || "");
  if (!c) return json(401, { ok: false, error: "unauthenticated" });
  if (!c.dossierIds.includes(id)) return json(404, { ok: false, error: "not_found" });
  try {
    const dossier = await lireVueDossierClient(neon(ctx.env.DATABASE_URL!) as unknown as Sql, id);
    return dossier ? json(200, { ok: true, dossier }) : json(404, { ok: false, error: "not_found" });
  } catch (e) {
    console.error(`[client/dossiers] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
