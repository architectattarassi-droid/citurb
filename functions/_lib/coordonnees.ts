/**
 * « Tout passe par CITURBAREA » (CLAUDE.md) : aucune coordonnée d'un pro dans
 * ce qui est publié. Détection des numéros de téléphone (marocains et
 * internationaux, chiffres arabes compris), e-mails, liens (http, www, noms
 * de domaine), WhatsApp / Telegram / réseaux sociaux dans les textes saisis
 * (fiches société, produit, prestation, légendes, références).
 *   - à l'enregistrement : la fiche est signalée à l'admin (« COORDONNEES ») ;
 *   - à la publication : les passages détectés sont masqués (défense en profondeur).
 */

export type TypeCoordonnee = "telephone" | "email" | "lien" | "messagerie";

const CHIFFRES_ARABES = /[٠-٩۰-۹]/g;
const versLatins = (s: string) => s.replace(CHIFFRES_ARABES, (c) => String((c.charCodeAt(0) & 0xf) % 10));

const MOTIFS: [TypeCoordonnee, RegExp][] = [
  ["email", /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]| at )\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)| dot )\s*[A-Za-z]{2,})+/gi],
  ["messagerie", /\b(?:wa\.me|whatsapp|whats\s*app|watsap|واتساب|واتس\s*اب|telegram|t\.me|signal|viber|imo|messenger|instagram|insta|facebook|fb\.com|tiktok|snapchat|linkedin)\b/gi],
  ["lien", /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:ma|com|net|org|fr|shop|store|co|info|biz|online|site)\b(?:\/\S*)?/gi],
  // Téléphones : 0 / +212 / 00212 suivis de 9 chiffres (séparateurs admis), ou toute suite de 9 chiffres et plus.
  ["telephone", /(?:\+|00)\s*\d(?:[\s.\-()]*\d){7,14}|\b0\s*[5-8](?:[\s.\-]*\d){8}\b|\b\d(?:[\s.\-]?\d){8,}\b/g],
];

/** Types de coordonnées trouvés dans un texte (vide : rien). */
export function detecterCoordonnees(texte: string | null | undefined): TypeCoordonnee[] {
  if (!texte) return [];
  const t = versLatins(texte);
  return MOTIFS.filter(([, re]) => { re.lastIndex = 0; return re.test(t); }).map(([k]) => k);
}

export const MASQUE = "[coordonnées masquées — contact via CITURBAREA]";

/** Texte publiable : chaque coordonnée détectée remplacée par un masque. */
export function masquerCoordonnees<T extends string | null | undefined>(texte: T): T {
  if (!texte || !detecterCoordonnees(texte).length) return texte;
  let t = versLatins(texte);
  for (const [, re] of MOTIFS) { re.lastIndex = 0; t = t.replace(re, MASQUE); }
  return t as T;
}

/** Coordonnées trouvées dans un ensemble de champs (clé → types), pour le signalement. */
export function coordonneesDans(champs: Record<string, unknown>): Record<string, TypeCoordonnee[]> {
  const out: Record<string, TypeCoordonnee[]> = {};
  const visiter = (cle: string, v: unknown) => {
    if (typeof v === "string") { const d = detecterCoordonnees(v); if (d.length) out[cle] = [...new Set([...(out[cle] || []), ...d])]; }
    else if (Array.isArray(v)) v.forEach((x, i) => visiter(`${cle}.${i}`, x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visiter(`${cle}.${k}`, x);
  };
  for (const [k, v] of Object.entries(champs)) visiter(k, v);
  return out;
}
