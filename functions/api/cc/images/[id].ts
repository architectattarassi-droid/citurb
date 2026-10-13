/** GET /api/cc/images/:id[?taille=vignette] — aperçu admin (tout statut). PATCH {statut: APPROVED|REJECTED, motif?} — modération. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { modererImage, reponseImage } from "../../../_lib/imagesCatalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";
import { depotOuNull } from "../../../_lib/lecturePublique";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } };

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const depot = await depotOuNull(ctx.env);
  const vignette = new URL(ctx.request.url).searchParams.get("taille") === "vignette";
  try { return reponseImage(depot ? await depot.imOctets(String(ctx.params.id), vignette) : null, ctx.request, false); }
  catch { return reponseImage(null, ctx.request, false); }
}

export async function onRequestPatch(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 2048);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modererImage(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/images/:id"));
}
