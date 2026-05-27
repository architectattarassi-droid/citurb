/**
 * Sprint S-SEED-ROKHAS — Injection des 223 dossiers Rokhas
 * Usage: npx ts-node --transpile-only -r tsconfig-paths/register scripts/seed-rokhas.ts
 */

import * as fs from 'fs';

const BASE_URL = 'http://localhost:4000';
const SEED_FILE = 'c:/Users/HP/Downloads/rokhas_seed_final.json';
const EMAIL = 'owner@citurbarea.local';
const PASSWORD = 'ChangeMeNow!';
const RATE_LIMIT_MS = 100;
const FAIL_THRESHOLD = 0.20; // STOP si > 20% d'échecs consécutifs

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json() as any;
  if (!data.access_token) throw new Error('No access_token in response');
  return data.access_token;
}

async function createDossier(token: string, entry: any): Promise<string | null> {
  const title = entry.consistance || entry.refRokhas || entry.typePermis || 'Dossier Rokhas';
  const res = await fetch(`${BASE_URL}/p2/dossier/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      commune: entry.commune || entry.prefecture || '',
      payload: {},
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`  createDossier ${res.status}: ${err.slice(0, 80)}`);
    return null;
  }
  const data = await res.json() as any;
  return data.dossier?.id ?? data.id ?? null;
}

async function syncRokhas(token: string, dossierId: string, entry: any): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/p2/dossier/${dossierId}/rokhas/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      refRokhas:    entry.refRokhas    || '',
      numDossier:   entry.numDossier   || '',
      typePermis:   entry.typePermis   || 'construire',
      consistance:  entry.consistance  || '',
      typeProjet:   entry.typeProjet   || '',
      niveaux:      entry.niveaux      || '',
      commune:      entry.commune      || '',
      prefecture:   entry.prefecture   || null,
      adresse:      entry.adresse      || null,
      phaseActuelle: Number(entry.phaseActuelle) || 1,
      statut:       entry.statut       || 'BROUILLON',
      surfaceTerrain: entry.surfaceTerrain  || null,
      surfaceBatie:   entry.surfaceBatie    || null,
      dateDepot:      entry.dateDepot       || null,
      dateLivraison:  entry.dateLivraison   || null,
      delaiGlobalJours: entry.delaiGlobalJours || null,
      decisionCommission: entry.decisionCommission || null,
      clientNom:  entry.clientNom  || null,
      clientCin:  entry.clientCin  || null,
      numArrete:  entry.numArrete  || null,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`  syncRokhas ${res.status}: ${err.slice(0, 80)}`);
  }
  return res.ok;
}

async function main() {
  console.log('🚀 Seed Rokhas démarré');
  console.log(`📂 Source : ${SEED_FILE}`);

  // Lit et parse le JSON
  let entries: any[];
  try {
    const raw = fs.readFileSync(SEED_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Wrapper object avec .dossiers ou array direct
    entries = Array.isArray(parsed) ? parsed : (parsed.dossiers ?? []);
  } catch (e: any) {
    console.error(`❌ Lecture fichier échouée : ${e.message}`);
    process.exit(1);
  }

  if (entries.length === 0) {
    console.error('❌ Aucune entrée trouvée dans le fichier');
    process.exit(1);
  }
  console.log(`📦 ${entries.length} entrées à injecter`);

  // Auth
  let token: string;
  try {
    token = await getToken();
    console.log('🔑 Authentifié');
  } catch (e: any) {
    console.error(`❌ Auth échouée : ${e.message}`);
    console.error('   → Vérifiez que l\'API tourne sur http://localhost:4000');
    process.exit(1);
  }

  let ok = 0, fail = 0, consecutiveFail = 0;
  const failedRefs: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const label = entry.refRokhas || `entry-${i}`;

    // Crée le dossier CITURBAREA
    const dossierId = await createDossier(token, entry);
    if (!dossierId) {
      fail++;
      consecutiveFail++;
      failedRefs.push(label);
      console.log(`❌ [${i+1}/${entries.length}] Création échouée — ${label}`);

      // STOP si > 20% d'échecs consécutifs (après 10 tentatives)
      if (i >= 10 && consecutiveFail / (i + 1) > FAIL_THRESHOLD) {
        console.error(`\n🛑 STOP : taux d'échec > 20% (${consecutiveFail}/${i+1}). Vérifiez l'API.`);
        break;
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
      continue;
    }

    // Sync Rokhas
    const synced = await syncRokhas(token, dossierId, entry);
    if (synced) {
      ok++;
      consecutiveFail = 0;
      if (ok % 10 === 0 || ok === entries.length) {
        console.log(`✅ ${ok}/${entries.length} injectés... (${fail} échecs)`);
      }
    } else {
      fail++;
      consecutiveFail++;
      failedRefs.push(`${label} (sync)`);
      console.log(`⚠️  [${i+1}/${entries.length}] Dossier créé (${dossierId.slice(0,8)}) mais sync échoué — ${label}`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ TERMINÉ : ${ok} injectés avec succès`);
  console.log(`❌ Échecs  : ${fail}`);
  if (failedRefs.length > 0 && failedRefs.length <= 20) {
    console.log(`   Refs échouées : ${failedRefs.join(', ')}`);
  }
  console.log(`${'─'.repeat(50)}`);
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
