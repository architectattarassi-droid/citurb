// Download all uploaded files referenced in the latest snapshot
import fs from 'node:fs';
import path from 'node:path';

const BACKUPS_DIR = path.resolve('./backups');
const API_BASE = 'https://citurb-production.up.railway.app';

// Find latest snapshot
const snapshots = fs.readdirSync(BACKUPS_DIR).filter(d => /^\d{4}-\d{2}-\d{2}T/.test(d)).sort();
const latest = snapshots[snapshots.length - 1];
const snapDir = path.join(BACKUPS_DIR, latest);
const filesDir = path.join(snapDir, 'files');
fs.mkdirSync(filesDir, { recursive: true });

console.log(`📁 Backup dir: ${snapDir}`);

// Login admin to get token
async function login() {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@citurbarea.test', password: 'Admin123!' }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  const j = await r.json();
  return j.access_token;
}

const token = await login();
console.log(`🔑 Admin token obtenu`);

let okCount = 0, failCount = 0, totalBytes = 0;

// 1. Download DossierDocument files (legacy /uploads/dossiers/<storedName>)
const dossierDocs = JSON.parse(fs.readFileSync(path.join(snapDir, 'DossierDocument.json'), 'utf8'));
console.log(`\n📄 DossierDocument: ${dossierDocs.length} fichiers`);
for (const doc of dossierDocs) {
  const url = `${API_BASE}/uploads/dossiers/${doc.storedName}?_t=${token}`;
  const r = await fetch(url);
  if (!r.ok) { console.log(`  ✗ ${doc.originalName} (HTTP ${r.status})`); failCount++; continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  const safeName = `${doc.id}-${doc.originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`;
  fs.writeFileSync(path.join(filesDir, safeName), buf);
  console.log(`  ✓ ${doc.originalName.padEnd(50)} ${(buf.length / 1024).toFixed(1)} KB`);
  okCount++; totalBytes += buf.length;
}

// 2. Download SousPhaseDocument files (new /p2/dossier/:id/sous-phases/:sid/documents/:did/download)
const spDocs = JSON.parse(fs.readFileSync(path.join(snapDir, 'SousPhaseDocument.json'), 'utf8'));
const sousPhases = JSON.parse(fs.readFileSync(path.join(snapDir, 'DossierSousPhase.json'), 'utf8'));
const spById = Object.fromEntries(sousPhases.map(sp => [sp.id, sp]));

console.log(`\n📐 SousPhaseDocument: ${spDocs.length} fichiers`);
for (const doc of spDocs) {
  const sp = spById[doc.sousPhaseId];
  if (!sp) { console.log(`  ✗ ${doc.nom} (sous-phase ${doc.sousPhaseId} introuvable)`); failCount++; continue; }
  const url = `${API_BASE}/p2/dossier/${sp.dossierId}/sous-phases/${sp.id}/documents/${doc.id}/download?_t=${token}`;
  const r = await fetch(url);
  if (!r.ok) { console.log(`  ✗ ${doc.nom} (HTTP ${r.status})`); failCount++; continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  const safeName = `sp-${doc.id}-${(doc.nom || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`;
  fs.writeFileSync(path.join(filesDir, safeName), buf);
  console.log(`  ✓ ${doc.nom.padEnd(50)} ${(buf.length / 1024).toFixed(1)} KB`);
  okCount++; totalBytes += buf.length;
}

// Update manifest
const manifestPath = path.join(snapDir, '_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.files = { okCount, failCount, totalBytes, filesDir };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`\n📊 Total : ${okCount} fichiers OK · ${failCount} échecs · ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`✅ Snapshot complet sauvegardé dans : ${snapDir}`);
