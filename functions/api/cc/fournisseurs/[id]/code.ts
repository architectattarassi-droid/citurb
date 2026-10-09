/**
 * POST /api/cc/fournisseurs/:id/code — génère un code d'accès (24 h) affiché à
 * l'administration, qui le transmet au fournisseur (mode sans Resend).
 */
import { erreur, repondre, secretFournisseur, type EnvCercles } from "../../../../_lib/cercles";
import { codePourAdmin } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { env: EnvCercles; params: { id: string } }): Promise<Response> {
  const secret = secretFournisseur(ctx.env);
  if (!secret) return repondre(erreur(503, "access_not_configured"));
  return repondre(await avecDepot(ctx.env, (d) => codePourAdmin(String(ctx.params.id), d, secret), "cc/fournisseurs/:id/code"));
}
