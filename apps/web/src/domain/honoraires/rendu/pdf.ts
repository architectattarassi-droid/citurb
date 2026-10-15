/**
 * Rendu PDF d'un document (devis, puis facture) — sans dépendance, dans le
 * navigateur comme dans une Function. Polices standard PDF (Helvetica, gras,
 * italique : aucune police à embarquer ; Calibri n'est pas embarquable
 * librement, sa métrique libre « Carlito » pourra la remplacer). Charte
 * spec §5.5 : bleu nuit #1F3864, fonds #EEF1F7 / #F5F5F5, descriptifs #595959
 * italique 9 pt, alertes #C00000, Premium #7F6000, bordures #BFBFBF / #D9D9D9,
 * marges 2,0 cm haut/bas et 1,8 cm gauche/droite, A4.
 * Sortie déterministe : pas de date de création, flux non compressés.
 */
import type { Bloc, Cellule, Colonne, DocumentDevis, StyleLigne } from "../documentDevis";

// ── Polices et métriques (Adobe Helvetica, unités /1000) ─────────────────

type Police = "R" | "B" | "I";
const ASCII_R = "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584".split(",").map(Number);
const ASCII_B = "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584".split(",").map(Number);
const EXTRA_R: Record<string, number> = { "«": 556, "»": 556, "°": 400, "²": 333, "×": 584, " ": 278, "—": 1000, "–": 556, "’": 222, "‘": 222, "“": 333, "”": 333, "…": 1000, "œ": 944, "Œ": 1000, "€": 556, "·": 278, "•": 350, "ß": 611, "ç": 500, "Ç": 722 };
const EXTRA_B: Record<string, number> = { ...EXTRA_R, "’": 278, "‘": 278, "“": 500, "”": 500, "ç": 556 };

/** Unicode → octet WinAnsi (repli « ? »). */
const WINANSI_80: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};
export function normaliser(s: string): string {
  return s.replace(/−/g, "–").replace(/[‐‑]/g, "-").replace(/[  ]/g, " ").replace(/[≤]/g, "<=").replace(/[≥]/g, ">=");
}
function octet(ch: string): number {
  const c = ch.codePointAt(0) as number;
  if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) return c;
  return WINANSI_80[ch] ?? 0x3f;
}
function largeurCar(ch: string, p: Police): number {
  const c = ch.codePointAt(0) as number;
  const ascii = p === "B" ? ASCII_B : ASCII_R;
  if (c >= 32 && c <= 126) return ascii[c - 32];
  const extra = (p === "B" ? EXTRA_B : EXTRA_R)[ch];
  if (extra) return extra;
  const base = ch.normalize("NFD")[0];
  const b = base.codePointAt(0) as number;
  return b >= 32 && b <= 126 ? ascii[b - 32] : 556;
}
export function largeur(s: string, p: Police, taille: number): number {
  let w = 0;
  for (const ch of normaliser(s)) w += largeurCar(ch, p);
  return (w * taille) / 1000;
}

/** Coupe un texte en lignes de largeur maximale (mots, puis caractères si un mot déborde). */
export function couper(texte: string, p: Police, taille: number, max: number): string[] {
  const out: string[] = [];
  for (const para of normaliser(texte).split("\n")) {
    let ligne = "";
    for (const mot of para.split(" ")) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (largeur(essai, p, taille) <= max) { ligne = essai; continue; }
      if (ligne) out.push(ligne);
      if (largeur(mot, p, taille) <= max) { ligne = mot; continue; }
      let morceau = "";
      for (const ch of mot) {
        if (largeur(morceau + ch, p, taille) > max && morceau) { out.push(morceau); morceau = ch; } else morceau += ch;
      }
      ligne = morceau;
    }
    out.push(ligne);
  }
  return out;
}

// ── Page et dessin ────────────────────────────────────────────────────────

const MM = 72 / 25.4;
const L = 595.28, H = 841.89, MG = 18 * MM, MD = 18 * MM, MH = 20 * MM, MB = 20 * MM;
const LARGEUR = L - MG - MD;
const C = {
  nuit: [0x1f, 0x38, 0x64], clair: [0xee, 0xf1, 0xf7], libelle: [0xf5, 0xf5, 0xf5], gris: [0x59, 0x59, 0x59], rouge: [0xc0, 0x00, 0x00],
  or: [0x7f, 0x60, 0x00], bordExt: [0xbf, 0xbf, 0xbf], bordInt: [0xd9, 0xd9, 0xd9], noir: [0x1a, 0x1a, 0x1a], filigrane: [0xe6, 0xe6, 0xe6],
} as const;
type Couleur = readonly [number, number, number];
const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
const rgb = (c: Couleur) => c.map((x) => f3(x / 255)).join(" ");
const FONTE: Record<Police, string> = { R: "F1", B: "F2", I: "F3" };

function litteral(s: string): string {
  let out = "(";
  for (const ch of normaliser(s)) {
    const o = octet(ch);
    if (o === 0x28 || o === 0x29 || o === 0x5c) out += `\\${String.fromCharCode(o)}`;
    else out += String.fromCharCode(o);
  }
  return `${out})`;
}

class Mise {
  pages: string[][] = [];
  y = 0;
  constructor(private filigrane: boolean) { this.nouvellePage(); }
  get ops() { return this.pages[this.pages.length - 1]; }
  nouvellePage() {
    this.pages.push([]);
    this.y = H - MH;
    if (this.filigrane) {
      const a = Math.PI / 4, cos = f3(Math.cos(a)), sin = f3(Math.sin(a));
      this.ops.push(`BT /F2 90 Tf ${rgb(C.filigrane)} rg ${cos} ${sin} -${sin} ${cos} 150 230 Tm ${litteral("BROUILLON")} Tj ET`);
    }
  }
  place(h: number) { if (this.y - h < MB) this.nouvellePage(); }
  texte(x: number, y: number, s: string, p: Police, taille: number, c: Couleur = C.noir) {
    if (!s) return;
    this.ops.push(`BT /${FONTE[p]} ${f3(taille)} Tf ${rgb(c)} rg ${f3(x)} ${f3(y)} Td ${litteral(s)} Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, fond: Couleur) { this.ops.push(`${rgb(fond)} rg ${f3(x)} ${f3(y)} ${f3(w)} ${f3(h)} re f`); }
  cadre(x: number, y: number, w: number, h: number, c: Couleur, ep: number) { this.ops.push(`${rgb(c)} RG ${f3(ep)} w ${f3(x)} ${f3(y)} ${f3(w)} ${f3(h)} re S`); }
  trait(x1: number, y1: number, x2: number, y2: number, c: Couleur, ep: number) { this.ops.push(`${rgb(c)} RG ${f3(ep)} w ${f3(x1)} ${f3(y1)} m ${f3(x2)} ${f3(y2)} l S`); }
  /** Paragraphe coupé ; renvoie la hauteur consommée. */
  paragraphe(s: string, p: Police, taille: number, c: Couleur = C.noir, x = MG, max = LARGEUR, align: "gauche" | "centre" = "gauche") {
    const inter = taille * 1.3;
    for (const l of couper(s, p, taille, max)) {
      this.place(inter);
      const dx = align === "centre" ? (max - largeur(l, p, taille)) / 2 : 0;
      this.texte(x + dx, this.y - taille, l, p, taille, c);
      this.y -= inter;
    }
  }
}

// ── Tableaux ─────────────────────────────────────────────────────────────

const PAD = 4, T = 10, TS = 9;
interface Contenu { lignes: Array<{ s: string; p: Police; taille: number; c: Couleur }>; h: number; caseACocher: boolean }

function contenuCellule(cel: Cellule, col: Colonne, w: number, entete: boolean, gras: boolean): Contenu {
  const lignes: Contenu["lignes"] = [];
  const pTexte: Police = entete || cel.gras || gras ? "B" : "R";
  const couleur: Couleur = entete ? C.nuit : cel.or ? C.or : C.noir;
  const max = w - 2 * PAD - (cel.caseACocher ? 14 : 0);
  if (cel.texte) for (const s of couper(cel.texte, pTexte, T, max)) lignes.push({ s, p: pTexte, taille: T, c: couleur });
  if (cel.alerte) for (const s of couper(cel.alerte, "B", TS, max)) lignes.push({ s, p: "B", taille: TS, c: C.rouge });
  if (cel.sous) for (const s of couper(cel.sous, "I", TS, max)) lignes.push({ s, p: "I", taille: TS, c: C.gris });
  void col;
  const h = Math.max(lignes.reduce((t, l) => t + l.taille * 1.3, 0), T * 1.3) + 2 * PAD;
  return { lignes, h, caseACocher: !!cel.caseACocher };
}

function tableau(m: Mise, colonnes: Colonne[], lignes: Cellule[][], styles: StyleLigne[] = [], fondPremiereColonne?: Couleur) {
  const ws = colonnes.map((c) => c.largeur * LARGEUR);
  const avecEntete = colonnes.some((c) => c.titre);
  const dessinerLigne = (cels: Cellule[], entete: boolean, style: StyleLigne) => {
    const cont = cels.map((c, i) => contenuCellule(c, colonnes[i], ws[i], entete, style !== "normal"));
    const h = Math.max(...cont.map((c) => c.h));
    if (m.y - h < MB) { m.nouvellePage(); if (avecEntete && !entete) dessinerLigne(colonnes.map((c) => ({ texte: c.titre })), true, "normal"); }
    let x = MG;
    const haut = m.y;
    cont.forEach((c, i) => {
      const fond = entete || style !== "normal" ? C.clair : i === 0 && fondPremiereColonne ? fondPremiereColonne : null;
      if (fond) m.rect(x, haut - h, ws[i], h, fond);
      let y = haut - PAD;
      if (c.caseACocher) m.cadre(x + PAD + 1, haut - PAD - 10, 9, 9, C.noir, 0.8);
      for (const l of c.lignes) {
        const lw = largeur(l.s, l.p, l.taille);
        const al = colonnes[i].align;
        const dx = al === "droite" ? ws[i] - PAD - lw : al === "centre" ? (ws[i] - lw) / 2 : PAD + (c.caseACocher ? 14 : 0);
        m.texte(x + dx, y - l.taille, l.s, l.p, l.taille, l.c);
        y -= l.taille * 1.3;
      }
      if (i > 0) m.trait(x, haut, x, haut - h, C.bordInt, 0.5);
      x += ws[i];
    });
    m.trait(MG, haut - h, MG + LARGEUR, haut - h, C.bordInt, 0.5);
    m.cadre(MG, haut - h, LARGEUR, h, C.bordExt, 0.75);
    m.y -= h;
  };
  if (avecEntete) dessinerLigne(colonnes.map((c) => ({ texte: c.titre })), true, "normal");
  lignes.forEach((l, i) => dessinerLigne(l, false, styles[i] ?? "normal"));
  m.y -= 6;
}

// ── Blocs ────────────────────────────────────────────────────────────────

function bloc(m: Mise, b: Bloc) {
  switch (b.t) {
    case "entete":
      m.texte(MG, m.y - 16, b.marque, "B", 16, C.nuit);
      m.y -= 22;
      for (const l of b.lignes) m.paragraphe(l, "R", 9, C.gris);
      m.y -= 4;
      m.trait(MG, m.y, MG + LARGEUR, m.y, C.nuit, 1.5);
      m.y -= 14;
      break;
    case "titre":
      m.paragraphe(b.texte, "B", 13, C.nuit, MG, LARGEUR, "centre");
      m.paragraphe(b.reference, "R", 10, C.noir, MG, LARGEUR, "centre");
      if (b.sousTitre) m.paragraphe(b.sousTitre, "I", 10, C.gris, MG, LARGEUR, "centre");
      m.y -= 8;
      break;
    case "identification":
      tableau(m, [{ titre: "", largeur: 0.3 }, { titre: "", largeur: 0.7 }], b.lignes.map(([k, v]) => [{ texte: k, gras: true }, { texte: v }]), [], C.libelle);
      break;
    case "hypotheses": {
      const lignes = [b.titre, ...b.lignes.map((l) => `• ${l}`)];
      const hs = lignes.map((l, i) => couper(l, i ? "R" : "B", 9, LARGEUR - 16).length * 9 * 1.3);
      const h = hs.reduce((a, x) => a + x, 0) + 12;
      m.place(h);
      m.cadre(MG, m.y - h, LARGEUR, h, C.rouge, 1);
      m.y -= 6;
      lignes.forEach((l, i) => m.paragraphe(l, i ? "R" : "B", 9, C.rouge, MG + 8, LARGEUR - 16));
      m.y -= 12;
      break;
    }
    case "section":
      m.place(40);
      m.y -= 6;
      m.paragraphe(b.titre, "B", 11, C.nuit);
      m.y -= 3;
      break;
    case "tableau":
      tableau(m, b.colonnes, b.lignes, b.styles);
      break;
    case "paragraphe": {
      const st = b.style ?? "normal";
      m.paragraphe(b.texte, st === "note" ? "I" : st === "gras" ? "B" : "R", st === "note" ? 9 : 10, st === "note" ? C.gris : st === "alerte" ? C.rouge : C.noir);
      m.y -= 4;
      break;
    }
    case "liste":
      for (const it of b.items) {
        const lignes = couper(it, "R", 10, LARGEUR - 14);
        lignes.forEach((l, i) => {
          m.place(13);
          if (i === 0) m.texte(MG + 2, m.y - 10, "•", "R", 10);
          m.texte(MG + 14, m.y - 10, l, "R", 10);
          m.y -= 13;
        });
      }
      m.y -= 4;
      break;
    case "signatures": {
      const h = Math.max(b.gauche.length, b.droite.length) * 13 + 60;
      m.place(h);
      m.y -= 10;
      const haut = m.y, demi = LARGEUR / 2;
      b.gauche.forEach((l, i) => m.texte(MG, haut - 10 - i * 13, l, i ? "R" : "B", i ? 9 : 10, i ? C.gris : C.noir));
      b.droite.forEach((l, i) => m.texte(MG + demi + 10, haut - 10 - i * 13, l, i ? "R" : "B", i ? 9 : 10, i ? C.gris : C.noir));
      m.y = haut - h;
      break;
    }
    case "bandeau":
      m.place(60);
      m.trait(MG, m.y, MG + LARGEUR, m.y, C.nuit, 1.2);
      m.y -= 8;
      b.lignes.forEach((l, i) => m.paragraphe(l, i ? "R" : "B", i ? 9 : 10, i ? C.noir : C.nuit));
      break;
  }
}

// ── Assemblage du fichier ────────────────────────────────────────────────

export function documentVersPdf(d: DocumentDevis, mentionPied: string): Uint8Array {
  const m = new Mise(d.brouillon);
  for (const b of d.blocs) bloc(m, b);
  const n = m.pages.length;
  m.pages.forEach((ops, i) => {
    const y = MB - 22;
    const pg = `Page ${i + 1} / ${n}`;
    const texte = `${d.piedDePage} — ${mentionPied}`;
    // Texte trop long pour tenir à côté du numéro de page : coupé au besoin.
    const place = LARGEUR - largeur(pg, "R", 8) - 12;
    const affiche = largeur(texte, "R", 8) <= place ? texte : couper(texte, "R", 8, place)[0];
    ops.push(`${rgb(C.bordInt)} RG 0.5 w ${f3(MG)} ${f3(y + 12)} m ${f3(MG + LARGEUR)} ${f3(y + 12)} l S`);
    ops.push(`BT /F1 8 Tf ${rgb(C.gris)} rg ${f3(MG)} ${f3(y)} Td ${litteral(affiche)} Tj ET`);
    ops.push(`BT /F1 8 Tf ${rgb(C.gris)} rg ${f3(MG + LARGEUR - largeur(pg, "R", 8))} ${f3(y)} Td ${litteral(pg)} Tj ET`);
  });

  const objets: string[] = [];
  const ajoute = (s: string) => { objets.push(s); return objets.length; };
  const catalogue = ajoute(""), pages = ajoute("");
  const polices = (["Helvetica", "Helvetica-Bold", "Helvetica-Oblique"] as const).map((f) => ajoute(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
  const ressources = `<< /Font << /F1 ${polices[0]} 0 R /F2 ${polices[1]} 0 R /F3 ${polices[2]} 0 R >> >>`;
  const kids: number[] = [];
  for (const ops of m.pages) {
    const flux = ops.join("\n");
    const contenu = ajoute(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
    kids.push(ajoute(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${f3(L)} ${f3(H)}] /Resources ${ressources} /Contents ${contenu} 0 R >>`));
  }
  objets[catalogue - 1] = `<< /Type /Catalog /Pages ${pages} 0 R >>`;
  objets[pages - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  const info = ajoute(`<< /Title ${litteral(`${d.titre} N° ${d.numero}`)} /Producer (CITURBAREA) >>`);

  let sortie = "%PDF-1.4\n%âãÏÓ\n";
  const decalages: number[] = [];
  objets.forEach((o, i) => { decalages.push(sortie.length); sortie += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = sortie.length;
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${decalages.map((x) => `${String(x).padStart(10, "0")} 00000 n \n`).join("")}`;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const out = new Uint8Array(sortie.length);
  for (let i = 0; i < sortie.length; i++) out[i] = sortie.charCodeAt(i) & 0xff;
  return out;
}
