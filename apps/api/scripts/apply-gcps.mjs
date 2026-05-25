/**
 * apply-gcps.mjs — recalibre un GeoJSON PoC via 4+ GCPs précis.
 *
 * Lit un fichier GCPs (pixel ↔ WGS84) + le GeoJSON PoC existant (qui contient
 * les coords pixel originales dans properties.pixelCoords), calcule l'homographie
 * et reproduit chaque polygone avec la nouvelle géoréférencement.
 *
 * Le GeoJSON PoC standard ne contient que les coords WGS84 calculées via l'affine
 * approximative. Pour pouvoir reprojeter, on REGÉNÈRE le pipeline depuis le PDF
 * mais en remplaçant la fonction pixelToLonLat() par applyHomography().
 *
 * Usage :
 *   node apps/api/scripts/apply-gcps.mjs apps/api/data/sig-static/dgi-zones-poc/gcps-rabat-souissi.json
 *
 * Format GCPs JSON :
 *   {
 *     "_meta": { ... },
 *     "pdf": "apps/api/data/dgi-pdfs/rabat-p32.png",
 *     "clusters": "apps/api/data/dgi-pdfs/rabat-p32-clusters.json",
 *     "output": "apps/api/data/sig-static/dgi-zones-poc/rabat-souissi.geojson",
 *     "gcps": [
 *       { "label": "Carrefour X", "px": 245, "py": 380, "lng": -6.851, "lat": 33.973 },
 *       { "label": "Carrefour Y", "px": 950, "py": 380, "lng": -6.812, "lat": 33.974 },
 *       ...
 *     ]
 *   }
 */
import fs from 'fs';
import { computeHomography, applyHomography, reprojectionError } from './lib-homography.mjs';
const { PNG } = await import('pngjs');

const gcpsFile = process.argv[2];
if (!gcpsFile) { console.error('Usage: node apply-gcps.mjs <gcps.json>'); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync(gcpsFile, 'utf-8'));
console.log('GCPs file:', gcpsFile);
console.log('PDF PNG :', cfg.pdf);
console.log('Clusters:', cfg.clusters);
console.log('Output  :', cfg.output);
console.log('GCPs    :', cfg.gcps.length);

if (cfg.gcps.length < 4) {
  console.error('❌ Minimum 4 GCPs requis');
  process.exit(1);
}

// ── Calcul homographie ──
const srcPx = cfg.gcps.map(g => [g.px, g.py]);
const dstWgs = cfg.gcps.map(g => [g.lng, g.lat]);
const H = computeHomography(srcPx, dstWgs);
console.log('\nHomographie 3×3 :');
H.forEach((row, i) => console.log('  ', row.map(v => v.toExponential(3)).join('  ')));

const rmsDeg = reprojectionError(H, srcPx, dstWgs);
// Approx : 1° latitude ≈ 111 km, 1° longitude au Maroc ≈ 92 km
const rmsMeters = rmsDeg * 100000; // grossier : moyenne ~100km/deg
console.log(`\nErreur de reprojection RMS : ${rmsDeg.toExponential(3)}° ≈ ${rmsMeters.toFixed(1)} m`);

if (rmsMeters > 100) {
  console.warn('⚠ RMS > 100m — vérifier la précision des GCPs');
}

// ── Reprojection ──
// On a besoin de RE-extraire les contours depuis les clusters + masque PNG.
// La meilleure approche : ré-exécuter le pipeline mais en remplaçant pixelToLonLat.
// Pour rester simple, on importe le module poc-vectorize en y injectant H.

const buf = fs.readFileSync(cfg.pdf);
const png = PNG.sync.read(buf);
const W = png.width, H_img = png.height;
const clustersData = JSON.parse(fs.readFileSync(cfg.clusters, 'utf-8'));

const CARTO_BBOX_PX = cfg.cartoBboxPx || { minX: 80, minY: 100, maxX: 1110, maxY: 1620 };

// HSV helpers
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
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, v];
}

function buildClusterMask(cluster) {
  const binsStr = cluster.hueRange.split('/').map(s => s.split('-')[0]).map(n => Math.floor(parseInt(n) / 10));
  const binsSet = new Set(binsStr);
  const mask = new Uint8Array(W * H_img);
  const margin = 10;
  const x0 = Math.max(0, cluster.bbox.minX - margin);
  const x1 = Math.min(W, cluster.bbox.maxX + margin);
  const y0 = Math.max(0, cluster.bbox.minY - margin);
  const y1 = Math.min(H_img, cluster.bbox.maxY + margin);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    const [h, s, v] = rgbToHsv(png.data[i], png.data[i+1], png.data[i+2]);
    if (s > 0.30 && v > 0.35 && v < 0.97 && binsSet.has(Math.floor(h / 10))) mask[y * W + x] = 1;
  }
  return mask;
}

const NEIGHBORS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function dirFromTo(cx, cy, nx, ny) {
  const dx = nx - cx, dy = ny - cy;
  for (let i = 0; i < 8; i++) if (NEIGHBORS[i][0] === dx && NEIGHBORS[i][1] === dy) return i;
  return -1;
}
function isMask(mask, x, y) {
  return x >= 0 && x < W && y >= 0 && y < H_img && mask[y * W + x] === 1;
}
function findBoundaryStart(mask, bbox) {
  for (let y = bbox.minY; y <= bbox.maxY; y++) for (let x = bbox.minX; x <= bbox.maxX; x++) {
    if (mask[y * W + x] !== 1) continue;
    const hasExt = x === 0 || mask[y*W + (x-1)] !== 1 ||
                   x === W-1 || mask[y*W + (x+1)] !== 1 ||
                   y === 0 || mask[(y-1)*W + x] !== 1 ||
                   y === H_img-1 || mask[(y+1)*W + x] !== 1;
    if (hasExt) return [x, y];
  }
  return [-1, -1];
}
function traceContour(mask, sx, sy) {
  const cand4 = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  let bx=-1, by=-1;
  for (const [dx,dy] of cand4) {
    const nx = sx + dx, ny = sy + dy;
    if (!isMask(mask, nx, ny)) { bx = nx; by = ny; break; }
  }
  if (bx < 0) return [[sx, sy]];
  const contour = [[sx, sy]];
  let cx=sx, cy=sy, startBx=bx, startBy=by;
  const MAX = 50000;
  for (let iter = 0; iter < MAX; iter++) {
    const dB = dirFromTo(cx, cy, bx, by);
    if (dB < 0) break;
    let found = false, prevNX=bx, prevNY=by;
    for (let i = 1; i <= 8; i++) {
      const d = (dB + i) % 8;
      const nx = cx + NEIGHBORS[d][0], ny = cy + NEIGHBORS[d][1];
      if (isMask(mask, nx, ny)) {
        bx=prevNX; by=prevNY; cx=nx; cy=ny;
        contour.push([cx, cy]); found = true; break;
      } else { prevNX=nx; prevNY=ny; }
    }
    if (!found) break;
    if (cx === sx && cy === sy && bx === startBx && by === startBy && contour.length > 2) break;
  }
  return contour;
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let dmax = 0, index = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let d;
    if (dx === 0 && dy === 0) d = Math.hypot(p[0]-a[0], p[1]-a[1]);
    else {
      const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
      if (t < 0) d = Math.hypot(p[0]-a[0], p[1]-a[1]);
      else if (t > 1) d = Math.hypot(p[0]-b[0], p[1]-b[1]);
      else d = Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy);
    }
    if (d > dmax) { dmax = d; index = i; }
  }
  if (dmax > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

// Filtre identique au PoC v1
const realZones = clustersData.clusters.filter(c => {
  const ar = c.bbox.w / c.bbox.h;
  const isLabel = (ar > 1.5 || ar < 0.6) && c.bbox.w < 100;
  const inCarto = c.centroid[0] > CARTO_BBOX_PX.minX && c.centroid[0] < CARTO_BBOX_PX.maxX
                && c.centroid[1] > CARTO_BBOX_PX.minY && c.centroid[1] < CARTO_BBOX_PX.maxY;
  const sizeOk = c.pixelCount >= 2500;
  return !isLabel && inCarto && sizeOk;
});
console.log(`\nZones après filtre : ${realZones.length}`);

const features = [];
for (let i = 0; i < realZones.length; i++) {
  const cluster = realZones[i];
  const mask = buildClusterMask(cluster);
  const [sx, sy] = findBoundaryStart(mask, cluster.bbox);
  if (sx < 0) continue;
  const contour = traceContour(mask, sx, sy);
  const simplified = douglasPeucker(contour, 3);
  // Reprojection via homographie
  const coords = simplified.map(([x, y]) => applyHomography(H, x, y));
  if (coords.length >= 3) coords.push(coords[0]);
  features.push({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {
      zoneId: `souissi-zone-${i+1}`,
      hueRange: cluster.hueRange,
      pixelCount: cluster.pixelCount,
      contourVertices: simplified.length,
      _georef: 'homography-4gcps',
    },
  });
  console.log(`  Zone ${i+1}: ${simplified.length} vertices reprojetés`);
}

// Output
const outPath = cfg.output;
const outDir = outPath.substring(0, outPath.lastIndexOf('/'));
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  type: 'FeatureCollection',
  _meta: {
    source: cfg._meta?.source || 'PoC vectorisation PDF DGI Rabat',
    pipeline: 'mupdf-js → HSV → Moore-Neighbor → Douglas-Peucker → homographie 4-GCPs',
    georeferencing: `${cfg.gcps.length} GCPs, RMS ~${rmsMeters.toFixed(0)} m`,
    gcps: cfg.gcps,
    homography: H,
    rmsErrorDeg: rmsDeg,
    rmsErrorMeters: rmsMeters,
    extractedZones: features.length,
    generatedAt: new Date().toISOString(),
  },
  features,
}, null, 2));

console.log(`\n✓ Exported ${features.length} polygons (georef via homography) → ${outPath}`);
console.log(`  Précision estimée : ~${rmsMeters.toFixed(0)} m`);
