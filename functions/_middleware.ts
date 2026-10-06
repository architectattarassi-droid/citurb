/**
 * Cloudflare Pages Function — middleware global
 *
 * Le même déploiement répond sur citurbarea.com, admin.citurbarea.com et
 * *.pages.dev (production et previews). Seul citurbarea.com doit être
 * indexé : les autres hôtes reçoivent X-Robots-Tag: noindex, nofollow pour
 * ne pas concurrencer le domaine principal dans Google.
 */

const HOTE_INDEXABLE = "citurbarea.com";

export async function onRequest(ctx: { request: Request; next: () => Promise<Response> }): Promise<Response> {
  const res = await ctx.next();
  if (new URL(ctx.request.url).hostname === HOTE_INDEXABLE) return res;
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow");
  return out;
}
