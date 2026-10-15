/**
 * Lot GP2 — documents attendus par phase (« Document manquant », compteurs,
 * conditions), normes par lot, dépôt commun et droits (admin, client, intervenant).
 */
import { describe, expect, it } from "vitest";
import { documentsParPhase, normesDeLaPhase, piecesDeLaPhase, pieceConnue, type EtatPiece } from "../../../../../packages/contracts/src/gestion/pieces";
import { ordreRegional } from "../../../../../packages/contracts/src/gestion/ordres";
import { validerDocument, nomDocument, depotDocumentsMemoire } from "../../../../../functions/_lib/documents";
import { appliquerActionPiece, lireActionPiece, lirePieces, peutDeposer } from "../../../../../functions/_lib/dossierPieces";

const VILLA = { type: "VILLA" as const, budgetMDH: 3, etagesHorsSol: 1, sousSols: 0, surfacePlancherM2: 300 };
const IMMEUBLE = { type: "IMMEUBLE" as const, budgetMDH: 12, etagesHorsSol: 5, sousSols: 1, surfacePlancherM2: 2000, ascenseur: true };

describe("GP2 — pièces attendues", () => {
  it("chaque phase P00…P14 a sa liste ; tout est « manquant » au départ, avec un compteur", () => {
    const phases = documentsParPhase(VILLA, new Map());
    expect(phases).toHaveLength(15);
    const p04 = phases.find((p) => p.code === "P04_AUTORISATION")!;
    expect(p04.pieces.length).toBeGreaterThan(5);
    expect(p04.pieces.every((p) => p.statut === "MANQUANT")).toBe(true);
    expect(p04.compteur.manquantes).toBe(p04.compteur.attendues);
  });
  it("conditionnelles : bureau de contrôle et assurances selon le budget et la taille", () => {
    const codes = (profil: typeof VILLA | typeof IMMEUBLE) => documentsParPhase(profil, new Map()).flatMap((p) => p.pieces.map((x) => x.code));
    const villa = codes(VILLA), imm = codes(IMMEUBLE);
    const ctc = imm.filter((c) => /CONTROLE/.test(c) && !villa.includes(c));
    expect(ctc.length).toBeGreaterThan(0);
    expect(imm.some((c) => /ASCENSEUR/.test(c))).toBe(true);
    expect(villa.some((c) => /ASCENSEUR/.test(c))).toBe(false);
  });
  it("le visa porte l'ordre régional compétent", () => {
    const v = piecesDeLaPhase("P04_AUTORISATION", VILLA, ordreRegional({ commune: "Kénitra" })).find((p) => p.code === "VISA_ORDRE_REGIONAL");
    expect(v?.detail).toMatch(/Ordre des architectes de Kénitra/);
  });
  it("lot par lot : livrables d'études rangés sous leur lot, le général d'abord", () => {
    const p03 = piecesDeLaPhase("P03_APD_ETUDES", IMMEUBLE);
    expect(p03[0].lot).toBe("GENERAL");
    expect(new Set(p03.map((p) => p.lot)).size).toBeGreaterThan(2);
  });
  it("le client ne voit pas les pièces réservées au back-office ni les normes", () => {
    const admin = documentsParPhase(VILLA, new Map()).flatMap((p) => p.pieces);
    const client = documentsParPhase(VILLA, new Map(), { client: true });
    expect(admin.some((p) => p.backOffice)).toBe(true);
    expect(client.flatMap((p) => p.pieces).some((p) => p.backOffice)).toBe(false);
    expect(client.every((p) => p.normes.length === 0)).toBe(true);
  });
  it("statuts fusionnés : déposé, validé, refusé (compté manquant), sans objet (hors compte)", () => {
    const [a, b, c, d] = piecesDeLaPhase("P04_AUTORISATION", VILLA);
    const e = (statut: EtatPiece["statut"], motif: string | null = null): EtatPiece => ({ statut, motif, documentIds: ["doc_x"], deposePar: null, deposeLe: null, validePar: null, valideLe: null });
    const ph = documentsParPhase(VILLA, new Map([[a.cle, e("DEPOSE")], [b.cle, e("VALIDE")], [c.cle, e("REFUSE", "illisible")], [d.cle, e("SANS_OBJET", "pas de démolition")]]))
      .find((p) => p.code === "P04_AUTORISATION")!;
    expect(ph.compteur.deposees).toBe(1);
    expect(ph.compteur.validees).toBe(1);
    expect(ph.compteur.refusees).toBe(1);
    expect(ph.compteur.sansObjet).toBe(1);
    expect(ph.compteur.manquantes).toBe(ph.compteur.attendues - 2);
  });
  it("normes par lot : préparation des documents et exécution séparées", () => {
    const n = normesDeLaPhase("P08_GROS_OEUVRE_INFRASTRUCTURE");
    expect(n.length).toBeGreaterThan(0);
    const toutes = n.flatMap((l) => l.normes);
    expect(toutes.some((x) => x.execution.length > 0)).toBe(true);
  });
});

describe("GP2 — dépôt commun", () => {
  const pdf = (corps = "") => new TextEncoder().encode(`%PDF-1.4\n${corps}\n%%EOF`);
  it("PDF accepté, PDF actif refusé, type inconnu refusé, nom sans coordonnées", () => {
    expect(validerDocument(pdf(), "plan.pdf")).toMatchObject({ ok: true, doc: { type: "application/pdf", nom: "plan.pdf" } });
    expect(validerDocument(pdf("/JavaScript (alert)"), "x.pdf")).toEqual({ ok: false, error: "pdf_actif_refuse" });
    expect(validerDocument(new TextEncoder().encode("<svg/>"), "x.svg")).toMatchObject({ ok: false });
    expect(nomDocument("appelez 0612345678.pdf", "application/pdf")).not.toMatch(/0612345678/);
  });
  it("droits de dépôt : client = ses pièces, intervenant = son rôle, back-office jamais hors admin", () => {
    const p = { producteur: "MAITRE_OUVRAGE", backOffice: false };
    expect(peutDeposer({ kind: "client", userId: "u" }, p)).toBe(true);
    expect(peutDeposer({ kind: "client", userId: "u" }, { producteur: "ARCHITECTE", backOffice: false })).toBe(false);
    expect(peutDeposer({ kind: "membre", id: "m", role: "BET_STRUCTURE", nom: "x", superviseur: false }, { producteur: "BET_STRUCTURE", backOffice: false })).toBe(true);
    expect(peutDeposer({ kind: "membre", id: "m", role: "ENTREPRISE", nom: "x", superviseur: false }, { producteur: "ENTREPRISE_LOT", backOffice: false })).toBe(true);
    expect(peutDeposer({ kind: "client", userId: "u" }, { producteur: "MAITRE_OUVRAGE", backOffice: true })).toBe(false);
  });
  it("actions : motif obligatoire pour refuser ou mettre sans objet", () => {
    expect(lireActionPiece({ action: "refuser", cle: "P04_AUTORISATION:PLANS_AUTORISATION" })).toEqual({ erreur: "motif_obligatoire" });
    expect(lireActionPiece({ action: "sans_objet", cle: "P04_AUTORISATION:PLANS_AUTORISATION", motif: "ok" })).toMatchObject({ action: "sans_objet" });
    expect(lireActionPiece({ action: "valider", cle: "pas une clé" })).toEqual({ erreur: "piece_invalide" });
  });
});

type Ligne = Record<string, unknown>;
function fauxSql(tables: { pieces: boolean }) {
  const lignes = new Map<string, Ligne>();
  const journal: string[] = [];
  const sql = (async (strings: TemplateStringsArray, ...v: unknown[]) => {
    const q = strings.join("?");
    journal.push(q);
    if (q.includes("to_regclass")) return [{ p: tables.pieces, d: tables.pieces, j: true }];
    if (q.startsWith('SELECT * FROM "Dossier"')) return [{ id: "dos_1", typologie: "VILLA", commune: "Kénitra", phase: "30_DOSSIER_AUTORISATION", budgetEstime: 2_000_000, payload: {} }];
    if (q.includes('FROM "DossierPiece" WHERE "dossierId"') && q.startsWith("SELECT")) return [...lignes.values()];
    if (q.startsWith('INSERT INTO "DossierPiece"')) { lignes.set(String(v[1]), { cle: v[1], statut: q.includes("'DEPOSE'") ? "DEPOSE" : v[2], documentIds: typeof v[4] === "string" && v[4].startsWith("[") ? JSON.parse(v[4]) : [] }); return []; }
    return [];
  }) as never;
  return { sql, lignes, journal };
}

describe("GP2 — dossier (base simulée)", () => {
  it("sans le SQL collé : lecture complète (tout manquant), dépôt refusé proprement", async () => {
    const { sql } = fauxSql({ pieces: false });
    const r = await lirePieces(sql, "dos_1");
    expect(r?.sqlACollerGestion).toBe(true);
    expect(r?.phaseActuelle).toBe("P04_AUTORISATION");
    expect(r?.phases.flatMap((p) => p.pieces).every((p) => p.statut === "MANQUANT")).toBe(true);
    const a = lireActionPiece({ action: "deposer", cle: "P04_AUTORISATION:PLANS_AUTORISATION", nom: "p.pdf", contenu: btoa("%PDF-1.4\n%%EOF") });
    if ("erreur" in a) throw new Error(a.erreur);
    expect(await appliquerActionPiece(sql, "dos_1", a, { kind: "admin", email: "a" })).toEqual({ status: 503, json: { ok: false, error: "sql_a_coller", fichier: "docs/sql/gestion-projet-neon.sql" } });
  });
  it("dépôt par l'admin : document enregistré, pièce « déposée », journal", async () => {
    const { sql, lignes, journal } = fauxSql({ pieces: true });
    const docs = depotDocumentsMemoire();
    const a = lireActionPiece({ action: "deposer", cle: "P04_AUTORISATION:PLANS_AUTORISATION", nom: "plans.pdf", contenu: btoa("%PDF-1.4\n%%EOF") });
    if ("erreur" in a) throw new Error(a.erreur);
    const r = await appliquerActionPiece(sql, "dos_1", a, { kind: "admin", email: "a@b" }, { documents: docs, maintenant: "2026-10-15T10:00:00.000Z" });
    expect(r.status).toBe(200);
    expect(docs.lignes.size).toBe(1);
    expect(lignes.get("P04_AUTORISATION:PLANS_AUTORISATION")?.statut).toBe("DEPOSE");
    expect(journal.some((q) => q.includes('INSERT INTO "DossierEvenement"'))).toBe(true);
  });
  it("le client ne dépose pas une pièce de l'architecte et ne valide rien", async () => {
    const { sql } = fauxSql({ pieces: true });
    const a = lireActionPiece({ action: "deposer", cle: "P04_AUTORISATION:PLANS_AUTORISATION", nom: "p.pdf", contenu: btoa("%PDF-1.4\n%%EOF") });
    if ("erreur" in a) throw new Error(a.erreur);
    expect((await appliquerActionPiece(sql, "dos_1", a, { kind: "client", userId: "u" }, { documents: depotDocumentsMemoire() })).status).toBe(403);
    expect((await appliquerActionPiece(sql, "dos_1", { action: "valider", cle: "P04_AUTORISATION:PLANS_AUTORISATION" }, { kind: "client", userId: "u" })).status).toBe(403);
  });
  it("une pièce absente du profil (bureau de contrôle sous 5 MDH) est inconnue", () => {
    const tous = documentsParPhase(IMMEUBLE, new Map()).flatMap((p) => p.pieces).filter((p) => /CONTROLE/.test(p.code));
    const cle = tous.find((p) => !pieceConnue(p.cle, VILLA))?.cle;
    expect(cle).toBeTruthy();
  });
});
