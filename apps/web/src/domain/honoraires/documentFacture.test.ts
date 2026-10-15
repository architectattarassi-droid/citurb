import { describe, expect, it } from "vitest";
import { construireDocumentFacture, type ContexteFacture } from "./documentFacture";
import { entierEnLettres, montantEnLettres } from "./lettres";
import { documentVersPdf } from "./rendu/pdf";

describe("montant en lettres", () => {
  it.each([
    [1, "un"], [16, "seize"], [17, "dix-sept"], [21, "vingt et un"], [71, "soixante et onze"], [77, "soixante-dix-sept"], [80, "quatre-vingts"],
    [81, "quatre-vingt-un"], [91, "quatre-vingt-onze"], [100, "cent"], [200, "deux cents"], [280, "deux cent quatre-vingts"], [1000, "mille"],
    [2000, "deux mille"], [80000, "quatre-vingt mille"], [200300, "deux cent mille trois cents"], [1000000, "un million"], [2508000, "deux millions cinq cent huit mille"],
  ])("%i → %s", (n, t) => expect(entierEnLettres(n)).toBe(t));
  it("dirhams et centimes", () => {
    expect(montantEnLettres("6000")).toBe("six mille dirhams");
    expect(montantEnLettres("13851.50")).toBe("treize mille huit cent cinquante et un dirhams et cinquante centimes");
    expect(montantEnLettres("1.01")).toBe("un dirham et un centime");
  });
});

const MEHDAOUI: ContexteFacture = {
  numero: "FAC-2026-0001", type: "FORFAIT_UNIQUE", dateEmission: "2026-10-16", dateEcheance: "2026-10-31",
  client: { nomAffiche: "Monsieur Rida MEHDAOUI", type: "PERSONNE" },
  projet: { intitule: "Construction d'un immeuble R+1", commune: "Mehdiya", prefecture: "Kénitra", lot: "Lot n° 624", titreFoncier: "TF 84848/13" },
  architecte: { nom: "ARC-BATI ARCHITECTURE", architecte: "Yassine ATTARASSI" },
  devis: { numero: "DEV-2026-0001", dateAcceptation: "2026-10-16" },
  echeance: { libelle: "Règlement total à la commande", phase: "Autorisation de construire (Rokhas)" },
  lignes: [{ libelle: "Dépôt et obtention d'une nouvelle décision d'autorisation", montantHT: "5000.00" }],
  tauxTVA: "20",
};

describe("facture Mehdaoui", () => {
  const d = construireDocumentFacture(MEHDAOUI);
  const t = JSON.stringify(d);
  it("HT / TVA 20 % / TTC, montant en lettres, référence au devis accepté", () => {
    expect(d.titre).toBe("FACTURE N° FAC-2026-0001");
    for (const x of ["5\u00a0000,00\u00a0DH", "TVA 20 %", "1\u00a0000,00\u00a0DH", "6\u00a0000,00\u00a0DH", "six mille dirhams toutes taxes comprises", "DEV-2026-0001, accepté le 16 octobre 2026", "HSE DECO"]) expect(t).toContain(x);
  });
  it("mentions légales manquantes signalées, aucune coordonnée de tiers", () => {
    expect(t).toContain("Mentions légales à compléter avant envoi");
    expect(t).toContain("ICE de HSE DECO");
    expect(t).toContain("Coordonnées bancaires de HSE DECO : à compléter");
    expect(t).not.toMatch(/@|architectattarassi|700 127 892/);
  });
  it("société sans ICE : signalé", () => {
    expect(JSON.stringify(construireDocumentFacture({ ...MEHDAOUI, client: { nomAffiche: "SARL TEST", type: "SOCIETE" } }))).toContain("ICE du client (société)");
  });
  it("avoir : montant négatif, facture d'origine", () => {
    const a = construireDocumentFacture({ ...MEHDAOUI, numero: "AVO-2026-0001", type: "AVOIR", factureOrigine: { numero: "FAC-2026-0001", dateEmission: "2026-10-16" }, motif: "Erreur de montant", lignes: [{ libelle: "Annulation", montantHT: "-5000.00" }] });
    expect(a.titre).toBe("AVOIR N° AVO-2026-0001");
    expect(JSON.stringify(a)).toContain("−6\u00a0000,00\u00a0DH");
    expect(JSON.stringify(a)).toContain("FAC-2026-0001 du 16 octobre 2026");
  });
  it("rendu PDF valide", () => {
    expect(String.fromCharCode(...documentVersPdf(d, "Empreinte du contenu : x").slice(0, 8))).toBe("%PDF-1.4");
  });
});
