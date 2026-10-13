/** DELETE /api/cercles/espace/documents/:id — retire un document déposé. */
import { repondre, type EnvCercles } from "../../../../_lib/cercles";
import { supprimerDocument } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export const onRequestDelete = async (ctx: { env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => supprimerDocument(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/documents/:id"));
