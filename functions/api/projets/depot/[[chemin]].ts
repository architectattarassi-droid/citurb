/**
 * Cloudflare Pages Function — /api/projets/depot/* (membre d'un projet : cookie projet_session,
 * Path=/api/projets) — contexte « projet » (SON projet) : pièces graphiques ESQ / APS / APD, photos, PV…
 * Fonctionne sans R2 (Neon, petits fichiers) et bascule seul sur R2 dès que « FICHIERS » est lié.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/depotStockage";
import { contexteDepotNeon, type EnvDepotComplet } from "../../../_lib/depotNeon";
import { indisponible, repondre, routeurDepot, segments } from "../../../_lib/depotService";
import { membreConnecte, type EnvProjets } from "../../../_lib/projetsApi";
import { depotNeon, type Sql as SqlProjets } from "../../../_lib/projetsNeon";

const LECTURE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function onRequest(ctx: { request: Request; env: EnvDepotComplet & EnvProjets; params: { chemin?: string | string[] }; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  if (!LECTURE.has(ctx.request.method) && ctx.request.headers.get("origin") !== new URL(ctx.request.url).origin) {
    return repondre({ status: 403, json: { ok: false, error: "forbidden_origin" } });
  }
  try {
    const brut = neon(ctx.env.DATABASE_URL);
    const m = await membreConnecte({ req: ctx.request, env: ctx.env, depot: depotNeon(brut as unknown as SqlProjets), maintenant: () => new Date().toISOString() });
    if (!m) return repondre({ status: 401, json: { ok: false, error: "non_connecte" } });
    const a = { genre: "membre" as const, cle: `membre:${m.id}`, nom: m.nom, projetId: m.projetId };
    return repondre(await routeurDepot(contexteDepotNeon(ctx.env, brut as unknown as Sql, ctx.waitUntil?.bind(ctx)), ctx.request, a, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[projets/depot] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
