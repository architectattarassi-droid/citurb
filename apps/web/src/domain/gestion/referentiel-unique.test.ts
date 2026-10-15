/**
 * Lot GP1 — référentiel unique : correspondances des vocabulaires, décisions du
 * fondateur (15/10/2026), corrections des étapes qui bloquaient à tort.
 */
import { describe, expect, it } from "vitest";
import { generatePhases, PHASES_FIXES, LOTS_SECOND_OEUVRE, type DossierShape } from "../../../../../packages/contracts/src/phases.catalog";
import {
  CHECKLISTS_REF, JALONS_REF, PHASES_REF, REF, dureeChantierMois, dureeType, lotDepuis, phaseDesMateriaux, phaseDuCatalogue, roleRef, rolesEspaceProjet, typeProjetDepuis,
} from "../../../../../packages/contracts/src/gestion/referentiel";
import { applicabiliteDocument, assurancesObligatoires, bureauControleObligatoire, conditionConnue, evaluerCondition, profilDuDossier } from "../../../../../packages/contracts/src/gestion/profil";
import { libelleOrdre, ordreRegional } from "../../../../../packages/contracts/src/gestion/ordres";
import { validerParametresGestion, PARAMETRES_GESTION_DEFAUT } from "../../../../../packages/contracts/src/gestion/parametres";
import { construireParcours } from "../../../../../functions/_lib/ficheDossier";
import { corrigerPrerequis, jalonsDuProjet } from "../referentiel";
import { PHASES_REALISATION } from "../materiaux/phases";

const DOSSIER: DossierShape = {
  id: "d", porte: "P1", nbEtagesHorsSol: 1, nbSousSols: 1, typeOperationFoncier: "aucun",
  flags: { securiteIncendie: false, ascenseur: false, financementBancaire: false, raccordementsDefinitifs: true, terrainNonBorne: false, chantierComplexe: false, demolitionExistant: false },
};

describe("GP1 — correspondances vers les 15 phases", () => {
  it("chaque phase du catalogue (fixe, par niveau, lots) a sa phase P..", () => {
    const codes = [...PHASES_FIXES.map((p) => p.code), ...LOTS_SECOND_OEUVRE.map((l) => l.code), "85_SOUS_SOL_1", "86_PLANCHER_RDC", "86_PLANCHER_TERRASSE", "91_TESTS_RESEAUX"];
    const sans = codes.filter((c) => !phaseDuCatalogue(c));
    expect(sans).toEqual([]);
  });
  it("l'ordre chronologique suit P00 → P14 (exécution et marchés avant chantier, réception à la fin)", () => {
    const o = (c: string) => PHASES_REF.findIndex((p) => p.code === phaseDuCatalogue(c));
    expect(o("40_DOSSIER_EXECUTION")).toBeLessThan(o("50_DCE"));
    expect(o("50_DCE")).toBeLessThan(o("84_FONDATIONS"));
    expect(o("84_FONDATIONS")).toBeLessThan(o("LOT_PEINTURE"));
    expect(o("LOT_PEINTURE")).toBeLessThan(o("93_RECEPTION_PROVISOIRE"));
    expect(o("93_RECEPTION_PROVISOIRE")).toBeLessThan(o("96_PERMIS_HABITER"));
    expect(o("96_PERMIS_HABITER")).toBeLessThan(o("97_RECEPTION_DEFINITIVE"));
    // La branche lotissement (29B, 29C) reste avant le permis de construire.
    expect(o("29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT")).toBeLessThanOrEqual(o("34_PERMIS_CONSTRUIRE"));
  });
  it("jalons de l'espace projet, matériaux, lots de chiffrage et types de projet se rattachent", () => {
    expect(phaseDuCatalogue("84_FONDATIONS.FON.03")).toBe("P08_GROS_OEUVRE_INFRASTRUCTURE");
    expect(phaseDuCatalogue("J08_03_FERRAILLAGE_FONDATIONS")).toBe("P08_GROS_OEUVRE_INFRASTRUCTURE");
    expect(phaseDuCatalogue("PRE_RDV")).toBe("P00_IDEE_PROGRAMME");
    const mat = PHASES_REALISATION.map((p) => p.id).filter((id) => !phaseDesMateriaux(id));
    expect(mat).toEqual([]);
    expect(lotDepuis("FON")).toBe("FONDATIONS");
    expect(lotDepuis("LOT_04_ETANCHEITE")).toBe("ETANCHEITE");
    for (const t of ["MAISON_INDIVIDUELLE", "VILLA", "IMMEUBLE", "LOCAL_COMMERCIAL", "AMENAGEMENT_INTERIEUR", "MAISON", "MIXTE", "ERP", "LOTISSEMENT", "VILLA_R1_HS", "IMMEUBLE_COLLECTIF_R_PLUS_N"]) {
      expect(typeProjetDepuis(t), t).not.toBeNull();
    }
  });
  it("rôles : alias espace projet ↔ catalogue ↔ référentiel", () => {
    expect(roleRef("COORDINATEUR_SPS")).toBe("COORDONNATEUR_SPS");
    expect(roleRef("ENTREPRISE")).toBe("ENTREPRISE_GO");
    expect(roleRef("CNOA")).toBe("ORDRE_ARCHITECTES");
    expect(rolesEspaceProjet("ENTREPRISE_LOT")).toContain("ENTREPRISE");
    expect(rolesEspaceProjet("MAITRE_OUVRAGE")).toContain("CLIENT");
  });
  it("une seule durée de référence par type", () => {
    expect(dureeType({ type: "VILLA", sousSols: 1 })?.type).toBe("VILLA_AVEC_SOUS_SOL");
    expect(dureeType({ type: "IMMEUBLE", etagesHorsSol: 4 })?.type).toBe("IMMEUBLE_R2_R4");
    const villa = dureeChantierMois("VILLA");
    expect(villa).toBeGreaterThanOrEqual(8);
    expect(villa).toBeLessThanOrEqual(18);
  });
  it("les checklists de chantier pointent vers des phases et jalons existants", () => {
    for (const c of CHECKLISTS_REF) {
      expect(PHASES_REF.some((p) => p.code === c.phase), c.code).toBe(true);
      if (c.jalon) expect(JALONS_REF.some((j) => j.code === c.jalon) || (REF.branches ?? []).some((b) => b.jalons.some((j) => j.code === c.jalon)), c.code).toBe(true);
    }
  });
});

describe("GP1 — décisions du fondateur", () => {
  it("bureau de contrôle obligatoire au-delà de 5 MDH", () => {
    expect(bureauControleObligatoire({ type: "VILLA", budgetMDH: 6 })).toBe(true);
    expect(bureauControleObligatoire({ type: "VILLA", budgetMDH: 4.5 })).toBe(false);
    expect(bureauControleObligatoire({ type: "VILLA" })).toBeNull();
    const d = { code: "X", obligatoire: "CONDITIONNEL" as const, condition: "Obligatoire au-delà de 5 MDH de budget de travaux (décision du fondateur) ; recommandé en dessous" };
    expect(applicabiliteDocument(d, { type: "VILLA", budgetMDH: 8 })).toBe("EXIGE");
    expect(applicabiliteDocument(d, { type: "VILLA", budgetMDH: 2 })).toBe("NON");
    expect(applicabiliteDocument(d, { type: "VILLA" })).toBe("A_CONFIRMER");
  });
  it("TRC et décennale : plus de 3 étages ou plus de 800 m²", () => {
    expect(assurancesObligatoires({ type: "IMMEUBLE", etagesHorsSol: 4, surfacePlancherM2: 600 })).toBe(true);
    expect(assurancesObligatoires({ type: "VILLA", etagesHorsSol: 1, surfacePlancherM2: 900 })).toBe(true);
    expect(assurancesObligatoires({ type: "VILLA", etagesHorsSol: 1, surfacePlancherM2: 350 })).toBe(false);
    expect(evaluerCondition("Mêmes seuils que la TRC", { type: "VILLA", etagesHorsSol: 3, surfacePlancherM2: 700 })).toBe("NON");
  });
  it("visa : conseil régional selon la commune ou la préfecture", () => {
    expect(ordreRegional({ commune: "Kénitra" })?.conseil).toBe("Kénitra");
    expect(ordreRegional({ commune: "Mehdia" })?.conseil).toBe("Kénitra");
    expect(ordreRegional({ commune: "Ouazzane" })).toMatchObject({ conseil: "Kénitra", aVerifier: false });
    expect(ordreRegional({ commune: "Témara" })?.conseil).toBe("Rabat");
    expect(ordreRegional({ prefecture: "Skhirat-Témara", commune: "Aïn Attig" })?.conseil).toBe("Rabat");
    expect(ordreRegional({ commune: "Tiflet" })?.conseil).toBe("Rabat");
    expect(ordreRegional({ commune: "Dakhla" })).toMatchObject({ conseil: "Agadir", antenne: "Dakhla" });
    expect(ordreRegional({ commune: "Meknès" })).toMatchObject({ conseil: "Meknès", aVerifier: true });
    expect(ordreRegional({ commune: "Village inconnu" })).toBeNull();
    expect(libelleOrdre(ordreRegional({ commune: "Salé" })).fr).toMatch(/Ordre des architectes de Rabat/);
    expect(libelleOrdre(ordreRegional({ commune: "Salé" })).fr).not.toMatch(/CNOA/);
  });
  it("profil d'un dossier : colonnes (budget en dirhams) corrigées par la saisie admin", () => {
    const p = profilDuDossier({ budgetEstime: 3_500_000, nbEtagesHorsSol: 2, payload: { gestion: { profil: { ascenseur: true, budgetMDH: 6 } } } }, "IMMEUBLE");
    expect(p).toMatchObject({ type: "IMMEUBLE", budgetMDH: 6, etagesHorsSol: 2, ascenseur: true });
  });
  it("questions ouvertes : paramétrables, défauts prudents", () => {
    expect(validerParametresGestion({})).toEqual(PARAMETRES_GESTION_DEFAUT);
    expect(validerParametresGestion({ raccordementsAvantPermisHabiter: true, article770DelaiJours: 30 })).toMatchObject({ raccordementsAvantPermisHabiter: true, article770DelaiJours: 30 });
  });
  it("conditions des documents : couverture de la traduction en règles", () => {
    const phrases = new Set<string>();
    for (const p of PHASES_REF) for (const j of p.jalons) for (const d of j.documents ?? []) if (d.condition) phrases.add(d.condition);
    const inconnues = [...phrases].filter((t) => !conditionConnue(t));
    // Une phrase nouvelle du référentiel s'affiche « à confirmer » : pas d'erreur, mais on veut le savoir.
    expect(inconnues.length).toBeLessThanOrEqual(Math.ceil(phrases.size * 0.2));
  });
});

describe("GP1 — étapes qui bloquaient à tort", () => {
  const gen = (flags: Partial<DossierShape["flags"]> = {}) => generatePhases({ ...DOSSIER, flags: { ...DOSSIER.flags, ...flags } });
  const pre = (ps: ReturnType<typeof gen>, c: string) => ps.find((p) => p.code === c)?.prerequis ?? [];
  it("plus de « purge de recours » ; le visa n'est plus le CNOA", () => {
    const ps = gen();
    expect(ps.some((p) => p.code === "36_AFFICHAGE_RECOURS")).toBe(false);
    // Décision du 15/10/2026 : DEXE en parallèle de l'instruction ; marchés et chantier attendent le permis.
    expect(pre(ps, "40_DOSSIER_EXECUTION")).toEqual(["30_DOSSIER_AUTORISATION"]);
    expect(pre(ps, "54_ATTRIBUTION_MARCHE")).toContain("34_PERMIS_CONSTRUIRE");
    expect(pre(ps, "80_OUVERTURE_CHANTIER")).toContain("34_PERMIS_CONSTRUIRE");
    expect(ps.find((p) => p.code === "32_VISA_CNOA")!.title).toBe("Visa de l'ordre régional compétent");
    expect(ps.find((p) => p.code === "32_VISA_CNOA")!.title).not.toMatch(/CNOA/);
  });
  it("ni la levée des réserves ni les raccordements ne bloquent le permis d'habiter (par défaut)", () => {
    const ps = gen();
    expect(pre(ps, "95_CONFORMITE_ADMINISTRATIVE")).not.toContain("94_LEVEE_RESERVES");
    expect(pre(ps, "95_CONFORMITE_ADMINISTRATIVE")).not.toContain("95B_RACCORDEMENTS_DEFINITIFS");
    expect(pre(ps, "97_RECEPTION_DEFINITIVE")).toContain("94_LEVEE_RESERVES");
    const ordre = ps.map((p) => p.code);
    expect(ordre.indexOf("95B_RACCORDEMENTS_DEFINITIFS")).toBeGreaterThan(ordre.indexOf("96_PERMIS_HABITER"));
  });
  it("paramètres : on peut remettre raccordements et levée des réserves avant le permis d'habiter", () => {
    const ps = gen({ raccordementsAvantPermisHabiter: true, leveeReservesAvantPermisHabiter: true });
    expect(pre(ps, "95_CONFORMITE_ADMINISTRATIVE")).toEqual(expect.arrayContaining(["94_LEVEE_RESERVES", "95B_RACCORDEMENTS_DEFINITIFS"]));
    const ordre = ps.map((p) => p.code);
    expect(ordre.indexOf("95B_RACCORDEMENTS_DEFINITIFS")).toBeLessThan(ordre.indexOf("96_PERMIS_HABITER"));
  });
  it("bureau de contrôle retiré quand le budget est ≤ 5 MDH, sans prérequis orphelin", () => {
    const ps = gen({ sansBureauControle: true });
    expect(ps.some((p) => p.code === "18_MANDAT_BUREAU_CONTROLE" || p.code === "42_VISA_STRUCTURE_CONTROLE")).toBe(false);
    const codes = new Set(ps.map((p) => p.code));
    for (const p of ps) for (const r of p.prerequis) expect(codes.has(r), `${p.code} → ${r}`).toBe(true);
  });
  it("espace projet : la conformité ne dépend plus du point d'arrêt « levée des réserves »", () => {
    const js = jalonsDuProjet({ type: "VILLA", sousSol: false, etagesHorsSol: 1 } as never);
    for (const j of js.filter((x) => /^9[56]/.test(x.phase))) expect(j.prerequis ?? []).not.toContain("94_LEVEE_RESERVES.GEN.03");
    const j = { phase: "95_CONFORMITE_ADMINISTRATIVE", prerequis: ["94_LEVEE_RESERVES.GEN.03"] };
    expect(corrigerPrerequis(j, true).prerequis).toEqual(["94_LEVEE_RESERVES.GEN.03"]);
  });
});

describe("GP1 — parcours de la fiche dossier", () => {
  const base = { phase: "14_APD", createdAt: "2026-09-01", leads: [], rdv: [], devisPropose: false, etapes: new Map(), maintenant: "2026-10-15T00:00:00Z" };
  it("ordre chronologique par phase du référentiel", () => {
    const p = construireParcours(base);
    const rang = (c: string) => p.findIndex((e) => e.code === c);
    expect(rang("40_DOSSIER_EXECUTION")).toBeLessThan(rang("54_ATTRIBUTION_MARCHE"));
    expect(rang("54_ATTRIBUTION_MARCHE")).toBeLessThan(rang("84_FONDATIONS"));
    expect(rang("84_FONDATIONS")).toBeLessThan(rang("92_FIN_SECOND_OEUVRE"));
    expect(rang("92_FIN_SECOND_OEUVRE")).toBeLessThan(rang("93_RECEPTION_PROVISOIRE"));
    expect(rang("29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT")).toBeLessThan(rang("40_DOSSIER_EXECUTION"));
    const refs = p.map((e) => PHASES_REF.findIndex((x) => x.code === e.phaseRef));
    expect([...refs].sort((a, b) => a - b)).toEqual(refs);
  });
  it("migration sans perte : statuts gardés, étape retirée affichée avec son historique", () => {
    const etapes = new Map([
      ["36_AFFICHAGE_RECOURS", { statut: "FAITE_HORS_PLATEFORME", date: "2025-03-01", note: null, saisiPar: "admin" }],
      ["32_VISA_CNOA", { statut: "DEBLOQUEE", date: null, note: "visa obtenu hors plateforme", saisiPar: "admin" }],
    ]);
    const p = construireParcours({ ...base, etapes, phase: "40_DOSSIER_EXECUTION" });
    expect(p.find((e) => e.code === "36_AFFICHAGE_RECOURS")).toMatchObject({ statut: "FAITE_HORS_PLATEFORME", retiree: true });
    expect(p.find((e) => e.code === "32_VISA_CNOA")).toMatchObject({ statut: "DEBLOQUEE", note: "visa obtenu hors plateforme" });
  });
  it("visa titré avec l'ordre compétent ; bureau de contrôle sans objet sous 5 MDH", () => {
    const p = construireParcours({ ...base, ordre: ordreRegional({ commune: "Kénitra" }), profil: { type: "VILLA", budgetMDH: 3 } });
    expect(p.find((e) => e.code === "32_VISA_CNOA")!.titre).toBe("Visa de l'ordre régional — Kénitra");
    expect(p.find((e) => e.code === "42_VISA_STRUCTURE_CONTROLE")).toMatchObject({ statut: "SANS_OBJET", conditionnelle: true });
    const gros = construireParcours({ ...base, profil: { type: "IMMEUBLE", budgetMDH: 12 } });
    expect(gros.find((e) => e.code === "42_VISA_STRUCTURE_CONTROLE")!.statut).toBe("A_VENIR");
  });
});
