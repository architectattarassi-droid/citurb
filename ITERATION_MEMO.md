# CITURBAREA V1.30 — P0_FIXED_V4

## Fixes appliqués (P0 bloquants résolus)

### 1. scripts/check-tome-structure.mjs — corrigé
- Convention API : `tome-at`, `tome-0` … `tome-10` (avec tirets)
- Convention WEB : `tome0` … `tome8` (sans tirets)
- Les deux répertoires vérifiés séparément
- `npm run tome:check` passe ✓

### 2. apps/api/src/tomes/tome-{0..10}/index.ts — créés (11 fichiers)
- Barrel exports canoniques pour chaque tome API
- Exigé par check-tome-structure.mjs

### 3. apps/api/src/app.module.ts — corrigé
- `Tome6Module` et `Tome7Module` maintenant dans `imports[]`
- `HealthModule` ajouté (GET /health)
- `AppController` / `AppService` supprimés (fichiers n'existent pas)

### 4. apps/api/src/main.ts — corrigé
- `MutationGateGuard` enregistré globalement (`app.useGlobalGuards`)
- Doctrine T@-META-005 appliquée

### 5. apps/api/src/tomes/tome-5/auth/auth.service.ts — corrigé
- Toutes features = `false` par défaut (doctrine : une porte à la fois)
- `ensureOwner` crée l'OWNER avec toutes features = `true`
- `ensureEntitlements` → `initEntitlements` (ne s'appelle plus au login)
- `enableFeature(userId, featureKey)` : appelé par admin après validation ActivationRequest

### 6. apps/web/src/tomes/tome1/router/routes.tsx — corrigé
- Route `/media` ajoutée sous `RequireAuth`
- Commentaires doctrinaux ajoutés

### 7. Stubs supprimés
- `apps/api/src/tomes/_stub_tome-5__to_delete/` → supprimé
- `apps/api/src/tomes/_stub_tome-9__to_delete/` → supprimé

## Résultat attendu

```
npm run tome:check
[TOME-CHECK] OK: API — All tome folders + index.ts barrels present
[TOME-CHECK] OK: WEB — All tome folders + index.ts barrels present
[TOME-CHECK] OK: Import direction heuristic passed
[TOME-CHECK] SUCCESS

npm run dev  → API sur :4000, Web sur :5173
```

## Héritage ITER10 (inchangé)

Backend P2 Dossier persisted (Prisma):
- enum DossierStatus, model Dossier, model DossierArea
- P2 controller : create / list / get / submit
- caps enforced : dossier:create, dossier:read, dossier:submit

Routes P2:
- GET  /p2/status
- GET  /p2/dossier
- GET  /p2/dossier/:id
- POST /p2/dossier/create
- POST /p2/dossier/submit

## Prochaines étapes (P0 restants → V1 GO)

1. Modèle ActivationRequest (PENDING → admin valide → porte active)
2. Gate entitlement avant create dossier (Tome 2)
3. State machine E0→E1→E2 + StateHistory alimenté (Tome 3)
4. Seed geo : `npm run seed:geo`
5. Smoke tests : 10 cas (auth / media / porte PENDING / dossier gated)
