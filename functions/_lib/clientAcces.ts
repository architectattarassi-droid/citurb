/**
 * Accès du client à son espace (lot 3a) — sans mot de passe.
 *
 *   ouvrirParLien  : le lien d'invitation /mon-dossier/<jeton> (jetonDossier,
 *                    dossierAdmin.ts) devient une session client (cookie cli_session) ;
 *                    les liens déjà envoyés restent valables jusqu'à leur expiration.
 *   demanderLien   : « recevoir mon lien » (e-mail ou téléphone). Réponse identique
 *                    que le compte existe ou non. Avec RESEND_API_KEY et un vrai
 *                    e-mail : lien envoyé par e-mail ; sinon la demande est
 *                    journalisée sur le dossier (visible dans /cc/dossiers/<id>) et
 *                    l'équipe est prévenue : elle renvoie le lien (WhatsApp).
 * Aucune coordonnée n'est renvoyée au demandeur.
 */
import { accepter, envoyerEmail, destinatairesAdmin, echapperHtml, RE_EMAIL, type EnvCercles } from "./cercles";
import { cleTelephone, jetonDossier, journaliser, lireJetonDossier, schemaPret, type Sql } from "./dossierAdmin";
import { compteClientActif, creerJetonClient } from "./clientSession";

export type Resultat = { status: number; json: Record<string, unknown>; cookie?: string };

const obj = (b: unknown): Record<string, unknown> => (b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {});
const vraiEmail = (v: unknown) => { const e = typeof v === "string" ? v.trim().toLowerCase() : ""; return e && !e.endsWith("@citurbarea.unknown") && RE_EMAIL.test(e) ? e : null; };

export const MESSAGE_DEMANDE = "Si un dossier correspond à ces coordonnées, vous recevrez votre lien d'accès (par e-mail, ou par CITURBAREA sur WhatsApp).";

/** Lien d'invitation → identifiant du compte client propriétaire du dossier (session à ouvrir). */
export async function ouvrirParLien(sql: Sql, jeton: unknown, secretLienDossier: string, secretSession: string, maintenant = Date.now()): Promise<Resultat> {
  const dossierId = typeof jeton === "string" ? await lireJetonDossier(secretLienDossier, jeton, maintenant) : null;
  if (!dossierId) return { status: 401, json: { ok: false, error: "lien_invalide" } };
  const d = (await sql`SELECT "ownerId" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  const ownerId = d?.ownerId ? String(d.ownerId) : "";
  if (!ownerId || !(await compteClientActif(sql, ownerId))) return { status: 401, json: { ok: false, error: "lien_invalide" } };
  return { status: 200, json: { ok: true, dossierId }, cookie: await creerJetonClient(ownerId, secretSession, maintenant) };
}

/** Comptes CLIENT actifs correspondant à l'e-mail ou au téléphone (9 derniers chiffres). */
async function comptes(sql: Sql, email: string | null, cle: string | null) {
  return sql`SELECT u."id", u."email", u."username",
      (SELECT d."id" FROM "Dossier" d WHERE d."ownerId" = u."id" ORDER BY d."createdAt" DESC LIMIT 1) AS "dossierId",
      (SELECT d."title" FROM "Dossier" d WHERE d."ownerId" = u."id" ORDER BY d."createdAt" DESC LIMIT 1) AS "titre"
    FROM "User" u
    WHERE u."role" = 'CLIENT' AND u."isActive" IS NOT FALSE
      AND ((${email}::text IS NOT NULL AND lower(u."email") = ${email}::text)
        OR (${cle}::text IS NOT NULL AND right(regexp_replace(coalesce(u."phone", ''), '[^0-9]', '', 'g'), 9) = ${cle}::text))
    LIMIT 3`;
}

function messageLien(lien: string, titre: string | null) {
  const t = titre ? ` (${titre})` : "";
  return {
    subject: "Votre accès à votre dossier CITURBAREA",
    text: `Bonjour,\n\nVoici votre lien d'accès à votre dossier${t} :\n${lien}\n\nIl ouvre votre espace client (valable 90 jours). Ne le transmettez pas.\n\nCITURBAREA`,
    html: `<p>Bonjour,</p><p>Voici votre lien d'accès à votre dossier${echapperHtml(t)} :</p><p><a href="${echapperHtml(lien)}">Ouvrir mon dossier</a></p><p>Il ouvre votre espace client (valable 90 jours). Ne le transmettez pas.</p><p>CITURBAREA</p>`,
  };
}

export async function demanderLien(sql: Sql, corps: unknown, env: EnvCercles, secretLienDossier: string, origine: string, ip: string, maintenant = new Date()): Promise<Resultat> {
  const b = obj(corps);
  if (typeof b.website === "string" && b.website.trim()) return { status: 200, json: { ok: true, message: MESSAGE_DEMANDE } }; // piège à robots
  const email = vraiEmail(b.email);
  const cle = typeof b.telephone === "string" && cleTelephone(b.telephone).length === 9 ? cleTelephone(b.telephone) : null;
  if (!email && !cle) return { status: 400, json: { ok: false, error: "contact_invalide" } };
  if (!accepter(`lien-client:${ip}`, 5, 15 * 60_000) || !accepter(`lien-client:${email || cle}`, 3, 60 * 60_000)) return { status: 429, json: { ok: false, error: "too_many_requests" } };
  const trouves = (await comptes(sql, email, cle)).filter((c) => c.dossierId);
  const journal = (await schemaPret(sql)).devisFacturation;
  for (const c of trouves) {
    const dossierId = String(c.dossierId);
    const lien = `${origine}/mon-dossier/${await jetonDossier(secretLienDossier, dossierId, maintenant.getTime())}`;
    const dest = vraiEmail(c.email);
    const envoye = !!env.RESEND_API_KEY && !!dest && (await envoyerEmail(env, { to: [dest], ...messageLien(lien, c.titre ? String(c.titre) : null) }));
    if (journal) await journaliser(sql, dossierId, "client", envoye ? "lien_envoye_par_email" : "lien_demande", { canal: envoye ? "email" : "a_transmettre" }, maintenant.toISOString());
    if (!envoye) {
      await envoyerEmail(env, {
        to: destinatairesAdmin(env), subject: "Un client demande son lien d'accès",
        text: `Un client demande le lien d'accès à son dossier. Renvoyez-le depuis la fiche : https://admin.citurbarea.com/cc/dossiers/${dossierId}`, html: "",
      });
    }
  }
  return { status: 200, json: { ok: true, message: MESSAGE_DEMANDE } };
}
