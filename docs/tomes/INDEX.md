# CITURBAREA — Repère par Tome

Ce dossier est le **repère** pour naviguer dans le code ET dans la doctrine.

- Doctrine master (source de vérité): `DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`

## Mapping rapide

| Tome | Code (API) | Rôle |
|------|------------|------|
| Tome @ | `apps/api/src/tomes/tome_at/` | Kernel, opposabilité, incidents, guards META |
| Tome 0 | `apps/api/src/tomes/tome0/` | DataLake/DataProduct, GeoCore, Cost/BIM/Entity/PMI ingestion |
| Tome 1 | `apps/api/src/tomes/tome1/` | Gouvernance, paiement/entitlements, scope, EC-Freeze |
| Tome 2 | `apps/api/src/tomes/tome2/` | Portes P1→P6, permissions par porte, anti-export, anti-désintermédiation |
| Tome 3 | `apps/api/src/tomes/tome3/` | StateMachine E0→E12, L1→L7 guards, PMS |
| Tome 4 | `apps/api/src/tomes/tome4/` | Wiring technique, monorepo, modules, contracts |
| Tome 5 | `apps/api/src/tomes/tome5/` | Front office (tunnel client) — **state-driven** |
| Tome 6 | `apps/api/src/tomes/tome6/` | Sécurité anti-capture, anti-copy, anti-exfiltration |
| Tome 7 | `apps/api/src/tomes/tome7/` | Compliance & monetisation (redaction, rate limits, audit exports) |
| Tome 8 | `apps/api/src/tomes/tome8/` | Agents IA: orchestration, prompts, evals, tests |
| Tome 9 | `apps/api/src/tomes/tome9/` | Observabilité: ops console, dashboards, alerting |
| Tome 10 | `apps/api/src/tomes/tome-10/` | Financement & courtage technique (P1-first): préqual + dossier bancaire + partenaires |

> Principe: un fichier de code qui implémente une règle doit être rattaché à un Tome, et taggé via `@Tome()` + `@Rule()`.
