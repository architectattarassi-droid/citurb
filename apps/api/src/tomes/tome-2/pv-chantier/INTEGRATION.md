# INTÉGRATION — Module PV de Chantier (Tome 2)

Module livré dans `apps/api/src/tomes/tome-2/pv-chantier/` + `apps/web/src/features/pv-chantier/`.

## 1. Câblage backend (DÉJÀ FAIT)

Modifications déjà appliquées dans cette worktree :

- `apps/api/src/tomes/tome-2/tome-2.module.ts` : import + enregistrement de `PvChantierModule`.
- `apps/api/src/common/guards/mutation-gate.guard.ts` : ajout de `"/api/pv-chantier"` à la `allow`-list (sinon POST/PATCH bloqués par doctrine T@-R-MUTATION-GATE).

Aucun autre câblage backend nécessaire — `Tome2Module` est déjà importé dans `app.module.ts`.

## 2. Persistance

**Mode MVP (actuel)** : les PV sont stockés dans `Dossier.payload.pvChantier[]` (JSON). Aucune migration nécessaire pour démarrer.

**Migration cible** : ajouter ces modèles à `prisma/schema.prisma` (puis `npm run prisma:migrate` et basculer `readBag`/`writeBag` dans `pv-chantier.service.ts` vers Prisma natif) :

```prisma
enum PvTypeVisite {
  INITIALE
  AVANCEMENT
  RECEPTION_PROVISOIRE
  RECEPTION_DEFINITIVE
  LEVE_RESERVES
}

enum PvStatus {
  DRAFT
  SIGNED_PARTIEL
  FINAL
}

enum PvSeverite {
  INFO
  AVIS
  RESERVE
  BLOQUANT
}

model PvChantier {
  id              String       @id @default(uuid())
  dossierId       String
  numero          String       // YYYY-NNN
  date            DateTime
  typeVisite      PvTypeVisite

  meteo           String?
  temperatureC    Float?
  vent            String?

  presents        Json         @default("[]") // [{nom, role, organisme?}]
  absents         Json         @default("[]") // [{nom, role, motif?}]
  decisions       Json         @default("[]") // [{id, description, responsable?, deadline?}]

  prochaineVisite DateTime?

  status          PvStatus     @default(DRAFT)
  hashSha256      String?
  pdfUrl          String?

  authorId        String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  finalizedAt     DateTime?

  observations    PvChantierObservation[]
  signatures     PvChantierSignature[]

  dossier         Dossier      @relation(fields: [dossierId], references: [id], onDelete: Cascade)

  @@unique([dossierId, numero])
  @@index([dossierId, date])
}

model PvChantierObservation {
  id          String     @id @default(uuid())
  pvId        String
  lot         String?
  severite    PvSeverite @default(INFO)
  titre       String
  description String?
  photoUrls   Json       @default("[]") // string[]
  geoloc      Json?       // { lat, lng, altitudeM?, accuracyM?, capturedAt? }
  deadline    DateTime?
  position    Int        @default(0)

  pv          PvChantier @relation(fields: [pvId], references: [id], onDelete: Cascade)

  @@index([pvId])
}

model PvChantierSignature {
  id        String     @id @default(uuid())
  pvId      String
  partie    String
  dataUrl   String     // PNG base64 data-URL
  signedAt  DateTime   @default(now())

  pv        PvChantier @relation(fields: [pvId], references: [id], onDelete: Cascade)

  @@index([pvId])
}
```

Et côté `Dossier`, ajouter la relation inverse :

```prisma
model Dossier {
  // ...
  pvChantiers PvChantier[]
}
```

## 3. Storage photos & snapshot HTML

Les photos et le snapshot HTML finalisé sont écrits dans `apps/api/storage/pv-chantier/{dossierId}/{pvId}/`.

Override via env : `PV_STORAGE_ROOT=/var/data/pv-chantier`.

**À déclarer dans la config statique Express** pour servir `/storage/pv-chantier/*` côté client (sinon les `img src` ne se résolvent pas) :

```ts
// apps/api/src/main.ts (ou équivalent ServeStaticModule)
app.useStaticAssets(path.join(process.cwd(), "apps/api/storage"), { prefix: "/storage/" });
```

> Si une route `/storage` existe déjà, rien à faire.

## 4. Câblage frontend (à ajouter)

Importer les composants dans le routing de l'app (ex. `apps/web/src/tomes/tome1/router/...` ou `apps/web/src/app/routes.tsx`) :

```tsx
import PvChantierList from "../../features/pv-chantier/PvChantierList";
import PvChantierEditor from "../../features/pv-chantier/PvChantierEditor";
import PvChantierViewer from "../../features/pv-chantier/PvChantierViewer";

// routes (BrowserRouter / React Router v6):
<Route path="/pv-chantier/dossier/:dossierId" element={<PvChantierListRoute />} />
<Route path="/pv-chantier/dossier/:dossierId/new" element={<PvChantierEditor mode="new" />} />
<Route path="/pv-chantier/:pvId" element={<PvChantierViewer />} />
<Route path="/pv-chantier/:pvId/edit" element={<PvChantierEditor mode="edit" />} />
```

Adapter `PvChantierListRoute` :

```tsx
import { useParams } from "react-router-dom";
function PvChantierListRoute() {
  const { dossierId = "" } = useParams();
  return <PvChantierList dossierId={dossierId} />;
}
```

Lien d'entrée recommandé depuis le détail d'un dossier (Tome 6/CC) :

```tsx
<Link to={`/pv-chantier/dossier/${dossier.id}`}>Voir les PV de chantier</Link>
```

## 5. Endpoints exposés

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| GET | `/api/pv-chantier/dossier/:dossierId` | — | Liste des PV du dossier |
| POST | `/api/pv-chantier/dossier/:dossierId` | JWT | Créer un PV (DRAFT) |
| GET | `/api/pv-chantier/:pvId` | — | Détail PV |
| PATCH | `/api/pv-chantier/:pvId` | JWT | Modifier (DRAFT uniquement) |
| POST | `/api/pv-chantier/:pvId/sign` | JWT | Ajouter une signature |
| POST | `/api/pv-chantier/:pvId/photos` | JWT | Upload photo base64 |
| POST | `/api/pv-chantier/:pvId/finalize` | JWT | Finaliser → hash SHA-256 + ProbativeLog |
| GET | `/api/pv-chantier/:pvId/pdf` | — | HTML imprimable (Print → PDF) |

## 6. Dépendances NPM

**Aucune** nouvelle dépendance installée. Le module utilise uniquement :
- `crypto` (Node core) pour SHA-256 + UUID
- `fs/promises` (Node core) pour le storage
- `@nestjs/common`, `@nestjs/passport` (déjà présents)

Le canvas de signature côté front est un composant maison (pas de `signature_pad` npm).

Le PDF est généré comme HTML imprimable (style `ReportRendererService` / `P2ContractService` existant) : l'utilisateur clique « Imprimer / Sauvegarder en PDF » et le navigateur fait le rendu natif. Si à terme une génération PDF serveur est requise, intégrer `puppeteer-core` + `@sparticuz/chromium`.

## 7. Tests

`pv-chantier.service.spec.ts` couvre :
- Auto-numérotation `YYYY-NNN`
- Calcul `severiteMax` dans la liste
- Refus de patch après finalisation
- Bascule `DRAFT` → `SIGNED_PARTIEL` après première signature
- Calcul hash SHA-256 + append ProbativeLog

Lancer : `npm --prefix apps/api test -- pv-chantier`.

## 8. Doctrine

- **T2-R-PV-001** : tout PV finalisé reçoit un hash SHA-256 et une entrée probative chain `ProbativeLog`. Voir `pv-chantier.service.ts` → `finalize()`.
- Controller annoté `@Tome("tome2")` (META gate T@-META-005 respectée).
- Mutations gated par JWT + allow-list `MutationGateGuard`.
- Storage isolé sous `apps/api/storage/pv-chantier/` (override `PV_STORAGE_ROOT`).
- Watermark visuel `CITURBAREA · PV PROBATOIRE` intégré au rendu HTML.
