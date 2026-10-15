/**
 * Espace projet : droits, point d'arrêt, fichiers, documents et signatures,
 * accès par lien, génération des jalons (mini référentiel de test, jamais data/*.json).
 * Données fictives uniquement (« Test QA », qa-test@example.test, +212600000000).
 */
import { describe, expect, it } from "vitest";
import { fusionner } from "../../domain/referentiel";
import type { FichierReferentiel } from "../../domain/referentiel/types";
import {
  creerSession, filtrerValeurs, lireSession, limites, nettoyer, peutChangerStatut, peutCocher, peutContribuer, signer, validerFichier, validerInstantane,
  type Acteur, type DefJalon,
} from "../../../../../functions/_lib/projets";
import {
  routeurAdmin, routeurMembre, type BucketR2, type Contexte, type Depot, type DocumentLigne, type EnvProjets, type EvenementLigne, type FichierLigne,
  type JalonLigne, type MembreLigne, type MessageLigne, type ProjetLigne,
} from "../../../../../functions/_lib/projetsApi";
import { instantane, versionReferentiel, type Caracteristiques } from "./generation";

// ── Mini référentiel ────────────────────────────────────────────────────

const MINI: FichierReferentiel = {
  domaine: "test", version: "0.1", majLe: "2026-10-13", auteur: "Test QA",
  normes: [
    { id: "N_BETON", code: "NM TEST 1", intitule: "Béton (test)", organisme: "IMANOR", portee: "NORME_VOLONTAIRE", domaines: ["BETON"], objet: "Test.", verifie: false, majLe: "2026-10-13" },
    { id: "N_SS", code: "NM TEST 2", intitule: "Sous-sol (test)", organisme: "IMANOR", portee: "NORME_VOLONTAIRE", domaines: ["ETANCHEITE"], objet: "Test.", verifie: true, majLe: "2026-10-13" },
  ],
  exigences: [
    { id: "EX.ENROBAGE", normes: ["N_BETON"], texte: "Respecter l'enrobage prévu.", moment: "EXECUTION", criticite: "BLOQUANT", verification: { methode: "Mesure", preuves: ["PHOTO"], responsable: "BUREAU_CONTROLE" }, verifie: true },
    { id: "EX.CUVELAGE", normes: ["N_SS"], texte: "Cuvelage si nappe.", moment: "CONCEPTION", criticite: "MAJEUR", verification: { methode: "Plan", preuves: ["PLAN"], responsable: "BET_STRUCTURE" }, conditions: { sousSol: true }, verifie: true },
  ],
  modeles: [{
    id: "PV_FERRAILLAGE", titre: "PV de réception des armatures", nature: "PV", objet: "Test",
    sections: [{ titre: "Constat", champs: [
      { id: "date", libelle: "Date", type: "date" }, { id: "conforme", libelle: "Conforme", type: "case" },
      { id: "obs", libelle: "Observations", type: "texte_long" }, { id: "avis", libelle: "Avis", type: "choix", options: ["FAVORABLE", "RESERVES"] },
      { id: "mesures", libelle: "Mesures", type: "tableau", colonnes: ["Élément", "Enrobage (cm)"] },
    ] }],
    signataires: ["ENTREPRISE", "ARCHITECTE"],
  }],
  jalons: [
    { code: "84_FONDATIONS.FON.01", phase: "84_FONDATIONS", lot: "FON", ordre: 1, titre: "Fonds de fouille", objectif: "Réceptionner le fond de fouille.", acteurs: ["ENTREPRISE", "GEOTECHNICIEN"], validateurs: ["ARCHITECTE"], exigences: ["EX.CUVELAGE"], checklist: [
      { id: "c1", texte: "Fond propre", moment: "EXECUTION", responsable: "ENTREPRISE" },
      { id: "c2", texte: "Le client a vu la fouille", moment: "EXECUTION", responsable: "CLIENT" },
    ], documents: [], pointArret: true },
    { code: "84_FONDATIONS.FON.02", phase: "84_FONDATIONS", lot: "FON", ordre: 2, titre: "Ferraillage des semelles", objectif: "Vérifier les armatures.", prerequis: ["84_FONDATIONS.FON.01"], acteurs: ["ENTREPRISE"], validateurs: ["BUREAU_CONTROLE", "ARCHITECTE"], exigences: ["EX.ENROBAGE"], checklist: [
      { id: "c1", texte: "Enrobage mesuré", moment: "EXECUTION", exigence: "EX.ENROBAGE", responsable: "BUREAU_CONTROLE", preuves: ["PHOTO"] },
    ], documents: ["PV_FERRAILLAGE"] },
    { code: "86_PLANCHER.STR.01", phase: "86_PLANCHER", lot: "STR", ordre: 1, titre: "Coffrage plancher", objectif: "O", acteurs: ["ENTREPRISE"], validateurs: ["ARCHITECTE"], exigences: [], checklist: [{ id: "c1", texte: "t", moment: "EXECUTION", responsable: "ENTREPRISE" }], documents: [] },
    { code: "90_PISCINE.PIS.01", phase: "90_PISCINE", ordre: 1, titre: "Piscine", objectif: "O", conditions: { piscine: true }, acteurs: ["ENTREPRISE"], validateurs: ["ARCHITECTE"], exigences: [], checklist: [{ id: "c1", texte: "t", moment: "EXECUTION", responsable: "ENTREPRISE" }], documents: [] },
  ],
};
const R = fusionner([MINI]);
const VILLA: Caracteristiques = { type: "VILLA", sousSols: 0, etagesHorsSol: 1, erp: false, ascenseur: false, piscine: false };

// ── Dépôt en mémoire + faux R2 ──────────────────────────────────────────

function depotMemoire() {
  const projets = new Map<string, ProjetLigne>();
  const membres = new Map<string, MembreLigne>();
  const jalons = new Map<string, JalonLigne>();
  const messages: MessageLigne[] = [];
  const fichiers: FichierLigne[] = [];
  const documents = new Map<string, DocumentLigne>();
  const journal: EvenementLigne[] = [];
  const k = (p: string, c: string) => `${p}|${c}`;
  const depot: Depot = {
    async tablesPresentes() { return true; },
    async dossierExiste(id) { return id === "dos_test"; },
    async creerProjet(p, defs, le) {
      projets.set(p.id, { ...p, createdAt: le, updatedAt: le });
      defs.forEach((d, i) => jalons.set(k(p.id, d.code), { projetId: p.id, code: d.code, phase: d.phase, rang: i, definition: d, statut: "A_FAIRE", checklist: {}, validePar: null, valideLe: null, salle: null, updatedAt: le }));
    },
    async listerProjets() { return [...projets.values()].map((p) => ({ id: p.id, titre: p.titre, dossierId: p.dossierId, createdAt: p.createdAt, nbJalons: 0, nbValides: 0, nbMembres: 0 })); },
    async projet(id) { return projets.get(id) ?? null; },
    async membres(pid) { return [...membres.values()].filter((m) => m.projetId === pid); },
    async membre(id) { return membres.get(id) ?? null; },
    async membreParJeton(h) { return [...membres.values()].find((m) => m.jetonHash === h) ?? null; },
    async creerMembre(m) { membres.set(m.id, m); },
    async majMembre(pid, id, m) { const x = membres.get(id); if (!x || x.projetId !== pid) return false; membres.set(id, { ...x, ...(m.actif !== undefined ? { actif: m.actif } : {}), ...(m.jetonHash ? { jetonHash: m.jetonHash } : {}) }); return true; },
    async toucherMembre(id, le) { const x = membres.get(id); if (x) x.dernierAcces = le; },
    async jalons(pid) { return [...jalons.values()].filter((j) => j.projetId === pid).sort((a, b) => a.rang - b.rang); },
    async jalon(pid, code) { const j = jalons.get(k(pid, code)); return j ? structuredClone(j) : null; },
    async etats(pid, codes) { return codes.map((c) => jalons.get(k(pid, c))).filter(Boolean).map((j) => ({ code: j!.code, statut: j!.statut, definition: { pointArret: j!.definition.pointArret } })); },
    async majStatut(pid, code, de, vers, par, le) { const j = jalons.get(k(pid, code)); if (!j || j.statut !== de) return false; j.statut = vers; j.validePar = vers === "VALIDE" ? par : null; j.valideLe = vers === "VALIDE" ? le : null; return true; },
    async majPoint(pid, code, pointId, etat) { jalons.get(k(pid, code))!.checklist[pointId] = etat; },
    async salle(pid, code, nouvelle) { const j = jalons.get(k(pid, code))!; j.salle ??= nouvelle; return j.salle; },
    async messages(pid, code, o) { return messages.filter((m) => m.projetId === pid && m.jalonCode === code && (!o.apres || m.createdAt > o.apres) && (!o.avant || m.createdAt < o.avant)).slice(-o.limite); },
    async derniersMessages(pid, n) { return messages.filter((m) => m.projetId === pid && !m.masque).slice(-n).reverse(); },
    async insererMessage(m) { messages.push(m); },
    async masquerMessage(pid, id, masque) { const m = messages.find((x) => x.id === id && x.projetId === pid); if (!m) return false; m.masque = masque; return true; },
    async insererFichier(f) { fichiers.push(f); },
    async fichier(pid, id) { return fichiers.find((f) => f.id === id && f.projetId === pid) ?? null; },
    async fichiers(pid, o) { return fichiers.filter((f) => f.projetId === pid && (!o.ids || o.ids.includes(f.id)) && (!o.jalonCode || f.jalonCode === o.jalonCode) && (!o.images || f.nature === "PHOTO" || f.nature === "VIDEO")).slice(0, o.limite); },
    async documents(pid, code) { return [...documents.values()].filter((d) => d.projetId === pid && d.jalonCode === code); },
    async document(pid, id) { const d = documents.get(id); return d && d.projetId === pid ? structuredClone(d) : null; },
    async insererDocument(d) { documents.set(d.id, d); },
    async majDocument(pid, id, attendu, d, le) { const x = documents.get(id); if (!x || x.projetId !== pid || x.updatedAt !== attendu) return false; documents.set(id, { ...x, ...(d.valeurs ? { valeurs: d.valeurs } : {}), ...(d.signatures ? { signatures: d.signatures } : {}), ...(d.statut ? { statut: d.statut as DocumentLigne["statut"] } : {}), updatedAt: le }); return true; },
    async journaliser(e) { journal.push(e); },
    async journal(pid) { return journal.filter((e) => e.projetId === pid); },
  };
  return { depot, membres, jalons, messages, fichiers, journal };
}

function fauxR2() {
  const objets = new Map<string, Uint8Array>();
  const bucket: BucketR2 = {
    async put(cle, corps) { objets.set(cle, new Uint8Array(await new Response(corps as BodyInit).arrayBuffer())); return {}; },
    async get(cle) { const o = objets.get(cle); return o ? { body: new Response(o as BodyInit).body, size: o.length } : null; },
    async delete(cle) { objets.delete(cle); },
  };
  return { bucket, objets };
}

const ORIGINE = "https://citurbarea.test";
const SECRET = "s".repeat(40);

/** Banc d'essai : un projet créé par l'admin, des membres invités, des requêtes simulées. */
async function banc(avecR2 = true, ref: { r: typeof R; mini: FichierReferentiel } = { r: R, mini: MINI }, journalDossier?: (d: string, a: string, action: string, det: Record<string, unknown>) => void) {
  const mem = depotMemoire();
  const r2 = fauxR2();
  const env: EnvProjets = { PROJET_SESSION_SECRET: SECRET, PUBLIC_WEB_URL: ORIGINE, ...(avecR2 ? { FICHIERS: r2.bucket } : {}) };
  let t = Date.parse("2026-10-13T08:00:00Z");
  const maintenant = () => new Date((t += 1000)).toISOString();
  const ctx = (req: Request): Contexte => ({ req, env, depot: mem.depot, maintenant, ...(journalDossier ? { gestion: { pieces: async () => new Response(null, { status: 404 }), journalDossier: async (d: string, a: string, x: string, det: Record<string, unknown>) => journalDossier(d, a, x, det) } } : {}) });
  const requete = (methode: string, chemin: string, o: { corps?: unknown; cookie?: string; entetes?: Record<string, string>; brut?: BodyInit } = {}) =>
    new Request(`${ORIGINE}${chemin}`, {
      method: methode,
      headers: { origin: ORIGINE, ...(o.cookie ? { cookie: o.cookie } : {}), ...(o.corps !== undefined ? { "content-type": "application/json" } : {}), ...(o.entetes || {}) },
      body: o.brut ?? (o.corps !== undefined ? JSON.stringify(o.corps) : undefined),
    });
  const admin = async (methode: string, chemin: string, corps?: unknown) => {
    const seg = chemin.split("/").filter(Boolean);
    const r = await routeurAdmin(ctx(requete(methode, `/api/cc/projets/${chemin}`, { corps })), seg, "qa-test@example.test");
    return { status: r.status, json: (await r.json()) as Record<string, any> };
  };
  const membre = async (cookie: string, methode: string, chemin: string, o: { corps?: unknown; entetes?: Record<string, string>; brut?: BodyInit } = {}) => {
    const seg = chemin.split("/").filter(Boolean);
    const r = await routeurMembre(ctx(requete(methode, `/api/projets/${chemin}`, { ...o, cookie })), seg);
    const type = r.headers.get("content-type") || "";
    return { status: r.status, json: (type.includes("json") ? await r.json() : null) as Record<string, any>, res: r };
  };

  const inst = instantane(VILLA, ref.r, { "84_FONDATIONS": "Fondations", "86_PLANCHER": "Plancher" });
  const cree = await admin("POST", "", { dossierId: "dos_test", titre: "Villa Test QA", caracteristiques: VILLA, referentielVersion: versionReferentiel([ref.mini]), ...inst });
  expect(cree.status).toBe(200);
  const projetId = cree.json.id as string;

  const inviter = async (role: string, nom = `Test QA ${role}`) => {
    const r = await admin("POST", `${projetId}/membres`, { role, nom, telephone: "+212600000000", email: "qa-test@example.test" });
    expect(r.status).toBe(200);
    const jeton = String(r.json.lien).split("/projet/")[1];
    // Adresse IP distincte par invitation : la limite de 20 accès / 10 min par IP ne gêne pas les tests.
    const acces = await routeurMembre(ctx(requete("POST", "/api/projets/acces", { corps: { jeton }, entetes: { "cf-connecting-ip": `test-${jeton.slice(0, 12)}` } })), ["acces"]);
    expect(acces.status).toBe(200);
    const cookie = (acces.headers.get("set-cookie") || "").split(";")[0];
    return { id: r.json.membre.id as string, cookie, jeton, lien: r.json.lien as string };
  };
  return { mem, r2, env, admin, membre, inviter, projetId, ctx, requete };
}

const FOUILLE = "84_FONDATIONS.FON.01";
const FERRAILLAGE = "84_FONDATIONS.FON.02";

// ── Tests ───────────────────────────────────────────────────────────────

describe("espace projet : génération des jalons", () => {
  it("sélectionne les jalons selon les caractéristiques et démultiplie les planchers par niveau", () => {
    const i = instantane(VILLA, R, {});
    expect(i.jalons.map((j) => j.code)).toEqual([FOUILLE, FERRAILLAGE, "86_PLANCHER_RDC.STR.01", "86_PLANCHER_R1.STR.01"]);
    expect(i.jalons.find((j) => j.code === "86_PLANCHER_R1.STR.01")!.niveau).toBe("R+1");
    // Exigence conditionnée au sous-sol : retirée (et sa norme avec) pour une villa sans sous-sol.
    expect(i.jalons[0].exigences).toEqual([]);
    expect(Object.keys(i.dictionnaire.normes)).toEqual(["N_BETON"]);
    expect(Object.keys(i.dictionnaire.modeles)).toEqual(["PV_FERRAILLAGE"]);
    const avecPiscine = instantane({ ...VILLA, piscine: true, sousSols: 1 }, R, {});
    expect(avecPiscine.jalons.some((j) => j.code === "90_PISCINE.PIS.01")).toBe(true);
    expect(avecPiscine.jalons[0].exigences).toEqual(["EX.CUVELAGE"]);
  });
  it("le serveur valide l'instantané (rôles, références, prérequis hors projet retirés)", () => {
    const i = instantane(VILLA, R, {});
    const v = validerInstantane(i.jalons, i.dictionnaire);
    expect(v.ok).toBe(true);
    const casse = [{ ...i.jalons[0], acteurs: ["PIRATE"] }];
    expect(validerInstantane(casse, i.dictionnaire)).toMatchObject({ ok: false });
    const orphelin = validerInstantane([{ ...i.jalons[1], prerequis: ["99_AUTRE.X.01"] }], i.dictionnaire);
    expect(orphelin.ok && orphelin.jalons[0].prerequis).toEqual([]);
    expect(validerInstantane([{ ...i.jalons[1], documents: ["PV_INCONNU"] }], i.dictionnaire)).toMatchObject({ ok: false });
  });
  it("un référentiel vide donne un projet sans jalon (état vide), pas une erreur", () => {
    const vide = instantane(VILLA, fusionner([]), {});
    expect(vide.jalons).toEqual([]);
    expect(validerInstantane(vide.jalons, vide.dictionnaire).ok).toBe(true);
  });
});

describe("espace projet : droits (règles pures)", () => {
  const def = { acteurs: ["ENTREPRISE"], validateurs: ["BUREAU_CONTROLE"], pointArret: false } as unknown as DefJalon;
  const m = (role: string): Acteur => ({ kind: "membre", id: "pm_x", projetId: "prj_x", role: role as never, nom: "Test QA" });
  it("client : contribue partout, coche seulement ses points, ne change pas les statuts", () => {
    expect(peutContribuer(m("CLIENT"), def)).toBe(true);
    expect(peutCocher(m("CLIENT"), def, { responsable: "CLIENT" })).toBe(true);
    expect(peutCocher(m("CLIENT"), def, { responsable: "ENTREPRISE" })).toBe(false);
    expect(peutChangerStatut(m("CLIENT"), def, "A_FAIRE", "EN_COURS")).toBe(false);
  });
  it("prestataire : ses jalons seulement ; validateur valide (hors point d'arrêt)", () => {
    expect(peutContribuer(m("LABORATOIRE"), def)).toBe(false);
    expect(peutCocher(m("ENTREPRISE"), def, { responsable: "BUREAU_CONTROLE" })).toBe(true);
    expect(peutChangerStatut(m("ENTREPRISE"), def, "EN_COURS", "EN_ATTENTE_VALIDATION")).toBe(true);
    expect(peutChangerStatut(m("ENTREPRISE"), def, "EN_ATTENTE_VALIDATION", "VALIDE")).toBe(false);
    expect(peutChangerStatut(m("BUREAU_CONTROLE"), def, "EN_ATTENTE_VALIDATION", "VALIDE")).toBe(true);
    expect(peutChangerStatut(m("BUREAU_CONTROLE"), { ...def, pointArret: true }, "EN_ATTENTE_VALIDATION", "VALIDE")).toBe(false);
    expect(peutChangerStatut(m("BUREAU_CONTROLE"), def, "VALIDE", "EN_COURS")).toBe(false);
  });
  it("architecte et administration : tout", () => {
    expect(peutChangerStatut(m("ARCHITECTE"), { ...def, pointArret: true }, "VALIDE", "BLOQUE")).toBe(true);
    expect(peutCocher({ kind: "admin", email: "qa-test@example.test" }, def, { responsable: "CLIENT" })).toBe(true);
  });
  it("textes nettoyés : balises et caractères de contrôle retirés, longueur bornée", () => {
    expect(nettoyer("<script>alert(1)</script>Bonjour\u0000 a < b", 100)).toBe("alert(1)Bonjour a < b");
    expect(nettoyer("x".repeat(50), 10)).toHaveLength(10);
  });
});

describe("espace projet : accès", () => {
  it("le jeton s'échange contre un cookie signé HttpOnly ; un non-membre est refusé", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    expect(client.lien).toMatch(/^https:\/\/citurbarea\.test\/projet\/[A-Za-z0-9_-]{43}$/);
    expect(b.mem.membres.get(client.id)!.jetonHash).not.toContain(client.jeton); // jamais stocké en clair
    const moi = await b.membre(client.cookie, "GET", "moi");
    expect(moi.json).toMatchObject({ ok: true, projet: { id: b.projetId } });
    expect(JSON.stringify(moi.json)).not.toContain("qa-test@example.test");

    expect((await b.membre("", "GET", b.projetId)).status).toBe(401);
    expect((await b.membre("projet_session=p1.9999999999.pm_aaaaaaaaaaaa.0123456789abcdef.faux", "GET", b.projetId)).status).toBe(401);
    const mauvais = await routeurMembre(b.ctx(b.requete("POST", "/api/projets/acces", { corps: { jeton: "A".repeat(43) } })), ["acces"]);
    expect(mauvais.status).toBe(404);
  });
  it("un membre ne voit que son projet ; la révocation et la régénération coupent l'accès", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    const autre = await b.admin("POST", "", { titre: "Autre projet", caracteristiques: VILLA, referentielVersion: "test@0.1", ...instantane(VILLA, R, {}) });
    expect((await b.membre(client.cookie, "GET", autre.json.id)).status).toBe(404);
    expect((await b.membre(client.cookie, "GET", `${autre.json.id}/jalons/${FOUILLE}`)).status).toBe(404);
    expect((await b.membre(client.cookie, "GET", "")).status).toBe(404);

    const ok = await b.membre(client.cookie, "GET", b.projetId);
    expect(ok.status).toBe(200);
    expect(ok.json.jalons).toHaveLength(4);
    expect(ok.json.membres.every((m: Record<string, unknown>) => !("telephone" in m) && !("email" in m))).toBe(true);

    await b.admin("POST", `${b.projetId}/membres/${client.id}/lien`, {});
    expect((await b.membre(client.cookie, "GET", b.projetId)).status).toBe(401);
    const neuf = await b.inviter("ENTREPRISE");
    await b.admin("PATCH", `${b.projetId}/membres/${neuf.id}`, { actif: false });
    expect((await b.membre(neuf.cookie, "GET", b.projetId)).status).toBe(401);
    expect(b.mem.journal.some((e) => e.action === "membre_revoque")).toBe(true);
  });
  it("les requêtes modifiantes d'une autre origine sont refusées", async () => {
    const b = await banc();
    const c = await b.inviter("CLIENT");
    const req = new Request(`${ORIGINE}/api/projets/${b.projetId}/jalons/${FOUILLE}/messages`, { method: "POST", headers: { origin: "https://pirate.test", cookie: c.cookie, "content-type": "application/json" }, body: JSON.stringify({ texte: "x" }) });
    expect((await routeurMembre(b.ctx(req), [b.projetId, "jalons", FOUILLE, "messages"])).status).toBe(403);
  });
  it("cookie : signature et expiration vérifiées", async () => {
    const v = await creerSession("pm_abcdefgh1234", "0123456789abcdef" + "0".repeat(48), SECRET, 0);
    expect(await lireSession(v, SECRET, 1000)).toMatchObject({ membreId: "pm_abcdefgh1234" });
    expect(await lireSession(v, "t".repeat(40), 1000)).toBeNull();
    expect(await lireSession(v, SECRET, 31 * 24 * 3600_000)).toBeNull();
  });
});

describe("espace projet : jalons et point d'arrêt", () => {
  it("droits appliqués par le serveur : client, prestataire, architecte", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    const entreprise = await b.inviter("ENTREPRISE");
    const labo = await b.inviter("LABORATOIRE");
    const chemin = `${b.projetId}/jalons/${FOUILLE}`;

    expect((await b.membre(client.cookie, "PATCH", chemin, { corps: { point: { id: "c2", fait: true } } })).status).toBe(200);
    expect((await b.membre(client.cookie, "PATCH", chemin, { corps: { point: { id: "c1", fait: true } } })).status).toBe(403);
    expect((await b.membre(client.cookie, "PATCH", chemin, { corps: { statut: "VALIDE" } })).status).toBe(403);
    expect(b.mem.jalons.get(`${b.projetId}|${FOUILLE}`)!.statut).toBe("EN_COURS"); // première coche → en cours

    expect((await b.membre(labo.cookie, "PATCH", chemin, { corps: { point: { id: "c1", fait: true } } })).status).toBe(403);
    expect((await b.membre(labo.cookie, "POST", `${chemin}/messages`, { corps: { texte: "Bonjour" } })).status).toBe(403);
    expect((await b.membre(labo.cookie, "GET", chemin)).status).toBe(200); // lecture seule

    expect((await b.membre(entreprise.cookie, "PATCH", chemin, { corps: { point: { id: "c1", fait: true, commentaire: "<b>OK</b>" } } })).json.point).toMatchObject({ fait: true, commentaire: "OK", role: "ENTREPRISE" });
    expect((await b.membre(entreprise.cookie, "PATCH", chemin, { corps: { statut: "EN_ATTENTE_VALIDATION" } })).status).toBe(200);
    // Point d'arrêt : seul l'architecte valide.
    expect((await b.membre(entreprise.cookie, "PATCH", chemin, { corps: { statut: "VALIDE" } })).status).toBe(403);
    const vue = await b.membre(entreprise.cookie, "GET", chemin);
    expect(vue.json.droits.statuts).not.toContain("VALIDE");
  });
  it("un point d'arrêt non validé bloque la validation des jalons qui en dépendent", async () => {
    const b = await banc();
    const archi = await b.inviter("ARCHITECTE");
    const controle = await b.inviter("BUREAU_CONTROLE");
    const ferr = `${b.projetId}/jalons/${FERRAILLAGE}`;
    await b.membre(controle.cookie, "PATCH", ferr, { corps: { statut: "EN_ATTENTE_VALIDATION" } });
    const refus = await b.membre(controle.cookie, "PATCH", ferr, { corps: { statut: "VALIDE" } });
    expect(refus.status).toBe(409);
    expect(refus.json).toMatchObject({ error: "point_arret_non_leve", bloquants: [FOUILLE] });
    // Même l'architecte ne passe pas outre : il lève d'abord le point d'arrêt.
    expect((await b.membre(archi.cookie, "PATCH", ferr, { corps: { statut: "VALIDE" } })).status).toBe(409);
    expect((await b.membre(archi.cookie, "PATCH", `${b.projetId}/jalons/${FOUILLE}`, { corps: { statut: "VALIDE" } })).status).toBe(200);
    expect((await b.membre(controle.cookie, "PATCH", ferr, { corps: { statut: "VALIDE" } })).status).toBe(200);
    expect(b.mem.jalons.get(`${b.projetId}|${FERRAILLAGE}`)!.validePar).toContain("BUREAU_CONTROLE");
    // Jalon validé : le prestataire ne peut plus le rouvrir ni cocher.
    expect((await b.membre(controle.cookie, "PATCH", ferr, { corps: { statut: "EN_COURS" } })).status).toBe(403);
    expect((await b.membre(controle.cookie, "PATCH", ferr, { corps: { point: { id: "c1", fait: false } } })).status).toBe(409);
    expect(b.mem.journal.filter((e) => e.action === "statut").length).toBeGreaterThanOrEqual(3);
  });
});

describe("espace projet : discussion", () => {
  it("messages nettoyés, masquage par l'administration seulement", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    const chemin = `${b.projetId}/jalons/${FOUILLE}/messages`;
    const envoi = await b.membre(client.cookie, "POST", chemin, { corps: { texte: "<img src=x onerror=alert(1)>Photo du fond de fouille ?" } });
    expect(envoi.json.message.texte).toBe("Photo du fond de fouille ?");
    expect((await b.membre(client.cookie, "POST", chemin, { corps: { texte: "" } })).status).toBe(400);
    expect((await b.membre(client.cookie, "POST", chemin, { corps: { texte: "x", pieceIds: ["pf_inexistant00"] } })).status).toBe(400);
    const id = envoi.json.message.id;
    expect((await b.membre(client.cookie, "PATCH", `${b.projetId}/messages/${id}`, { corps: { masque: true } })).status).toBe(403);
    expect((await b.admin("PATCH", `${b.projetId}/messages/${id}`, { masque: true })).status).toBe(200);
    const liste = await b.membre(client.cookie, "GET", chemin);
    expect(liste.json.messages[0]).toMatchObject({ masque: true, texte: "" });
    expect(b.mem.messages).toHaveLength(1); // append-only : rien n'est supprimé
    // Coordonnées écrites par un membre : masquées, jamais stockées en clair (tout passe par CITURBAREA).
    const contact = await b.membre(client.cookie, "POST", chemin, { corps: { texte: "Appelez-moi au 06 12 34 56 78 ou ecrivez a moi@exemple.ma" } });
    expect(contact.json.coordonneesMasquees).toBe(true);
    expect(contact.json.message.texte).not.toMatch(/12 34|moi@exemple/);
    expect(b.mem.messages[1].texte).not.toMatch(/12 34|moi@exemple/);
  });
});

describe("espace projet : fichiers (R2)", () => {
  const photo = (taille: number, type = "image/jpeg") => ({ brut: new Uint8Array(taille), entetes: { "content-type": type, "content-length": String(taille), "x-jalon": FOUILLE, "x-point": "c2", "x-nom": encodeURIComponent("fouille 1.jpg") } });

  it("liste blanche et tailles maximales", () => {
    const l = limites();
    expect(validerFichier({ type: "image/jpeg", taille: 1000 }, l)).toMatchObject({ ok: true, nature: "PHOTO" });
    expect(validerFichier({ type: "video/mp4", taille: 150 * 1024 * 1024 }, l)).toMatchObject({ ok: true, nature: "VIDEO" });
    expect(validerFichier({ type: "application/pdf", taille: 1000, nature: "PV" }, l)).toMatchObject({ ok: true, nature: "PV" });
    expect(validerFichier({ type: "text/html", taille: 10 }, l)).toMatchObject({ ok: false, status: 415 });
    expect(validerFichier({ type: "image/svg+xml", taille: 10 }, l)).toMatchObject({ ok: false, status: 415 });
    expect(validerFichier({ type: "image/png", taille: 16 * 1024 * 1024 }, l)).toMatchObject({ ok: false, status: 413 });
    expect(validerFichier({ type: "application/pdf", taille: 31 * 1024 * 1024 }, l)).toMatchObject({ ok: false, status: 413 });
    expect(validerFichier({ type: "video/mp4", taille: 201 * 1024 * 1024 }, l)).toMatchObject({ ok: false, status: 413 });
    expect(validerFichier({ type: "image/png", taille: 5 * 1024 * 1024 }, limites({ FICHIERS_MAX_PHOTO_MO: "4" }))).toMatchObject({ ok: false, status: 413 });
  });
  it("dépôt, preuve de point, lecture réservée aux membres du projet", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    const depot = await b.membre(client.cookie, "PUT", `${b.projetId}/fichiers`, photo(2048));
    expect(depot.status).toBe(200);
    const f = depot.json.fichier;
    expect(f).toMatchObject({ nom: "fouille 1.jpg", nature: "PHOTO", taille: 2048 });
    expect([...b.r2.objets.keys()][0]).toBe(`projets/${b.projetId}/${f.id}`); // pas de nom de fichier dans la clé

    expect((await b.membre(client.cookie, "PATCH", `${b.projetId}/jalons/${FOUILLE}`, { corps: { point: { id: "c2", fait: true, preuveIds: [f.id] } } })).status).toBe(200);

    const lu = await b.membre(client.cookie, "GET", `${b.projetId}/fichiers/${f.id}`);
    expect(lu.status).toBe(200);
    expect(lu.res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await lu.res.arrayBuffer()).byteLength).toBe(2048);
    expect((await b.membre("", "GET", `${b.projetId}/fichiers/${f.id}`)).status).toBe(401);
  });
  it("refus : type hors liste blanche, taille, prestataire hors de ses jalons, stockage non activé", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    const labo = await b.inviter("LABORATOIRE");
    expect((await b.membre(client.cookie, "PUT", `${b.projetId}/fichiers`, photo(100, "text/html"))).status).toBe(415);
    expect((await b.membre(client.cookie, "PUT", `${b.projetId}/fichiers`, { ...photo(16), entetes: { ...photo(16).entetes, "content-length": String(16 * 1024 * 1024) } })).status).toBe(413);
    expect((await b.membre(labo.cookie, "PUT", `${b.projetId}/fichiers`, photo(16))).status).toBe(403);
    expect(b.r2.objets.size).toBe(0);
    const sans = await banc(false);
    const c2 = await sans.inviter("CLIENT");
    expect((await sans.membre(c2.cookie, "PUT", `${sans.projetId}/fichiers`, photo(16))).json).toMatchObject({ ok: false, error: "stockage_non_active" });
  });
});

describe("espace projet : documents types et signatures", () => {
  it("valeurs filtrées selon le modèle", () => {
    const m = MINI.modeles[0];
    expect(filtrerValeurs(m, { date: "2026-10-13", conforme: true, avis: "INCONNU", pirate: "x", obs: "<b>RAS</b>", mesures: [["Semelle S1", "5"], ["", ""]] }))
      .toEqual({ date: "2026-10-13", conforme: true, obs: "RAS", mesures: [["Semelle S1", "5"]] });
    expect(filtrerValeurs(m, "x")).toBeNull();
  });
  it("PV : rédaction par les intervenants, signature horodatée par rôle, verrouillage après signature", async () => {
    const b = await banc();
    const entreprise = await b.inviter("ENTREPRISE");
    const client = await b.inviter("CLIENT");
    const archi = await b.inviter("ARCHITECTE");
    const docs = `${b.projetId}/jalons/${FERRAILLAGE}/documents`;
    expect((await b.membre(client.cookie, "POST", docs, { corps: { modeleId: "PV_FERRAILLAGE" } })).status).toBe(403);
    expect((await b.membre(entreprise.cookie, "POST", docs, { corps: { modeleId: "PV_AUTRE" } })).status).toBe(400);
    const cree = await b.membre(entreprise.cookie, "POST", docs, { corps: { modeleId: "PV_FERRAILLAGE", valeurs: { date: "2026-10-13", avis: "FAVORABLE" } } });
    expect(cree.status).toBe(200);
    const id = cree.json.document.id;
    expect((await b.membre(client.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } })).status).toBe(403);
    const s1 = await b.membre(entreprise.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } });
    expect(s1.json.document).toMatchObject({ statut: "BROUILLON", signatures: [{ role: "ENTREPRISE", nom: "Test QA ENTREPRISE" }] });
    expect(s1.json.document.signatures[0].le).toMatch(/^2026-10-13T/);
    expect((await b.membre(entreprise.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } })).status).toBe(409);
    expect((await b.membre(entreprise.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { valeurs: { avis: "RESERVES" } } })).json.error).toBe("document_signe");
    const s2 = await b.membre(archi.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } });
    expect(s2.json.document.statut).toBe("SIGNE");
    const liste = await b.membre(client.cookie, "GET", docs);
    expect(liste.json.documents[0].signatures).toHaveLength(2);
  });
  it("signature pure : rôle non signataire refusé, administration acceptée", () => {
    const m = MINI.modeles[0];
    expect(signer(m, [], { kind: "membre", id: "pm_x", projetId: "p", role: "LABORATOIRE", nom: "Test QA" })).toMatchObject({ ok: false, status: 403 });
    expect(signer(m, [], { kind: "admin", email: "qa-test@example.test" })).toMatchObject({ ok: true, statut: "BROUILLON" });
  });
});

describe("espace projet : back-office", () => {
  it("création : dossier existant requis, caractéristiques validées, journal", async () => {
    const b = await banc();
    const inst = instantane(VILLA, R, {});
    expect((await b.admin("POST", "", { dossierId: "dos_inconnu", titre: "X Y", caracteristiques: VILLA, referentielVersion: "v", ...inst })).status).toBe(404);
    expect((await b.admin("POST", "", { titre: "X Y", caracteristiques: { ...VILLA, type: "CHATEAU" }, referentielVersion: "v", ...inst })).status).toBe(400);
    expect((await b.admin("GET", "")).json.projets).toHaveLength(1);
    const j = await b.admin("GET", `${b.projetId}/journal`);
    expect(j.json.evenements[0]).toMatchObject({ action: "projet_cree", auteur: "admin:qa-test@example.test" });
    const vue = await b.admin("GET", b.projetId);
    expect(vue.json.moi).toMatchObject({ superviseur: true, role: "ADMIN_CITURBAREA" });
    expect(vue.json.projet.phases).toEqual({ "84_FONDATIONS": "Fondations", "86_PLANCHER": "Plancher" });
  });
  it("seul un superviseur invite ; un client ne peut pas", async () => {
    const b = await banc();
    const client = await b.inviter("CLIENT");
    expect((await b.membre(client.cookie, "POST", `${b.projetId}/membres`, { corps: { role: "ENTREPRISE", nom: "Test QA" } })).status).toBe(403);
    const archi = await b.inviter("ARCHITECTE");
    const r = await b.membre(archi.cookie, "POST", `${b.projetId}/membres`, { corps: { role: "ENTREPRISE", nom: "Test QA BTP" } });
    expect(r.status).toBe(200);
    expect(r.json.emailEnvoye).toBe(false); // pas de RESEND_API_KEY : aucun e-mail
  });
});

// ── GP3 : checklists de chantier = PV numériques, points d'arrêt déblocables ──

const PORTE = "84_FONDATIONS.FON.10";
const MINI_GP3: FichierReferentiel = {
  ...MINI,
  jalons: [{ code: PORTE, phase: "84_FONDATIONS", lot: "FON", ordre: 10, titre: "Réception des armatures avant bétonnage", objectif: "O", acteurs: ["ENTREPRISE", "BET_STRUCTURE"], validateurs: ["ARCHITECTE"], exigences: [], checklist: [{ id: "c1", texte: "t", moment: "EXECUTION", responsable: "ENTREPRISE" }], documents: [], pointArret: true }],
};

describe("GP3 — PV de chantier et points d'arrêt", () => {
  it("le PV de la checklist est proposé dans le jalon, avec critère, norme, méthode, contrôleur, verdict, photos, réserves, décision", async () => {
    const b = await banc(true, { r: fusionner([MINI_GP3]), mini: MINI_GP3 });
    const j = await b.admin("GET", `${b.projetId}/jalons/${PORTE}`);
    expect(j.status).toBe(200);
    const pv = (j.json.modeles as Array<Record<string, any>>).find((m) => m.id === "CL04_FONDATIONS_AVANT_COULAGE")!;
    expect(pv).toBeTruthy();
    const champs = pv.sections.flatMap((x: any) => x.champs);
    expect(champs.find((c: any) => c.id.endsWith(".verdict")).libelle).toMatch(/Critère.*Norme.*Méthode.*Contrôleur/);
    expect(champs.some((c: any) => c.type === "photo")).toBe(true);
    expect(champs.some((c: any) => c.id === "reserves" && c.type === "tableau")).toBe(true);
    expect(champs.some((c: any) => c.id === "decision")).toBe(true);
    expect(pv.signataires).toEqual(expect.arrayContaining(["ENTREPRISE", "BET_STRUCTURE", "BUREAU_CONTROLE", "ARCHITECTE"]));
    expect(j.json.pvRequis).toEqual([expect.objectContaining({ code: "CL04_FONDATIONS_AVANT_COULAGE", etat: "ABSENT" })]);
  });

  it("point d'arrêt : pas de validation sans PV signé non refusé ; signé « autorisé » → validation possible", async () => {
    const b = await banc(true, { r: fusionner([MINI_GP3]), mini: MINI_GP3 });
    const archi = await b.inviter("ARCHITECTE");
    const url = `${b.projetId}/jalons/${PORTE}`;
    const refus = await b.membre(archi.cookie, "PATCH", url, { corps: { statut: "VALIDE" } });
    expect(refus.status).toBe(409);
    expect(refus.json).toMatchObject({ error: "pv_point_arret_manquant", pv: ["CL04_FONDATIONS_AVANT_COULAGE"] });
    const cree = await b.membre(archi.cookie, "POST", `${url}/documents`, { corps: { modeleId: "CL04_FONDATIONS_AVANT_COULAGE", valeurs: { date: "2026-10-15", decision: "Autorisé à poursuivre (point d'arrêt levé)", "CL04_FONDATIONS_AVANT_COULAGE.01.verdict": "Conforme" } } });
    expect(cree.status).toBe(200);
    const id = cree.json.document.id;
    for (const role of ["ENTREPRISE", "BET_STRUCTURE", "BUREAU_CONTROLE"]) {
      const m = await b.inviter(role);
      expect((await b.membre(m.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } })).status).toBe(200);
    }
    expect((await b.membre(archi.cookie, "PATCH", `${b.projetId}/documents/${id}`, { corps: { signer: true } })).json.document.statut).toBe("SIGNE");
    expect((await b.membre(archi.cookie, "PATCH", url, { corps: { statut: "VALIDE" } })).status).toBe(200);
  });

  it("déblocage par l'administrateur seulement, motif écrit obligatoire, journalisé (projet et dossier)", async () => {
    const dossier: Array<{ action: string; det: Record<string, unknown> }> = [];
    const b = await banc(true, { r: fusionner([MINI_GP3]), mini: MINI_GP3 }, (_d, _a, action, det) => dossier.push({ action, det }));
    const archi = await b.inviter("ARCHITECTE");
    const url = `${b.projetId}/jalons/${PORTE}`;
    expect((await b.membre(archi.cookie, "PATCH", url, { corps: { debloquer: { motif: "PV papier signé" } } })).status).toBe(403);
    expect((await b.admin("PATCH", url, { debloquer: { motif: "  " } })).status).toBe(400);
    const ok = await b.admin("PATCH", url, { debloquer: { motif: "Visite faite, PV signé sur papier le 14/10 (appelez 0612345678)" } });
    expect(ok.status).toBe(200);
    expect(ok.json.deblocage.motif).not.toMatch(/0612345678/);
    expect(b.mem.jalons.get(`${b.projetId}|${PORTE}`)!.statut).toBe("VALIDE");
    const ev = b.mem.journal.find((e) => e.action === "point_arret_debloque")!;
    expect(ev.details).toMatchObject({ pvManquants: ["CL04_FONDATIONS_AVANT_COULAGE"] });
    expect(dossier).toEqual([expect.objectContaining({ action: "POINT_ARRET_DEBLOQUE" })]);
  });
});
