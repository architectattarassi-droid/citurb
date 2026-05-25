#!/usr/bin/env node
/**
 * match-dgi-osm-quartiers.cjs — Vague 0 du pipeline vectorisation DGI.
 *
 * STRATÉGIE : pour chaque zone DGI (nomCommun + arrondissement + avenues),
 * trouver le meilleur match parmi les 1 835 quartiers OSM Maroc (admin_level
 * 9-10 + place=suburb/quarter/neighbourhood) via Levenshtein/similarity.
 *
 * Si un match est trouvé avec score ≥ 0.78 → on récupère le POLYGON / POINT
 * OSM associé et on l'utilise comme géométrie de la zone DGI (précision ~10-30m).
 * Sinon → fallback Nominatim (déjà fait par geocode-dgi-zones.cjs).
 *
 * Output : apps/api/data/sig-static/dgi-zones-geo/<city>.poly.geojson
 *  (en complément du <city>.geojson basé sur Nominatim seul)
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

// ── Levenshtein similarity (sans dépendance) ──
function levenshtein(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}
function similarity(a, b) {
  if (!a || !b) return 0;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const A = norm(a), B = norm(b);
  if (A === B) return 1;
  const maxLen = Math.max(A.length, B.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(A, B) / maxLen;
}

// ── Charger la base OSM ──
const OSM_PATH = join(process.cwd(), 'data', 'sig-static', 'osm-quartiers-ma.geojson');
const osmData = JSON.parse(readFileSync(OSM_PATH, 'utf-8'));
console.log('Loaded OSM quartiers:', osmData.features.length);

// Pré-filtrage par ville (basé sur le nom OSM ou la proximité GPS d'une ville connue)
const CITY_CENTROIDS = {
  rabat: { lat: 34.0209, lng: -6.8416 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  tanger: { lat: 35.7595, lng: -5.8340 },
  fes: { lat: 34.0181, lng: -5.0078 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  kenitra: { lat: 34.2610, lng: -6.5802 },
  sale: { lat: 34.0531, lng: -6.7985 },
  meknes: { lat: 33.8935, lng: -5.5473 },
  oujda: { lat: 34.6814, lng: -1.9086 },
  settat: { lat: 33.0011, lng: -7.6166 },
  'beni-mellal': { lat: 32.3373, lng: -6.3498 },
  safi: { lat: 32.2994, lng: -9.2372 },
  tetouan: { lat: 35.5728, lng: -5.3727 },
  midelt: { lat: 32.6789, lng: -4.7331 },
  nador: { lat: 35.1726, lng: -2.9335 },
  berkane: { lat: 34.9197, lng: -2.3193 },
};

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const v = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(v));
}

// Pré-filtre OSM dans un rayon de 50 km du centroïde ville
function osmForCity(cityId) {
  const c = CITY_CENTROIDS[cityId];
  if (!c) return osmData.features;
  return osmData.features.filter(f => {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (lat == null || lng == null) return false;
    return distanceKm(c, { lat, lng }) < 50;
  });
}

// Match d'une zone DGI ↔ quartier OSM
function findBestOsmMatch(zone, osmPool) {
  const targets = [];
  if (zone.nomCommun) targets.push(zone.nomCommun);
  if (zone.arrondissement) targets.push(zone.arrondissement);
  if (zone.avenues && zone.avenues.length > 0) {
    targets.push(...zone.avenues.slice(0, 3));
  }
  if (targets.length === 0) targets.push(zone.code);

  let best = { score: 0, feature: null, matchedOn: null, matchedQuery: null };
  for (const f of osmPool) {
    const osmName = f.properties.name || f.properties.name_fr || '';
    if (!osmName) continue;
    for (const t of targets) {
      const s = similarity(t, osmName);
      if (s > best.score) {
        best = { score: s, feature: f, matchedOn: osmName, matchedQuery: t };
      }
    }
  }
  return best;
}

function processCity(cityId) {
  const inPath = join(process.cwd(), 'data', 'sig-static', 'dgi-zones', cityId + '.json');
  if (!existsSync(inPath)) { console.error('Missing ' + inPath); return; }
  const dgi = JSON.parse(readFileSync(inPath, 'utf-8'));

  const osmPool = osmForCity(cityId);
  console.log(`\n[${cityId}] OSM candidates: ${osmPool.length} | DGI zones: ${dgi.zones.length}`);

  const features = [];
  let matched = 0;
  const THRESHOLD = 0.78;

  for (const z of dgi.zones || []) {
    const best = findBestOsmMatch(z, osmPool);
    if (best.feature && best.score >= THRESHOLD) {
      features.push({
        type: 'Feature',
        geometry: best.feature.geometry,
        properties: {
          code: z.code,
          ville: dgi._meta?.ville || cityId,
          region: dgi._meta?.region,
          arrondissement: z.arrondissement,
          nomCommun: z.nomCommun,
          delimitations: z.delimitations,
          avenues: z.avenues,
          prixDgi: z.prix,
          matchSource: 'osm-quartiers',
          matchScore: Math.round(best.score * 100) / 100,
          matchedOn: best.matchedOn,
          matchedQuery: best.matchedQuery,
        },
      });
      matched++;
    }
  }

  console.log(`  → ${matched}/${dgi.zones.length} zones matched OSM (threshold ${THRESHOLD})`);

  const outDir = join(process.cwd(), 'data', 'sig-static', 'dgi-zones-osm');
  if (!existsSync(outDir)) require('fs').mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, cityId + '.geojson');
  writeFileSync(outPath, JSON.stringify({
    type: 'FeatureCollection',
    _meta: {
      city: dgi._meta?.ville || cityId,
      method: 'Levenshtein matching DGI zones × OSM admin_level 9-10 + place suburb/quarter/neighbourhood',
      threshold: THRESHOLD,
      stats: { totalZones: dgi.zones.length, matched, ratio: Math.round(matched / dgi.zones.length * 100) },
      generatedAt: new Date().toISOString(),
    },
    features,
  }));
  return { cityId, total: dgi.zones.length, matched };
}

const args = process.argv.slice(2);
const cities = args.includes('--all')
  ? Object.keys(CITY_CENTROIDS)
  : (args[0] ? [args[0]] : ['rabat']);

const results = [];
for (const c of cities) {
  const r = processCity(c);
  if (r) results.push(r);
}

console.log('\n=== BILAN ===');
let totalZones = 0, totalMatched = 0;
for (const r of results) {
  totalZones += r.total;
  totalMatched += r.matched;
  console.log(`  ${r.cityId.padEnd(15)} : ${r.matched}/${r.total} (${Math.round(r.matched / r.total * 100)}%)`);
}
console.log(`  TOTAL : ${totalMatched}/${totalZones} (${Math.round(totalMatched / totalZones * 100)}%)`);
