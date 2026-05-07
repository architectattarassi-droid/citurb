# CITURBAREA

Integrated platform for architectural and urban-planning orchestration in Morocco.

🌍 **Multilingual documentation**: [Français](README.md) · [English](README.en.md) · [العربية](README.ar.md)

---

## Overview

CITURBAREA federates 6 entry doors (P1–P6) covering the full lifecycle of a built project in Morocco:

| Door | Profile | Pricing |
|------|---------|---------|
| **P1** | Individual (villa, R+n) | 5% × budget × pack ratio |
| **P2** | Real-estate developer | CNOA 2021 schedule (5 sections) |
| **P3** | Delegated project management | 10% × construction cost |
| **P4** | Land investor | 0.3% / 0.6% / 1% × sale price |
| **P5** | Reports & expert opinions | Flat-rate × area × deadline |
| **P6** | Companies & suppliers | L7 score (BTP class, accreditations) |

## Quick start

```bash
npm run docker:up          # Start PostgreSQL
npm run dev                # API (:4000) + Web (:5173)
```

Access:
- Web: http://localhost:5173
- API: http://localhost:4000
- Health: http://localhost:4000/health

📖 Full guide: [QUICKSTART.md](./QUICKSTART.md)

## Architecture

```
apps/
  api/              NestJS (port 4000)
  web/              Vite + React + Tailwind (port 5173)
  desktop/          Electron (portal + backoffice + doc)
  backoffice-desktop/
  ops/
packages/
  contracts/        Shared types
  config/
prisma/
  schema.prisma           Main schema (users, entitlements, geo)
  dossiers/schema.prisma  Dossier schema (separate Prisma client)
docs/
  tomes/MAP.md            Canonical tome map
  rules/registry.yml      Executable rule registry
  doctrine/               Master doctrine
```

### Tome hierarchy (API)

| Tome | Role |
|------|------|
| `@`  | Constitutional kernel (incidents, probative logs, registry) |
| `0`  | System constitution (data governance, geo, datalake) |
| `1`  | Governance & economics (payment, entitlements, scope-lock) |
| `2`  | Doors P1..P6, anti-disintermediation |
| `3`  | State machine & locks L1..L7 |
| `4`  | Executable wiring (controllers, jobs, Stripe) |
| `5–10` | Extension packs (AI, media, institutional connectors) |

**Golden rule**: a tome may only import downward. `npm run tome:check` enforces this.

## Multilingualism

The whole application (front + back + docs) is available in 🇫🇷 French, 🇬🇧 English and 🇲🇦 العربية. The language switcher is present on every public page and in the documentation.

- Front: [`apps/web/src/i18n/i18n.tsx`](./apps/web/src/i18n/i18n.tsx) — `I18nProvider`, `useT()`, `useLang()`
- Switcher: [`apps/web/src/i18n/LangSwitcher.tsx`](./apps/web/src/i18n/LangSwitcher.tsx)
- Persistence: `localStorage('citurbarea.lang')`, automatic RTL for Arabic

## Desktop apps

Three Electron variants unified in [`apps/desktop`](./apps/desktop):

```bash
npm --prefix apps/desktop run start:portal       # Client portal
npm --prefix apps/desktop run start:backoffice   # Admin command center
npm --prefix apps/desktop run start:doc          # Documentation
```

Windows build:
```bash
npm --prefix apps/desktop run build:all   # 3 .exe (portal + backoffice + doc)
```

## Doctrine

- Public responses are redacted: never expose `rule_id`, `tome_ref`, `error_code`. Only `incident_id` is public.
- Every mutation goes through the Tome @ orchestrator (`MutationGateGuard`).
- Anti-disintermediation: nightly batch (`0 2 * * *` Africa/Casablanca) + escalation when ≥3 HIGH flags / 7 days.
- Pack activation requires admin validation (workflow `PENDING_PAYMENT` → `PAYMENT_RECEIVED` → `PENDING_ADMIN_VALIDATION` → `ACTIVATED`).
- Backups: Postgres (L1) + Archive UI (L2) + nightly GitHub backup (L3).

## Reference points

- Master doctrine: [`docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`](./docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md)
- Tome map: [`docs/tomes/MAP.md`](./docs/tomes/MAP.md)
- Canonical root: [`CANONICAL_ROOT.md`](./CANONICAL_ROOT.md)
- Web tome map: [`apps/web/src/TOME_MAP.ts`](./apps/web/src/TOME_MAP.ts)
