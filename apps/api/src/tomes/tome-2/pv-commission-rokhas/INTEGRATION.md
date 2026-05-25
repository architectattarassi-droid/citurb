# PV Commission Rokhas — Guide d'intégration

Module Tome 2 — gère les PV (procès-verbaux) de commission Rokhas pour les
permis de construire au Maroc (rokhas.ma).

## 1. Activation backend

### 1.a Importer le module dans Tome 2

`apps/api/src/tomes/tome-2/tome-2.module.ts` :

```ts
import { PvCommissionModule } from "./pv-commission-rokhas/pv-commission.module";

@Module({
  imports: [
    P2Module,
    PrismaModule,
    KernelModule,
    OwnerNotifyModule,
    Tome5AuthModule,
    PvCommissionModule, // ← ajouter
  ],
  // ...
  exports: [Tome2Service, P2Module, AntiDesintService, PvCommissionModule],
})
export class Tome2Module {}
```

Aucun changement nécessaire dans `app.module.ts` (Tome2Module est déjà importé).

### 1.b Ajouter à l'allow-list MutationGate

`apps/api/src/common/guards/mutation-gate.guard.ts` — ajouter dans le tableau `allow` :

```ts
"/api/pv-commission",
```

Cette ligne autorise toutes les mutations sous `/api/pv-commission/*` (upload,
parse, lever réserve, webhook).

### 1.c Variables d'environnement

À ajouter dans `apps/api/.env` :

```bash
# Webhook rokhas.ma — clé HMAC partagée (signature X-Rokhas-Signature)
ROKHAS_WEBHOOK_SECRET=change_me_to_a_long_random_secret

# Optionnel — par défaut: apps/api/storage/pv-commission/{dossierId}/
# UPLOADS_DIR existant est utilisé pour dériver le chemin si défini
```

## 2. Dépendances npm

### Recommandée (parsing PDF natif)

```bash
npm install --workspace apps/api pdf-parse
npm install --workspace apps/api --save-dev @types/pdf-parse
```

Si `pdf-parse` n'est PAS installé, le service bascule automatiquement sur
un extracteur naïf (binary strings) qui marche pour les PDFs Rokhas
non compressés. Pour les PDFs scannés, `parsingConfidence` sera `0` et
l'UI bascule en mode "édition manuelle".

### Déjà présents (vérifier)

- `@nestjs/platform-express` (FileInterceptor) — ✅ présent
- Module `crypto` natif Node — ✅ présent

## 3. Migration Prisma (recommandée pour Phase 2)

Le module fonctionne tout de suite en stockant dans `Dossier.payload.pvsCommission[]`.
Pour la production, créer ces modèles dédiés :

```prisma
// prisma/schema.prisma — à ajouter après le bloc RokhasDossier

enum PvDecision {
  FAVORABLE
  FAVORABLE_AVEC_RESERVES
  DEFAVORABLE
  AJOURNE
}

enum PvStatus {
  UPLOADED
  PARSING
  PARSED
  VALIDATED
  ARCHIVED
}

enum ReserveSeverite {
  MINEURE
  MAJEURE
  BLOQUANTE
}

enum ReserveStatus {
  OUVERTE
  EN_COURS
  LEVEE
  FORCLOSE
}

model PvCommissionRokhas {
  id                    String     @id @default(cuid())
  dossierId             String
  rokhasReference       String?
  uploadedFileUrl       String
  uploadedBy            String
  uploadedAt            DateTime   @default(now())
  parsedAt              DateTime?
  parsedBy              String?
  dateCommission        DateTime?
  communeName           String?
  presents              String[]
  decision              PvDecision?
  motifsRefus           Json       @default("[]")
  delaiLegalReponseDays Int        @default(60)
  status                PvStatus   @default(UPLOADED)
  hashSha256            String
  storagePath           String
  parserVersion         String?
  parsingConfidence     Float?
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt
  dossier               Dossier    @relation("DossierPvCommission", fields: [dossierId], references: [id])
  reserves              PvCommissionReserve[]

  @@index([dossierId])
  @@index([decision])
  @@index([status])
}

model PvCommissionReserve {
  id              String         @id @default(cuid())
  pvId            String
  ordre           Int
  titre           String
  description     String
  articleLoi      String?
  severite        ReserveSeverite @default(MINEURE)
  deadlineLevee   DateTime?
  status          ReserveStatus  @default(OUVERTE)
  preuveUrl       String?
  leveeAt         DateTime?
  leveeBy         String?
  createdAt       DateTime       @default(now())
  pv              PvCommissionRokhas @relation(fields: [pvId], references: [id], onDelete: Cascade)

  @@index([pvId])
  @@index([status])
}
```

Puis ajouter dans le model `Dossier` (côté relation) :

```prisma
model Dossier {
  // ... champs existants
  pvsCommission PvCommissionRokhas[] @relation("DossierPvCommission")
}
```

Migration :

```bash
npm run prisma:migrate -- --name pv_commission_rokhas
npm run prisma:generate
```

Après migration, swap les méthodes `_savePv` / `_loadPvCtx` / `_loadAllForDossier`
de `pv-commission.service.ts` pour utiliser `this.prisma.pvCommissionRokhas.*`
au lieu de `Dossier.payload`. La couche de vue (`PvCommissionRokhasView`) ne
change pas → aucun impact sur le front.

## 4. Webhook Rokhas

URL publique à déclarer côté rokhas.ma : `https://api.citurbarea.com/api/pv-commission/webhook/rokhas`

### Format attendu (rokhas.ma → CITURBAREA)

**Headers** :
- `Content-Type: application/json`
- `X-Rokhas-Timestamp: <epoch ms>`
- `X-Rokhas-Signature: sha256=<hex>`

**Signature** :
```
HMAC_SHA256(secret, `${timestamp}.${rawJsonBody}`)
```

**Body** :
```json
{
  "dossierId": "ckxyz123...",
  "pdfBase64": "JVBERi0xLjcK...",
  "rokhasReference": "RKH-2026-12345"
}
```

**Anti-replay** : timestamp doit être à ±5 min de l'heure serveur.

### Réponse
```json
{ "ok": true, "pvId": "pv_abc123", "decision": "FAVORABLE_AVEC_RESERVES" }
```

## 5. Routes frontend à enregistrer

Dans `apps/web/src/tomes/tome1/router/routes.tsx` :

```tsx
import PvCommissionUpload from "../../../features/pv-commission/PvCommissionUpload";
import PvCommissionDecisions from "../../../features/pv-commission/PvCommissionDecisions";
import PvCommissionReservesTracker from "../../../features/pv-commission/PvCommissionReservesTracker";

// Dans la liste des routes (children) :
{ path: "/p2/dossier/:dossierId/pv-commission",                 element: <PvCommissionDecisions /> },
{ path: "/p2/dossier/:dossierId/pv-commission/upload",          element: <PvCommissionUpload /> },
{ path: "/p2/dossier/:dossierId/pv-commission/:pvId/reserves",  element: <PvCommissionReservesTracker /> },
```

Le composant `PvCommissionDecisions` liste tous les PVs d'un dossier et
permet d'ouvrir le tracker des réserves d'un PV.

## 6. Endpoints exposés

| Méthode | Path                                                  | Auth      | Description                          |
|---------|-------------------------------------------------------|-----------|--------------------------------------|
| POST    | `/api/pv-commission/upload/:dossierId`                | JWT       | Upload PDF du PV                     |
| POST    | `/api/pv-commission/:pvId/parse`                      | JWT       | Déclenche parsing + workflow         |
| GET     | `/api/pv-commission/dossier/:dossierId`               | JWT       | Liste PVs d'un dossier               |
| GET     | `/api/pv-commission/:pvId`                            | JWT       | Détail PV + réserves                 |
| POST    | `/api/pv-commission/:pvId/reserves/:reserveId/lever`  | JWT+role  | Marque réserve levée (avec preuve)   |
| GET     | `/api/pv-commission/:pvId/pdf`                        | JWT       | Téléchargement PDF original          |
| POST    | `/api/pv-commission/webhook/rokhas`                   | HMAC      | Webhook rokhas.ma (signature requise)|

## 7. Audit / Compliance

Toutes les actions sensibles produisent :
- une row `ProbativeLog` (hash chain SHA-256, append-only)
- une row `Incident` si décision DÉFAVORABLE
- un patch `Dossier.payload.pvCommissionWorkflow.lastRunAt`

Chaque PV stocke `hashSha256` du PDF original pour intégrité a posteriori.

## 8. Stockage fichiers

PDFs originaux : `apps/api/storage/pv-commission/{dossierId}/{pvId}.pdf`

Le dossier est créé automatiquement à l'upload. La route GET `/pdf`
relit le fichier et le sert avec `Content-Type: application/pdf`.

**En prod (Railway)** : le filesystem est éphémère. Bind un volume
sur `/app/apps/api/storage` ou swap pour S3 (l'abstraction `_savePv`
stocke déjà `_storagePath` qui peut devenir une URL S3).

## 9. Tests rapides (cURL)

Upload + parse :
```bash
TOKEN="<jwt>"
DOSSIER="ckxyz123"

curl -X POST "http://localhost:4000/api/pv-commission/upload/$DOSSIER" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/pv-commission.pdf"

# Réponse: { "ok": true, "pv": { "id": "pv_abc123", ... } }

curl -X POST "http://localhost:4000/api/pv-commission/pv_abc123/parse" \
  -H "Authorization: Bearer $TOKEN"

# Lister
curl "http://localhost:4000/api/pv-commission/dossier/$DOSSIER" \
  -H "Authorization: Bearer $TOKEN"
```

Lever réserve :
```bash
curl -X POST "http://localhost:4000/api/pv-commission/pv_abc123/reserves/res_xxx/lever" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preuveUrl":"/uploads/p5-documents/abc.pdf","note":"Plan modifié"}'
```
