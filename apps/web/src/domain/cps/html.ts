/**
 * Rendu HTML imprimable (A4) d'un document Markdown simple : titres, tableaux,
 * listes, citations, gras / italique. Échappe le HTML.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

export function markdownVersHtml(md: string): string {
  const out: string[] = [];
  const lignes = md.split("\n");
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (/^\|/.test(l)) {
      const rows: string[] = [];
      while (i < lignes.length && /^\|/.test(lignes[i])) rows.push(lignes[i++]);
      const cells = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const sep = rows.length > 1 && /^\|[\s:|-]+\|$/.test(rows[1]);
      const align = sep ? cells(rows[1]).map((c) => (c.endsWith(":") ? "right" : "left")) : [];
      const head = sep ? cells(rows[0]) : null;
      const body = rows.slice(sep ? 2 : 0);
      out.push("<table>");
      if (head && head.some((h) => h)) out.push(`<thead><tr>${head.map((h, k) => `<th style="text-align:${align[k] ?? "left"}">${inline(h)}</th>`).join("")}</tr></thead>`);
      out.push("<tbody>" + body.map((r) => `<tr>${cells(r).map((c, k) => `<td style="text-align:${align[k] ?? "left"}">${inline(c)}</td>`).join("")}</tr>`).join("") + "</tbody></table>");
      continue;
    }
    const h = /^(#{1,6}) (.*)$/.exec(l);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^> /.test(l)) { out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`); i++; continue; }
    if (/^(- |\d+\. )/.test(l)) {
      const ordonnee = /^\d+\. /.test(l);
      const items: string[] = [];
      while (i < lignes.length && /^(- |\d+\. )/.test(lignes[i])) items.push(lignes[i++].replace(/^(- |\d+\. )/, ""));
      out.push(`<${ordonnee ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${ordonnee ? "ol" : "ul"}>`);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lignes.length && lignes[i].trim() && !/^(#{1,6} |\||> |- |\d+\. )/.test(lignes[i])) para.push(lignes[i++]);
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

export function documentHtml(titre: string, md: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titre)}</title>
<style>
@page { size: A4; margin: 16mm 14mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111; max-width: 190mm; margin: 0 auto; padding: 12px; background: #fff; }
h1 { font-size: 20pt; color: #0B1B3A; margin: 0 0 4px; } h2 { font-size: 14pt; color: #0B1B3A; border-bottom: 2px solid #C9A227; padding-bottom: 3px; margin-top: 26px; break-after: avoid; }
h3 { font-size: 11.5pt; color: #0B1B3A; margin: 18px 0 6px; break-after: avoid; } h4 { font-size: 10.5pt; margin: 12px 0 4px; break-after: avoid; } h5, h6 { font-size: 10pt; margin: 8px 0 2px; font-style: italic; break-after: avoid; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9pt; } th, td { border: 1px solid #bbb; padding: 3px 5px; vertical-align: top; } th { background: #eef1f6; } td:first-child, td[style*="right"] { white-space: nowrap; }
tr { break-inside: avoid; } blockquote { margin: 8px 0; padding: 6px 10px; border-left: 3px solid #C9A227; background: #faf6e8; } p, li { orphans: 3; widows: 3; }
@media print { body { padding: 0; } h2 { break-before: page; } h2:first-of-type { break-before: auto; } }
</style></head><body>
${markdownVersHtml(md)}
</body></html>`;
}
