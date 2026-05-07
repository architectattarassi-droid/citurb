/**
 * snapshot-archive.mjs
 *
 * Snapshot complet de la base Postgres organisé pour le backup GitHub.
 * Hiérarchie miroir front/back:
 *
 *   snapshots/
 *     <YYYY-MM-DD>/
 *       SUMMARY.md                  (totaux + intégrité hash chain ProbativeLog)
 *       users.json                  (table User)
 *       entitlements.json           (UserEntitlements + Order + Entitlement)
 *       incidents.json              (Incident + IncidentEvent)
 *       probative-log.json          (ProbativeLog avec hash chain)
 *       dossiers/
 *         P1/<dossierId>.json       (dossier complet + payload + relations)
 *         P2/<dossierId>.json
 *         P3/<dossierId>.json
 *         P4/<dossierId>.json
 *         P5/<dossierId>.json
 *         P6/<dossierId>.json
 *
 * Utilisation:
 *   DATABASE_URL=... node scripts/snapshot-archive.mjs
 *   → écrit dans ./snapshots/<date>/...
 *
 * Utilisé depuis GitHub Actions (.github/workflows/backup.yml) pour push
 * vers un repo backup privé.
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function dump(obj) {
  return JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const root = join("snapshots", today);
  ensureDir(root);
  ensureDir(join(root, "dossiers"));
  for (const p of ["P1", "P2", "P3", "P4", "P5", "P6"]) ensureDir(join(root, "dossiers", p));

  console.log(`📸 Snapshot ${today} → ${root}`);

  // 1. Users
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, username: true, role: true, plan: true,
      isActive: true, phoneVerifiedAt: true, createdAt: true, updatedAt: true,
    },
  });
  writeFileSync(join(root, "users.json"), dump(users));
  console.log(`  ✓ users.json (${users.length} rows)`);

  // 2. Entitlements (UserEntitlements + Order + Entitlement)
  const userEntitlements = await prisma.userEntitlements.findMany();
  const orders = await prisma.order.findMany({ include: { entitlements: true } });
  writeFileSync(join(root, "entitlements.json"), dump({ userEntitlements, orders }));
  console.log(`  ✓ entitlements.json (${userEntitlements.length} userEnt, ${orders.length} orders)`);

  // 3. Incidents + Events
  const incidents = await prisma.incident.findMany({
    include: { events: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  writeFileSync(join(root, "incidents.json"), dump(incidents));
  console.log(`  ✓ incidents.json (${incidents.length} rows)`);

  // 4. ProbativeLog (hash chain)
  const probativeLogs = await prisma.probativeLog.findMany({ orderBy: { createdAt: "asc" } });
  writeFileSync(join(root, "probative-log.json"), dump(probativeLogs));
  console.log(`  ✓ probative-log.json (${probativeLogs.length} rows)`);

  // 5. Dossiers (groupés par porte)
  const dossiers = await prisma.dossier.findMany({
    include: {
      owner: { select: { id: true, email: true, username: true, role: true } },
      documents: true,
      payments: true,
      sousPhases: { include: { documents: true } },
      phaseRecords: true,
      intervenants: true,
      messages: true,
      phaseChats: true,
      phaseReunions: true,
      phaseHistorique: true,
      rokhas: true,
      firm: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const counts = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, OTHER: 0 };
  for (const d of dossiers) {
    const porte = ["P1", "P2", "P3", "P4", "P5", "P6"].includes(d.porteType) ? d.porteType : "OTHER";
    if (porte === "OTHER") {
      ensureDir(join(root, "dossiers", "OTHER"));
    }
    writeFileSync(join(root, "dossiers", porte, `${d.id}.json`), dump(d));
    counts[porte]++;
  }
  console.log(`  ✓ dossiers/ (${dossiers.length} total: P1=${counts.P1} P2=${counts.P2} P3=${counts.P3} P4=${counts.P4} P5=${counts.P5} P6=${counts.P6}${counts.OTHER ? ` OTHER=${counts.OTHER}` : ""})`);

  // 6. SUMMARY.md
  const summary = `# Snapshot CITURBAREA — ${today}

**Généré:** ${new Date().toISOString()}

## Totaux

| Type | Count |
|---|---|
| Users | ${users.length} |
| Orders | ${orders.length} |
| User Entitlements | ${userEntitlements.length} |
| Incidents | ${incidents.length} |
| ProbativeLog entries | ${probativeLogs.length} |
| Dossiers (total) | ${dossiers.length} |

## Dossiers par porte

| Porte | Count |
|---|---|
| P1 — Particulier | ${counts.P1} |
| P2 — Promoteur | ${counts.P2} |
| P3 — MOD | ${counts.P3} |
| P4 — Foncier | ${counts.P4} |
| P5 — Rapports | ${counts.P5} |
| P6 — Prestataires | ${counts.P6} |
${counts.OTHER ? `| Autres | ${counts.OTHER} |\n` : ""}

## Intégrité ProbativeLog

${probativeLogs.length === 0 ? "Aucune entrée." : `Première: ${probativeLogs[0].createdAt}\nDernière: ${probativeLogs[probativeLogs.length - 1].createdAt}\n\nVérification de la chaîne de hash recommandée via \`apps/api\` ProbativeLogService.verifyChain().`}

## Restauration

Pour restaurer ce snapshot:

\`\`\`bash
# 1. Restaurer Postgres depuis backup Railway natif
# 2. Si non disponible, importer manuellement via:
node scripts/restore-from-snapshot.mjs --date ${today}
# (à coder si besoin — mais éviter sauf désastre majeur)
\`\`\`

## Liens

- 🏠 Front: https://citurb-web-production.up.railway.app
- 🔧 API:  https://citurb-production.up.railway.app
- 📚 Archive UI live: https://citurb-web-production.up.railway.app/cc/archive

---

*Snapshot automatique généré par GitHub Actions cron quotidien.*
`;
  writeFileSync(join(root, "SUMMARY.md"), summary);
  console.log(`  ✓ SUMMARY.md`);

  console.log(`✅ Snapshot complet ${today}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Snapshot failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
