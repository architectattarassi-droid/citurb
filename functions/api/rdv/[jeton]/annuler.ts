/**
 * Cloudflare Pages Function — POST /api/rdv/<jeton>/annuler
 * Annulation par le client jusqu'à 2 h avant le début ; l'architecte est prévenu.
 */
import { neon } from "@neondatabase/serverless";
import { DELAI_MODIF_MS, destinatairesArchitecte, envoyerMail, indisponible, instant, messageArchitecte, rdvParJeton, repondre, tablesRdvPresentes, type EnvMail, type Reponse, type Sql } from "../../../_lib/rdv";

interface Env extends EnvMail { DATABASE_URL?: string }

export async function annulerRdv(sql: Sql, jeton: string, maintenant = Date.now()): Promise<Reponse & { alerte?: ReturnType<typeof messageArchitecte> }> {
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const r = await rdvParJeton(sql, jeton);
  if (!r) return { status: 404, json: { ok: false, error: "not_found" } };
  if (r.statut !== "CONFIRME") return { status: 409, json: { ok: false, error: "rdv_non_modifiable" } };
  const debut = instant(r.debut);
  if (debut - maintenant <= DELAI_MODIF_MS) return { status: 409, json: { ok: false, error: "trop_tard" } };
  await sql`UPDATE "RendezVous" SET "statut" = 'ANNULE', "updatedAt" = now() WHERE "id" = ${String(r.id)} AND "statut" = 'CONFIRME'`;
  return {
    status: 200, json: { ok: true },
    alerte: messageArchitecte("annule", { nom: String(r.nom), telephone: String(r.telephone), email: (r.email as string) ?? null, objet: String(r.objet ?? "AUTRE"), message: null, debut }),
  };
}

export async function onRequestPost(ctx: { env: Env; params: { jeton?: string }; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const r = await annulerRdv(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.jeton || ""));
    if (r.alerte && ctx.waitUntil) ctx.waitUntil(envoyerMail(ctx.env, { to: destinatairesArchitecte(ctx.env), ...r.alerte }));
    return repondre(r);
  } catch { return repondre(indisponible()); }
}
