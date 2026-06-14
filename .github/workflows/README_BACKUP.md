# Backups CITURBAREA — manuel d'utilisation

Le repo a **2 workflows de backup complémentaires**, qui couvrent deux besoins
différents et ne se remplacent pas.

| Workflow | Cible | Format | Stockage | Reprise après désastre |
|---|---|---|---|---|
| [`backup.yml`](./backup.yml) | snapshot JSON par dossier (data métier) | `.json` lisible | repo GitHub privé `BACKUP_REPO` | navigation manuelle, recherche par dossier |
| [`backup-db.yml`](./backup-db.yml) | **dump Postgres binaire complet** | `.dump` (format custom) | artifact GitHub Actions (rétention 90 j) | **restoration intégrale via `pg_restore`** |

Ce README documente le workflow `backup-db.yml` (le nouveau, pour recovery DB).

---

## Quand ça tourne

- **Automatique** : chaque jour à **03:00 heure Maroc** (= 02:00 UTC, cron `0 2 * * *`).
- **Manuel** : onglet **Actions → Backup DB (pg_dump) → Run workflow**.
  Indiquer optionnellement une raison (qui apparaît dans les logs).

## Configuration UNE FOIS (action Yassine)

1. **Créer le secret `PROD_DATABASE_URL`**
   - Settings → Secrets and variables → Actions → New repository secret
   - Nom : `PROD_DATABASE_URL`
   - Valeur : l'URL **PUBLIQUE** Railway (commence par `postgresql://...@viaduct.proxy.rlwy.net:PORT/railway` ou équivalent — **pas** `.railway.internal` qui n'est accessible que depuis Railway).
   - Pour récupérer l'URL publique : Railway → service Postgres → onglet Variables → `DATABASE_PUBLIC_URL` ou exposer le port.
2. **Lancer le workflow manuellement une fois** (étape ci-dessus) pour valider l'enchaînement et constater qu'un artifact est bien produit.
3. **Tester une restauration au moins une fois** (procédure ci-dessous). Un backup jamais restauré n'est pas un backup prouvé.

## Récupérer un dump

1. Onglet **Actions** → workflow **Backup DB (pg_dump)**.
2. Cliquer sur un run (par défaut le plus récent du jour).
3. Section **Artifacts** en bas → cliquer `citurb-db-backup-YYYY-MM-DD` → fichier `.zip` téléchargé.
4. Dézipper → un fichier `citurb_prod_YYYYMMDD_HHMMSS.dump`.

## Restaurer un dump (procédure)

⚠️ **Sur une instance de test d'abord**, jamais directement sur la prod sauf urgence absolue documentée.

### Vers une base PostgreSQL locale (recommandé pour tester)

```bash
# 1. Créer une base vide cible
createdb citurb_restore_test

# 2. Restaurer (--clean drop les tables avant ; --if-exists évite les erreurs si tables absentes)
pg_restore \
  --no-owner \
  --no-privileges \
  --clean --if-exists \
  --dbname=citurb_restore_test \
  citurb_prod_YYYYMMDD_HHMMSS.dump

# 3. Vérifier (les nombres doivent correspondre à la prod du jour du dump)
psql -d citurb_restore_test -c '
  SELECT
    (SELECT COUNT(*) FROM "Dossier")              AS dossiers,
    (SELECT COUNT(*) FROM "DossierPhaseRecord")   AS phase_records,
    (SELECT COUNT(*) FROM "User")                 AS users;
'
```

### Vers une base Railway (urgence — disaster recovery)

```bash
# 1. Récupérer l'URL d'une instance Postgres NEUVE sur Railway (pas l'ancienne).
# 2. Restaurer directement depuis l'URL :
pg_restore \
  --no-owner \
  --no-privileges \
  --clean --if-exists \
  --dbname="postgresql://...@nouvelle-instance/railway" \
  citurb_prod_YYYYMMDD_HHMMSS.dump

# 3. Mettre à jour DATABASE_URL côté apps Railway pour pointer sur la nouvelle instance.
```

## Garde-fous intégrés

- Si `pg_dump` produit un fichier vide ou < 1 KB → le job **échoue** (GitHub envoie une notification).
- Avant upload, `pg_restore --list` valide que l'en-tête est lisible et que la TOC contient ≥ 10 entrées (sinon échec).
- L'URL DB est passée en **variable d'environnement**, jamais en argv, jamais en `echo`.

## Phase 2 — push optionnel vers bucket externe

Aujourd'hui les dumps vivent uniquement sur GitHub (artifact 90 j).
Si on veut une copie hors GitHub (Cloudflare R2 ou Google Drive), voir le **bloc commenté à la fin de `backup-db.yml`**. Activation = décommenter + ajouter les secrets correspondants. Non urgent.

## Rétention

- **Artifact GitHub** : 90 jours puis purge automatique.
- Si tu veux garder un dump plus longtemps : télécharger l'artifact manuellement avant J+90 et le stocker ailleurs.

## Rappel d'hygiène

> **Un backup jamais restauré n'est pas un backup prouvé.**

Réaliser la procédure de restauration ci-dessus une fois par trimestre (vers une base locale jetable) garantit que le pipeline fonctionne réellement le jour où on en a besoin.
