# CITURBAREA — Documentation (VS Code)

- Doctrine (source de vérité): `docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`
- Registre des règles: `docs/rules/registry.yml`
- Data Geo Maroc: `data/geo/maroc/README.md`

## Rappel doctrinal
- Public: **incident_id uniquement**
- Ops: incident_id → rule_id + tome_ref + error_code + sources + contexte
- Correction: localiser module via `docs/rules/registry.yml` (rule_id → module/enforcement → fichiers)
