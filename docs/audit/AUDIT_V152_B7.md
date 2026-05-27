# Audit final — V152-B7 (pré-backoffice)

Date: 2026-02-24

## 1) Résumé exécutif

**Statut global:** base **structurellement solide** pour démarrer le back-office, avec 2 réserves à traiter dès l’installation locale (node_modules + HTML embarqué landing V4).

- **Routes canon (B1):** OK — `/, /login, /p1, /p1/packs, /p1/dossier, /_dev/routes`.
- **Unknown routes (code → routeRegistry):** **0** (après correction du générateur).
- **Orphan routes (canon):** **0** (les « unused » restants sont des alias/redirects uniquement).
- **Append-only case events:** OK — repository + events + audit log présents.

## 2) Routes / navigation (0 orpheline / 0 inconnue)

### Canon
- `/` landing générale
- `/login`
- `/p1`
- `/p1/packs`
- `/p1/dossier`
- `/_dev/routes`

### Redirect aliases (legacy)
Les routes non-canon sont déclarées uniquement pour rediriger (pas de pages fantômes).

### Audit automatique
- Fichier: `apps/web/src/application/routeAudit.generated.ts`
- Génération: `apps/web/scripts/generate-route-audit.mjs` (prédev/prébuild)

**Correction appliquée:** le script détecte désormais les routes dans les *template literals* (ex: `navigate(`/p1/dossier?case=${id}`)`), ce qui supprimait un faux-positif d’orphelin.

## 3) Boutons morts / CTA

### Diagnostic
Le script détecte des patterns à risque (ex: `href="#"`, `onclick="..."`) principalement dans `LandingV4.tsx`.

### Interprétation
- **Ce ne sont pas des « boutons morts »** si l’action déclenche un comportement (ex: `soon(...)`, WhatsApp, navigation interne).
- En revanche, **ces CTA sont codés dans du HTML injecté** (voir section 4) — c’est la vraie réserve.

## 4) Zéro HTML vivant externe — réserve

Dans `apps/web/src/ui/landing/LandingV4.tsx`:
- Usage de `dangerouslySetInnerHTML` et de blocs HTML contenant des `onclick="..."`.

**Conformité mémo:**
- ✅ aucun fichier `.html` externe n’est utilisé.
- ⚠️ mais il existe du **HTML embarqué** (string HTML + handlers inline). C’est stable visuellement, mais moins « industriel ».

**Recommandation (sans toucher au visuel):**
- Geler visuel avec snapshot (Playwright ou capture DOM).
- Migrer progressivement ce HTML vers JSX/React events (même DOM, mêmes classes).

## 5) Scroll parasite

- P1: pas de `scrollIntoView` / `window.scrollTo` automatique.
- LandingV4: `scrollIntoView({behavior:"smooth"})` existe pour navigation interne (user action) — acceptable si voulu.

## 6) Outillage (tests/lint)

Dans cet environnement, `eslint` et `vitest` échouent car `node_modules` inclus dans le ZIP est **incohérent**.

**Action obligatoire sur ta machine avant toute itération back-office:**
1. Supprimer `node_modules` à la racine.
2. Utiliser Node **LTS** (idéalement 20.x) + npm récent.
3. Refaire une install propre: `npm install` (ou `npm ci` si lock).
4. Lancer:
   - `npm run tome:check`
   - `npm --workspace apps/web run dev`
   - `npm --workspace apps/web run build`
   - `npm --workspace apps/web run lint`
   - `npm --workspace apps/web run test`

## 7) Préparation back-office (conseil de solidité)

Avant de coder le desktop:
- Extraire les abstractions **CaseRepository + storage keys + audit** dans un package partagé (ex: `packages/core-storage`) pour éviter duplication web/desktop.
- Maintenir le principe append-only (event log) comme source de vérité.

