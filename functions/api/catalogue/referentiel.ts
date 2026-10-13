/** GET /api/catalogue/referentiel — codes du référentiel créés à la modération (CIT-<PFX>-9NN). */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { referentielPublic } from "../../_lib/catalogue";
import { depotOuNull } from "../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { env: EnvCercles }): Promise<Response> => repondre(await referentielPublic(await depotOuNull(ctx.env)));
