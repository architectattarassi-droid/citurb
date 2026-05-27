# INTÉGRATION — Documents Repository + e-signature (Tome 7)

Module livré dans :
- `apps/api/src/modules/documents-repo/`
- `apps/web/src/features/documents-repo/`

## 1. Câblage backend

### 1.1 `apps/api/src/app.module.ts`

Ajouter l'import du module :

```ts
import { DocumentsRepoModule } from "./modules/documents-repo/documents-repo.module";

@Module({
  imports: [
    // ... existing modules
    DocumentsRepoModule,
  ],
})
export class AppModule {}
```

### 1.2 `apps/api/src/common/guards/mutation-gate.guard.ts`

Ajouter `"/api/documents-repo"` à la `allow`-list (sinon POST/DELETE bloqués
par doctrine T@-R-MUTATION-GATE) :

```ts
const allow = [
  // ... existing entries
  "/api/documents-repo",            // Dépôt documentaire + e-signature (Tome 7)
];
```

### 1.3 Static serving (déjà présent normalement)

Les fichiers sont écrits sous `apps/api/storage/documents/{dossierId}/{uuid}.{ext}`.
Override via env : `DOCUMENTS_STORAGE_ROOT=/var/data/documents`.

L'accès se fait via URL signée HMAC 1h `GET /api/documents-repo/:docId/file?exp=&t=`,
**pas** via static — pas de configuration `useStaticAssets` requise.

## 2. Persistance

**Mode MVP (actuel)** : documents stockés dans `Dossier.payload.documentsRepo[]` (JSON).
Aucune migration nécessaire pour démarrer.

**Migration cible** : ajouter ces modèles à `prisma/schema.prisma`, puis basculer
`readBag`/`writeBag` dans `documents-repo.service.ts` vers Prisma natif :

```prisma
enum DocCategory {
  CONTRAT
  PLAN
  PIECE_ECRITE
  PERMIS
  PV
  FACTURE
  ATTESTATION
  CIN
  TITRE_FONCIER
  AUTRE
}

enum DocStatus {
  DRAFT
  PENDING_SIGNATURE
  PARTIALLY_SIGNED
  SIGNED
  ARCHIVED
}

enum SigMethod {
  LOCAL_CANVAS
  BARID_ESIGN
  OTP_EMAIL
}

model Document {
  id                String              @id @default(uuid())
  dossierId         String
  title             String
  description       String?
  category          DocCategory         @default(AUTRE)
  status            DocStatus           @default(DRAFT)

  filename          String
  storagePath       String
  mimeType          String
  sizeBytes         Int
  ext               String
  hashSha256        String

  uploadedBy        String?
  uploadedAt        DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  signedAt          DateTime?
  archivedAt        DateTime?
  archivedBy        String?

  probativeHash     String?

  signatures        DocumentSignature[]
  signatureRequests DocumentSigRequest[]

  dossier           Dossier             @relation(fields: [dossierId], references: [id], onDelete: Cascade)

  @@index([dossierId, category])
  @@index([dossierId, status])
}

model DocumentSignature {
  id          String    @id @default(uuid())
  documentId  String
  signerId    String?
  signerName  String
  signerRole  String
  signerEmail String?
  dataUrl     String    @db.Text
  method      SigMethod @default(LOCAL_CANVAS)
  signedAt    DateTime  @default(now())
  ipAddress   String?
  geoLat      Float?
  geoLng      Float?
  order       Int       @default(1)

  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}

model DocumentSigRequest {
  id          String   @id @default(uuid())
  documentId  String
  signerId    String?
  signerName  String
  signerRole  String
  signerEmail String?
  order       Int
  status      String   @default("PENDING") // PENDING|SIGNED|DECLINED
  requestedAt DateTime @default(now())
  notifiedAt  DateTime?

  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}
```

Et côté `Dossier`, ajouter la relation inverse :

```prisma
model Dossier {
  // ...
  documents Document[]
}
```

Puis `npm run prisma:migrate -- --name add_documents_repo`.

## 3. Câblage frontend

### 3.1 Route à ajouter dans `apps/web/src/app/routes.tsx`

```tsx
import { lazy } from "react";
const DocumentsRepoPage = lazy(() => import("../features/documents-repo/DocumentsRepoPage"));

// Wrapper pour récupérer le param dossierId
function DocumentsRepoRoute() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  return <DocumentsRepoPage dossierId={dossierId} />;
}

// Dans la définition des routes :
<Route path="/dossier/:dossierId/documents" element={<DocumentsRepoRoute />} />
```

### 3.2 Page publique de vérification (optionnel)

Pour la page QR de vérification publique, ajouter :

```tsx
import { documentsRepoApi } from "../features/documents-repo/documents-repo.api";

function DocumentVerifyPage() {
  const { docId = "" } = useParams<{ docId: string }>();
  const [searchParams] = useSearchParams();
  const hash = searchParams.get("hash") ?? "";
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    documentsRepoApi.verifyPublic(docId, hash).then(setResult);
  }, [docId, hash]);

  // … render result
}

<Route path="/verify/document/:docId" element={<DocumentVerifyPage />} />
```

### 3.3 Lien d'entrée recommandé (depuis détail dossier)

```tsx
<Link to={`/dossier/${dossier.id}/documents`}>Documents & signatures</Link>
```

## 4. Clés i18n à ajouter dans `apps/web/src/i18n/i18n.tsx`

```ts
const DICT: Record<string, Record<Lang, string>> = {
  // ...existing
  "docs.page_title":        { fr: "Documents du dossier",    ar: "وثائق الملف",         en: "Dossier documents" },
  "docs.upload":            { fr: "Téléverser",              ar: "تحميل",               en: "Upload" },
  "docs.search":            { fr: "Rechercher un document…", ar: "ابحث عن وثيقة…",     en: "Search document…" },
  "docs.status.all":        { fr: "Tous",                    ar: "الكل",                en: "All" },
  "docs.status.draft":      { fr: "Brouillons",              ar: "مسودات",              en: "Drafts" },
  "docs.status.pending":    { fr: "À signer",                ar: "للتوقيع",             en: "To sign" },
  "docs.status.signed":     { fr: "Signés",                  ar: "موقعة",               en: "Signed" },
  "docs.status.archived":   { fr: "Archivés",                ar: "مؤرشفة",              en: "Archived" },
  "docs.action.preview":    { fr: "Aperçu",                  ar: "معاينة",              en: "Preview" },
  "docs.action.sign":       { fr: "Signer",                  ar: "وقع",                 en: "Sign" },
  "docs.action.share":      { fr: "Partager",                ar: "مشاركة",              en: "Share" },
  "docs.action.delete":     { fr: "Archiver",                ar: "أرشفة",               en: "Archive" },
  "docs.sign.title":        { fr: "Signature électronique",  ar: "التوقيع الإلكتروني",  en: "E-signature" },
  "docs.sign.name":         { fr: "Nom complet",             ar: "الاسم الكامل",        en: "Full name" },
  "docs.sign.role":         { fr: "Rôle",                    ar: "الدور",               en: "Role" },
  "docs.sign.geoloc":       { fr: "Inclure ma position GPS", ar: "تضمين موقعي",         en: "Include GPS location" },
  "docs.sign.clear":        { fr: "Effacer",                 ar: "مسح",                 en: "Clear" },
  "docs.sign.validate":     { fr: "Valider la signature",    ar: "تأكيد التوقيع",       en: "Confirm signature" },
  "docs.empty":             { fr: "Aucun document — téléversez votre premier fichier.", ar: "لا توجد وثائق.", en: "No documents yet — upload your first file." },
};
```

> Les composants livrés utilisent du français en dur pour éviter de modifier
> `i18n.tsx` (hors-périmètre). Les clés ci-dessus sont à intégrer lors du
> branchement définitif si vous voulez activer la traduction.

## 5. Endpoints exposés

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| GET    | `/api/documents-repo/dossier/:dossierId`           | —   | Liste des documents |
| POST   | `/api/documents-repo/dossier/:dossierId/upload`    | JWT | Upload multipart (25 MB max) |
| GET    | `/api/documents-repo/:docId`                       | JWT | Détail + URL signée 1h |
| DELETE | `/api/documents-repo/:docId`                       | JWT | Soft-delete (owner/OPS) |
| POST   | `/api/documents-repo/:docId/sign`                  | JWT | Apposer une signature |
| POST   | `/api/documents-repo/:docId/request-signature`     | JWT | Workflow multi-signataires |
| GET    | `/api/documents-repo/:docId/verify?hash=`          | —   | Vérification publique (QR) |
| GET    | `/api/documents-repo/:docId/file?exp=&t=`          | URL signée | Téléchargement direct |

## 6. Variables d'environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `DOCUMENTS_STORAGE_ROOT` | `apps/api/storage/documents` | Racine du stockage physique |
| `JWT_SECRET`             | `dev-secret-change-me`       | Utilisé pour signer les URLs (HMAC) |
| `PUBLIC_WEB_URL`         | `https://citurbarea.com`     | Base URL pour les emails de notification |
| `RESEND_API_KEY`         | —                             | Si défini, notifications email actives |

## 7. Dépendances NPM

**Aucune nouvelle dépendance**. Le module utilise uniquement :
- `crypto` (Node core) — SHA-256, UUID, HMAC URLs signées
- `fs/promises` (Node core) — stockage disque
- `@nestjs/platform-express` (déjà présent) — `FileInterceptor` multer
- `EmailService` (déjà global, via `EmailModule`)

Le canvas signature et la barre de progression upload (XHR) sont 100 % maison.

## 8. Doctrine

- **T7-R-DOC-001** : tout document signé reçoit un hash SHA-256 immuable et une
  entrée probative chain `ProbativeLog` lors de la finalisation (status SIGNED).
- Controller annoté `@Tome("tome7")` (META gate T@-META-005 respectée).
- Mutations gated par JWT + allow-list `MutationGateGuard`.
- Stockage isolé sous `apps/api/storage/documents/{dossierId}/` (override env).
- URLs de téléchargement signées HMAC 1h — pas d'exposition publique du dossier.
- Catégories documentaires : CONTRAT, PLAN, PIECE_ECRITE, PERMIS, PV, FACTURE,
  ATTESTATION, CIN, TITRE_FONCIER, AUTRE (10 catégories normalisées CITURBAREA).
- Méthodes de signature supportées : LOCAL_CANVAS (actif), BARID_ESIGN
  (placeholder partenariat), OTP_EMAIL (à brancher si demandé).
- Soft-delete uniquement (status ARCHIVED) — aucune suppression dure de
  document signé (immutabilité probatoire).

## 9. Workflow multi-signataires séquentiel

1. Owner uploade → `status: DRAFT`
2. Owner appelle `POST /:docId/request-signature` avec liste `signers[]` (ordre = position dans le tableau)
3. `status: PENDING_SIGNATURE`, email envoyé au signataire #1 (via `EmailService.send()` → Resend → SMTP → log)
4. Signataire #1 ouvre lien `<PUBLIC_WEB_URL>/dossier/{dossierId}/documents?sign={docId}` → SignatureModal
5. Front POST `/:docId/sign` → backend appose la signature, marque la request `SIGNED`, status `PARTIALLY_SIGNED`, envoie email au signataire #2
6. Itération jusqu'au dernier → status `SIGNED`, hash final calculé, entrée `ProbativeLog` ancrée
7. Lien public de vérification : `/api/documents-repo/:docId/verify?hash=<sha256>` (utilisable depuis un QR code imprimé sur le document)

## 10. Tests manuels rapides

```bash
# 1. Upload (avec un fichier test)
curl -X POST http://localhost:4000/api/documents-repo/dossier/<dossierId>/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/tmp/contrat.pdf" \
  -F "category=CONTRAT" \
  -F "title=Contrat architecte"

# 2. Liste
curl http://localhost:4000/api/documents-repo/dossier/<dossierId>

# 3. Vérif publique
curl "http://localhost:4000/api/documents-repo/<docId>/verify?hash=<sha256>"
```
