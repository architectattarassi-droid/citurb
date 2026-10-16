/**
 * Lot GP6 — l'étape = une page entière ; un seul endroit pour le dossier et ses échanges ;
 * un seul accès client (session client → espace projet).
 */
import { describe, expect, it } from "vitest";
import { infoEtape, messageRelance, roleProjetDuMetier, validerPlanning } from "../../../../../packages/contracts/src/gestion/etape";
import { appliquerActionEtape, evenementDeLEtape, lireActionEtape } from "../../../../../functions/_lib/etapeDossier";
import { echangesDuDossier, etapeDeLObjet } from "../../../../../functions/_lib/dossierEchanges";
import { dossierOuvertDuClient } from "../../../../../functions/_lib/clientDossier";
import { ouvrirProjetClient } from "../../../../../functions/_lib/projetsClient";

type Ligne = Record<string, unknown>;
function fauxSql(reponses: Array<[RegExp, Ligne[] | ((v: unknown[]) => Ligne[])]>) {
  const journal: Array<{ q: string; v: unknown[] }> = [];
  const sql = (async (s: TemplateStringsArray, ...v: unknown[]) => {
    const q = s.join("?");
    journal.push({ q, v });
    for (const [re, r] of reponses) if (re.test(q)) return typeof r === "function" ? r(v) : r;
    return [];
  }) as never;
  return { sql, journal };
}

describe("page d'étape : vocabulaire", () => {
  it("une étape du catalogue connaît sa phase, sa phase graphique, chantier ou non", () => {
    expect(infoEtape("12_APS")).toMatchObject({ phaseRef: "P02_ESQUISSE_APS", phaseGraphique: "APS", chantier: false, clientProposeMateriaux: false });
    expect(infoEtape("84_FONDATIONS")).toMatchObject({ phaseRef: "P08_GROS_OEUVRE_INFRASTRUCTURE", chantier: true, clientProposeMateriaux: true });
    expect(infoEtape("14_APD")?.clientProposeMateriaux).toBe(true);
    expect(infoEtape("GP_MAJ_DEXE")?.phaseGraphique).toBe("EXE");
    expect(infoEtape("P04_AUTORISATION")?.code).toBe("30_DOSSIER_AUTORISATION");
    expect(infoEtape("../../etc")).toBeNull();
    expect(infoEtape("99_INCONNUE")).toBeNull();
  });
  it("relance préremplie : contexte de l'étape et liste des pièces manquantes (FR/AR)", () => {
    const m = messageRelance({ titreEtape: "APD", titreDossier: "Villa Test", manquantes: ["Titre foncier", "Note de renseignements"] });
    expect(m.sujet).toBe("Villa Test — APD : pièces manquantes");
    expect(m.texte).toMatch(/il nous manque :\n- Titre foncier\n- Note de renseignements/);
    expect(messageRelance({ titreEtape: "APD", titreDossier: "V", manquantes: ["x"], langue: "ar" }).texte).toMatch(/تنقصنا/);
  });
  it("planning validé, rôle d'un pro dans l'espace projet selon son métier", () => {
    expect(validerPlanning({ datePrevueDebut: "2026-11-01", datePrevueFin: "2026-10-01" })).toEqual({ erreur: "fin_avant_debut" });
    expect(roleProjetDuMetier("ENTREPRISE_GO")).toBe("ENTREPRISE");
    expect(roleProjetDuMetier("CONTROLE_TECHNIQUE")).toBe("BUREAU_CONTROLE");
    expect(roleProjetDuMetier("FOURNISSEUR_MATERIAUX")).toBeNull();
    expect(lireActionEtape({ action: "intervenant_ajouter", proId: "pas un id" })).toEqual({ erreur: "intervenant_invalide" });
  });
  it("journal de l'étape : actions de l'étape, de ses pièces et de sa phase", () => {
    expect(evenementDeLEtape({ code: "14_APD" }, "14_APD", "P03_APD_ETUDES")).toBe(true);
    expect(evenementDeLEtape({ cle: "P03_APD_ETUDES:PLANS" }, "14_APD", "P03_APD_ETUDES")).toBe(true);
    expect(evenementDeLEtape({ cle: "P04_AUTORISATION:PLANS" }, "14_APD", "P03_APD_ETUDES")).toBe(false);
  });
});

describe("intervenants de l'étape", () => {
  it("un prestataire validé rejoint l'étape et l'espace projet avec son rôle ; lien rendu à l'admin seulement", async () => {
    let payload: Ligne = {};
    const { sql, journal } = fauxSql([
      [/^SELECT "payload" FROM "Dossier"/, () => [{ payload }]],
      [/FROM "Fournisseur"/, [{ id: "frn_abc12345", raisonSociale: "Gros Œuvre Test SARL", metier: "ENTREPRISE_GO", telephone: "+212600000000", email: "qa-test@example.test" }]],
      [/FROM "Projet"/, [{ un: 1 }]],
      [/^UPDATE "Dossier" SET "payload"/, (v) => { payload = JSON.parse(String(v[0])); return []; }],
      [/to_regclass/, [{ d: true, u: true, c: true, e: true, j: true, col: true }]],
    ]);
    const a = lireActionEtape({ action: "intervenant_ajouter", proId: "frn_abc12345", projetId: "prj_abcdefgh12" });
    if ("erreur" in a) throw new Error(a.erreur);
    const r = await appliquerActionEtape(sql, "dos_1", "84_FONDATIONS", a, "admin@test", "2026-10-16T10:00:00.000Z");
    expect(r.status).toBe(200);
    expect(r.json.lienProjet).toMatch(/^\/projet\//);
    const i = ((payload.gestion as Ligne).etapes as Record<string, { intervenants: Ligne[] }>)["84_FONDATIONS"].intervenants[0];
    expect(i).toMatchObject({ genre: "prestataire", role: "ENTREPRISE", nom: "Gros Œuvre Test SARL" });
    expect(JSON.stringify(i)).not.toMatch(/600000000|example\.test/);
    expect(journal.some((x) => x.q.includes('INSERT INTO "ProjetMembre"') && x.v.includes("ENTREPRISE"))).toBe(true);
    expect((await appliquerActionEtape(sql, "dos_1", "84_FONDATIONS", a, "admin@test")).status).toBe(409);
  });
});

describe("un seul endroit pour le dossier et ses échanges", () => {
  it("RDV orphelins rattachés si le client n'a qu'un dossier ouvert ; appels et messages du dossier et de ses RDV", async () => {
    const { sql, journal } = fauxSql([
      [/^SELECT "ownerId", "clientTel"/, [{ ownerId: "u1", clientTel: "0612345678" }]],
      [/to_regclass/, [{ r: true, a: true, c: true }]],
      [/count\(\*\)::int AS n FROM "Dossier"/, [{ n: 1 }]],
      [/FROM "RendezVous"/, [{ id: "rdv_1", debut: "2026-10-10T09:00:00Z", statut: "TERMINE", objet: "MAISON", dossierId: "dos_1" }]],
      [/FROM "DemandeAppel"/, [
        { id: "apl_1", contexte: "rdv", objetId: "rdv_1", statut: "TERMINEE", creneauRetenu: null, createdAt: "2026-10-09", sujet: "Visio" },
        { id: "apl_2", contexte: "dossier", objetId: "dos_1:14_APD", statut: "EN_ATTENTE", creneauRetenu: null, createdAt: "2026-10-16", sujet: "APD" },
      ]],
      [/FROM "Conversation"/, []],
    ]);
    const e = await echangesDuDossier(sql, "dos_1");
    expect(journal.some((x) => x.q.startsWith('UPDATE "RendezVous" SET "dossierId"'))).toBe(true);
    expect(e.rendezVous[0]).toMatchObject({ id: "rdv_1", rattacheIci: true });
    expect(e.appels.map((a) => a.etape)).toEqual([null, "14_APD"]);
    expect(etapeDeLObjet("dos_1:84_FONDATIONS", "dos_1")).toBe("84_FONDATIONS");
  });
  it("plusieurs dossiers ouverts : pas de rattachement automatique (dédoublonnage prudent)", async () => {
    const { sql, journal } = fauxSql([
      [/^SELECT "ownerId", "clientTel"/, [{ ownerId: "u1", clientTel: "0612345678" }]],
      [/to_regclass/, [{ r: true, a: false, c: false }]],
      [/count\(\*\)::int AS n FROM "Dossier"/, [{ n: 2 }]],
    ]);
    await echangesDuDossier(sql, "dos_1");
    expect(journal.some((x) => x.q.startsWith('UPDATE "RendezVous"'))).toBe(false);
  });
  it("un RDV réutilise le dossier ouvert du client au lieu d'en créer un second", async () => {
    const { sql } = fauxSql([[/FROM "Dossier" WHERE "ownerId"/, [{ id: "dos_exist" }]]]);
    expect(await dossierOuvertDuClient(sql, "u1", { jours: 365 })).toBe("dos_exist");
  });
});

describe("un seul accès client", () => {
  it("la session client ouvre l'espace projet de SON dossier (membre client créé), pas un autre", async () => {
    const { sql, journal } = fauxSql([
      [/to_regclass\('public."Projet"'\)/, [{ ok: true }]],
      [/FROM "Projet" WHERE "dossierId" = ANY/, [{ id: "prj_abcdefgh12", titre: "Villa", dossierId: "dos_1" }]],
      [/FROM "ProjetMembre" WHERE "projetId"/, []],
      [/FROM "User"/, [{ username: "Test QA" }]],
    ]);
    const env = { PROJET_SESSION_SECRET: "s".repeat(40) };
    const r = await ouvrirProjetClient(sql, env, { clientId: "u1", dossierIds: ["dos_1"] }, "prj_abcdefgh12", "2026-10-16T10:00:00.000Z");
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^projet_session=p1\./);
    expect(journal.some((x) => x.q.includes('INSERT INTO "ProjetMembre"') && x.v.includes("CLIENT"))).toBe(true);
    expect((await ouvrirProjetClient(sql, env, { clientId: "u1", dossierIds: ["dos_1"] }, "prj_zzzzzzzz99")).status).toBe(404);
  });
});
