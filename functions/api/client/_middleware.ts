/**
 * Garde de /api/client/* (espace client, lot 3a) : cookie cli_session signé +
 * compte CLIENT actif (functions/_lib/clientSession.ts). La session trouvée est
 * posée dans ctx.data.client = { clientId, dossierIds } pour les routes filles.
 * /api/client/acces/* passe sans session (ouverture par lien, demande de lien, déconnexion).
 * Requête modifiante → Origin doit être l'hôte (anti-CSRF, en plus de SameSite=Strict).
 * Fermé par défaut : sans secret ni base → 503.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../_lib/adminSession";
import { lireSessionClient, secretClient, type EnvClient, type Sql } from "../../_lib/clientSession";

const LECTURE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function onRequest(ctx: { request: Request; env: EnvClient & { DATABASE_URL?: string }; data: Record<string, unknown>; next: () => Promise<Response> }): Promise<Response> {
  const url = new URL(ctx.request.url);
  if (!LECTURE.has(ctx.request.method) && ctx.request.headers.get("origin") !== url.origin) return json(403, { ok: false, error: "forbidden_origin" });
  let res: Response;
  if (url.pathname.startsWith("/api/client/acces/")) {
    res = await ctx.next();
  } else {
    if (!secretClient(ctx.env)) return json(503, { ok: false, error: "access_not_configured" });
    if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
    let session;
    try {
      session = await lireSessionClient(ctx.request, ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    } catch (e) {
      console.error(`[client] session illisible (${(e as { code?: string })?.code || "sans code"})`);
      return json(503, { ok: false, error: "storage_unavailable" });
    }
    if (!session) return json(401, { ok: false, error: "unauthenticated" });
    ctx.data.client = session;
    res = await ctx.next();
  }
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "no-store");
  out.headers.set("x-robots-tag", "noindex");
  return out;
}
