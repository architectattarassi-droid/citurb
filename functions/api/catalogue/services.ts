/**
 * GET /api/catalogue/services?ouvrage=&prestation=&nature=&lot=&region=&q=&fournisseur= — prestations approuvées de pros vérifiés, prix agrégé à partir de 3 pros.
 * Contrat : docs/architecture/contrat-catalogue.md. Toujours 200 : base indisponible → { disponible: false }.
 */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { catalogueServices } from "../../_lib/catalogue";
import { apercu, depotOuNull } from "../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await catalogueServices(new URL(ctx.request.url).searchParams, await depotOuNull(ctx.env), { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin }));
