/**
 * extract-pdf-text-positions.mjs — extrait le text layer d'une page PDF DGI
 * avec les bounding boxes pour chaque mot.
 *
 * Sortie : JSON [{ text, x, y, w, h, page_pt }] qui mappe les avenues / noms
 * cités sur la page vers leur position pixel approximative (utile pour
 * dériver des GCPs automatiquement par géocodage Nominatim).
 *
 * Usage :
 *   node apps/api/scripts/extract-pdf-text-positions.mjs <pdf> <pageNum> <scale>
 */
import fs from 'fs';
import * as mupdf from 'mupdf';

const PDF = process.argv[2] || 'apps/api/data/dgi-pdfs/rabat.pdf';
const PAGE_NUM = parseInt(process.argv[3] || '32', 10) - 1;
const SCALE = parseFloat(process.argv[4] || '2');

const data = fs.readFileSync(PDF);
const doc = mupdf.Document.openDocument(data, 'application/pdf');
console.log(`PDF: ${PDF} | page ${PAGE_NUM + 1}/${doc.countPages()} | scale ${SCALE}x`);

const page = doc.loadPage(PAGE_NUM);
const bounds = page.getBounds();
console.log(`Page bounds (pt): ${bounds.map(v => v.toFixed(1)).join(', ')}`);
const pageWidthPt = bounds[2] - bounds[0];
const pageHeightPt = bounds[3] - bounds[1];
console.log(`Page size (pt): ${pageWidthPt.toFixed(1)} × ${pageHeightPt.toFixed(1)}`);
console.log(`PNG size (px estimé): ${(pageWidthPt * SCALE).toFixed(0)} × ${(pageHeightPt * SCALE).toFixed(0)}`);

const struct = page.toStructuredText().asJSON();
const json = JSON.parse(struct);

const spans = [];
for (const block of (json.blocks || [])) {
  for (const line of (block.lines || [])) {
    // line.bbox = [x, y, w, h] OR { x, y, w, h } selon version mupdf
    // line.text si concat, sinon line.spans[].text
    const txt = line.text || (line.spans || []).map(s => s.text).join('');
    const bbox = line.bbox || (line.spans && line.spans[0]?.bbox);
    if (!bbox || !txt || !txt.trim()) continue;
    // bbox en points PDF → conversion px PNG : (val - bounds[0]) * SCALE
    let x, y, w, h;
    if (Array.isArray(bbox)) {
      // Format [x0, y0, x1, y1] OU [x, y, w, h]
      x = bbox[0]; y = bbox[1];
      w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1];
    } else if (typeof bbox === 'object') {
      x = bbox.x ?? bbox.x0 ?? 0;
      y = bbox.y ?? bbox.y0 ?? 0;
      w = (bbox.w ?? bbox.width ?? (bbox.x1 - bbox.x0) ?? 0);
      h = (bbox.h ?? bbox.height ?? (bbox.y1 - bbox.y0) ?? 0);
    }
    spans.push({
      text: txt.trim(),
      pt_x: x, pt_y: y, pt_w: w, pt_h: h,
      px_x: Math.round((x - bounds[0]) * SCALE),
      px_y: Math.round((y - bounds[1]) * SCALE),
      px_w: Math.round(w * SCALE),
      px_h: Math.round(h * SCALE),
      px_cx: Math.round((x - bounds[0] + w / 2) * SCALE),
      px_cy: Math.round((y - bounds[1] + h / 2) * SCALE),
    });
  }
}

console.log(`\nText spans extraits : ${spans.length}`);
console.log('Premiers exemples :');
spans.slice(0, 10).forEach((s, i) => {
  console.log(`  ${i+1}. "${s.text}" @ pt(${s.pt_x?.toFixed(1)},${s.pt_y?.toFixed(1)}) px(${s.px_cx},${s.px_cy})`);
});

// Filtre : ne garder que les spans ressemblant à des noms d'avenues/lieux
// Heuristique : >= 3 mots OU mot-clé "Av", "Bd", "Rue", "Place", "Carrefour", "Mosquée"
const KW = /\b(av(enue)?|bd|boulevard|rue|place|carrefour|mosquée|mosquee|hôpital|hopital|école|ecole|parc|stade|complexe|résidence|residence|lot|ksar)\b/i;
const candidates = spans.filter(s => KW.test(s.text) || s.text.split(/\s+/).length >= 3);
console.log(`\nCandidats GCPs (noms d'avenues / lieux) : ${candidates.length}`);
candidates.forEach((s, i) => {
  console.log(`  ${i+1}. "${s.text}" @ px(${s.px_cx},${s.px_cy}) bbox ${s.px_w}×${s.px_h}`);
});

const outDir = 'apps/api/data/dgi-pdfs';
const cityFromPdf = PDF.split(/[\\/]/).pop().replace('.pdf', '');
const outPath = `${outDir}/${cityFromPdf}-p${PAGE_NUM + 1}-text.json`;
fs.writeFileSync(outPath, JSON.stringify({
  pdf: PDF,
  page: PAGE_NUM + 1,
  scale: SCALE,
  pageBoundsPt: bounds,
  pageSizePt: [pageWidthPt, pageHeightPt],
  spans,
  candidates,
}, null, 2));
console.log(`\n✓ Saved → ${outPath}`);
