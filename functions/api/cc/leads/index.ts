/**
 * Cloudflare Pages Function — GET /api/cc/leads
 *
 * Remplace, tant que l'API NestJS n'est pas hébergée, la route du même nom de
 * cc.controller.ts : lit la table "Lead" de Neon (alimentée par
 * /api/lead-funnel/capture) et rend chaque lead sous la forme de
 * extractFunnelLeadView, que LeadsModule sait afficher. Les Dossiers vivaient
 * dans la base Railway éteinte : il n'y a donc ni fusion Lead/Dossier ni
 * création manuelle ici (POST → 501).
 *
 * Protégée par _middleware.ts (Cloudflare Access).
 */

import { neon } from "@neondatabase/serverless";

interface Env { DATABASE_URL?: string }
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

/** Statuts que LeadsModule sait afficher ; la colonne stage est un texte libre. */
export const STATUTS = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST", "SPAM", "WIZARD_STARTED", "DOSSIER_OPENED", "PAID", "ARCHIVED"];

type Evenement = { id?: string; at?: string; kind?: string; payload?: Record<string, unknown> };

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ""));
const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const num = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));

/** Réplique de extractFunnelLeadView (apps/api/src/command-center/cc.controller.ts). */
export function vueLead(l: Record<string, unknown>) {
  const meta = obj(l.meta);
  const wizard = obj(meta?.wizard);
  const events = (Array.isArray(l.events) ? l.events : []) as Evenement[];
  const notes = events
    .filter((e) => e.kind === "NOTE" || e.kind === "STAGE_CHANGE")
    .map((e) => ({
      ts: String(e.at ?? ""),
      author: String(e.payload?.author ?? "system"),
      text: e.kind === "STAGE_CHANGE" ? `Stage: ${e.payload?.from ?? "?"} → ${e.payload?.to ?? "?"}` : String(e.payload?.text ?? ""),
    }));
  const stage = String(l.stage || "NEW");
  return {
    id: String(l.id),
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
    nom: String(l.nom ?? ""),
    ville: (l.ville as string) || "—",
    type: (l.projetType as string) || "P1",
    source: (l.source as string) || "DIRECT",
    status: STATUTS.includes(stage) ? stage : "NEW",
    interet: (l.pageContext as string) || undefined,
    email: (l.email as string) || undefined,
    tel: (l.telephone as string) || undefined,
    notesCount: notes.length,
    lastContactAt: iso(l.updatedAt),
    lastNote: notes.length ? notes[notes.length - 1] : null,
    notes,
    brief: { score: l.score, breakdown: l.scoreBreakdown, utm: l.utm, meta },
    origin: "FUNNEL" as const,
    qualification: {
      porte: (l.projetType as string) || undefined,
      typeProjet: (wizard?.natureProjet || wizard?.type || wizard?.sousTypeP2 || undefined) as string | undefined,
      commune: (l.ville as string) || undefined,
      surface: num(l.surface),
      budget: num(l.budget),
      delaiMois: num(l.delaiMois),
    },
    wizard,
  };
}

export async function listerLeads(sql: Sql) {
  const rows = await sql`SELECT * FROM "Lead" ORDER BY "createdAt" DESC LIMIT 500`;
  return rows.map(vueLead);
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    return json(200, await listerLeads(neon(ctx.env.DATABASE_URL) as unknown as Sql));
  } catch (e) {
    console.error(`[cc/leads] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequestPost(): Promise<Response> {
  return json(501, { ok: false, message: "Création manuelle indisponible : elle crée un Dossier, et l'API des dossiers n'est pas hébergée." });
}
