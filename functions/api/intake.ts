/**
 * Cloudflare Pages Function — /api/intake
 *
 * Remplace en production le POST /p2/intake de l'API NestJS (éteinte) :
 * chaque demande d'une porte (P1 à P6) devient un DOSSIER dans Neon, visible
 * dans le back-office admin.citurbarea.com (/cc/dossiers), relié au lead.
 *
 * Différences volontaires avec NestJS :
 *   - aucun jeton d'accès n'est renvoyé (NestJS en remettait un à quiconque
 *     saisissait un e-mail connu : prise de compte possible) ;
 *   - le compte client créé n'a pas de mot de passe utilisable (pas de bcrypt
 *     sur Workers) : il sera activé plus tard par l'équipe ;
 *   - pièces contractuelles (CIN, RC, ICE, titre foncier) jamais acceptées ici.
 * Dédoublonnage : même téléphone + même porte dans les 24 h → même dossier.
 * Tables absentes (schéma non poussé) → 503, le front garde le lead seul.
 */

import { neon } from "@neondatabase/serverless";
import { telephoneLead, type Sql } from "./lead-funnel/capture";
import { creerDossier, tablesDossierPresentes, trouverOuCreerClient } from "../_lib/clientDossier";

interface Env { DATABASE_URL?: string; RESEND_API_KEY?: string; LEAD_NOTIFY_TO?: string; LEAD_NOTIFY_FROM?: string }
type Reponse = { status: number; json: Record<string, unknown>; nouveau?: { id: string; porte: string; nom: string; tel: string; titre: string } };

const PORTES = new Set(["P1", "P2", "P3", "P4", "P5", "P6"]);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const nombre = (v: unknown) => { const x = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN; return Number.isFinite(x) && x >= 0 ? x : null; };
const EXCLUS = new Set(["cin", "clientCin", "rc", "ice", "tf", "titreFoncier", "numeroTF", "patente"]);

/** Objet borné (profondeur 4, 8 Ko) sans pièces contractuelles. */
function propre(v: unknown, d = 0): unknown {
  if (v == null || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return v.slice(0, 1000);
  if (d >= 4) return undefined;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => propre(x, d + 1));
  if (typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => !EXCLUS.has(k)).map(([k, x]) => [k, propre(x, d + 1)]));
  return undefined;
}

/** Limite par IP (mémoire de l'isolat) : 5 dossiers / 10 min. */
const vus = new Map<string, number[]>();
function accepter(cle: string, max: number, fenetreMs: number): boolean {
  const t = Date.now();
  const l = (vus.get(cle) || []).filter((x) => t - x < fenetreMs);
  if (l.length >= max) return false;
  l.push(t); vus.set(cle, l);
  return true;
}

export async function traiterIntake(body: unknown, sql: Sql, ip = "inconnue"): Promise<Reponse> {
  if (!accepter(`ip:${ip}`, 5, 10 * 60_000)) return { status: 429, json: { ok: false, error: "too_many_requests" } };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const b = body as Record<string, unknown>;
  const porte = PORTES.has(String(b.porteType)) ? String(b.porteType) : "P1";
  const nom = clip(b.clientNom, 120);
  const tel = telephoneLead(clip(b.clientTel, 30));
  const email = clip(b.clientEmail, 200).toLowerCase() || null;
  if (nom.length < 2) return { status: 400, json: { ok: false, error: "nom_invalid" } };
  if (!tel) return { status: 400, json: { ok: false, error: "phone_invalid" } };

  if (!(await tablesDossierPresentes(sql))) return { status: 503, json: { ok: false, error: "dossier_unavailable" } };

  // Même client, même porte, moins de 24 h : on renvoie le dossier existant.
  const deja = await sql`SELECT "id" FROM "Dossier" WHERE "clientTel" = ${tel} AND "porteType" = ${porte} AND "createdAt" > now() - interval '24 hours' ORDER BY "createdAt" DESC LIMIT 1`;
  const pack = clip(b.packSelected, 30) || null;
  if (deja.length) {
    // Choix de pack P1 après la première demande : on complète le dossier existant.
    if (pack) await sql`UPDATE "Dossier" SET "packSelected" = ${pack}, "packPriceMAD" = ${nombre(b.packPriceMAD)}, "projectType" = ${clip(b.projectType, 40) || null}, "constructionLevel" = ${clip(b.constructionLevel, 40) || null}, "caseId" = ${clip(b.caseId, 80) || null}, "updatedAt" = now() WHERE "id" = ${String(deja[0].id)}`;
    return { status: 200, json: { ok: true, dossierId: String(deja[0].id), deja: true } };
  }

  const maintenant = new Date().toISOString();
  // Compte client : retrouvé par e-mail ou téléphone, sinon créé sans mot de passe utilisable.
  const ownerId = await trouverOuCreerClient(sql, { nom, tel, email }, maintenant);

  const brief = propre(b.brief);
  const payload = propre({
    commune: clip(b.commune, 120) || undefined, brief, source: clip(b.source, 40) || "WEB_PORTE",
    utm: b.utm, lang: clip(b.lang, 5) || "fr", via: "pages-function",
  });
  const titre = clip(b.title, 200) || `${porte} — ${nom}${clip(b.commune, 60) ? ` (${clip(b.commune, 60)})` : ""}`;
  const nb = nombre(b.nbNiveaux);
  const dossierId = await creerDossier(sql, {
    ownerId, titre, porte, nom, tel, email, payload, commune: clip(b.commune, 120) || null, gestionMode: clip(b.gestionMode, 30) || "AUTONOME",
    raisonSociale: clip(b.raisonSociale, 200) || null, representant: clip(b.representant, 120) || null,
    sousTypeP2: clip(b.sousTypeP2 ?? b.sousType, 60) || null, natureProjet: clip(b.natureProjet, 80) || null,
    surfaceTerrain: nombre(b.surfaceTerrain), surfacePlancher: nombre(b.surfacePlancher), nbNiveaux: nb != null ? Math.round(nb) : null,
    budgetEstime: nombre((brief as Record<string, unknown> | undefined)?.budgetPrevisionnelMAD),
    packSelected: pack, packPriceMAD: nombre(b.packPriceMAD), projectType: clip(b.projectType, 40) || null,
    constructionLevel: clip(b.constructionLevel, 40) || null, caseId: clip(b.caseId, 80) || null,
  }, maintenant);
  return { status: 201, json: { ok: true, dossierId }, nouveau: { id: dossierId, porte, nom, tel, titre } };
}

async function alerter(env: Env, d: NonNullable<Reponse["nouveau"]>): Promise<void> {
  if (!env.RESEND_API_KEY || !env.LEAD_NOTIFY_TO) return;
  const lien = `https://admin.citurbarea.com/cc/dossiers`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>",
        to: env.LEAD_NOTIFY_TO.split(",").map((x) => x.trim()).filter(Boolean),
        subject: `Nouveau dossier ${d.porte} — ${d.nom}`,
        text: `${d.titre}\nTéléphone : ${d.tel}\nRéférence : ${d.id}\n\n${lien}`,
      }),
    });
  } catch { /* l'alerte ne doit jamais bloquer le dossier */ }
}

const repondre = (r: Reponse) => new Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost(ctx: { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } });
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try {
    const r = await traiterIntake(body, neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.request.headers.get("cf-connecting-ip") || "inconnue");
    if (r.nouveau && ctx.waitUntil) ctx.waitUntil(alerter(ctx.env, r.nouveau));
    return repondre(r);
  } catch (e) {
    console.error("[intake] échec", (e as { code?: string })?.code ?? "");
    return repondre({ status: 503, json: { ok: false, error: "dossier_unavailable" } });
  }
}
