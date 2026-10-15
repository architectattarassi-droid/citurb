/**
 * GET /api/cc/dossiers/<id>/vue-client — ce que voit le client (vue « shadow »),
 * exactement la vue de /api/mon-dossier et de l'espace client
 * (functions/_lib/vueDossierClient.ts). Archivé ou introuvable → 404.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { lireVueDossierClient } from "../../../../_lib/vueDossierClient";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const dossier = await lireVueDossierClient(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""));
    return dossier ? json(200, { ok: true, dossier }) : json(404, { ok: false, error: "not_found" });
  } catch (e) {
    console.error(`[cc/dossiers/vue-client] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
