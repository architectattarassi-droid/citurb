/** GET /api/catalogue/fournisseurs/:slug/produits — fiche société publique, produits groupés par famille, prestations par nature, galeries. */
import { repondre, type EnvCercles } from "../../../../_lib/cercles";
import { catalogueFournisseur } from "../../../../_lib/catalogue";
import { apercu, depotOuNull } from "../../../../_lib/lecturePublique";

export async function onRequestGet(ctx: { request: Request; env: EnvCercles; params: { slug: string } }): Promise<Response> {
  const depot = await depotOuNull(ctx.env);
  try {
    return repondre(await catalogueFournisseur(String(ctx.params.slug).slice(0, 80), depot, { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin }));
  } catch {
    return repondre({ status: 200, json: { ok: true, disponible: false, fournisseur: null, familles: [], services: [] } });
  }
}
