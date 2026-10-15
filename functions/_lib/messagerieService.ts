/**
 * Messagerie — orchestration (routes /api/messages, /api/cc/messages,
 * /api/cercles/espace/messages).
 *
 * Accès d'un participant : session (back-office, pro) ou LIEN PERSONNEL
 * /messages/<jeton> (sans mot de passe, HMAC dérivé, seule l'empreinte est
 * stockée) ; un visiteur / client sans compte reçoit aussi un lien de BOÎTE
 * (/messages/boite/<jeton signé>) qui regroupe tous ses fils.
 * Le back-office lit tous les fils pour la modération (mention CGU :
 * docs/architecture/contrat-messagerie.md) mais n'écrit que s'il participe.
 */
import {
  autoriserCreation, CLE_CABINET, clip, CONTEXTES_APPEL, lireInvite, masquerCoordonnees, OBJET_RE, validerCreation,
  type ContexteAppel, type DescripteurInvite, type Demande, type Identite, type Langue,
} from "./appels";
import type { DepotAppels } from "./appelsDepot";
import {
  deriverJeton, empreinte, finaliserCreation, identiteVisiteur, lireJson, repondre, secretAppels, segments, vue as vueAppel,
  type ActeurConnecte, type Ctx as CtxAppels, type EnvAppels, type Reponse,
} from "./appelsService";
import { detecterCoordonnees, type TypeCoordonnee } from "./coordonnees";
import {
  aDesAlertes, enregistrerTentative, leverSuspension, SEUIL_SUSPENSION, aPrevenir, DEBIT_MESSAGES, empreinteConversation, ID_CONVERSATION_RE, ID_MESSAGE_RE, jetonBoite, lireJetonBoite, motifSignalement,
  nouvelIdConversation, nouvelIdMessage, nouvelIdParticipantConv, nouvelleConversation, participantDe, peutEcrire, preparerTexte,
  resumeConversation, verifierDebitMessages, vueConversation, vueMessage,
  type Conversation, type Message, type ParticipantConv,
} from "./messagerie";
import type { DepotMessagerie } from "./messagerieDepot";

export { repondre, segments };
export type CtxMsg = CtxAppels & { msg: DepotMessagerie };

const ok = (json: Record<string, unknown> = {}, status = 200): Reponse => ({ status, json: { ok: true, ...json } });
const ko = (status: number, error: string, extra: Record<string, unknown> = {}): Reponse => ({ status, json: { ok: false, error, ...extra } });
export const indisponible = (): Reponse => ko(503, "messagerie_indisponible");
const iso = (c: CtxMsg, delta = 0) => new Date(c.maintenant - delta).toISOString();
const origine = (env: EnvAppels) => (env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/+$/, "");
const echapper = (s: string) => s.replace(/[&<>"']/g, (x) => `&#${x.charCodeAt(0)};`);

// ── Liens ───────────────────────────────────────────────────────────────

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export async function jetonFil(secret: string, convId: string, pid: string, sel: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`conv|${convId}|${pid}|${sel}`))));
}
const lienFil = (env: EnvAppels, jeton: string, l: Langue) => `${origine(env)}${l === "ar" ? "/ar" : ""}/messages/${jeton}`;
const lienBoite = (env: EnvAppels, jeton: string, l: Langue) => `${origine(env)}${l === "ar" ? "/ar" : ""}/messages/boite/${jeton}`;

async function nouveauParticipant(secret: string, convId: string, x: Identite, descripteur: DescripteurInvite | null) {
  const id = nouvelIdParticipantConv();
  const sel = crypto.randomUUID().replace(/-/g, "");
  const jeton = await jetonFil(secret, convId, id, sel);
  return { p: participantDe(x, { id, sel, jetonHash: await empreinte(jeton), descripteur }), jeton };
}

// ── Notifications ───────────────────────────────────────────────────────

const adresses = (c: CtxMsg, p: ParticipantConv) =>
  p.cle === CLE_CABINET ? (c.env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean) : p.email ? [p.email] : [];

function mailMessage(dest: ParticipantConv, auteur: string, sujet: string | null, extrait: string, lien: string) {
  const ar = dest.langue === "ar";
  const titre = ar ? `رسالة جديدة من ${auteur} على CITURBAREA` : `Nouveau message de ${auteur} sur CITURBAREA`;
  const intro = ar ? `مرحبًا ${dest.nom}،` : `Bonjour ${dest.nom},`;
  const repondre = ar ? "الرد على CITURBAREA" : "Répondre sur CITURBAREA";
  const pied = ar
    ? "رابط شخصي، بدون كلمة مرور، لا تشاركه. لا تتبادل معلومات الاتصال: كل شيء يمر عبر CITURBAREA."
    : "Lien personnel, sans mot de passe : ne le transférez pas. Les coordonnées ne s'échangent pas : tout passe par CITURBAREA.";
  return {
    subject: `${titre}${sujet ? ` — ${sujet}` : ""}`,
    text: [intro, "", titre, "", `« ${extrait} »`, "", `${repondre} : ${lien}`, "", pied].join("\n"),
    html: `<div dir="${ar ? "rtl" : "ltr"}" style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#0B1B3A"><p>${echapper(intro)}</p><p>${echapper(titre)}</p>
<blockquote style="margin:0;padding:8px 12px;border-inline-start:4px solid #C9A227;background:#faf7ec">${echapper(extrait)}</blockquote>
<p><a href="${echapper(lien)}" style="display:inline-block;background:#C9A227;color:#0B1B3A;padding:12px 18px;border-radius:8px;font-weight:bold;text-decoration:none">${echapper(repondre)}</a></p>
<p style="font-size:12px;color:#475569">${echapper(pied)}</p></div>`,
  };
}

/** Prévient les autres participants (au plus une fois par quart d'heure et par fil). Renvoie les ids prévenus. */
async function prevenir(c: CtxMsg, conv: Conversation, auteur: ParticipantConv, texte: string): Promise<string[]> {
  const secret = secretAppels(c.env)!;
  const fait: string[] = [];
  for (const p of conv.participants) {
    if (!aPrevenir(p, auteur.id, c.maintenant)) continue;
    const to = adresses(c, p);
    if (!to.length) continue;
    try {
      const lien = lienFil(c.env, await jetonFil(secret, conv.id, p.id, p.sel), p.langue);
      if (await c.envoyer({ to, ...mailMessage(p, auteur.nom, conv.sujet, texte.slice(0, 300), lien) })) fait.push(p.id);
    } catch { /* best-effort */ }
  }
  return fait;
}

// ── Écriture d'une conversation avec reprise ────────────────────────────

async function majConversation(c: CtxMsg, id: string, f: (conv: Conversation) => void): Promise<Conversation | null> {
  for (let i = 0; i < 3; i++) {
    const conv = await c.msg.lire(id);
    if (!conv) return null;
    f(conv);
    conv.updatedAt = iso(c);
    if (await c.msg.enregistrer(conv, conv.version)) return { ...conv, version: conv.version + 1 };
  }
  return null;
}

// ── Création d'un fil ───────────────────────────────────────────────────

function lireCreation(b: Record<string, unknown>) {
  if (!(CONTEXTES_APPEL as readonly string[]).includes(String(b.contexte))) return { erreur: "contexte_invalide" } as const;
  const objetId = typeof b.objetId === "string" ? b.objetId.trim() : "";
  if (!OBJET_RE.test(objetId)) return { erreur: "objet_invalide" } as const;
  if (!Array.isArray(b.invites) || !b.invites.length || b.invites.length > 5) return { erreur: "invites_invalides" } as const;
  const invites: DescripteurInvite[] = [];
  for (const x of b.invites) { const i = lireInvite(x); if (!i) return { erreur: "invites_invalides" } as const; invites.push(i); }
  return { contexte: b.contexte as ContexteAppel, objetId, invites, sujet: masquerCoordonnees(clip(b.sujet, 120)).texte || null };
}

export async function creerFil(c: CtxMsg, a: ActeurConnecte | null, corps: unknown): Promise<Reponse> {
  const secret = secretAppels(c.env);
  if (!secret) return ko(503, "messagerie_non_configuree");
  const b = (corps && typeof corps === "object" && !Array.isArray(corps) ? corps : {}) as Record<string, unknown>;
  if (!a && typeof b.website === "string" && b.website.trim()) return ok({ conversation: null }, 202);
  const e = lireCreation(b);
  if ("erreur" in e) return ko(400, e.erreur!);
  const genre = a ? a.genre : "public";
  if (genre === "membre") return ko(403, "contexte_interdit"); // le chantier a déjà sa discussion par jalon (espace projet)
  if (a?.genre === "client" && !a.dossierIds.includes(e.objetId)) return ko(403, "contexte_interdit"); // client : SON dossier seulement
  const permis = autoriserCreation(genre, e);
  if (!permis.ok) return ko(permis.status, permis.erreur);
  const texte = preparerTexte(b.texte);
  if (!texte.ok) return ko(400, texte.erreur);

  const moi = a ? await c.resolveur.acteur(a) : await identiteVisiteur(b);
  if (!moi) return ko(401, "unauthenticated");
  if ("ok" in moi) return ko(moi.status, moi.erreur);
  if (b.langue === "ar" || b.langue === "fr") moi.langue = b.langue;

  const invites: { x: Identite; d: DescripteurInvite }[] = [];
  for (const i of e.invites) {
    const r = await c.resolveur.invite(i, { acteur: a, contexte: e.contexte, objetId: e.objetId });
    if ("ok" in r) return ko(r.status, r.erreur);
    if (r.cle === moi.cle) return ko(400, "auto_invitation");
    if (!invites.some((y) => y.x.cle === r.cle)) invites.push({ x: r, d: i });
  }
  for (const i of invites) if (await c.msg.bloque(i.x.cle, moi.cle)) return ko(403, "destinataire_indisponible");
  const max = moi.cle === CLE_CABINET ? DEBIT_MESSAGES.nouveauxFilsAdmin24h : DEBIT_MESSAGES.nouveauxFils24h;
  if ((await c.msg.compterConversationsCreees(moi.cle, iso(c, 24 * 3600_000))) >= max) return ko(429, "trop_de_conversations");
  const debit = verifierDebitMessages({ auteur10min: await c.msg.compterMessagesAuteur(moi.cle, iso(c, 600_000)), auteur24h: await c.msg.compterMessagesAuteur(moi.cle, iso(c, 24 * 3600_000)) });
  if (!debit.ok) return ko(debit.status, debit.erreur);

  // Un seul fil ouvert par groupe de personnes et par sujet.
  const existante = await c.msg.parEmpreinte(empreinteConversation(e.contexte, e.objetId, [moi.cle, ...invites.map((i) => i.x.cle)]));
  if (existante) {
    const p = existante.participants.find((x) => x.cle === moi.cle)!;
    if (a) return posterMessage(c, existante, p, b.texte);
    // Sans session, on ne révèle rien : le lien est renvoyé à l'adresse du titulaire (qui seul peut l'ouvrir).
    const to = adresses(c, p);
    if (to.length) {
      const lien = lienFil(c.env, await jetonFil(secret, existante.id, p.id, p.sel), p.langue);
      await c.envoyer({ to, ...mailMessage(p, "CITURBAREA", existante.sujet, p.langue === "ar" ? "رابط محادثتك الحالية" : "Le lien de votre conversation en cours", lien) }).catch(() => false);
    }
    return ko(409, "conversation_existante");
  }

  const id = nouvelIdConversation();
  const createur = await nouveauParticipant(secret, id, moi, null);
  const autres = await Promise.all(invites.map((i) => nouveauParticipant(secret, id, i.x, i.d)));
  const conv = nouvelleConversation({ contexte: e.contexte, objetId: e.objetId, sujet: e.sujet }, createur.p, autres.map((x) => x.p), id, c.maintenant);
  const m: Message = { id: nouvelIdMessage(), conversationId: id, auteurId: createur.p.id, auteurCle: moi.cle, type: "TEXTE", texte: texte.texte, masque: texte.masque, meta: texte.types.length ? { coordonnees: texte.types } : {}, modere: false, createdAt: iso(c) };
  await c.msg.creer(conv);
  await c.msg.ajouterMessage(m);
  if (texte.types.length) await signalerTentative(c, id, createur.p, texte.types);
  const prevenus = await prevenir(c, conv, createur.p, texte.texte);
  if (prevenus.length) await majConversation(c, id, (x) => { for (const p of x.participants) if (prevenus.includes(p.id)) p.notifieLe = iso(c); });
  const boite = a ? null : await jetonBoite(secret, moi.cle, c.maintenant);
  return ok({
    conversation: vueConversation(conv, createur.p.id, a?.genre === "admin"),
    messages: [vueMessage(m, conv, createur.p.id, false)],
    messageMasque: texte.masque,
    ...(a ? {} : { jeton: createur.jeton, lien: lienFil(c.env, createur.jeton, moi.langue), boite, lienBoite: lienBoite(c.env, boite!, moi.langue) }),
  }, 201);
}

// ── Accès ───────────────────────────────────────────────────────────────

export type AccesFil = { conv: Conversation; p: ParticipantConv | null; admin: boolean; viaLien?: boolean };

export async function filParJeton(c: CtxMsg, jeton: string): Promise<AccesFil | Reponse> {
  if (!secretAppels(c.env)) return ko(503, "messagerie_non_configuree");
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return ko(404, "lien_invalide");
  const h = await empreinte(jeton);
  const conv = await c.msg.parJetonHash(h);
  const p = conv?.participants.find((x) => x.jetonHash === h);
  return conv && p ? { conv, p, admin: false, viaLien: true } : ko(404, "lien_invalide");
}

const cleDe = (a: ActeurConnecte) => (a.genre === "admin" ? CLE_CABINET : a.genre === "pro" ? `frn:${a.fournisseurId}` : a.genre === "client" ? `usr:${a.clientId}` : `membre:${a.membreId}`);

export async function filParSession(c: CtxMsg, a: ActeurConnecte, id: string): Promise<AccesFil | Reponse> {
  if (!secretAppels(c.env)) return ko(503, "messagerie_non_configuree");
  if (!ID_CONVERSATION_RE.test(id)) return ko(404, "not_found");
  const conv = await c.msg.lire(id);
  if (!conv) return ko(404, "not_found");
  const p = conv.participants.find((x) => x.cle === cleDe(a)) ?? null;
  if (!p && a.genre !== "admin") return ko(404, "not_found");
  return { conv, p, admin: a.genre === "admin" };
}

/** Appels nés de ce fil, vus par le lecteur (son lien d'appel s'il participe). */
async function appelsDuFil(c: CtxMsg, x: AccesFil, msgs: Message[]) {
  const ids = [...new Set(msgs.filter((m) => m.type === "APPEL" && typeof m.meta.appelId === "string").map((m) => String(m.meta.appelId)))];
  const out = [];
  for (const id of ids.slice(-10)) {
    const d = await c.depot.lire(id);
    if (!d || d.conversationId !== x.conv.id) continue;
    const pa = x.p ? d.participants.find((y) => y.cle === x.p!.cle) : undefined;
    out.push({
      id: d.id,
      ...(pa ? { vue: vueAppel(c, { d, p: pa, admin: false }) } : x.admin ? { vue: vueAppel(c, { d, p: null, admin: true }) } : {}),
      // Accès par lien (sans session) : le lien personnel de l'appel, pour y répondre et le rejoindre.
      ...(pa && x.viaLien ? { jetonAppel: await deriverJeton(secretAppels(c.env)!, d.id, pa.id, pa.sel) } : {}),
    });
  }
  return out;
}

export async function lireFil(c: CtxMsg, x: AccesFil): Promise<Reponse> {
  const msgs = await c.msg.messages(x.conv.id, 200);
  let conv = x.conv;
  // Lu jusqu'à maintenant (le back-office qui modère sans participer ne marque rien).
  if (x.p && msgs.length && (!x.p.luJusqua || msgs[msgs.length - 1].createdAt > x.p.luJusqua)) {
    const pid = x.p.id;
    conv = (await majConversation(c, conv.id, (v) => { const p = v.participants.find((y) => y.id === pid); if (p) p.luJusqua = iso(c); })) ?? conv;
  }
  return ok({
    conversation: vueConversation(conv, x.p?.id ?? null, x.admin),
    messages: msgs.map((m) => vueMessage(m, conv, x.p?.id ?? null, x.admin)),
    appels: await appelsDuFil(c, x, msgs),
    peut: { ecrire: !!x.p && conv.statut !== "FERMEE", appeler: !!x.p && conv.statut !== "FERMEE" && conv.participants.length > 1, bloquer: !!x.p && x.p.cle !== CLE_CABINET, signaler: !!x.p, moderer: x.admin },
  });
}

async function posterMessage(c: CtxMsg, conv: Conversation, p: ParticipantConv, brut: unknown): Promise<Reponse> {
  const droit = peutEcrire(conv, p.id);
  if (!droit.ok) return ko(droit.status, droit.erreur);
  for (const autre of conv.participants) if (autre.id !== p.id && (await c.msg.bloque(autre.cle, p.cle))) return ko(403, "destinataire_indisponible");
  const texte = preparerTexte(brut);
  if (!texte.ok) return ko(400, texte.erreur);
  const debit = verifierDebitMessages({ auteur10min: await c.msg.compterMessagesAuteur(p.cle, iso(c, 600_000)), auteur24h: await c.msg.compterMessagesAuteur(p.cle, iso(c, 24 * 3600_000)) });
  if (!debit.ok) return ko(debit.status, debit.erreur);
  const m: Message = { id: nouvelIdMessage(), conversationId: conv.id, auteurId: p.id, auteurCle: p.cle, type: "TEXTE", texte: texte.texte, masque: texte.masque, meta: texte.types.length ? { coordonnees: texte.types } : {}, modere: false, createdAt: iso(c) };
  await c.msg.ajouterMessage(m);
  const alerte = texte.types.length ? await signalerTentative(c, conv.id, p, texte.types) : null;
  const prevenus = await prevenir(c, conv, p, texte.texte);
  const maj = await majConversation(c, conv.id, (v) => {
    v.dernierMessageLe = m.createdAt;
    for (const y of v.participants) {
      if (y.id === p.id) y.luJusqua = m.createdAt;
      if (prevenus.includes(y.id)) y.notifieLe = iso(c);
    }
  });
  return ok({ conversationId: conv.id, message: vueMessage(m, maj ?? conv, p.id, false), messageMasque: texte.masque, ...(alerte ? { suspendu: alerte.suspendu || alerte.dejaSuspendu, tentatives: alerte.nombre } : {}) }, 201);
}

/** « Demander un appel vidéo » depuis le fil : les invités sont les autres participants. */
async function appelDepuisFil(c: CtxMsg, x: AccesFil, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const droit = peutEcrire(x.conv, x.p.id);
  if (!droit.ok) return ko(droit.status, droit.erreur);
  const b = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  const e = validerCreation({ ...b, contexte: x.conv.contexte, objetId: x.conv.objetId, sujet: x.conv.sujet ?? undefined, invites: [{ type: "admin" }] }, c.maintenant);
  if ("ok" in e) return ko(e.status, e.erreur);
  const ident = (p: ParticipantConv): Identite => ({ type: p.type, cle: p.cle, nom: p.nom, email: p.email, telephone: p.telephone, langue: p.langue });
  const types = detecterCoordonnees(typeof b.message === "string" ? b.message : "");
  if (types.length) await signalerTentative(c, x.conv.id, x.p, types);
  const f = await finaliserCreation(c, e, ident(x.p), x.conv.participants.filter((p) => p.id !== x.p!.id).map(ident), x.conv.id);
  if (!f.ok) return f.reponse;
  return ok({ appelId: f.d.id, jetonAppel: f.jeton }, 201);
}

async function signaler(c: CtxMsg, x: AccesFil, corps: unknown): Promise<Reponse> {
  if (!x.p) return ko(403, "non_participant");
  const motif = motifSignalement((corps as Record<string, unknown> | null)?.motif);
  const pid = x.p.id;
  const conv = await majConversation(c, x.conv.id, (v) => { v.statut = v.statut === "FERMEE" ? "FERMEE" : "SIGNALEE"; v.signalements.push({ le: iso(c), par: pid, motif }); });
  const to = (c.env.LEAD_NOTIFY_TO || "").split(",").map((y) => y.trim()).filter(Boolean);
  if (to.length) await c.envoyer({
    to, subject: `Conversation signalée — ${x.conv.sujet || x.conv.id}`,
    text: `${x.p.nom} a signalé la conversation ${x.conv.id}.\nMotif : ${motif}\n\n${origine(c.env).replace("://", "://admin.")}/cc/messages`,
    html: `<p>${echapper(x.p.nom)} a signalé la conversation ${echapper(x.conv.id)}.</p><p>Motif : ${echapper(motif)}</p>`,
  }).catch(() => false);
  return ok({ conversation: conv ? vueConversation(conv, pid) : null, signale: true });
}

async function bloquerFil(c: CtxMsg, x: AccesFil): Promise<Reponse> {
  if (!x.p || x.p.cle === CLE_CABINET) return ko(403, "non_participant");
  // Bloque les autres personnes du fil (jamais le cabinet) : ni message ni demande d'appel de leur part.
  for (const y of x.conv.participants) if (y.id !== x.p.id && y.cle !== CLE_CABINET) await c.msg.bloquer(x.p.cle, y.cle, iso(c));
  return ok({ bloque: true });
}

async function moderer(c: CtxMsg, x: AccesFil, corps: unknown): Promise<Reponse> {
  if (!x.admin) return ko(403, "forbidden");
  const b = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  if (typeof b.messageId === "string" && ID_MESSAGE_RE.test(b.messageId)) {
    return (await c.msg.modererMessage(b.messageId, x.conv.id, b.modere !== false)) ? ok({}) : ko(404, "not_found");
  }
  if (typeof b.participantId === "string" && b.lever === true) {
    const pid = b.participantId;
    let leve = false;
    const conv = await majConversation(c, x.conv.id, (v) => { leve = leverSuspension(v, pid, c.maintenant); });
    return conv && leve ? ok({ conversation: vueConversation(conv, null, true) }) : ko(404, "not_found");
  }
  if (b.statut === "OUVERTE" || b.statut === "FERMEE") {
    const conv = await majConversation(c, x.conv.id, (v) => { v.statut = b.statut as Conversation["statut"]; });
    return conv ? ok({ conversation: vueConversation(conv, null, true) }) : ko(409, "conflit");
  }
  return ko(400, "payload_invalid");
}

// ── Boîtes de réception ─────────────────────────────────────────────────

async function boite(c: CtxMsg, cle: string, avecLiens: boolean, toutes = false, statut: string | null = null): Promise<Reponse> {
  const secret = secretAppels(c.env)!;
  const alertes = statut === "ALERTES";
  const convs = (await c.msg.lister({ cle: toutes ? undefined : cle, statut: !alertes && statut && /^[A-Z]{5,10}$/.test(statut) ? statut : undefined, limite: alertes ? 500 : 200 }))
    .filter((x) => !alertes || aDesAlertes(x));
  const derniers = await c.msg.derniers(convs.map((x) => x.id));
  const nl = await c.msg.nonLus(convs.flatMap((x) => { const p = x.participants.find((y) => y.cle === cle); return p ? [{ conversationId: x.id, participantId: p.id, luJusqua: p.luJusqua }] : []; }));
  const l = [];
  for (const x of convs) {
    const p = x.participants.find((y) => y.cle === cle) ?? null;
    l.push({
      ...resumeConversation(x, p?.id ?? null, derniers.get(x.id) ?? null, nl.get(x.id) ?? 0),
      ...(avecLiens && p ? { jeton: await jetonFil(secret, x.id, p.id, p.sel) } : {}),
      ...(toutes ? { participe: !!p, signale: x.statut === "SIGNALEE" } : {}),
    });
  }
  return ok({ conversations: l });
}

// ── Red flag : tentatives de contact direct ────────────────────────────

const libellesTypes: Record<TypeCoordonnee, string> = { telephone: "téléphone", email: "e-mail", lien: "lien", messagerie: "messagerie / réseau" };

/**
 * Compte une tentative pour ce participant (horodatage + types, jamais la
 * coordonnée) ; prévient le cabinet à la première et à la suspension.
 */
async function signalerTentative(c: CtxMsg, convId: string, p: ParticipantConv, types: TypeCoordonnee[]) {
  let res = { premiere: false, suspendu: false, nombre: 0 }, dejaSuspendu = false;
  const conv = await majConversation(c, convId, (v) => { dejaSuspendu = !!v.alertes?.[p.id]?.suspendu; res = enregistrerTentative(v, p.id, types, c.maintenant); });
  if (conv && (res.premiere || res.suspendu)) {
    const to = (c.env.LEAD_NOTIFY_TO || "").split(",").map((y) => y.trim()).filter(Boolean);
    const quoi = types.map((t) => libellesTypes[t]).join(", ");
    const titre = res.suspendu
      ? `Contact direct : ${p.nom} suspendu (${res.nombre} tentatives en 7 jours)`
      : `Tentative de contact direct : ${p.nom} (${quoi})`;
    const lien = `${origine(c.env).replace("://", "://admin.")}/cc/messages`;
    const texte = [
      `${p.nom} a tenté de transmettre des coordonnées (${quoi}) dans la conversation ${conv.id}${conv.sujet ? ` (« ${conv.sujet} »)` : ""}.`,
      "Le message a été envoyé MASQUÉ : la coordonnée n'a pas été transmise ni conservée.",
      res.suspendu ? `Seuil atteint (${SEUIL_SUSPENSION} en 7 jours) : fil signalé et écriture suspendue pour cette personne jusqu'à votre décision.` : `À ${SEUIL_SUSPENSION} tentatives en 7 jours, l'écriture sera suspendue automatiquement.`,
      "", `Décider : ${lien} (filtre « Tentatives de contact direct »)`,
    ].join("\n");
    if (to.length) await c.envoyer({ to, subject: titre, text: texte, html: texte.split("\n").map((l) => `<p>${echapper(l)}</p>`).join("") }).catch(() => false);
  }
  return { ...res, dejaSuspendu };
}

/** Compteur pour le menu du back-office. */
async function compteAlertes(c: CtxMsg): Promise<Reponse> {
  const l = (await c.msg.lister({ limite: 500 })).filter(aDesAlertes);
  return ok({ fils: l.length, suspendus: l.filter((x) => Object.values(x.alertes ?? {}).some((a) => a.suspendu)).length });
}

/** Routeur commun ; `acteur` null = porte publique (création par un visiteur, lien de fil, lien de boîte). */
export async function routeurMessages(c: CtxMsg, req: Request, acteur: ActeurConnecte | null, chemin: string[]): Promise<Reponse> {
  const m = req.method;
  if (!(await c.msg.tablesPresentes())) return indisponible();
  if (!secretAppels(c.env)) return ko(503, "messagerie_non_configuree");
  const actions = async (x: AccesFil, action: string | undefined): Promise<Reponse> => {
    if (!action && m === "GET") return lireFil(c, x);
    if (m !== "POST") return ko(405, "methode");
    if (action === "messages") return x.p ? posterMessage(c, x.conv, x.p, (await lireJson(req) as Record<string, unknown> | null)?.texte) : ko(403, "non_participant");
    if (action === "appel") return appelDepuisFil(c, x, await lireJson(req));
    if (action === "signaler") return signaler(c, x, await lireJson(req));
    if (action === "bloquer") return bloquerFil(c, x);
    if (action === "moderer") return moderer(c, x, await lireJson(req));
    return ko(404, "route_inconnue");
  };

  if (!acteur) {
    if (!chemin.length && m === "POST") return creerFil(c, null, await lireJson(req));
    if (chemin[0] === "boite" && chemin.length === 2 && m === "GET") {
      const cle = await lireJetonBoite(secretAppels(c.env)!, chemin[1], c.maintenant);
      return cle ? boite(c, cle, true) : ko(404, "lien_invalide");
    }
    if (chemin[0] === "lien" && chemin.length >= 2) {
      const x = await filParJeton(c, chemin[1]);
      return "status" in x ? x : actions(x, chemin[2]);
    }
    return ko(404, "route_inconnue");
  }
  if (acteur.genre === "admin" && chemin[0] === "alertes" && chemin.length === 1 && m === "GET") return compteAlertes(c);
  if (!chemin.length) {
    if (m === "GET") return boite(c, cleDe(acteur), false, acteur.genre === "admin", new URL(req.url).searchParams.get("statut"));
    if (m === "POST") return creerFil(c, acteur, await lireJson(req));
    return ko(405, "methode");
  }
  const x = await filParSession(c, acteur, chemin[0]);
  return "status" in x ? x : actions(x, chemin[1]);
}

// ── Journal des appels dans le fil ──────────────────────────────────────

/** Crochet `journal` des appels : inscrit chaque étape d'un appel né d'un fil. */
export function journalAppels(msg: DepotMessagerie, maintenant: () => number) {
  return async (d: Demande, ev: string, auteurId: string | null) => {
    if (!d.conversationId) return;
    const conv = await msg.lire(d.conversationId);
    if (!conv) return;
    const auteur = d.participants.find((p) => p.id === auteurId);
    const le = new Date(maintenant()).toISOString();
    await msg.ajouterMessage({
      id: nouvelIdMessage(), conversationId: conv.id, auteurId: "systeme", auteurCle: "systeme", type: "APPEL", texte: "", masque: false, modere: false, createdAt: le,
      meta: {
        appelId: d.id, evenement: ev, par: auteur?.nom ?? null, statut: d.statut, creneau: d.creneauRetenu, creneaux: d.creneaux, dureeMin: d.dureeMin,
        participants: d.participants.map((p) => p.nom),
      },
    });
    for (let i = 0; i < 3; i++) {
      const v = await msg.lire(conv.id);
      if (!v) return;
      v.dernierMessageLe = le;
      v.updatedAt = le;
      if (await msg.enregistrer(v, v.version)) return;
    }
  };
}

export type { DepotAppels };
