/**
 * Cycle de vie d'un devis côté serveur (functions/_lib/devisDepot.ts), base simulée :
 * numérotation à l'émission seulement, recalcul serveur, figeage, révision -R2, expiration.
 */
import { describe, expect, it } from "vitest";
import { emettre, modifierBrouillon, reviser, statutEffectif } from "../../../../../../../functions/_lib/devisDepot";
import type { Sql } from "../../../../../../../functions/_lib/dossierAdmin";
import { entreeRenouvellement } from "../../../../domain/honoraires/devisComplet";
import { GRILLE_ARC_BATI_2026_10 } from "../../../../domain/honoraires/grilleArcBati";
import { validerEntreeDevis } from "../../../../domain/honoraires/validationEntree";

const DOSSIER = {
  clientNom: "Monsieur Rida MEHDAOUI", raisonSociale: null, ice: null, payload: { client: { type: "PERSONNE" }, missionsReglees: [{ code: "PERMIS_HABITER", libelle: "Permis d'habiter partiel", date: "2025-11-20" }] },
  title: "TEST — Construction d'un immeuble R+1", gabarit: "R+1", lot: "Lot n° 624", lotissement: "Lotissement Alliance Darna", commune: "Mehdiya", prefecture: "Kénitra",
  titreFoncier: "TF 84848/13", autorisationNum: "GUcmha-0036/2023", autDate: "2023-03-01", autExp: "2026-03-01", etatChantier: "Permis d'habiter partiel délivré pour le rez-de-chaussée",
  typologie: "IMMEUBLE", cabNom: "ARC-BATI ARCHITECTURE", cabArchi: "Yassine ATTARASSI", cabTitre: "Architecte DENA", cabOrdre: null, compteActif: false,
};

function base(devis: Record<string, unknown>) {
  const requetes: Array<{ texte: string; valeurs: unknown[] }> = [];
  const sql = (async (s: TemplateStringsArray, ...valeurs: unknown[]) => {
    const texte = s.join("?");
    requetes.push({ texte, valeurs });
    if (texte.includes('FROM "Devis" WHERE "id" =') && texte.includes("to_char")) return [devis];
    if (texte.includes('FROM "Dossier" d LEFT JOIN "Cabinet"')) return [DOSSIER];
    if (texte.includes('INSERT INTO "SequenceDocument"')) return [{ numero: "DEV-2026-0007" }];
    if (texte.includes('SELECT "numeroBase"')) return [{ numeroBase: "DEV-2026-0007" }];
    if (texte.includes('UPDATE "Devis" SET "numero"')) return [{ numero: "x" }];
    if (texte.includes("max(\"revision\")")) return [{ m: 1 }];
    return [];
  }) as unknown as Sql;
  return { sql, requetes };
}
const BROUILLON = { id: "dvs_1", dossierId: "dos_1", numero: null, revision: 1, devisOrigineId: null, type: "COMPLEMENTAIRE", presentation: "DETAILLEE", statut: "BROUILLON", grilleVersionId: "arc-bati-2026-10", dateEm: null, validiteJours: 30, entree: entreeRenouvellement() };

describe("émission", () => {
  it("numéro alloué dans la même instruction que le passage à EMIS, montants recalculés, document et empreinte figés", async () => {
    const { sql, requetes } = base(BROUILLON);
    const r = await emettre(sql, "dvs_1", "admin@test", "2026-10-15T09:00:00.000Z");
    expect(r.numero).toBe("DEV-2026-0007");
    expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
    const emission = requetes.find((q) => q.texte.includes('INSERT INTO "SequenceDocument"'))!;
    expect(emission.texte).toContain("'EMIS'");
    expect(emission.texte).toContain("FOR UPDATE");
    expect(emission.valeurs).toContain("5000.00");
    const doc = requetes.find((q) => q.texte.includes('SET "document"'))!;
    const document = JSON.parse(String(doc.valeurs[0]));
    expect(document.numero).toBe("DEV-2026-0007");
    expect(JSON.stringify(document)).toContain("Permis d'habiter partiel : réalisé et réglé");
    expect(JSON.stringify(document)).not.toMatch(/@|\+212|06\d{8}/);
  });
  it("refuse d'émettre un devis déjà émis", async () => {
    const { sql } = base({ ...BROUILLON, statut: "EMIS", numero: "DEV-2026-0001" });
    await expect(emettre(sql, "dvs_1", "a", "2026-10-15T09:00:00.000Z")).rejects.toMatchObject({ code: "devis_fige" });
  });
  it("refuse d'émettre un devis contenant une mission déjà réglée (règle 8)", async () => {
    const { sql } = base({ ...BROUILLON, entree: { ...entreeRenouvellement(), lignes: [{ code: "DEPOT_RENOUV" }, { code: "PERMIS_HABITER", prix: "3000" }] } });
    await expect(emettre(sql, "dvs_1", "a", "2026-10-15T09:00:00.000Z")).rejects.toMatchObject({ code: "devis_incomplet" });
  });
  it("révision émise : DEV-2026-0007-R2 sans consommer de numéro", async () => {
    const { sql, requetes } = base({ ...BROUILLON, id: "dvs_2", revision: 2, devisOrigineId: "dvs_1" });
    const r = await emettre(sql, "dvs_2", "a", "2026-10-16T09:00:00.000Z");
    expect(r.numero).toBe("DEV-2026-0007-R2");
    expect(requetes.some((q) => q.texte.includes("SequenceDocument"))).toBe(false);
    expect(requetes.some((q) => q.texte.includes('SET "remplacePar"'))).toBe(true);
  });
});

describe("figeage et révision", () => {
  it("un devis émis ne se modifie pas en place", async () => {
    const sql = (async () => []) as unknown as Sql;
    await expect(modifierBrouillon(sql, "dvs_1", entreeRenouvellement(), "2026-10-15T09:00:00.000Z")).rejects.toMatchObject({ code: "devis_fige" });
  });
  it("révision d'un devis émis : nouveau brouillon rang 2", async () => {
    const { sql, requetes } = base({ ...BROUILLON, statut: "EMIS", numero: "DEV-2026-0007" });
    await reviser(sql, "dvs_1", "a", "2026-10-16T09:00:00.000Z");
    const ins = requetes.find((q) => q.texte.includes('INSERT INTO "Devis"'))!;
    expect(ins.valeurs[2]).toBe(2);
    expect(ins.valeurs[3]).toBe("dvs_1");
  });
  it("expiration à la lecture (date d'émission + validité dépassée)", () => {
    expect(statutEffectif("EMIS", "2026-10-15", 30, "2026-11-14")).toBe("EMIS");
    expect(statutEffectif("EMIS", "2026-10-15", 30, "2026-11-15")).toBe("EXPIRE");
    expect(statutEffectif("BROUILLON", null, 30, "2027-01-01")).toBe("BROUILLON");
  });
});

describe("validation de la saisie", () => {
  it("accepte la saisie Mehdaoui, refuse inconnu, négatif et vide", () => {
    expect(validerEntreeDevis(entreeRenouvellement(), GRILLE_ARC_BATI_2026_10).ok).toBe(true);
    expect(validerEntreeDevis({ ...entreeRenouvellement(), lignes: [{ code: "XXX" }] }, GRILLE_ARC_BATI_2026_10).ok).toBe(false);
    expect(validerEntreeDevis({ ...entreeRenouvellement(), lignes: [{ code: "CTRL_BET", quantite: "-2" }] }, GRILLE_ARC_BATI_2026_10).ok).toBe(false);
    expect(validerEntreeDevis({ ...entreeRenouvellement(), lignes: [] }, GRILLE_ARC_BATI_2026_10).ok).toBe(false);
    expect(validerEntreeDevis({ ...entreeRenouvellement(), type: "AUTRE" }, GRILLE_ARC_BATI_2026_10).ok).toBe(false);
  });
  it("relit les décimaux sans flottant et ignore les montants envoyés", () => {
    const v = validerEntreeDevis({ ...entreeRenouvellement(), montant: 1, lignes: [{ code: "CTRL_BET", quantite: "6", montant: 999 }] }, GRILLE_ARC_BATI_2026_10);
    if (!v.ok) throw new Error(v.erreurs.join());
    expect(v.entree.lignes[0]).toEqual({ code: "CTRL_BET", quantite: "6", prix: undefined, caractere: undefined });
    expect("montant" in v.entree).toBe(false);
  });
});
