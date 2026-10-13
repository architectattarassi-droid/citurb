/**
 * GET /api/catalogue/produits?code=&region=&categorie=&famille=&gamme=&q=&fournisseur= — produits approuvés de pros vérifiés, variantes groupées, prix agrégé à partir de 3 fournisseurs.
 * Contrat : docs/architecture/contrat-catalogue.md. Toujours 200 : base indisponible → { disponible: false }.
 */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { catalogueProduits } from "../../_lib/catalogue";
import { apercu, depotOuNull } from "../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await catalogueProduits(new URL(ctx.request.url).searchParams, await depotOuNull(ctx.env), { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin }));
