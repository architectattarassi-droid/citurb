/* eslint-disable no-console */
/**
 * parse-dgi-rabat.ts — Parser dédié pour le PDF DGI Rabat (édition 2017).
 *
 * Le PDF est tabulaire et bien structuré :
 *   - Section 6.x.x : tableaux des prix par zone (RA-SW4, RA-AR5, …)
 *     Format : "Zone | Type de bien | Etat | Prix au m²" puis lignes
 *     "Villa Ancien ST > à 2 000 m² PT : 4 000/PC : 3 500"
 *   - Section 7.x : tableaux des délimitations géographiques
 *     Format : "RA-SW1 | Av. Doustour - Av. Mohamed VI (Ouest), Av. Tadla (Est) : Cité Militaire"
 *
 * Output : apps/api/data/sig-static/dgi-zones/rabat.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

type DgiPrice = {
  type: string;       // "Villa", "Terrain ZV", "Appartement"
  etat?: string;      // "Ancien", "Récent", "Neuf", "Loti"
  superficie?: string; // "ST > à 2 000 m²"
  pt?: number;         // Prix Terrain DH/m²
  pc?: number;         // Prix Construction DH/m²
  prixUnique?: number; // pour appartement (Prix au m² bâti unique)
};

type DgiZone = {
  code: string;          // "RA-SW1"
  arrondissement: string;
  ville: string;
  region: string;
  delimitations?: string; // texte brut des points de repère
  nomCommun?: string;     // "Cité Militaire", "Agdal 1", "Orangers"
  avenues?: string[];     // avenues extraites de la délimitation
  prix: DgiPrice[];
};

const ARRONDISSEMENTS: Record<string, { code: string; nom: string }> = {
  SW: { code: "SW", nom: "Souissi" },
  AR: { code: "AR", nom: "Agdal-Ryad" },
  HA: { code: "HA", nom: "Hassan" },
  YO: { code: "YO", nom: "Youssoufia" },
  YM: { code: "YM", nom: "Yacoub Mansour" },
};

function parseAmount(s: string): number | undefined {
  if (!s) return undefined;
  // "4 000", "23 000", "4 500" etc.
  const cleaned = s.replace(/\s/g, "").replace(/[^\d.]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Parse les TABLEAUX DE PRIX (sections 6.1 à 6.5).
 * Le texte est dense : on cherche chaque code "RA-XX[N]" puis on lit
 * toutes les lignes qui suivent jusqu'au prochain code.
 */
function parsePriceTables(text: string): Map<string, DgiPrice[]> {
  const prices = new Map<string, DgiPrice[]>();

  // Regex : code zone (RA-AR1, RA-SW4, etc.)
  const codeRegex = /\b(RA-(?:SW|AR|HA|YO|YM)\d+)\b/g;

  // On découpe le texte en segments par code zone
  const matches: Array<{ code: string; start: number }> = [];
  let m;
  while ((m = codeRegex.exec(text)) !== null) {
    matches.push({ code: m[1], start: m.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const code = matches[i].code;
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const block = text.slice(start, end);

    // Ignorer si le bloc fait moins de 80 chars (probablement référence dans table sommaire)
    if (block.length < 80) continue;
    // Ignorer si le bloc contient "Points de Repère" (c'est la section 7, pas 6)
    if (/Points de Rep[èe]re|Av\.\s+\w+\s+\(/.test(block.slice(0, 500))) continue;

    const zonePrices: DgiPrice[] = [];

    // Pattern : "<Type> <Etat>\nST [<=|>=|<|>] à? N m²\nPT : N/PC : N"
    // Plus simple : on cherche les groupes "PT : NNNN" et "PC : NNNN"
    const lineGroups: Array<{ type: string; etat?: string; superficie?: string; pt?: number; pc?: number }> = [];

    // Splitter en mini-blocs par type de bien
    const typesRegex = /(Villa|Terrain\s+ZV|Terrain\s+ZI|Terrain\s+ZM|Appartement|Maison)\s+(Ancien|Récent|Neuf|Loti)?/g;
    const typeMatches: Array<{ type: string; etat?: string; idx: number }> = [];
    let tm;
    while ((tm = typesRegex.exec(block)) !== null) {
      typeMatches.push({ type: tm[1].trim(), etat: tm[2]?.trim(), idx: tm.index });
    }

    for (let j = 0; j < typeMatches.length; j++) {
      const t = typeMatches[j];
      const tEnd = j + 1 < typeMatches.length ? typeMatches[j + 1].idx : block.length;
      const sub = block.slice(t.idx, tEnd);

      // Récupérer prix : PT et PC séparés (terrain ZV/ZI/ZM ou Villa avec construction)
      // OU un seul nombre (appartement)
      const ptMatches = [...sub.matchAll(/PT\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const pcMatches = [...sub.matchAll(/PC\s*:\s*([\d\s]+)/g)].map(x => parseAmount(x[1]));
      const stMatches = [...sub.matchAll(/ST\s*([<>=]+)\s*à?\s*([\d\s]+)\s*m/g)].map(x => `ST ${x[1]} ${x[2].trim()} m²`);

      if (ptMatches.length || pcMatches.length) {
        // Plusieurs lignes possibles selon superficie (ex: ST > 2000 et ST <= 2000)
        const n = Math.max(ptMatches.length, pcMatches.length);
        for (let k = 0; k < n; k++) {
          zonePrices.push({
            type: t.type,
            etat: t.etat,
            superficie: stMatches[k],
            pt: ptMatches[k],
            pc: pcMatches[k],
          });
        }
      } else {
        // Appartement : prix unique entier en fin
        const u = sub.match(/(\d{1,2}\s\d{3}|\d{4,6})\b/);
        if (u) {
          zonePrices.push({
            type: t.type,
            etat: t.etat,
            prixUnique: parseAmount(u[1]),
          });
        }
      }
    }

    if (zonePrices.length > 0) {
      prices.set(code, zonePrices);
    }
  }

  return prices;
}

/**
 * Parse les TABLEAUX DE DÉLIMITATIONS (sections 7.x).
 * Format : "RA-SW1 Av. Doustour - Av. Mohamed VI (Ouest - Nord), ... : Cité Militaire"
 */
function parseDelimitations(text: string): Map<string, { delimitations: string; nomCommun?: string; avenues: string[] }> {
  const delims = new Map<string, { delimitations: string; nomCommun?: string; avenues: string[] }>();

  // On découpe le texte par occurrence de code zone dans la section 7
  // La section 7 commence après "7.1." environ. Au lieu de chercher la position,
  // on prend les codes qui sont SUIVIS de motifs d'avenue (« Av. » ou « Bd »).
  const lineRegex = /\b(RA-(?:SW|AR|HA|YO|YM)\d+)\s+((?:Av\.|Bd|Bd\.|Boulevard|Avenue|Plage|Ceinture|Allée|La|Quartier|Route|Plateau|Cimetière|Ecole|Sidi|Hay|Complexe)[^]*?)(?=\b(?:RA-(?:SW|AR|HA|YO|YM)\d+)\b|--\s+\d+ of 42|$)/g;

  let m;
  while ((m = lineRegex.exec(text)) !== null) {
    const code = m[1];
    const raw = m[2].replace(/\s+/g, " ").trim();
    // Nom commun = ce qui est après ":" (ex. " : Cité Militaire" ou " : Agdal 1")
    let nomCommun: string | undefined;
    const colonIdx = raw.lastIndexOf(" : ");
    let delimitations = raw;
    if (colonIdx > 0 && colonIdx < raw.length - 3) {
      nomCommun = raw.slice(colonIdx + 3).trim();
      delimitations = raw.slice(0, colonIdx).trim();
    }
    // Extraire les avenues mentionnées
    const avRegex = /(?:Av\.|Bd|Bd\.|Boulevard|Avenue|Rue|Allée|Plateau|Plage|Route)\s+(?:de\s+(?:la\s+|l['']))?[A-Z][A-Za-zéèêàâîôûçñ'.\- ]+?(?=\s*[\(,\)-]|$)/g;
    const avenues = Array.from(new Set([...delimitations.matchAll(avRegex)].map(x => x[0].replace(/\s+/g, " ").trim())));
    // Garder uniquement si on a soit un nom commun soit au moins une avenue
    if (nomCommun || avenues.length > 0) {
      delims.set(code, { delimitations, nomCommun, avenues });
    }
  }

  return delims;
}

function arrondissementFromCode(code: string): string {
  const m = code.match(/RA-(SW|AR|HA|YO|YM)/);
  return m ? (ARRONDISSEMENTS[m[1]]?.nom || m[1]) : "Inconnu";
}

async function main() {
  const pdfPath = join(process.cwd(), "apps", "api", "data", "dgi-pdfs", "rabat.txt");
  if (!existsSync(pdfPath)) {
    console.error("Run rabat.txt extraction first.");
    process.exit(1);
  }
  const text = readFileSync(pdfPath, "utf-8");

  const prices = parsePriceTables(text);
  const delims = parseDelimitations(text);

  console.log(`Prix extraits pour ${prices.size} zones`);
  console.log(`Délimitations extraites pour ${delims.size} zones`);

  // Merger : pour chaque code zone, fusionner prix + délimitations
  const allCodes = new Set([...prices.keys(), ...delims.keys()]);
  const zones: DgiZone[] = [];
  for (const code of allCodes) {
    const p = prices.get(code) || [];
    const d = delims.get(code) || { delimitations: undefined, nomCommun: undefined, avenues: undefined };
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

  // Sort by code
  zones.sort((a, b) => a.code.localeCompare(b.code));

  const output = {
    _meta: {
      ville: "Rabat",
      source: "Référentiel DGI 2017 — version actualisée 29/12/2017",
      sourceUrl: "https://www.fiscamaroc.com/pdf/referentiel_des_prix/referentiel-de-rabat-version-actualisee-de29-12-2017.pdf",
      extractedAt: new Date().toISOString(),
      parser: "apps/api/scripts/parse-dgi-rabat.ts",
      doctrine: "Prix DGI = référence administrative pour droits d'enregistrement. SOUS-ESTIME systématiquement le marché (souvent de 30-70%). L'expertise CITURBAREA donne la valeur marché réelle ; le prix DGI sert uniquement aux taxes et droits.",
      totalZones: zones.length,
      zonesWithPrices: zones.filter(z => z.prix.length > 0).length,
      zonesWithDelimitations: zones.filter(z => z.delimitations).length,
    },
    arrondissements: Object.values(ARRONDISSEMENTS),
    zones,
  };

  const outDir = join(process.cwd(), "apps", "api", "data", "sig-static", "dgi-zones");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "rabat.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✓ Écrit ${outPath} (${zones.length} zones)`);

  // Print quick sample for QA
  const sample = zones.find(z => z.code === "RA-SW4") || zones[0];
  console.log("\n--- ÉCHANTILLON QA ---");
  console.log(JSON.stringify(sample, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
