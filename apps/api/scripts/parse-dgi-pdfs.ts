/* eslint-disable no-console */
/**
 * parse-dgi-pdfs.ts — ÉCHAFAUDAGE Niveau 2 du module SIG-Référentiels.
 *
 * Objectif : produire une couche GeoJSON propriétaire `dgi_zones_v1.geojson`
 * à partir des PDFs publics du Référentiel DGI (portail.tax.gov.ma).
 *
 * Pipeline (4 étapes) :
 *
 *   1) DOWNLOAD — récupérer chaque PDF DGI depuis le registre
 *      `apps/api/data/sig-static/dgi-references.json` (kind="dgi_pdf").
 *
 *   2) EXTRACT — parser le PDF en table structurée :
 *      `{ city, arrondissement, voie, n°, destination, prix_min, prix_max }`
 *      Le format DGI 2017 est tabulaire mais inconsistant entre villes —
 *      on utilise `pdfplumber` (Python) via child_process, ou `pdf-parse`
 *      (Node) si la table est extractable directement.
 *      Cas dégradé : OCR Tesseract si scan d'image.
 *
 *   3) GEOCODE — pour chaque voie, requête Nominatim OSM :
 *        GET https://nominatim.openstreetmap.org/search?q=<voie>,<ville>,Maroc&format=geojson
 *      Rate limit : 1 req/sec (fair use policy).
 *      Résultat : ligne (LineString) ou point (suivant la résolution OSM).
 *      → fallback géocodage Mapbox si Nominatim ne trouve pas.
 *
 *   4) BUFFER + MERGE — pour chaque voie géocodée :
 *      a) buffer 50-100 m de part et d'autre (proj4 EPSG:26191 pour précision Maroc)
 *      b) attribuer les prix DGI à cette zone
 *      c) fusionner les buffers contigus ayant les mêmes prix → polygones zones
 *      → écrire `apps/api/data/sig-static/dgi-zones/<city>.geojson` (un fichier par ville)
 *
 * STATUT : ÉCHAFAUDAGE — code non opérationnel, structure et étapes documentées
 * pour qu'un sprint dédié puisse commencer sans repartir de zéro.
 *
 * Dépendances à installer pour le run :
 *   npm i pdf-parse @turf/turf @turf/buffer proj4
 *   (et Python 3 + pip install pdfplumber pour l'extraction robuste si besoin)
 *
 * Usage prévu :
 *   npx ts-node apps/api/scripts/parse-dgi-pdfs.ts --city casablanca
 *   npx ts-node apps/api/scripts/parse-dgi-pdfs.ts --all
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

type DgiFiche = { kind: string; label: string; url: string; publishedAt?: string; authority?: string; description?: string };
type DgiCity = { id: string; name: string; region: string; fiches: DgiFiche[] };
type DgiRegistry = { _meta?: any; global?: DgiFiche[]; cities: DgiCity[]; roadmap?: any };

type RawTableRow = {
  city: string;
  arrondissement?: string;
  voie?: string;
  numero?: string;
  destination?: "habitation" | "commercial" | "terrain_nu" | "industriel" | "mixte" | string;
  prix_min_mad_m2?: number;
  prix_max_mad_m2?: number;
};

const REGISTRY_PATH = join(process.cwd(), "apps", "api", "data", "sig-static", "dgi-references.json");
const OUTPUT_DIR = join(process.cwd(), "apps", "api", "data", "sig-static", "dgi-zones");

function loadRegistry(): DgiRegistry {
  if (!existsSync(REGISTRY_PATH)) throw new Error(`Registry not found: ${REGISTRY_PATH}`);
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

// ── Étape 1 : DOWNLOAD ──────────────────────────────────────────────────────
async function downloadPdf(_url: string, _destPath: string): Promise<void> {
  // TODO Niveau 2 — implémenter fetch + write stream
  // Utiliser fetch global Node 18+ ; vérifier content-type application/pdf ; sauver vers cache local
  throw new Error("downloadPdf — not implemented (scaffolding)");
}

// ── Étape 2 : EXTRACT (PDF → table) ──────────────────────────────────────────
async function extractTable(_pdfPath: string, _cityId: string): Promise<RawTableRow[]> {
  // TODO Niveau 2 — deux stratégies en cascade :
  //   a) pdf-parse → si texte natif extractible, parser les tableaux ligne par ligne
  //      en se calant sur le format DGI 2017 (en-têtes : "Avenue", "N°", "Habitation",
  //      "Commercial", "Min", "Max" — varie par ville).
  //   b) fallback OCR Tesseract via child_process si le PDF est un scan d'image.
  //   c) post-traitement de normalisation : harmoniser les variations
  //      "Boulevard", "Bd", "Avenue", "Av." ; nombres avec espaces "12 000" → 12000.
  throw new Error("extractTable — not implemented (scaffolding)");
}

// ── Étape 3 : GEOCODE (voie → LineString/Point) ─────────────────────────────
async function geocodeStreet(_voie: string, _city: string): Promise<GeoJSON.Feature | null> {
  // TODO Niveau 2 — Nominatim avec rate limit 1 req/sec, fallback Mapbox.
  // Requête : `${voie}, ${city}, Maroc`. Préférer geometry de type LineString.
  // Cache résultats dans `apps/api/data/sig-static/geocoding-cache.json`
  // pour ne pas re-requêter Nominatim entre runs.
  throw new Error("geocodeStreet — not implemented (scaffolding)");
}

// ── Étape 4 : BUFFER + MERGE ────────────────────────────────────────────────
function bufferAndMerge(_features: GeoJSON.Feature[], _bufferMeters = 75): GeoJSON.FeatureCollection {
  // TODO Niveau 2 — Turf.buffer en projection métrique Maroc (EPSG:26191).
  // Reprojeter depuis EPSG:4326 (Nominatim), buffer, reprojeter retour WGS84.
  // Puis Turf.union sur features ayant les mêmes attributs (prix_min/max/destination).
  throw new Error("bufferAndMerge — not implemented (scaffolding)");
}

// ── Pipeline complet pour une ville ─────────────────────────────────────────
async function processCity(cityId: string, registry: DgiRegistry): Promise<void> {
  const city = registry.cities.find(c => c.id === cityId);
  if (!city) throw new Error(`City not in registry: ${cityId}`);
  const dgiFiches = city.fiches.filter(f => f.kind === "dgi_pdf");
  if (dgiFiches.length === 0) {
    console.log(`[${cityId}] aucune fiche DGI dans le registre, skip.`);
    return;
  }
  console.log(`[${cityId}] ${dgiFiches.length} fiche(s) DGI à traiter…`);

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const fiche of dgiFiches) {
    const pdfPath = join(OUTPUT_DIR, `${cityId}-${fiche.publishedAt || "raw"}.pdf`);
    try {
      await downloadPdf(fiche.url, pdfPath);
      const rows = await extractTable(pdfPath, cityId);
      console.log(`  → ${rows.length} lignes extraites de ${fiche.label}`);

      const geoFeatures: GeoJSON.Feature[] = [];
      for (const row of rows) {
        if (!row.voie) continue;
        const geo = await geocodeStreet(row.voie, city.name);
        if (geo) {
          geo.properties = { ...geo.properties, ...row };
          geoFeatures.push(geo);
        }
      }

      const zones = bufferAndMerge(geoFeatures, 75);
      const outPath = join(OUTPUT_DIR, `${cityId}.geojson`);
      writeFileSync(outPath, JSON.stringify(zones));
      console.log(`  ✓ ${cityId}.geojson écrit (${(zones.features?.length || 0)} zones)`);
    } catch (e) {
      console.warn(`  ⚠ ${fiche.label} — ${(e as Error).message}`);
    }
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const allFlag = args.includes("--all");
  const cityArg = args.find((_a, i) => args[i - 1] === "--city");

  const registry = loadRegistry();
  const cities = allFlag
    ? registry.cities.map(c => c.id)
    : cityArg ? [cityArg]
    : ["casablanca", "rabat", "marrakech", "tanger"]; // ordre de priorité

  console.log(`[parse-dgi-pdfs] Cibles : ${cities.join(", ")}`);
  console.log(`[parse-dgi-pdfs] ⚠ ÉCHAFAUDAGE — étapes 1-4 non implémentées (cf. TODO dans le code).\n`);

  for (const cityId of cities) {
    try { await processCity(cityId, registry); }
    catch (e) { console.error(`[${cityId}] ${(e as Error).message}`); }
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

export { downloadPdf, extractTable, geocodeStreet, bufferAndMerge, processCity };
