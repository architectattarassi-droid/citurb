/**
 * Cloudflare Pages Function — /api/cc/dossiers/<id> (fiche dossier, lot 3c)
 *   GET   fiche complète : dossier, compte client, leads, RDV, espaces projet,
 *         parcours A → Z, journal (functions/_lib/ficheDossier.ts).
 *   PATCH { action: "statut" | "phase" | "etape" | "rouvrir" | "note" | "debloquer", … }
 *         actions admin jamais bloquantes, journalisées (DossierEvenement).
 * Protégée par functions/api/cc/_middleware.ts (Cloudflare Access ou cookie, Origin contrôlée).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { Sql } from "../../../_lib/dossierAdmin";
import { appliquerAction, lireAction, lireFiche } from "../../../_lib/ficheDossier";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> };

const erreurBase = (e: unknown, ou: string) => {
  console.error(`[cc/dossiers/${ou}] erreur (${(e as { code?: string })?.code || "sans code"})`);
  return json(503, { ok: false, error: "storage_unavailable" });
};

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const f = await lireFiche(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""));
    return f ? json(200, { ok: true, ...f }) : json(404, { ok: false, error: "not_found" });
  } catch (e) { return erreurBase(e, "fiche"); }
}

export async function onRequestPatch(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 16 * 1024 ? JSON.parse(t) : null; } catch { /* corps illisible */ }
  const a = lireAction(corps);
  if ("erreur" in a) return json(400, { ok: false, error: a.erreur });
  try {
    const r = await appliquerAction(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""), a, String(ctx.data.adminEmail || "admin"));
    return json(r.status, r.json);
  } catch (e) { return erreurBase(e, "action"); }
}
