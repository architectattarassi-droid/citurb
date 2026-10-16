#!/usr/bin/env node
/**
 * Génère docs/sql/materiaux-referentiel-amorcage.sql : les codes du catalogue
 * statique (apps/web/src/domain/materiaux/catalogue.ts) recopiés dans la table
 * "MateriauReferentiel" (INSERT … ON CONFLICT DO NOTHING : idempotent, ne touche
 * jamais les codes créés en modération CIT-<PFX>-9NN).
 *
 * Le site lit déjà ces codes depuis le code (functions/_lib/catalogue.ts,
 * referentiel()) : la copie en base sert aux requêtes SQL du back-office, aux
 * jointures (produits, carnet des matériaux) et aux contrôles. Le catalogue du
 * code reste la source de vérité ; relancer ce script après toute évolution.
 *
 * Usage : node scripts/sql-referentiel-materiaux.mjs   (puis node scripts/sql-neon.mjs)
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(RACINE, "docs/sql/materiaux-referentiel-amorcage.sql");
const TMP = path.join(RACINE, "node_modules/.cache/catalogue-materiaux.mjs");

await build({
  stdin: { contents: `export { CATALOGUE, CATALOGUE_VERSION } from "./apps/web/src/domain/materiaux/catalogue.ts";`, resolveDir: RACINE, loader: "ts" },
  bundle: true, format: "esm", platform: "node", outfile: TMP, logLevel: "error",
});
const { CATALOGUE, CATALOGUE_VERSION } = await import(pathToFileURL(TMP).href);

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const tab = (l) => `ARRAY[${l.map(q).join(", ")}]::text[]`;
const lignes = CATALOGUE.filter((r) => r.actif !== false).map((r) =>
  `  (${q(r.code)}, ${q(r.libelle)}, ${q(r.categorie)}, ${q(r.famille)}, ${q(r.uniteRef)}, ${q(r.parent ?? null)}, ${tab(r.lots)}, TRUE, 'catalogue ${CATALOGUE_VERSION}')`);

const sql = `-- Amorçage du référentiel des matériaux en base — GÉNÉRÉ par scripts/sql-referentiel-materiaux.mjs
-- depuis apps/web/src/domain/materiaux/catalogue.ts (version ${CATALOGUE_VERSION}, ${lignes.length} codes). Ne pas modifier à la main.
-- Idempotent : ON CONFLICT DO NOTHING (un code déjà présent, ou créé en modération, n'est jamais modifié).
-- Prérequis : docs/prix/sql/cercles-fiches-catalogue.sql (table "MateriauReferentiel").

INSERT INTO "MateriauReferentiel" ("code", "libelleFr", "categorie", "famille", "uniteRef", "parent", "lots", "actif", "auteur") VALUES
${lignes.join(",\n")}
ON CONFLICT ("code") DO NOTHING;
`;
fs.writeFileSync(SORTIE, sql);
console.log(`${path.relative(RACINE, SORTIE)} : ${lignes.length} codes.`);
