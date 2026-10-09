/**
 * Cloudflare Pages Function — PATCH /api/cc/leads/:id
 *
 * Changement de statut et/ou note sur un lead de la table "Lead" (Neon).
 * Le statut va dans la colonne stage ; statut et note s'ajoutent à events
 * (STAGE_CHANGE, NOTE), comme LeadFunnelService. Réponse au format attendu
 * par LeadDrawer : { ok, leadQualif: { status, notes, lastContactAt } }.
 *
 * Protégée par _middleware.ts (Cloudflare Access).
 */

import { neon } from "@neondatabase/serverless";
import { PORTES, STATUTS, vueLead, type Sql } from "./index";

interface Env { DATABASE_URL?: string }

type Reponse = { status: number; json: Record<string, unknown> };

export async function majLead(id: string, body: unknown, auteur: string, sql: Sql): Promise<Reponse> {
  const b = (body && typeof body === "object" ? body : {}) as { status?: unknown; note?: unknown; porte?: unknown };
  const statut = typeof b.status === "string" ? b.status : undefined;
  const note = typeof b.note === "string" ? Array.from(b.note.replace(/\u0000/g, "").trim()).slice(0, 4000).join("") : "";
  const porte = typeof b.porte === "string" ? b.porte : undefined;
  if (statut !== undefined && !STATUTS.includes(statut)) return { status: 400, json: { ok: false, message: "Statut inconnu" } };
  if (porte !== undefined && !PORTES.includes(porte)) return { status: 400, json: { ok: false, message: "Porte inconnue" } };
  if (!statut && !note && !porte) return { status: 400, json: { ok: false, message: "Change le statut, la porte ou ajoute une note" } };

  const rows = await sql`SELECT "stage", "projetType" FROM "Lead" WHERE "id" = ${id} LIMIT 1`;
  if (!rows.length) return { status: 404, json: { ok: false, message: "Lead introuvable" } };

  const at = new Date().toISOString();
  const suffixe = Math.random().toString(36).slice(2, 6);
  const nouveaux: Record<string, unknown>[] = [];
  if (statut && statut !== rows[0].stage) {
    nouveaux.push({ id: `evt_${Date.now().toString(36)}_${suffixe}s`, at, kind: "STAGE_CHANGE", payload: { from: rows[0].stage, to: statut, author: auteur } });
  }
  if (porte && porte !== rows[0].projetType) {
    nouveaux.push({ id: `evt_${Date.now().toString(36)}_${suffixe}p`, at, kind: "NOTE", payload: { text: `Porte : ${rows[0].projetType || "à qualifier"} → ${porte}`, author: auteur } });
  }
  if (note) nouveaux.push({ id: `evt_${Date.now().toString(36)}_${suffixe}n`, at, kind: "NOTE", payload: { text: note, author: auteur } });
  if (!nouveaux.length) return { status: 400, json: { ok: false, message: "Aucun changement" } };

  // Ajout atomique au tableau events : pas de lecture-modification-écriture.
  const maj = await sql`UPDATE "Lead" SET
      "stage" = COALESCE(${statut ?? null}::text, "stage"),
      "projetType" = COALESCE(${porte ?? null}::text, "projetType"),
      "events" = COALESCE("events", '[]'::jsonb) || ${JSON.stringify(nouveaux)}::jsonb,
      "updatedAt" = ${at}::timestamp(3)
    WHERE "id" = ${id} RETURNING *`;
  const v = vueLead(maj[0]);
  return { status: 200, json: { ok: true, porte: v.type, leadQualif: { status: v.status, notes: v.notes, lastContactAt: v.lastContactAt } } };
}

export async function onRequestPatch(ctx: { request: Request; env: Env; params: { id: string }; data: Record<string, unknown> }): Promise<Response> {
  const repondre = (r: Reponse) =>
    new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json; charset=utf-8" } });
  if (!ctx.env.DATABASE_URL) return repondre({ status: 503, json: { ok: false, message: "Base non configurée" } });
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, message: "JSON invalide" } }); }
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    return repondre(await majLead(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), sql));
  } catch (e) {
    console.error(`[cc/leads/:id] mise à jour impossible (${(e as { code?: string })?.code || "sans code"})`);
    return repondre({ status: 503, json: { ok: false, message: "Base indisponible" } });
  }
}
