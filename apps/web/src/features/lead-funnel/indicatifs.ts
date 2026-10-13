/** Indicatifs proposés (Maroc + pays de résidence des MRE). */
export const INDICATIFS = [
  { code: "+212", pays: "MA", label: "🇲🇦 +212" }, { code: "+33", pays: "FR", label: "🇫🇷 +33" }, { code: "+34", pays: "ES", label: "🇪🇸 +34" },
  { code: "+39", pays: "IT", label: "🇮🇹 +39" }, { code: "+32", pays: "BE", label: "🇧🇪 +32" }, { code: "+31", pays: "NL", label: "🇳🇱 +31" },
  { code: "+49", pays: "DE", label: "🇩🇪 +49" }, { code: "+44", pays: "GB", label: "🇬🇧 +44" }, { code: "+1", pays: "US", label: "🇺🇸🇨🇦 +1" },
  { code: "+971", pays: "AE", label: "🇦🇪 +971" }, { code: "+966", pays: "SA", label: "🇸🇦 +966" }, { code: "+974", pays: "QA", label: "🇶🇦 +974" },
] as const;

/** Numéro complet : saisi en international (+… / 00…) tel quel, sinon indicatif + numéro sans le 0 initial. */
export function numeroComplet(indicatif: string, saisi: string): string {
  const t = saisi.trim();
  if (!t) return "";
  if (t.startsWith("+") || t.startsWith("00")) return t;
  return indicatif + t.replace(/[^0-9]/g, "").replace(/^0+/, "");
}
