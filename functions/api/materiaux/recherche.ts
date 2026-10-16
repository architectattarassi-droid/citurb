/**
 * GET /api/materiaux/recherche?q=&lot=&phase=&categorie=&limite=50 — recherche dans le
 * référentiel des matériaux (280 codes du catalogue + codes créés en modération), avec
 * prix de référence, phases d'achat et nombre de variantes fournisseurs publiées.
 * Public, sans coordonnée ni prix nominatif. Base indisponible → référentiel statique seul.
 * Contrat : docs/architecture/contrat-carnet-materiaux.md (§ Recherche).
 */
import { repondre, type EnvCercles } from "../../_lib/cercles";
import { catalogueProduits } from "../../_lib/catalogue";
import { apercu, depotOuNull } from "../../_lib/lecturePublique";
import { rechercherMateriaux, type CodeDynamique } from "../../../apps/web/src/domain/materiaux/recherche";

export async function onRequestGet(ctx: { request: Request; env: EnvCercles }): Promise<Response> {
  const p = new URL(ctx.request.url).searchParams;
  const depot = await depotOuNull(ctx.env);
  let dynamiques: CodeDynamique[] = [];
  const variantes: Record<string, number> = {};
  if (depot) {
    try {
      dynamiques = (await depot.refLister()).filter((d) => d.actif !== false && !d.parent).map((d) => ({
        code: String(d.code), libelleFr: String(d.libelleFr), libelleAr: (d.libelleAr as string) || null, categorie: String(d.categorie),
        famille: String(d.famille), uniteRef: String(d.uniteRef), lots: Array.isArray(d.lots) ? (d.lots as string[]) : [],
      }));
    } catch { /* table absente : référentiel statique */ }
    try {
      const r = await catalogueProduits(new URLSearchParams(), depot, { inclureFictifs: apercu(ctx.request), origine: new URL(ctx.request.url).origin });
      for (const x of ((r.json as { produits?: { codeReference?: string }[] }).produits || []))
        if (x.codeReference) variantes[x.codeReference] = (variantes[x.codeReference] || 0) + 1;
    } catch { /* produits indisponibles */ }
  }
  const res = rechercherMateriaux({ texte: p.get("q"), lot: p.get("lot"), phase: p.get("phase"), categorie: p.get("categorie"), limite: Number(p.get("limite")) || 50 },
    { dynamiques, variantes });
  return repondre({ status: 200, json: { ok: true, disponible: !!depot, ...res }, entetes: { "cache-control": "public, max-age=60, s-maxage=300" } });
}
