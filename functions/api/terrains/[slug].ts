/** Cloudflare Pages Function — GET /api/terrains/:slug : une annonce publiée (vue publique). */
import { neon } from "@neondatabase/serverless";
import { annonceParSlug, type Sql } from "../../_lib/terrains";

interface Env { DATABASE_URL?: string }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? "public, max-age=120" : "no-store" } });

export async function onRequestGet(ctx: { params: { slug?: string | string[] }; env: Env }): Promise<Response> {
  const slug = String(Array.isArray(ctx.params.slug) ? ctx.params.slug[0] : ctx.params.slug || "");
  if (!ctx.env.DATABASE_URL) return json(404, { ok: false, error: "not_found" });
  try {
    const a = await annonceParSlug(neon(ctx.env.DATABASE_URL) as unknown as Sql, slug);
    return a ? json(200, a) : json(404, { ok: false, error: "not_found" });
  } catch {
    return json(404, { ok: false, error: "not_found" });
  }
}
