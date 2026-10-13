/** GET /api/prix/ouvrages?region=&codes= — prix d'ouvrage du chiffrage + médianes des offres de services (fourni-posé, pose seule) et des prestations. Toujours 200 : sans base, marcheDisponible false. */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { prixOuvrages } from "../../_lib/catalogue";
import { apercu, depotOuNull } from "../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await prixOuvrages(new URL(ctx.request.url).searchParams, await depotOuNull(ctx.env), { inclureFictifs: apercu(ctx.request) }));
