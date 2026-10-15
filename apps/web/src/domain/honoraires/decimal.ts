/**
 * Décimal exact pour le module Devis & Facturation (spec §2.5 : « calculs en
 * décimal, jamais en flottant »).
 *
 * Valeur = entier BigInt à ECHELLE décimales fixes (10). Les additions sont
 * exactes ; une multiplication arrondit au 10⁻¹⁰ (demi au-dessus), ce qui ne
 * touche jamais les centimes des montants du cabinet. Les montants sont
 * arrondis au centime (demi au-dessus, « arrondi commercial ») par `centimes()`.
 * Aucun nombre JavaScript n'intervient dans un calcul : une entrée `number`
 * est relue par sa représentation décimale (`String(n)`).
 */

const ECHELLE = 10;
const UN = 10n ** BigInt(ECHELLE);

function diviserArrondi(n: bigint, d: bigint): bigint {
  const neg = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n, ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  return neg ? -q : q;
}

export type EntreeDecimal = Dec | string | number | bigint;

export class Dec {
  private constructor(readonly brut: bigint) {}

  static readonly ZERO = new Dec(0n);

  /** Lit « 1 234,56 », « 1234.56 », 1234.56, 12n. Refuse NaN, Infinity et l'écriture exponentielle. */
  static de(v: EntreeDecimal): Dec {
    if (v instanceof Dec) return v;
    if (typeof v === "bigint") return new Dec(v * UN);
    let s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
    s = s.replace(/[\s  ]/g, "").replace(",", ".");
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (!m[2] && !m[3])) throw new Error(`Décimal invalide : ${String(v)}`);
    const frac = (m[3] || "").padEnd(ECHELLE + 1, "0");
    let brut = BigInt(m[2] || "0") * UN + BigInt(frac.slice(0, ECHELLE));
    if (Number(frac[ECHELLE]) >= 5) brut += 1n;
    return new Dec(m[1] === "-" ? -brut : brut);
  }

  static somme(vs: EntreeDecimal[]): Dec {
    return vs.reduce<Dec>((a, v) => a.plus(v), Dec.ZERO);
  }

  plus(v: EntreeDecimal): Dec { return new Dec(this.brut + Dec.de(v).brut); }
  moins(v: EntreeDecimal): Dec { return new Dec(this.brut - Dec.de(v).brut); }
  fois(v: EntreeDecimal): Dec { return new Dec(diviserArrondi(this.brut * Dec.de(v).brut, UN)); }
  divise(v: EntreeDecimal): Dec {
    const d = Dec.de(v).brut;
    if (d === 0n) throw new Error("Division par zéro");
    return new Dec(diviserArrondi(this.brut * UN, d));
  }
  /** this × pourcentage / 100 (quote-part 30 → 30 %). */
  pourcent(p: EntreeDecimal): Dec { return this.fois(p).divise(100); }

  /** Arrondi au centime, demi au-dessus (en valeur absolue). */
  centimes(): Dec {
    const pas = UN / 100n;
    return new Dec(diviserArrondi(this.brut, pas) * pas);
  }

  cmp(v: EntreeDecimal): number { const b = Dec.de(v).brut; return this.brut < b ? -1 : this.brut > b ? 1 : 0; }
  egal(v: EntreeDecimal): boolean { return this.cmp(v) === 0; }
  estNul(): boolean { return this.brut === 0n; }
  estNegatif(): boolean { return this.brut < 0n; }

  /** Représentation décimale exacte, sans zéros inutiles : « 11542.5 », « 285 ». */
  toString(): string {
    const neg = this.brut < 0n, a = neg ? -this.brut : this.brut;
    const ent = (a / UN).toString();
    const frac = (a % UN).toString().padStart(ECHELLE, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${ent}${frac ? `.${frac}` : ""}`;
  }

  /** Deux décimales, point : « 11542.50 » (stockage NUMERIC, JSON). */
  fixe2(): string {
    const c = this.centimes().brut / (UN / 100n);
    const neg = c < 0n, a = neg ? -c : c;
    return `${neg ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
  }

  toJSON(): string { return this.toString(); }
}

const NBSP = " ";

/** « 125 400,00 DH » — milliers séparés par une espace insécable (spec §2.5). */
export function formatDH(v: EntreeDecimal, suffixe = true): string {
  const [ent, dec] = Dec.de(v).fixe2().split(".");
  const neg = ent.startsWith("-");
  const chiffres = neg ? ent.slice(1) : ent;
  const groupe = chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${neg ? "−" : ""}${groupe},${dec}${suffixe ? `${NBSP}DH` : ""}`;
}

/** Surface : « 285 m² », « 95,5 m² ». */
export function formatM2(v: EntreeDecimal): string {
  const [ent, dec] = Dec.de(v).toString().split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${dec ? `,${dec}` : ""}${NBSP}m²`;
}
