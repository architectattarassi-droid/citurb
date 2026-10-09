/**
 * Import / export des fiches de prix au format tableur.
 * - Modèle CSV à séparateur « ; » (Excel FR l'ouvre directement), BOM UTF-8.
 * - Lecture tolérante : « ; », « , » ou tabulation (copier-coller depuis
 *   Excel), guillemets, virgule décimale.
 */
import type { MaterialRef } from "./types";

export const COLONNES = [
  "code", "designation", "unite_vente", "prix_ht", "tva", "quantite_min", "disponibilite", "validite", "marque", "frais_livraison", "delai_jours",
] as const;

/** Marque d'ordre des octets UTF-8 : Excel reconnaît alors l'encodage (accents). */
export const BOM = String.fromCharCode(0xfeff);

const champCsv =(v: string | number | null | undefined): string => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Modèle : une ligne par matériau proposé, unité de vente suggérée (la première vendue), prix vide. */
export function modeleCsv(refs: MaterialRef[]): string {
  const lignes = refs.map((r) => {
    const unites = [r.uniteRef, ...r.ventes.map((v) => v.code)];
    return [r.code, r.libelle, r.ventes[0]?.code || r.uniteRef, "", 20, "", "EN_STOCK", "", "", "", ""].map(champCsv).join(";")
      + `;${champCsv(`unités possibles : ${unites.join(" / ")}`)}`;
  });
  return `${BOM}${[...COLONNES, "aide"].join(";")}\n${lignes.join("\n")}\n`;
}

/** Découpe un texte tabulaire (CSV ; , ou tabulations) en lignes de cellules. */
export function lireTableau(texte: string): string[][] {
  const t = (texte.startsWith(BOM) ? texte.slice(1) : texte).replace(/\r\n?/g, "\n");
  const premiere = t.split("\n", 1)[0];
  const sep = premiere.includes("\t") ? "\t" : (premiere.match(/;/g) || []).length >= (premiere.match(/,/g) || []).length ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [], champ = "", guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"' && champ === "") guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n") { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; }
    else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ""));
}

export interface LigneImport {
  materiauCode: string; uniteVente: string; prixHT: string; tvaPct?: number; quantiteMin?: string; disponibilite?: string;
  validiteJusquau?: string; marque?: string; livraison?: { zone: string; frais: number; delaiJours: number | null }[];
}

const dateIso = (s: string): string => {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s.trim());
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s.trim();
};
const num = (s: string | undefined): number | null => {
  if (!s || !s.trim()) return null;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Lignes du tableur → lignes d'import (les lignes sans prix sont ignorées :
 * le modèle liste tout le catalogue, le fournisseur ne remplit que ce qu'il vend).
 * `zoneParDefaut` : zone des frais de livraison (région du fournisseur).
 */
export function lignesImport(tableau: string[][], zoneParDefaut: string): { lignes: LigneImport[]; ignorees: number; enteteManquante: boolean } {
  if (!tableau.length) return { lignes: [], ignorees: 0, enteteManquante: true };
  const entete = tableau[0].map((h) => h.trim().toLowerCase());
  const idx = (c: string) => entete.indexOf(c);
  if (idx("code") < 0 || idx("prix_ht") < 0) return { lignes: [], ignorees: 0, enteteManquante: true };
  const cell = (l: string[], c: string) => (idx(c) >= 0 ? (l[idx(c)] ?? "").trim() : "");
  const lignes: LigneImport[] = [];
  let ignorees = 0;
  for (const l of tableau.slice(1)) {
    const prix = cell(l, "prix_ht");
    if (!cell(l, "code") || !prix) { ignorees++; continue; }
    const frais = num(cell(l, "frais_livraison")), delai = num(cell(l, "delai_jours"));
    const tva = num(cell(l, "tva"));
    lignes.push({
      materiauCode: cell(l, "code").toUpperCase(),
      uniteVente: cell(l, "unite_vente"),
      prixHT: prix,
      ...(tva !== null ? { tvaPct: tva } : {}),
      ...(cell(l, "quantite_min") ? { quantiteMin: cell(l, "quantite_min") } : {}),
      ...(cell(l, "disponibilite") ? { disponibilite: cell(l, "disponibilite").toUpperCase().replace(/\s+/g, "_") } : {}),
      ...(cell(l, "validite") ? { validiteJusquau: dateIso(cell(l, "validite")) } : {}),
      ...(cell(l, "marque") ? { marque: cell(l, "marque") } : {}),
      ...(frais !== null || delai !== null ? { livraison: [{ zone: zoneParDefaut, frais: frais ?? 0, delaiJours: delai }] } : {}),
    });
  }
  return { lignes, ignorees, enteteManquante: false };
}
