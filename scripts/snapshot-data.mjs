// Manual data snapshot for safety
// Exports all Dossier, User, SousPhase, Documents to JSON files

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:BICGtaaUaIGPTTMigBMWagEEQVysneXl@roundhouse.proxy.rlwy.net:31019/railway',
    },
  },
});

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.resolve(`./backups/${ts}`);
fs.mkdirSync(outDir, { recursive: true });

async function dump(name, query) {
  try {
    const data = await query();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    const size = fs.statSync(file).size;
    console.log(`✓ ${name.padEnd(30)} ${data.length.toString().padStart(5)} rows · ${(size / 1024).toFixed(1)} KB`);
    return data.length;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    return 0;
  }
}

console.log(`\n📦 Snapshot vers ${outDir}\n`);

const counts = {};
counts.user             = await dump('User',             () => prisma.user.findMany());
counts.dossier          = await dump('Dossier',          () => prisma.dossier.findMany());
counts.dossierDocument  = await dump('DossierDocument',  () => prisma.dossierDocument.findMany());
counts.dossierSousPhase = await dump('DossierSousPhase', () => prisma.dossierSousPhase.findMany());
counts.sousPhaseDoc     = await dump('SousPhaseDocument',() => prisma.sousPhaseDocument.findMany());
counts.dossierArea      = await dump('DossierArea',      () => prisma.dossierArea.findMany());
counts.payment          = await dump('Payment',          () => prisma.payment.findMany());
counts.firm             = await dump('Firm',             () => prisma.firm.findMany());
counts.entitlement      = await dump('Entitlement',      () => prisma.entitlement.findMany());
counts.order            = await dump('Order',            () => prisma.order.findMany());
counts.phaseChat        = await dump('PhaseChat',        () => prisma.phaseChat.findMany());
counts.phaseHistorique  = await dump('PhaseHistorique',  () => prisma.phaseHistorique.findMany());
counts.dossierPhaseRecord = await dump('DossierPhaseRecord', () => prisma.dossierPhaseRecord.findMany());
counts.rokhasDossier    = await dump('RokhasDossier',    () => prisma.rokhasDossier.findMany());

const meta = {
  snapshot: ts,
  takenAt: new Date().toISOString(),
  databaseUrl: 'roundhouse.proxy.rlwy.net:31019/railway (Railway prod)',
  rowCounts: counts,
  totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
};

fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(meta, null, 2));
console.log(`\n✓ Manifest : ${path.join(outDir, '_manifest.json')}`);
console.log(`📊 Total : ${meta.totalRows} rows sauvegardés\n`);

await prisma.$disconnect();
