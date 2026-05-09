# CITURBAREA Cercles

Le portail officiel d'échanges entre professionnels de l'écosystème construction marocain : architectes, BET (structure, fluides, VRD), bureaux de contrôle, laboratoires, entreprises GO, artisans qualifiés, fournisseurs matériaux.

URL cible : `https://cercles.citurbarea.com`

Slogan : « Les pros se parlent ici. »

---

## Sprints livrés (cette itération)

- **C0** — Schéma Prisma, migration, module skeleton NestJS, env, INFRA docs ✅
- **C1** — Cercles CRUD, memberships (PUBLIC/MEMBERS_ONLY/PRIVATE), rôles MEMBER/CONTRIBUTOR/MODERATOR/OWNER ✅
- **C2** — Posts root + replies (threading 2 niveaux), upvote, pin, isResolved, soft delete ✅
- **C3** — LiveRoom (LiveKit), génération token serveur, EncryptionService AES-256-GCM, EgressTarget routes placeholder ✅

## Différé

- **C4** — Egress YouTube/Facebook/LinkedIn (LiveKit Egress + Chrome headless)
- **C5** — Annuaire pro (cards prestataires reliées au modèle Prestataire P6)
- **C6** — Notifications Web Push, replay viewer, analytics

---

## Architecture

```
apps/api/src/modules/cercles/
├── cercles.module.ts          ← module Nest, exporte les services
├── cercles.controller.ts      ← /api/cercles/* (REST, JWT-protected)
├── cercles.service.ts         ← cercles CRUD + RBAC helpers
├── memberships.service.ts     ← join/leave/invite/accept/promote/ban
├── posts.service.ts           ← root posts + replies + upvote + pin
├── rooms.service.ts           ← LiveRoom CRUD + start/end/join/cancel
├── livekit.service.ts         ← wrapper SDK LiveKit (mode dev = no-op)
└── encryption.service.ts      ← AES-256-GCM pour streamKeys
```

## Modèle de données

Voir `prisma/schema.prisma` section "CERCLES PROFESSIONNELS" + migration `prisma/migrations/20260509000001_add_cercles_module/migration.sql`.

Modèles : `Cercle`, `CercleMembership`, `CercleModerator`, `CerclePost`, `PostAttachment`, `LiveRoom`, `RoomParticipation`, `EgressTarget`.

## Endpoints

Tous préfixés par `/api/cercles`, protégés `JwtAuthGuard`.

### Cercles
- `GET /` — liste paginée (cercles visibles)
- `GET /:slug` — détail
- `POST /` — créer (créateur = OWNER auto)
- `PATCH /:id` — update (modo+)
- `DELETE /:id` — soft delete (owner)

### Memberships
- `POST /:cercleId/join` — rejoindre (PUBLIC direct, MEMBERS_ONLY = pending)
- `POST /:cercleId/leave` — quitter
- `POST /:cercleId/invitations` — inviter user (modo+)
- `POST /:cercleId/invitations/:userId/accept` — accepter invitation
- `GET /:cercleId/members` — lister membres
- `POST /:cercleId/moderators/:userId` — promouvoir (owner)
- `DELETE /:cercleId/members/:userId` — bannir (modo+)

### Posts
- `GET /:cercleId/posts` — root posts paginés
- `GET /:cercleId/posts/:postId` — détail + replies (2 niveaux)
- `POST /:cercleId/posts` — créer post racine
- `POST /:cercleId/posts/:postId/replies` — répondre
- `PATCH /:cercleId/posts/:postId` — éditer (auteur ou modo)
- `DELETE /:cercleId/posts/:postId` — soft delete
- `POST /:cercleId/posts/:postId/upvote` — upvote idempotent
- `POST /:cercleId/posts/:postId/pin` — épingler (modo)
- `POST /:cercleId/posts/:postId/resolve` — marquer résolu

### LiveRooms
- `GET /:cercleId/rooms` — liste
- `POST /:cercleId/rooms` — créer (modo)
- `GET /:cercleId/rooms/:roomSlug` — détail
- `POST /:cercleId/rooms/:roomId/start` — démarrer (host)
- `POST /:cercleId/rooms/:roomId/end` — terminer (host)
- `POST /:cercleId/rooms/:roomId/join` — récupère `{ token, wsUrl, roomName, role }`
- `DELETE /:cercleId/rooms/:roomId` — annuler scheduled

### Egress (Sprint C4 — placeholder)
- `POST /:cercleId/rooms/:roomId/broadcast/targets` — ajouter cible RTMP
- `DELETE /:cercleId/rooms/:roomId/broadcast/targets/:targetId` — retirer cible
- `GET /:cercleId/rooms/:roomId/broadcast/status` — statut temps réel

---

## Variables d'environnement

Voir [.env.example](../../.env.example) section `# === Cercles / LiveKit ===` et le détail dans [INFRA.md](./INFRA.md).

## Frontend

Routes dans `apps/web/src/features/cercles/routes.tsx` :
- `/cercles` → CerclesListPage
- `/cercles/:slug` → CercleDetailPage
- `/cercles/:slug/posts/:postId` → PostDetailPage
- `/cercles/:slug/rooms/:roomSlug` → LiveRoomLobbyPage
- `/cercles/:slug/rooms/:roomSlug/live` → LiveRoomPage

App Desktop dédiée : `CITURBAREA Cercles.exe` (variant `cercles`, ouvre `/cercles`).

---

## Sécurité

- JWT LiveKit court-vivant (1h max), **jamais** stocké en localStorage côté client (gardé en mémoire React)
- `LIVEKIT_API_SECRET` reste backend, jamais exposé au front
- Stream keys YouTube/Facebook/LinkedIn chiffrées au repos (AES-256-GCM avec IV+authTag)
- Soft delete uniquement pour Cercle, CerclePost, LiveRoom (jamais de suppression physique)
- Pièces jointes passent par le pipeline `FileScanService` existant (refus silencieux .exe/.bat/.scr)

## Doctrine MASTER-v2.0

Le module Cercles vit dans `apps/api/src/modules/cercles/` (équivalent fonctionnel "tome-5 interaction métier inter-cabinets" du prompt). Imports autorisés : kernel (`tome-at`), auth (`tome-5`), prisma. Imports interdits : tomes business (P1Dossier, MOD, compta, paiements).

Multi-cabinet isolation : chaque `Cercle` a un `firmId` optionnel (réutilise le modèle `Firm` existant — équivalent du `Cabinet` du prompt).
