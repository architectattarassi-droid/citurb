/**
 * Document de devis (spec §5) et rendus PDF / DOCX — recettes Mehdaoui (forfait
 * complémentaire, cas de départ §11), Ouazzane (détaillé) et Casablanca (packs).
 */
import { describe, expect, it } from "vitest";
import { calculerDevisComplet, entreeRenouvellement, type EntreeDevisComplet } from "./devisComplet";
import { construireDocument, empreinteDocument, mentionEmpreinte, type Bloc, type ContexteDocument, type DocumentDevis } from "./documentDevis";
import { GRILLE_ARC_BATI_2026_10 as G } from "./grilleArcBati";
import { parserGabarit } from "./metre";
import { documentVersDocx } from "./rendu/docx";
import { documentVersPdf } from "./rendu/pdf";
import { lireZip } from "./rendu/zip";

const ARCHI = { nom: "ARC-BATI ARCHITECTURE", architecte: "Yassine ATTARASSI", titre: "Architecte DENA" };

const CTX_MEHDAOUI: ContexteDocument = {
  numero: "DEV-2026-0001", dateEmission: "2026-10-15",
  client: { nomAffiche: "Monsieur Rida MEHDAOUI", type: "PERSONNE" },
  projet: {
    intitule: "Construction d'un immeuble R+1", gabarit: "R+1", lot: "Lot n° 624", lotissement: "Lotissement Alliance Darna",
    commune: "Mehdiya", prefecture: "Kénitra", titreFoncier: "TF 84848/13", autorisationNum: "GUcmha-0036/2023",
    etatChantier: "Permis d'habiter partiel délivré pour le rez-de-chaussée",
  },
  architecte: ARCHI, missionsReglees: [],
};

function doc(e: EntreeDevisComplet, ctx: ContexteDocument, typologie: "MAISON_INDIVIDUELLE" | "IMMEUBLE" | null = null): DocumentDevis {
  const c = calculerDevisComplet(e, G, { typologie, commune: ctx.projet.commune, missionsDejaReglees: [] });
  if (!c.ok) throw new Error(c.questions.join(" ; "));
  return construireDocument(e, c, ctx);
}
const textes = (d: DocumentDevis) => JSON.stringify(d.blocs);
const sections = (d: DocumentDevis) => d.blocs.filter((b): b is Extract<Bloc, { t: "section" }> => b.t === "section").map((b) => b.titre);

describe("recette Mehdaoui — devis forfaitaire complémentaire", () => {
  const d = doc(entreeRenouvellement(), CTX_MEHDAOUI);
  it("titre, pas de base de calcul, objet de la mission", () => {
    expect(d.titre).toBe("DEVIS D'HONORAIRES — MISSION COMPLÉMENTAIRE");
    expect(sections(d)[0]).toBe("1. OBJET DE LA MISSION");
    expect(sections(d).some((s) => s.includes("BASE DE CALCUL"))).toBe(false);
  });
  it("total 5 000,00 DH, commune nommée, modalité d'avance, exclusions", () => {
    const t = textes(d);
    expect(t).toContain("5 000,00 DH");
    expect(t).toContain("Commune de Mehdiya");
    expect(t).toContain("payable d'avance");
    for (const x of ["Taxes et redevances communales", "Modification du projet autorisé", "Prestations des autres intervenants", "Suivi de chantier"]) expect(t).toContain(x);
    expect(t).toContain("Permis d'habiter partiel délivré pour le rez-de-chaussée");
  });
  it("émetteur CITURBAREA / HSE DECO ; aucune coordonnée de cabinet ni de client", () => {
    const entete = d.blocs[0] as Extract<Bloc, { t: "entete" }>;
    expect(entete.marque).toBe("CITURBAREA");
    expect(entete.lignes.join(" ")).toContain("HSE DECO");
    expect(textes(d)).not.toMatch(/@|architectattarassi|700 127 892/);
    expect(textes(d)).toContain("ARC-BATI ARCHITECTURE");
  });
  it("lignes d'identification vides masquées, sauf pour remplissage manuel", () => {
    const ident = (x: DocumentDevis) => (x.blocs.find((b) => b.t === "identification") as Extract<Bloc, { t: "identification" }>).lignes.map(([k]) => k);
    const sansAut = doc(entreeRenouvellement(), { ...CTX_MEHDAOUI, projet: { ...CTX_MEHDAOUI.projet, titreFoncier: null } });
    expect(ident(sansAut)).not.toContain("Titre foncier");
    const manuel = doc({ ...entreeRenouvellement(), pourRemplissageManuel: true }, { ...CTX_MEHDAOUI, projet: { ...CTX_MEHDAOUI.projet, titreFoncier: null } });
    expect(ident(manuel)).toContain("Titre foncier");
  });
});

describe("recette Ouazzane — détaillée", () => {
  const e: EntreeDevisComplet = {
    type: "MISSION_COMPLETE", presentation: "DETAILLEE", modalitesPaiement: "PAR_TRANCHES", validiteJours: 30,
    metre: { superficieTerrain: "107", deductionEmprise: "12", niveaux: parserGabarit("R+2")! },
    puElevation: "2500", fondations: { incluses: false, pu: "600" },
    lignes: [{ code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }, { code: "BA" }, { code: "CTRL_BET", quantite: "6" }, { code: "GEOTECH" }, { code: "TOPO" }],
    exclusions: [],
  };
  const d = doc(e, { ...CTX_MEHDAOUI, numero: "DEV-2026-0002", projet: { intitule: "Construction d'une maison individuelle R+2", commune: "Ouazzane" } }, "MAISON_INDIVIDUELLE");
  it("base de calcul littérale, coût, récapitulatif A + B = 28 085", () => {
    const t = textes(d);
    expect(sections(d)[0]).toBe("1. BASE DE CALCUL");
    expect(t).toContain("(107 − 12) × 2");
    expect(t).toContain("769 500,00 DH");
    expect(t).toContain("38 475,00 DH");
    expect(t).toContain("TOTAL À ENGAGER OBLIGATOIREMENT (A + B)");
    expect(t).toContain("28 085,00 DH");
    expect(t).toContain("Bureau d'études");
  });
});

describe("recette Casablanca — packs", () => {
  const e: EntreeDevisComplet = {
    type: "MISSION_COMPLETE", presentation: "PACKS", modalitesPaiement: "PAR_TRANCHES", validiteJours: 30,
    metre: {
      superficieTerrain: "162", surfaceCour: "16", empriseEtageAvecEncorbellement: "192", niveaux: parserGabarit("R+3+SS")!,
      regles: { sousSol: { emprise: "TOTALE", courDeduite: false, statut: "HYPOTHESE" }, courRdc: { deduite: true, statut: "HYPOTHESE" } },
    },
    puElevation: "3000", fondations: { incluses: true },
    lignes: [{ code: "HON_CONCEPTION" }, { code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }, { code: "HON_DECO" }, { code: "BA" }, { code: "GEOTECH" }],
    exclusions: [],
  };
  const d = doc(e, { ...CTX_MEHDAOUI, projet: { intitule: "Construction d'un immeuble R+3 avec sous-sol", commune: "Casablanca" } }, "IMMEUBLE");
  it("trois packs à cocher, mention restrictive, hypothèses en bandeau, Sur devis", () => {
    const t = textes(d);
    for (const m of ["75 240,00 DH", "125 400,00 DH", "163 020,00 DH"]) expect(t).toContain(m);
    expect(t).toContain("Plan type 2D, sans variante, sans 3D et sans modification après validation");
    expect(t).toContain("\"caseACocher\":true");
    expect(d.blocs.some((b) => b.t === "hypotheses")).toBe(true);
    expect(t).toContain("Sur devis");
  });
});

describe("rendus PDF et DOCX", () => {
  const d = doc(entreeRenouvellement(), CTX_MEHDAOUI);
  const pied = mentionEmpreinte("0123456789abcdef0123");

  it("PDF valide : en-tête, table xref aux bons décalages, fin de fichier", () => {
    const o = documentVersPdf(d, pied);
    const s = String.fromCharCode(...o);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(xref, xref + 4)).toBe("xref");
    const entrees = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    entrees.forEach((off, i) => expect(s.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(s).toContain("/BaseFont /Helvetica");
    expect(s).toContain("MISSION COMPLÉMENTAIRE");
    expect(s).toContain("Empreinte du contenu : 0123456789abcdef");
  });
  it("brouillon : filigrane BROUILLON", () => {
    const b = doc(entreeRenouvellement(), { ...CTX_MEHDAOUI, numero: null });
    expect(b.brouillon).toBe(true);
    expect(String.fromCharCode(...documentVersPdf(b, mentionEmpreinte(null)))).toContain("(BROUILLON) Tj");
  });
  it("DOCX : archive lisible, CRC justes, XML équilibré, Calibri, même numéro et empreinte", () => {
    const z = lireZip(documentVersDocx(d, pied));
    for (const n of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/footer1.xml", "word/_rels/document.xml.rels"]) expect(z.has(n)).toBe(true);
    const xml = new TextDecoder().decode(z.get("word/document.xml"));
    for (const tag of ["w:p", "w:tbl", "w:tr", "w:tc", "w:r"]) {
      expect((xml.match(new RegExp(`<${tag}>`, "g")) || []).length).toBe((xml.match(new RegExp(`</${tag}>`, "g")) || []).length);
    }
    expect(xml).toContain("5 000,00 DH");
    expect(new TextDecoder().decode(z.get("word/styles.xml"))).toContain("Calibri");
    const ftr = new TextDecoder().decode(z.get("word/footer1.xml"));
    expect(ftr).toContain("DEV-2026-0001");
    expect(ftr).toContain("0123456789abcdef");
  });
  it("déterministe : même contenu → mêmes octets et même empreinte", async () => {
    const d2 = doc(entreeRenouvellement(), CTX_MEHDAOUI);
    expect(await empreinteDocument(d)).toBe(await empreinteDocument(d2));
    expect(documentVersPdf(d, pied)).toEqual(documentVersPdf(d2, pied));
    expect(documentVersDocx(d, pied)).toEqual(documentVersDocx(d2, pied));
    const autre = doc({ ...entreeRenouvellement(), validiteJours: 15 }, CTX_MEHDAOUI);
    expect(await empreinteDocument(autre)).not.toBe(await empreinteDocument(d));
  });
});
