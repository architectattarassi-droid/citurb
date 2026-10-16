/**
 * POST /api/client/projets/<id>/ouvrir — un seul accès client : la session cli_session ouvre l'espace
 * projet de son dossier (cookie projet_session posé ici), sans second lien. functions/_lib/projetsClient.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { SessionClient } from "../../../../_lib/clientSession";
import type { EnvSession } from "../../../../_lib/projets";
import type { Sql } from "../../../../_lib/projetsNeon";
import { ouvrirProjetClient } from "../../../../_lib/projetsClient";

export async function onRequestPost(ctx: { env: EnvSession & { DATABASE_URL?: string }; params: { id?: string }; data: { client?: SessionClient } }): Promise<Response> {
  if (!ctx.data.client) return json(401, { ok: false, error: "unauthenticated" });
  try {
    const r = await ouvrirProjetClient(neon(ctx.env.DATABASE_URL!) as unknown as Sql, ctx.env, ctx.data.client, String(ctx.params.id || ""));
    return json(r.status, r.corps, r.cookie ? { "set-cookie": r.cookie } : {});
  } catch (e) {
    console.error(`[client/projets/ouvrir] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
