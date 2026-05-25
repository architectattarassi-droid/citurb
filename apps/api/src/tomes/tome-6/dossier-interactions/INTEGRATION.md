# DossierInteractions — Intégration

Module Tome 6 (Web tome6 `Workflows dossiers + state orchestration`).
Fil d'interactions Dossier P1–P6 : commentaires, fichiers, audio notes,
mentions, réactions, épinglage, visibilité, notifications.

## 1. Module API

### Wiring (déjà appliqué)

`apps/api/src/tomes/tome-6/tome-6.module.ts` importe désormais
`DossierInteractionsModule` (qui dépend de `Tome2Module` via `forwardRef`
pour réutiliser `AntiDesintService.scanContent()`).

### Dépendances

- `PrismaService` (kernel)
- `Tome2Module → AntiDesintService` (scan contentMD)
- `EmailService` + `TwilioService` (modules globaux)

### MutationGate

`apps/api/src/common/guards/mutation-gate.guard.ts` : ajout dans l'allow-list :

```ts
"/api/dossier",    // Fil interactions Dossier (Tome 6, Sprint S-INT)
"/api/me",         // Endpoints utilisateur courant (mentions, etc.)
```

## 2. Endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET     | `/api/dossier/:dossierId/timeline?cursor=&limit=` | JWT | Liste paginée DESC |
| POST    | `/api/dossier/:dossierId/timeline` | JWT | Crée (JSON ou multipart `files[]`) |
| PATCH   | `/api/dossier/:dossierId/timeline/:id` | JWT (auteur, 15 min) | Edit |
| DELETE  | `/api/dossier/:dossierId/timeline/:id` | JWT (auteur ou OPS) | Soft delete |
| POST    | `/api/dossier/:dossierId/timeline/:id/react` | JWT | Toggle emoji (whitelist) |
| POST    | `/api/dossier/:dossierId/timeline/:id/pin` | JWT (OPS / owner) | Épingle |
| POST    | `/api/dossier/:dossierId/timeline/:id/mark-read` | JWT | Marque lu |
| GET     | `/api/me/mentions?unread=true&limit=N` | JWT | Mes mentions cross-dossiers |

### Sécurité / permissions

- **Lecture** : staff (`ADMIN|OWNER|OPS|SUPER_ADMIN|ADMIN_SUPPORT`) toujours ;
  sinon `dossier.ownerId` ou listé dans `payload.parties[]`.
- **Visibilité** :
  - `PUBLIC` : visible par owner + parties + staff.
  - `INTERNE_OPS` : staff uniquement (création staff seulement).
  - `PRIVATE` : auteur + mentionnés.
- **Edit window** : 15 min depuis création (`EDIT_WINDOW_MS`).
- **Soft delete** : auteur OU staff.
- **Pin** : staff OU owner du dossier.
- **Reactions** : whitelist 5 emojis `👍 ❤️ 🎉 🤔 ⚠️`.

## 3. Persistence — Stratégie de migration

### V1 (livré, zéro migration Prisma)

Les interactions sont stockées dans `Dossier.payload.interactions[]`
(JSONB), shape 1:1 avec le modèle Prisma cible (voir ci-dessous).
La file de notifications est dupliquée dans `Dossier.payload.notifQueue[]`.
Les mentions explicites créent en plus une row dans la table
`Notification` (existante, type `POST_MENTION` faute de mieux).

Avantage : déploiement immédiat sans `prisma migrate`.

### V2 (migration Prisma recommandée)

Ajouter dans `prisma/schema.prisma` :

```prisma
model DossierInteraction {
  id           String   @id @default(cuid())
  dossierId    String
  parentId     String?
  authorUserId String
  authorRole   String
  type         DossierInteractionType
  contentMD    String   @db.Text
  attachments  Json     @default("[]")
  mentions     String[]
  metadata     Json     @default("{}")
  reactions    Json     @default("[]")
  isPinned     Boolean  @default(false)
  visibility   InteractionVisibility @default(PUBLIC)
  readBy       String[]
  createdAt    DateTime @default(now())
  editedAt     DateTime?
  deletedAt    DateTime?

  dossier  Dossier @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  parent   DossierInteraction?  @relation("InteractionThread", fields: [parentId], references: [id])
  children DossierInteraction[] @relation("InteractionThread")

  @@index([dossierId, createdAt])
  @@index([dossierId, isPinned])
  @@index([authorUserId, createdAt])
}

enum DossierInteractionType {
  COMMENT
  FILE_UPLOADED
  STATUS_CHANGE
  PHASE_COMPLETED
  PAYMENT_RECEIVED
  SIGNATURE
  MENTION
  AUDIO_NOTE
  DECISION
}

enum InteractionVisibility {
  PUBLIC
  INTERNE_OPS
  PRIVATE
}
```

Sur `model User`, ajouter le côté inverse :

```prisma
model User {
  // ...
  webPushSubscriptions WebPushSubscription[] @relation("UserPush")
}
```

Et le modèle Web Push (V3, pour le canal push) :

```prisma
model WebPushSubscription {
  id           String   @id @default(cuid())
  userId       String
  endpoint     String   @unique
  keys         Json     // { p256dh, auth }
  userAgent    String?
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime @default(now())
  user         User     @relation("UserPush", fields: [userId], references: [id], onDelete: Cascade)
}
```

L'enum `NotificationType` peut être étendu :

```prisma
enum NotificationType {
  // ... existants
  DOSSIER_INTERACTION
  DOSSIER_INTERACTION_MENTION
}
```

### Migration code lors du switch V1 → V2

Dans `dossier-interactions.service.ts`, remplacer `extractInteractions` /
`persist` par des appels `prisma.dossierInteraction.findMany/create/update`.
Le reste de la logique reste identique.

## 4. Notifications déclenchées

À chaque CREATE, `DossierNotifService.broadcast()` :

1. **Email** via `EmailService` (Resend → SMTP) aux mentions explicites
   + parties du dossier (selon visibility).
2. **SMS** via `TwilioService.sendSms()` : template
   `"<Auteur> a commenté votre dossier <P2-XXXXXX> — voir : https://citurbarea.com/dossier/<id>?i=<interactionId>"`.
3. **Web Push** : placeholder dans `notifyPush()`. À câbler avec
   `web-push` (npm) + table `WebPushSubscription` (voir V3).
4. **Notification (table)** : row par mention explicite, type
   `POST_MENTION` (V1).
5. **Persistence app** : `Dossier.payload.notifQueue` (capé 500).

## 5. Anti-désintermédiation

`AntiDesintService.scanContent()` (ajouté dans
`apps/api/src/tomes/tome-2/anti-desint.service.ts`) scanne le `contentMD`
de chaque interaction lors du `CREATE`. Mêmes patterns que `scanSince`,
mêmes incidents `DISINTERMEDIATION_RISK`, même append `payload.antiDesintFlags`.

Le cron nightly `0 2 * * *` reste actif sur la table `DossierMessage` —
il n'inclut pas encore les interactions. Quand la table Prisma
`DossierInteraction` est en place, ajouter un second scan nightly.

## 6. Frontend

### Routes recommandées

Ajouter dans `apps/web/src/tomes/tome1/router/routes.tsx` :

```tsx
// Imports
import DossierTimeline from "../../../features/dossier-interactions/DossierTimeline";
import DossierMentionsPanel from "../../../features/dossier-interactions/DossierMentionsPanel";

// Route exemple (intégration dans la page dossier existante recommandée)
{
  path: "/dossier/:dossierId",
  element: <DossierPageWithTimeline />,  // wrapper qui combine fiche + <DossierTimeline />
},
{
  path: "/me/mentions",
  element: <DossierMentionsPanel />,
},
```

### Intégration dans une page existante

```tsx
import DossierTimeline from "@/features/dossier-interactions/DossierTimeline";
import { useAuth } from "@/tomes/tome5/AuthProvider";

export function P2DossierPage() {
  const auth = useAuth();
  const { dossierId } = useParams();
  return (
    <div>
      {/* ...fiche dossier... */}
      <DossierTimeline
        dossierId={dossierId!}
        currentUserId={auth.user?.id ?? ""}
        currentUserRole={auth.user?.role}
        fetchMembers={async (q) => {
          // câble vers l'annuaire pro / membres du dossier
          return [];
        }}
      />
    </div>
  );
}
```

### Bottom-nav badge

```tsx
import { MentionsBadge } from "@/features/dossier-interactions/DossierMentionsPanel";

<MentionsBadge onClick={() => navigate("/me/mentions")} />
```

### Storage des uploads

Les fichiers postés en multipart vont dans `${UPLOADS_DIR}/dossier-interactions/`.
Le serveur expose `/uploads` déjà (cf. `main.ts`), donc les URLs renvoyées
(`/uploads/dossier-interactions/<filename>`) fonctionnent en lecture
publique. Pour Railway prod, monter un volume persistant.

## 7. Temps réel (V3)

Polling 30s côté front (`DossierTimeline.tsx`). Pour passer en temps réel :

- **Option simple** : SSE (`MessagesStreamService` existant cercles peut
  servir de template) — endpoint `/api/dossier/:id/timeline/stream`.
- **Option robuste** : WebSocket via `@nestjs/websockets` + Redis pub/sub
  pour multi-instance Railway.

## 8. Checklist déploiement

- [x] Module wiré dans `Tome6Module`.
- [x] Allow-list MutationGate (`/api/dossier`, `/api/me`).
- [x] `AntiDesintService.scanContent()` ajouté (réutilisable).
- [x] Email + SMS (Twilio) câblés via services globaux existants.
- [x] Composants React mobile-first prêts à mounter.
- [ ] Migration Prisma `DossierInteraction` (optionnelle V2).
- [ ] Service worker Web Push + table `WebPushSubscription` (optionnel V3).
- [ ] SSE/WS temps réel (optionnel V3).
- [ ] Route front montée dans `routes.tsx`.
