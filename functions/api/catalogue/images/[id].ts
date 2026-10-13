/**
 * GET /api/catalogue/images/:id?v=<empreinte>[&taille=vignette] — image publique : servie seulement si elle est
 * approuvée, que son pro est vérifié et sa fiche publiée (sinon 404). Cache immuable (l'empreinte est dans l'URL), ETag.
 */
import { reponseImage } from "../../../_lib/imagesCatalogue";
import { apercu, depotOuNull } from "../../../_lib/lecturePublique";

export async function onRequestGet(ctx: { request: Request; env: { DATABASE_URL?: string }; params: { id: string } }): Promise<Response> {
  const id = String(ctx.params.id);
  if (!/^img_[A-Za-z0-9_-]{16,40}$/.test(id)) return reponseImage(null, ctx.request, true);
  const depot = await depotOuNull(ctx.env);
  const vignette = new URL(ctx.request.url).searchParams.get("taille") === "vignette";
  try {
    return reponseImage(depot ? await depot.imOctetsPublics(id, vignette, apercu(ctx.request)) : null, ctx.request, true);
  } catch { return reponseImage(null, ctx.request, true); }
}
