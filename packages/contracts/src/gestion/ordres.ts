/**
 * Visa du dossier d'autorisation : conseil régional de l'Ordre des architectes
 * compétent selon la commune (décision du fondateur, 15/10/2026).
 *
 * Ressorts confirmés par le fondateur :
 *   - Kénitra : provinces de Kénitra, Sidi Slimane, Sidi Kacem, Ouazzane ;
 *   - Rabat   : préfectures Rabat, Salé, Skhirat-Témara + province de Khémisset ;
 *   - Agadir  : zone sud, avec une antenne à Dakhla.
 * Meknès et El Jadida : découpage par provinces (liste à vérifier).
 * Ailleurs : ressort régional (à vérifier auprès de l'Ordre).
 *
 * Chaque entrée porte `aVerifier` quand elle ne vient pas du fondateur.
 * Recherche : préfecture/province du dossier d'abord, puis commune.
 */

export interface OrdreRegional {
  conseil: string;
  conseilAr: string;
  antenne?: string;
  /** Faux : ressort confirmé par le fondateur ; vrai : à vérifier auprès de l'Ordre. */
  aVerifier: boolean;
  /** Province ou préfecture qui a permis de trouver le conseil. */
  via: string;
}

type Entree = { conseil: string; conseilAr: string; aVerifier: boolean; antenne?: string; provinces: string[]; communes?: string[] };

export const RESSORTS_ORDRE: readonly Entree[] = [
  { conseil: "Kénitra", conseilAr: "القنيطرة", aVerifier: false,
    provinces: ["Kénitra", "Sidi Slimane", "Sidi Kacem", "Ouazzane"],
    communes: ["Mehdia", "Sidi Yahya El Gharb", "Souk El Arbaa", "Mechra Bel Ksiri", "Sidi Taibi", "Arbaoua", "Moulay Bousselham", "Jorf El Melha", "Dar Gueddari", "Had Kourt"] },
  { conseil: "Rabat", conseilAr: "الرباط", aVerifier: false,
    provinces: ["Rabat", "Salé", "Skhirat-Témara", "Khémisset"],
    communes: ["Témara", "Skhirat", "Harhoura", "Aïn El Aouda", "Aïn Atiq", "Sidi Yahya Zaër", "Bouknadel", "Sidi Bouknadel", "Tiflet", "Rommani", "Sidi Allal El Bahraoui", "Ain Aouda"] },
  { conseil: "Meknès", conseilAr: "مكناس", aVerifier: true,
    provinces: ["Meknès", "El Hajeb", "Ifrane", "Midelt", "Khénifra"],
    communes: ["Azrou", "Boufakrane", "Moulay Idriss Zerhoun", "Aïn Taoujdate", "Sebaa Aioun", "Ouislane", "Toulal"] },
  { conseil: "El Jadida", conseilAr: "الجديدة", aVerifier: true,
    provinces: ["El Jadida", "Sidi Bennour"],
    communes: ["Azemmour", "Bir Jdid", "Moulay Abdallah", "Oualidia", "Sidi Smaïl", "Zemamra"] },
  { conseil: "Agadir", conseilAr: "أكادير", aVerifier: false,
    provinces: ["Agadir Ida-Outanane", "Agadir", "Inezgane-Aït Melloul", "Inezgane", "Chtouka-Aït Baha", "Taroudant", "Tiznit", "Tata", "Guelmim", "Sidi Ifni", "Tan-Tan", "Assa-Zag", "Laâyoune", "Boujdour", "Tarfaya", "Es-Semara", "Smara"],
    communes: ["Aït Melloul", "Dcheira", "Biougra", "Aourir", "Taghazout", "Drarga", "Ouled Teima", "Aït Baha", "Massa"] },
  { conseil: "Agadir", conseilAr: "أكادير", antenne: "Dakhla", aVerifier: false,
    provinces: ["Oued Ed-Dahab", "Dakhla", "Aousserd"], communes: [] },
  // Ressort régional ailleurs (à vérifier).
  { conseil: "Casablanca", conseilAr: "الدار البيضاء", aVerifier: true,
    provinces: ["Casablanca", "Mohammedia", "Nouaceur", "Médiouna", "Berrechid", "Settat", "Benslimane"],
    communes: ["Bouskoura", "Dar Bouazza", "Tit Mellil", "Had Soualem", "Deroua", "Bouznika"] },
  { conseil: "Marrakech", conseilAr: "مراكش", aVerifier: true,
    provinces: ["Marrakech", "Al Haouz", "Chichaoua", "El Kelâa des Sraghna", "Essaouira", "Rehamna", "Safi", "Youssoufia"],
    communes: ["Tamansourt", "Benguerir", "Tahannaout", "Aït Ourir"] },
  { conseil: "Fès", conseilAr: "فاس", aVerifier: true,
    provinces: ["Fès", "Moulay Yacoub", "Sefrou", "Boulemane", "Taounate", "Taza"], communes: [] },
  { conseil: "Tanger", conseilAr: "طنجة", aVerifier: true,
    provinces: ["Tanger-Assilah", "Tanger", "Fahs-Anjra", "Tétouan", "M'diq-Fnideq", "Larache", "Chefchaouen", "Al Hoceïma"],
    communes: ["Assilah", "Ksar El Kébir", "Martil", "M'diq", "Fnideq", "Gzenaya"] },
  { conseil: "Oujda", conseilAr: "وجدة", aVerifier: true,
    provinces: ["Oujda-Angad", "Oujda", "Berkane", "Nador", "Driouch", "Taourirt", "Jerada", "Guercif", "Figuig"], communes: ["Saïdia"] },
  { conseil: "Béni Mellal", conseilAr: "بني ملال", aVerifier: true,
    provinces: ["Béni Mellal", "Azilal", "Fquih Ben Salah", "Khouribga"], communes: [] },
  { conseil: "Errachidia", conseilAr: "الرشيدية", aVerifier: true,
    provinces: ["Errachidia", "Ouarzazate", "Tinghir", "Zagora"], communes: [] },
];

/** Minuscules, sans accents ni ponctuation : « Aït-Melloul » = « ait melloul ». */
export function normaliserLieu(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[''`]/g, "").replace(/\b(province|prefecture|commune|ville|cu|cr)\b( de| d)?/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const INDEX = new Map<string, { e: Entree; via: string }>();
for (const e of RESSORTS_ORDRE) {
  for (const p of e.provinces) INDEX.set(normaliserLieu(p), { e, via: p });
  for (const c of e.communes ?? []) if (!INDEX.has(normaliserLieu(c))) INDEX.set(normaliserLieu(c), { e, via: c });
}
// Préfectures composées : chaque morceau compte (« Skhirat-Témara » → « skhirat », « temara »).
for (const e of RESSORTS_ORDRE) for (const p of e.provinces) for (const m of p.split("-")) {
  const k = normaliserLieu(m);
  if (k.length > 3 && !INDEX.has(k)) INDEX.set(k, { e, via: p });
}

/** Conseil régional compétent pour le dossier, ou null si la commune est inconnue de la table. */
export function ordreRegional(lieu: { prefecture?: string | null; commune?: string | null }): OrdreRegional | null {
  for (const brut of [lieu.prefecture, lieu.commune]) {
    if (!brut) continue;
    const k = normaliserLieu(brut);
    const t = INDEX.get(k) ?? [...INDEX.entries()].find(([cle]) => cle.length > 3 && (k === cle || k.startsWith(`${cle} `) || k.endsWith(` ${cle}`)))?.[1];
    if (t) return { conseil: t.e.conseil, conseilAr: t.e.conseilAr, ...(t.e.antenne ? { antenne: t.e.antenne } : {}), aVerifier: t.e.aVerifier, via: t.via };
  }
  return null;
}

/** Libellé affiché : « Conseil régional de l'Ordre des architectes de Kénitra ». */
export function libelleOrdre(o: OrdreRegional | null): { fr: string; ar: string } {
  if (!o) return { fr: "Conseil régional de l'Ordre des architectes compétent (commune à préciser)", ar: "المجلس الجهوي لهيئة المهندسين المعماريين المختص" };
  const ant = o.antenne ? ` (antenne de ${o.antenne})` : "";
  return {
    fr: `Conseil régional de l'Ordre des architectes de ${o.conseil}${ant}${o.aVerifier ? " — à vérifier" : ""}`,
    ar: `المجلس الجهوي لهيئة المهندسين المعماريين - ${o.conseilAr}${o.aVerifier ? " (للتحقق)" : ""}`,
  };
}
