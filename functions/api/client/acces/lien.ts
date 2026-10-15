/**
 * POST /api/client/acces/lien { jeton } — ouvre la session client à partir du lien
 * d'invitation /mon-dossier/<jeton> (lot 3a). Pose le cookie cli_session (30 jours,
 * Path=/api/client). Origin contrôlée par ../_middleware.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { DUREE_CLIENT_S, enteteCookieClient, secretClient, type EnvClient, type Sql } from "../../../_lib/clientSession";
import { ouvrirParLien } from "../../../_lib/clientAcces";
import { secretLien, type LienEnv } from "../../../_lib/dossierAdmin";

export async function onRequestPost(ctx: { request: Request; env: EnvClient & LienEnv & { DATABASE_URL?: string } }): Promise<Response> {
  const sLien = secretLien(ctx.env), sSession = secretClient(ctx.env);
  if (!sLien || !sSession) return json(503, { ok: false, error: "access_not_configured" });
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 2048 ? JSON.parse(t) : null; } catch { /* corps illisible */ }
  try {
    const r = await ouvrirParLien(neon(ctx.env.DATABASE_URL) as unknown as Sql, (corps as { jeton?: unknown } | null)?.jeton, sLien, sSession);
    return json(r.status, r.json, r.cookie ? { "set-cookie": enteteCookieClient(r.cookie, DUREE_CLIENT_S) } : {});
  } catch (e) {
    console.error(`[client/acces/lien] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
