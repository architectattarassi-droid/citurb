/**
 * Trace des appels : enregistrement seulement avec le consentement de TOUS
 * (retirable), entrées en salle, webhook JaaS signé, enregistrement conservé
 * ou non, compte rendu validé ou contesté par l'autre partie.
 */
import { describe, expect, it } from "vitest";
import type { Identite } from "../../../../../functions/_lib/appels";
import { depotAppelsMemoire } from "../../../../../functions/_lib/appelsDepot";
import { routeur, signatureJaasValide, type ActeurConnecte, type Ctx, type Resolveur } from "../../../../../functions/_lib/appelsService";

const T0 = Date.parse("2026-10-15T08:00:00Z");
const H = 3600_000;
const C1 = new Date(T0 + 24 * H).toISOString();
const ident = (cle: string, nom: string, extra: Partial<Identite> = {}): Identite => ({ type: "client", cle, nom, email: null, telephone: null, langue: "fr", ...extra });
const ATLAS = ident("frn:frn_atlas", "Atlas", { type: "pro", email: "contact@atlas.ma" });
const resolveur: Resolveur = {
  acteur: async (a) => (a.genre === "pro" ? ATLAS : a.genre === "admin" ? ident("admin:cabinet", "Architecte", { type: "admin" }) : null),
  invite: async (i) => (i.type === "pro" ? ATLAS : { ok: false, status: 404, erreur: "invite_introuvable" }),
};
const PRO: ActeurConnecte = { genre: "pro", fournisseurId: "frn_atlas" };
const SECRET_WH = "whsec_test_0123456789";

async function paireRsa() {
  const k = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", k.privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
}
const charge = (jwt: string) => JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
async function signer(corps: string, t: number) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET_WH), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `t=${t},v1=${btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${corps}`)))))}`;
}

async function banc(depose: string | null = "doc_enregistrement00000") {
  const depot = depotAppelsMemoire();
  const mails: { to: string[]; subject: string }[] = [];
  const journal: string[] = [];
  const c: Ctx = {
    depot, resolveur, maintenant: T0,
    env: { APPELS_SECRET: "s".repeat(40), PUBLIC_WEB_URL: "https://citurbarea.com", LEAD_NOTIFY_TO: "cabinet@citurbarea.com", JAAS_WEBHOOK_SECRET: SECRET_WH,
      JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "cle01", JAAS_PRIVATE_KEY_PEM: await paireRsa() },
    envoyer: async (m) => { mails.push(m); return true; },
    journal: async (_d, ev) => { journal.push(ev); },
    deposerEnregistrement: async () => depose,
  };
  const req = (m: string, corps?: unknown, entetes: Record<string, string> = {}) =>
    new Request("https://citurbarea.com/api/x", { method: m, headers: entetes, ...(corps !== undefined ? { body: typeof corps === "string" ? corps : JSON.stringify(corps) } : {}) });
  const appel = (m: string, a: ActeurConnecte | null, chemin: string[], corps?: unknown, entetes?: Record<string, string>) => routeur(c, req(m, corps, entetes), a, chemin);
  const r = await appel("POST", null, [], { contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], creneaux: [C1], demandeur: { nom: "Amina", email: "amina@gmail.com" }, consentement: true });
  const jeton = String(r.json.jeton);
  const id = (r.json.demande as { id: string }).id;
  // Un vrai journal de messagerie n'existe que pour un appel né d'un fil : on en simule un.
  depot.lignes.get(id)!.conversationId = "cnv_test0000000000";
  await appel("POST", PRO, [id, "repondre"], { action: "accepter", creneaux: [C1] });
  return { c, depot, mails, journal, appel, jeton, id };
}
const salleDe = (b: Awaited<ReturnType<typeof banc>>) => b.depot.lignes.get(b.id)!.salle!;

describe("trace des appels", () => {
  it("enregistrement : interdit tant qu'un seul participant n'a pas consenti ; retirable à tout moment", async () => {
    const b = await banc();
    b.c.maintenant = Date.parse(C1);
    const v1 = await b.appel("POST", null, ["lien", b.jeton, "visio"]);
    expect(v1.json.enregistrement).toBe(false);
    expect(charge((v1.json.config as { jwt: string }).jwt).context.features.recording).toBe(false);
    await b.appel("POST", null, ["lien", b.jeton, "enregistrement"], { accepte: true });
    expect(charge(((await b.appel("POST", null, ["lien", b.jeton, "visio"])).json.config as { jwt: string }).jwt).context.features.recording).toBe(false);
    await b.appel("POST", PRO, [b.id, "enregistrement"], { accepte: true });
    const v3 = await b.appel("POST", PRO, [b.id, "visio"]);
    expect(v3.json.enregistrement).toBe(true);
    const jeton = charge((v3.json.config as { jwt: string }).jwt);
    expect(jeton.context.features.recording).toBe(true);
    expect(jeton.context.user.moderator).toBe(true); // chacun peut l'arrêter
    await b.appel("POST", null, ["lien", b.jeton, "enregistrement"], { accepte: false });
    expect(charge(((await b.appel("POST", PRO, [b.id, "visio"])).json.config as { jwt: string }).jwt).context.features.recording).toBe(false);
    const vue = await b.appel("GET", PRO, [b.id]);
    const trace = (vue.json.demande as { trace: { entrees: unknown[]; consentements: { accepte: boolean | null }[] } }).trace;
    expect(trace.entrees).toHaveLength(4);
    expect(trace.consentements.map((x) => x.accepte)).toEqual([false, true]);
    expect(b.journal).toEqual(expect.arrayContaining(["consentement_enregistrement", "retrait_enregistrement"]));
  });

  it("webhook JaaS : signature obligatoire ; arrivées et fin de salle tracées ; durée réelle", async () => {
    const b = await banc();
    const evt = (type: string, t: number, data: Record<string, unknown> = {}) => JSON.stringify({ eventType: type, idempotencyKey: `${type}-${t}`, timestamp: t, fqn: `vpaas-magic-cookie-test/${salleDe(b)}`, data });
    const corps = evt("PARTICIPANT_JOINED", Date.parse(C1), { id: "inconnu" });
    expect((await b.appel("POST", null, ["jaas"], corps, { "x-jaas-signature": "t=1,v1=faux" })).status).toBe(401);
    b.c.maintenant = Date.parse(C1);
    const ok = await b.appel("POST", null, ["jaas"], corps, { "x-jaas-signature": await signer(corps, Math.floor(b.c.maintenant / 1000)) });
    expect(ok.status).toBe(200);
    // Doublon (même idempotencyKey) ignoré.
    await b.appel("POST", null, ["jaas"], corps, { "x-jaas-signature": await signer(corps, Math.floor(b.c.maintenant / 1000)) });
    const fin = evt("ROOM_DESTROYED", Date.parse(C1) + 42 * 60_000);
    await b.appel("POST", null, ["jaas"], fin, { "x-jaas-signature": await signer(fin, Math.floor(b.c.maintenant / 1000)) });
    const t = (await b.appel("GET", PRO, [b.id])).json.demande as { trace: { evenements: { type: string }[]; duree: { minutes: number } } };
    expect(t.trace.evenements.map((e) => e.type)).toEqual(["PARTICIPANT_JOINED", "ROOM_DESTROYED"]);
    expect(t.trace.duree.minutes).toBe(42);
    expect(b.journal).toContain("fin_salle");
    expect(await signatureJaasValide(SECRET_WH, await signer("x", 1000), "x", 1000 * 1000 + 3600_000)).toBe(false); // trop vieux
  });

  it("enregistrement reçu : conservé seulement avec le consentement de tous ; sinon jamais gardé", async () => {
    const sans = await banc();
    sans.c.maintenant = Date.parse(C1);
    const e = JSON.stringify({ eventType: "RECORDING_UPLOADED", idempotencyKey: "rec1", timestamp: Date.parse(C1), fqn: `x/${salleDe(sans)}`, data: { preAuthenticatedLink: "https://8x8.example/rec.mp4", durationSec: 600 } });
    await sans.appel("POST", null, ["jaas"], e, { "x-jaas-signature": await signer(e, Math.floor(sans.c.maintenant / 1000)) });
    expect(sans.depot.lignes.get(sans.id)!.trace!.enregistrement).toMatchObject({ statut: "NON_CONSERVE", documentId: null, motif: expect.stringContaining("consentement") });

    const avec = await banc();
    await avec.appel("POST", null, ["lien", avec.jeton, "enregistrement"], { accepte: true });
    await avec.appel("POST", PRO, [avec.id, "enregistrement"], { accepte: true });
    avec.c.maintenant = Date.parse(C1);
    const e2 = JSON.stringify({ eventType: "RECORDING_UPLOADED", idempotencyKey: "rec2", timestamp: Date.parse(C1), fqn: `x/${salleDe(avec)}`, data: { preAuthenticatedLink: "https://8x8.example/rec.mp4", durationSec: 600 } });
    await avec.appel("POST", null, ["jaas"], e2, { "x-jaas-signature": await signer(e2, Math.floor(avec.c.maintenant / 1000)) });
    expect(avec.depot.lignes.get(avec.id)!.trace!.enregistrement).toMatchObject({ statut: "CONSERVE", documentId: "doc_enregistrement00000", dureeS: 600 });
    expect(avec.journal).toContain("enregistrement_conserve");

    const sansR2 = await banc(null);
    await sansR2.appel("POST", null, ["lien", sansR2.jeton, "enregistrement"], { accepte: true });
    await sansR2.appel("POST", PRO, [sansR2.id, "enregistrement"], { accepte: true });
    sansR2.c.maintenant = Date.parse(C1);
    const e3 = JSON.stringify({ eventType: "RECORDING_UPLOADED", idempotencyKey: "rec3", timestamp: Date.parse(C1), fqn: `x/${salleDe(sansR2)}`, data: { preAuthenticatedLink: "https://8x8.example/rec.mp4" } });
    await sansR2.appel("POST", null, ["jaas"], e3, { "x-jaas-signature": await signer(e3, Math.floor(sansR2.c.maintenant / 1000)) });
    expect(sansR2.depot.lignes.get(sansR2.id)!.trace!.enregistrement.statut).toBe("NON_CONSERVE");
    expect(sansR2.mails.some((m) => /non conservé/.test(m.subject))).toBe(true);
  });

  it("compte rendu : après l'appel seulement, coordonnées masquées, validé ou contesté par l'autre partie", async () => {
    const b = await banc();
    expect((await b.appel("POST", PRO, [b.id, "compte-rendu"], { texte: "Décisions : porte en chêne, pose le 3 novembre." })).json.error).toBe("appel_pas_encore_tenu");
    b.c.maintenant = Date.parse(C1) + 40 * 60_000;
    const cr = await b.appel("POST", PRO, [b.id, "compte-rendu"], { texte: "Décisions : porte en chêne, pose le 3 novembre. Rappelez-moi au 0661223344." });
    const vue = (cr.json.demande as { trace: { compteRendu: { texte: string; statut: string } } }).trace.compteRendu;
    expect(vue.statut).toBe("PROPOSE");
    expect(vue.texte).not.toContain("0661223344");
    expect(b.mails.some((m) => /contact direct/.test(m.subject))).toBe(true);
    expect((await b.appel("POST", PRO, [b.id, "avis"], { accord: true })).json.error).toBe("auteur_du_compte_rendu");
    expect((await b.appel("POST", null, ["lien", b.jeton, "avis"], { accord: false })).json.error).toBe("remarque_requise");
    const conteste = await b.appel("POST", null, ["lien", b.jeton, "avis"], { accord: false, remarque: "La pose était prévue le 5." });
    expect((conteste.json.demande as { trace: { compteRendu: { statut: string } } }).trace.compteRendu.statut).toBe("CONTESTE");
    await b.appel("POST", PRO, [b.id, "compte-rendu"], { texte: "Décisions : porte en chêne, pose le 5 novembre." });
    const valide = await b.appel("POST", null, ["lien", b.jeton, "avis"], { accord: true });
    expect((valide.json.demande as { trace: { compteRendu: { statut: string } } }).trace.compteRendu.statut).toBe("VALIDE");
    expect(b.journal).toEqual(expect.arrayContaining(["compte_rendu_propose", "compte_rendu_conteste", "compte_rendu_valide"]));
  });
});
