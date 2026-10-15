/**
 * Garde des outils pro : toute route sous /api/cercles/espace/outils/<segment>/… exige
 * l'outil correspondant (OUTIL_PAR_SEGMENT, domain/cercles/accesPro.ts), accordé par l'admin.
 * Segment inconnu → 404 ; membre de base → 403 « acces_reserve ». S'ajoute à la garde de
 * session de /api/cercles/espace (ctx.data.fournisseurId). Contrat : docs/architecture/contrat-acces-pro.md.
 */
import { garderOutil } from "../../../../_lib/accesPro";
import { repondre, type EnvCercles } from "../../../../_lib/cercles";
import { depotOuNull } from "../../../../_lib/lecturePublique";

export async function onRequest(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; next: () => Promise<Response> }): Promise<Response> {
  let refus;
  try { refus = await garderOutil(new URL(ctx.request.url).pathname, String(ctx.data.fournisseurId || ""), await depotOuNull(ctx.env)); }
  catch { refus = { status: 503, json: { ok: false, error: "storage_unavailable" } }; }
  return refus ? repondre(refus) : ctx.next();
}
