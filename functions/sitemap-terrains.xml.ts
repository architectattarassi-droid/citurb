/** Cloudflare Pages Function — /sitemap-terrains.xml : annonces de terrains publiées (Neon). */
import { neon } from "@neondatabase/serverless";
import { sitemapTerrains } from "./_lib/seo";
import type { Sql } from "./_lib/terrains";

interface Env { DATABASE_URL?: string }

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://citurbarea.com/p4/terrains</loc></url></urlset>\n`;
  if (ctx.env.DATABASE_URL) {
    try { xml = await sitemapTerrains(neon(ctx.env.DATABASE_URL) as unknown as Sql); } catch { /* repli statique */ }
  }
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
