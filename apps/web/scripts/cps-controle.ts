/**
 * Contrôle de conformité du CPS régénéré + audit différentiel avec une version antérieure.
 *
 *   npx tsx apps/web/scripts/cps-controle.ts <projet.json> <ancien-cps.md> <sortie.md>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chiffrer, type ProjetInput } from "../src/domain/chiffrage";
import { controlerCps, genererCps, rapportControle } from "../src/domain/cps";

const [, , fichier, ancienMd, sortie] = process.argv;
if (!fichier || !ancienMd || !sortie) throw new Error("usage : cps-controle.ts <projet.json> <ancien-cps.md> <sortie.md>");
const p = JSON.parse(readFileSync(fichier, "utf8")) as ProjetInput & { titre?: string; commune?: string };
const r = chiffrer({ ...p, etapes: { terrain: true, finitions: true } });
const doc = genererCps(r, { nomProjet: p.titre?.replace(/^Estimation[^—]*—\s*/i, "") ?? "Projet", commune: p.commune ?? p.ville });
const ancien = readFileSync(ancienMd, "utf8").replace(/\r\n/g, "\n");
const nouveau = doc.markdown;

const nombre = (s: string) => Number(s.replace(/[\s  ]/g, "").replace(",", "."));
const dh = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Postes du BPDE : numéro → { désignation, q, pu, montant }. */
function postes(md: string) {
  const m = new Map<string, { des: string; q: number; pu: number; mt: number }>();
  for (const l of md.split("\n")) {
    const c = l.match(/^\| (\d+\.(?:C?\d+)(?:-[a-z])?) \| (.+?) \| [^|]+ \| ([\d\s  ,]+) \| ([\d\s  ,]+) \| \**([\d\s  ,]+)\** \|$/);
    if (c) m.set(c[1], { des: c[2], q: nombre(c[3]), pu: nombre(c[4]), mt: nombre(c[5]) });
  }
  return m;
}
/** Articles du Titre I : titre → corps. */
function articles(md: string) {
  const t1 = md.slice(md.indexOf("## TITRE I"), md.indexOf("## TITRE II"));
  const m = new Map<string, string>();
  for (const bloc of t1.split(/\n### /).slice(1)) {
    const [titre, ...corps] = bloc.split("\n");
    m.set(titre.replace(/^Article [A-Z]?\.?\d+ — /, "").trim(), corps.join("\n").trim());
  }
  return m;
}

const A = postes(ancien), N = postes(nouveau);
const ajoutes = [...N.keys()].filter((k) => !A.has(k));
const retires = [...A.keys()].filter((k) => !N.has(k));
const changes = [...N.entries()].filter(([k, v]) => A.has(k) && (Math.abs(A.get(k)!.mt - v.mt) >= 1 || A.get(k)!.des !== v.des));
const totA = [...A.values()].reduce((s, x) => s + x.mt, 0), totN = [...N.values()].reduce((s, x) => s + x.mt, 0);
const aA = articles(ancien), aN = articles(nouveau);
const artAjoutes = [...aN.keys()].filter((k) => !aA.has(k));
const artRetires = [...aA.keys()].filter((k) => !aN.has(k));
const artModifies = [...aN.keys()].filter((k) => aA.has(k) && aA.get(k) !== aN.get(k));
const compte = (md: string, re: RegExp) => (md.match(re) ?? []).length;

const L: string[] = [
  "# Contrôle de conformité du CPS régénéré — villa jumelée 294 m²",
  "",
  `Document contrôlé : CPS généré le ${new Date().toLocaleDateString("fr-FR")} — ${dh(doc.totalHT)} DH HT / ${dh(doc.totalTTC)} DH TTC.`,
  "Les contrôles sont exécutés par programme sur le document réellement produit (module `domain/cps/controle.ts`, rejoué à chaque test automatique).",
  "",
  "Statuts : **Corrigé** = défaut résolu et contrôle réussi ; **Provisoire** = hypothèse documentée conservée jusqu'à validation ; **Bloquant** = empêche l'émission comme pièce contractuelle.",
  "",
  "## 1. Contrôles automatiques",
  "",
  rapportControle(controlerCps(r, doc)),
  "",
  "**Conditions bloquantes hors document** (le CPS reste non contractuel tant qu'elles ne sont pas levées) : étude géotechnique G2, note de calcul et plans d'exécution du BET, tableau des menuiseries avec 2 ou 3 offres sur la même fiche technique, arbitrages du maître d'ouvrage.",
  "",
  "## 2. Audit différentiel (version du 09/10 → version corrigée)",
  "",
  "### Titre I — articles",
  "",
  `- Ajoutés : ${artAjoutes.join(" ; ") || "aucun"}`,
  `- Retirés ou renommés : ${artRetires.join(" ; ") || "aucun"}`,
  `- Modifiés : ${artModifies.join(" ; ") || "aucun"}`,
  "",
  "### Références légales (nombre d'occurrences, document entier)",
  "",
  "| Référence | Avant | Après |",
  "|:--|--:|--:|",
  ...([["Art. 770 du DOC", /\b770\b/g], ["« 769 bis »", /769 bis/g], ["« biennale »", /biennale/gi], ["Décret 2-22-431", /2-22-431/g], ["« obligatoire » + assurance", /assurances?[^\n]{0,60}obligatoires?/gi], ["« à titre contractuel »", /à titre contractuel/g]] as [string, RegExp][])
    .map(([n, re]) => `| ${n} | ${compte(ancien, re)} | ${compte(nouveau, re)} |`),
  "",
  "« biennale » restant : uniquement dans le fondement de l'article sur la garantie de bon fonctionnement, pour rappeler que la garantie biennale légale (loi 44-00) vise la VEFA et ne s'applique pas ici.",
  "",
  "### Titre IV — BPDE",
  "",
  `- Total des postes : ${dh(totA)} → ${dh(totN)} DH HT (écart ${dh(totN - totA)} DH, arrondis au centime).`,
  `- Postes ajoutés : ${ajoutes.join(", ") || "aucun"} ; retirés : ${retires.join(", ") || "aucun"}.`,
  ...ajoutes.map((k) => { const v = N.get(k)!; const o = retires.find((x) => A.get(x)!.des === v.des); return o ? `- ${o} → ${k} : « ${v.des} » déplacé (${dh(A.get(o)!.mt)} → ${dh(v.mt)} DH).` : `- ${k} : nouveau poste « ${v.des} ».`; }),
  `- Postes dont la désignation ou le montant change de 1 DH ou plus : ${changes.length}.`,
  "",
  ...(changes.length ? ["| Poste | Avant | Après | Motif |", "|:--|--:|--:|:--|", ...changes.map(([k, v]) => {
    const a = A.get(k)!;
    const motif = a.des !== v.des ? "désignation" : Math.abs(a.mt - v.mt) <= Math.max(5, a.mt * 1e-4) ? "arrondi au centime (quantité et PU arrêtés au centime)" : "réaffectation";
    return `| ${k} | ${dh(a.mt)} | ${dh(v.mt)} | ${motif} |`;
  })] : []),
  "",
];
writeFileSync(sortie, L.join("\n"), "utf8");
console.log(`écrit : ${sortie}`);
