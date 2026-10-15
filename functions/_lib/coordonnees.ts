/**
 * « Tout passe par CITURBAREA » (CLAUDE.md) : aucune coordonnée échangée entre
 * clients, pros et fournisseurs. Moteur UNIQUE de détection et de masquage
 * pour tout le site (fiches, légendes, messages, demandes d'appel, sujets,
 * noms, noms de fichiers) :
 *   - téléphones marocains et internationaux, chiffres arabes compris, avec
 *     espaces, points, tirets ou barres entre les chiffres ;
 *   - téléphones écrits EN LETTRES (français, anglais, arabe, darija) :
 *     « zéro six soixante et un… », « صفر ستة… », « zero stta wa7ed… » ;
 *   - e-mails (y compris « (at) », « arobase ») et fournisseurs de messagerie
 *     cités sans @ (« mon gmail ») ;
 *   - liens, noms de domaine ; WhatsApp / Telegram / réseaux sociaux ;
 *     pseudos « @… ».
 * Usages : à l'enregistrement, signalement à l'admin ; à la lecture, masquage
 * (défense en profondeur). Limite assumée : un numéro écrit DANS une image ou
 * un PDF n'est pas lu — ces fichiers passent par la modération.
 */

export type TypeCoordonnee = "telephone" | "email" | "lien" | "messagerie";

const CHIFFRES_ARABES = /[٠-٩۰-۹]/g;
const versLatins = (s: string) => s.replace(CHIFFRES_ARABES, (c) => String((c.charCodeAt(0) & 0xf) % 10));

const MOTIFS: [TypeCoordonnee, RegExp][] = [
  ["email", /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]| at | arobase )\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)| dot | point )\s*[A-Za-z]{2,})+/gi],
  // Fournisseur de messagerie cité sans adresse complète (« écris-moi sur mon gmail »).
  ["email", /\b(?:g\s?mail|gmial|hotmail|yahoo|outlook|icloud|protonmail|live\.fr)\b/gi],
  ["messagerie", /\b(?:wa\.me|whatsapp|whats\s*app|watsap|wtsp|واتساب|واتس\s*اب|telegram|t\.me|signal|viber|imo|messenger|instagram|insta|facebook|fb\.com|tiktok|snapchat|snap|linkedin)\b/gi],
  // Pseudos de réseaux (« @atlas.deco ») — après les e-mails, qui sont masqués d'abord.
  ["messagerie", /(?<![\w.@])@[A-Za-z0-9_.]{3,30}/g],
  ["lien", /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:ma|com|net|org|fr|shop|store|co|info|biz|online|site)\b(?:\/\S*)?/gi],
  // Téléphones : +/00 international, 0[5-8] + 8 chiffres, ou toute suite de 9 chiffres et plus
  // (jusqu'à 3 séparateurs entre deux chiffres : « 06 . 61 - 22 / 33 44 »).
  ["telephone", /(?:\+|00)\s*\d(?:[\s.\-_/()]{0,3}\d){7,14}|\b0\s*[5-8](?:[\s.\-_/]{0,3}\d){8}\b|\b\d(?:[\s.\-_/]{0,3}\d){8,}\b/g],
];

// ── Numéros écrits en lettres ───────────────────────────────────────────

/** Mot → nombre de chiffres qu'il écrit (1 : « six » ; 2 : « soixante », « عشرين »). */
const MOTS_CHIFFRES: Record<string, number> = {};
const ajouter = (poids: number, mots: string) => { for (const m of mots.split(" ")) MOTS_CHIFFRES[m] = poids; };
// Français, anglais
ajouter(1, "zero zéro un une deux trois quatre cinq six sept huit neuf one two three four five seven eight nine oh");
ajouter(2, "dix onze douze treize quatorze quinze seize vingt vingts trente quarante cinquante soixante septante huitante nonante ten eleven twelve twenty thirty forty fifty sixty seventy eighty ninety");
// Arabe (avec variantes d'orthographe), « سفر » pour صفر
ajouter(1, "صفر سفر زيرو واحد واحدة اثنان اثنين اتنين زوج ثلاثة ثلاث تلاتة تلاثة أربعة اربعة ربعة خمسة خمس ستة ست سبعة سبع ثمانية ثمنية تمنية تسعة تسعود");
ajouter(2, "عشرة عشرين ثلاثين تلاتين أربعين اربعين خمسين ستين سبعين ثمانين تمانين تسعين");
// Darija en lettres latines
ajouter(1, "sifr sfer wa7ed wahed wa7d jouj jooj zouj zoj tlata tlat arba3a rb3a reb3a rab3a khamsa khmsa stta setta sta sb3a seb3a sab3a tmnya tmenya tamanya ts3oud tes3oud tsa3oud");
ajouter(2, "3achra 3echrin tlatin rb3in khamsin sttin sb3in tmanin tes3in");
/** Mots de liaison admis au milieu d'un numéro dicté. */
const LIAISONS = new Set(["et", "and", "و", "puis", "-", "w"]);
const MOT = /[\p{L}\p{N}]+/gu;

/** Passages qui écrivent au moins 8 chiffres avec au moins 2 mots-chiffres (indices dans le texte). */
function numerosEnLettres(t: string): [number, number][] {
  const passages: [number, number][] = [];
  let debut = -1, fin = -1, chiffres = 0, mots = 0;
  const clore = () => { if (debut >= 0 && chiffres >= 8 && mots >= 2) passages.push([debut, fin]); debut = -1; chiffres = 0; mots = 0; };
  let precedentFin = 0;
  for (const m of t.matchAll(MOT)) {
    const brut = m[0].toLowerCase();
    // Préfixe arabe « و » collé (« وستة ») : on le retire.
    const mot = brut.length > 2 && brut.startsWith("و") && MOTS_CHIFFRES[brut.slice(1)] ? brut.slice(1) : brut;
    const ecart = t.slice(precedentFin, m.index!);
    const poids = MOTS_CHIFFRES[mot] ?? (/^\d+$/.test(mot) ? mot.length : 0);
    const continuite = debut >= 0 && /^[\s.,;:\-_/()]*$/.test(ecart);
    if (poids > 0 || (LIAISONS.has(mot) && debut >= 0)) {
      if (!continuite && debut >= 0) clore();
      if (debut < 0) { if (poids === 0) { precedentFin = m.index! + m[0].length; continue; } debut = m.index!; }
      chiffres += poids;
      if (MOTS_CHIFFRES[mot]) mots++;
      fin = m.index! + m[0].length;
    } else clore();
    precedentFin = m.index! + m[0].length;
  }
  clore();
  return passages;
}

/** Types de coordonnées trouvés dans un texte (vide : rien). */
export function detecterCoordonnees(texte: string | null | undefined): TypeCoordonnee[] {
  if (!texte) return [];
  const t = versLatins(texte);
  const types = MOTIFS.filter(([, re]) => { re.lastIndex = 0; return re.test(t); }).map(([k]) => k);
  if (!types.includes("telephone") && numerosEnLettres(t).length) types.push("telephone");
  return [...new Set(types)];
}

export const MASQUE = "[coordonnées masquées — contact via CITURBAREA]";

/** Texte publiable : chaque coordonnée détectée remplacée par un masque. */
export function masquerCoordonnees<T extends string | null | undefined>(texte: T): T {
  if (!texte || !detecterCoordonnees(texte).length) return texte;
  let t = versLatins(texte);
  for (const [a, b] of numerosEnLettres(t).reverse()) t = t.slice(0, a) + MASQUE + t.slice(b);
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
