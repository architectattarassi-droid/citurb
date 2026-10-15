/**
 * Jeux de recette de la spec Devis & Facturation (§9) : les trois devis réels
 * ARC-BATI reproduits au centime près, plus les invariants du moteur (§7).
 */
import { describe, expect, it } from "vitest";
import { Dec, formatDH, formatM2 } from "./decimal";
import { DevisInvalide, calculerDevis, montantPackRetenu, TEXTES_MODALITES } from "./devis";
import { GRILLE_ARC_BATI_2026_10 as G } from "./grilleArcBati";
import { calculerCoutTravaux, calculerSurfaces, ecartVisites, lignesBaseCalcul, parserGabarit, visitesProposees, type Niveau } from "./metre";

const c2 = (d: Dec | null | undefined) => (d ? d.fixe2() : null);

describe("décimal", () => {
  it("n'utilise jamais le flottant : 0,1 + 0,2 = 0,3", () => {
    expect(Dec.de("0.1").plus("0.2").egal("0.3")).toBe(true);
    expect(Dec.de(0.1).plus(0.2).toString()).toBe("0.3");
  });
  it("garde les centimes des quotes-parts (§2.5)", () => {
    expect(c2(Dec.de(125400).pourcent(30))).toBe("37620.00");
    expect(c2(Dec.de(35625).pourcent(30).centimes())).toBe("10687.50");
  });
  it("arrondit au centime, demi au-dessus", () => {
    expect(Dec.de("10.005").centimes().fixe2()).toBe("10.01");
    expect(Dec.de("-10.005").centimes().fixe2()).toBe("-10.01");
    expect(Dec.de("10.004").centimes().fixe2()).toBe("10.00");
  });
  it("affiche « 125 400,00 DH » avec espaces insécables", () => {
    expect(formatDH(125400)).toBe("125 400,00 DH");
    expect(formatDH("11542.5")).toBe("11 542,50 DH");
    expect(formatM2("1234.5")).toBe("1 234,5 m²");
  });
  it("refuse les entrées illisibles", () => {
    expect(() => Dec.de("abc")).toThrow();
    expect(() => Dec.de(Number.NaN)).toThrow();
    expect(() => Dec.de(1e21)).toThrow();
  });
});

describe("gabarit (§2.1)", () => {
  it("propose les niveaux", () => {
    expect(parserGabarit("R+2")?.map((n) => n.code)).toEqual(["RDC", "ETAGE", "ETAGE"]);
    expect(parserGabarit("R+3+SS")?.map((n) => `${n.code}${n.rang}`)).toEqual(["SOUS_SOL-1", "RDC0", "ETAGE1", "ETAGE2", "ETAGE3"]);
    expect(parserGabarit("SS + R + 3")?.length).toBe(5);
    expect(parserGabarit("R+1")?.length).toBe(2);
    expect(parserGabarit("RDC")?.length).toBe(1);
  });
  it("ne crée jamais de niveau sur un gabarit illisible", () => {
    expect(parserGabarit("villa")).toBeNull();
    expect(parserGabarit("R+")).toBeNull();
  });
});

describe("recette 9.1 — Ouazzane R+2, mission au pourcentage détaillée", () => {
  const niveaux: Niveau[] = parserGabarit("R+2")!;
  const s = calculerSurfaces({ superficieTerrain: 107, deductionEmprise: 12, niveaux });
  if (!s.ok) throw new Error(s.questions.join());
  const cout = calculerCoutTravaux({ surfacePlancher: s.surfacePlancher, empriseAuSol: s.empriseAuSol, puElevation: 2500, fondations: { incluses: false, pu: G.puFondations } });
  const projet = { typologie: "MAISON_INDIVIDUELLE" as const, commune: "Ouazzane", surfacePlancher: s.surfacePlancher, nbNiveaux: niveaux.length, sousSol: false };
  const r = calculerDevis({
    grille: G, type: "MISSION_COMPLETE", presentation: "DETAILLEE", projet, coutTravaux: cout.coutTravaux,
    lignes: [
      { code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" },
      { code: "BA" }, { code: "CTRL_BET", quantite: 6 }, { code: "GEOTECH" }, { code: "TOPO" },
    ],
  });
  const m = (code: string) => c2(r.lignes.find((l) => l.code === code)?.montant);

  it("surfaces : 95 m² par niveau, plancher 285 m²", () => {
    expect(s.niveaux.map((n) => n.surface.toString())).toEqual(["95", "95", "95"]);
    expect(s.surfacePlancher.toString()).toBe("285");
    expect(s.hypotheses).toEqual([]);
  });
  it("base de calcul affichée littéralement", () => {
    expect(lignesBaseCalcul(s.niveaux).map((l) => [l.niveaux, l.detail, l.surface.toString()])).toEqual([
      ["Rez-de-chaussée", "107 − 12", "95"],
      ["Étages 1 à 2", "(107 − 12) × 2", "190"],
    ]);
  });
  it("coût : 712 500 + 57 000 = 769 500 DH", () => {
    expect(c2(cout.coutElevation)).toBe("712500.00");
    expect(c2(cout.coutFondations)).toBe("57000.00");
    expect(c2(cout.coutTravaux)).toBe("769500.00");
  });
  it("honoraires et prestations au centime", () => {
    expect(c2(r.assietteHonoraires)).toBe("38475.00");
    expect(m("HON_CONCEPTION")).toBe("15390.00");
    expect(m("HON_AUTORISATION")).toBe("11542.50");
    expect(m("HON_CHANTIER")).toBe("11542.50");
    expect(m("BA")).toBe("2000.00");
    expect(m("CTRL_BET")).toBe("3000.00");
    expect(m("GEOTECH")).toBe("6000.00");
    expect(m("TOPO")).toBe("2500.00");
  });
  it("totaux : obligatoire 28 085, toutes prestations 51 975", () => {
    expect(c2(r.totalObligatoire)).toBe("28085.00");
    expect(r.totalObligatoireIncomplet).toBe(false);
    expect(c2(r.totalToutesPrestations)).toBe("51975.00");
    expect(r.sectionBaseDeCalcul).toBe(true);
  });
  it("honoraires et bureau d'études séparés (groupes A/B, intervenant nommé)", () => {
    expect(c2(r.sousTotaux.A_HONORAIRES_OBLIGATOIRES)).toBe("23085.00");
    expect(c2(r.sousTotaux.B_TECHNIQUE_OBLIGATOIRE)).toBe("5000.00");
    expect(r.lignes.find((l) => l.code === "BA")?.intervenant).toBe("BUREAU_ETUDES");
  });
  it("commune d'instruction nommée dans la mission de dépôt (règle 7)", () => {
    expect(r.lignes.find((l) => l.code === "HON_AUTORISATION")?.descriptif).toContain("Commune de Ouazzane");
  });
  it("6 visites saisies : écart signalé, rien d'imposé (§3.3)", () => {
    expect(visitesProposees(niveaux)).toBe(4);
    expect(ecartVisites(niveaux, 6)).toMatch(/6 visites.*4/);
    expect(ecartVisites(niveaux, 4)).toBeNull();
  });
});

describe("recette 9.2 — Casablanca R+3+SS, présentation en packs", () => {
  const niveaux: Niveau[] = [
    { code: "SOUS_SOL", rang: -1, usage: "PARKING" }, { code: "RDC", rang: 0, usage: "COMMERCIAL" },
    { code: "ETAGE", rang: 1, usage: "HABITATION" }, { code: "ETAGE", rang: 2, usage: "HABITATION" }, { code: "ETAGE", rang: 3, usage: "HABITATION" },
  ];
  const metre = { superficieTerrain: 162, surfaceCour: 16, encorbellementProfondeur: 2, empriseEtageAvecEncorbellement: 192, niveaux };

  it("refuse de calculer tant que sous-sol et cour ne sont pas tranchés (§1.4)", () => {
    const q = calculerSurfaces(metre);
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.questions).toHaveLength(2);
  });

  const s = calculerSurfaces({
    ...metre,
    regles: { sousSol: { emprise: "TOTALE", courDeduite: false, statut: "HYPOTHESE" }, courRdc: { deduite: true, statut: "HYPOTHESE" } },
  });
  if (!s.ok) throw new Error(s.questions.join());
  const cout = calculerCoutTravaux({ surfacePlancher: s.surfacePlancher, empriseAuSol: s.empriseAuSol, puElevation: 3000, fondations: { incluses: true } });
  const projet = { typologie: "IMMEUBLE" as const, commune: "Casablanca", surfacePlancher: s.surfacePlancher, nbNiveaux: 5, sousSol: true };
  const r = calculerDevis({
    grille: G, type: "MISSION_COMPLETE", presentation: "PACKS", projet, coutTravaux: cout.coutTravaux, hypotheses: s.hypotheses,
    lignes: [{ code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }, { code: "HON_DECO" }, { code: "BA" }, { code: "GEOTECH" }, { code: "TOPO" }],
  });
  const m = (code: string) => c2(r.lignes.find((l) => l.code === code)?.montant);
  const pack = (code: string) => c2(r.packs.find((p) => p.code === code)?.montant);

  it("surfaces 162 / 146 / 176 × 3 = 836 m², hypothèses affichées", () => {
    expect(s.niveaux.map((n) => n.surface.toString())).toEqual(["162", "146", "176", "176", "176"]);
    expect(s.surfacePlancher.toString()).toBe("836");
    expect(r.hypotheses).toEqual([
      "Sous-sol compté à l'emprise totale du terrain, sans déduction de cour",
      "Cour de 16 m² déduite également au RDC",
    ]);
    expect(lignesBaseCalcul(s.niveaux).map((l) => l.detail)).toEqual(["162", "162 − 16", "(192 − 16) × 3"]);
  });
  it("coût 2 508 000 DH, assiette 125 400 DH", () => {
    expect(c2(cout.coutTravaux)).toBe("2508000.00");
    expect(c2(r.assietteHonoraires)).toBe("125400.00");
  });
  it("packs : 75 240 / 125 400 / 163 020", () => {
    expect(pack("ESSENTIEL")).toBe("75240.00");
    expect(pack("PERSONNALISE")).toBe("125400.00");
    expect(pack("PREMIUM")).toBe("163020.00");
    expect(r.packs.find((p) => p.code === "ESSENTIEL")?.mentionRestrictive).toMatch(/Plan type 2D/);
  });
  it("quotes-parts : 50 160 / 37 620 × 3", () => {
    expect(m("HON_CONCEPTION")).toBe("50160.00");
    expect(m("HON_AUTORISATION")).toBe("37620.00");
    expect(m("HON_CHANTIER")).toBe("37620.00");
    expect(m("HON_DECO")).toBe("37620.00");
  });
  it("forfaits calibrés maison → « Sur devis » sur un immeuble (règle 3)", () => {
    for (const code of ["BA", "GEOTECH", "TOPO"]) {
      const l = r.lignes.find((x) => x.code === code)!;
      expect(l.surDevis).toBe(true);
      expect(l.montant).toBeNull();
    }
    expect(r.totalObligatoireIncomplet).toBe(true);
  });
  it("acceptation : exactement un pack (règle 2)", () => {
    expect(c2(montantPackRetenu(r, "ESSENTIEL"))).toBe("75240.00");
    expect(() => montantPackRetenu(r, null)).toThrow(DevisInvalide);
  });
});

describe("recette 9.3 — Mehdaoui R+1, mission forfaitaire complémentaire", () => {
  const r = calculerDevis({
    grille: G, type: "COMPLEMENTAIRE", presentation: "DETAILLEE", modalitesPaiement: "AVANCE_TOTALE",
    projet: { commune: "Mehdiya" },
    lignes: [{ code: "DEPOT_RENOUV" }],
    missionsDejaReglees: ["PERMIS_HABITER"],
  });
  it("total 5 000 DH, sans section base de calcul", () => {
    expect(c2(r.totalToutesPrestations)).toBe("5000.00");
    expect(c2(r.totalObligatoire)).toBe("5000.00");
    expect(r.sectionBaseDeCalcul).toBe(false);
    expect(r.assietteHonoraires).toBeNull();
  });
  it("dépôt auprès de la Commune de Mehdiya (règle 7)", () => {
    expect(r.lignes[0].descriptif).toContain("Commune de Mehdiya");
    expect(TEXTES_MODALITES.AVANCE_TOTALE).toMatch(/payable d'avance/);
  });
  it("une mission déjà réglée ne reparaît pas en ligne facturable (règle 8)", () => {
    expect(() => calculerDevis({
      grille: G, type: "COMPLEMENTAIRE", presentation: "DETAILLEE", projet: { commune: "Mehdiya" },
      lignes: [{ code: "DEPOT_RENOUV" }, { code: "PERMIS_HABITER", prix: 3000 }],
      missionsDejaReglees: ["PERMIS_HABITER"],
    })).toThrow(/règle 8/);
  });
});

describe("invariants", () => {
  it("un forfait non tarifé reste « Sur devis » (pas de prix inventé)", () => {
    const r = calculerDevis({ grille: G, type: "COMPLEMENTAIRE", presentation: "DETAILLEE", projet: { commune: "Kénitra" }, lignes: [{ code: "REGULARISATION" }] });
    expect(r.lignes[0].surDevis).toBe(true);
    expect(r.lignes[0].motifSurDevis).toBe("prestation non encore tarifée");
  });
  it("hors honoraires n'entre jamais dans l'assiette (règle 1)", () => {
    const sans = calculerDevis({ grille: G, type: "MISSION_COMPLETE", presentation: "DETAILLEE", projet: { commune: "X" }, coutTravaux: 100000, lignes: [{ code: "HON_AUTORISATION" }] });
    const avec = calculerDevis({ grille: G, type: "MISSION_COMPLETE", presentation: "DETAILLEE", projet: { commune: "X" }, coutTravaux: 100000, lignes: [{ code: "HON_AUTORISATION" }, { code: "CTRL_BET", quantite: 4 }] });
    expect(c2(sans.assietteHonoraires)).toBe(c2(avec.assietteHonoraires));
  });
  it("une ligne au pourcentage sans coût des travaux est refusée", () => {
    expect(() => calculerDevis({ grille: G, type: "MISSION_COMPLETE", presentation: "DETAILLEE", projet: { commune: "X" }, lignes: [{ code: "HON_CHANTIER" }] })).toThrow(DevisInvalide);
  });
});
