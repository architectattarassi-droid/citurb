import { describe, expect, it } from "vitest";
import { creerJetonClient, lireJetonClient, lireSessionClient, secretClient, DUREE_CLIENT_S } from "../../../../functions/_lib/clientSession";
import { ouvrirParLien, demanderLien, MESSAGE_DEMANDE } from "../../../../functions/_lib/clientAcces";
import { jetonDossier, PHASES } from "../../../../functions/_lib/dossierAdmin";
import { appliquerAction, construireParcours, lireAction } from "../../../../functions/_lib/ficheDossier";
import { autoriserCreation } from "../../../../functions/_lib/appels";
import { reinitialiserLimites } from "../../../../functions/_lib/cercles";

const SECRET = "s".repeat(40);
const SECRET_LIEN = "l".repeat(40);

type Ligne = Record<string, unknown>;
type Requete = { q: string; v: unknown[] };
/** Faux client Neon : répond selon le premier fragment reconnu, garde la trace des requêtes. */
function fauxSql(reponses: [string, Ligne[] | ((v: unknown[]) => Ligne[])][]) {
  const journal: Requete[] = [];
  const sql = (async (strings: TemplateStringsArray, ...v: unknown[]) => {
    const q = strings.join("?");
    journal.push({ q, v });
    for (const [frag, r] of reponses) if (q.includes(frag)) return typeof r === "function" ? r(v) : r;
    return [];
  }) as unknown as Parameters<typeof ouvrirParLien>[0];
  return { sql, journal };
}

describe("session client (lot 3a)", () => {
  it("jeton signé : aller-retour, falsification et expiration refusées", async () => {
    const t0 = Date.UTC(2026, 9, 15);
    const j = await creerJetonClient("usr_1", SECRET, t0);
    expect(await lireJetonClient(j, SECRET, t0 + 1000)).toBe("usr_1");
    expect(await lireJetonClient(j, "x".repeat(40), t0)).toBeNull();
    expect(await lireJetonClient(j.replace(/.$/, (c) => (c === "A" ? "B" : "A")), SECRET, t0)).toBeNull();
    expect(await lireJetonClient(j, SECRET, t0 + (DUREE_CLIENT_S + 10) * 1000)).toBeNull();
  });

  it("secret : CLIENT_SESSION_SECRET, puis DOSSIER_LIEN_SECRET, puis ADMIN_SESSION_SECRET (≥ 32)", () => {
    expect(secretClient({})).toBeNull();
    expect(secretClient({ ADMIN_SESSION_SECRET: "court" })).toBeNull();
    expect(secretClient({ ADMIN_SESSION_SECRET: SECRET })).toBe(SECRET);
    expect(secretClient({ CLIENT_SESSION_SECRET: SECRET_LIEN, ADMIN_SESSION_SECRET: SECRET })).toBe(SECRET_LIEN);
  });

  it("compte désactivé ou non CLIENT : aucune session, même avec un cookie valide", async () => {
    const j = await creerJetonClient("usr_1", SECRET);
    const req = new Request("https://x/api/client/moi", { headers: { cookie: `cli_session=${j}` } });
    const actif = fauxSql([['FROM "User"', [{ role: "CLIENT", isActive: true }]], ['FROM "Dossier"', [{ id: "dos_a" }, { id: "dos_b" }]]]);
    expect(await lireSessionClient(req, { ADMIN_SESSION_SECRET: SECRET }, actif.sql)).toEqual({ clientId: "usr_1", dossierIds: ["dos_a", "dos_b"] });
    const inactif = fauxSql([['FROM "User"', [{ role: "CLIENT", isActive: false }]]]);
    expect(await lireSessionClient(req, { ADMIN_SESSION_SECRET: SECRET }, inactif.sql)).toBeNull();
    const admin = fauxSql([['FROM "User"', [{ role: "ADMIN", isActive: true }]]]);
    expect(await lireSessionClient(req, { ADMIN_SESSION_SECRET: SECRET }, admin.sql)).toBeNull();
  });

  it("le lien d'invitation /mon-dossier ouvre la session du propriétaire du dossier", async () => {
    const lien = await jetonDossier(SECRET_LIEN, "dos_a");
    const { sql } = fauxSql([['SELECT "ownerId"', [{ ownerId: "usr_1" }]], ['FROM "User"', [{ role: "CLIENT", isActive: true }]]]);
    const r = await ouvrirParLien(sql, lien, SECRET_LIEN, SECRET);
    expect(r.status).toBe(200);
    expect(await lireJetonClient(r.cookie!, SECRET)).toBe("usr_1");
    expect((await ouvrirParLien(sql, "d1.1.x.y", SECRET_LIEN, SECRET)).status).toBe(401);
    expect((await ouvrirParLien(sql, await jetonDossier("autre".repeat(10), "dos_a"), SECRET_LIEN, SECRET)).status).toBe(401);
  });

  it("demande de lien : réponse identique que le compte existe ou non, aucune coordonnée renvoyée", async () => {
    reinitialiserLimites();
    const inconnu = fauxSql([]);
    const r1 = await demanderLien(inconnu.sql, { telephone: "0612345678" }, {}, SECRET_LIEN, "https://citurbarea.com", "1.1.1.1");
    const connu = fauxSql([['FROM "User" u', [{ id: "usr_1", email: "a@b.ma", dossierId: "dos_a", titre: "Villa" }]], ["to_regclass", [{ d: true, u: true, c: true, e: true, j: true, col: true }]]]);
    const r2 = await demanderLien(connu.sql, { telephone: "+212 6 12 34 56 78" }, {}, SECRET_LIEN, "https://citurbarea.com", "2.2.2.2");
    expect(r1).toEqual({ status: 200, json: { ok: true, message: MESSAGE_DEMANDE } });
    expect(r2).toEqual(r1);
    // Sans service d'e-mail : la demande est journalisée sur le dossier pour l'équipe.
    expect(connu.journal.some((x) => x.q.includes('INSERT INTO "DossierEvenement"') && x.v.includes("lien_demande"))).toBe(true);
    expect((await demanderLien(inconnu.sql, { email: "pas-un-email" }, {}, SECRET_LIEN, "https://x", "3.3.3.3")).status).toBe(400);
  });
});

describe("appels et messagerie : le client connecté", () => {
  it("ne contacte que le cabinet, au sujet d'un dossier", () => {
    expect(autoriserCreation("client", { contexte: "dossier", invites: [{ type: "admin" }] }).ok).toBe(true);
    expect(autoriserCreation("client", { contexte: "dossier", invites: [{ type: "pro", slug: "atlas" }] }).ok).toBe(false);
    expect(autoriserCreation("client", { contexte: "cercles", invites: [{ type: "admin" }] }).ok).toBe(false);
  });
});

describe("fiche dossier admin (lot 3c)", () => {
  const base = { phase: "14_APD", createdAt: "2026-09-01T10:00:00.000Z", leads: [{ createdAt: "2026-08-20T09:00:00.000Z" }], rdv: [{ debut: "2026-08-25T10:00:00.000Z", statut: "TERMINE" }], devisPropose: true, etapes: new Map(), maintenant: "2026-10-15T00:00:00.000Z" };

  it("parcours A → Z : pré-dossier puis TOUTES les phases du catalogue, rien de masqué", () => {
    const p = construireParcours(base);
    expect(p.slice(0, 6).map((e) => e.code)).toEqual(["PRE_LEAD", "PRE_RDV", "PRE_QUALIFICATION", "PRE_DEVIS", "PRE_CONTRAT", "PRE_PAIEMENT"]);
    expect(p.length).toBe(6 + PHASES.length);
    expect(p.find((e) => e.code === "PRE_LEAD")!.statut).toBe("FAITE");
    expect(p.find((e) => e.code === "PRE_RDV")!.statut).toBe("FAITE");
    expect(p.find((e) => e.code === "14_APD")!.statut).toBe("EN_COURS");
    expect(p.find((e) => e.code === "10_ESQUISSE")!.statut).toBe("ANTERIEURE");
    expect(p.find((e) => e.code === "97_RECEPTION_DEFINITIVE")!.statut).toBe("A_VENIR");
  });

  it("une étape saisie par l'admin l'emporte sur la déduction", () => {
    const etapes = new Map([["10_ESQUISSE", { statut: "FAITE_HORS_PLATEFORME", date: "2026-05-01", note: null, saisiPar: "admin" }]]);
    expect(construireParcours({ ...base, etapes }).find((e) => e.code === "10_ESQUISSE")).toMatchObject({ statut: "FAITE_HORS_PLATEFORME", source: "saisie" });
  });

  it("actions validées : codes et statuts connus seulement", () => {
    expect(lireAction({ action: "statut", statut: "APPROVED" })).toMatchObject({ action: "statut" });
    expect(lireAction({ action: "statut", statut: "N_IMPORTE" })).toEqual({ erreur: "statut_invalide" });
    expect(lireAction({ action: "phase", phase: "30_DOSSIER_AUTORISATION" })).toMatchObject({ action: "phase" });
    expect(lireAction({ action: "etape", code: "PRE_CONTRAT", statut: "FAITE", date: "2026-10-01" })).toMatchObject({ code: "PRE_CONTRAT", date: "2026-10-01" });
    expect(lireAction({ action: "etape", code: "INCONNU", statut: "FAITE" })).toEqual({ erreur: "etape_invalide" });
    expect(lireAction({ action: "supprimer" })).toEqual({ erreur: "action_inconnue" });
  });

  it("débloquer : refus / corrections → en examen, blocage du payload levé, journalisé", async () => {
    const { sql, journal } = fauxSql([
      ['SELECT "status", "phase", "payload"', [{ status: "REJECTED", phase: "14_APD", payload: { blocage: { motif: "x" }, brief: {} } }]],
      ["to_regclass", [{ d: true, u: true, c: true, e: true, j: true, col: true }]],
    ]);
    const r = await appliquerAction(sql, "dos_a", { action: "debloquer", motif: "appel client" }, "yassine@citurbarea.com", "2026-10-15T10:00:00.000Z");
    expect(r.status).toBe(200);
    const maj = journal.find((x) => x.q.includes('SET "status"'))!;
    expect(maj.v[0]).toBe("IN_REVIEW");
    expect(JSON.parse(String(maj.v[1]))).toEqual({ brief: {} });
    const ev = journal.find((x) => x.q.includes('INSERT INTO "DossierEvenement"'))!;
    expect(ev.v).toContain("DEBLOQUE");
  });

  it("étape sans le SQL devis-facturation : message clair, pas d'erreur 500", async () => {
    const { sql } = fauxSql([
      ['SELECT "status", "phase", "payload"', [{ status: "APPROVED", phase: "14_APD", payload: {} }]],
      ["to_regclass", [{ d: true, u: true, c: false, e: false, j: false, col: false }]],
    ]);
    const r = await appliquerAction(sql, "dos_a", { action: "rouvrir", code: "10_ESQUISSE", motif: null }, "admin");
    expect(r).toEqual({ status: 503, json: { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" } });
  });
});
