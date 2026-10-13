/** Cloudflare Pages Function — /sitemap-cercles.xml : annuaire des pros (FR/AR) et fiches publiques des pros vérifiés. */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "./_lib/cercles";
import { sitemapCercles } from "./_lib/seoCercles";

const VIDE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://citurbarea.com/cercles/annuaire</loc></url>
  <url><loc>https://citurbarea.com/ar/cercles/annuaire</loc></url>
</urlset>
`;

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string } }): Promise<Response> {
  let xml = VIDE;
  if (ctx.env.DATABASE_URL) { try { xml = await sitemapCercles(neon(ctx.env.DATABASE_URL) as unknown as Sql); } catch { /* tables absentes : annuaire seul */ } }
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
