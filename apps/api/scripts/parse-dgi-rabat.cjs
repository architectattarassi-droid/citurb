const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const ARRONDISSEMENTS = {
  SW: { code: "SW", nom: "Souissi" },
  AR: { code: "AR", nom: "Agdal-Ryad" },
  HA: { code: "HA", nom: "Hassan" },
  YO: { code: "YO", nom: "Youssoufia" },
  YM: { code: "YM", nom: "Yacoub Mansour" },
};

function parseAmount(s) {
  if (!s) return undefined;
  const cleaned = s.replace(/\s/g, "").replace(/[^\d.]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePriceTables(text) {
  const prices = new Map();
  const codeRegex = /\b(RA-(?:SW|AR|HA|YO|YM)\d+)\b/g;
  const matches = [];
  let m;
  while ((m = codeRegex.exec(text)) !== null) {
    matches.push({ code: m[1], start: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const code = matches[i].code;
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const block = text.slice(start, end);
    if (block.length < 80) continue;
    if (/Points de Rep[èe]re|Av\.\s+\w+\s+\(/.test(block.slice(0, 500))) continue;

    const zonePrices = [];
    const typesRegex = /(Villa|Terrain\s+ZV|Terrain\s+ZI|Terrain\s+ZM|Appartement|Maison)\s+(Ancien|Récent|Neuf|Loti)?/g;
    const typeMatches = [];
    let tm;
    while ((tm = typesRegex.exec(block)) !== null) {
      typeMatches.push({ type: tm[1].trim(), etat: tm[2]?.trim(), idx: tm.index });
    }
    for (let j = 0; j < typeMatches.length; j++) {
      const t = typeMatches[j];
      const tEnd = j + 1 < typeMatches.length ? typeMatches[j + 1].idx : block.length;
      const sub = block.slice(t.idx, tEnd);
      const ptMatches = [...sub.matchAll(/PT\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const pcMatches = [...sub.matchAll(/PC\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const stMatches = [...sub.matchAll(/ST\s*([<>=]+)\s*à?\s*([\d\s]+)\s*m/g)].map(x => `ST ${x[1]} ${x[2].trim()} m²`);
      if (ptMatches.length || pcMatches.length) {
        const n = Math.max(ptMatches.length, pcMatches.length);
        for (let k = 0; k < n; k++) {
          zonePrices.push({
            type: t.type, etat: t.etat,
            superficie: stMatches[k],
            pt: ptMatches[k], pc: pcMatches[k],
          });
        }
      } else {
        const u = sub.match(/(\d{1,2}\s\d{3}|\d{4,6})\b/);
        if (u) {
          zonePrices.push({ type: t.type, etat: t.etat, prixUnique: parseAmount(u[1]) });
        }
      }
    }
    if (zonePrices.length > 0) prices.set(code, zonePrices);
  }
  return prices;
}

function parseDelimitations(text) {
  const delims = new Map();
  const lineRegex = /\b(RA-(?:SW|AR|HA|YO|YM)\d+)\s+((?:Av\.|Bd|Bd\.|Boulevard|Avenue|Plage|Ceinture|Allée|La|Quartier|Route|Plateau|Cimetière|Ecole|Sidi|Hay|Complexe)[^]*?)(?=\b(?:RA-(?:SW|AR|HA|YO|YM)\d+)\b|--\s+\d+ of 42|$)/g;
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
    const avRegex = /(?:Av\.|Bd|Bd\.|Boulevard|Avenue|Rue|Allée|Plateau|Plage|Route)\s+(?:de\s+(?:la\s+|l['']))?[A-Z][A-Za-zéèêàâîôûçñ'.\- ]+?(?=\s*[\(,\)\-]|$)/g;
    const avenues = Array.from(new Set([...delimitations.matchAll(avRegex)].map(x => x[0].replace(/\s+/g, " ").trim())));
    if (nomCommun || avenues.length > 0) {
      delims.set(code, { delimitations, nomCommun, avenues });
    }
  }
  return delims;
}

function arrondissementFromCode(code) {
  const m = code.match(/RA-(SW|AR|HA|YO|YM)/);
  return m ? (ARRONDISSEMENTS[m[1]]?.nom || m[1]) : "Inconnu";
}

const pdfPath = join(process.cwd(), "data", "dgi-pdfs", "rabat.txt");
if (!existsSync(pdfPath)) { console.error("Run extraction first."); process.exit(1); }
const text = readFileSync(pdfPath, "utf-8");

const prices = parsePriceTables(text);
const delims = parseDelimitations(text);

console.log("Prix extraits pour " + prices.size + " zones");
console.log("Délimitations extraites pour " + delims.size + " zones");

const allCodes = new Set([...prices.keys(), ...delims.keys()]);
const zones = [];
for (const code of allCodes) {
  const p = prices.get(code) || [];
  const d = delims.get(code) || {};
  zones.push({
    code,
    arrondissement: arrondissementFromCode(code),
    ville: "Rabat",
    region: "Rabat-Salé-Kénitra",
    delimitations: d.delimitations,
    nomCommun: d.nomCommun,
    avenues: d.avenues,
    prix: p,
  });
}
zones.sort((a, b) => a.code.localeCompare(b.code));

const output = {
  _meta: {
    ville: "Rabat",
    source: "Référentiel DGI 2017 — version actualisée 29/12/2017",
    sourceUrl: "https://www.fiscamaroc.com/pdf/referentiel_des_prix/referentiel-de-rabat-version-actualisee-de29-12-2017.pdf",
    extractedAt: new Date().toISOString(),
    parser: "apps/api/scripts/parse-dgi-rabat.cjs",
    doctrine: "Prix DGI = référence administrative pour droits d'enregistrement. SOUS-ESTIME systématiquement le marché (souvent de 30-70%). L'expertise CITURBAREA donne la valeur marché réelle ; le prix DGI sert uniquement aux taxes et droits.",
    totalZones: zones.length,
    zonesWithPrices: zones.filter(z => z.prix.length > 0).length,
    zonesWithDelimitations: zones.filter(z => z.delimitations).length,
  },
  arrondissements: Object.values(ARRONDISSEMENTS),
  zones,
};

const outDir = join(process.cwd(), "data", "sig-static", "dgi-zones");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "rabat.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log("✓ Écrit " + outPath + " (" + zones.length + " zones)");

const sample = zones.find(z => z.code === "RA-SW4") || zones[0];
console.log("\n--- ÉCHANTILLON QA (RA-SW4) ---");
console.log(JSON.stringify(sample, null, 2));
