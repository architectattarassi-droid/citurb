/**
 * Acceptation, échéancier par phase, totaux de facture et état des paiements —
 * sur les trois devis de recette (spec §9) et la décision « phase déclenchée après paiement ».
 */
import { describe, expect, it } from "vitest";
import { calculerDevis } from "./devis";
import { echeancierParDefaut, etatPaiementPhases, lignesAcceptees, partager, phasesDeMission, statutFacture, totauxFacture, verifierEcheancier, type EcheanceEtat, type FactureEtat } from "./facturation";
import { GRILLE_ARC_BATI_2026_10 as G } from "./grilleArcBati";

const mehdaoui = calculerDevis({ grille: G, type: "COMPLEMENTAIRE", presentation: "DETAILLEE", projet: { commune: "Mehdiya" }, lignes: [{ code: "DEPOT_RENOUV" }] });
const ouazzane = calculerDevis({
  grille: G, type: "MISSION_COMPLETE", presentation: "DETAILLEE", coutTravaux: "769500",
  projet: { typologie: "MAISON_INDIVIDUELLE", commune: "Ouazzane", surfacePlancher: "285", nbNiveaux: 3, sousSol: false },
  lignes: [{ code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }, { code: "BA" }, { code: "CTRL_BET", quantite: 6 }, { code: "GEOTECH" }, { code: "TOPO" }],
});
const casablanca = calculerDevis({
  grille: G, type: "MISSION_COMPLETE", presentation: "PACKS", coutTravaux: "2508000",
  projet: { typologie: "IMMEUBLE", commune: "Casablanca", surfacePlancher: "836", nbNiveaux: 5, sousSol: true },
  lignes: [{ code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }, { code: "HON_DECO" }, { code: "BA" }],
});

describe("lignes acceptées", () => {
  it("Mehdaoui : 5 000 DH", () => {
    const a = lignesAcceptees(mehdaoui, G, {});
    expect(a.ok && a.total.fixe2()).toBe("5000.00");
  });
  it("Ouazzane : obligatoires + facultative commandée ; hors honoraires exclus par défaut (règle 4)", () => {
    const sans = lignesAcceptees(ouazzane, G, {});
    expect(sans.ok && sans.total.fixe2()).toBe("23085.00");
    const avec = lignesAcceptees(ouazzane, G, { commandees: ["HON_CONCEPTION"] });
    expect(avec.ok && avec.total.fixe2()).toBe("38475.00");
    const tout = lignesAcceptees(ouazzane, G, { commandees: ["HON_CONCEPTION", "GEOTECH"], inclureHorsHonoraires: true });
    expect(tout.ok && tout.total.fixe2()).toBe("49475.00");
  });
  it("Casablanca : exactement un pack (règle 2), BA « Sur devis » jamais facturable", () => {
    expect(lignesAcceptees(casablanca, G, {}).ok).toBe(false);
    const e = lignesAcceptees(casablanca, G, { pack: "ESSENTIEL", inclureHorsHonoraires: true });
    expect(e.ok && e.total.fixe2()).toBe("75240.00");
    const p = lignesAcceptees(casablanca, G, { pack: "PREMIUM" });
    expect(p.ok && p.total.fixe2()).toBe("163020.00");
  });
});

describe("échéancier par phase", () => {
  it("missions rattachées aux phases du référentiel", () => {
    expect(phasesDeMission("HON_AUTORISATION")).toEqual(["P04_AUTORISATION"]);
    expect(phasesDeMission("HON_CHANTIER")).toEqual(["P07_PREPARATION_CHANTIER", "P11_RECEPTION_PROVISOIRE"]);
  });
  it("Mehdaoui, avance totale : une échéance à la signature, phase P04", () => {
    const a = lignesAcceptees(mehdaoui, G, {});
    if (!a.ok) throw new Error();
    expect(echeancierParDefaut(a.lignes, "AVANCE_TOTALE")).toEqual([
      { phaseCode: "P04_AUTORISATION", ordre: 1, libelle: "Règlement total à la commande", montantHT: "5000.00", declencheur: "SIGNATURE", prestations: ["DEPOT_RENOUV"] },
    ]);
  });
  it("Ouazzane par tranches : 7 695 + 7 695 + 11 542,50 + 5 771,25 + 5 771,25 = 38 475", () => {
    const a = lignesAcceptees(ouazzane, G, { commandees: ["HON_CONCEPTION"] });
    if (!a.ok) throw new Error();
    const e = echeancierParDefaut(a.lignes, "PAR_TRANCHES");
    expect(e.map((x) => [x.phaseCode, x.montantHT, x.declencheur])).toEqual([
      ["P02_ESQUISSE_APS", "7695.00", "SIGNATURE"], ["P03_APD_ETUDES", "7695.00", "DEBUT_PHASE"], ["P04_AUTORISATION", "11542.50", "DEBUT_PHASE"],
      ["P07_PREPARATION_CHANTIER", "5771.25", "DEBUT_PHASE"], ["P11_RECEPTION_PROVISOIRE", "5771.25", "DEBUT_PHASE"],
    ]);
    expect(verifierEcheancier(e, a.total)).toEqual([]);
  });
  it("50/50 : acompte à la signature, solde avant la phase suivante ; partage au centime", () => {
    const a = lignesAcceptees(mehdaoui, G, {});
    if (!a.ok) throw new Error();
    const e = echeancierParDefaut(a.lignes, "50_50");
    expect(e.map((x) => [x.phaseCode, x.montantHT])).toEqual([["P04_AUTORISATION", "2500.00"], ["P05_ETUDES_EXECUTION", "2500.00"]]);
    expect(partager("100", 3).map((d) => d.fixe2())).toEqual(["33.33", "33.33", "33.34"]);
  });
  it("refuse un échéancier dont la somme diffère du montant accepté", () => {
    expect(verifierEcheancier([{ phaseCode: "P04_AUTORISATION", montantHT: "4000", libelle: "x" }], "5000")[0]).toMatch(/doit égaler/);
    expect(verifierEcheancier([{ phaseCode: "PXX", montantHT: "5000", libelle: "x" }], "5000")[0]).toMatch(/inconnue/);
  });
});

describe("facture : HT, TVA, TTC (décimal)", () => {
  it("TVA 20 % par défaut ; taux modifiable ; retenue à la source", () => {
    const t = totauxFacture("11542.50");
    expect([t.ht.fixe2(), t.tva.fixe2(), t.ttc.fixe2()]).toEqual(["11542.50", "2308.50", "13851.00"]);
    expect(totauxFacture("5000", "0").ttc.fixe2()).toBe("5000.00");
    expect(totauxFacture("5000", "20", "500").netAPayer.fixe2()).toBe("5500.00");
  });
  it("statut d'une facture d'après encaissements et avoirs", () => {
    expect(statutFacture("6000", "0", "0")).toBe("EMISE");
    expect(statutFacture("6000", "2000", "0")).toBe("PARTIELLEMENT_REGLEE");
    expect(statutFacture("6000", "6000", "0")).toBe("REGLEE");
    expect(statutFacture("6000", "0", "-6000")).toBe("ANNULEE");
  });
});

describe("état des paiements par phase", () => {
  const ech: EcheanceEtat[] = [{ id: "e1", devisId: "d1", phaseCode: "P04_AUTORISATION", libelle: "Règlement total", montantHT: "5000.00", declencheur: "SIGNATURE" }];
  const fac: FactureEtat = { id: "f1", numero: "FAC-2026-0001", type: "FORFAIT_UNIQUE", statut: "EMISE", echeanceId: "e1", factureOrigineId: null, montantTTC: "6000.00", netAPayer: "6000.00", dateEmission: "2026-10-15", dateEcheance: "2026-10-30" };
  const base = { phaseActuelle: "P04_AUTORISATION", aujourdhui: "2026-10-20", devis: [{ id: "d1", numero: "DEV-2026-0001", statut: "ACCEPTE" }], deblocages: [] };
  const p4 = (x: ReturnType<typeof etatPaiementPhases>) => x.find((p) => p.phase === "P04_AUTORISATION")!;

  it("à émettre puis émise : la phase est bloquée", () => {
    const a = p4(etatPaiementPhases({ ...base, echeances: ech, factures: [], encaissements: [] }));
    expect([a.statut, a.bloquante, a.du, a.estime]).toEqual(["A_EMETTRE", true, "6000.00", true]);
    const b = p4(etatPaiementPhases({ ...base, echeances: ech, factures: [fac], encaissements: [] }));
    expect([b.statut, b.restant, b.devis[0].numero]).toEqual(["EMISE", "6000.00", "DEV-2026-0001"]);
  });
  it("partielle, en retard, puis payée avec la date du paiement complet", () => {
    const enc = [{ factureId: "f1", montant: "2000", date: "2026-10-18" }];
    expect(p4(etatPaiementPhases({ ...base, echeances: ech, factures: [fac], encaissements: enc })).statut).toBe("PARTIELLE");
    expect(p4(etatPaiementPhases({ ...base, aujourdhui: "2026-11-02", echeances: ech, factures: [fac], encaissements: enc })).statut).toBe("EN_RETARD");
    const ok = p4(etatPaiementPhases({ ...base, echeances: ech, factures: [fac], encaissements: [...enc, { factureId: "f1", montant: "4000", date: "2026-10-19" }] }));
    expect([ok.statut, ok.bloquante, ok.datePaiementComplet, ok.restant]).toEqual(["PAYEE", false, "2026-10-19", "0.00"]);
  });
  it("déblocage motivé par l'admin : la phase n'est plus bloquante, le statut reste vrai", () => {
    const d = p4(etatPaiementPhases({ ...base, echeances: ech, factures: [fac], encaissements: [], deblocages: [{ phaseCode: "P04_AUTORISATION", motif: "Chèque remis en main propre", par: "admin", le: "2026-10-20" }] }));
    expect([d.statut, d.bloquante, d.deblocage?.motif]).toEqual(["EMISE", false, "Chèque remis en main propre"]);
  });
  it("avoir total : plus rien à payer", () => {
    const avo: FactureEtat = { ...fac, id: "a1", numero: "AVO-2026-0001", type: "AVOIR", factureOrigineId: "f1", echeanceId: null, montantTTC: "-6000.00", netAPayer: "-6000.00" };
    expect(p4(etatPaiementPhases({ ...base, echeances: ech, factures: [fac, avo], encaissements: [] })).restant).toBe("0.00");
  });
  it("phase future non exigible et phase sans échéance", () => {
    const e2: EcheanceEtat[] = [{ id: "e2", devisId: "d1", phaseCode: "P11_RECEPTION_PROVISOIRE", libelle: "Tranche", montantHT: "100", declencheur: "DEBUT_PHASE" }];
    const etat = etatPaiementPhases({ ...base, echeances: e2, factures: [], encaissements: [] });
    expect(etat.find((p) => p.phase === "P11_RECEPTION_PROVISOIRE")!.statut).toBe("NON_DUE");
    const p0 = etat.find((p) => p.phase === "P00_IDEE_PROGRAMME")!;
    expect([p0.aucuneEcheance, p0.bloquante]).toEqual([true, false]);
    expect(etat).toHaveLength(15);
  });
});
