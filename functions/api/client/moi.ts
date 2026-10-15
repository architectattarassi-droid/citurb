/**
 * GET /api/client/moi — espace client (lot 3b) : le client et la liste de ses dossiers.
 * Session vérifiée par ./_middleware.ts (ctx.data.client). Aucune coordonnée renvoyée.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../_lib/adminSession";
import type { SessionClient, Sql } from "../../_lib/clientSession";
import { PHASES } from "../../_lib/dossierAdmin";

const s = (v: unknown) => (v == null ? null : String(v));

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; data: { client?: SessionClient } }): Promise<Response> {
  const c = ctx.data.client;
  if (!c) return json(401, { ok: false, error: "unauthenticated" });
  try {
    const sql = neon(ctx.env.DATABASE_URL!) as unknown as Sql;
    const u = (await sql`SELECT "username" FROM "User" WHERE "id" = ${c.clientId} LIMIT 1`)[0];
    const lignes = c.dossierIds.length
      ? await sql`SELECT "id", "title", "commune", "phase", "porteType", "clientNom", to_char("createdAt", 'YYYY-MM-DD') AS "cree" FROM "Dossier" WHERE "id" = ANY(${c.dossierIds}) ORDER BY "createdAt" DESC`
      : [];
    const nom = s(lignes[0]?.clientNom) || s(u?.username);
    return json(200, {
      ok: true,
      client: { nom },
      dossiers: lignes.map((d) => {
        const p = PHASES.find((x) => x.code === d.phase);
        return { id: String(d.id), titre: s(d.title), commune: s(d.commune), porte: s(d.porteType), creeLe: s(d.cree), phase: p ? { code: p.code, titre: p.titre } : null };
      }),
    });
  } catch (e) {
    console.error(`[client/moi] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
