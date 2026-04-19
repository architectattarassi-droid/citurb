# Tome @ — Kernel

Ce dossier est le **repère** du noyau constitutionnel.

**Règle d’or :** on ne déplace rien ici tant que le monorepo tourne. On pointe vers l’existant, puis on migre module par module quand c’est stable.

## Ce que Tome @ gouverne
- Erreurs redacted + `incident_id`
- Incident Engine (Incident + NotificationDelivery)
- ProbativeLog append-only
- Rule registry (RuleID -> module/enforcement)

## Où est le code aujourd’hui
- `src/modules/kernel/*` (implémentation)

## Convention
- Nouveau code : d’abord ici (`tomes/tome-at/...`), puis importé par `AppModule`.
- Code existant : référencé via `index.ts` (barrels) pour garder une navigation « par tome ».
