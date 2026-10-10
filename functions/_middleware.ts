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

const HOTE_INDEXABLE = "citurbarea.com";

export async function onRequest(ctx: { request: Request; next: () => Promise<Response> }): Promise<Response> {
  const res = await ctx.next();
  const url = new URL(ctx.request.url);
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
