/**
 * Appels vidéo sur demande — orchestration (routes /api/appels, /api/cc/appels,
 * /api/cercles/espace/appels, /api/projets/appels).
 *
 * Accès d'un participant :
 *   - par session : back-office (garde /api/cc), pro (cookie frn_session),
 *     membre d'un projet (cookie projet_session) ;
 *   - par son LIEN PERSONNEL /appel/<jeton> (sans mot de passe) : 256 bits
 *     dérivés par HMAC(secret, demande|participant|sel), seule l'empreinte
 *     SHA-256 est stockée ; le lien n'ouvre que cette demande, ne délivre au
 *     plus que MAX_JETONS_VISIO jetons de salle, et rien hors de la fenêtre.
 * Secret : APPELS_SECRET (≥ 32 caractères), à défaut ADMIN_SESSION_SECRET
 * (préfixe « appel| » : domaines séparés). Absent → 503 appels_non_configures.
 */
import {
  masquerCoordonnees, actualiser, appliquer, autoriserCreation, CLE_CABINET, controlerAccesSalle, estModerateur, lireAction, nouvelIdDemande,
  nouvelIdParticipant, nouveauSel, nouvelleDemande, RAPPEL_AVANT_MS, resume, validerCreation, verifierDebit, vueAdmin, vueParticipant,
  clip, ID_DEMANDE_RE, ID_PARTICIPANT_RE, JETON_APPEL_RE,
  type DescripteurInvite, type Demande, type EntreeCreation, type Erreur, type GenreActeur, type Identite, type Langue, type Participant,
} from "./appels";
import type { DepotAppels } from "./appelsDepot";
import { composer, lienPersonnel, lienWhatsApp, texteWhatsApp, type Evenement, type Message } from "./appelsNotif";
import { acces, visioConfiguree, type VisioEnv } from "./visio";
import { detecterCoordonnees } from "./coordonnees";
import { consentir, donnerAvis, enregistrementAutorise, noterEntree, noterEvenement, proposerCompteRendu, trace, vueTrace } from "./appelsTrace";

export interface EnvAppels extends VisioEnv {
  DATABASE_URL?: string;
  APPELS_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
  APPELS_CRON_CLE?: string;
  /** Secret de signature du webhook JaaS (console JaaS → Webhooks → Reveal secret). */
  JAAS_WEBHOOK_SECRET?: string;
  PUBLIC_WEB_URL?: string;
  RESEND_API_KEY?: string;
  LEAD_NOTIFY_TO?: string;
  LEAD_NOTIFY_FROM?: string;
}

export type Reponse = { status: number; json: Record<string, unknown> };
export const repondre = (r: Reponse): Response =>
  new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const ok = (json: Record<string, unknown> = {}, status = 200): Reponse => ({ status, json: { ok: true, ...json } });
const ko = (status: number, error: string, extra: Record<string, unknown> = {}): Reponse => ({ status, json: { ok: false, error, ...extra } });
const deErreur = (e: Erreur): Reponse => ko(e.status, e.erreur, e.extra);
export const indisponible = (): Reponse => ko(503, "appels_indisponibles");

/** Identité de l'appelant connecté. */
export type ActeurConnecte =
  | { genre: "admin"; email: string }
  | { genre: "pro"; fournisseurId: string }
  | { genre: "membre"; membreId: string; projetId: string }
  /** Client connecté à son espace (cookie cli_session, functions/_lib/clientSession.ts). */
  | { genre: "client"; clientId: string; dossierIds: string[] };

/** Résolution des personnes (Neon en production, faux en test). */
export interface Resolveur {
  /** Identité d'un acteur connecté (null : compte introuvable ou inactif). */
  acteur(a: ActeurConnecte): Promise<Identite | null>;
  /** Personne invitée, après contrôle de droits propre au contexte ; erreur si inconnue ou interdite. */
  invite(i: DescripteurInvite, ctx: { acteur: ActeurConnecte | null; contexte: string; objetId: string }): Promise<Identite | Erreur>;
}

export type Ctx = {
  depot: DepotAppels;
  resolveur: Resolveur;
  env: EnvAppels;
  maintenant: number;
  envoyer: (m: Message & { to: string[] }) => Promise<boolean>;
  /** Appel demandé depuis un fil de messagerie : chaque étape y est inscrite (messagerieService). */
  journal?: (d: Demande, ev: string, auteurId: string | null) => Promise<void>;
  /** Enregistrement vidéo récupéré (webhook) → dépôt commun ; renvoie l'id du document, ou null sans stockage étendu (R2). */
  deposerEnregistrement?: (d: Demande, lien: string, dureeS: number | null) => Promise<string | null>;
};

/** Inscrit l'événement dans le fil d'origine ; n'échoue jamais. */
async function journaliser(c: Ctx, d: Demande, ev: string, auteurId: string | null) {
  if (!d.conversationId || !c.journal) return;
  try { await c.journal(d, ev, auteurId); } catch { /* le fil n'est qu'un reflet */ }
}

// ── Lien personnel ──────────────────────────────────────────────────────

export function secretAppels(env: EnvAppels): string | null {
  const s = (env.APPELS_SECRET || "").trim() || (env.ADMIN_SESSION_SECRET || "").trim();
  return s.length >= 32 ? s : null;
}

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function deriverJeton(secret: string, demandeId: string, participantId: string, sel: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`appel|${demandeId}|${participantId}|${sel}`))));
}

export async function empreinte(jeton: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jeton));
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, "0")).join("");
}

const origine = (env: EnvAppels) => (env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/+$/, "");

async function lienDe(c: Ctx, d: Demande, p: Participant): Promise<string> {
  return lienPersonnel(origine(c.env), await deriverJeton(secretAppels(c.env)!, d.id, p.id, p.sel), p.langue);
}

// ── Notifications ───────────────────────────────────────────────────────

const adressesCabinet = (env: EnvAppels) => (env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean);
const adresses = (c: Ctx, p: Participant) => (p.cle === CLE_CABINET ? adressesCabinet(c.env) : p.email ? [p.email] : []);

/** Prévient chaque participant concerné (sauf l'auteur) ; best-effort, n'échoue jamais. */
async function notifier(c: Ctx, d: Demande, ev: Evenement, auteurId: string | null): Promise<number> {
  const auteur = d.participants.find((p) => p.id === auteurId) ?? null;
  let n = 0;
  for (const p of d.participants) {
    const copie = ev === "demande" && p.id === auteurId;
    if (p.id === auteurId && !copie) continue;
    const to = adresses(c, p);
    if (!to.length) continue;
    try {
      if (await c.envoyer({ to, ...composer(ev, d, p, auteur, await lienDe(c, d, p), copie) })) n++;
    } catch { /* une notification manquée ne bloque pas la demande */ }
  }
  return n;
}

// ── Écriture avec reprise sur conflit ───────────────────────────────────

async function ecrire(c: Ctx, id: string, modifier: (d: Demande) => { ok: true; d: Demande; ev?: Evenement } | Erreur): Promise<{ ok: true; d: Demande; ev?: Evenement } | Erreur> {
  for (let essai = 0; essai < 3; essai++) {
    const d0 = await c.depot.lire(id);
    if (!d0) return { ok: false, status: 404, erreur: "not_found" };
    const r = modifier(d0);
    if (!r.ok) return r;
    if (await c.depot.enregistrer(r.d, d0.version)) return { ...r, d: { ...r.d, version: d0.version + 1 } };
  }
  return { ok: false, status: 409, erreur: "conflit" };
}

/** Expire / termine à la lecture si c'est dû (écriture best-effort). */
async function lireActuelle(c: Ctx, d: Demande): Promise<Demande> {
  const v = d.version;
  if (actualiser(d, c.maintenant) && (await c.depot.enregistrer(d, v).catch(() => false))) {
    d.version = v + 1;
    await journaliser(c, d, d.statut === "TERMINEE" ? "terminee" : "expiree", null);
  }
  return d;
}

// ── Création ────────────────────────────────────────────────────────────

const RE_EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']+\.[a-z]{2,}$/i;
function telephone(t: unknown): string | null {
  const s = clip(t, 30).replace(/[\s.\-()]/g, "");
  if (/^(\+212|00212|0)[5-7]\d{8}$/.test(s)) return s.startsWith("00") ? `+${s.slice(2)}` : s;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(s)) return s.startsWith("00") ? `+${s.slice(2)}` : s;
  return null;
}
const langue = (v: unknown): Langue => (v === "ar" ? "ar" : "fr");

/** Visiteur sans compte : nom + e-mail ou téléphone, consentement, pot de miel. Identité stable par empreinte du contact. */
export async function identiteVisiteur(b: Record<string, unknown>): Promise<Identite | Erreur> {
  const o = (b.demandeur && typeof b.demandeur === "object" ? b.demandeur : {}) as Record<string, unknown>;
  // Le nom est montré à l'autre partie : aucune coordonnée ne doit s'y glisser (CLAUDE.md, « tout passe par CITURBAREA »).
  const nom = masquerCoordonnees(clip(o.nom, 80)).texte;
  if (nom.length < 2) return { ok: false, status: 400, erreur: "nom_invalide" };
  const email = clip(o.email, 200).toLowerCase() || null;
  if (email && !RE_EMAIL.test(email)) return { ok: false, status: 400, erreur: "email_invalide" };
  const tel = o.telephone ? telephone(o.telephone) : null;
  if (o.telephone && !tel) return { ok: false, status: 400, erreur: "telephone_invalide" };
  if (!email && !tel) return { ok: false, status: 400, erreur: "contact_requis" };
  if (b.consentement !== true) return { ok: false, status: 400, erreur: "consentement_requis" };
  return { type: "client", cle: `vis:${(await empreinte(`visiteur|${email || tel}`)).slice(0, 32)}`, nom, email, telephone: tel, langue: langue(o.langue) };
}

const genreDe = (a: ActeurConnecte | null): GenreActeur => (a ? a.genre : "public");

export async function creer(c: Ctx, a: ActeurConnecte | null, corps: unknown): Promise<Reponse> {
  const secret = secretAppels(c.env);
  if (!secret) return ko(503, "appels_non_configures");
  const b = (corps && typeof corps === "object" && !Array.isArray(corps) ? corps : {}) as Record<string, unknown>;
  // Pot de miel : un robot reçoit un faux succès, rien n'est créé ni envoyé.
  if (!a && typeof b.website === "string" && b.website.trim()) return ok({ demande: null }, 202);

  const e = validerCreation(b, c.maintenant);
  if ("ok" in e) return deErreur(e);
  const permis = autoriserCreation(genreDe(a), e);
  if (!permis.ok) return deErreur(permis);
  if (a?.genre === "membre" && !e.objetId.startsWith(a.projetId)) return ko(403, "contexte_interdit");
  if (a?.genre === "client" && !a.dossierIds.includes(e.objetId)) return ko(403, "contexte_interdit");

  const moi = a ? await c.resolveur.acteur(a) : await identiteVisiteur(b);
  if (!moi) return ko(401, "unauthenticated");
  if ("ok" in moi) return deErreur(moi);
  if (a && (b.langue === "ar" || b.langue === "fr")) moi.langue = b.langue;

  const invites: Identite[] = [];
  for (const i of e.invites) {
    const r = await c.resolveur.invite(i, { acteur: a, contexte: e.contexte, objetId: e.objetId });
    if ("ok" in r) return deErreur(r);
    if (r.cle === moi.cle) return ko(400, "auto_invitation");
    if (!invites.some((x) => x.cle === r.cle)) invites.push(r);
  }
  const f = await finaliserCreation(c, e, moi, invites, null);
  if (!f.ok) return f.reponse;
  // Red flag : coordonnées tentées dans le message, le sujet ou le nom (déjà masquées) → cabinet prévenu.
  const demandeurNom = (b.demandeur as Record<string, unknown> | undefined)?.nom;
  const types = [...new Set([b.message, b.sujet, demandeurNom].flatMap((v) => detecterCoordonnees(typeof v === "string" ? v : "")))];
  if (types.length) {
    f.d.alerteCoordonnees = { types, le: new Date(c.maintenant).toISOString() };
    await c.depot.enregistrer(f.d, f.d.version).catch(() => false);
    const to = (c.env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean);
    const texte = `${moi.nom} a tenté de transmettre des coordonnées (${types.join(", ")}) dans une demande d'appel vidéo (${f.d.id}). Le texte a été masqué : rien n'a été transmis.\n\n${origine(c.env).replace("://", "://admin.")}/cc/appels`;
    const html = texte.replace(/[&<>"']/g, (x) => `&#${x.charCodeAt(0)};`).replace(/\n/g, "<br>");
    if (to.length) await c.envoyer({ to, subject: `Tentative de contact direct (appel vidéo) : ${moi.nom}`, text: texte, html: `<p>${html}</p>` }).catch(() => false);
  }
  return ok({
    demande: a?.genre === "admin" ? vueAdmin(f.d, c.maintenant) : vueParticipant(f.d, f.demandeurId, c.maintenant),
    // Le demandeur sans session reçoit SON lien (c'est le seul moyen de suivre sa demande).
    ...(a ? {} : { lien: lienPersonnel(origine(c.env), f.jeton, moi.langue), jeton: f.jeton }),
    messageMasque: e.messageMasque,
    notifications: f.notifications,
  }, 201);
}

/**
 * Fin commune de la création : débit, blocages, liens personnels, écriture,
 * notifications. Utilisée aussi par la messagerie (appel demandé depuis un
 * fil : identités déjà connues, `conversationId` renseigné).
 */
export async function finaliserCreation(c: Ctx, e: EntreeCreation, moi: Identite, invites: Identite[], conversationId: string | null):
  Promise<{ ok: true; d: Demande; demandeurId: string; jeton: string; notifications: number } | { ok: false; reponse: Reponse }> {
  const secret = secretAppels(c.env);
  if (!secret) return { ok: false, reponse: ko(503, "appels_non_configures") };
  // Débit et blocages (anti-harcèlement).
  const iso = (ms: number) => new Date(c.maintenant - ms).toISOString();
  const maintenantIso = new Date(c.maintenant).toISOString();
  const cles = invites.map((x) => x.cle);
  const debit = verifierDebit(moi.cle, cles, {
    demandeur24h: await c.depot.compterParDemandeur(moi.cle, iso(24 * 3600_000)),
    paires7j: await Promise.all(cles.map((k) => c.depot.compterPaire(moi.cle, k, iso(7 * 24 * 3600_000)))),
    paireEnAttente: await Promise.all(cles.map((k) => c.depot.paireEnAttente(moi.cle, k, maintenantIso))),
    recues24h: await Promise.all(cles.map((k) => c.depot.compterRecues(k, iso(24 * 3600_000)))),
    bloque: await Promise.all(cles.map((k) => c.depot.bloque(k, moi.cle))),
  });
  if (!debit.ok) return { ok: false, reponse: deErreur(debit) };

  const id = nouvelIdDemande();
  const avecLien = async (x: Identite) => {
    const pid = nouvelIdParticipant(), sel = nouveauSel();
    const jeton = await deriverJeton(secret, id, pid, sel);
    return { ...x, id: pid, sel, jetonHash: await empreinte(jeton), jeton };
  };
  const dem = await avecLien(moi);
  const inv = await Promise.all(invites.map(avecLien));
  const d = nouvelleDemande(e, dem, inv, id, c.maintenant);
  d.conversationId = conversationId;
  await c.depot.creer(d);
  const notifications = await notifier(c, d, "demande", dem.id);
  await journaliser(c, d, "demande", dem.id);
  return { ok: true, d, demandeurId: dem.id, jeton: dem.jeton, notifications };
}

// ── Accès d'un participant ──────────────────────────────────────────────

export type Acces = { d: Demande; p: Participant | null; admin: boolean };

/** Par lien personnel. */
export async function parJeton(c: Ctx, jeton: string): Promise<Acces | Reponse> {
  if (!secretAppels(c.env)) return ko(503, "appels_non_configures");
  if (!JETON_APPEL_RE.test(jeton)) return ko(404, "lien_invalide");
  const h = await empreinte(jeton);
  const d = await c.depot.parJetonHash(h);
  const p = d?.participants.find((x) => x.jetonHash === h);
  if (!d || !p) return ko(404, "lien_invalide");
  return { d: await lireActuelle(c, d), p, admin: false };
}

/** Par session : participant de la demande, ou back-office (supervision). */
export async function parSession(c: Ctx, a: ActeurConnecte, id: string): Promise<Acces | Reponse> {
  if (!secretAppels(c.env)) return ko(503, "appels_non_configures");
  if (!ID_DEMANDE_RE.test(id)) return ko(404, "not_found");
  const d = await c.depot.lire(id);
  if (!d) return ko(404, "not_found");
  const cle = await cleDe(c, a);
  const p = d.participants.find((x) => x.cle === cle) ?? null;
  if (!p && a.genre !== "admin") return ko(404, "not_found");
  return { d: await lireActuelle(c, d), p, admin: a.genre === "admin" };
}

async function cleDe(c: Ctx, a: ActeurConnecte): Promise<string | null> {
  if (a.genre === "admin") return CLE_CABINET;
  if (a.genre === "pro") return `frn:${a.fournisseurId}`;
  if (a.genre === "client") return `usr:${a.clientId}`;
  return `membre:${a.membreId}`;
}

export const vue = (c: Ctx, x: Acces) => ({ ...(x.admin ? vueAdmin(x.d, c.maintenant) : vueParticipant(x.d, x.p!.id, c.maintenant)), trace: vueTrace(x.d) });

export async function lire(c: Ctx, x: Acces): Promise<Reponse> {
  return ok({ demande: vue(c, x), visioIntegree: visioConfiguree(c.env) });
}

/** Accepter / contre-proposer / refuser / annuler. */
export async function agir(c: Ctx, x: Acces, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const action = lireAction(corps, c.maintenant);
  if ("ok" in action) return deErreur(action);
  const pid = x.p.id;
  const r = await ecrire(c, x.d.id, (d) => {
    const res = appliquer(d, pid, action, c.maintenant);
    return res.ok ? { ok: true, d: res.demande, ev: res.evenement } : res;
  });
  if (!r.ok) return deErreur(r);
  if (r.ev) { await notifier(c, r.d, r.ev, r.ev === "confirmee" ? null : pid); await journaliser(c, r.d, r.ev, pid); }
  return ok({ demande: vue(c, { ...x, d: r.d }), evenement: r.ev });
}

/** Le participant ne veut plus recevoir de demandes de ce demandeur (et décline celle-ci si elle est en attente). */
export async function bloquer(c: Ctx, x: Acces): Promise<Reponse> {
  if (!x.p || x.p.role !== "INVITE") return ko(403, "non_participant");
  await c.depot.bloquer(x.p.cle, x.d.demandeurCle, new Date(c.maintenant).toISOString());
  let d = x.d, ev: Evenement | undefined;
  if (statutOuvert(x.d)) {
    const pid = x.p.id;
    const r = await ecrire(c, x.d.id, (dd) => {
      const res = appliquer(dd, pid, { type: "refuser" }, c.maintenant);
      return res.ok ? { ok: true, d: res.demande, ev: res.evenement } : res;
    });
    if (r.ok) { d = r.d; ev = r.ev; }
  }
  if (ev) { await notifier(c, d, ev, x.p.id); await journaliser(c, d, ev, x.p.id); }
  return ok({ demande: vue(c, { ...x, d }), bloque: true });
}
const statutOuvert = (d: Demande) => d.statut === "EN_ATTENTE";

/** Jeton JaaS pour la salle : seulement un participant, seulement CONFIRMEE, seulement dans la fenêtre. */
export async function visio(c: Ctx, x: Acces): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const ctrl = controlerAccesSalle(x.d, x.p.id, c.maintenant);
  if (!ctrl.ok) return deErreur(ctrl);
  if (!visioConfiguree(c.env)) return ko(503, "visio_non_configuree");
  const pid = x.p.id;
  const r = await ecrire(c, x.d.id, (d) => {
    const k = controlerAccesSalle(d, pid, c.maintenant);
    if (!k.ok) return k;
    k.participant.jetonsVisio += 1;
    noterEntree(d, pid, c.maintenant);
    return { ok: true, d };
  });
  if (!r.ok) return deErreur(r);
  const p = r.d.participants.find((y) => y.id === pid)!;
  // Enregistrement possible SEULEMENT si tous y consentent ; chacun est alors modérateur pour pouvoir l'arrêter.
  const enregistrement = enregistrementAutorise(r.d);
  const a = await acces(c.env, r.d.contexte, r.d.salle!, { id: p.id, nom: p.nom }, enregistrement || estModerateur(r.d, p), c.maintenant, { enregistrement });
  if (!a.ok) return ko(503, a.error);
  return ok({ config: a.config, audioSeul: r.d.audioSeul, nom: p.nom, enregistrement });
}

// ── Listes ──────────────────────────────────────────────────────────────

export async function lister(c: Ctx, a: ActeurConnecte, statut: string | null): Promise<Reponse> {
  if (!secretAppels(c.env)) return ko(503, "appels_non_configures");
  const cle = await cleDe(c, a);
  const tout = a.genre === "admin";
  const l = await c.depot.lister({ cle: tout ? undefined : cle ?? undefined, statut: statut && /^[A-Z_]{3,20}$/.test(statut) ? statut : undefined, limite: 200 });
  return ok({ demandes: l.map((d) => ({ ...resume(d, cle, c.maintenant), ...(tout ? { cabinetParticipe: d.participants.some((p) => p.cle === CLE_CABINET) } : {}) })) });
}

/** Back-office : lien WhatsApp prérempli vers un participant (le cabinet connaît déjà ses coordonnées). */
export async function whatsapp(c: Ctx, x: Acces, corps: unknown): Promise<Reponse> {
  if (!x.admin) return ko(403, "forbidden");
  const pid = (corps as Record<string, unknown> | null)?.participantId;
  const p = typeof pid === "string" && ID_PARTICIPANT_RE.test(pid) ? x.d.participants.find((y) => y.id === pid) : undefined;
  if (!p || p.cle === CLE_CABINET) return ko(404, "not_found");
  const lien = await lienDe(c, x.d, p);
  return ok({ url: lienWhatsApp(p.telephone, texteWhatsApp(x.d, p, lien)), avecNumero: !!p.telephone });
}

/** Rappels : appels confirmés qui commencent dans l'heure (appelé par le cron ou à l'ouverture des listes). */
export async function rappels(c: Ctx): Promise<Reponse> {
  if (!secretAppels(c.env)) return ko(503, "appels_non_configures");
  const l = await c.depot.aRappeler(new Date(c.maintenant).toISOString(), new Date(c.maintenant + RAPPEL_AVANT_MS).toISOString());
  let n = 0;
  for (const d0 of l) {
    const v = d0.version;
    const d = { ...d0, rappelEnvoye: true };
    if (!(await c.depot.enregistrer(d, v))) continue; // un autre passage s'en occupe
    await notifier(c, d, "rappel", null);
    n++;
  }
  return ok({ rappels: n });
}

/** Lecture du corps JSON borné. */
export async function lireJson(req: Request, max = 16 * 1024): Promise<unknown> {
  try { const t = await req.text(); return t.length > max ? null : JSON.parse(t); } catch { return null; }
}

// ── Trace de l'appel : consentement à l'enregistrement, compte rendu ────

/** Donner / retirer son consentement à l'enregistrement vidéo (loi 09-08 : explicite, retirable). */
export async function consentementEnregistrement(c: Ctx, x: Acces, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const accepte = (corps as Record<string, unknown> | null)?.accepte;
  if (typeof accepte !== "boolean") return ko(400, "payload_invalid");
  const pid = x.p.id;
  const r = await ecrire(c, x.d.id, (d) => { const k = consentir(d, pid, accepte, c.maintenant); return k.ok ? { ok: true, d } : k; });
  if (!r.ok) return deErreur(r);
  await journaliser(c, r.d, accepte ? "consentement_enregistrement" : "retrait_enregistrement", pid);
  return ok({ demande: vue(c, { ...x, d: r.d }) });
}

/** Proposer le compte rendu écrit (remplace le précédent ; les autres participants le valident). */
export async function compteRendu(c: Ctx, x: Acces, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const pid = x.p.id;
  let types: string[] = [];
  const r = await ecrire(c, x.d.id, (d) => {
    const k = proposerCompteRendu(d, pid, (corps as Record<string, unknown> | null)?.texte, c.maintenant);
    if (!k.ok) return k;
    types = k.types;
    return { ok: true, d };
  });
  if (!r.ok) return deErreur(r);
  if (types.length) await alerterCabinet(c, `Tentative de contact direct (compte rendu d'appel) : ${x.p.nom}`, `${x.p.nom} a écrit des coordonnées (${types.join(", ")}) dans le compte rendu de l'appel ${r.d.id}. Elles ont été masquées.`);
  await journaliser(c, r.d, "compte_rendu_propose", pid);
  await notifierCompteRendu(c, r.d, pid, "propose");
  return ok({ demande: vue(c, { ...x, d: r.d }) });
}

/** Avis sur le compte rendu : d'accord, ou non avec une remarque. */
export async function avisCompteRendu(c: Ctx, x: Acces, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const b = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  if (typeof b.accord !== "boolean") return ko(400, "payload_invalid");
  const pid = x.p.id;
  const r = await ecrire(c, x.d.id, (d) => { const k = donnerAvis(d, pid, b.accord as boolean, b.remarque, c.maintenant); return k.ok ? { ok: true, d } : k; });
  if (!r.ok) return deErreur(r);
  const statut = r.d.trace?.compteRendu?.statut;
  if (statut === "VALIDE" || statut === "CONTESTE") {
    await journaliser(c, r.d, statut === "VALIDE" ? "compte_rendu_valide" : "compte_rendu_conteste", pid);
    await notifierCompteRendu(c, r.d, pid, statut === "VALIDE" ? "valide" : "conteste");
  }
  return ok({ demande: vue(c, { ...x, d: r.d }) });
}

async function alerterCabinet(c: Ctx, sujet: string, texte: string) {
  const to = (c.env.LEAD_NOTIFY_TO || "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!to.length) return;
  await c.envoyer({ to, subject: sujet, text: texte, html: `<p>${texte.replace(/[&<>"']/g, (v) => `&#${v.charCodeAt(0)};`)}</p>` }).catch(() => false);
}

/** Prévient les autres participants (lien personnel ; aucune coordonnée). */
async function notifierCompteRendu(c: Ctx, d: Demande, auteurId: string, quoi: "propose" | "valide" | "conteste") {
  const auteur = d.participants.find((p) => p.id === auteurId)?.nom ?? "CITURBAREA";
  for (const p of d.participants) {
    if (p.id === auteurId) continue;
    const to = adresses(c, p);
    if (!to.length) continue;
    const lien = await lienDe(c, d, p);
    const ar = p.langue === "ar";
    const sujet = quoi === "propose" ? (ar ? `محضر المكالمة: ${auteur} يطلب موافقتك` : `Compte rendu de l'appel : ${auteur} vous demande de le valider`)
      : quoi === "valide" ? (ar ? "تمت المصادقة على محضر المكالمة" : "Compte rendu de l'appel validé") : (ar ? "محضر المكالمة محل اعتراض" : "Compte rendu de l'appel contesté");
    const texte = `${sujet}\n\n${ar ? "افتح" : "Ouvrir"} : ${lien}`;
    await c.envoyer({ to, subject: sujet, text: texte, html: `<p>${sujet}</p><p><a href="${lien}">${ar ? "فتح" : "Ouvrir"}</a></p>` }).catch(() => false);
  }
}

// ── Webhook JaaS (trace réelle, enregistrement) ─────────────────────────

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

/** Vérifie X-Jaas-Signature : « t=<s>,v1=<base64 HMAC-SHA256(secret, t + "." + corps)> » (tolérance 10 min). */
export async function signatureJaasValide(secret: string, entete: string | null, corps: string, maintenant: number): Promise<boolean> {
  if (!entete || !secret) return false;
  const parts = entete.split(",").map((x) => x.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, ...v]) => v.join("="));
  if (!t || !/^\d+$/.test(t) || !sigs.length || Math.abs(maintenant / 1000 - Number(t)) > 600) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = b64(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${corps}`))));
  return sigs.some((s) => s.length === attendu.length && [...s].reduce((diff, ch, i) => diff | (ch.charCodeAt(0) ^ attendu.charCodeAt(i)), 0) === 0);
}

/** POST /api/appels/jaas : événements JaaS signés → trace de l'appel ; enregistrement déposé dans le dépôt commun. */
export async function webhookJaas(c: Ctx, req: Request): Promise<Reponse> {
  const secret = (c.env.JAAS_WEBHOOK_SECRET || "").trim();
  if (!secret) return ko(503, "webhook_non_configure");
  const corps = await req.text();
  if (corps.length > 64 * 1024 || !(await signatureJaasValide(secret, req.headers.get("x-jaas-signature"), corps, c.maintenant))) return ko(401, "signature_invalide");
  let e: Record<string, unknown>;
  try { e = JSON.parse(corps); } catch { return ko(400, "payload_invalid"); }
  const type = String(e.eventType || "");
  const salle = String(e.fqn || "").split("/")[1] || "";
  const donnees = (e.data && typeof e.data === "object" ? e.data : {}) as Record<string, unknown>;
  const d0 = salle ? await c.depot.parSalle(salle) : null;
  if (!d0) return ok({ ignore: true }); // salle d'un autre module (RDV, chantier) : rien à tracer ici
  const cle = String(e.idempotencyKey || `${type}|${e.timestamp}|${donnees.id ?? ""}`);
  const le = Number(e.timestamp) || c.maintenant;
  const pid = typeof donnees.id === "string" ? donnees.id : null;
  const r = await ecrire(c, d0.id, (d) => { noterEvenement(d, cle, type, le, pid, type); return { ok: true, d }; });
  if (!r.ok) return deErreur(r);
  let d = r.d;
  if (type === "ROOM_DESTROYED") await journaliser(c, d, "fin_salle", null);
  if (type === "RECORDING_UPLOADED" && typeof donnees.preAuthenticatedLink === "string") {
    // Garde-fou : un enregistrement sans le consentement de TOUS n'est jamais conservé.
    const autorise = enregistrementAutorise(d);
    const dureeS = typeof donnees.durationSec === "number" ? donnees.durationSec : null;
    const documentId = autorise && c.deposerEnregistrement ? await c.deposerEnregistrement(d, donnees.preAuthenticatedLink, dureeS).catch(() => null) : null;
    const motif = !autorise ? "consentement manquant : non conservé" : documentId ? null : "stockage étendu (R2) non activé : non conservé";
    const r2 = await ecrire(c, d.id, (x) => { trace(x).enregistrement = { statut: documentId ? "CONSERVE" : "NON_CONSERVE", documentId, dureeS, motif }; return { ok: true, d: x }; });
    if (r2.ok) d = r2.d;
    await journaliser(c, d, documentId ? "enregistrement_conserve" : "enregistrement_non_conserve", null);
    if (!documentId && autorise) await alerterCabinet(c, `Enregistrement d'appel non conservé (${d.id})`, `L'enregistrement de l'appel ${d.id} n'a pas pu être conservé (${motif}). Le lien de 8x8 reste valable 24 h : ${donnees.preAuthenticatedLink}`);
  }
  return ok({ trace: true });
}

/** Envoi Resend (facultatif : sans RESEND_API_KEY, rien n'est envoyé et le lien reste affiché). */
export function envoyeurResend(env: EnvAppels) {
  return async (m: Message & { to: string[] }): Promise<boolean> => {
    if (!env.RESEND_API_KEY || !m.to.length) return false;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>", ...m }),
      });
      if (!r.ok) console.error(`[appels] e-mail refusé (${r.status})`);
      return r.ok;
    } catch { console.error("[appels] e-mail impossible"); return false; }
  };
}

/**
 * Routeur commun. `acteur` null = porte publique (/api/appels : création par
 * un visiteur, puis tout passe par le lien personnel).
 */
export async function routeur(c: Ctx, req: Request, acteur: ActeurConnecte | null, chemin: string[]): Promise<Reponse> {
  const m = req.method;
  if (!(await c.depot.tablesPresentes())) return indisponible();

  if (chemin[0] === "rappels" && chemin.length === 1 && m === "POST") {
    const cle = (c.env.APPELS_CRON_CLE || "").trim();
    const autorise = acteur?.genre === "admin" || (cle.length >= 24 && req.headers.get("x-cle-cron") === cle);
    return autorise ? rappels(c) : ko(403, "forbidden");
  }

  if (!acteur) {
    if (chemin[0] === "jaas" && chemin.length === 1 && m === "POST") return webhookJaas(c, req);
    if (!chemin.length && m === "POST") return creer(c, null, await lireJson(req));
    if (chemin[0] === "lien" && chemin.length >= 2) {
      const x = await parJeton(c, chemin[1]);
      if ("status" in x) return x;
      const action = chemin[2];
      if (!action && m === "GET") return lire(c, x);
      if (m !== "POST") return ko(405, "methode");
      if (action === "repondre") return agir(c, x, await lireJson(req));
      if (action === "visio") return visio(c, x);
      if (action === "enregistrement") return consentementEnregistrement(c, x, await lireJson(req));
      if (action === "compte-rendu") return compteRendu(c, x, await lireJson(req));
      if (action === "avis") return avisCompteRendu(c, x, await lireJson(req));
      if (action === "bloquer") return bloquer(c, x);
    }
    return ko(404, "route_inconnue");
  }

  if (!chemin.length) {
    if (m === "GET") return lister(c, acteur, new URL(req.url).searchParams.get("statut"));
    if (m === "POST") return creer(c, acteur, await lireJson(req));
    return ko(405, "methode");
  }
  const x = await parSession(c, acteur, chemin[0]);
  if ("status" in x) return x;
  const action = chemin[1];
  if (!action && m === "GET") return lire(c, x);
  if (m !== "POST") return ko(405, "methode");
  if (action === "repondre") return agir(c, x, await lireJson(req));
  if (action === "visio") return visio(c, x);
  if (action === "enregistrement") return consentementEnregistrement(c, x, await lireJson(req));
  if (action === "compte-rendu") return compteRendu(c, x, await lireJson(req));
  if (action === "avis") return avisCompteRendu(c, x, await lireJson(req));
  if (action === "bloquer") return bloquer(c, x);
  if (action === "whatsapp") return whatsapp(c, x, await lireJson(req));
  return ko(404, "route_inconnue");
}

/** Segments après le préfixe (params.chemin d'un [[chemin]].ts). */
export const segments = (p: string | string[] | undefined): string[] => (Array.isArray(p) ? p : p ? [p] : []).filter(Boolean);
