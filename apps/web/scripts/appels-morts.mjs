#!/usr/bin/env node
/**
 * Analyse statique des appels réseau du front (apps/web/src) et confrontation
 * aux routes réellement servies par les Cloudflare Pages Functions (functions/).
 *
 * L'API NestJS (apps/api) est éteinte : tout appel vers une route absente de
 * functions/ est un « appel mort ». Le test apps/web/src/lib/appels-morts.test.ts
 * échoue si leur nombre augmente par rapport à docs/architecture/appels-morts.json
 * (cliquet : on le fait baisser à chaque rebranchement, jamais monter).
 *
 * Usage :
 *   node apps/web/scripts/appels-morts.mjs            → résumé par fichier
 *   node apps/web/scripts/appels-morts.mjs --detail   → fichier:ligne → route
 *   node apps/web/scripts/appels-morts.mjs --write    → met à jour le cliquet
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = fileURLToPath(new URL(".", import.meta.url));
export const RACINE = join(ICI, "..", "..", "..");
const SRC = join(RACINE, "apps", "web", "src");
const FUNCTIONS = join(RACINE, "functions");
export const CLIQUET = join(RACINE, "docs", "architecture", "appels-morts.json");

/** Préfixes qui désignent un back-end (et non une page de la SPA). */
const PREFIXES_API = /^\/(api|auth|p[1-6]|firms|dossier|webhooks|uploads|tomes|health)(\/|$|\?)/;

function lister(dir, filtre, acc = []) {
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom);
    if (statSync(p).isDirectory()) {
      if (nom === "node_modules" || nom === "dist") continue;
      lister(p, filtre, acc);
    } else if (filtre(p)) acc.push(p);
  }
  return acc;
}

/** Routes servies : functions/api/cc/leads/[id].ts → ["api","cc","leads",":"] */
export function routesVivantes() {
  return lister(FUNCTIONS, (p) => /\.(ts|js)$/.test(p))
    .map((p) => relative(FUNCTIONS, p).split(sep).join("/").replace(/\.(ts|js)$/, ""))
    .filter((r) => !r.split("/").some((s) => s.startsWith("_")))
    .map((r) => r.replace(/\/?index$/, ""))
    .map((r) => r.split("/").filter(Boolean).map((s) => (/^\[\[.+\]\]$/.test(s) ? "**" : /^\[.+\]$/.test(s) ? ":" : s)));
}

/** Lit un littéral (chaîne ou gabarit) à partir de l'index du guillemet ouvrant. */
function lireLitteral(code, i) {
  const q = code[i];
  let out = "";
  let j = i + 1;
  while (j < code.length && code[j] !== q) {
    if (code[j] === "\\") { out += code[j + 1] ?? ""; j += 2; continue; }
    if (q === "`" && code[j] === "$" && code[j + 1] === "{") {
      let prof = 1; j += 2;
      while (j < code.length && prof > 0) {
        if (code[j] === "{") prof++;
        else if (code[j] === "}") prof--;
        j++;
      }
      out += "\u0000"; // marqueur d'expression
      continue;
    }
    out += code[j++];
  }
  return out;
}

/** Normalise un chemin extrait : retire la base, la requête, et marque les segments dynamiques. */
export function normaliser(brut) {
  let s = brut.replace(/^\u0000+/, ""); // ${API_BASE}/api/... → /api/...
  if (/^https?:\/\//.test(s)) {
    try { s = new URL(s.replace(/\u0000/g, "X")).pathname; } catch { return null; }
  }
  s = s.split(/[?#]/)[0];
  if (!PREFIXES_API.test(s)) return null;
  const segs = s.split("/").filter(Boolean).map((seg) => (seg.includes("\u0000") ? ":" : seg));
  return "/" + segs.join("/");
}

function correspond(segs, route) {
  for (let i = 0; i < route.length; i++) {
    if (route[i] === "**") return true;
    if (i >= segs.length) return false;
    if (route[i] === ":" || segs[i] === ":") continue;
    if (route[i] !== segs[i]) return false;
  }
  return segs.length === route.length;
}

export function estVivante(chemin, routes = routesVivantes()) {
  const segs = chemin.split("/").filter(Boolean);
  return routes.some((r) => correspond(segs, r));
}

/** Contextes considérés comme un appel réseau. */
const APPEL = /\b(apiFetch|fetch|request|xhr\.open|\.open|sendBeacon|EventSource|WebSocket|api\.(get|post|put|patch|delete))\s*(<[^()]*?>)?\s*\(\s*(["'`]|[A-Z_a-z.]+\s*\+\s*["'`])/g;
const BASE = /\b(API_BASE|API_ORIGIN|apiBase\(\)|VITE_API_URL|apiUrl|API_URL|BASE_URL)\b/;

export function analyser() {
  const routes = routesVivantes();
  const fichiers = lister(SRC, (p) => /\.(ts|tsx)$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p) && !p.endsWith("routeAudit.generated.ts"));
  const appels = [];
  for (const f of fichiers) {
    const code = readFileSync(f, "utf8");
    const vus = new Set();
    const ajouter = (idx, brut) => {
      const chemin = normaliser(brut);
      if (!chemin || vus.has(idx)) return;
      vus.add(idx);
      const ligne = code.slice(0, idx).split("\n").length;
      appels.push({ fichier: relative(SRC, f).split(sep).join("/"), ligne, chemin, vivante: estVivante(chemin, routes) });
    };
    // 1) littéral passé directement à un appel réseau
    for (const m of code.matchAll(APPEL)) {
      const q = m.index + m[0].length - 1;
      ajouter(q, lireLitteral(code, q));
    }
    // 2) littéral préfixé par une base d'API (const url = `${API_BASE}/api/...`)
    for (const m of code.matchAll(/`\$\{\s*([^}]*)\}\s*(\/[^`]*)`|`(\/[^`]*)`|"(\/[^"\n]*)"|'(\/[^'\n]*)'/g)) {
      const debutLigne = code.lastIndexOf("\n", m.index) + 1;
      const ligne = code.slice(debutLigne, code.indexOf("\n", m.index) === -1 ? undefined : code.indexOf("\n", m.index));
      const avecBase = m[1] !== undefined && BASE.test(m[1]);
      const ligneBase = BASE.test(ligne) || /\b(url|endpoint)\s*[:=]/i.test(ligne);
      if (!avecBase && !ligneBase) continue;
      ajouter(m.index, lireLitteral(code, m.index));
    }
  }
  appels.sort((a, b) => a.fichier.localeCompare(b.fichier) || a.ligne - b.ligne);
  const morts = appels.filter((a) => !a.vivante);
  return { total: appels.length, vivants: appels.length - morts.length, morts };
}

export function parFichier(morts) {
  const m = {};
  for (const a of morts) m[a.fichier] = (m[a.fichier] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = analyser();
  if (process.argv.includes("--write")) {
    writeFileSync(CLIQUET, JSON.stringify({
      _doc: "Cliquet des appels du front vers des routes absentes de functions/ (API NestJS éteinte). Ne doit que baisser : node apps/web/scripts/appels-morts.mjs --write après un rebranchement.",
      total: r.morts.length,
      parFichier: parFichier(r.morts),
    }, null, 2) + "\n");
  }
  if (process.argv.includes("--detail")) for (const a of r.morts) console.log(`${a.fichier}:${a.ligne} → ${a.chemin}`);
  else for (const [f, n] of Object.entries(parFichier(r.morts))) console.log(String(n).padStart(4), f);
  console.log(`\n${r.total} appels, ${r.vivants} vivants, ${r.morts.length} morts`);
}
