/**
 * GET /api/cercles/espace/images — images du pro connecté et quota.
 * POST — dépôt d'une image {objetType: PRODUIT|SERVICE|SOCIETE, objetId, image, vignette (base64, WebP/JPEG redimensionnés
 * dans le navigateur), legendeFr?, legendeAr?} : type réel, taille, dimensions et quota contrôlés, EXIF retiré, en vérification.
 */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { deposerImage, imagesDuPro } from "../../../../_lib/imagesCatalogue";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown> };

export const onRequestGet = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => imagesDuPro(String(ctx.data.fournisseurId), d), "cercles/espace/images"));

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 800 * 1024);
  if (body === null) return repondre(erreur(400, "image_trop_lourde"));
  return repondre(await avecDepot(ctx.env, (d) => deposerImage(String(ctx.data.fournisseurId), body, d), "cercles/espace/images"));
}
