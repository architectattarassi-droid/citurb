#!/usr/bin/env node
/**
 * geocode-dgi-zones.cjs — géocode les avenues des zones DGI via Nominatim
 * (API OSM publique libre, rate limit 1 req/sec fair-use) et produit un
 * GeoJSON FeatureCollection avec un marker par zone DGI au centroïde
 * approximatif de ses avenues.
 *
 * Pour chaque zone d'un fichier dgi-zones/<city>.json :
 *  - Géocode la 1ère avenue listée via Nominatim (q=<avenue>+<ville>+Maroc)
 *  - Si succès : marker au point retourné + propriétés zone (code, prix DGI, etc.)
 *  - Cache résultats dans geocoding-cache.json pour ne pas re-requêter
 *
 * Output : apps/api/data/sig-static/dgi-zones-geo/<city>.geojson
 *
 * Usage :
 *   node apps/api/scripts/geocode-dgi-zones.cjs rabat
 *   node apps/api/scripts/geocode-dgi-zones.cjs --all
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'CITURBAREA/1.0 (architectattarassi@gmail.com)';
const DATA_DIR = join(process.cwd(), 'data');
const CACHE_PATH = join(DATA_DIR, 'sig-static', 'geocoding-cache.json');
const OUT_DIR = join(DATA_DIR, 'sig-static', 'dgi-zones-geo');

function loadCache() {
  if (existsSync(CACHE_PATH)) {
    try { return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')); } catch {}
  }
  return {};
}

function saveCache(c) {
  writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2));
}

async function geocode(query, cache) {
  const key = query.toLowerCase().trim();
  if (cache[key] !== undefined) return cache[key];

  await new Promise(r => setTimeout(r, 1100)); // 1.1s pour rester safe sous fair-use
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ma`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' } });
    if (!r.ok) { cache[key] = null; return null; }
    const arr = await r.json();
    if (arr && arr[0] && arr[0].lat && arr[0].lon) {
      const hit = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display: arr[0].display_name };
      cache[key] = hit;
      return hit;
    }
    cache[key] = null;
    return null;
  } catch (e) {
    console.warn('  geocode err:', e.message);
    return null;
  }
}

async function processCity(cityId) {
  const inPath = join(DATA_DIR, 'sig-static', 'dgi-zones', cityId + '.json');
  if (!existsSync(inPath)) { console.error('Missing ' + inPath); return; }
  const data = JSON.parse(readFileSync(inPath, 'utf-8'));
  const cityName = data._meta?.ville || cityId;
  const region = data._meta?.region || '';

  const cache = loadCache();
  const features = [];
  let geocoded = 0, skipped = 0, failed = 0;

  for (const z of data.zones || []) {
    const avenues = z.avenues || [];
    const firstAv = avenues[0];
    if (!firstAv) {
      // Pas d'avenue → on essaie le nomCommun
      if (z.nomCommun) {
        const hit = await geocode(`${z.nomCommun}, ${cityName}`, cache);
        if (hit) { features.push(makeFeature(z, hit, cityName, region, z.nomCommun)); geocoded++; }
        else failed++;
      } else { skipped++; }
      continue;
    }
    const query = `${firstAv}, ${cityName}`;
    const hit = await geocode(query, cache);
    if (hit) {
      features.push(makeFeature(z, hit, cityName, region, firstAv));
      geocoded++;
      if ((geocoded + failed) % 10 === 0) {
        saveCache(cache);
        console.log(`  ${cityName}: ${geocoded} hits, ${failed} fails (saved cache)`);
      }
    } else {
      failed++;
    }
  }
  saveCache(cache);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const fc = {
    type: 'FeatureCollection',
    _meta: {
      city: cityName,
      cityId,
      region,
      sourceDgi: data._meta?.source,
      geocodedAt: new Date().toISOString(),
      method: 'Nominatim OSM geocoding (1ère avenue de chaque zone DGI)',
      stats: { totalZones: data.zones?.length || 0, geocoded, failed, skipped },
      warning: "Markers au centroïde Nominatim de la 1ère avenue listée — précision ~100-500m. Les polygones exacts nécessitent géocodage multi-avenues + buffers (itération future).",
    },
    features,
  };
  writeFileSync(join(OUT_DIR, cityId + '.geojson'), JSON.stringify(fc));
  console.log(`✓ ${cityName} : ${geocoded}/${data.zones?.length || 0} zones géocodées → ${cityId}.geojson`);
}

function makeFeature(zone, hit, cityName, region, source) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [hit.lon, hit.lat] },
    properties: {
      code: zone.code,
      arrondissement: zone.arrondissement,
      ville: cityName,
      region,
      nomCommun: zone.nomCommun,
      delimitations: zone.delimitations,
      avenues: zone.avenues,
      prixDgi: zone.prix,
      geocodedFrom: source,
      geocodedDisplay: hit.display,
    },
  };
}

(async () => {
  const args = process.argv.slice(2);
  const cities = args.includes('--all')
    ? ['rabat', 'casablanca', 'marrakech', 'tanger', 'agadir', 'kenitra', 'sale', 'meknes',
       'oujda', 'settat', 'beni-mellal', 'safi', 'tetouan', 'midelt', 'nador', 'berkane', 'fes']
    : [args[0] || 'rabat'];

  for (const c of cities) {
    console.log('\n--- ' + c + ' ---');
    await processCity(c);
  }
  console.log('\nDone.');
})();
