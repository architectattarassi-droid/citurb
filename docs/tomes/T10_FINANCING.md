# Tome 10 — Financing & Bank Broker (P1-first)

## But
Déclencher un **volet financement** au bon moment économique pour le client P1:
- **après** paiement et livraison d'un **plan** (type ou personnalisé)
- **avant** d'attendre l'autorisation

Le client commence à raisonner **coût / capacité / crédit** dès qu'il a un plan et une vision.

## Principes
- **T1**: paiement/entitlements = source de vérité (aucun financement sans plan payé)
- **T3**: state machine & guards décident l'accès au financement
- **T0**: DataLake/DataProduct = données brutes jamais exposées; dossier bancaire = pack privé + résumé redacted

## Phases P1 concernées
- `P1_PH_COST_ESTIMATE`
- `P1_PH_FINANCING_PREQUAL`
- `P1_PH_BANK_DOSSIER`

## Entitlements (repères)
- `FINANCING_PREQUAL`
- `FINANCING_DOSSIER`

## API (stubs)
- `GET /t10/financing/projects/:projectId/eligibility`
- `POST /t10/financing/projects/:projectId/prequal`
- `POST /t10/financing/projects/:projectId/dossier`

## TODO d'intégration (V1→V1.1)
- Brancher Prisma models: `FinancingProfile`, `BankPartner`, `BankDossier`, `BrokerMargin`
- Passer par `OrchestratorService` + guards L1→L7 (pas de mutation directe)
- Storage: PDF + pièces dans S3/MinIO, liens signés côté OPS
- Conformité: consentement explicite + journal probatoire
