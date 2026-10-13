/**
 * Cloudflare Pages Function — POST /api/rdv/<jeton>/deplacer  { debut }
 * Déplacement par le client (jusqu'à 2 h avant) vers un autre créneau libre.
 */
import { neon } from "@neondatabase/serverless";
import {
  creneauLibre, creneauPropose, DELAI_MODIF_MS, destinatairesArchitecte, envoyerMail, indisponible, instant, lireParametres, messageArchitecte,
  rdvParJeton, repondre, tablesRdvPresentes, type EnvMail, type Reponse, type Sql,
} from "../../../_lib/rdv";

interface Env extends EnvMail { DATABASE_URL?: string }

export async function deplacerRdv(sql: Sql, jeton: string, body: unknown, maintenant = Date.now()): Promise<Reponse & { alerte?: ReturnType<typeof messageArchitecte> }> {
  const brut = (body as Record<string, unknown> | null)?.debut;
  const nouveau = typeof brut === "string" ? Date.parse(brut) : NaN;
  if (!Number.isFinite(nouveau)) return { status: 400, json: { ok: false, error: "creneau_invalide" } };
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const r = await rdvParJeton(sql, jeton);
  if (!r) return { status: 404, json: { ok: false, error: "not_found" } };
  if (r.statut !== "CONFIRME") return { status: 409, json: { ok: false, error: "rdv_non_modifiable" } };
  if (instant(r.debut) - maintenant <= DELAI_MODIF_MS) return { status: 409, json: { ok: false, error: "trop_tard" } };
  const p = await lireParametres(sql);
  if (!creneauPropose(p, nouveau, maintenant)) return { status: 400, json: { ok: false, error: "creneau_invalide" } };
  if (!(await creneauLibre(sql, nouveau, p.dureeMin, String(r.id)))) return { status: 409, json: { ok: false, error: "creneau_pris" } };
  const iso = new Date(nouveau).toISOString();
  try {
    await sql`UPDATE "RendezVous" SET "debut" = ${iso}::timestamptz, "dureeMin" = ${p.dureeMin}::integer, "updatedAt" = now() WHERE "id" = ${String(r.id)}`;
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") return { status: 409, json: { ok: false, error: "creneau_pris" } };
    throw e;
  }
  return {
    status: 200, json: { ok: true, debut: iso },
    alerte: messageArchitecte("deplace", { nom: String(r.nom), telephone: String(r.telephone), email: (r.email as string) ?? null, objet: String(r.objet ?? "AUTRE"), message: null, debut: nouveau }),
  };
}

export async function onRequestPost(ctx: { request: Request; env: Env; params: { jeton?: string }; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try {
    const r = await deplacerRdv(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.jeton || ""), body);
    if (r.alerte && ctx.waitUntil) ctx.waitUntil(envoyerMail(ctx.env, { to: destinatairesArchitecte(ctx.env), ...r.alerte }));
    return repondre(r);
  } catch { return repondre(indisponible()); }
}
