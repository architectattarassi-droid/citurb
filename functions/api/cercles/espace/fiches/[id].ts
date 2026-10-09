/** DELETE /api/cercles/espace/fiches/:id — retire une fiche. GET — son historique daté. */
import { repondre, type EnvCercles } from "../../../../_lib/cercles";
import { historiqueFiche, supprimerFiche } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } };

export const onRequestDelete = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => supprimerFiche(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/fiches/:id"));

export const onRequestGet = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => historiqueFiche(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/fiches/:id"));
