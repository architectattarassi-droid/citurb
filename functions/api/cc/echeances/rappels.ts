/** POST /api/cc/echeances/rappels — envoie à l'administration les rappels J−90 / J−30 / J−7 dus (une fois par seuil). */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { Sql } from "../../../_lib/dossierAdmin";
import { envoyerRappels } from "../../../_lib/echeances";
import type { EnvMail } from "../../../_lib/rdv";

export async function onRequestPost(ctx: { env: EnvMail & { DATABASE_URL?: string; PUBLIC_WEB_URL?: string }; data: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const r = await envoyerRappels(neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.env, new Date().toISOString().slice(0, 10), `admin:${String(ctx.data.adminEmail || "")}`);
    return json(200, { ok: true, ...r });
  } catch (e) {
    console.error(`[cc/echeances/rappels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
