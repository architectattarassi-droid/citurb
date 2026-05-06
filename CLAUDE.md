# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run docker:up          # Start PostgreSQL (required first)
npm run dev                # Start API (:4000) + Web (:5173) concurrently
npm run dev:api            # API only
npm run dev:web            # Web only

# Build & lint
npm run build              # Build API + Web
npm run lint               # Lint API + Web
npm run lint:api
npm run lint:web

# Tests
npm run test               # API + Web
npm --prefix apps/web run test:machine   # Single web test (state machine)

# Tome integrity check (runs automatically before dev)
npm run tome:check

# Prisma
npm run prisma:generate    # Regenerate client (both schemas)
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # DB browser

# Geo seed (required for geo data)
npm run seed:geo
```

**API** runs with `ts-node-dev` (hot reload). `prestart:dev` auto-runs `prisma:generate` for both schemas.

**Web** runs a route-audit script (`scripts/generate-route-audit.mjs`) before every dev/build.

## Architecture

### Monorepo layout

```
apps/
  api/          NestJS, port 4000
  web/          Vite + React + Tailwind, port 5173
  backoffice-desktop/
  ops/
packages/
  contracts/    Shared TypeScript types, RuleIDs, API contracts
  config/       Shared config
prisma/
  schema.prisma         Main schema (users, entitlements, geo…)
  dossiers/schema.prisma  Dossier schema (separate Prisma client)
docs/
  tomes/MAP.md          Canonical tome map (human reference)
  rules/registry.yml    Executable rule registry (ops-only)
  doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md
```

### Tome hierarchy (API: `apps/api/src/tomes/`)

Tomes are the core architectural unit. **A tome may only import downward — never upward.**

| Tome | Dir | Role |
|------|-----|------|
| `@` | `tome-at` | Kernel constitutionnel: errors, incidents, probative logs, registry, alerting |
| `0` | `tome-0` | Constitution système: data governance, geo core, datalake, ingest |
| `1` | `tome-1` | Gouvernance & économie: paiement → entitlements, scope lock, EC-freeze |
| `2` | `tome-2` | Portes P1..P6: périmètres, anti-désintermédiation, anti-export |
| `3` | `tome-3` | State machine & verrous L1..L7: permissions, transitions, PMS |
| `4` | `tome-4` | Wiring exécutable: controllers, jobs, storage, stripe, orchestration |
| `5–10` | `tome-5…tome-10` | Extension packs: IA agents, media, connecteurs institutionnels |

`npm run tome:check` (runs automatically on `npm run dev`) enforces this import direction.

### Web tomes (`apps/web/src/tomes/`)

Web uses `tome0`–`tome8` (no hyphens, no `tome-at`):

| Tome | Purpose |
|------|---------|
| `tome0` | Fondations (types, constants, config) |
| `tome1` | Routing + layouts + navigation |
| `tome2` | UI system (components, design tokens) |
| `tome3` | Portals P1–P6 (pages/flows) |
| `tome4` | Data layer client (API client, queries) |
| `tome5` | Auth/RBAC/Entitlements (front stubs) |
| `tome6` | Workflows dossiers + state orchestration |
| `tome7` | Translation of rules to UI (checklists, validations) |
| `tome8` | Registry + traceability (RuleID → impl) |

### Global middleware (applied in `main.ts`)

- `GlobalExceptionFilter` — redacts internal refs from public responses; logs incidents
- `TomeMetaInterceptor` — enforces tome metadata on responses
- `MutationGateGuard` — every mutation must pass through the Tome @ orchestrator pipeline

### Two Prisma schemas

The API uses two separate Prisma clients/schemas:
- `prisma/schema.prisma` → main client (`PrismaService`)
- `prisma/dossiers/schema.prisma` → dossiers client (`PrismaDossiersService`)

Both must be generated: `npm run prisma:generate` covers both via `prestart:dev`.

### Doctrine rules

Rules are defined in `docs/rules/registry.yml` with the structure:
`rule_id → tome → module → enforcement → db → tests`

Key rules:
- **T@-R-TRACE-001**: Public responses must be redacted; incidents logged (never leak `rule_id`, `tome_ref`, `error_code`)
- **T@-META-005**: All mutations must go through the Tome @ orchestrator
- **T@-R-CONTRACT-001**: Every endpoint must declare its tome and pass the tome-chain

When debugging: `incident_id` → `rule_id` → `registry.yml` → `module/enforcement` → tome file.

### Production / Railway

- API serves the compiled web SPA (static files from `apps/web/dist`) at runtime
- API prefixes (`/p2`, `/auth`, `/health`, `/firms`, `/api`, `/uploads`) bypass SPA fallback
- Port configured via `PORT` env var (defaults to 4000)

### Six portes (P1–P6) — endpoints publics (sans auth)

Toutes les portes ont un wizard frontend + endpoint pricing public. Toutes
soumettent via `/p2/intake` (porteType discriminant) qui auto-crée user CLIENT
+ Dossier owned, fire owner-notify SMS+email.

| Porte | Pricing | Endpoint(s) clés |
|-------|---------|------------------|
| **P1** Particulier | 5% × budget × pack ratio | `POST /p1/packs/quote` (auth), 3 packs ESSENTIEL/AVANCE/COMPLET |
| **P2** Promoteur | 5% × surface × coût barème CNOA | `GET /p2/categories?section=`, `POST /p2/quote`, 5 sections (IMM/GR/LOT/EPIG/AMG) |
| **P3** MOD délégué | 10% × coût réalisation | `GET /p3/corps-metiers` (40+ corps Maroc), `POST /p3/quote` |
| **P4** Foncier | 0.3% / 0.6% / 1% × prix vente | `GET /p4/packs`, `POST /p4/quote`, 3 packs BASIQUE/MOYEN/RENTABILITE |
| **P5** Rapports | Forfait × surface × délai | `GET /p5/reports`, `POST /p5/quote`, 4 types rapports |
| **P6** Prestataires | Score L7 (0-100) | `GET /p6/types`, `GET /p6/classes-btp`, `GET /p6/categories-agrement`, `POST /p6/scoring`, `GET /p6/catalog/search`, `*/p6/suppliers/:id/catalog` |

### Tome 1 — Doctrine paiement & validation

- `PackValidationService` — workflow `PENDING_PAYMENT` → `PAYMENT_RECEIVED` → `PENDING_ADMIN_VALIDATION` → `ACTIVATED` (ou `REVOKED`). Stocké dans `Dossier.payload.packValidation`.
- `PackValidationController` — `/api/cc/pack-validation/{pending,:id,:id/mark-paid,:id/validate,:id/revoke}`
- `StripeWebhookController` — `POST /webhooks/stripe` (DIY HMAC verify, anti-replay 5 min)
- `StripeCheckoutController` — `POST /api/payment/checkout-session/:dossierId` (auth, Stripe REST API sans lib npm)
- `UniversalContractService` — génère HTML imprimable contrats P3/P4/P5/P6 (P2 a son propre service)
- Env vars requises: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_WEB_URL`

### Tome 2 — Anti-désintermédiation

- `AntiDesintService` — cron `0 2 * * *` Africa/Casablanca, scanne `DossierMessage` 24h
- Patterns: emails, téléphones Maroc, URLs, WhatsApp/Telegram/Signal, paiement direct, RDV physique, mots "contourner"/"hors plateforme"
- Détection → `Incident DISINTERMEDIATION_RISK` + flag dans `Dossier.payload.antiDesintFlags`
- Escalation: ≥3 flags HIGH sur 7j → incident CRITICAL + notif owner
- Endpoint admin scan ad-hoc: `POST /api/cc/anti-desint/scan?days=N`

### Tome 7 — Compliance

- `IncidentsService` — vraies rows `Incident` + `IncidentEvent` en DB (auparavant placeholder no-op)
- `ProbativeLogService` — append-only avec hash chain SHA-256 (chaque entrée: `hash(prevHash + payload)`)
- `GlobalExceptionFilter` — registered via `APP_FILTER` token pour DI inject `IncidentsService`
- `ReportRendererService` — rapports P4/P5 watermarqués "Rapport exclusif CITURBAREA"
- `ReportController` — `GET /:porte/dossiers/:id/rapport` gated sur `packValidation.status === ACTIVATED` (sinon 402 paywall)
- `SupplierCatalogService` — CRUD catalogue matériaux fournisseurs P6 (16 catégories, 8 unités)
- `P6ReviewController` — `/api/cc/p6-review/{pending,:id,:id/verify,:id/blacklist,:id/needs-docs}`

### Stack guards/middleware (ordre)

1. `MutationGateGuard` (global) — bloque toute mutation hors allow-list. Allow-list contient: `/webhooks`, `/auth`, `/health`, `/api/cc`, `/api/payment`, `/p1`–`/p6`, `/tomes/tome-at/orchestrator`
2. `TomeMetaInterceptor` (global) — exige `@Tome("tomeN")` sur chaque controller
3. `JwtAuthGuard` (route-level) — auth JWT
4. `RolesGuard` (route-level) — `@Roles("ADMIN","OWNER","OPS","CLIENT")`
5. `CapsGuard` — entitlements fine-grained (rare)
6. `GlobalExceptionFilter` (registered via `APP_FILTER`, DI-injected) — capture `DomainError` → persiste Incident + ProbativeLog → réponse redactée

### Backoffice CC (`apps/web/src/command-center/`)

- `/cc/dashboard` — Dashboard
- `/cc/leads` — Pipeline leads (table + drawer + status changer + notes timeline)
- `/cc/validations` — **Module centralisé**: tab "Packs" (à activer) + tab "Prestataires P6" (à vérifier/blacklister)
- `/cc/dossiers` — Liste dossiers
- `/cc/dossiers/:id/shadow` — **Shadow view** admin: voit ce que voit le client + sidebar admin avec blocs:
  - Validation Pack (Tome 1)
  - Rapport watermarqué (P4/P5 uniquement)
  - Contrat type CNOA (P2 uniquement)
  - Contrat universel (P3/P4/P5/P6)
  - Visa CROA (P2)
  - Force statut + Note OPS + Unblock + Métadonnées
