/**
 * Messagerie (tout passe par CITURBAREA) : parcours visiteur ↔ pro, aucune
 * coordonnée transmise, débit, blocage partagé avec les appels, appel vidéo
 * demandé depuis le fil (étapes inscrites dans le fil), signalement,
 * modération, boîte de réception par lien signé.
 */
import { describe, expect, it } from "vitest";
import { MASQUE, masquerCoordonnees, type Identite } from "../../../../../functions/_lib/appels";
import { depotAppelsMemoire } from "../../../../../functions/_lib/appelsDepot";
import { routeur as routeurAppels, type ActeurConnecte, type Resolveur } from "../../../../../functions/_lib/appelsService";
import { jetonBoite } from "../../../../../functions/_lib/messagerie";
import { depotMessagerieMemoire } from "../../../../../functions/_lib/messagerieDepot";
import { journalAppels, routeurMessages, type CtxMsg } from "../../../../../functions/_lib/messagerieService";

const T0 = Date.parse("2026-10-12T08:00:00Z");
const H = 3600_000;
const C1 = new Date(T0 + 24 * H).toISOString();
const ident = (cle: string, nom: string, extra: Partial<Identite> = {}): Identite => ({ type: "client", cle, nom, email: null, telephone: null, langue: "fr", ...extra });
const PROS: Record<string, Identite> = {
  atlas: ident("frn:frn_atlas", "Atlas Menuiserie", { type: "pro", email: "contact@atlas.ma", telephone: "+212661234567" }),
  rif: ident("frn:frn_rif", "Rif Carrelage", { type: "pro", email: "rif@rif.ma" }),
};
const CABINET = ident("admin:cabinet", "Architecte CITURBAREA", { type: "admin" });
const resolveur: Resolveur = {
  acteur: async (a) => (a.genre === "admin" ? CABINET : a.genre === "pro" ? Object.values(PROS).find((p) => p.cle === `frn:${a.fournisseurId}`) ?? null : null),
  invite: async (i) => (i.type === "admin" ? CABINET : i.type === "pro" && i.slug && PROS[i.slug] ? PROS[i.slug] : { ok: false, status: 404, erreur: "invite_introuvable" }),
};
const ATLAS: ActeurConnecte = { genre: "pro", fournisseurId: "frn_atlas" };
const RIF: ActeurConnecte = { genre: "pro", fournisseurId: "frn_rif" };
const ADMIN: ActeurConnecte = { genre: "admin", email: "yassine@citurbarea.com" };
const SECRET = "s".repeat(40);

function banc() {
  const depot = depotAppelsMemoire();
  const msg = depotMessagerieMemoire();
  // Une seule table de blocages en production ("BlocageAppel") : même chose ici.
  msg.bloque = depot.bloque;
  msg.bloquer = depot.bloquer;
  const mails: { to: string[]; subject: string; text: string; html?: string }[] = [];
  const c: CtxMsg = {
    depot, msg, resolveur, maintenant: T0,
    env: { APPELS_SECRET: SECRET, PUBLIC_WEB_URL: "https://citurbarea.com", LEAD_NOTIFY_TO: "cabinet@citurbarea.com" },
    envoyer: async (m) => { mails.push(m); return true; },
  };
  c.journal = journalAppels(msg, () => c.maintenant);
  const req = (methode: string, corps?: unknown) => new Request("https://citurbarea.com/api/x", { method: methode, ...(corps ? { body: JSON.stringify(corps), headers: { "content-type": "application/json" } } : {}) });
  const messages = (methode: string, acteur: ActeurConnecte | null, chemin: string[], corps?: unknown) => routeurMessages(c, req(methode, corps), acteur, chemin);
  const appels = (methode: string, acteur: ActeurConnecte | null, chemin: string[], corps?: unknown) => routeurAppels(c, req(methode, corps), acteur, chemin);
  return { c, depot, msg, mails, messages, appels };
}
const premier = (extra: Record<string, unknown> = {}) => ({
  contexte: "cercles", objetId: "atlas", sujet: "Porte d'entrée", invites: [{ type: "pro", slug: "atlas" }],
  texte: "Bonjour, je cherche une porte en bois. Mon numéro : 06 61 23 45 67, mail amina@gmail.com",
  demandeur: { nom: "Amina", email: "amina@gmail.com", telephone: "0661234567", langue: "fr" }, consentement: true, ...extra,
});
const INTERDIT = /amina@gmail|0661234567|61 23 45 67|contact@atlas\.ma|661234567|jetonHash|"sel"/;

describe("messagerie : client ↔ pro, tout passe par CITURBAREA", () => {
  it("premier message d'un visiteur : fil créé, coordonnées masquées, pro prévenu sans coordonnées", async () => {
    const { mails, messages } = banc();
    const r = await messages("POST", null, [], premier());
    expect(r.status).toBe(201);
    expect(r.json.messageMasque).toBe(true);
    expect(String(r.json.jeton)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(String(r.json.lienBoite)).toContain("/messages/boite/");
    const auPro = mails.find((m) => m.to[0] === "contact@atlas.ma")!;
    expect(auPro.subject).toContain("Amina");
    expect(auPro.text + auPro.html).not.toMatch(INTERDIT);
    expect(auPro.text).toContain(MASQUE);
  });

  it("le pro lit (non lu → lu), répond ; le visiteur voit le fil ; aucune coordonnée dans les vues", async () => {
    const { mails, messages } = banc();
    const r = await messages("POST", null, [], premier());
    const id = (r.json.conversation as { id: string }).id;
    const boitePro = await messages("GET", ATLAS, []);
    expect((boitePro.json.conversations as { nonLus: number }[])[0].nonLus).toBe(1);
    const fil = await messages("GET", ATLAS, [id]);
    expect(JSON.stringify(fil.json)).not.toMatch(INTERDIT);
    expect(((await messages("GET", ATLAS, [])).json.conversations as { nonLus: number }[])[0].nonLus).toBe(0);
    mails.length = 0;
    expect((await messages("POST", ATLAS, [id, "messages"], { texte: "Bonjour Amina, appelez-moi au +212 661 23 45 67 ou sur wa.me/212661234567" })).status).toBe(201);
    const auVisiteur = mails.find((m) => m.to[0] === "amina@gmail.com")!;
    expect(auVisiteur.text + auVisiteur.html).not.toMatch(INTERDIT);
    const vueVisiteur = await messages("GET", null, ["lien", String(r.json.jeton)]);
    expect((vueVisiteur.json.messages as unknown[]).length).toBe(2);
    expect(JSON.stringify(vueVisiteur.json)).not.toMatch(INTERDIT);
    expect(JSON.stringify(vueVisiteur.json)).not.toMatch(/wa\.me|frn_atlas/);
  });

  it("un tiers ne voit rien ; le cabinet modère (lecture, coordonnées) sans pouvoir écrire s'il n'est pas invité", async () => {
    const { messages } = banc();
    const r = await messages("POST", null, [], premier());
    const id = (r.json.conversation as { id: string }).id;
    expect((await messages("GET", RIF, [id])).status).toBe(404);
    const admin = await messages("GET", ADMIN, [id]);
    expect(admin.status).toBe(200);
    expect(JSON.stringify(admin.json)).toContain("contact@atlas.ma");
    expect((await messages("POST", ADMIN, [id, "messages"], { texte: "test" })).json.error).toBe("non_participant");
    const msgId = (admin.json.messages as { id: string }[])[0].id;
    expect((await messages("POST", ADMIN, [id, "moderer"], { messageId: msgId, modere: true })).status).toBe(200);
    const apres = await messages("GET", ATLAS, [id]);
    expect((apres.json.messages as { texte: string }[])[0].texte).toBe("[message retiré par la modération]");
  });

  it("un seul fil ouvert par paire : sans session, rien n'est révélé, le lien part à l'adresse du titulaire", async () => {
    const { mails, messages } = banc();
    await messages("POST", null, [], premier());
    mails.length = 0;
    const r2 = await messages("POST", null, [], premier());
    expect(r2.status).toBe(409);
    expect(r2.json.error).toBe("conversation_existante");
    expect(JSON.stringify(r2.json)).not.toMatch(/jeton|conversation"/);
    expect(mails.map((m) => m.to[0])).toEqual(["amina@gmail.com"]);
  });

  it("notifications : au plus une par quart d'heure et par fil tant que rien n'est lu", async () => {
    const { c, mails, messages } = banc();
    const r = await messages("POST", null, [], premier());
    const jeton = String(r.json.jeton);
    const avant = mails.filter((m) => m.to[0] === "contact@atlas.ma").length;
    c.maintenant = T0 + 60_000;
    await messages("POST", null, ["lien", jeton, "messages"], { texte: "Vous êtes là ?" });
    expect(mails.filter((m) => m.to[0] === "contact@atlas.ma").length).toBe(avant);
    c.maintenant = T0 + 20 * 60_000;
    await messages("POST", null, ["lien", jeton, "messages"], { texte: "Je relance" });
    expect(mails.filter((m) => m.to[0] === "contact@atlas.ma").length).toBe(avant + 1);
  });

  it("débit : 30 messages en 10 min au plus", async () => {
    const { messages } = banc();
    const r = await messages("POST", null, [], premier());
    const jeton = String(r.json.jeton);
    let dernier = 0;
    for (let i = 0; i < 31; i++) dernier = (await messages("POST", null, ["lien", jeton, "messages"], { texte: `m${i}` })).status;
    expect(dernier).toBe(429);
  });

  it("blocage partagé : le pro bloque, plus de message NI de demande d'appel du visiteur", async () => {
    const { messages, appels } = banc();
    const r = await messages("POST", null, [], premier());
    const id = (r.json.conversation as { id: string }).id;
    expect((await messages("POST", ATLAS, [id, "bloquer"])).json.bloque).toBe(true);
    expect((await messages("POST", null, ["lien", String(r.json.jeton), "messages"], { texte: "?" })).json.error).toBe("destinataire_indisponible");
    const appel = await appels("POST", null, [], { contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], creneaux: [C1], demandeur: { nom: "Amina", email: "amina@gmail.com" }, consentement: true });
    expect(appel.json.error).toBe("destinataire_indisponible");
  });

  it("appel vidéo depuis le fil : demande, acceptation et confirmation inscrites dans le fil", async () => {
    const { messages, appels } = banc();
    const r = await messages("POST", null, [], premier());
    const jeton = String(r.json.jeton);
    const id = (r.json.conversation as { id: string }).id;
    const a = await messages("POST", null, ["lien", jeton, "appel"], { creneaux: [C1], dureeMin: 30 });
    expect(a.status).toBe(201);
    const appelId = String(a.json.appelId);
    expect((await appels("POST", ATLAS, [appelId, "repondre"], { action: "accepter", creneaux: [C1] })).json.evenement).toBe("confirmee");
    const fil = await messages("GET", null, ["lien", jeton]);
    const evts = (fil.json.messages as { type: string; meta: { evenement: string } }[]).filter((m) => m.type === "APPEL").map((m) => m.meta.evenement);
    expect(evts[0]).toBe("demande");
    expect(evts).toContain("confirmee");
    const ap = (fil.json.appels as { id: string; vue: { statut: string }; jetonAppel?: string }[])[0];
    expect(ap.vue.statut).toBe("CONFIRMEE");
    expect(ap.jetonAppel).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(fil.json)).not.toMatch(INTERDIT);
    expect((await messages("GET", ATLAS, [id])).status).toBe(200);
  });

  it("signalement : fil SIGNALE, cabinet prévenu ; boîte par lien signé ; faux lien refusé", async () => {
    const { mails, messages } = banc();
    const r = await messages("POST", null, [], premier());
    const id = (r.json.conversation as { id: string }).id;
    expect((await messages("POST", ATLAS, [id, "signaler"], { motif: "Démarchage, voir 0612345678" })).json.signale).toBe(true);
    const alerte = mails.find((m) => m.to[0] === "cabinet@citurbarea.com" && /signalée/.test(m.subject))!;
    expect(alerte.text).not.toContain("0612345678");
    expect(((await messages("GET", ADMIN, [])).json.conversations as { signale: boolean }[])[0].signale).toBe(true);
    const boite = await messages("GET", null, ["boite", String(r.json.boite)]);
    expect((boite.json.conversations as { jeton: string }[])[0].jeton).toBe(r.json.jeton);
    const faux = await jetonBoite("x".repeat(40), "vis:quelquun");
    expect((await messages("GET", null, ["boite", faux])).status).toBe(404);
  });

  it("règles : pas de fil sans texte, pas d'invitation d'un client par un visiteur, membre de projet renvoyé à la discussion du jalon", async () => {
    const { messages } = banc();
    expect((await messages("POST", null, [], premier({ texte: "  " }))).json.error).toBe("message_vide");
    expect((await messages("POST", null, [], premier({ invites: [{ type: "client", dossierId: "d1" }] }))).json.error).toBe("invite_interdit");
    expect((await messages("POST", { genre: "membre", membreId: "pm_x", projetId: "prj_x" }, [], premier())).json.error).toBe("contexte_interdit");
    expect(masquerCoordonnees("insta @amina.deco").texte).toBe(MASQUE);
  });
});
