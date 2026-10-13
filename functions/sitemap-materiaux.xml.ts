/** Cloudflare Pages Function — /sitemap-materiaux.xml : matériauthèque (catalogue, familles, fiches). */
import { sitemapMateriaux } from "./_lib/seoMateriaux";

export function onRequestGet(): Response {
  return new Response(sitemapMateriaux(), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
