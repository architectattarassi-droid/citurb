/**
 * Rendu DOCX (Word) du même modèle de document que le PDF — sans dépendance :
 * XML WordprocessingML assemblé dans une archive zip (rendu/zip.ts).
 * Le cabinet le retouche à la main (spec §5.6) : texte et tableaux natifs,
 * police Calibri 10 pt, charte §5.5, marges 2,0 / 1,8 cm, pied de page avec
 * numéro, empreinte et numéro de page.
 */
import type { Bloc, Cellule, Colonne, DocumentDevis, StyleLigne } from "../documentDevis";
import { creerZip } from "./zip";

const X = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LARGEUR_TW = 11906 - 2 * 1021; // A4 moins marges gauche/droite (1,8 cm)
const NUIT = "1F3864", CLAIR = "EEF1F7", LIBELLE = "F5F5F5", GRIS = "595959", ROUGE = "C00000", OR = "7F6000";

interface Run { t: string; b?: boolean; i?: boolean; c?: string; sz?: number; police?: string }
const run = (r: Run) => {
  const pr = [
    r.police ? `<w:rFonts w:ascii="${r.police}" w:hAnsi="${r.police}" w:cs="${r.police}"/>` : "",
    r.b ? "<w:b/>" : "", r.i ? "<w:i/>" : "", r.c ? `<w:color w:val="${r.c}"/>` : "", r.sz ? `<w:sz w:val="${r.sz * 2}"/><w:szCs w:val="${r.sz * 2}"/>` : "",
  ].join("");
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${X(r.t)}</w:t></w:r>`;
};
const para = (runs: Run[], o: { align?: "left" | "center" | "right"; avant?: number; apres?: number; bordureBas?: string; puce?: boolean } = {}) => {
  const pPr = [
    o.align && o.align !== "left" ? `<w:jc w:val="${o.align}"/>` : "",
    `<w:spacing w:before="${o.avant ?? 0}" w:after="${o.apres ?? 60}"/>`,
    o.bordureBas ? `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${o.bordureBas}"/></w:pBdr>` : "",
    o.puce ? `<w:ind w:left="284" w:hanging="284"/>` : "",
  ].join("");
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.map(run).join("")}</w:p>`;
};

function cellule(cel: Cellule, col: Colonne, w: number, fond: string | null, gras: boolean, entete: boolean): string {
  const align = col.align === "droite" ? "right" : col.align === "centre" ? "center" : "left";
  const ps: string[] = [];
  const principal: Run[] = [];
  if (cel.caseACocher) principal.push({ t: "☐ ", police: "Segoe UI Symbol", sz: 12 });
  if (cel.texte) principal.push({ t: cel.texte, b: entete || gras || cel.gras, c: entete ? NUIT : cel.or ? OR : undefined });
  ps.push(para(principal.length ? principal : [{ t: "" }], { align, apres: 0 }));
  if (cel.alerte) ps.push(para([{ t: cel.alerte, b: true, c: ROUGE, sz: 9 }], { align, apres: 0 }));
  if (cel.sous) ps.push(para([{ t: cel.sous, i: true, c: GRIS, sz: 9 }], { align, apres: 0 }));
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fond ? `<w:shd w:val="clear" w:color="auto" w:fill="${fond}"/>` : ""}</w:tcPr>${ps.join("")}</w:tc>`;
}

function tableau(colonnes: Colonne[], lignes: Cellule[][], styles: StyleLigne[] = [], fondPremiere?: string): string {
  const ws = colonnes.map((c) => Math.round(c.largeur * LARGEUR_TW));
  const bords = `<w:tblBorders><w:top w:val="single" w:sz="6" w:color="BFBFBF"/><w:left w:val="single" w:sz="6" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="6" w:color="BFBFBF"/><w:right w:val="single" w:sz="6" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders>`;
  const rows: string[] = [];
  if (colonnes.some((c) => c.titre)) {
    rows.push(`<w:tr><w:trPr><w:tblHeader/></w:trPr>${colonnes.map((c, i) => cellule({ texte: c.titre }, c, ws[i], CLAIR, true, true)).join("")}</w:tr>`);
  }
  lignes.forEach((l, j) => {
    const st = styles[j] ?? "normal";
    rows.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${l.map((c, i) => cellule(c, colonnes[i], ws[i], st !== "normal" ? CLAIR : i === 0 && fondPremiere ? fondPremiere : null, st !== "normal", false)).join("")}</w:tr>`);
  });
  return `<w:tbl><w:tblPr><w:tblW w:w="${LARGEUR_TW}" w:type="dxa"/>${bords}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="57" w:type="dxa"/><w:left w:w="85" w:type="dxa"/><w:bottom w:w="57" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>${para([{ t: "" }], { apres: 60 })}`;
}

function bloc(b: Bloc): string {
  switch (b.t) {
    case "entete":
      return [para([{ t: b.marque, b: true, c: NUIT, sz: 16 }], { apres: 40 }),
        ...b.lignes.map((l, i) => para([{ t: l, c: GRIS, sz: 9 }], { apres: 0, bordureBas: i === b.lignes.length - 1 ? NUIT : undefined })),
        para([{ t: "" }], { apres: 120 })].join("");
    case "titre":
      return [para([{ t: b.texte, b: true, c: NUIT, sz: 13 }], { align: "center", apres: 40 }), para([{ t: b.reference }], { align: "center", apres: 40 }),
        b.sousTitre ? para([{ t: b.sousTitre, i: true, c: GRIS }], { align: "center", apres: 160 }) : ""].join("");
    case "identification":
      return tableau([{ titre: "", largeur: 0.3 }, { titre: "", largeur: 0.7 }], b.lignes.map(([k, v]) => [{ texte: k, gras: true }, { texte: v }]), [], LIBELLE);
    case "hypotheses":
      return [para([{ t: b.titre, b: true, c: ROUGE, sz: 9 }], { avant: 60, apres: 20 }), ...b.lignes.map((l) => para([{ t: `• ${l}`, c: ROUGE, sz: 9 }], { apres: 0, puce: true })), para([{ t: "" }], { apres: 60 })].join("");
    case "section":
      return para([{ t: b.titre, b: true, c: NUIT, sz: 11 }], { avant: 160, apres: 80 });
    case "tableau":
      return tableau(b.colonnes, b.lignes, b.styles);
    case "paragraphe": {
      const st = b.style ?? "normal";
      return para([{ t: b.texte, i: st === "note", b: st === "gras", c: st === "note" ? GRIS : st === "alerte" ? ROUGE : undefined, sz: st === "note" ? 9 : undefined }]);
    }
    case "liste":
      return b.items.map((it) => para([{ t: `•\t${it}` }], { apres: 20, puce: true })).join("");
    case "signatures": {
      const col = (ls: string[]) => `<w:tc><w:tcPr><w:tcW w:w="${LARGEUR_TW / 2}" w:type="dxa"/></w:tcPr>${ls.map((l, i) => para([{ t: l, b: i === 0, c: i ? GRIS : undefined, sz: i ? 9 : undefined }], { apres: 0 })).join("")}${para([{ t: "" }], { apres: 900 })}</w:tc>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="${LARGEUR_TW}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${LARGEUR_TW / 2}"/><w:gridCol w:w="${LARGEUR_TW / 2}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${col(b.gauche)}${col(b.droite)}</w:tr></w:tbl>`;
    }
    case "bandeau":
      return [para([{ t: "" }], { apres: 0, bordureBas: NUIT }), ...b.lignes.map((l, i) => para([{ t: l, b: i === 0, c: i ? undefined : NUIT, sz: i ? 9 : 10 }], { avant: i ? 0 : 80, apres: 20 }))].join("");
  }
}

export function documentVersDocx(d: DocumentDevis, mentionPied: string): Uint8Array {
  const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;
  const corps = [
    d.brouillon ? para([{ t: "BROUILLON — sans valeur contractuelle", b: true, c: ROUGE }], { align: "center", apres: 120 }) : "",
    ...d.blocs.map(bloc),
  ].join("");
  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rIdPied"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1021" w:bottom="1134" w:left="1021" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${corps}${sect}</w:body></w:document>`;
  const champ = (instr: string) => `<w:r><w:rPr><w:color w:val="${GRIS}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="${GRIS}"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:rPr><w:color w:val="${GRIS}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="${GRIS}"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="${GRIS}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
  const pied = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ${NS}><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="D9D9D9"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${LARGEUR_TW}"/></w:tabs></w:pPr>${run({ t: `${d.piedDePage} — ${mentionPied}`, c: GRIS, sz: 8 })}${run({ t: "\tPage ", c: GRIS, sz: 8 }).replace("<w:t xml:space=\"preserve\">\t", "<w:tab/><w:t xml:space=\"preserve\">")}${champ("PAGE")}${run({ t: " / ", c: GRIS, sz: 8 })}${champ("NUMPAGES")}</w:p></w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fr-MA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdPied" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${X(`${d.titre} N° ${d.numero}`)}</dc:title><dc:creator>CITURBAREA</dc:creator><dc:description>${X(mentionPied)}</dc:description></cp:coreProperties>`;
  return creerZip([
    { nom: "[Content_Types].xml", contenu: types },
    { nom: "_rels/.rels", contenu: rels },
    { nom: "word/document.xml", contenu: document },
    { nom: "word/styles.xml", contenu: styles },
    { nom: "word/footer1.xml", contenu: pied },
    { nom: "word/_rels/document.xml.rels", contenu: docRels },
    { nom: "docProps/core.xml", contenu: core },
  ]);
}
