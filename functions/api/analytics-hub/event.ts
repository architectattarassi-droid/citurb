/**
 * Cloudflare Pages Function — POST /api/analytics-hub/event
 *
 * Reçoit les événements de lib/analytics-tracker.ts (sendBeacon) et les écrit
 * dans la table "FunnelEvent" de Neon : vues de page, durée, début de
 * formulaire, champs touchés, envoi. Sert à voir les visiteurs qui commencent
 * un formulaire sans l'envoyer.
 *
 * Loi 09-08 : ni IP, ni empreinte, ni valeur saisie — seulement un identifiant
 * de session anonyme, le chemin, le NOM du champ touché et le pays (CF).
 * Toujours 204, même en erreur : le traqueur est « fire-and-forget ».
 *
 * Table : prisma/schema.prisma (model FunnelEvent). Jamais créée ici.
 */

import { neon } from "@neondatabase/serverless";

interface Env { DATABASE_URL?: string }
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export const TYPES = new Set(["view", "page_leave", "wizard_start", "wizard_step", "wizard_complete", "intake_submit"]);

const court = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? Array.from(v.replace(/\u0000/g, "").trim()).slice(0, max).join("") : null;

/** Filet par isolat contre l'inondation (best-effort). */
const passages = new Map<string, number[]>();
function accepter(cle: string): boolean {
  const now = Date.now();
  const r = (passages.get(cle) || []).filter((t) => now - t < 60_000);
  if (r.length >= 120) return false;
  r.push(now);
  passages.set(cle, r);
  if (passages.size > 5000) passages.clear();
  return true;
}

/** Valide et écrit un événement ; renvoie true s'il a été écrit. */
export async function enregistrer(body: unknown, pays: string | null, sql: Sql): Promise<boolean> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type : "";
  const sessionId = court(b.sessionId, 64);
  const path = court(b.path, 200);
  if (!TYPES.has(type) || !sessionId || !path) return false;
  if (path.startsWith("/cc") || path.startsWith("/admin")) return false;
  if (!accepter(sessionId)) return false;

  const porte = typeof b.porte === "string" && /^P[1-6]$/.test(b.porte) ? b.porte : null;
  const m = b.meta && typeof b.meta === "object" && !Array.isArray(b.meta) ? (b.meta as Record<string, unknown>) : {};
  const meta: Record<string, unknown> = {};
  const champ = court(m.champ, 60);
  if (champ) meta.champ = champ;
  const source = court(m.source, 40);
  if (source) meta.source = source;
  if (typeof m.durationMs === "number" && Number.isFinite(m.durationMs)) meta.durationMs = Math.min(Math.max(0, Math.round(m.durationMs)), 86_400_000);
  const ref = court(m.referrer, 200);
  if (ref) meta.referrer = ref;

  const id = `fe_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await sql`INSERT INTO "FunnelEvent" ("id", "createdAt", "type", "sessionId", "path", "porte", "meta", "pays")
    VALUES (${id}, now(), ${type}, ${sessionId}, ${path}, ${porte}, ${JSON.stringify(meta)}::jsonb, ${pays})`;
  return true;
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const fin = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (!ctx.env.DATABASE_URL) return fin;
  try {
    const texte = await ctx.request.text();
    if (texte.length > 4096) return fin;
    const pays = (ctx.request as Request & { cf?: { country?: string } }).cf?.country || null;
    await enregistrer(JSON.parse(texte), pays, neon(ctx.env.DATABASE_URL) as unknown as Sql);
  } catch (e) {
    console.error(`[analytics-hub/event] écriture impossible (${(e as { code?: string })?.code || "sans code"})`);
  }
  return fin;
}
