# CITURBAREA

Plateforme intégrée d'orchestration architecturale et urbanistique au Maroc.

🌍 **Documentation multilingue** : [Français](README.md) · [English](README.en.md) · [العربية](README.ar.md)

---

## Vue d'ensemble

CITURBAREA fédère 6 portes d'entrée (P1–P6) couvrant tout le cycle d'un projet bâti au Maroc :

| Porte | Profil | Tarification |
|-------|--------|--------------|
| **P1** | Particulier (villa, R+n) | 5% × budget × ratio pack |
| **P2** | Promoteur immobilier | Barème CNOA 2021 (5 sections) |
| **P3** | Maîtrise d'ouvrage déléguée | 10% × coût réalisation |
| **P4** | Investisseur foncier | 0,3% / 0,6% / 1% × prix vente |
| **P5** | Rapports & expertises | Forfait × surface × délai |
| **P6** | Entreprises & fournisseurs | Score L7 (classes BTP, agréments) |

## Démarrage rapide

```bash
npm run docker:up          # Démarrer PostgreSQL
npm run dev                # API (:4000) + Web (:5173)
```

Accès :
- Web : http://localhost:5173
- API : http://localhost:4000
- Health : http://localhost:4000/health

📖 Guide détaillé : [QUICKSTART.md](./QUICKSTART.md)

## Architecture

```
apps/
  api/              NestJS (port 4000)
  web/              Vite + React + Tailwind (port 5173)
  desktop/          Electron (portal + backoffice + doc)
  backoffice-desktop/
  ops/
packages/
  contracts/        Types partagés
  config/
prisma/
  schema.prisma           Schéma principal (users, entitlements, geo)
  dossiers/schema.prisma  Schéma dossiers (Prisma client séparé)
docs/
  tomes/MAP.md            Carte canonique des tomes
  rules/registry.yml      Registre exécutable des règles
  doctrine/               Doctrine maître
```

### Hiérarchie des tomes (API)

| Tome | Rôle |
|------|------|
| `@`  | Kernel constitutionnel (incidents, logs probants, registre) |
| `0`  | Constitution système (gouvernance données, géo, datalake) |
| `1`  | Gouvernance & économie (paiement, entitlements, scope-lock) |
| `2`  | Portes P1..P6, anti-désintermédiation |
| `3`  | Machine à états & verrous L1..L7 |
| `4`  | Wiring exécutable (controllers, jobs, Stripe) |
| `5–10` | Extension packs (IA, médias, connecteurs institutionnels) |

**Règle d'or** : un tome n'importe que vers le bas. `npm run tome:check` enforce ce sens d'import.

## Trilinguisme

L'application complète (front + back + docs) est disponible en 🇫🇷 Français, 🇬🇧 English et 🇲🇦 العربية. Le sélecteur de langue est présent sur toutes les pages publiques et sur la documentation.

- Front : [`apps/web/src/i18n/i18n.tsx`](./apps/web/src/i18n/i18n.tsx) — `I18nProvider`, `useT()`, `useLang()`
- Switcher : [`apps/web/src/i18n/LangSwitcher.tsx`](./apps/web/src/i18n/LangSwitcher.tsx)
- Persistance : `localStorage('citurbarea.lang')`, RTL automatique pour l'arabe

## Apps Desktop

Trois variantes Electron unifiées dans [`apps/desktop`](./apps/desktop) :

```bash
npm --prefix apps/desktop run start:portal       # Portail client
npm --prefix apps/desktop run start:backoffice   # Backoffice CC admin
npm --prefix apps/desktop run start:doc          # Documentation
```

Build Windows :
```bash
npm --prefix apps/desktop run build:all   # 3 .exe (portal + backoffice + doc)
```

## Doctrine

- Réponses publiques redactées : jamais de `rule_id`, `tome_ref`, `error_code`. Seul `incident_id` est public.
- Toute mutation passe par l'orchestrateur Tome @ (`MutationGateGuard`).
- Anti-désintermédiation : batch nuit (`0 2 * * *` Africa/Casablanca) + escalation ≥3 flags HIGH/7j.
- Pack validé uniquement par l'admin (workflow `PENDING_PAYMENT` → `PAYMENT_RECEIVED` → `PENDING_ADMIN_VALIDATION` → `ACTIVATED`).
- Sauvegardes : Postgres (L1) + Archive UI (L2) + GitHub backup nuit (L3).

## Repères

- Doctrine maître : [`docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`](./docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md)
- Carte des tomes : [`docs/tomes/MAP.md`](./docs/tomes/MAP.md)
- Racine canonique : [`CANONICAL_ROOT.md`](./CANONICAL_ROOT.md)
- Web tome map : [`apps/web/src/TOME_MAP.ts`](./apps/web/src/TOME_MAP.ts)
