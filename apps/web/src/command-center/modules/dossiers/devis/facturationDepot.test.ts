/**
 * Règles serveur de la facturation (functions/_lib/facturationDepot.ts), base simulée.
 */
import { describe, expect, it } from "vitest";
import {
  accepterDevis, debloquerPhase, emettreAvoir, emettreFacture, enregistrerEncaissement, lireAcceptation, remplacerEcheancier,
} from "../../../../../../../functions/_lib/facturationDepot";
import type { Sql } from "../../../../../../../functions/_lib/dossierAdmin";
import { entreeRenouvellement } from "../../../../domain/honoraires/devisComplet";

type Rep = (texte: string, valeurs: unknown[]) => Record<string, unknown>[] | Error | undefined;
function base(rep: Rep) {
  const requetes: Array<{ texte: string; valeurs: unknown[] }> = [];
  const sql = (async (s: TemplateStringsArray, ...valeurs: unknown[]) => {
    const texte = s.join("?");
    requetes.push({ texte, valeurs });
    const r = rep(texte, valeurs);
    if (r instanceof Error) throw r;
    return r ?? [];
  }) as unknown as Sql;
  return { sql, requetes };
}

const DOSSIER = {
  clientNom: "Monsieur Rida MEHDAOUI", payload: { client: { type: "PERSONNE" }, missionsReglees: [] }, title: "TEST — Construction d'un immeuble R+1",
  commune: "Mehdiya", typologie: "IMMEUBLE", cabNom: "ARC-BATI ARCHITECTURE", compteActif: false,
};
const DEVIS_EMIS = { id: "dvs_1", dossierId: "dos_1", numero: "DEV-2026-0001", revision: 1, statut: "EMIS", dateEm: "2026-10-15", validiteJours: 30, grilleVersionId: "arc-bati-2026-10", type: "COMPLEMENTAIRE", presentation: "DETAILLEE", montantTotal: "5000.00", entree: entreeRenouvellement(), remplacePar: null };
const MAINTENANT = "2026-10-16T09:00:00.000Z";

describe("acceptation", () => {
  it("devis émis → ACCEPTE, montant figé, échéancier par défaut (avance totale : P04 à la signature), journal", async () => {
    const { sql, requetes } = base((t) => {
      if (t.includes('FROM "Devis" WHERE "id" =') && t.includes("to_char")) return [DEVIS_EMIS];
      if (t.includes('FROM "Dossier" d LEFT JOIN "Cabinet"')) return [DOSSIER];
      if (t.includes("SET \"statut\" = 'ACCEPTE'")) return [{ id: "dvs_1" }];
    });
    const r = await accepterDevis(sql, "dvs_1", { pack: null, commandees: [], inclureHorsHonoraires: false, dateAcceptation: "2026-10-16", preuve: { type: "SIGNE_SCANNE", documentId: "doc_x", saisiPar: "admin" } }, "admin", MAINTENANT);
    expect(r).toEqual({ montantAccepte: "5000.00", echeances: 1 });
    const ech = requetes.find((q) => q.texte.includes('INSERT INTO "EcheancePaiement"'))!;
    expect(ech.valeurs).toContain("P04_AUTORISATION");
    expect(ech.valeurs).toContain("SIGNATURE");
    expect(requetes.some((q) => q.texte.includes('INSERT INTO "DossierEvenement"') && q.valeurs.includes("DEVIS_ACCEPTE"))).toBe(true);
  });
  it("refuse un devis expiré ou en brouillon", async () => {
    const exp = base((t) => (t.includes('FROM "Devis" WHERE "id" =') ? [{ ...DEVIS_EMIS, dateEm: "2026-08-01" }] : undefined));
    await expect(accepterDevis(exp.sql, "dvs_1", { pack: null, commandees: [], inclureHorsHonoraires: false, dateAcceptation: "2026-10-16", preuve: { type: "EN_LIGNE", horodatage: MAINTENANT, clientId: "u", empreinteDevis: null } }, "c", MAINTENANT)).rejects.toMatchObject({ code: "devis_expire" });
    const br = base((t) => (t.includes('FROM "Devis" WHERE "id" =') ? [{ ...DEVIS_EMIS, statut: "BROUILLON" }] : undefined));
    await expect(accepterDevis(br.sql, "dvs_1", { pack: null, commandees: [], inclureHorsHonoraires: false, dateAcceptation: "2026-10-16", preuve: { type: "EN_LIGNE", horodatage: MAINTENANT, clientId: "u", empreinteDevis: null } }, "c", MAINTENANT)).rejects.toMatchObject({ code: "statut_invalide" });
  });
  it("relecture : pack connu, date non future", () => {
    expect("erreur" in lireAcceptation({ pack: "GOLD" }, "2026-10-16")).toBe(true);
    expect("erreur" in lireAcceptation({ dateAcceptation: "2026-12-01" }, "2026-10-16")).toBe(true);
    expect(lireAcceptation({ pack: "ESSENTIEL", commandees: ["HON_DECO", 3] }, "2026-10-16")).toEqual({ pack: "ESSENTIEL", commandees: ["HON_DECO"], inclureHorsHonoraires: false, dateAcceptation: "2026-10-16" });
  });
});

const ECH = { id: "ech_1", dossierId: "dos_1", devisId: "dvs_1", phaseCode: "P04_AUTORISATION", ordre: 1, libelle: "Règlement total à la commande", montantHT: "5000.00", declencheur: "SIGNATURE", prestations: ["DEPOT_RENOUV"], devisNumero: "DEV-2026-0001", devisStatut: "ACCEPTE", nb: 1, dernier: 1, lignesAcceptees: [{ code: "DEPOT_RENOUV", libelle: "Dépôt et obtention d'une nouvelle décision d'autorisation", montantHT: "5000.00" }] };

describe("facture", () => {
  it("numéro FAC alloué dans l'instruction même qui crée la facture ; TTC 6 000 ; document et empreinte figés", async () => {
    const { sql, requetes } = base((t) => {
      if (t.includes('FROM "EcheancePaiement" e JOIN "Devis"')) return [ECH];
      if (t.includes('SELECT *, to_char("dateEmission"') && t.includes('FROM "Facture"')) return [{ id: "fac_1", dossierId: "dos_1", devisId: "dvs_1", echeanceId: "ech_1", numero: "FAC-2026-0001", type: "FORFAIT_UNIQUE", de: "2026-10-16", dech: "2026-10-31", lignes: [{ libelle: "x", montantHT: "5000.00" }], tauxTVA: "20.000" }];
      if (t.includes('FROM "Dossier" d LEFT JOIN "Cabinet"')) return [DOSSIER];
    });
    const r = await emettreFacture(sql, "ech_1", {}, "admin", MAINTENANT);
    expect(r.numero).toBe("FAC-2026-0001");
    const ins = requetes.find((q) => q.texte.includes('INSERT INTO "Facture"'))!;
    expect(ins.texte).toContain('INSERT INTO "SequenceDocument"');
    expect(ins.texte).toContain("'FAC-'");
    expect(ins.valeurs).toEqual(expect.arrayContaining(["FORFAIT_UNIQUE", "5000.00", "1000.00", "6000.00", "2026-10-31"]));
    expect(requetes.some((q) => q.texte.includes('SET "document"'))).toBe(true);
  });
  it("double facturation d'une échéance refusée (index unique) sans consommer de numéro", async () => {
    const { sql } = base((t) => {
      if (t.includes('FROM "EcheancePaiement" e JOIN "Devis"')) return [ECH];
      if (t.includes('INSERT INTO "Facture"')) return Object.assign(new Error("duplicate"), { code: "23505" });
    });
    await expect(emettreFacture(sql, "ech_1", {}, "admin", MAINTENANT)).rejects.toMatchObject({ code: "deja_facturee" });
  });
});

describe("encaissements et avoirs", () => {
  const solde = (encaisse: string) => (t: string): Record<string, unknown>[] | undefined => {
    if (t.includes('"type", "statut" FROM "Facture"')) return [{ dossierId: "dos_1", numero: "FAC-2026-0001", type: "FORFAIT_UNIQUE", statut: "EMISE" }];
    if (t.includes('AS "encaisse"')) return [{ netAPayer: "6000.00", montantHT: "5000.00", encaisse, avoirsTTC: "0", avoirsHT: "0" }];
    if (t.includes('SELECT "netAPayer" FROM "Facture"')) return [{ netAPayer: "6000.00" }];
  };
  it("encaissement partiel accepté ; au-delà du reste à payer refusé", async () => {
    const ok = base(solde("0"));
    const r = await enregistrerEncaissement(ok.sql, "fac_1", { montant: "2000", date: "2026-10-16", mode: "VIREMENT", reference: "VIR 123", justificatifId: null }, "admin", MAINTENANT);
    expect(r.restant).toBe("4000.00");
    const trop = base(solde("5000"));
    await expect(enregistrerEncaissement(trop.sql, "fac_1", { montant: "2000", date: "2026-10-16", mode: "CHEQUE", reference: null, justificatifId: null }, "admin", MAINTENANT)).rejects.toMatchObject({ code: "montant_trop_eleve" });
  });
  it("avoir : numéro AVO, montant négatif, motif obligatoire", async () => {
    const rep = (t: string): Record<string, unknown>[] | undefined => {
      if (t.startsWith('SELECT * FROM "Facture" WHERE "id"')) return [{ id: "fac_1", dossierId: "dos_1", devisId: "dvs_1", numero: "FAC-2026-0001", type: "FORFAIT_UNIQUE", statut: "EMISE", tauxTVA: "20.000" }];
      if (t.includes('AS "encaisse"')) return [{ netAPayer: "6000.00", montantHT: "5000.00", encaisse: "0", avoirsTTC: "0", avoirsHT: "0" }];
      if (t.includes('SELECT *, to_char("dateEmission"')) return [{ id: "avo_1", dossierId: "dos_1", numero: "AVO-2026-0001", type: "AVOIR", de: "2026-10-16", dech: "2026-10-16", lignes: [], tauxTVA: "20" }];
      if (t.includes('SELECT "netAPayer" FROM "Facture"')) return [{ netAPayer: "6000.00" }];
    };
    await expect(emettreAvoir(base(rep).sql, "fac_1", { motif: " " }, "admin", MAINTENANT)).rejects.toMatchObject({ code: "motif_requis" });
    const { sql, requetes } = base(rep);
    await emettreAvoir(sql, "fac_1", { motif: "Erreur de taux" }, "admin", MAINTENANT);
    const ins = requetes.find((q) => q.texte.includes('INSERT INTO "Facture"'))!;
    expect(ins.texte).toContain("'AVO-'");
    expect(ins.valeurs).toEqual(expect.arrayContaining(["-5000.00", "-1000.00", "-6000.00"]));
  });
});

describe("échéancier et déblocage", () => {
  it("une échéance déjà facturée ne peut pas changer", async () => {
    const { sql } = base((t) => {
      if (t.includes('SELECT "dossierId", "statut", "montantAccepte" FROM "Devis"')) return [{ dossierId: "dos_1", statut: "ACCEPTE", montantAccepte: "5000.00" }];
      if (t.includes('AS "facturee"')) return [{ id: "ech_1", phaseCode: "P04_AUTORISATION", libelle: "Total", montantHT: "5000.00", facturee: true }];
    });
    await expect(remplacerEcheancier(sql, "dvs_1", [
      { id: "ech_1", phaseCode: "P04_AUTORISATION", libelle: "Total", montantHT: "2500", declencheur: "SIGNATURE" },
      { phaseCode: "P05_ETUDES_EXECUTION", libelle: "Solde", montantHT: "2500", declencheur: "DEBUT_PHASE" },
    ], "admin", MAINTENANT)).rejects.toMatchObject({ code: "echeancier_invalide" });
  });
  it("déblocage : motif écrit d'au moins 10 caractères, journalisé", async () => {
    await expect(debloquerPhase(base(() => undefined).sql, "dos_1", "P04_AUTORISATION", "ok", "admin", MAINTENANT)).rejects.toMatchObject({ code: "motif_requis" });
    const { sql, requetes } = base(() => undefined);
    await debloquerPhase(sql, "dos_1", "P04_AUTORISATION", "Chèque remis en main propre, encaissement lundi", "admin", MAINTENANT);
    expect(requetes.some((q) => q.valeurs.includes("PHASE_DEBLOQUEE_SANS_PAIEMENT"))).toBe(true);
  });
});
