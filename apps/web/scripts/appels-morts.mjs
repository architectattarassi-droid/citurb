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
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = fileURLToPath(new URL(".", import.meta.url));
export const RACINE = join(ICI, "..", "..", "..");
const SRC = join(RACINE, "apps", "web", "src");
const FUNCTIONS = join(RACINE, "functions");
export const CLIQUET = join(RACINE, "docs", "architecture", "appels-morts.json");

/** Préfixes qui désignent un back-end (et non une page de la SPA). */
const PREFIXES_API = /^\/(api|admin|auth|p[1-6]|firms|dossier|webhooks|uploads|tomes|health)(\/|$|\?)/;

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
/**
 * Constantes de chemin d'un fichier : const BASE = "/api/x" ; const base = (id) => `/api/x/${id}`.
 * Permet de résoudre `${BASE}/corpus` et `${base(id)}/tasks`.
 */
function constantesDe(code) {
  const m = new Map();
  for (const x of code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(?:\([^()]*\)\s*(?::\s*string\s*)?=>\s*)?(["'`])/g)) {
    const val = lireLitteral(code, x.index + x[0].length - 1, m);
    if (val.startsWith("/")) m.set(x[1], val);
  }
  return m;
}

function lireLitteral(code, i, consts = new Map()) {
  const q = code[i];
  let out = "";
  let j = i + 1;
  while (j < code.length && code[j] !== q) {
    if (code[j] === "\\") { out += code[j + 1] ?? ""; j += 2; continue; }
    if (q === "`" && code[j] === "$" && code[j + 1] === "{") {
      let prof = 1; j += 2;
      const debut = j;
      while (j < code.length && prof > 0) {
        if (code[j] === "{") prof++;
        else if (code[j] === "}") prof--;
        j++;
      }
      // ${BASE} ou ${base(id)} en tête : remplacé par la constante du fichier.
      const nom = /^([A-Za-z_$][\w$]*)(\s*\([^()]*\))?$/.exec(code.slice(debut, j - 1).trim())?.[1];
      out += nom && out === "" && consts.has(nom) ? consts.get(nom) : "\u0000"; // marqueur d'expression
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
const NON_RESEAU = new Set([
  "navigate", "nav", "goTo", "go_to", "encodeURIComponent", "encodeURI", "Navigate", "redirect", "Redirect", "push", "replace", "replaceState", "pushState", "assign", "go", "open",
  "startsWith", "endsWith", "includes", "indexOf", "test", "match", "matchPath", "useMatch", "split", "concat", "join",
  "t", "tVanilla", "set", "has", "add", "delete", "log", "warn", "error", "info", "debug", "poserLien", "lienWhatsApp",
  "estVivante", "normaliser", "href", "to", "it", "describe", "expect", "toBe", "toContain",
]);
const BASE =/\b(API_BASE|API_ORIGIN|apiBase\(\)|VITE_API_URL|apiUrl|API_URL|BASE_URL)\b/;

/** Fichiers atteignables depuis main.tsx (imports statiques, dynamiques, ré-exports). */
export function atteignables() {
  const vus = new Set();
  const pile = [join(SRC, "main.tsx")];
  const resoudre = (de, spec) => {
    const base = resolve(dirname(de), spec);
    for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
      try { if (statSync(c).isFile()) return c; } catch { /* suivant */ }
    }
    return null;
  };
  while (pile.length) {
    const f = pile.pop();
    if (vus.has(f)) continue;
    vus.add(f);
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const code = readFileSync(f, "utf8");
    for (const m of code.matchAll(/(?:import|export)\s[^'";]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g)) {
      if (/^(import|export) type\s/.test(m[0])) continue; // import de types : rien à l'exécution
      const spec = m[1] || m[2] || m[3];
      if (!spec.startsWith(".")) continue;
      const cible = resoudre(f, spec);
      if (cible && cible.startsWith(SRC)) pile.push(cible);
    }
  }
  return new Set([...vus].map((f) => relative(SRC, f).split(sep).join("/")));
}

export function analyser() {
  const routes = routesVivantes();
  const fichiers = lister(SRC, (p) => /\.(ts|tsx)$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p) && !p.endsWith("routeAudit.generated.ts"));
  const appels = [];
  for (const f of fichiers) {
    const code = readFileSync(f, "utf8");
    const consts = constantesDe(code);
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
      ajouter(q, lireLitteral(code, q, consts));
    }
    // 1 bis) littéral passé à un helper local (authGet("/api/…"), appel(`/api/cc/…`)) :
    // tout appel de fonction, sauf navigation SPA et méthodes de chaîne.
    for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\s*(<[^()]*?>)?\s*\(\s*(["'`])\//g)) {
      if (NON_RESEAU.has(m[1])) continue;
      const q = m.index + m[0].length - 2;
      ajouter(q, lireLitteral(code, q, consts));
    }
    // 1 ter) constante passée telle quelle : apiFetch(BASE, { method: "POST" })
    for (const m of code.matchAll(/\b(apiFetch|fetch)\s*(<[^()]*?>)?\s*\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) {
      if (consts.has(m[3])) ajouter(m.index, consts.get(m[3]));
    }
    // 2) littéral préfixé par une base d'API (const url = `${API_BASE}/api/...`)
    for (const m of code.matchAll(/`\$\{\s*([^}]*)\}\s*(\/[^`]*)`|`(\/[^`]*)`|"(\/[^"\n]*)"|'(\/[^'\n]*)'/g)) {
      const debutLigne = code.lastIndexOf("\n", m.index) + 1;
      const ligne = code.slice(debutLigne, code.indexOf("\n", m.index) === -1 ? undefined : code.indexOf("\n", m.index));
      const avecBase = m[1] !== undefined && BASE.test(m[1]);
      const ligneBase = BASE.test(ligne) || /\b(url|endpoint)\s*[:=]/i.test(ligne);
      if (!avecBase && !ligneBase) continue;
      ajouter(m.index, lireLitteral(code, m.index, consts));
    }
  }
  appels.sort((a, b) => a.fichier.localeCompare(b.fichier) || a.ligne - b.ligne);
  const morts = appels.filter((a) => !a.vivante);
  const graphe = atteignables();
  for (const a of morts) a.atteignable = graphe.has(a.fichier);
  return { total: appels.length, vivants: appels.length - morts.length, morts, atteignables: morts.filter((a) => a.atteignable) };
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
      _doc: "Cliquet des appels du front vers des routes absentes de functions/ (API NestJS éteinte). total = dans le code source ; atteignables = dans un fichier importé depuis main.tsx (donc livré aux visiteurs). Ne doit que baisser : node apps/web/scripts/appels-morts.mjs --write après un rebranchement.",
      total: r.morts.length,
      atteignables: r.atteignables.length,
      parFichier: parFichier(r.morts),
      atteignablesParFichier: parFichier(r.atteignables),
    }, null, 2) + "\n");
  }
  if (process.argv.includes("--detail")) for (const a of r.morts) console.log(`${a.atteignable ? "!" : " "} ${a.fichier}:${a.ligne} → ${a.chemin}`);
  else if (process.argv.includes("--atteignables")) for (const [f, n] of Object.entries(parFichier(r.atteignables))) console.log(String(n).padStart(4), f);
  else for (const [f, n] of Object.entries(parFichier(r.morts))) console.log(String(n).padStart(4), f);
  console.log(`\n${r.total} appels, ${r.vivants} vivants, ${r.morts.length} morts, dont ${r.atteignables.length} atteignables depuis main.tsx`);
}
