/**
 * GET /api/cc/dossiers/doublons?telephone=…&email=… — dédoublonnage avant la
 * création d'un dossier par l'admin : comptes clients, leads et dossiers de
 * même téléphone (9 derniers chiffres) ou e-mail. Réservé à /api/cc (garde admin).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { chercherDoublons, type Sql } from "../../../_lib/dossierAdmin";

export async function onRequestGet(ctx: { request: Request; env: { DATABASE_URL?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const q = new URL(ctx.request.url).searchParams;
  try {
    const r = await chercherDoublons(neon(ctx.env.DATABASE_URL) as unknown as Sql, { telephone: q.get("telephone")?.slice(0, 30), email: q.get("email")?.slice(0, 160) });
    return json(200, { ok: true, ...r });
  } catch (e) {
    console.error(`[cc/dossiers/doublons] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
