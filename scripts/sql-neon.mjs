// Assemble docs/sql/TOUT-NEON.sql à partir de la liste ordonnée de
// docs/sql/A-COLLER-DANS-NEON.md (lignes numérotées « N. `chemin.sql` »).
// Usage : node scripts/sql-neon.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const liste = readFileSync("docs/sql/A-COLLER-DANS-NEON.md", "utf8");
const fichiers = [...liste.matchAll(/^\d+\.\s+`([^`]+\.sql)`/gm)].map((m) => m[1]);
const manquants = fichiers.filter((f) => !existsSync(f));
if (manquants.length) {
  console.error("Fichiers introuvables :", manquants.join(", "));
  process.exit(1);
}

const morceaux = fichiers.map((f) => {
  const sql = readFileSync(f, "utf8").replace(/\r\n/g, "\n").trimEnd();
  return `-- ═════ ${f} ═════\n${sql}\n`;
});
const entete = [
  "-- CITURBAREA — tout le SQL Neon en un seul collage (généré, ne pas éditer).",
  "-- Source : docs/sql/A-COLLER-DANS-NEON.md · régénérer : node scripts/sql-neon.mjs",
  "-- Rejouable sans risque : n'efface ni ne modifie aucune donnée existante.",
  "",
].join("\n");
writeFileSync("docs/sql/TOUT-NEON.sql", entete + morceaux.join("\n"));
console.log(`docs/sql/TOUT-NEON.sql : ${fichiers.length} fichiers assemblés.`);
