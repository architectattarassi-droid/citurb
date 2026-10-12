/**
 * Cloudflare Pages Function — middleware global
 *
 * Le même déploiement répond sur citurbarea.com, admin.citurbarea.com et
 * *.pages.dev (production et previews). Seul citurbarea.com doit être
 * indexé : les autres hôtes reçoivent X-Robots-Tag: noindex, nofollow pour
 * ne pas concurrencer le domaine principal dans Google.
 *
 * /assets/* absent (chunk d'un ancien build) : le fallback SPA renverrait
 * index.html en 200 avec l'en-tête immutable d'un an de _headers, ce qui
 * empoisonne le cache navigateur sous le nom du chunk. On répond un vrai 404
 * non mis en cache ; l'app recharge alors une fois (lib/chunkReload).
 */

import { neon } from "@neondatabase/serverless";
import { PAGES_SEO, jsonLdChiffrage, pageTerrains, reecrire } from "./_lib/seo";
import type { Sql } from "./_lib/terrains";

const HOTE_INDEXABLE = "citurbarea.com";

export async function onRequest(ctx: { request: Request; next: () => Promise<Response>; env?: { DATABASE_URL?: string } }): Promise<Response> {
  let res = await ctx.next();
  const url = new URL(ctx.request.url);
  // Pages de l'application à référencer : titre, description, canonique et contenu dans le HTML servi.
  const chemin = url.pathname.replace(/\/+$/, "") || "/";
  const estHtml = (res.headers.get("content-type") || "").includes("text/html");
  const page = PAGES_SEO[chemin];
  if (page && estHtml) {
    res = reecrire(res, page, chemin.startsWith("/chiffrage") && !page.noindex ? jsonLdChiffrage : undefined);
  } else if (estHtml && chemin.startsWith("/p4/terrains") && ctx.env?.DATABASE_URL) {
    // Annonces de terrains : contenu réel (Neon) servi aux moteurs.
    try {
      const p = await pageTerrains(neon(ctx.env.DATABASE_URL) as unknown as Sql, chemin);
      if (p) res = reecrire(res, p);
    } catch { /* la page reste servie telle quelle */ }
  }
  if (url.pathname.startsWith("/assets/") && (res.headers.get("content-type") || "").includes("text/html")) {
    return new Response("Asset introuvable", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (url.hostname === HOTE_INDEXABLE) return res;
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow");
  return out;
}
