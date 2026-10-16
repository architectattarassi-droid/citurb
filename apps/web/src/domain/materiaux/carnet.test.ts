/** Carnet des matériaux du projet : propositions client (à partir de l'APD), décisions de l'architecte, isolement des dossiers. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CATALOGUE } from "./catalogue";
import { aValider, carnetValide, lireDecision, lireProposition, proposableEnPhase, transitionPermise } from "./carnet";
import { rechercherMateriaux } from "./recherche";
import { messageDecision, proposer, statuer, vueLigne } from "../../../../../functions/_lib/carnetMateriaux";
import * as routeClient from "../../../../../functions/api/client/dossiers/[id]/materiaux";

// ── base en mémoire (gabarits SQL reconnus par leur texte) ──
function fausseBase(phase: string) {
  const lignes: Record<string, unknown>[] = [];
  const journal: Record<string, unknown>[] = [];
  const sql = async (s: TemplateStringsArray, ...v: unknown[]) => {
    const t = s.join("?");
    if (t.includes("to_regclass")) return [{ c: true, j: true }];
    if (t.includes(`FROM "Dossier" WHERE`)) return v[0] === "dos_1" || v[0] === "dos_2" ? [{ id: v[0], phase }] : [];
    if (t.includes(`INSERT INTO "DossierMateriau"`)) {
      const [id, dossierId, etapeCode, source, refId, code, nom, categorie, lot, emplacement, unite, quantite, prixIndicatif, note, origine, proposePar, auteur, statut, createdAt] = v;
      const l = { id, dossierId, etapeCode, source, refId, code, nom, categorie, lot, emplacement, unite, quantite, prixIndicatif, note, origine, proposePar, auteur, statut, createdAt };
      lignes.push(l);
      return [l];
    }
    if (t.includes(`INSERT INTO "DossierEvenement"`)) { journal.push({ dossierId: v[1], auteur: v[2], action: v[3], details: JSON.parse(String(v[4])) }); return []; }
    if (t.includes(`SELECT * FROM "DossierMateriau" WHERE "id"`)) return lignes.filter((l) => l.id === v[0] && l.dossierId === v[1]);
    if (t.includes(`UPDATE "DossierMateriau"`)) {
      const l = lignes.find((x) => x.id === v[6] && x.dossierId === v[7]);
      if (!l) return [];
      Object.assign(l, { statut: v[0], motif: v[1], varianteCode: v[2], decidePar: v[3], decideLe: v[4] });
      return [l];
    }
    return [];
  };
  return { sql, lignes, journal };
}

describe("phase du dossier", () => {
  it("le client ne propose qu'à partir de l'avant-projet détaillé", () => {
    expect(proposableEnPhase("12_APS")).toBe(false);
    expect(proposableEnPhase("10_ESQUISSE")).toBe(false);
    expect(proposableEnPhase("14_APD")).toBe(true);
    expect(proposableEnPhase("34_PERMIS_CONSTRUIRE")).toBe(true);
    expect(proposableEnPhase("80_OUVERTURE_CHANTIER")).toBe(true);
    expect(proposableEnPhase(null)).toBe(false);
    expect(proposableEnPhase("PHASE_INCONNUE")).toBe(false);
  });
});

describe("entrées", () => {
  it("proposition : code du catalogue, nom, unité et prix repris du catalogue (jamais du client)", () => {
    const r = lireProposition({ code: "cit-rev-020", lot: "RSO", quantite: "42", nom: "faux nom", prixIndicatif: 1 });
    expect(r.ok && r.v).toMatchObject({ code: "CIT-REV-020", lot: "RSO", quantite: 42, unite: "m2" });
    expect(r.ok && r.v.nom).not.toBe("faux nom");
    expect(lireProposition({ code: "CIT-ZZ-999" })).toEqual({ ok: false, erreur: "code_inconnu" });
    expect(lireProposition({ code: "CIT-GO-008", lot: "XYZ" })).toEqual({ ok: false, erreur: "lot_invalide" });
    expect(lireProposition({ code: "CIT-GO-008", quantite: -3 })).toEqual({ ok: false, erreur: "quantite_invalide" });
  });
  it("décision : motif obligatoire pour un refus, variante différente et connue, transitions", () => {
    const actuel = { statut: "PROPOSE" as const, code: "CIT-REV-020" };
    expect(lireDecision({ statut: "REFUSE" }, actuel)).toEqual({ ok: false, erreur: "motif_obligatoire" });
    expect(lireDecision({ statut: "VARIANTE_PROPOSEE", varianteCode: "CIT-REV-020" }, actuel)).toEqual({ ok: false, erreur: "variante_identique" });
    expect(lireDecision({ statut: "VARIANTE_PROPOSEE", varianteCode: "CIT-REV-019" }, actuel).ok).toBe(true);
    expect(lireDecision({ statut: "PROPOSE" }, actuel)).toEqual({ ok: false, erreur: "statut_invalide" });
    expect(transitionPermise("VALIDE", "REFUSE")).toBe(false);
    expect(transitionPermise("VALIDE", "EN_ETUDE")).toBe(true);
  });
});

describe("serveur", () => {
  it("refus avant l'APD (409 avant_apd), aucune ligne écrite", async () => {
    const b = fausseBase("12_APS");
    const e = lireProposition({ code: "CIT-REV-020" });
    if (!e.ok) throw new Error();
    const r = await proposer(b.sql, "dos_1", e.v, { genre: "client", clientId: "usr_1" });
    expect(r).toEqual({ ok: false, status: 409, erreur: "avant_apd" });
    expect(b.lignes).toHaveLength(0);
  });

  it("proposition en APD : statut PROPOSE, coordonnées masquées, journalisée ; jamais au carnet sans validation", async () => {
    const b = fausseBase("14_APD");
    const e = lireProposition({ code: "CIT-REV-020", lot: "RSO", emplacement: "sol séjour", quantite: 40, note: "Vu chez un négociant, appelez-moi au 0661234567" });
    if (!e.ok) throw new Error();
    const r = await proposer(b.sql, "dos_1", e.v, { genre: "client", clientId: "usr_1" });
    expect(r.ok && r.ligne).toMatchObject({ statut: "PROPOSE", proposePar: "CLIENT", lot: "RSO" });
    expect(r.ok && r.ligne.note).not.toMatch(/0661234567/);
    expect(b.journal[0]).toMatchObject({ action: "MATERIAU_PROPOSE", dossierId: "dos_1" });
    expect(carnetValide(b.lignes.map(vueLigne))).toHaveLength(0);
    expect(aValider(b.lignes.map(vueLigne))).toBe(1);
  });

  it("décision de l'architecte journalisée avec son auteur ; message au client sans coordonnée", async () => {
    const b = fausseBase("40_DOSSIER_EXECUTION");
    const e = lireProposition({ code: "CIT-REV-020" });
    if (!e.ok) throw new Error();
    const p = await proposer(b.sql, "dos_1", e.v, { genre: "client", clientId: "usr_1" });
    if (!p.ok) throw new Error();
    const d = await statuer(b.sql, "dos_1", p.ligne.id, { statut: "VALIDE" }, "architecte@citurbarea.com");
    expect(d.ok && d.ligne.statut).toBe("VALIDE");
    expect(b.journal.at(-1)).toMatchObject({ action: "MATERIAU_STATUE", auteur: "architecte@citurbarea.com", details: { de: "PROPOSE", vers: "VALIDE" } });
    expect(carnetValide(b.lignes.map(vueLigne))).toHaveLength(1);
    expect(d.ok && messageDecision(d.ligne)).toMatch(/validée par l'architecte/);
    // Une ligne d'un autre dossier n'est jamais statuée par erreur.
    expect(await statuer(b.sql, "dos_2", p.ligne.id, { statut: "REFUSE", motif: "hors budget" }, "a@b.c")).toEqual({ ok: false, status: 404, erreur: "not_found" });
  });

  it("route client : dossier d'un autre client → 404 ; le client ne peut jamais statuer (aucune route PATCH)", async () => {
    const ctx = (id: string) => ({
      request: new Request(`https://x.test/api/client/dossiers/${id}/materiaux`, { method: "POST", body: JSON.stringify({ code: "CIT-GO-008" }), headers: { "content-type": "application/json" } }),
      env: { DATABASE_URL: "postgres://x" }, params: { id }, data: { client: { clientId: "usr_1", dossierIds: ["dos_1"] } },
    });
    const r = await routeClient.onRequestPost(ctx("dos_2"));
    expect(r.status).toBe(404);
    const g = await routeClient.onRequestGet({ ...ctx("dos_2"), request: new Request("https://x.test/api/client/dossiers/dos_2/materiaux") });
    expect(g.status).toBe(404);
    expect((routeClient as Record<string, unknown>).onRequestPatch).toBeUndefined();
    expect((routeClient as Record<string, unknown>).onRequest).toBeUndefined();
    expect((await routeClient.onRequestPost({ ...ctx("dos_1"), data: {} as never })).status).toBe(401);
  });
});

describe("recherche et référentiel", () => {
  it("filtres texte, lot du chiffrage et phase d'achat ; codes créés en modération inclus", () => {
    const rso = rechercherMateriaux({ lot: "RSO", limite: 200 });
    expect(rso.resultats.some((r) => r.code === "CIT-REV-020")).toBe(true);
    expect(rso.resultats.every((r) => r.lots.includes("RSO"))).toBe(true);
    const ciment = rechercherMateriaux({ texte: "ciment" }).resultats;
    expect(ciment[0].nom.fr.toLowerCase()).toMatch(/^ciment/);
    expect(rechercherMateriaux({ phase: "RESEAUX", limite: 200 }).resultats.every((r) => r.phasesAchat.includes("RESEAUX"))).toBe(true);
    const dyn = rechercherMateriaux({ texte: "effet marbre" }, { dynamiques: [{ code: "CIT-REV-901", libelleFr: "Grès effet marbre", categorie: "REVETEMENT", famille: "Carrelage", uniteRef: "m2" }] });
    expect(dyn.resultats[0]).toMatchObject({ code: "CIT-REV-901", prixReference: null, slug: null });
  });

  it("le SQL d'amorçage contient chaque code actif du catalogue (relancer scripts/sql-referentiel-materiaux.mjs sinon)", () => {
    const sql = readFileSync(new URL("../../../../../docs/sql/materiaux-referentiel-amorcage.sql", import.meta.url), "utf8");
    const actifs = CATALOGUE.filter((r) => r.actif !== false);
    for (const r of actifs) expect(sql, r.code).toContain(`('${r.code}', `);
    expect((sql.match(/\('CIT-/g) || []).length).toBe(actifs.length);
    expect(sql).toMatch(/ON CONFLICT \("code"\) DO NOTHING/);
  });
});
