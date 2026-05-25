# TOME 5 — Materials Catalog (catalogue prix matériaux BTP Maroc)

Module de référentiel prix matériaux pour CITURBAREA.
Sert à : estimer un devis P3/P5 sans saisie manuelle, comparer prix devis vs marché
(anomaly detection), publier l'indice CITURBAREA simplifié.

## Architecture

- **Pas de modèle Prisma** : le catalog et les snapshots prix sont stockés en JSON
  statique dans `apps/api/data/materials/`. Future migration possible vers une
  table `MaterialPriceSnapshot` (chained par month).
- **Pas de dépendance externe** (BullMQ, Redis…). Tout est in-memory au boot.
- **TomeMetaInterceptor** : chaque endpoint porte `@Tome("tome5")` + `@Rule("T5-MAT-…")`.
- **MutationGateGuard** : `/api/materials` ajouté à l'allow-list (cf. `apps/api/src/common/guards/mutation-gate.guard.ts`).

## Branchement backend (déjà fait)

- `apps/api/src/tomes/tome-5/tome-5.module.ts` importe `MaterialsCatalogModule`.
- `apps/api/src/tomes/tome-5/index.ts` réexporte le service et les types.
- L'AppModule importe déjà `Tome5Module` (cf. `apps/api/src/app.module.ts`), donc
  rien à modifier au niveau racine.

## Branchement frontend (déjà fait)

- `apps/web/src/tomes/tome1/router/routes.tsx` expose :
  - `/materiaux` → `MaterialsCatalogPage` (browser principal)
  - `/materiaux/:code` → `MaterialDetail` (détail + graphique + comparateur)

## Endpoints publics

| Verbe | Route                                                    | Description                              |
|-------|----------------------------------------------------------|------------------------------------------|
| GET   | `/api/materials/meta`                                    | méta (version, snapshot YYYY-MM, currency) |
| GET   | `/api/materials/catalog`                                 | catalog complet + categories + regions     |
| GET   | `/api/materials/catalog?category=ciment`                 | filtré par catégorie                      |
| GET   | `/api/materials/catalog?region=04_RABAT_SALE_KENITRA`    | prix régionalisés                        |
| GET   | `/api/materials/catalog/search?q=ciment&region=…`        | recherche fuzzy                          |
| GET   | `/api/materials/categories`                              | liste 13 catégories                      |
| GET   | `/api/materials/regions`                                 | liste 12 régions HCP                     |
| GET   | `/api/materials/index/citurbarea?region=…`               | indice CITURBAREA gros œuvre (base 100)  |
| GET   | `/api/materials/:code`                                   | détail matériau (specs, normes, marques) |
| GET   | `/api/materials/:code/prices?region=…`                   | prix actuel                              |
| GET   | `/api/materials/:code/prices/history?months=12`          | historique 12 mois (synthétique)         |
| POST  | `/api/materials/:code/observation`                       | observation prix utilisateur (anonyme)   |

Réponses CDN-friendly : header `Cache-Control: public, max-age=3600` sur les routes lecture.

## Catalog actuel

- **80 matériaux réels** couvrant les 13 catégories TPHI (ciment, acier, granulats,
  béton, maçonnerie, étanchéité, enduits, peinture, menuiserie alu, menuiserie bois,
  sanitaire, électrique, revêtement).
- **12 régions HCP** avec facteur multiplicateur régional (Casablanca-Settat = 1.0,
  Dakhla = 1.28, etc.).
- Prix en MAD HT (TVA 20% applicable).
- Sources annotées : Mercuriale TGR, catalogues fournisseurs (Sonasid, LafargeHolcim,
  Sika, Roca, Schneider…), observations marché.

## Mise à jour mensuelle du catalog

Procédure manuelle (MVP) :

1. Dupliquer `apps/api/data/materials/prices-2026-05.json` en
   `prices-YYYY-MM.json`.
2. Mettre à jour les prix moyens à partir des sources (TGR, devis collectés,
   observations utilisateurs).
3. Modifier `materials-catalog.service.ts::load()` pour pointer vers le nouveau
   fichier (variable `pricesPath`).
4. Redémarrer l'API.

Future itération : route admin protégée `POST /api/cc/materials/snapshot/import`
qui accepte un upload JSON et persiste en DB (modèle Prisma `MaterialPriceSnapshot`).

## Indice CITURBAREA simplifié

Pondération gros œuvre (mai 2026) :
- Ciment CPJ 45 : 30%
- Acier HA Fe E500-3 Ø12 : 30%
- Gravette 5/15 : 15%
- Béton C25/30 : 25%

Base 100 = panier national au facteur régional 1.0 (Casablanca-Settat).
Variation affichée : `indice - 100` en points.

## Tests à effectuer

```bash
# Boot API + Web
npm run dev

# Vérifier endpoints
curl http://localhost:4000/api/materials/meta
curl http://localhost:4000/api/materials/catalog?category=ciment
curl http://localhost:4000/api/materials/CIMENT_CPJ_45_SAC50/prices?region=06_CASABLANCA_SETTAT
curl http://localhost:4000/api/materials/CIMENT_CPJ_45_SAC50/prices/history?months=12
curl http://localhost:4000/api/materials/index/citurbarea?region=08_DRAA_TAFILALET

# UI
# Visiter http://localhost:5173/materiaux
# Tester recherche, sélection région, navigation vers détail, comparateur prix
```

## Doctrine RuleIDs

- `T5-MAT-CATALOG-001` — read-only catalog (lecture publique)
- `T5-MAT-OBSERVATION-002` — observation prix utilisateur (mutation anonyme)
- `T5-MAT-INDEX-003` — calcul indice CITURBAREA

À ajouter dans `docs/rules/registry.yml` lors de la prochaine revue doctrinale.

## Roadmap

- [ ] Modèle Prisma `MaterialPriceSnapshot` (per material × region × month)
- [ ] Job cron mensuel : agrégation observations → snapshot
- [ ] Backoffice CC : éditeur snapshots + workflow validation
- [ ] Intégration P3 (devis MOD délégué) : pré-remplissage corps de métiers
  à partir des prix matériaux moyens
- [ ] Intégration P5 (rapports d'expertise) : graphique évolution prix dans
  les rapports watermarqués
- [ ] Image CDN pour chaque matériau (S3 + lazy loading)
