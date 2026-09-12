/**
 * Tarification P2 — barème plancher, grille réelle, catalogue.
 *
 * Ces tests gardent l'invariant doctrinal : le prix proposé ne descend jamais
 * sous le plancher CNOA. Si une ligne de la grille le viole, la suite échoue
 * et rien ne part en production.
 */

import { describe, it, expect } from "vitest";
import {
  BAREME_CNOA_2021,
  CATEGORY_CODES,
  ErreurDevis,
  GRILLE_REELLE,
  HONORAIRES_RATE,
  SEUIL_1_1_M2,
  SEUIL_AMG_M2,
  SOUS_TYPES,
  computeQuote,
  niveauxDe,
  resoudreCategorie,
  sousTypeDe,
} from "@citurbarea/pricing-cnoa";

describe("Grille réelle — conformité au plancher CNOA", () => {
  it("couvre exactement les catégories du barème", () => {
    expect(Object.keys(GRILLE_REELLE).sort()).toEqual([...CATEGORY_CODES].sort());
  });

  for (const code of CATEGORY_CODES) {
    it(`${code} — plancher de la grille = barème CNOA`, () => {
      expect(GRILLE_REELLE[code].plancher).toBe(BAREME_CNOA_2021[code].costPerM2);
    });

    it(`${code} — chaque niveau part au-dessus du plancher`, () => {
      const entry = GRILLE_REELLE[code];
      const niveaux = Object.entries(entry.niveaux);
      expect(niveaux.length).toBeGreaterThan(0);
      for (const [niveau, [bas, haut]] of niveaux) {
        expect(bas, `${code}/${niveau} : bas ${bas} < plancher ${entry.plancher}`).toBeGreaterThanOrEqual(entry.plancher);
        if (haut !== null) expect(haut, `${code}/${niveau} : haut < bas`).toBeGreaterThanOrEqual(bas);
      }
    });
  }
});

describe("Catalogue — chaque sous-type mène à une catégorie du barème", () => {
  for (const st of SOUS_TYPES) {
    it(`${st.value} — cible une catégorie connue ou est déclaré hors barème`, () => {
      if (st.horsBareme) {
        expect(st.categorie).toBeUndefined();
        expect(st.categorieParNiveau).toBeUndefined();
        return;
      }
      const cibles = st.categorieParNiveau ? Object.values(st.categorieParNiveau) : [st.categorie];
      expect(cibles.length).toBeGreaterThan(0);
      for (const c of cibles) {
        expect(BAREME_CNOA_2021[c!]).toBeDefined();
      }
    });

    it(`${st.value} — les niveaux proposés existent dans la grille de leur catégorie`, () => {
      if (!st.categorieParNiveau) return;
      for (const [niveau, cat] of Object.entries(st.categorieParNiveau)) {
        expect(niveauxDe(cat), `${st.value}/${niveau} absent de ${cat}`).toContain(niveau);
      }
    });
  }

  it("R+4 relève du collectif 3.x, jamais de 1.1", () => {
    const r4 = sousTypeDe("collectif_r4")!;
    expect(r4.categorie).toBeUndefined();
    expect(Object.values(r4.categorieParNiveau!)).not.toContain("1.1");
    expect(r4.categorieParNiveau!.moyen).toBe("3.2");
  });

  it("école et mosquée sont la même catégorie 5.3", () => {
    expect(sousTypeDe("epig_enseignement_culte")!.categorie).toBe("5.3");
    expect(SOUS_TYPES.filter((s) => s.categorie === "5.3")).toHaveLength(1);
  });

  it("le changement d'affectation villa → équipement est un EPIG, pas un aménagement", () => {
    const ch = sousTypeDe("epig_changement_affectation")!;
    expect(ch.famille).toBe("epig");
    expect(ch.categorie!.startsWith("5.")).toBe(true);
  });
});

describe("Critère 1 — Immeuble R+4, 1 000 m², niveau Moyen", () => {
  const q = computeQuote({ section: "IMM", categoryCode: "3.2", niveau: "moyen", surfacePlancherM2: 1000 });

  it("retient la catégorie 3.2", () => {
    expect(q.meta.category).toBe("3.2");
    expect(q.meta.niveau).toBe("moyen");
  });

  it("retient 4 500 000 DH de travaux et 225 000 DH d'honoraires HT", () => {
    expect(q.base.coutReel).toBe(4_500_000);
    expect(q.base.coutRetenu).toBe(4_500_000);
    expect(q.honoraires.totalHT).toBe(225_000);
    expect(q.honoraires.totalHT).toBe(Math.round(q.base.coutRetenu! * HONORAIRES_RATE));
  });

  it("annonce le plancher 3 700 respecté", () => {
    expect(q.base.coutPlancher).toBe(3_700_000);
    expect(q.conformite).toEqual({ plancherRespecte: true, categorie: "3.2", plancherM2: 3700 });
  });

  it("expose la fourchette affichée au client", () => {
    expect(q.base.fourchette).toEqual([4500, 5500]);
  });
});

describe("Critère 2 — seuil des 500 m² de la catégorie 1.1", () => {
  it("900 m² bascule en 3.1 et le dit", () => {
    const q = computeQuote({ section: "IMM", categoryCode: "1.1", niveau: "economique", surfacePlancherM2: 900 });
    expect(q.meta.category).toBe("3.1");
    expect(q.meta.bascule).toEqual({ de: "1.1", vers: "3.1", raison: "surface_sup_500" });
    expect(q.notes.some((n) => n.includes("collectif"))).toBe(true);
  });

  it("450 m² reste en 1.1", () => {
    const q = computeQuote({ section: "IMM", categoryCode: "1.1", niveau: "economique", surfacePlancherM2: 450 });
    expect(q.meta.category).toBe("1.1");
    expect(q.meta.bascule).toBeUndefined();
  });

  it("le seuil est celui du barème", () => {
    expect(SEUIL_1_1_M2).toBe(500);
    expect(resoudreCategorie("1.1", 500).categorie).toBe("1.1");
    expect(resoudreCategorie("1.1", 501).categorie).toBe("3.1");
  });
});

describe("Critère 3 — clinique (5.7)", () => {
  const q = computeQuote({ section: "EPIG", categoryCode: "5.7", niveau: "standard", surfacePlancherM2: 800, followMode: "PHOTOS" });

  it("interdit le suivi photos et bascule en suivi physique", () => {
    expect(q.meta.photoOptionAvailable).toBe(false);
    expect(q.meta.followMode).toBe("ON_SITE");
  });

  it("porte la note DCE + CPS sur le devis", () => {
    expect(q.notes.some((n) => n.includes("DCE + CPS"))).toBe(true);
  });
});

describe("Critère 4 — aménagement tranché par la surface", () => {
  it("40 m² relève de 6.1", () => {
    const q = computeQuote({ section: "AMG", categoryCode: "6.2", niveau: "standard", surfacePlancherM2: 40 });
    expect(q.meta.category).toBe("6.1");
    expect(q.meta.bascule?.raison).toBe("amg_petite_surface");
  });

  it("120 m² relève de 6.2", () => {
    const q = computeQuote({ section: "AMG", categoryCode: "6.1", niveau: "standard", surfacePlancherM2: 120 });
    expect(q.meta.category).toBe("6.2");
    expect(q.meta.bascule?.raison).toBe("amg_grande_surface");
  });

  it("le seuil est celui du barème et l'activité n'intervient pas", () => {
    expect(SEUIL_AMG_M2).toBe(50);
    const restaurant = computeQuote({ section: "AMG", categoryCode: "6.2", niveau: "standard", surfacePlancherM2: 40 });
    const agence = computeQuote({ section: "AMG", categoryCode: "6.1", niveau: "standard", surfacePlancherM2: 40 });
    expect(restaurant.meta.category).toBe(agence.meta.category);
  });
});

describe("Critère 5 — lotissement hors barème", () => {
  const q = computeQuote({ section: "LOT", surfaceTerrainHa: 3 });

  it("ne calcule aucun honoraire et demande un devis personnalisé", () => {
    expect(q.meta.requiresQuotePersonnalise).toBe(true);
    expect(q.honoraires.totalHT).toBeNull();
    expect(q.meta.category).toBeUndefined();
    expect(q.conformite).toBeUndefined();
  });
});

describe("Validation du niveau — aucun repli silencieux", () => {
  it("refuse un niveau inconnu pour la catégorie", () => {
    expect(() => computeQuote({ section: "IMM", categoryCode: "3.2", niveau: "luxe", surfacePlancherM2: 500 }))
      .toThrowError(ErreurDevis);
    try {
      computeQuote({ section: "IMM", categoryCode: "3.2", niveau: "luxe", surfacePlancherM2: 500 });
    } catch (e) {
      expect((e as ErreurDevis).code).toBe("niveau_invalide");
    }
  });

  it("exige un niveau quand la catégorie en propose plusieurs", () => {
    try {
      computeQuote({ section: "IMM", categoryCode: "1.1", surfacePlancherM2: 300 });
      throw new Error("aurait dû échouer");
    } catch (e) {
      expect((e as ErreurDevis).code).toBe("niveau_requis");
    }
  });

  it("déduit le niveau unique d'une catégorie qui n'en propose qu'un", () => {
    const q = computeQuote({ section: "IMM", categoryCode: "1.2", surfacePlancherM2: 300 });
    expect(q.meta.niveau).toBe("conventionne");
  });

  it("refuse une catégorie hors de sa section", () => {
    try {
      computeQuote({ section: "IMM", categoryCode: "5.7", niveau: "standard", surfacePlancherM2: 300 });
      throw new Error("aurait dû échouer");
    } catch (e) {
      expect((e as ErreurDevis).code).toBe("categorie_section_invalide");
    }
  });
});

describe("Plancher CNOA — jamais mordu, sur toute la grille", () => {
  it("coutRetenu ≥ coutPlancher pour chaque catégorie et chaque niveau", () => {
    for (const code of CATEGORY_CODES) {
      const section = BAREME_CNOA_2021[code].validSections[0];
      for (const niveau of niveauxDe(code)) {
        // Surface choisie pour ne déclencher aucune bascule (1.1 ≤ 500, AMG cohérent).
        const surface = code === "6.1" ? 40 : code === "1.1" ? 400 : 200;
        const q = computeQuote({ section, categoryCode: code, niveau, surfacePlancherM2: surface });
        expect(q.conformite!.plancherRespecte, `${code}/${niveau}`).toBe(true);
        expect(q.base.coutRetenu!).toBeGreaterThanOrEqual(q.base.coutPlancher!);
      }
    }
  });
});
