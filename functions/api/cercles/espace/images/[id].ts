/**
 * GET /api/cercles/espace/images/:id[?taille=vignette] — aperçu pour le pro propriétaire (même avant modération, jamais en cache public).
 * PATCH {ordre?, legendeFr?, legendeAr?, principale?: true} — DELETE — retrait.
 */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { majImage, octetsProprietaire, reponseImage, supprimerImage } from "../../../../_lib/imagesCatalogue";
import { avecDepot } from "../../../../_lib/fournisseursDepot";
import { depotOuNull } from "../../../../_lib/lecturePublique";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } };

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const depot = await depotOuNull(ctx.env);
  const vignette = new URL(ctx.request.url).searchParams.get("taille") === "vignette";
  try {
    return reponseImage(depot ? await octetsProprietaire(String(ctx.data.fournisseurId), String(ctx.params.id), vignette, depot) : null, ctx.request, false);
  } catch { return reponseImage(null, ctx.request, false); }
}

export async function onRequestPatch(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 4096);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => majImage(String(ctx.data.fournisseurId), String(ctx.params.id), body, d), "cercles/espace/images/:id"));
}

export const onRequestDelete = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => supprimerImage(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/images/:id"));
