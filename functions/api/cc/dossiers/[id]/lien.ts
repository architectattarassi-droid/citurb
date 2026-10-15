/**
 * POST /api/cc/dossiers/<id>/lien — (re)génère le lien d'accès du client
 * (jetonDossier, functions/_lib/dossierAdmin.ts : 90 jours). Le client l'ouvre :
 * /mon-dossier/<jeton>, qui ouvre aussi sa session d'espace client (lot 3a).
 * Renvoie le lien FR et AR et, pour l'équipe seulement, un lien WhatsApp
 * prérempli vers le téléphone du client. Journalisé (LIEN_REGENERE).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import { jetonDossier, journaliser, schemaPret, secretLien, type LienEnv, type Sql } from "../../../../_lib/dossierAdmin";

export async function onRequestPost(ctx: { request: Request; env: LienEnv & { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> }): Promise<Response> {
  const secret = secretLien(ctx.env);
  if (!secret) return json(503, { ok: false, error: "access_not_configured", message: "Secret DOSSIER_LIEN_SECRET (ou ADMIN_SESSION_SECRET) absent." });
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const id = String(ctx.params.id || "");
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const d = (await sql`SELECT "clientTel", "title" FROM "Dossier" WHERE "id" = ${id} LIMIT 1`)[0];
    if (!d) return json(404, { ok: false, error: "not_found" });
    const origine = new URL(ctx.request.url).origin.replace("://admin.", "://");
    const jeton = await jetonDossier(secret, id);
    const lien = `${origine}/mon-dossier/${jeton}`;
    const tel = String(d.clientTel || "").replace(/[^0-9]/g, "").replace(/^0/, "212");
    const texte = `Bonjour, voici votre lien d'accès à votre dossier CITURBAREA « ${String(d.title || "")} » : ${lien}`;
    if ((await schemaPret(sql)).devisFacturation) {
      await journaliser(sql, id, String(ctx.data.adminEmail || "admin"), "LIEN_REGENERE", { dureeJours: 90 }, new Date().toISOString());
    }
    return json(200, {
      ok: true, lien, lienAr: `${origine}/ar/mon-dossier/${jeton}`, expireDansJours: 90,
      whatsapp: tel.length >= 9 ? `https://wa.me/${tel}?text=${encodeURIComponent(texte)}` : null,
    });
  } catch (e) {
    console.error(`[cc/dossiers/lien] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
