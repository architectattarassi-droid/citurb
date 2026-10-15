/**
 * POST /api/client/acces/demande { email? | telephone? } — « recevoir mon lien d'accès ».
 * Réponse identique que le compte existe ou non (functions/_lib/clientAcces.ts).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { demanderLien } from "../../../_lib/clientAcces";
import { ipDe, type EnvCercles } from "../../../_lib/cercles";
import { secretLien, type LienEnv, type Sql } from "../../../_lib/dossierAdmin";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles & LienEnv }): Promise<Response> {
  const sLien = secretLien(ctx.env);
  if (!sLien) return json(503, { ok: false, error: "access_not_configured" });
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 2048 ? JSON.parse(t) : null; } catch { /* corps illisible */ }
  try {
    const r = await demanderLien(neon(ctx.env.DATABASE_URL) as unknown as Sql, corps, ctx.env, sLien, new URL(ctx.request.url).origin, ipDe(ctx.request.headers));
    return json(r.status, r.json);
  } catch (e) {
    console.error(`[client/acces/demande] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
