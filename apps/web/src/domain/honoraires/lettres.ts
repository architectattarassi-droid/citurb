/**
 * Montant en toutes lettres (français, usage des factures marocaines :
 * « Arrêtée la présente facture à la somme de … »). Règles de l'orthographe
 * traditionnelle : soixante-dix, quatre-vingts, « et » pour 21…71, accord de
 * « cent » et « vingt » en fin de nombre, « mille » invariable.
 */
import { Dec, type EntreeDecimal } from "./decimal";

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function moinsDeCent(n: number, final: boolean): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10), u = n % 10;
  if (d <= 6) return u === 0 ? DIZAINES[d] : u === 1 ? `${DIZAINES[d]} et un` : `${DIZAINES[d]}-${UNITES[u]}`;
  if (d === 7) return u === 1 ? "soixante et onze" : `soixante-${moinsDeCent(10 + u, false)}`;
  // 80…99
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${moinsDeCent(n - 80, false)}`;
}

function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100), r = n % 100;
  const centaine = c === 0 ? "" : c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 && final ? "s" : ""}`;
  if (r === 0) return centaine || "zéro";
  return centaine ? `${centaine} ${moinsDeCent(r, final)}` : moinsDeCent(r, final);
}

export function entierEnLettres(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Entier positif attendu");
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const milliards = Math.floor(n / 1e9), millions = Math.floor((n % 1e9) / 1e6), milliers = Math.floor((n % 1e6) / 1e3), reste = n % 1e3;
  if (milliards) parts.push(`${moinsDeMille(milliards, false)} milliard${milliards > 1 ? "s" : ""}`);
  if (millions) parts.push(`${moinsDeMille(millions, false)} million${millions > 1 ? "s" : ""}`);
  if (milliers) parts.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers, false)} mille`);
  if (reste) parts.push(moinsDeMille(reste, true));
  return parts.join(" ");
}

/** « treize mille huit cent cinquante et un dirhams et cinquante centimes ». */
export function montantEnLettres(v: EntreeDecimal): string {
  const [ent, cts] = Dec.de(v).fixe2().replace("-", "").split(".");
  const e = Number(ent), c = Number(cts);
  const dh = `${entierEnLettres(e)} dirham${e > 1 ? "s" : ""}`;
  return c ? `${dh} et ${entierEnLettres(c)} centime${c > 1 ? "s" : ""}` : dh;
}
