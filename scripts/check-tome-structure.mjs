import fs from "node:fs";
import path from "node:path";

/**
 * CITURBAREA — Tome boundary & structure guard (ops/dev-only)
 *
 * Conventions de nommage:
 * - API  : apps/api/src/tomes/tome-{N}  (avec tiret)
 * - WEB  : apps/web/src/tomes/tome{N}   (sans tiret)
 * Ce script vérifie les tomes API (avec tiret) + tome-at.
 */

const ROOT = process.cwd();

// Convention API : tome-at, tome-0 ... tome-10
const API_TOMES = [
  "tome-at",
  "tome-0",
  "tome-1",
  "tome-2",
  "tome-3",
  "tome-4",
  "tome-5",
  "tome-6",
  "tome-7",
  "tome-8",
  "tome-9",
  "tome-10",
];

// Convention WEB : tome0 ... tome8
const WEB_TOMES = [
  "tome0",
  "tome1",
  "tome2",
  "tome3",
  "tome4",
  "tome5",
  "tome6",
  "tome7",
  "tome8",
];

const TOME_ORDER = new Map(API_TOMES.map((t, i) => [t, i]));

function fail(msg) {
  console.error(`\n[TOME-CHECK] FAIL: ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[TOME-CHECK] OK: ${msg}`);
}

function exists(p) {
  return fs.existsSync(p);
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fp));
    else out.push(fp);
  }
  return out;
}

// ── 1) Vérification des dossiers API ─────────────────────────────────────────
const API_SRC = path.join(ROOT, "apps", "api", "src", "tomes");
if (!exists(API_SRC)) fail(`apps/api/src/tomes not found at ${API_SRC}`);

for (const t of API_TOMES) {
  const p = path.join(API_SRC, t);
  if (!exists(p)) fail(`[API] Missing tome folder: ${p}`);
  const idx = path.join(p, "index.ts");
  if (!exists(idx)) fail(`[API] Missing barrel index.ts for ${t}: ${idx}`);
}
ok("API — All tome folders + index.ts barrels present");

// ── 2) Vérification des dossiers WEB ─────────────────────────────────────────
const WEB_SRC = path.join(ROOT, "apps", "web", "src", "tomes");
if (exists(WEB_SRC)) {
  for (const t of WEB_TOMES) {
    const p = path.join(WEB_SRC, t);
    if (!exists(p)) fail(`[WEB] Missing tome folder: ${p}`);
    const idx = path.join(p, "index.ts");
    if (!exists(idx)) fail(`[WEB] Missing barrel index.ts for ${t}: ${idx}`);
  }
  ok("WEB — All tome folders + index.ts barrels present");
} else {
  console.log("[TOME-CHECK] SKIP: apps/web/src/tomes not found (non bloquant)");
}

// ── 3) Heuristique direction d'import (API uniquement) ───────────────────────
const files = listFiles(API_SRC).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

function tomeOfFile(fp) {
  const rel = fp.replace(API_SRC + path.sep, "");
  const seg = rel.split(path.sep)[0];
  return TOME_ORDER.has(seg) ? seg : null;
}

const importRe = /from\s+["'](.+?)["']/g;

for (const fp of files) {
  const t = tomeOfFile(fp);
  if (!t) continue;
  const code = fs.readFileSync(fp, "utf8");
  let m;
  while ((m = importRe.exec(code))) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue;

    const abs = path.normalize(path.join(path.dirname(fp), spec));
    const targetTome =
      tomeOfFile(abs) ??
      tomeOfFile(abs + ".ts") ??
      tomeOfFile(path.join(abs, "index.ts"));

    if (!targetTome) continue;

    const fromOrder = TOME_ORDER.get(t);
    const toOrder = TOME_ORDER.get(targetTome);
    // Defensive: should never be null because we guard with TOME_ORDER.has()
    if (fromOrder == null || toOrder == null) continue;

    if (fromOrder < toOrder) {
      fail(
        `Forbidden import direction: ${t} cannot import ${targetTome}\n  in ${fp}\n  import ${spec}`
      );
    }
  }
}

ok("Import direction heuristic passed");
console.log("\n[TOME-CHECK] SUCCESS\n");
