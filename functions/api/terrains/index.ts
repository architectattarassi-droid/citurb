/**
 * Cloudflare Pages Function — /api/terrains
 *   GET  : annonces publiées (vue publique, sans coordonnées), ?ville=&limite=
 *   POST : dépôt d'une annonce par un propriétaire ou un intermédiaire →
 *          statut EN_ATTENTE (publiée après validation dans le back-office),
 *          + lead P4 (source WEB_TERRAIN_DEPOT) visible dans /cc/leads.
 */

import { neon } from "@neondatabase/serverless";
import { annoncesPubliees, slugifier, tableExiste, validerDepot, type Sql } from "../../_lib/terrains";

interface Env { DATABASE_URL?: string; RESEND_API_KEY?: string; LEAD_NOTIFY_TO?: string; LEAD_NOTIFY_FROM?: string }
type Reponse = { status: number; json: unknown; alerte?: string };

const vus = new Map<string, number[]>();
function accepter(cle: string, max: number, fenetreMs: number): boolean {
  const t = Date.now();
  const l = (vus.get(cle) || []).filter((x) => t - x < fenetreMs);
  if (l.length >= max) return false;
  l.push(t); vus.set(cle, l);
  return true;
}

export async function deposer(body: unknown, sql: Sql, ip = "inconnue"): Promise<Reponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { status: 201, json: { ok: true } }; // pot de miel
  if (!accepter(`ip:${ip}`, 3, 60 * 60_000)) return { status: 429, json: { ok: false, error: "too_many_requests" } };
  const d = validerDepot(b);
  if ("erreur" in d) return { status: 400, json: { ok: false, error: d.erreur } };
  if (!(await tableExiste(sql))) return { status: 503, json: { ok: false, error: "terrains_unavailable" } };

  const id = `ter_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const slug = slugifier(d.ville, d.quartier ?? "", d.surface, id);
  const maintenant = new Date().toISOString();
  // Lead P4 : le déposant est aussi un prospect (estimation, valorisation, vente accompagnée).
  const leadId = `lead_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const leadOk = await sql`SELECT to_regclass('public."Lead"') IS NOT NULL AS l`;
  if (leadOk[0]?.l) {
    const meta = { projetLibre: `Dépôt d'annonce terrain : ${d.surface} m² à ${d.ville}${d.prix ? `, ${d.prix.toLocaleString("fr-FR")} DH` : ""} (${d.deposant.toLowerCase()})`, wizard: { terrain: { slug, surface: d.surface, prix: d.prix, ville: d.ville, titre: d.titre, usage: d.usage } }, via: "pages-function" };
    const events = [{ id: `evt_${Date.now().toString(36)}`, at: maintenant, kind: "CREATED", payload: { source: "WEB_TERRAIN_DEPOT" } }];
    await sql`INSERT INTO "Lead" ("id", "createdAt", "updatedAt", "nom", "telephone", "email", "projetType", "budget", "ville", "surface", "delaiMois", "source", "lang", "pageContext", "utm", "score", "scoreBreakdown", "stage", "wizardStep", "returnVisitor", "nurtureLog", "convertedDossierId", "events", "meta")
      VALUES (${leadId}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${d.nom}, ${d.telephone}, ${d.email}, 'P4', ${d.prix}::double precision, ${d.ville}, ${d.surface}::double precision, NULL, 'WEB_TERRAIN_DEPOT', 'fr', '/p4/terrains/deposer', NULL, 30, '{}'::jsonb, 'NEW', 0, false, '{}'::jsonb, NULL, ${JSON.stringify(events)}::jsonb, ${JSON.stringify(meta)}::jsonb)`.catch(() => []);
  }
  await sql`INSERT INTO "TerrainAnnonce" ("id", "slug", "createdAt", "updatedAt", "statut", "deposant", "mandat", "nom", "telephone", "email", "ville", "quartier", "surface", "prix", "titre", "usage", "description", "leadId")
    VALUES (${id}, ${slug}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), 'EN_ATTENTE', ${d.deposant}, ${d.mandat}, ${d.nom}, ${d.telephone}, ${d.email}, ${d.ville}, ${d.quartier}, ${d.surface}::double precision, ${d.prix}::double precision, ${d.titre}, ${d.usage}, ${d.description}, ${leadOk[0]?.l ? leadId : null})`;
  return { status: 201, json: { ok: true, reference: id }, alerte: `Nouvelle annonce terrain à valider : ${d.surface} m² à ${d.ville}${d.prix ? ` — ${d.prix.toLocaleString("fr-FR")} DH` : ""} (${d.deposant.toLowerCase()}, ${d.nom}, ${d.telephone})` };
}

async function alerter(env: Env, texte: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.LEAD_NOTIFY_TO) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>", to: env.LEAD_NOTIFY_TO.split(",").map((x) => x.trim()).filter(Boolean), subject: "Annonce terrain à valider", text: `${texte}\n\nhttps://admin.citurbarea.com/cc/terrains` }),
    });
  } catch { /* jamais bloquant */ }
}

const json = (status: number, body: unknown, cache = "no-store") => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache } });

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(200, []);
  const u = new URL(ctx.request.url);
  try {
    const liste = await annoncesPubliees(neon(ctx.env.DATABASE_URL) as unknown as Sql, { ville: u.searchParams.get("ville") || undefined, limite: Number(u.searchParams.get("limite")) || undefined });
    return json(200, liste, "public, max-age=120");
  } catch {
    return json(200, []);
  }
}

export async function onRequestPost(ctx: { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return json(400, { ok: false, error: "payload_invalid" }); }
  try {
    const r = await deposer(body, neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.request.headers.get("cf-connecting-ip") || "inconnue");
    if (r.alerte && ctx.waitUntil) ctx.waitUntil(alerter(ctx.env, r.alerte));
    return json(r.status, r.json);
  } catch {
    return json(503, { ok: false, error: "terrains_unavailable" });
  }
}
