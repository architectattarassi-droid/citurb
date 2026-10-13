/**
 * GET /api/cercles/annuaire?metier=&groupe=&region=&categorie=&q=&codes=&lot= — pros vérifiés (sans coordonnées).
 * `codes` / `lot` : ciblage des demandes de prix (pros qui couvrent ces codes). Contrat : docs/architecture/contrat-catalogue.md.
 */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { annuaire } from "../../_lib/catalogue";
import { avecDepot } from "../../_lib/fournisseursDepot";
import { apercu } from "../../_lib/lecturePublique";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => annuaire(new URL(ctx.request.url).searchParams, d, { inclureFictifs: apercu(ctx.request) }), "cercles/annuaire"));
