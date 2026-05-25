/**
 * poc-vectorize-rabat.mjs — vectorisation + géoréférencement de la page 32 PDF DGI Rabat
 *
 * Pipeline complet PoC :
 *   1. Segmentation HSV (déjà validée par poc-segment-rabat.mjs)
 *   2. Extraction contour Moore-Neighbor tracing
 *   3. Simplification Douglas-Peucker (réduit le nb vertices)
 *   4. Géoréférencement affine via bbox connue Souissi (33.93-33.98°N, -6.86 à -6.80°E)
 *      → étape future : 4 GCPs précis via LLM Vision ou saisie manuelle
 *   5. Output GeoJSON polygones en WGS84
 *
 * Tout en Node.js pur, zéro dépendance native (juste pngjs).
 */
import fs from 'fs';
const { PNG } = await import('pngjs');

const INPUT = process.argv[2] || 'apps/api/data/dgi-pdfs/rabat-p32.png';
const OUTPUT = process.argv[3] || 'apps/api/data/sig-static/dgi-zones-poc/rabat-souissi.geojson';

// ── Bbox géographique connue de l'arrondissement Souissi Rabat ──
// Approximation depuis Wikipedia/OSM admin_level=10 "Arrondissement Souissi"
// Précision : ±200m. Pour précision <30m, GCPs précis nécessaires.
const SOUISSI_BBOX = {
  minLat: 33.926,  // bord sud (vers Témara)
  maxLat: 33.984,  // bord nord (Rocade)
  minLng: -6.860,  // bord ouest (Av Hassan II)
  maxLng: -6.795,  // bord est (rocade Casablanca)
};

const buf = fs.readFileSync(INPUT);
const png = PNG.sync.read(buf);
const W = png.width, H = png.height;

// ── Bbox effective du contenu carto sur la page ──
// L'image fait 1191x1684 mais le contenu carto occupe ~marges 80px top, header 60px
// Estimer la zone "carte" (hors titre et marges)
const CARTO_BBOX_PX = { minX: 80, minY: 100, maxX: 1110, maxY: 1620 };

// ── HSV helpers ──
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

// ── Charger les clusters détectés ──
const clustersData = JSON.parse(fs.readFileSync('apps/api/data/dgi-pdfs/rabat-p32-clusters.json', 'utf-8'));

// Filtre : ne garder que les zones (pas les labels)
// Heuristique : aspect ratio bbox raisonnable + taille minimum + dans la zone carto
const realZones = clustersData.clusters.filter(c => {
  const ar = c.bbox.w / c.bbox.h;
  // Labels rectangulaires (P4017, etc.) : ar > 1.5 ou < 0.6 ET bbox.w < 100
  const isLabel = (ar > 1.5 || ar < 0.6) && c.bbox.w < 100;
  // Doit être dans la zone carto, pas dans les marges
  const inCarto = c.centroid[0] > CARTO_BBOX_PX.minX && c.centroid[0] < CARTO_BBOX_PX.maxX
                && c.centroid[1] > CARTO_BBOX_PX.minY && c.centroid[1] < CARTO_BBOX_PX.maxY;
  // Surface minimum significative
  const sizeOk = c.pixelCount >= 2500;
  return !isLabel && inCarto && sizeOk;
});

console.log(`Zones après filtrage labels : ${realZones.length}/${clustersData.clusters.length}`);

// ── Re-construire le masque par cluster pour extraire contour ──
function buildClusterMask(cluster, png, W, H) {
  // Trouver bins associés via les hue ranges
  const binsStr = cluster.hueRange.split('/').map(s => s.split('-')[0]).map(n => Math.floor(parseInt(n) / 10));
  const binsSet = new Set(binsStr);

  const mask = new Uint8Array(W * H);
  // On ne scanne que la bbox du cluster + marge pour rapidité
  const margin = 10;
  const x0 = Math.max(0, cluster.bbox.minX - margin);
  const x1 = Math.min(W, cluster.bbox.maxX + margin);
  const y0 = Math.max(0, cluster.bbox.minY - margin);
  const y1 = Math.min(H, cluster.bbox.maxY + margin);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const [h, s, v] = rgbToHsv(png.data[i], png.data[i+1], png.data[i+2]);
      if (s > 0.30 && v > 0.35 && v < 0.97 && binsSet.has(Math.floor(h / 10))) {
        mask[y * W + x] = 1;
      }
    }
  }
  return mask;
}

// ── Moore-Neighbor tracing (Jacob's stopping criterion) ──
// Implémentation manuelle classique : on maintient deux pixels :
//   c = pixel courant DANS le masque
//   b = pixel "background" adjacent à c, HORS masque (d'où on vient)
// À chaque pas, on tourne dans le sens horaire autour de c en partant de b
// jusqu'à trouver un pixel mask. Le nouveau b = le voisin testé juste avant.
// Critère d'arrêt de Jacob : on revient à (start_c, start_b).
// Réf : http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_Abeer_George_Ghuneim/moore.html
const NEIGHBORS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function dirFromTo(cx, cy, nx, ny) {
  const dx = nx - cx, dy = ny - cy;
  for (let i = 0; i < 8; i++) {
    if (NEIGHBORS[i][0] === dx && NEIGHBORS[i][1] === dy) return i;
  }
  return -1;
}
function isMask(mask, W, H, x, y) {
  return x >= 0 && x < W && y >= 0 && y < H && mask[y * W + x] === 1;
}
function traceContour(mask, W, H, startX, startY) {
  // Trouver un pixel "background" initial adjacent au start (4-conn d'abord)
  let bx = -1, by = -1;
  const cand4 = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (const [dx, dy] of cand4) {
    const nx = startX + dx, ny = startY + dy;
    if (!isMask(mask, W, H, nx, ny)) { bx = nx; by = ny; break; }
  }
  if (bx < 0) return [[startX, startY]]; // pixel isolé sans bord

  const contour = [[startX, startY]];
  let cx = startX, cy = startY;
  let startBx = bx, startBy = by;
  const MAX_ITER = 50000;
  let iter = 0;
  while (iter++ < MAX_ITER) {
    // Direction de c vers b
    const dirB = dirFromTo(cx, cy, bx, by);
    if (dirB < 0) break;
    // Tourner sens horaire à partir de dirB+1
    let found = false;
    let prevNX = bx, prevNY = by; // mémorise le dernier non-mask testé
    for (let i = 1; i <= 8; i++) {
      const d = (dirB + i) % 8;
      const nx = cx + NEIGHBORS[d][0];
      const ny = cy + NEIGHBORS[d][1];
      if (isMask(mask, W, H, nx, ny)) {
        // Pixel suivant trouvé. Nouveau b = précédent voisin (non-mask)
        bx = prevNX; by = prevNY;
        cx = nx; cy = ny;
        contour.push([cx, cy]);
        found = true;
        break;
      } else {
        prevNX = nx; prevNY = ny;
      }
    }
    if (!found) break; // pixel isolé
    // Jacob : retour à start_c ET start_b
    if (cx === startX && cy === startY && bx === startBx && by === startBy && contour.length > 2) break;
  }
  return contour;
}

// Cherche le premier pixel "frontière" du masque (au moins un voisin extérieur)
// pour démarrer le tracing depuis un vrai bord, pas un pixel intérieur.
function findBoundaryStart(mask, W, H, bbox) {
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (mask[y * W + x] !== 1) continue;
      // Vérifie qu'au moins un voisin (4-conn) est hors masque
      const hasExterior =
        x === 0 || mask[y * W + (x - 1)] !== 1 ||
        x === W - 1 || mask[y * W + (x + 1)] !== 1 ||
        y === 0 || mask[(y - 1) * W + x] !== 1 ||
        y === H - 1 || mask[(y + 1) * W + x] !== 1;
      if (hasExterior) return [x, y];
    }
  }
  return [-1, -1];
}

// ── Douglas-Peucker simplification ──
function perpendicularDistance(p, a, b) {
  const [px, py] = p; const [ax, ay] = a; const [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  if (t < 0) return Math.hypot(px - ax, py - ay);
  if (t > 1) return Math.hypot(px - bx, py - by);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let dmax = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > dmax) { dmax = d; index = i; }
  }
  if (dmax > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

// ── Affine pixel → WGS84 (approximation depuis bbox carto) ──
function pixelToLonLat(px, py) {
  // Mapping linéaire approximatif depuis CARTO_BBOX_PX vers SOUISSI_BBOX
  // Y-axis pixel inversée : y=0 en haut = maxLat
  const tx = (px - CARTO_BBOX_PX.minX) / (CARTO_BBOX_PX.maxX - CARTO_BBOX_PX.minX);
  const ty = (py - CARTO_BBOX_PX.minY) / (CARTO_BBOX_PX.maxY - CARTO_BBOX_PX.minY);
  const lng = SOUISSI_BBOX.minLng + tx * (SOUISSI_BBOX.maxLng - SOUISSI_BBOX.minLng);
  const lat = SOUISSI_BBOX.maxLat - ty * (SOUISSI_BBOX.maxLat - SOUISSI_BBOX.minLat); // inverse Y
  return [lng, lat];
}

// ── Pipeline complet ──
const features = [];
for (let i = 0; i < realZones.length; i++) {
  const cluster = realZones[i];
  console.log(`\n[Zone ${i+1}/${realZones.length}] groupe ${cluster.groupIdx+1} hue ${cluster.hueRange} | ${cluster.pixelCount} px`);

  const mask = buildClusterMask(cluster, png, W, H);

  // Trouver pixel FRONTIÈRE (et non pas premier pixel mask) pour démarrer le tracing
  const [startX, startY] = findBoundaryStart(mask, W, H, cluster.bbox);
  if (startX < 0) { console.log('  ⚠ no boundary pixel found, skip'); continue; }

  // Contour
  let contour = traceContour(mask, W, H, startX, startY);
  // Sanity check : si contour < perimeter_estimate/4, retenter depuis un autre bord
  const perimeterEstimate = 2 * (cluster.bbox.w + cluster.bbox.h);
  if (contour.length < perimeterEstimate / 4) {
    console.log(`  ⚠ contour suspect (${contour.length} < ${Math.floor(perimeterEstimate/4)}), retry scan diagonal`);
    // Retry : scan diagonal (top-right vers bottom-left) pour trouver un autre bord
    let altStart = null;
    for (let off = 0; off < cluster.bbox.w + cluster.bbox.h && !altStart; off++) {
      for (let y = cluster.bbox.minY; y <= cluster.bbox.maxY; y++) {
        const x = cluster.bbox.maxX - off + (y - cluster.bbox.minY);
        if (x < cluster.bbox.minX || x > cluster.bbox.maxX) continue;
        if (mask[y * W + x] !== 1) continue;
        const hasExt = x === 0 || mask[y * W + (x - 1)] !== 1 ||
                       x === W - 1 || mask[y * W + (x + 1)] !== 1 ||
                       y === 0 || mask[(y - 1) * W + x] !== 1 ||
                       y === H - 1 || mask[(y + 1) * W + x] !== 1;
        if (hasExt && (x !== startX || y !== startY)) { altStart = [x, y]; break; }
      }
    }
    if (altStart) {
      const retry = traceContour(mask, W, H, altStart[0], altStart[1]);
      if (retry.length > contour.length) {
        console.log(`  ✓ retry plus long : ${retry.length} vertices (vs ${contour.length})`);
        contour = retry;
      }
    }
  }
  console.log(`  Contour brut : ${contour.length} vertices`);

  // Simplification (epsilon = 3 pixels)
  const simplified = douglasPeucker(contour, 3);
  console.log(`  Après Douglas-Peucker (ε=3) : ${simplified.length} vertices`);

  // Conversion en WGS84
  const coords = simplified.map(([x, y]) => pixelToLonLat(x, y));
  // Fermer le polygone
  if (coords.length >= 3) coords.push(coords[0]);

  features.push({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {
      zoneId: `souissi-zone-${i+1}`,
      hueRange: cluster.hueRange,
      pixelCount: cluster.pixelCount,
      bboxPx: cluster.bbox,
      centroidPx: cluster.centroid,
      contourVertices: simplified.length,
      _note: 'PoC géoréférencement approximatif depuis bbox Souissi — précision ~200m, à raffiner via GCPs précis',
    },
  });
}

// ── Output GeoJSON ──
const outDir = OUTPUT.substring(0, OUTPUT.lastIndexOf('/'));
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify({
  type: 'FeatureCollection',
  _meta: {
    source: 'PoC vectorisation PDF DGI Rabat page 32 (section 7.1 Cartographie Souissi)',
    pipeline: 'mupdf-js → pngjs HSV segmentation → Moore-Neighbor tracing → Douglas-Peucker → affine bbox',
    georeferencing: 'APPROXIMATIF (bbox Souissi connue, précision ~200m). Pour <30m, raffiner via 4 GCPs OSM précis.',
    sourceBboxPx: CARTO_BBOX_PX,
    targetBboxWgs84: SOUISSI_BBOX,
    extractedZones: features.length,
    generatedAt: new Date().toISOString(),
  },
  features,
}, null, 2));

console.log(`\n✓ Exported ${features.length} polygons → ${OUTPUT}`);
console.log(`  Total vertices : ${features.reduce((s, f) => s + f.geometry.coordinates[0].length, 0)}`);
