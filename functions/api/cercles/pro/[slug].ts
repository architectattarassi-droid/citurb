/** GET /api/cercles/pro/:slug — fiche publique d'un pro vérifié : société, produits, services, matériaux chiffrés (sans prix nominatif ni coordonnées). */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { fichePro } from "../../../_lib/catalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";
import { apercu } from "../../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles; params: { slug: string } }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => fichePro(String(ctx.params.slug).slice(0, 80), d, { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin }), "cercles/pro/:slug"));
