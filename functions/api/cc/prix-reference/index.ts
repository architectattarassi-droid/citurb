/**
 * Back-office — mise à jour manuelle d'un prix de référence de la matériauthèque.
 *   GET  /api/cc/prix-reference          → dernières valeurs par code + 200 derniers enregistrements
 *   POST /api/cc/prix-reference          → { code, prixHT, prixMinHT?, prixMaxHT?, source, sourceUrl?, datePrix }
 * Table append-only "PrixReferenceManuel" (docs/prix/sql/prix-reference-manuel.sql),
 * jamais créée ici : absente → 503 not_installed. Protégée par cc/_middleware.ts.
 * Prix en DH HT par unité de référence du catalogue (kg, m³, u…).
 */
import { materiau } from "../../../../apps/web/src/domain/materiaux/catalogue";
import { prixReference } from "../../../../apps/web/src/domain/materiaux/reference";
import { clip, erreur, lireJson, nombre, repondre, urlHttps, type Reponse, type Sql } from "../../../_lib/cercles";

interface Env { DATABASE_URL?: string }
type Ctx = { request: Request; env: Env; data: Record<string, unknown> };

async function avecSql(env: Env, f: (sql: Sql) => Promise<Reponse>): Promise<Response> {
  if (!env.DATABASE_URL) return repondre(erreur(503, "storage_unavailable"));
  const { neon } = await import("@neondatabase/serverless");
  try {
    return repondre(await f(neon(env.DATABASE_URL) as unknown as Sql));
  } catch (e) {
    const code = (e as { code?: string })?.code;
    console.error(`[cc/prix-reference] base indisponible (${code || "sans code"})`);
    return repondre(erreur(503, code === "42P01" ? "not_installed" : "storage_unavailable"));
  }
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

export function onRequestGet(ctx: Ctx): Promise<Response> {
  return avecSql(ctx.env, async (sql) => {
    const lignes = await sql`SELECT * FROM "PrixReferenceManuel" ORDER BY "createdAt" DESC LIMIT 200`;
    return { status: 200, json: { ok: true, prix: lignes.map((l) => ({ ...l, createdAt: iso(l.createdAt), datePrix: iso(l.datePrix).slice(0, 10) })) } };
  });
}

/** Validation pure (testée) d'une mise à jour manuelle. */
export function validerPrixManuel(b: Record<string, unknown>, aujourdhui = new Date()): { ok: true; v: { code: string; prixHT: number; prixMinHT: number; prixMaxHT: number; source: string; sourceUrl: string | null; datePrix: string; note: string | null } } | { ok: false; error: string } {
  const code = clip(b.code, 20).toUpperCase();
  if (!materiau(code)) return { ok: false, error: "code_invalide" };
  const prixHT = nombre(b.prixHT);
  if (prixHT === null || !(prixHT > 0) || prixHT > 1e7) return { ok: false, error: "prix_invalide" };
  const prixMinHT = nombre(b.prixMinHT) ?? prixHT;
  const prixMaxHT = nombre(b.prixMaxHT) ?? prixHT;
  if (!(prixMinHT > 0 && prixMinHT <= prixHT && prixHT <= prixMaxHT)) return { ok: false, error: "fourchette_invalide" };
  const source = clip(b.source, 300);
  if (source.length < 4) return { ok: false, error: "source_requise" };
  const sourceUrl = b.sourceUrl ? urlHttps(b.sourceUrl) : null;
  if (b.sourceUrl && !sourceUrl) return { ok: false, error: "url_invalide" };
  const datePrix = clip(b.datePrix, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePrix) || datePrix > aujourdhui.toISOString().slice(0, 10)) return { ok: false, error: "date_invalide" };
  return { ok: true, v: { code, prixHT, prixMinHT, prixMaxHT, source, sourceUrl, datePrix, note: clip(b.note, 500) || null } };
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 4096);
  if (!body || typeof body !== "object" || Array.isArray(body)) return repondre(erreur(400, "payload_invalid"));
  const r = validerPrixManuel(body as Record<string, unknown>);
  if (!r.ok) return repondre(erreur(400, r.error));
  const v = r.v;
  const avant = prixReference(v.code)?.ref ?? null;
  const auteur = String(ctx.data.adminEmail || "admin");
  const id = `prm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return avecSql(ctx.env, async (sql) => {
    await sql`INSERT INTO "PrixReferenceManuel" ("id", "code", "prixHT", "prixMinHT", "prixMaxHT", "source", "sourceUrl", "datePrix", "note", "auteur", "prixAvantHT")
      VALUES (${id}, ${v.code}, ${v.prixHT}, ${v.prixMinHT}, ${v.prixMaxHT}, ${v.source}, ${v.sourceUrl}, ${v.datePrix}::date, ${v.note}, ${auteur}, ${avant})`;
    return { status: 201, json: { ok: true, id } };
  });
}
