import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  HYPOTHESES, MAIN_OEUVRE, MATERIAUX, OUVRAGES, TVA, chiffrer, coherence, comparerStandings, controleGrille,
  metre, prixOuvrage, recoupements, type ProjetInput,
} from "./index";

const RECHERCHE = (f: string) => fileURLToPath(new URL(`../../../../../docs/prix/recherche/${f}.json`, import.meta.url));

/** Identifiants réellement présents dans les fichiers de recherche. */
function idsRecherche(): Set<string> {
  const ids = new Set<string>();
  for (const f of ["materiaux-gros-oeuvre", "materiaux-second-oeuvre", "marche-prive-main-oeuvre", "marches-publics"]) {
    const d = JSON.parse(readFileSync(RECHERCHE(f), "utf8"));
    for (const e of d.entrees) ids.add(e.id);
  }
  const pi = JSON.parse(readFileSync(RECHERCHE("prix-internes"), "utf8"));
  for (const l of pi.dqe_reels) ids.add(`dqe-reel-kenitra#${l.n}`);
  return ids;
}

const VILLA: ProjetInput = {
  type: "VILLA", ville: "Kénitra", surfacePlancher: 150, niveaux: 2, sol: "BON", standing: "ECONOMIQUE",
  etapes: { terrain: true, finitions: true },
};

describe("référentiel et sous-détails", () => {
  const ids = idsRecherche();

  it("chaque prix sourcé cite des entrées existantes de docs/prix/recherche", () => {
    for (const p of [...Object.values(MATERIAUX), ...Object.values(MAIN_OEUVRE)]) {
      if (p.source.fiabilite === "H") {
        expect(p.source.note, `${"id" in p ? p.id : p.metier} : hypothèse non justifiée`).toBeTruthy();
        continue;
      }
      if (p.source.fichier === "marches-publics" && p.source.ids.length === 0) continue;
      expect(p.source.ids.length).toBeGreaterThan(0);
      for (const id of p.source.ids) expect(ids.has(id), `source inconnue : ${id}`).toBe(true);
    }
  });

  it("chaque ouvrage référence des matériaux, métiers et sous-ouvrages existants, et min ≤ PU ≤ max", () => {
    for (const o of Object.values(OUVRAGES)) {
      for (const c of o.composants) {
        if (c.type === "mat") expect(MATERIAUX[c.ref], `${o.code} → ${c.ref}`).toBeDefined();
        if (c.type === "mo") expect(MAIN_OEUVRE[c.metier]).toBeDefined();
        if (c.type === "ouv") expect(OUVRAGES[c.ref], `${o.code} → ${c.ref}`).toBeDefined();
      }
      const p = prixOuvrage(o.code);
      expect(p.pu).toBeGreaterThan(0);
      expect(p.min).toBeLessThanOrEqual(p.pu + 1e-6);
      expect(p.max).toBeGreaterThanOrEqual(p.pu - 1e-6);
    }
    expect(Object.values(OUVRAGES).filter((o) => !o.interne).length).toBeGreaterThanOrEqual(40);
  });

  it("le prix d'un ouvrage suit le coefficient régional", () => {
    const kenitra = chiffrer({ ...VILLA, ville: "Kénitra" }, { impacts: false });
    const casa = chiffrer({ ...VILLA, ville: "Casablanca" }, { impacts: false });
    expect(casa.travauxHT).toBeGreaterThan(kenitra.travauxHT);
    expect(casa.travauxHT / kenitra.travauxHT).toBeCloseTo(1.06 / 0.93, 1);
  });

  it("les prix d'ouvrage recoupent les prix posés du marché (règle des ±20 %)", () => {
    const rec = recoupements();
    const ok = rec.filter((r) => r.ok).length;
    expect(ok / rec.length).toBeGreaterThanOrEqual(0.8);
    for (const code of ["MAC.01", "STR.03", "ETA.02", "FPL.01", "ALU.02", "ELE.01", "PLO.01", "PEI.01"]) {
      const r = rec.find((x) => x.code === code)!;
      expect(r.ok, `${code} : ${Math.round(r.prix)} contre ${r.reference.map(Math.round).join("-")}`).toBe(true);
    }
  });
});

describe("villa R+1 de 150 m² à Kénitra, bon sol, sans sous-sol", () => {
  it("le coût du bâtiment au m² (base RSK) tombe dans la grille 2026 du moyen standing au luxe", () => {
    for (const standing of ["ECONOMIQUE", "STANDARD", "STANDING", "PREMIUM"] as const) {
      const g = controleGrille(chiffrer({ ...VILLA, standing }, { impacts: false }));
      expect(g.ok, `${standing} : ${Math.round(g.coutM2RSK)} hors ${g.fourchette}`).toBe(true);
    }
  });

  it("très économique : réalisé par tâcheron, ≈ 3 000 DH/m² (dans la grille 2 500-3 500)", () => {
    const r = chiffrer({ ...VILLA, standing: "ULTRA_ECO" }, { impacts: false });
    expect(r.regime).toBe("TACHERON");
    const g = controleGrille(r);
    expect(g.ok, `${Math.round(g.coutM2RSK)}`).toBe(true);
    expect(g.coutM2RSK).toBeGreaterThan(2700);
    expect(g.coutM2RSK).toBeLessThan(3500);
    // En entreprise générale, le même projet coûte 15 à 20 % de plus.
    const e = chiffrer({ ...VILLA, standing: "ULTRA_ECO", regime: "ENTREPRISE" }, { impacts: false });
    expect(e.travauxHT / r.travauxHT).toBeGreaterThan(1.12);
    expect(e.travauxHT / r.travauxHT).toBeLessThan(1.25);
  });

  it("surfaces calculées depuis la parcelle : villa jumelée 294 m², R+1 + sous-sol = 376,8 m² (règle parcelleSP)", () => {
    const r = chiffrer({ ...VILLA, surfacePlancher: 0, surfaceTerrain: 294, parcelle: { villaType: "jumelee" }, sousSol: { profondeur: 3 } }, { impacts: false });
    expect(r.decomposition!.total).toBe(377);
    expect(r.geometrie.emprise).toBeCloseTo(117.6, 1);
    expect(r.geometrie.surfaceSousSol).toBeCloseTo(117.6, 1);
    expect(r.geometrie.surfaceTotale).toBeCloseTo(376.8, 1);
    expect(r.input.mitoyennete).toBe(1);
    expect(r.lignes.some((l) => l.id === "SS.blindage")).toBe(true);
  });

  it("le gros œuvre pèse 42 à 58 % en économique et moyen standing (EnginLoc 45-60 %, recherche lot × standing 48-58 %)", () => {
    for (const standing of ["ULTRA_ECO", "ECONOMIQUE"] as const) {
      const r = chiffrer({ ...VILLA, standing }, { impacts: false });
      expect(r.partGrosOeuvre).toBeGreaterThan(0.42);
      expect(r.partGrosOeuvre).toBeLessThan(0.58);
    }
  });

  it("le coût croît avec le standing", () => {
    const c = comparerStandings(VILLA).map((x) => x.travauxHT);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
  });

  it("TVA 20 % et totaux cohérents", () => {
    const r = chiffrer(VILLA, { impacts: false });
    expect(TVA.taux).toBe(0.2);
    expect(r.totalTTC).toBeCloseTo(r.totalHT * 1.2, 0);
    expect(r.travauxHT).toBeCloseTo(r.lots.reduce((s, l) => s + l.total, 0), 0);
    expect(r.honoraires.lignes.find((h) => h.code === "CTRL")).toBeUndefined();
    expect(r.taxes.lignes.find((t) => t.code === "TAXE_CONSTRUCTION")!.montant).toBe(150 * 30);
    expect(r.impacts).toEqual([]);
    expect(coherence(r).alertes.filter((a) => a.startsWith("Coût du bâtiment"))).toEqual([]);
  });

  it("niveau de précision : 1 par ratios, 2 en métré paramétrique, 3 avec quantités saisies", () => {
    expect(chiffrer({ ...VILLA, etapes: undefined }, { impacts: false }).precision.niveau).toBe(1);
    const n2 = chiffrer(VILLA, { impacts: false });
    expect(n2.precision.niveau).toBe(2);
    const quantites = Object.fromEntries(n2.lignes.map((l) => [l.id, l.qte]));
    const n3 = chiffrer({ ...VILLA, quantites }, { impacts: false });
    expect(n3.precision.niveau).toBe(3);
    expect(n3.travauxHT).toBeCloseTo(n2.travauxHT, 0);
    expect(n3.fourchette.max - n3.fourchette.min).toBeLessThan(n2.fourchette.max - n2.fourchette.min);
  });

  it("une quantité saisie ou une hypothèse modifiée change le DQE", () => {
    const base = chiffrer(VILLA, { impacts: false });
    const q = chiffrer({ ...VILLA, quantites: { "MAC.mursExt": 400 } }, { impacts: false });
    expect(q.lignes.find((l) => l.id === "MAC.mursExt")!.qte).toBe(400);
    expect(q.travauxHT).toBeGreaterThan(base.travauxHT);
    const hy = metre({ ...VILLA, hypotheses: { "str.poutres": 0.06 } });
    expect(hy.lignes.find((l) => l.id === "STR.poutres")!.qte).toBeCloseTo(0.06 * 150, 1);
    expect(HYPOTHESES["str.poutres"].source.fiabilite).toBe("H");
  });
});

describe("même villa avec sous-sol de 2,80 m en sol argileux", () => {
  const r = chiffrer({ ...VILLA, sol: "ARGILE_REMBLAI", sousSol: { profondeur: 2.8 } });
  const base = chiffrer(VILLA, { impacts: false });

  it("passe en radier, ajoute voile périphérique, drainage et étanchéité enterrée", () => {
    expect(r.geometrie.fondation).toBe("RADIER");
    for (const id of ["SS.deblai", "SS.voile", "SS.drainage", "SS.etancheite", "TER.evacuation", "FON.radier", "TER.substitution"]) {
      expect(r.lignes.some((l) => l.id === id), id).toBe(true);
    }
  });

  it("chiffre l'impact du sous-sol, dont le soutènement, et celui du sol", () => {
    const ss = r.impacts.find((i) => i.cle === "sous_sol")!;
    const sol = r.impacts.find((i) => i.cle === "sol")!;
    expect(ss.montantHT).toBeGreaterThan(0);
    // 75 m² de sous-sol : entre 2 000 et 6 000 DH HT par m² de sous-sol
    expect(ss.montantHT / 75).toBeGreaterThan(2000);
    expect(ss.montantHT / 75).toBeLessThan(6000);
    expect(ss.dontSoutenement / ss.montantHT).toBeGreaterThan(0.35);
    expect(sol.montantHT).toBeGreaterThan(0);
    expect(r.travauxHT).toBeGreaterThan(base.travauxHT + ss.montantHT * 0.9);
  });

  it("une nappe ajoute cuvelage et épuisement", () => {
    const n = chiffrer({ ...VILLA, sousSol: { profondeur: 2.8 }, nappe: true }, { impacts: false });
    expect(n.lignes.some((l) => l.id === "SS.cuvelage")).toBe(true);
    expect(n.lignes.some((l) => l.id === "SS.epuisement")).toBe(true);
    expect(n.geometrie.fondation).toBe("RADIER");
  });
});

describe("villa sur terrain en pente", () => {
  it("ajoute plateforme, murs de soutènement et redans, et chiffre leur impact", () => {
    const r = chiffrer({ ...VILLA, pente: 15, surfaceTerrain: 600 });
    expect(r.lignes.some((l) => l.id === "PENTE.soutenement")).toBe(true);
    const p = r.impacts.find((i) => i.cle === "pente")!;
    expect(p.montantHT).toBeGreaterThan(0);
    expect(p.dontSoutenement).toBeGreaterThan(0);
    const plat = chiffrer({ ...VILLA, pente: 2, surfaceTerrain: 600 }, { impacts: false });
    expect(plat.lignes.some((l) => l.tags.includes("pente"))).toBe(false);
  });
});

describe("immeuble R+4 à Rabat (mutualisation)", () => {
  const IMM: ProjetInput = { type: "IMMEUBLE", ville: "Rabat", surfacePlancher: 1500, niveaux: 5, standing: "STANDARD", etapes: { terrain: true, finitions: true } };
  const r = chiffrer(IMM, { impacts: false });

  it("utilise le même moteur : ascenseur, voiles de cage, bureau de contrôle, taxe collective", () => {
    expect(r.geometrie.ascenseur).toBe(true);
    expect(r.geometrie.logements).toBeGreaterThan(10);
    expect(r.lignes.some((l) => l.id === "STR.voiles")).toBe(true);
    expect(r.honoraires.lignes.some((h) => h.code === "CTRL")).toBe(true);
    expect(r.taxes.lignes.find((t) => t.code === "TAXE_CONSTRUCTION")!.montant).toBe(1500 * 20);
  });

  it("coûte moins cher au m² qu'une villa de même standing et recoupe le marché (Fadil 2025 : 3 500 / 4 800 / 6 500)", () => {
    const villa = chiffrer({ ...VILLA, standing: "STANDARD", ville: "Rabat" }, { impacts: false });
    expect(r.coutM2HT).toBeLessThan(villa.coutM2HT);
    const marche: [ProjetInput["standing"], number][] = [["ECONOMIQUE", 3500], ["STANDARD", 4800], ["STANDING", 6500]];
    for (const [standing, ref] of marche) {
      const g = controleGrille(chiffrer({ ...IMM, standing }, { impacts: false }));
      expect(Math.abs(g.coutM2RSK / ref - 1), standing).toBeLessThan(0.15);
    }
    // La grille IMM est au-dessus du marché observé : écart borné à 20 %.
    expect(controleGrille(r).ecart).toBeGreaterThan(-0.2);
  });
});

describe("correspondance avec le catalogue CIT (contrat fournisseurs ↔ chiffrage)", () => {
  it("chaque code CIT existe et les unités concordent", async () => {
    const { materiau } = await import("../materiaux/catalogue");
    const { CORRESPONDANCE_CIT, UNITE_EQUIVALENTE, prixComposantDepuisCIT } = await import("./correspondanceCIT");
    for (const [id, c] of Object.entries(CORRESPONDANCE_CIT)) {
      const m = materiau(c.cit);
      expect(m, `${id} → ${c.cit}`).toBeDefined();
      expect(MATERIAUX[id], id).toBeDefined();
      if (c.facteur === 1) expect(UNITE_EQUIVALENTE[m!.uniteRef], `${id} : ${MATERIAUX[id].unite} / ${m!.uniteRef}`).toBe(MATERIAUX[id].unite);
    }
    expect(prixComposantDepuisCIT("CIMENT_CPJ45", { "CIT-GO-008": 1.6 })).toBeCloseTo(80, 5);
    expect(prixComposantDepuisCIT("SABLE", {})).toBe(MATERIAUX.SABLE.ref);
  });
});
