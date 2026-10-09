/** GET /api/cercles/espace/moi — profil du fournisseur connecté + ses fiches. PUT — mise à jour du profil. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { majProfil, moi } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown> };

export const onRequestGet = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => moi(String(ctx.data.fournisseurId), d), "cercles/espace/moi"));

export async function onRequestPut(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 16 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => majProfil(String(ctx.data.fournisseurId), body, d), "cercles/espace/moi"));
}
