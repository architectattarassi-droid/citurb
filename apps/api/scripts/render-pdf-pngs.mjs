/**
 * render-pdf-pngs.mjs — render des pages cartographie des PDFs DGI en PNG via mupdf (WASM, zéro dep native)
 *
 * Usage : node apps/api/scripts/render-pdf-pngs.mjs rabat
 * Détecte automatiquement les pages "Cartographie des Zones" via le text layer
 * et les exporte en PNG haute résolution.
 */
import fs from 'fs';
import path from 'path';
import * as mupdf from 'mupdf';

const args = process.argv.slice(2);
const cityId = args[0] || 'rabat';

const pdfPath = path.join('apps/api/data/dgi-pdfs', cityId + '.pdf');
if (!fs.existsSync(pdfPath)) {
  console.error('Missing PDF:', pdfPath);
  process.exit(1);
}

const outDir = path.join('apps/api/data/dgi-pdfs', cityId + '-cartos');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const data = fs.readFileSync(pdfPath);
const doc = mupdf.Document.openDocument(data, 'application/pdf');
console.log(`[${cityId}] ${doc.countPages()} pages totales`);

// Heuristique : la section 7 "Cartographie" commence souvent vers la fin du PDF
// On parcourt toutes les pages, on extrait le texte, et on détecte les pages cartos
const cartoPages = [];
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  const text = page.toStructuredText().asJSON();
  const json = JSON.parse(text);
  const allText = (json.blocks || [])
    .flatMap(b => (b.lines || []).flatMap(l => (l.text || (l.spans || []).map(s => s.text).join(''))))
    .join(' ').toLowerCase();
  if (allText.includes('cartographie') || /\b(7\.\d+|annexe administrative|arrondissement)\b/.test(allText)) {
    // Probable page carto si court contenu texte ET mots-clés présents
    if (allText.length < 800) cartoPages.push(i);
  }
}
console.log(`  → ${cartoPages.length} pages cartographie détectées :`, cartoPages.map(p => p + 1).join(', '));

// Render chaque page carto
const scale = 2; // 200 DPI équivalent (default mupdf=96, *2 → 192)
let rendered = 0;
for (const pageNum of cartoPages.slice(0, 25)) {
  try {
    const page = doc.loadPage(pageNum);
    const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false);
    const png = pixmap.asPNG();
    const outPath = path.join(outDir, `page-${String(pageNum + 1).padStart(3, '0')}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`  ✓ page ${pageNum + 1} → ${outPath} (${Math.round(png.length / 1024)}KB, ${pixmap.getWidth()}x${pixmap.getHeight()})`);
    rendered++;
  } catch (e) {
    console.warn(`  ⚠ page ${pageNum + 1} fail:`, e.message);
  }
}

console.log(`\n✓ ${cityId} : ${rendered} pages cartos exportées dans ${outDir}`);
