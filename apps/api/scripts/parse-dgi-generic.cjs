#!/usr/bin/env node
/**
 * parse-dgi-generic.cjs — parser DGI multi-villes.
 *
 * Adaptation du parser Rabat à TOUTE ville DGI publiant ses tableaux en
 * format texte structuré. Les 5 villes prioritaires (Casa/Marrakech/Tanger/
 * Fès/Agadir + Rabat) suivent la même convention :
 *
 *   - Codes zone : <PREFIX>-<ARROND>-<N> (ex. CC-AF1, MA-AN3, TA-AS5, RA-SW4)
 *   - Tableaux prix : "Villa Ancien ST > à N m² PT : XXXX/PC : XXXX"
 *   - Tableaux délimitations : "<CODE> Av. X - Av. Y (Ouest) : <Nom Commun>"
 *
 * Pour chaque ville, le préfixe + nom long arrondissement est défini ci-dessous
 * dans CITY_CONFIG. Le reste du parsing est partagé.
 *
 * Usage :
 *   node apps/api/scripts/parse-dgi-generic.cjs casablanca
 *   node apps/api/scripts/parse-dgi-generic.cjs --all
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

/** Configuration par ville. Le champ `arrondissements` mappe les sigles
 *  (ex. AF dans CC-AF1) vers leur nom long. */
const CITY_CONFIG = {
  rabat: {
    name: "Rabat",
    region: "Rabat-Salé-Kénitra",
    codePrefix: "RA",
    arrondissements: {
      SW: "Souissi", AR: "Agdal-Ryad", HA: "Hassan", YO: "Youssoufia", YM: "Yacoub Mansour",
    },
  },
  casablanca: {
    name: "Casablanca",
    region: "Casablanca-Settat",
    codePrefix: "CC",
    arrondissements: {
      AF: "Anfa", MZ: "Maârif", SD: "Sidi Belyout", AB: "Aïn Borja", AC: "Aïn Chock",
      HM: "Hay Mohammadi", BS: "Ben M'Sick", SO: "Sbata", HH: "Hay Hassani",
      SM: "Sidi Maârouf", MO: "Mohammedia", BC: "Boucherrouf", LM: "Lissasfa",
      SB: "Sidi Bernoussi", AS: "Aïn Sebaâ", DR: "Dar Bouazza", BO: "Bouskoura",
      ME: "Mediouna", NO: "Nouaceur", HR: "Hay Hassani Roches", RC: "Roches Noires",
      MD: "Médina",
    },
  },
  marrakech: {
    name: "Marrakech",
    region: "Marrakech-Safi",
    codePrefix: "MA",
    arrondissements: {
      AN: "Annakhil", GU: "Guéliz", ME: "Ménara", MR: "Médina", SY: "Sidi Youssef Ben Ali",
    },
  },
  tanger: {
    name: "Tanger",
    region: "Tanger-Tétouan-Al Hoceïma",
    codePrefix: "TA",
    arrondissements: {
      AS: "Tanger-Asilah", BR: "Branes", BN: "Beni Makada", BO: "Boukhalef",
      MA: "Malabata", CH: "Charf", IB: "Iberia",
    },
  },
  fes: {
    name: "Fès",
    region: "Fès-Meknès",
    codePrefix: "FS",
    arrondissements: {
      AG: "Agdal", JW: "Jnan El Ouard", FM: "Fès-Médina", SA: "Saïss",
    },
  },
  agadir: {
    name: "Agadir",
    region: "Souss-Massa",
    codePrefix: "AG",
    arrondissements: {
      AG: "Agadir Ida-Outanane", BS: "Bensergao", FO: "Founty", HM: "Hay Mohammadi",
    },
  },
  kenitra: {
    name: "Kénitra",
    region: "Rabat-Salé-Kénitra",
    codePrefix: "KE",
    arrondissements: {
      AS: "Saknia", BR: "Bir Rami", MM: "Maamoura", MD: "Mehdia", KC: "Centre Kénitra",
    },
  },
  sale: {
    name: "Salé",
    region: "Rabat-Salé-Kénitra",
    codePrefix: "SA",
    arrondissements: {
      BE: "Bettana", HS: "Hssaine", TB: "Tabriquet", LM: "Bab Lamrissa",
      LY: "Laayayda", SH: "Shoul", SB: "Sidi Bouknadel",
    },
  },
  meknes: {
    name: "Meknès",
    region: "Fès-Meknès",
    codePrefix: "ME",
    arrondissements: {
      AC: "Al Mechouar Stinia", IS: "Ismailia", HE: "Hamria",
      OU: "Ouislane", MR: "Marjane", BS: "Belair Sahrij",
    },
  },
  oujda: {
    name: "Oujda",
    region: "Oriental",
    codePrefix: "OUJ",
    arrondissements: {
      BD: "Boudir", BO: "Boudour", AN: "Angad", BL: "Bni Iznassen", SI: "Sidi Yahya",
    },
  },
  settat: {
    name: "Settat",
    region: "Casablanca-Settat",
    codePrefix: "SE",
    arrondissements: {
      SE: "Settat Centre", BR: "Berrechid Annexe",
    },
  },
  "beni-mellal": {
    name: "Béni Mellal",
    region: "Béni Mellal-Khénifra",
    codePrefix: "BM",
    arrondissements: {
      BM: "Béni Mellal Centre", AZ: "Azilal", FB: "Fquih Ben Salah",
    },
  },
  safi: {
    name: "Safi",
    region: "Marrakech-Safi",
    codePrefix: "SF",
    arrondissements: {
      BD: "Boudheb", JE: "Jrifate", SC: "Safi Centre", YO: "Youssoufia annexe",
    },
  },
  tetouan: {
    name: "Tétouan",
    region: "Tanger-Tétouan-Al Hoceïma",
    codePrefix: "TE",
    arrondissements: {
      BS: "Boussafou", SM: "Sania", CT: "Tétouan Centre",
    },
  },
  midelt: {
    name: "Midelt",
    region: "Drâa-Tafilalet",
    codePrefix: "MI",
    arrondissements: {
      AA: "Aït Ayach", ER: "Er-Rich", MD: "Midelt Centre",
    },
  },
  nador: {
    name: "Nador",
    region: "Oriental",
    codePrefix: "NA",
    arrondissements: {
      AA: "Nador Atalayoun", BO: "Beni Oukil", CN: "Nador Centre",
    },
  },
  berkane: {
    name: "Berkane",
    region: "Oriental",
    codePrefix: "BK",
    arrondissements: {
      BD: "Berkane Centre", AB: "Aklim",
    },
  },
};

function parseAmount(s) {
  if (!s) return undefined;
  const cleaned = String(s).replace(/\s/g, "").replace(/[^\d.]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePriceTables(text, codeRegex) {
  const prices = new Map();
  const re = new RegExp(codeRegex.source, codeRegex.flags + (codeRegex.flags.includes('g') ? '' : 'g'));
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) matches.push({ code: m[1], start: m.index });

  for (let i = 0; i < matches.length; i++) {
    const code = matches[i].code;
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const block = text.slice(start, end);
    if (block.length < 80) continue;
    if (/Points de Rep[èe]re|Av\.\s+\w+\s+\(/.test(block.slice(0, 500))) continue;

    const zonePrices = [];
    const typesRegex = /(Villa|Terrain\s+ZV|Terrain\s+ZI|Terrain\s+ZM|Appartement|Maison|Immeuble)\s+(Ancien|Récent|Neuf|Loti)?/g;
    const typeMatches = [];
    let tm;
    while ((tm = typesRegex.exec(block)) !== null) typeMatches.push({ type: tm[1].trim(), etat: tm[2]?.trim(), idx: tm.index });

    for (let j = 0; j < typeMatches.length; j++) {
      const t = typeMatches[j];
      const tEnd = j + 1 < typeMatches.length ? typeMatches[j + 1].idx : block.length;
      const sub = block.slice(t.idx, tEnd);
      const ptM = [...sub.matchAll(/PT\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const pcM = [...sub.matchAll(/PC\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const stM = [...sub.matchAll(/ST\s*([<>=]+)\s*à?\s*([\d\s]+)\s*m/g)].map(x => `ST ${x[1]} ${x[2].trim()} m²`);
      if (ptM.length || pcM.length) {
        const n = Math.max(ptM.length, pcM.length);
        for (let k = 0; k < n; k++) {
          zonePrices.push({ type: t.type, etat: t.etat, superficie: stM[k], pt: ptM[k], pc: pcM[k] });
        }
      } else {
        const u = sub.match(/(\d{1,2}\s\d{3}|\d{4,6})\b/);
        if (u) zonePrices.push({ type: t.type, etat: t.etat, prixUnique: parseAmount(u[1]) });
      }
    }
    if (zonePrices.length > 0) prices.set(code, zonePrices);
  }
  return prices;
}

function parseDelimitations(text, codeRegex) {
  const delims = new Map();
  const codeAlt = codeRegex.source.replace(/\\b/g, '').replace(/^\(/, '').replace(/\)$/, '');
  const lineRegex = new RegExp(
    '\\b(' + codeAlt + ')\\s+((?:Av\\.|Bd|Bd\\.|Boulevard|Avenue|Plage|Ceinture|Allée|La|Quartier|Route|Plateau|Cimetière|Ecole|Sidi|Hay|Complexe|Rue|Place|Lotissement|Zone|Lot)[^]*?)(?=\\b(?:' + codeAlt + ')\\b|\\f|--\\s+\\d+ of \\d+|$)',
    'g',
  );
  let m;
  while ((m = lineRegex.exec(text)) !== null) {
    const code = m[1];
    const raw = m[2].replace(/\s+/g, " ").trim();
    let nomCommun;
    const colonIdx = raw.lastIndexOf(" : ");
    let delimitations = raw;
    if (colonIdx > 0 && colonIdx < raw.length - 3) {
      nomCommun = raw.slice(colonIdx + 3).trim();
      delimitations = raw.slice(0, colonIdx).trim();
    }
    const avRegex = /(?:Av\.|Bd|Bd\.|Boulevard|Avenue|Rue|Allée|Plateau|Plage|Route|Lot|Zone)\s+(?:de\s+(?:la\s+|l['']))?[A-ZÀ-Þ][A-Za-zéèêàâîôûçñ'.\- ]+?(?=\s*[\(,\)\-]|$)/g;
    const avenues = Array.from(new Set([...delimitations.matchAll(avRegex)].map(x => x[0].replace(/\s+/g, " ").trim())));
    if (nomCommun || avenues.length > 0) {
      delims.set(code, { delimitations, nomCommun, avenues });
    }
  }
  return delims;
}

function arrondissementFromCode(code, config) {
  const m = code.match(new RegExp('^' + config.codePrefix + '-([A-Z]{2,3})'));
  if (!m) return "Inconnu";
  return config.arrondissements[m[1]] || m[1];
}

function processCity(cityId) {
  const config = CITY_CONFIG[cityId];
  if (!config) { console.error('Unknown city: ' + cityId); return; }

  const txtPath = join(process.cwd(), 'data', 'dgi-pdfs', cityId + '.txt');
  if (!existsSync(txtPath)) { console.error('Missing TXT: ' + txtPath); return; }
  const text = readFileSync(txtPath, 'utf-8');

  // Regex code = <PREFIX>-<ARROND>-<N>
  const codeRegex = new RegExp('\\b(' + config.codePrefix + '-[A-Z]{2,3}\\d+)\\b', 'g');

  const prices = parsePriceTables(text, codeRegex);
  const delims = parseDelimitations(text, codeRegex);

  const allCodes = new Set([...prices.keys(), ...delims.keys()]);
  const zones = [];
  for (const code of allCodes) {
    const p = prices.get(code) || [];
    const d = delims.get(code) || {};
    zones.push({
      code,
      arrondissement: arrondissementFromCode(code, config),
      ville: config.name,
      region: config.region,
      delimitations: d.delimitations,
      nomCommun: d.nomCommun,
      avenues: d.avenues,
      prix: p,
    });
  }
  zones.sort((a, b) => a.code.localeCompare(b.code));

  const arrSet = new Set(zones.map(z => z.arrondissement));
  const arrondissementsArr = [...arrSet].map(nom => {
    const code = Object.entries(config.arrondissements).find(([_, v]) => v === nom)?.[0] || nom.slice(0, 2).toUpperCase();
    return { code, nom };
  });

  const output = {
    _meta: {
      ville: config.name,
      source: 'Référentiel DGI 2017',
      sourceUrl: 'https://www.fiscamaroc.com/pdf/referentiel_des_prix/',
      extractedAt: new Date().toISOString(),
      parser: 'apps/api/scripts/parse-dgi-generic.cjs',
      doctrine: "Prix DGI = référence administrative pour droits d'enregistrement. SOUS-ESTIME systématiquement le marché (souvent 30-70%). L'expertise CITURBAREA donne la valeur marché réelle.",
      totalZones: zones.length,
      zonesWithPrices: zones.filter(z => z.prix.length > 0).length,
      zonesWithDelimitations: zones.filter(z => z.delimitations).length,
    },
    arrondissements: arrondissementsArr,
    zones,
  };

  const outDir = join(process.cwd(), 'data', 'sig-static', 'dgi-zones');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, cityId + '.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('✓ ' + cityId + ' → ' + zones.length + ' zones (' + output._meta.zonesWithPrices + ' avec prix, ' + output._meta.zonesWithDelimitations + ' avec délim)');
}

const args = process.argv.slice(2);
if (args.includes('--all')) {
  for (const c of Object.keys(CITY_CONFIG)) processCity(c);
} else if (args[0]) {
  processCity(args[0]);
} else {
  console.error('Usage: node parse-dgi-generic.cjs <city|--all>');
  process.exit(1);
}
