# 🛡️ Système de backup CITURBAREA

## ⚠️ Règle d'or — ZÉRO PERTE

**TOUJOURS** prendre un snapshot AVANT toute opération destructive :
- Modification du schéma Prisma
- Migration DB (`prisma db push` / `migrate deploy`)
- Test de mass-deletion
- Rebuild complet du Volume Railway

## 📦 Faire un snapshot manuel

```bash
# Snapshot complet (DB + fichiers)
$env:DATABASE_URL = "postgresql://postgres:BICGtaaUaIGPTTMigBMWagEEQVysneXl@roundhouse.proxy.rlwy.net:31019/railway"
npm run snapshot

# Ou séparément
npm run snapshot:db        # Tables Postgres → JSON
npm run snapshot:files     # Fichiers physiques → ./files/
```

Le snapshot va dans `./backups/<timestamp>/` :
- `User.json`, `Dossier.json`, ... (toutes les tables)
- `_manifest.json` (résumé)
- `files/<id>-<filename>` (fichiers téléchargés depuis Railway Volume)

## 🔄 Restauration (en cas de catastrophe)

### Restaurer la DB

```js
// Lire les JSON puis recréer via Prisma
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
const dossiers = JSON.parse(fs.readFileSync('./backups/<ts>/Dossier.json'));
for (const d of dossiers) await prisma.dossier.upsert({ where: { id: d.id }, create: d, update: d });
```

### Restaurer les fichiers

Re-upload les fichiers via les endpoints API en se basant sur les records DB.

## 📅 Snapshots automatiques

| Quand | Quoi | Comment |
|-------|------|---------|
| **Avant chaque migration** | Snapshot DB | Manuel (`npm run snapshot:db`) avant `prisma db push` |
| **Daily** | Postgres | Auto via Railway (visible onglet "Backups" du service Postgres) |
| **Avant deploy critique** | DB + fichiers | Manuel (`npm run snapshot`) |
| **Hebdo** | DB + fichiers | À faire manuellement, garder en local + cloud user |

## 🔐 Stockage des snapshots

Les snapshots sont sauvegardés **localement** dans `./backups/`. Ce dossier doit être :
- ✅ Synchronisé sur **Google Drive / OneDrive** (côté utilisateur, manuel)
- ❌ **JAMAIS** committé dans git (mots de passe / données client)

`./backups/` est dans `.gitignore`.

## 🚫 Opérations interdites

- ❌ `prisma db push --force-reset`
- ❌ `prisma migrate reset`
- ❌ `DROP TABLE` direct via psql
- ❌ Détacher / supprimer le volume Railway sans snapshot fichiers

Si l'opération est vraiment nécessaire, prendre le snapshot d'abord, **vérifier qu'il a réussi** (`_manifest.json` montre le bon nombre de rows), puis seulement procéder.
