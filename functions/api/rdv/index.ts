/**
 * Cloudflare Pages Function — POST /api/rdv : réservation d'un appel vidéo.
 *
 * Corps : { debut, nom, telephone, email?, porte?, objet?, message?, consentement, website, utm? }
 *   - pot de miel `website` → faux succès, rien d'écrit ;
 *   - créneau : doit appartenir à l'offre (paramètres) ET être libre ;
 *     l'index unique partiel sur "debut" (statut CONFIRME) tranche les courses → 409 creneau_pris ;
 *   - crée le RendezVous (jeton d'accès haché SHA-256, salle visio non devinable),
 *     puis le lead (même logique que /api/lead-funnel/capture, source WEB_RDV)
 *     et le compte client + dossier (même logique que /api/intake) ;
 *   - alerte l'architecte et confirme au client par e-mail (Resend, si configuré).
 * Renvoie { ok, jeton, debut, reference } : le jeton n'est jamais stocké en clair.
 */
import { neon } from "@neondatabase/serverless";
import {
  accepter, base64Utf8, creneauLibre, creneauPropose, dateLisible, destinatairesArchitecte, envoyerMail, fichierIcs, hacherJeton, idRdv,
  indisponible, LIB_OBJET, lienGoogleAgenda, lireParametres, messageArchitecte, messageClient, nouveauJeton, repondre, tablesRdvPresentes,
  validerReservation, type EnvMail, type Reservation, type Reponse, type Sql,
} from "../../_lib/rdv";
import { nouvelleSalle } from "../../_lib/visio";
import { creerDossier, dossierOuvertDuClient, tablesDossierPresentes, trouverOuCreerClient } from "../../_lib/clientDossier";
import { traiterCapture } from "../lead-funnel/capture";

interface Env extends EnvMail { DATABASE_URL?: string; PUBLIC_WEB_URL?: string }

export type Reserve = Reponse & { nouveau?: Reservation & { id: string; jeton: string; dureeMin: number } };

const utmPropre = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : undefined);

export async function reserver(body: unknown, sql: Sql, headers: Headers = new Headers(), maintenant = Date.now()): Promise<Reserve> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const b = body as Record<string, unknown>;
  const ip = headers.get("cf-connecting-ip") || "inconnue";
  if (!accepter(`rdv:ip:${ip}`, 4, 60 * 60_000, maintenant)) return { status: 429, json: { ok: false, error: "too_many_requests" } };
  // Pot de miel : réponse de succès, rien n'est écrit.
  if (typeof b.website === "string" && b.website.trim()) return { status: 201, json: { ok: true, jeton: nouveauJeton(), debut: String(b.debut ?? ""), reference: idRdv() } };

  const r = validerReservation(b);
  if ("erreur" in r) return { status: 400, json: { ok: false, error: r.erreur } };
  if (!(await tablesRdvPresentes(sql))) return indisponible();

  const p = await lireParametres(sql);
  if (!creneauPropose(p, r.debut, maintenant)) return { status: 400, json: { ok: false, error: "creneau_invalide" } };
  if (!(await creneauLibre(sql, r.debut, p.dureeMin))) return { status: 409, json: { ok: false, error: "creneau_pris" } };

  const id = idRdv();
  const jeton = nouveauJeton();
  const debutIso = new Date(r.debut).toISOString();
  const utm = utmPropre(b.utm);
  try {
    await sql`INSERT INTO "RendezVous" ("id", "jetonHash", "salle", "debut", "dureeMin", "statut", "nom", "telephone", "email", "porte", "objet", "message", "leadSource", "utm", "dossierRdv", "createdAt", "updatedAt")
      VALUES (${id}, ${await hacherJeton(jeton)}, ${nouvelleSalle("rdv")}, ${debutIso}::timestamptz, ${p.dureeMin}::integer, 'CONFIRME', ${r.nom}, ${r.telephone}, ${r.email}, ${r.porte}, ${r.objet}, ${r.message},
        'WEB_RDV', ${utm ? JSON.stringify(utm) : null}::jsonb, '{}'::jsonb, now(), now())`;
  } catch (e) {
    // 23505 : un autre visiteur vient de prendre ce créneau (index unique partiel).
    if ((e as { code?: string })?.code === "23505") return { status: 409, json: { ok: false, error: "creneau_pris" } };
    throw e;
  }

  // Lead (pipeline /cc/leads), puis compte client + dossier : jamais bloquants pour le rendez-vous.
  let leadId: string | null = null;
  try {
    const lead = await traiterCapture({
      nom: r.nom, telephone: r.telephone, email: r.email ?? undefined, projetType: r.porte, source: "WEB_RDV", pageContext: "/rendez-vous", utm,
      idempotencyKey: `rdv:${id}`,
      meta: { projetLibre: `Rendez-vous visio le ${dateLisible(r.debut)} — ${LIB_OBJET[r.objet]}${r.message ? ` : ${r.message}` : ""}` },
    }, headers, sql);
    if (lead.status === 201 && typeof lead.json.leadId === "string") leadId = lead.json.leadId;
  } catch { console.error("[rdv] lead non écrit"); }
  try {
    if (await tablesDossierPresentes(sql)) {
      const userId = await trouverOuCreerClient(sql, { nom: r.nom, tel: r.telephone, email: r.email });
      // Un seul endroit : un client qui a déjà un dossier ouvert y retrouve son rendez-vous (et son appel visio).
      const dossierId = (await dossierOuvertDuClient(sql, userId, { jours: 365 })) ?? await creerDossier(sql, {
        ownerId: userId, titre: `${r.porte} — ${r.nom} (rendez-vous visio)`, porte: r.porte, nom: r.nom, tel: r.telephone, email: r.email,
        payload: { source: "WEB_RDV", rendezVousId: id, objet: r.objet, message: r.message ?? undefined, utm, lang: "fr", via: "pages-function" },
      });
      await sql`UPDATE "RendezVous" SET "dossierId" = ${dossierId}, "userId" = ${userId}, "leadId" = ${leadId}, "updatedAt" = now() WHERE "id" = ${id}`;
    } else if (leadId) {
      await sql`UPDATE "RendezVous" SET "leadId" = ${leadId}, "updatedAt" = now() WHERE "id" = ${id}`;
    }
  } catch { console.error("[rdv] dossier non créé"); }

  return { status: 201, json: { ok: true, jeton, debut: debutIso, reference: id }, nouveau: { ...r, id, jeton, dureeMin: p.dureeMin } };
}

async function notifier(env: Env, origine: string, n: NonNullable<Reserve["nouveau"]>): Promise<void> {
  const m = messageArchitecte("nouveau", n);
  await envoyerMail(env, { to: destinatairesArchitecte(env), subject: m.subject, text: m.text });
  if (n.email) {
    const espace = `${origine}/rdv/${n.jeton}`;
    const c = messageClient(n, espace, lienGoogleAgenda(n.debut, n.dureeMin, espace));
    await envoyerMail(env, { to: [n.email], ...c, attachments: [{ filename: "rendez-vous-citurbarea.ics", content: base64Utf8(fichierIcs(n.id, n.debut, n.dureeMin, espace)) }] });
  }
}

export async function onRequestPost(ctx: { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try {
    const r = await reserver(body, neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.request.headers);
    const origine = (ctx.env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/+$/, "");
    if (r.nouveau && ctx.waitUntil) ctx.waitUntil(notifier(ctx.env, origine, r.nouveau));
    return repondre(r);
  } catch (e) {
    console.error("[rdv] réservation impossible", (e as { code?: string })?.code ?? "");
    return repondre(indisponible());
  }
}
