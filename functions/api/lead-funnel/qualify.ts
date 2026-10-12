/**
 * Cloudflare Pages Function — /api/lead-funnel/qualify
 *
 * Palier 2 de l'entonnoir : trois réponses à un clic données juste après la
 * capture (terrain, démarrage, résidence). Elles complètent le lead existant :
 * meta.qualification, delaiMois, score recalculé, événement QUALIFIED.
 *
 * Sécurité : le lead n'est modifié que si la clé d'idempotence envoyée est
 * celle de sa capture (clé aléatoire connue du seul navigateur qui l'a créé).
 * Aucune donnée personnelle n'est renvoyée.
 */

import { neon } from "@neondatabase/serverless";
import { score, type Sql } from "./capture";

interface Env { DATABASE_URL?: string }

export const TERRAINS = ["TITRE", "EN_COURS", "CHERCHE"] as const;
export const DELAIS = ["MOINS_6", "6_12", "PLUS_12", "INFO"] as const;
export const RESIDENCES = ["MAROC", "ETRANGER"] as const;

/** Délai déclaré → mois (même grandeur que Lead.delaiMois). */
const MOIS: Record<(typeof DELAIS)[number], number | null> = { MOINS_6: 3, "6_12": 9, PLUS_12: 18, INFO: null };

type Reponse = { status: number; json: Record<string, unknown> };
const un = <T extends readonly string[]>(v: unknown, liste: T): T[number] | undefined => (typeof v === "string" && (liste as readonly string[]).includes(v) ? (v as T[number]) : undefined);

export async function traiterQualification(body: unknown, sql: Sql): Promise<Reponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const b = body as Record<string, unknown>;
  const leadId = typeof b.leadId === "string" && /^lead_[a-z0-9]{4,40}$/.test(b.leadId) ? b.leadId : "";
  const cle = typeof b.cle === "string" ? b.cle.slice(0, 80) : "";
  if (!leadId || cle.length < 8) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const terrain = un(b.terrain, TERRAINS);
  const delai = un(b.delai, DELAIS);
  const residence = un(b.residence, RESIDENCES);
  const pays = typeof b.pays === "string" ? b.pays.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || undefined : undefined;
  if (!terrain && !delai && !residence) return { status: 400, json: { ok: false, error: "empty" } };

  const rows = await sql`SELECT "id", "budget", "email", "telephone", "ville", "returnVisitor", "delaiMois", "meta", "events" FROM "Lead" WHERE "id" = ${leadId} AND "meta"->>'idempotencyKey' = ${cle} LIMIT 1`;
  if (!rows.length) return { status: 404, json: { ok: false, error: "not_found" } };
  const l = rows[0];
  const meta = (l.meta && typeof l.meta === "object" ? l.meta : {}) as Record<string, unknown>;
  const ancienne = (meta.qualification && typeof meta.qualification === "object" ? meta.qualification : {}) as Record<string, unknown>;
  const qualification = { ...ancienne, ...(terrain ? { terrain } : {}), ...(delai ? { delai } : {}), ...(residence ? { residence } : {}), ...(pays ? { pays } : {}), at: new Date().toISOString() };
  const delaiMois = delai ? MOIS[delai] : (typeof l.delaiMois === "number" ? l.delaiMois : null);
  const { score: s, breakdown } = score({
    budget: typeof l.budget === "number" ? l.budget : null,
    email: (l.email as string) || null,
    telephone: String(l.telephone || ""),
    delaiMois,
    ville: (l.ville as string) || null,
    returnVisitor: !!l.returnVisitor,
    whatsapp: meta.whatsapp === true,
    terrain: (qualification.terrain as string) || null,
  });
  const events = Array.isArray(l.events) ? l.events : [];
  const evt = { id: `evt_${Date.now().toString(36)}_q`, at: qualification.at, kind: "QUALIFIED", payload: { terrain, delai, residence, score: s } };
  await sql`UPDATE "Lead" SET "meta" = ${JSON.stringify({ ...meta, qualification })}::jsonb, "delaiMois" = ${delaiMois}::double precision, "score" = ${s}::integer, "scoreBreakdown" = ${JSON.stringify(breakdown)}::jsonb, "events" = ${JSON.stringify([...events, evt])}::jsonb, "updatedAt" = ${qualification.at}::timestamp(3) WHERE "id" = ${leadId}`;
  return { status: 200, json: { ok: true } };
}

const repondre = (r: Reponse) => new Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } });
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try {
    return repondre(await traiterQualification(body, neon(ctx.env.DATABASE_URL) as unknown as Sql));
  } catch {
    return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } });
  }
}
