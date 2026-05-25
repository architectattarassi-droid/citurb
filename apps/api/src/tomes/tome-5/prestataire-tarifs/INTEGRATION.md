# Module Tarifs Contractuels Prestataires P6 — Intégration

## Statut MVP

**Pas de modèle Prisma** au MVP. Stockage `JSON file` + cache mémoire :
- Corpus statique : `apps/api/data/prestataire-tarifs/tarifs-types-corpus.json`
- Tarifs runtime : `apps/api/storage/prestataire-tarifs.json` (auto-créé)

Le cache mémoire est rechargé au boot depuis le file system. Chaque mutation
persiste immédiatement le JSON sur disque (write-through).

## Intégration AppModule

Déjà effectuée via `tome-5.module.ts` :

```ts
// apps/api/src/tomes/tome-5/tome-5.module.ts
import { PrestataireTarifsModule } from "./prestataire-tarifs/prestataire-tarifs.module";

@Module({
  imports: [Tome5AuthModule, PrestataireTarifsModule],
  exports: [Tome5AuthModule, PrestataireTarifsModule],
})
export class Tome5Module {}
```

`AppModule` importe déjà `Tome5Module` — rien à changer côté `app.module.ts`.

## MutationGate (allow-list)

Ajout effectué dans `apps/api/src/common/guards/mutation-gate.guard.ts` :

```ts
"/api/prestataire-tarifs",  // Tarifs contractuels P6 (Tome 5)
```

Toutes les routes `POST/PATCH` du module sont donc autorisées sans passer par
l'orchestrator (équivalent au pattern `/p1..p6`).

## Endpoints

| Méthode | Route | Rôle |
|---------|-------|------|
| GET  | `/api/prestataire-tarifs/corpus` | Corpus 40+ prestations standardisées |
| GET  | `/api/prestataire-tarifs/search?prestation=&zone=&maxPrice=` | Recherche client (status=PUBLIE) |
| GET  | `/api/prestataire-tarifs/prestataire/:id` | Tarifs publiés d'un prestataire |
| GET  | `/api/prestataire-tarifs/:id` | Détail tarif |
| GET  | `/api/prestataire-tarifs/:id/comparator?clientPrice=...` | Comparateur prix |
| POST | `/api/prestataire-tarifs` | Créer tarif (status BROUILLON) |
| PATCH | `/api/prestataire-tarifs/:id` | Éditer (BROUILLON ou PUBLIE) |
| POST | `/api/prestataire-tarifs/:id/submit` | Soumission validation CITURBAREA |
| POST | `/api/prestataire-tarifs/:id/contract` | Signature → PUBLIE + hash SHA-256 |
| POST | `/api/prestataire-tarifs/:id/suspend` | Suspension d'un tarif PUBLIE |

## Workflow tarif

```
BROUILLON
   │ submit()
   ▼
VALIDE_CITURBAREA
   │ signContract()  → calcule SHA-256(sealable payload)
   ▼
PUBLIE  ──── suspend() ───►  SUSPENDU
```

## Routes Front

Trois pages à intégrer dans `apps/web/src/tomes/tome1/router/routes.tsx` :

```tsx
import PrestataireTarifsList    from "../../../features/prestataire-tarifs/PrestataireTarifsList";
import PrestataireTarifsEditor  from "../../../features/prestataire-tarifs/PrestataireTarifsEditor";
import TarifContractPublic      from "../../../features/prestataire-tarifs/TarifContractPublic";

// dans children PublicLayout
{ path: '/prestataires/tarifs',                element: <PrestataireTarifsList /> },
{ path: '/prestataires/tarifs/editor',         element: <PrestataireTarifsEditor /> },
{ path: '/prestataires/tarifs/:tarifId',       element: <TarifContractPublic /> },
```

## Migration Prisma (future)

Modèle suggéré pour `prisma/dossiers/schema.prisma` :

```prisma
model PrestataireTarif {
  id                      String   @id @default(cuid())
  prestataireId           String   @index
  corpsMetier             String
  prestation              String   @index
  unite                   String
  prixUnitaireMAD         Float
  conditions              Json
  zoneIntervention        String[]
  status                  String   @default("BROUILLON")
  garanties               Json
  validUntil              DateTime
  contratSignedAt         DateTime?
  commissionCiturbareaPct Float    @default(5)
  hashContrat             String   @default("")
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([prestation, status])
  @@index([prestataireId, status])
}
```

Étapes migration :
1. Ajouter le modèle ci-dessus
2. `npm run prisma:migrate`
3. Écrire un job one-shot de seed JSON → DB
4. Remplacer le `Map` du service par `PrismaDossiersService.prestataireTarif`
5. Conserver `tarifs-types-corpus.json` (référentiel statique)

## Sécurité MVP

Le MVP ne contrôle pas l'identité du prestataire (pas de `@UseGuards(JwtAuthGuard)`).
À durcir en prod : décorer les méthodes `create/update/submit/suspend` avec
`@UseGuards(JwtAuthGuard)` et vérifier `req.user.id === input.prestataireId`.

Le `signContract` doit en prod être réservé aux comptes `ADMIN`/`OPS`
(`@Roles("ADMIN","OPS")`).
