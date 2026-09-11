/**
 * Cloudflare Pages Function — /api/lead-funnel/capture
 *
 * Collecte les leads SANS l'API NestJS : le front (leadBridge, étape 1) poste
 * ici en même origine, la fonction écrit directement dans la table "Lead" de
 * Neon. Même contrat que LeadFunnelController.capture côté API :
 *   - nom ≥ 2 caractères, téléphone marocain ;
 *   - pot de miel `website` → faux succès, rien d'écrit ;
 *   - meta en liste blanche : projetLibre, wizard (objet, ≤ 16 Ko sinon 400
 *     meta_too_large), idempotencyKey ; plus ip / ua / referer ;
 *   - meta.wizard refiltré ici (pièces contractuelles : RC, ICE, CIN, TF,
 *     patente, n° d'agrément) — défense en profondeur, le front filtre déjà ;
 *   - idempotencyKey déjà connue → le lead existant est renvoyé ;
 *   - score calculé comme lead-scoring.ts (computeLeadScore).
 *
 * Schéma : prisma/schema.prisma (model Lead) fait foi et `prisma db push` le
 * possède. La fonction ne crée JAMAIS la table : absente → 503, et le front
 * garde le lead dans sa file de reprise.
 *
 * Secret : DATABASE_URL (chaîne Neon), à déclarer dans Cloudflare
 * (Workers & Pages → citurbarea → Settings → Variables and secrets, type Secret).
 *
 * GET : sonde de santé ({ ok: true, ... }), sans donnée personnelle.
 */

import { neon } from "@neondatabase/serverless";

interface Env {
  DATABASE_URL?: string;
}

/** Client SQL en gabarit balisé (neon) — injectable pour les tests. */
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

interface Reponse {
  status: number;
  json: Record<string, unknown>;
}

const WIZARD_MAX_BYTES = 16 * 1024;
const RE_TEL_MA = /^(\+212|0)[567]\d{8}$/;
const VILLES_TOP = new Set(["casablanca", "casa", "rabat", "marrakech", "marrakesh", "tanger", "tangier"]);

// Mêmes exclusions que apps/web/src/features/lead-funnel/leadBridge.ts (EXCLUS).
const EXCLUS = new Set([
  "q_phys_id_number", "q_phys_id_type", "q_company_ice", "q_company_rc", "q_tf_number", "rc", "ice",
  "physidnumber", "physidtype", "companyice", "companyrc", "tfnumber",
  "titrefonciernum", "titlefoncier", "patente", "agrementmetlenumero",
]);

// Postgres refuse le caractère nul (text) et, en jsonb, les demi-paires UTF-16.
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const textePropre = (s: string) => s.replace(/\u0000/g, "").replace(SURROGATE_ISOLE, "�");

function clip(v: unknown, max: number): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return Array.from(textePropre(String(v)).trim()).slice(0, max).join("");
}

function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Retire les pièces exclues à toute profondeur et nettoie les chaînes. */
function sansPieces(v: unknown, profondeur = 0): unknown {
  if (typeof v === "string") return textePropre(v);
  if (v === null || typeof v !== "object") return v;
  if (profondeur > 8) return undefined;
  if (Array.isArray(v)) return v.map((x) => sansPieces(x, profondeur + 1));
  const o: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (EXCLUS.has(k.toLowerCase())) continue;
    o[k] = sansPieces(x, profondeur + 1);
  }
  return o;
}

function utmPropre(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign", "term", "content"]) {
    const x = clip((v as Record<string, unknown>)[k], 200);
    if (x) o[k] = x;
  }
  return Object.keys(o).length ? o : null;
}

/** Réplique de computeLeadScore (apps/api/src/modules/lead-funnel/lead-scoring.ts). */
function score(input: { budget: number | null; email: string | null; telephone: string; delaiMois: number | null; ville: string | null; returnVisitor: boolean }) {
  const b: Record<string, number> = { budget: 0, contact: 0, urgency: 0, ville: 0, return: 0, wizard: 0, response: 0 };
  if ((input.budget ?? 0) > 500_000) b.budget = 20;
  if (input.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email) && RE_TEL_MA.test(input.telephone.replace(/[\s-]/g, ""))) b.contact = 15;
  if (typeof input.delaiMois === "number" && input.delaiMois < 6) b.urgency = 15;
  if (input.ville && VILLES_TOP.has(input.ville.trim().toLowerCase())) b.ville = 10;
  if (input.returnVisitor) b.return = 10;
  return { score: Math.min(100, Object.values(b).reduce((a, x) => a + x, 0)), breakdown: b };
}

const MESSAGE: Record<string, string> = {
  fr: "Demande reçue. Notre équipe vous recontacte sous 24h.",
  en: "Request received. Our team will reach out within 24h.",
  ar: "تم استلام طلبك. سيتواصل معك فريقنا خلال 24 ساعة.",
};

function resultat(id: string, scoreInitial: number, stage: string, lang: string): Record<string, unknown> {
  return { ok: true, leadId: id, scoreInitial, stage, message: MESSAGE[lang] || MESSAGE.fr };
}

/** Limite en mémoire, par isolat Workers : filet best-effort, pas une garantie. */
const passages = new Map<string, number[]>();
function accepter(cle: string, max: number, fenetreMs: number): boolean {
  const now = Date.now();
  const recents = (passages.get(cle) || []).filter((t) => now - t < fenetreMs);
  if (recents.length >= max) { passages.set(cle, recents); return false; }
  recents.push(now);
  passages.set(cle, recents);
  if (passages.size > 5000) passages.clear();
  return true;
}

const indisponible = (): Reponse => ({ status: 503, json: { ok: false, error: "storage_unavailable" } });

/** Logique de capture, indépendante du runtime (testable avec un faux client SQL). */
export async function traiterCapture(body: unknown, headers: Headers, sql: Sql): Promise<Reponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, json: { ok: false, error: "payload_invalid" } };
  }
  const b = body as Record<string, unknown>;

  const ip = headers.get("cf-connecting-ip") || "inconnue";
  if (!accepter(`ip:${ip}`, 5, 10 * 60_000)) return { status: 429, json: { ok: false, error: "too_many_requests" } };

  // Pot de miel : réponse identique à un succès, rien n'est écrit.
  if (typeof b.website === "string" && b.website.trim()) {
    return { status: 201, json: resultat(`lead_${Date.now().toString(36)}`, 0, "NEW", "fr") };
  }

  const nom = clip(b.nom, 120);
  const telephone = clip(b.telephone, 30);
  if (nom.length < 2) return { status: 400, json: { ok: false, error: "nom_invalid" } };
  if (!RE_TEL_MA.test(telephone.replace(/[\s-]/g, ""))) return { status: 400, json: { ok: false, error: "phone_invalid" } };
  if (!accepter(`tel:${telephone.replace(/[\s-]/g, "")}`, 3, 60 * 60_000)) return { status: 429, json: { ok: false, error: "too_many_requests" } };

  const metaClient = b.meta && typeof b.meta === "object" && !Array.isArray(b.meta) ? (b.meta as Record<string, unknown>) : {};
  let wizard: unknown = undefined;
  if (metaClient.wizard !== undefined) {
    if (metaClient.wizard === null || typeof metaClient.wizard !== "object" || Array.isArray(metaClient.wizard)) {
      return { status: 400, json: { ok: false, error: "meta_invalid" } };
    }
    if (new TextEncoder().encode(JSON.stringify(metaClient.wizard)).length > WIZARD_MAX_BYTES) {
      return { status: 400, json: { ok: false, error: "meta_too_large" } };
    }
    wizard = sansPieces(metaClient.wizard);
  }
  const idempotencyKey = typeof b.idempotencyKey === "string" ? b.idempotencyKey.slice(0, 80) : "";

  const email = clip(b.email, 200) || null;
  const projetType = clip(b.projetType, 40) || null;
  const budget = nombre(b.budget);
  const ville = clip(b.ville, 120) || null;
  const surface = nombre(b.surface);
  const delaiMois = nombre(b.delaiMois);
  const source = clip(b.source, 40) || "DIRECT";
  const lang = b.lang === "ar" || b.lang === "en" ? b.lang : "fr";
  const pageContext = clip(b.pageContext, 300) || null;
  const utm = utmPropre(b.utm);

  try {
    // Rejeu d'une soumission déjà reçue : même lead, rien de plus.
    if (idempotencyKey) {
      const deja = await sql`SELECT "id", "score", "stage", "lang" FROM "Lead" WHERE "meta"->>'idempotencyKey' = ${idempotencyKey} LIMIT 1`;
      if (deja.length) {
        const d = deja[0];
        return { status: 201, json: resultat(String(d.id), Number(d.score) || 0, String(d.stage), String(d.lang)) };
      }
    }
    const connu = await sql`SELECT 1 FROM "Lead" WHERE "telephone" = ${telephone} OR (${email}::text IS NOT NULL AND lower("email") = lower(${email}::text)) LIMIT 1`;
    const returnVisitor = connu.length > 0;
    const { score: s, breakdown } = score({ budget, email, telephone, delaiMois, ville, returnVisitor });

    const maintenant = new Date().toISOString();
    const id = `lead_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const events = [
      { id: `evt_${Date.now().toString(36)}`, at: maintenant, kind: "CREATED", payload: { source, pageContext } },
      { id: `evt_${Date.now().toString(36)}_s`, at: maintenant, kind: "SCORED", payload: { score: s, breakdown } },
    ];
    const meta = {
      projetLibre: typeof metaClient.projetLibre === "string" ? clip(metaClient.projetLibre, 2000) : undefined,
      wizard,
      idempotencyKey: idempotencyKey || undefined,
      ip,
      ua: clip(headers.get("user-agent"), 400),
      referer: clip(headers.get("referer"), 400),
      via: "pages-function",
    };

    // Colonnes et types alignés sur model Lead (prisma/schema.prisma) :
    // text, timestamp(3), double precision (budget/surface/delaiMois),
    // integer (score/wizardStep), boolean (returnVisitor), jsonb.
    await sql`INSERT INTO "Lead" (
        "id", "createdAt", "updatedAt", "nom", "telephone", "email", "projetType",
        "budget", "ville", "surface", "delaiMois", "source", "lang", "pageContext",
        "utm", "score", "scoreBreakdown", "stage", "wizardStep", "returnVisitor",
        "nurtureLog", "convertedDossierId", "events", "meta"
      ) VALUES (
        ${id}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${nom}, ${telephone}, ${email}, ${projetType},
        ${budget}::double precision, ${ville}, ${surface}::double precision, ${delaiMois}::double precision, ${source}, ${lang}, ${pageContext},
        ${utm ? JSON.stringify(utm) : null}::jsonb, ${s}::integer, ${JSON.stringify(breakdown)}::jsonb, 'NEW', 0, ${returnVisitor}::boolean,
        '{}'::jsonb, NULL, ${JSON.stringify(events)}::jsonb, ${JSON.stringify(meta)}::jsonb
      )`;

    return { status: 201, json: resultat(id, s, "NEW", lang) };
  } catch (e) {
    // 42P01 = table absente (schéma non poussé) : jamais de CREATE TABLE ici.
    const code = (e as { code?: string })?.code;
    console.error(`[lead-funnel/capture] ecriture impossible (${code || "sans code"})`);
    return indisponible();
  }
}

function repondre(r: Reponse): Response {
  return new Response(JSON.stringify(r.json), {
    status: r.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
  return repondre(await traiterCapture(body, ctx.request.headers, sql));
}

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  let table: "presente" | "absente" | "base non configuree" | "base injoignable" = "base non configuree";
  if (ctx.env.DATABASE_URL) {
    try {
      const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
      const r = await sql`SELECT to_regclass('public."Lead"') IS NOT NULL AS presente`;
      table = r[0]?.presente ? "presente" : "absente";
    } catch {
      table = "base injoignable";
    }
  }
  return repondre({ status: 200, json: { ok: true, service: "lead-funnel/capture", table } });
}
