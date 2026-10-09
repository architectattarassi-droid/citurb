/**
 * Les 12 régions du Maroc et leurs villes principales, pour les zones de
 * livraison des fournisseurs et le « prix marché par région ». Module sans
 * dépendance (importé aussi par les Pages Functions).
 */

export const REGIONS_MA = [
  { code: "tanger-tetouan-al-hoceima", nom: "Tanger-Tétouan-Al Hoceima", villes: ["Tanger", "Tétouan", "Al Hoceima", "Larache", "Ksar El Kébir", "M'diq", "Fnideq", "Chefchaouen", "Ouezzane", "Asilah"] },
  { code: "oriental", nom: "Oriental", villes: ["Oujda", "Nador", "Berkane", "Taourirt", "Guercif", "Jerada", "Figuig", "Driouch"] },
  { code: "fes-meknes", nom: "Fès-Meknès", villes: ["Fès", "Meknès", "Taza", "Ifrane", "Sefrou", "El Hajeb", "Moulay Yacoub", "Taounate", "Boulemane"] },
  { code: "rabat-sale-kenitra", nom: "Rabat-Salé-Kénitra", villes: ["Rabat", "Salé", "Témara", "Kénitra", "Skhirat", "Harhoura", "Khémisset", "Sidi Kacem", "Sidi Slimane", "Tiflet", "Sidi Yahya El Gharb"] },
  { code: "beni-mellal-khenifra", nom: "Béni Mellal-Khénifra", villes: ["Béni Mellal", "Khouribga", "Khénifra", "Fquih Ben Salah", "Azilal", "Kasba Tadla"] },
  { code: "casablanca-settat", nom: "Casablanca-Settat", villes: ["Casablanca", "Mohammedia", "Bouskoura", "Dar Bouazza", "Nouaceur", "Médiouna", "Berrechid", "Settat", "El Jadida", "Azemmour", "Benslimane", "Sidi Bennour"] },
  { code: "marrakech-safi", nom: "Marrakech-Safi", villes: ["Marrakech", "Safi", "Essaouira", "El Kelâa des Sraghna", "Youssoufia", "Chichaoua", "Ben Guerir", "Tahannaout"] },
  { code: "draa-tafilalet", nom: "Drâa-Tafilalet", villes: ["Errachidia", "Ouarzazate", "Zagora", "Tinghir", "Midelt", "Erfoud", "Rissani"] },
  { code: "souss-massa", nom: "Souss-Massa", villes: ["Agadir", "Inezgane", "Aït Melloul", "Taroudant", "Tiznit", "Tata", "Biougra", "Taghazout"] },
  { code: "guelmim-oued-noun", nom: "Guelmim-Oued Noun", villes: ["Guelmim", "Tan-Tan", "Sidi Ifni", "Assa"] },
  { code: "laayoune-sakia-el-hamra", nom: "Laâyoune-Sakia El Hamra", villes: ["Laâyoune", "Boujdour", "Es-Semara", "Tarfaya"] },
  { code: "dakhla-oued-ed-dahab", nom: "Dakhla-Oued Ed-Dahab", villes: ["Dakhla", "Aousserd"] },
] as const;

export type CodeRegion = (typeof REGIONS_MA)[number]["code"];

/** Clé de comparaison : minuscules, sans accents ni ponctuation. */
export const cleLieu = (s: string): string =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const PAR_CLE = new Map<string, CodeRegion>();
for (const r of REGIONS_MA) {
  PAR_CLE.set(cleLieu(r.code), r.code);
  PAR_CLE.set(cleLieu(r.nom), r.code);
  for (const v of r.villes) PAR_CLE.set(cleLieu(v), r.code);
}
PAR_CLE.set("casa", "casablanca-settat");
PAR_CLE.set("marrakesh", "marrakech-safi");
PAR_CLE.set("tangier", "tanger-tetouan-al-hoceima");
PAR_CLE.set("fez", "fes-meknes");
PAR_CLE.set("laayoune", "laayoune-sakia-el-hamra");

/** Code de région depuis un code, un nom de région ou un nom de ville ; null si inconnu. */
export function regionDe(lieu: string | null | undefined): CodeRegion | null {
  if (!lieu) return null;
  return PAR_CLE.get(cleLieu(lieu)) ?? null;
}

export const nomRegion = (code: string): string => REGIONS_MA.find((r) => r.code === code)?.nom ?? code;

/** Toutes les villes connues, triées (listes déroulantes). */
export const VILLES_MA: string[] = REGIONS_MA.flatMap((r) => [...r.villes]).sort((a, b) => a.localeCompare(b, "fr"));
