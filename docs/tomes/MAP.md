# CITURBAREA — Carte des Tomes (repère unique)

Ce dossier est le **repère** humain. Le code, lui, est structuré par tomes dans `apps/api/src/`.

## Qui fait quoi (règle simple)

- **Tome @ (`tome-at`)** : kernel constitutionnel (errors/incident/redaction/logs probatoires/registry/alerting). Rien ne le dépasse.
- **Tome 0 (`tome-0`)** : constitution système (data governance, geo core, datalake/dataproduct, ingest pipelines).
- **Tome 1 (`tome-1`)** : gouvernance & économie (paiement→entitlements, scope lock, EC-freeze, cycles).
- **Tome 2 (`tome-2`)** : portes P1..P6 (périmètres, anti-désintermédiation, anti-export).
- **Tome 3 (`tome-3`)** : state machine & verrous L1..L7 (permissions, transitions, PMS).
- **Tome 4 (`tome-4`)** : wiring exécutable (controllers, jobs, storage, stripe, orchestration).
- **Tomes 5→9** : extension packs (agents IA, media, connecteurs institutionnels, etc.) — **toujours** branchés via Kernel + Orchestrator.

## Règle d’import

Un tome ne peut importer que **vers le bas** (ex: Tome 3 peut importer Tome 2,1,0,@). Jamais l’inverse.
Le script `npm run tome:check` vérifie cette contrainte.

## Où est la doctrine

- Texte maître : `docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`
- Registry exécutable : `docs/rules/registry.yml`
- Contrats partagés : `packages/contracts`

---

Si tu veux comprendre rapidement un bug : pars de l’`incident_id` → `rule_id` → `registry.yml` → `module/enforcement` → fichier tome.
