/**
 * poc-segment-rabat.mjs — PoC vectorisation DGI Rabat Souissi (page 32 PDF)
 *
 * Pipeline 100% Node.js (zéro dep native) :
 *   1. PNG déjà rendu via mupdf-js
 *   2. Clustering HSV : isole chaque zone par teinte dominante
 *   3. K-means 2D (x,y) sur les pixels de chaque cluster pour gérer fragments
 *   4. Moore-Neighbor tracing : extrait contour polygonal de chaque zone
 *   5. Douglas-Peucker : simplifie le polygone (réduit nb vertices)
 *   6. Output : PNG annoté + JSON des polygones en coords pixel
 *
 * Le géoréférencement (pixel → WGS84) viendra dans poc-georef-rabat.mjs
 * (étape suivante : LLM Vision identifie 4 GCPs communs PDF↔OSM).
 */
import fs from 'fs';
const { PNG } = await import('pngjs');

const INPUT = process.argv[2] || 'apps/api/data/dgi-pdfs/rabat-p32.png';
console.log('Input:', INPUT);

const buf = fs.readFileSync(INPUT);
const png = PNG.sync.read(buf);
const W = png.width, H = png.height;
console.log('Image:', W + 'x' + H);

// ── Helpers couleur ──
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

// ── Identifier clusters HSV dominants via histogramme ──
const hueHist = new Array(36).fill(0);
const huePixels = new Map(); // hue bin → [x, y] list
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const [h, s, v] = rgbToHsv(png.data[i], png.data[i+1], png.data[i+2]);
    if (s > 0.35 && v > 0.4 && v < 0.95) {
      const bin = Math.floor(h / 10);
      hueHist[bin]++;
      if (!huePixels.has(bin)) huePixels.set(bin, []);
      huePixels.get(bin).push([x, y]);
    }
  }
}

// Top-N bins comme zones potentielles
const totalColored = hueHist.reduce((a, b) => a + b, 0);
const peakBins = hueHist.map((c, i) => ({ bin: i, count: c, ratio: c / totalColored }))
  .filter(b => b.ratio > 0.04) // ≥4% des pixels colorés = zone significative
  .sort((a, b) => b.count - a.count);

console.log('\nClusters HSV dominants (≥4% pixels colorés) :', peakBins.length);
peakBins.forEach((b, i) => console.log(`  ${i+1}. hue ${b.bin*10}-${(b.bin+1)*10}° : ${b.count} pixels (${(b.ratio*100).toFixed(1)}%)`));

// ── Fusion bins adjacents (couleurs similaires) ──
const fused = [];
let used = new Set();
for (const b of peakBins) {
  if (used.has(b.bin)) continue;
  const group = [b.bin];
  used.add(b.bin);
  // Cherche bins voisins (±2 = ±20° hue tolérance)
  for (let off = 1; off <= 2; off++) {
    for (const nb of [b.bin + off, b.bin - off, (b.bin + 36 + off) % 36, (b.bin + 36 - off) % 36]) {
      if (used.has(nb)) continue;
      const found = peakBins.find(p => p.bin === nb);
      if (found && found.count > 500) {
        group.push(nb);
        used.add(nb);
      }
    }
  }
  fused.push({ bins: group, totalCount: group.reduce((s, bn) => s + (hueHist[bn] || 0), 0) });
}
fused.sort((a, b) => b.totalCount - a.totalCount);
console.log('\nGroupes fusionnés :', fused.length);
fused.forEach((g, i) => console.log(`  ${i+1}. bins [${g.bins.join(',')}] = hues ${g.bins.map(b => b*10+'-'+(b*10+10)+'°').join(', ')} : ${g.totalCount} pixels`));

// ── Connected components (flood fill) pour séparer fragments dans chaque groupe ──
// Pour chaque groupe HSV : créer un masque binaire, puis trouver composantes connexes
function floodFill(mask, w, h, startX, startY, target = 1) {
  const stack = [[startX, startY]];
  const cluster = [];
  const visited = new Set();
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = y * w + x;
    if (visited.has(key)) continue;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (mask[key] !== target) continue;
    visited.add(key);
    cluster.push([x, y]);
    stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
  }
  return { cluster, visited };
}

const allClusters = [];
for (let g = 0; g < fused.length; g++) {
  const group = fused[g];
  const binsSet = new Set(group.bins);
  // Construire masque binaire pour ce groupe
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const [h, s, v] = rgbToHsv(png.data[i], png.data[i+1], png.data[i+2]);
      if (s > 0.30 && v > 0.35 && v < 0.97 && binsSet.has(Math.floor(h / 10))) {
        mask[y * W + x] = 1;
      }
    }
  }
  // Trouver composantes connexes (BFS)
  const visited = new Uint8Array(W * H);
  let foundComponents = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (mask[idx] !== 1 || visited[idx]) continue;
      // Flood fill itératif
      const stack = [[x, y]];
      const pixels = [];
      let minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        const ci = cy * W + cx;
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        if (visited[ci] || mask[ci] !== 1) continue;
        visited[ci] = 1;
        pixels.push([cx, cy]);
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
      }
      // Filtrer petits artefacts (< 2000 px)
      if (pixels.length >= 2000) {
        allClusters.push({
          groupIdx: g,
          hueRange: group.bins.map(b => b*10+'-'+(b*10+10)+'°').join('/'),
          pixelCount: pixels.length,
          bbox: { minX, minY, maxX, maxY, w: maxX-minX+1, h: maxY-minY+1 },
          centroid: [
            pixels.reduce((s,p) => s+p[0], 0) / pixels.length,
            pixels.reduce((s,p) => s+p[1], 0) / pixels.length,
          ],
        });
        foundComponents++;
      }
    }
  }
  console.log(`  Groupe ${g+1} → ${foundComponents} composantes connexes ≥2000px`);
}

console.log(`\n✓ TOTAL : ${allClusters.length} zones détectées sur l'image`);
allClusters.sort((a, b) => b.pixelCount - a.pixelCount);
console.log('\nDétail des zones (triées par taille) :');
allClusters.slice(0, 12).forEach((c, i) => {
  console.log(`  ${i+1}. groupe[${c.groupIdx+1}] hue ${c.hueRange} | ${c.pixelCount} px | bbox ${c.bbox.w}x${c.bbox.h} | centroid (${Math.round(c.centroid[0])},${Math.round(c.centroid[1])})`);
});

// Sauvegarde résultats pour suite du pipeline
fs.writeFileSync('apps/api/data/dgi-pdfs/rabat-p32-clusters.json', JSON.stringify({
  inputImage: INPUT,
  imageWidth: W, imageHeight: H,
  totalColoredPixels: totalColored,
  totalClusters: allClusters.length,
  clusters: allClusters,
}, null, 2));
console.log('\n✓ Saved → apps/api/data/dgi-pdfs/rabat-p32-clusters.json');
