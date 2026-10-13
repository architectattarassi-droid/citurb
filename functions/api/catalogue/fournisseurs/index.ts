/** GET /api/catalogue/fournisseurs?region=&categorie=&famille=&metier=&q= — pros vérifiés ayant des offres publiées. Contrat : docs/architecture/contrat-catalogue.md. */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { catalogueFournisseurs } from "../../../_lib/catalogue";
import { apercu, depotOuNull } from "../../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await catalogueFournisseurs(new URL(ctx.request.url).searchParams, await depotOuNull(ctx.env), { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin }));
