/**
 * Appels vidéo sur demande : machine à états, consentement de TOUTES les
 * parties, salle et jeton seulement après confirmation et dans la fenêtre,
 * débit / blocage, confidentialité des coordonnées, notifications.
 */
import { describe, expect, it } from "vitest";
import {
  appliquer, autoriserCreation, controlerAccesSalle, creneauCommun, masquerCoordonnees, MAX_JETONS_VISIO, nouvelleDemande, statutEffectif,
  validerCreation, verifierDebit, vueParticipant, type Demande, type EntreeCreation, type Identite,
} from "../../../../../functions/_lib/appels";
import { depotAppelsMemoire } from "../../../../../functions/_lib/appelsDepot";
import { composer, numeroWhatsApp } from "../../../../../functions/_lib/appelsNotif";
import { deriverJeton, empreinte, routeur, type ActeurConnecte, type Ctx, type Resolveur } from "../../../../../functions/_lib/appelsService";

// Lundi 12 octobre 2026, 09:00 au Maroc (UTC+1).
const T0 = Date.parse("2026-10-12T08:00:00Z");
const H = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const C1 = iso(T0 + 24 * H), C2 = iso(T0 + 26 * H), C3 = iso(T0 + 48 * H);

const ident = (cle: string, nom: string, extra: Partial<Identite> = {}): Identite => ({ type: "client", cle, nom, email: null, telephone: null, langue: "fr", ...extra });
let n = 0;
const avecLien = (x: Identite) => ({ ...x, id: `app_test${(++n).toString().padStart(4, "0")}`, sel: "sel", jetonHash: `h${n}` });

function demande(invites: Identite[], e: Partial<EntreeCreation> = {}, maintenant = T0): Demande {
  const entree: EntreeCreation = {
    contexte: "cercles", objetId: "menuiserie-atlas", sujet: null, invites: [], creneaux: [C1, C2], desQuePossible: false,
    dureeMin: 30, message: null, messageMasque: false, audioSeul: false, ...e,
  };
  return nouvelleDemande(entree, avecLien(ident("vis:a", "Amina")), invites.map(avecLien), "apl_test000000001", maintenant);
}
const ok = <T>(r: T) => { if (!(r as { ok: boolean }).ok) throw new Error(JSON.stringify(r)); return r as Extract<T, { ok: true }>; };

describe("appels : une demande ne déclenche jamais d'appel", () => {
  it("création : EN_ATTENTE, aucune salle, aucun créneau retenu", () => {
    const d = demande([ident("frn:1", "Atlas Menuiserie")]);
    expect(d.statut).toBe("EN_ATTENTE");
    expect(d.salle).toBeNull();
    expect(d.creneauRetenu).toBeNull();
    expect(d.participants[0]).toMatchObject({ role: "DEMANDEUR", statut: "ACCEPTE", creneaux: [C1, C2] });
    expect(d.participants[1]).toMatchObject({ role: "INVITE", statut: "EN_ATTENTE", creneaux: [] });
    expect(controlerAccesSalle(d, d.participants[0].id, Date.parse(C1))).toMatchObject({ ok: false, erreur: "appel_non_confirme" });
  });

  it("CONFIRMEE seulement quand l'invité accepte un créneau du demandeur ; la salle naît à ce moment", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    const r = ok(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C2] }, T0));
    expect(r.evenement).toBe("confirmee");
    expect(r.demande.statut).toBe("CONFIRMEE");
    expect(r.demande.creneauRetenu).toBe(C2);
    expect(r.demande.salle).toMatch(/^cercles-[a-z0-9]{24}$/);
    expect(d.salle).toBeNull(); // pas de mutation de l'original
  });

  it("à trois : rien tant qu'un invité n'a pas répondu, ni sur deux créneaux différents", () => {
    const d = demande([ident("frn:1", "Atlas"), ident("admin:cabinet", "Architecte")]);
    const [, a, b] = d.participants;
    const r1 = ok(appliquer(d, a.id, { type: "accepter", creneaux: [C1] }, T0));
    expect(r1.demande.statut).toBe("EN_ATTENTE");
    expect(r1.demande.salle).toBeNull();
    const r2 = ok(appliquer(r1.demande, b.id, { type: "accepter", creneaux: [C2] }, T0));
    expect(r2.demande.statut).toBe("EN_ATTENTE");
    expect(r2.demande.salle).toBeNull();
    const r3 = ok(appliquer(r2.demande, b.id, { type: "accepter", creneaux: [C1] }, T0));
    expect(r3.demande.statut).toBe("CONFIRMEE");
    expect(r3.demande.creneauRetenu).toBe(C1);
  });

  it("contre-proposition : le demandeur doit à son tour accepter le nouveau créneau", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    const r1 = ok(appliquer(d, d.participants[1].id, { type: "contre", creneaux: [C3] }, T0));
    expect(r1.evenement).toBe("contre");
    expect(r1.demande.statut).toBe("EN_ATTENTE");
    expect(r1.demande.participants[1].statut).toBe("CONTRE_PROPOSITION");
    expect(r1.demande.creneaux).toEqual([C1, C2, C3]);
    expect(creneauCommun(r1.demande, T0)).toBeNull();
    const r2 = ok(appliquer(r1.demande, r1.demande.participants[0].id, { type: "accepter", creneaux: [C3] }, T0));
    expect(r2.demande.statut).toBe("CONFIRMEE");
    expect(r2.demande.creneauRetenu).toBe(C3);
  });

  it("accepter un créneau jamais proposé est refusé", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    expect(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C3] }, T0)).toMatchObject({ ok: false, erreur: "creneau_non_propose" });
  });

  it("refus : REFUSEE, pas de salle, plus aucune réponse possible", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    const r = ok(appliquer(d, d.participants[1].id, { type: "refuser" }, T0));
    expect(r.demande.statut).toBe("REFUSEE");
    expect(r.demande.salle).toBeNull();
    expect(appliquer(r.demande, d.participants[1].id, { type: "accepter", creneaux: [C1] }, T0)).toMatchObject({ ok: false, status: 409 });
  });

  it("annulation possible à tout moment, même confirmée : la salle devient injoignable", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    const c = ok(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C1] }, T0)).demande;
    const a = ok(appliquer(c, c.participants[1].id, { type: "annuler" }, T0 + H)).demande;
    expect(a.statut).toBe("ANNULEE");
    expect(controlerAccesSalle(a, a.participants[0].id, Date.parse(C1))).toMatchObject({ ok: false, erreur: "appel_non_confirme" });
  });

  it("expiration : sans réponse, la demande expire après son dernier créneau", () => {
    const d = demande([ident("frn:1", "Atlas")]);
    expect(statutEffectif(d, Date.parse(C2) + 10 * 60_000)).toBe("EXPIREE");
    expect(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C2] }, Date.parse(C2) + 10 * 60_000)).toMatchObject({ ok: false, status: 409 });
  });

  it("« dès que possible » : l'invité propose « maintenant », confirmé ; au-delà de 72 h, non", () => {
    const d = demande([ident("frn:1", "Atlas")], { creneaux: [], desQuePossible: true });
    expect(d.participants[0].toutCreneau).toBe(true);
    const maintenant = T0 + H;
    const r = ok(appliquer(d, d.participants[1].id, { type: "contre", creneaux: [iso(maintenant)] }, maintenant));
    expect(r.demande.statut).toBe("CONFIRMEE");
    const loin = demande([ident("frn:1", "Atlas")], { creneaux: [], desQuePossible: true });
    const r2 = ok(appliquer(loin, loin.participants[1].id, { type: "contre", creneaux: [iso(T0 + 80 * H)] }, T0));
    expect(r2.demande.statut).toBe("EN_ATTENTE");
  });
});

describe("appels : accès à la salle", () => {
  const confirmee = () => {
    const d = demande([ident("frn:1", "Atlas")]);
    return ok(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C1] }, T0)).demande;
  };
  it("fenêtre : de début − 10 min à début + 2 h", () => {
    const d = confirmee(), p = d.participants[1].id, debut = Date.parse(C1);
    expect(controlerAccesSalle(d, p, debut - 11 * 60_000)).toMatchObject({ ok: false, erreur: "trop_tot" });
    expect(controlerAccesSalle(d, p, debut - 10 * 60_000).ok).toBe(true);
    expect(controlerAccesSalle(d, p, debut + 2 * H).ok).toBe(true);
    expect(controlerAccesSalle(d, p, debut + 2 * H + 1).ok).toBe(false);
  });
  it("jamais à un tiers ; lien à usage limité", () => {
    const d = confirmee();
    expect(controlerAccesSalle(d, "app_inconnu00", Date.parse(C1))).toMatchObject({ ok: false, erreur: "interdit" });
    d.participants[1].jetonsVisio = MAX_JETONS_VISIO;
    expect(controlerAccesSalle(d, d.participants[1].id, Date.parse(C1))).toMatchObject({ ok: false, erreur: "limite_atteinte" });
  });
});

describe("appels : règles d'invitation, débit, coordonnées", () => {
  const e = (contexte: EntreeCreation["contexte"], invites: EntreeCreation["invites"]) => ({ contexte, invites });
  it("qui peut inviter qui", () => {
    expect(autoriserCreation("public", e("cercles", [{ type: "pro", slug: "atlas" }])).ok).toBe(true);
    expect(autoriserCreation("public", e("cercles", [{ type: "pro", id: "frn_1" }]))).toMatchObject({ erreur: "invite_interdit" });
    expect(autoriserCreation("public", e("cercles", [{ type: "client", dossierId: "d1" }]))).toMatchObject({ erreur: "invite_interdit" });
    expect(autoriserCreation("public", e("dossier", [{ type: "admin" }]))).toMatchObject({ erreur: "contexte_interdit" });
    expect(autoriserCreation("pro", e("cercles", [{ type: "client", dossierId: "d1" }]))).toMatchObject({ erreur: "invite_interdit" });
    expect(autoriserCreation("membre", e("chantier", [{ type: "membre", id: "pm_1" }])).ok).toBe(true);
    expect(autoriserCreation("admin", e("dossier", [{ type: "client", dossierId: "d1" }])).ok).toBe(true);
    expect(autoriserCreation("admin", e("dossier", [{ type: "admin" }]))).toMatchObject({ erreur: "invite_interdit" });
  });
  it("débit par demandeur, par paire, par destinataire ; blocage silencieux", () => {
    const k = { demandeur24h: 0, paires7j: [0], paireEnAttente: [false], recues24h: [0], bloque: [false] };
    expect(verifierDebit("vis:a", ["frn:1"], k).ok).toBe(true);
    expect(verifierDebit("vis:a", ["frn:1"], { ...k, demandeur24h: 5 })).toMatchObject({ status: 429, erreur: "trop_de_demandes" });
    expect(verifierDebit("vis:a", ["frn:1"], { ...k, paireEnAttente: [true] })).toMatchObject({ erreur: "demande_deja_en_attente" });
    expect(verifierDebit("vis:a", ["frn:1"], { ...k, paires7j: [3] })).toMatchObject({ erreur: "trop_de_demandes_destinataire" });
    expect(verifierDebit("vis:a", ["frn:1"], { ...k, recues24h: [20] })).toMatchObject({ erreur: "destinataire_sature" });
    expect(verifierDebit("vis:a", ["frn:1"], { ...k, bloque: [true] })).toMatchObject({ status: 403, erreur: "destinataire_indisponible" });
  });
  it("masque e-mails, téléphones et liens, garde montants et dates", () => {
    const m = masquerCoordonnees("Appelez-moi au 06 61 23 45 67 ou +33 6 12 34 56 78, écrivez à a.b@gmail.com, voir wa.me/212600000000 et www.exemple.ma — budget 15 000 000 DH, le 2026-10-13");
    expect(m.masque).toBe(true);
    expect(m.texte).not.toMatch(/61 23|12 34|gmail|wa\.me|exemple/);
    expect(m.texte).toContain("15 000 000 DH");
    expect(m.texte).toContain("2026-10-13");
  });
  it("validation : 1 à 3 créneaux futurs, durée connue, message masqué", () => {
    const base = { contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }] };
    expect(validerCreation({ ...base, creneaux: [] }, T0)).toMatchObject({ ok: false });
    expect(validerCreation({ ...base, creneaux: [C1, C2, C3, iso(T0 + 50 * H)] }, T0)).toMatchObject({ ok: false });
    expect(validerCreation({ ...base, creneaux: [iso(T0 - H)] }, T0)).toMatchObject({ ok: false, erreur: "creneau_invalide" });
    expect(validerCreation({ ...base, creneaux: [C1], dureeMin: 37 }, T0)).toMatchObject({ ok: false, erreur: "duree_invalide" });
    const v = validerCreation({ ...base, creneaux: [C1], message: "mon mail x@y.com" }, T0) as EntreeCreation;
    expect(v.message).toBe("mon mail [coordonnées masquées]");
    expect(v.messageMasque).toBe(true);
  });
  it("vue d'un participant : aucune coordonnée, aucun secret, aucun nom de salle", () => {
    const d = demande([ident("frn:1", "Atlas", { email: "pro@atlas.ma", telephone: "+212661234567" })]);
    d.participants[0].email = "amina@gmail.com";
    const c = ok(appliquer(d, d.participants[1].id, { type: "accepter", creneaux: [C1] }, T0)).demande;
    const texte = JSON.stringify(vueParticipant(c, c.participants[0].id, T0));
    for (const secret of ["pro@atlas.ma", "+212661234567", "amina@gmail.com", c.participants[1].jetonHash, `"sel"`, c.salle!]) expect(texte).not.toContain(secret);
  });
  it("numéro WhatsApp : marocain en 212…, international sans +", () => {
    expect(numeroWhatsApp("0661234567")).toBe("212661234567");
    expect(numeroWhatsApp("+33612345678")).toBe("33612345678");
    expect(numeroWhatsApp(null)).toBeNull();
  });
  it("notification : liens Accepter / Proposer / Refuser, en arabe aussi, sans coordonnées", () => {
    const d = demande([ident("frn:1", "Atlas", { email: "pro@atlas.ma", langue: "ar" })]);
    d.participants[0].telephone = "+212661234567";
    const m = composer("demande", d, d.participants[1], d.participants[0], "https://citurbarea.com/ar/appel/JETON");
    expect(m.text).toContain("?action=accepter");
    expect(m.text).toContain("?action=contre");
    expect(m.text).toContain("?action=refuser");
    expect(m.html).toContain('dir="rtl"');
    expect(m.text + m.html).not.toContain("661234567");
  });
});

// ── Parcours complet par les routes, avec dépôt en mémoire ──────────────

async function paireRsa() {
  const k = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", k.privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
}

const PROS: Record<string, Identite> = {
  atlas: ident("frn:frn_atlas", "Atlas Menuiserie", { type: "pro", email: "contact@atlas.ma", telephone: "+212661234567" }),
  rif: ident("frn:frn_rif", "Rif Carrelage", { type: "pro", email: "rif@rif.ma" }),
};
const resolveur: Resolveur = {
  acteur: async (a) => (a.genre === "admin" ? ident("admin:cabinet", "Architecte CITURBAREA", { type: "admin" }) : a.genre === "pro" ? Object.values(PROS).find((p) => p.cle === `frn:${a.fournisseurId}`) ?? null : null),
  invite: async (i) => (i.type === "admin" ? ident("admin:cabinet", "Architecte CITURBAREA", { type: "admin" }) : i.type === "pro" && i.slug && PROS[i.slug] ? PROS[i.slug] : { ok: false, status: 404, erreur: "invite_introuvable" }),
};

function banc(env: Record<string, string> = {}) {
  const depot = depotAppelsMemoire();
  const mails: { to: string[]; subject: string; text: string }[] = [];
  const c: Ctx = {
    depot, resolveur, maintenant: T0,
    env: { APPELS_SECRET: "s".repeat(40), PUBLIC_WEB_URL: "https://citurbarea.com", LEAD_NOTIFY_TO: "cabinet@citurbarea.com", ...env },
    envoyer: async (m) => { mails.push(m); return true; },
  };
  const appel = async (methode: string, acteur: ActeurConnecte | null, chemin: string[], corps?: unknown) =>
    routeur(c, new Request("https://citurbarea.com/api/x", { method: methode, ...(corps ? { body: JSON.stringify(corps), headers: { "content-type": "application/json" } } : {}) }), acteur, chemin);
  return { c, depot, mails, appel };
}
const ATLAS: ActeurConnecte = { genre: "pro", fournisseurId: "frn_atlas" };
const RIF: ActeurConnecte = { genre: "pro", fournisseurId: "frn_rif" };
const ADMIN: ActeurConnecte = { genre: "admin", email: "yassine@citurbarea.com" };
const visiteur = (extra: Record<string, unknown> = {}) => ({
  contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], creneaux: [C1, C2], message: "Bonjour, pour une porte d'entrée",
  demandeur: { nom: "Amina", email: "amina@gmail.com", langue: "fr" }, consentement: true, ...extra,
});

describe("appels : parcours demande → accord des deux parties → appel", () => {
  it("visiteur → pro : rien ne s'ouvre avant l'accord, puis jeton seulement dans la fenêtre et seulement aux participants", async () => {
    const { c, depot, mails, appel } = banc({ JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "cle01", JAAS_PRIVATE_KEY_PEM: await paireRsa() });
    const r = await appel("POST", null, [], visiteur());
    expect(r.status).toBe(201);
    const jeton = String(r.json.jeton);
    expect(jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const id = (r.json.demande as { id: string }).id;
    expect(depot.lignes.get(id)!.salle).toBeNull();
    // Le pro est prévenu (avec SON lien, différent) ; le visiteur reçoit un accusé.
    expect(mails.map((m) => m.to[0]).sort()).toEqual(["amina@gmail.com", "contact@atlas.ma"]);
    const auPro = mails.find((m) => m.to[0] === "contact@atlas.ma")!;
    expect(auPro.text).not.toContain(jeton);
    expect(auPro.text).not.toContain("amina@gmail.com");

    // Avant l'accord : aucun jeton de salle, ni pour le demandeur, ni pour le pro.
    c.maintenant = Date.parse(C1);
    expect((await appel("POST", null, ["lien", jeton, "visio"])).json.error).toBe("appel_non_confirme");
    expect((await appel("POST", ATLAS, [id, "visio"])).json.error).toBe("appel_non_confirme");

    // Un autre pro ne voit même pas la demande ; le back-office la voit mais n'y entre pas.
    expect((await appel("GET", RIF, [id])).status).toBe(404);
    c.maintenant = T0;
    // Le pro accepte depuis son espace → CONFIRMEE.
    const acc = await appel("POST", ATLAS, [id, "repondre"], { action: "accepter", creneaux: [C2] });
    expect(acc.json.evenement).toBe("confirmee");
    expect(depot.lignes.get(id)!.salle).toMatch(/^cercles-/);
    expect(mails.filter((m) => /confirmé/.test(m.subject))).toHaveLength(2);

    // Trop tôt, puis dans la fenêtre.
    c.maintenant = Date.parse(C2) - 30 * 60_000;
    expect((await appel("POST", null, ["lien", jeton, "visio"])).json.error).toBe("trop_tot");
    c.maintenant = Date.parse(C2) - 5 * 60_000;
    const v = await appel("POST", null, ["lien", jeton, "visio"]);
    expect(v.status).toBe(200);
    expect((v.json.config as { roomName: string }).roomName).toBe(`vpaas-magic-cookie-test/${depot.lignes.get(id)!.salle}`);
    expect((await appel("POST", ATLAS, [id, "visio"])).status).toBe(200);
    expect((await appel("POST", ADMIN, [id, "visio"])).json.error).toBe("non_participant");
    expect((await appel("POST", null, ["lien", "x".repeat(43), "visio"])).status).toBe(404);
    c.maintenant = Date.parse(C2) + 3 * H;
    expect((await appel("POST", null, ["lien", jeton, "visio"])).json.error).toBe("termine");
  });

  it("refus du pro : la demande est close, aucune salle", async () => {
    const { depot, appel } = banc();
    const r = await appel("POST", null, [], visiteur());
    const id = (r.json.demande as { id: string }).id;
    expect((await appel("POST", ATLAS, [id, "repondre"], { action: "refuser" })).json.evenement).toBe("refusee");
    expect(depot.lignes.get(id)).toMatchObject({ statut: "REFUSEE", salle: null });
  });

  it("anti-harcèlement : une seule demande en attente par paire, 5 par jour, blocage", async () => {
    const { depot, appel } = banc();
    const r = await appel("POST", null, [], visiteur());
    expect((await appel("POST", null, [], visiteur())).json.error).toBe("demande_deja_en_attente");
    const id = (r.json.demande as { id: string }).id;
    // Le pro bloque : la demande en cours est déclinée et les suivantes refusées sans le dire.
    expect((await appel("POST", ATLAS, [id, "bloquer"])).json.bloque).toBe(true);
    expect(depot.lignes.get(id)!.statut).toBe("REFUSEE");
    const bloquee = await appel("POST", null, [], visiteur());
    expect(bloquee.status).toBe(403);
    expect(bloquee.json.error).toBe("destinataire_indisponible");
    // Débit : 5 demandes par 24 h et par demandeur.
    const b2 = banc();
    for (let i = 0; i < 5; i++) {
      const x = await b2.appel("POST", null, [], visiteur({ invites: [{ type: i % 2 ? "pro" : "admin", ...(i % 2 ? { slug: "rif" } : {}) }], creneaux: [iso(T0 + (30 + i) * H)] }));
      if (x.status === 201) b2.depot.lignes.forEach((d) => { d.statut = "REFUSEE"; });
    }
    expect((await b2.appel("POST", null, [], visiteur())).json.error).toBe("trop_de_demandes");
  });

  it("visiteur : contact et consentement requis ; pot de miel ; pas d'invitation d'un client", async () => {
    const { depot, appel } = banc();
    expect((await appel("POST", null, [], visiteur({ demandeur: { nom: "Amina" } }))).json.error).toBe("contact_requis");
    expect((await appel("POST", null, [], visiteur({ consentement: false }))).json.error).toBe("consentement_requis");
    expect((await appel("POST", null, [], visiteur({ website: "spam" }))).status).toBe(202);
    expect(depot.lignes.size).toBe(0);
    expect((await appel("POST", null, [], visiteur({ invites: [{ type: "client", dossierId: "d1" }] }))).json.error).toBe("invite_interdit");
  });

  it("lien personnel : dérivé, seule l'empreinte est stockée", async () => {
    const { depot, appel } = banc();
    const r = await appel("POST", null, [], visiteur());
    const d = [...depot.lignes.values()][0];
    const p = d.participants[0];
    const jeton = await deriverJeton("s".repeat(40), d.id, p.id, p.sel);
    expect(jeton).toBe(r.json.jeton);
    expect(p.jetonHash).toBe(await empreinte(jeton));
    expect(JSON.stringify(d)).not.toContain(jeton);
    const vue = await appel("GET", null, ["lien", jeton]);
    expect((vue.json.demande as { moi: { role: string } }).moi.role).toBe("DEMANDEUR");
  });

  it("sans secret configuré : fermé (503)", async () => {
    const { appel } = banc({ APPELS_SECRET: "" });
    expect((await appel("POST", null, [], visiteur())).status).toBe(503);
  });

  it("rappels : une seule fois, à chaque participant", async () => {
    const { c, mails, appel } = banc();
    const r = await appel("POST", null, [], visiteur());
    const id = (r.json.demande as { id: string }).id;
    await appel("POST", ATLAS, [id, "repondre"], { action: "accepter", creneaux: [C1] });
    mails.length = 0;
    c.maintenant = Date.parse(C1) - 30 * 60_000;
    expect((await appel("POST", ADMIN, ["rappels"])).json.rappels).toBe(1);
    expect((await appel("POST", ADMIN, ["rappels"])).json.rappels).toBe(0);
    expect(mails.map((m) => m.to[0]).sort()).toEqual(["amina@gmail.com", "contact@atlas.ma"]);
    expect((await appel("POST", null, ["rappels"])).status).toBe(403);
  });
});
