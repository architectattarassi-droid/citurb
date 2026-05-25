# Module ProjectCalendar — Intégration

Module **Tome 6** (workflows dossiers) qui ajoute un calendrier projet
complet : Gantt + Kanban + Calendar + CPM (Critical Path Method) pour
les dossiers P2/P3/P4/P5.

## Fichiers livrés

### API (`apps/api/src/tomes/tome-6/project-calendar/`)

- `project-calendar.types.ts` — types canoniques (`ProjectTask`, `CpmResult`, `GanttPayload`…)
- `project-calendar.cpm.ts` — algorithme CPM (forward/backward pass + cascade replan)
- `project-calendar.service.ts` — service principal (CRUD + init template + persist Prisma)
- `project-calendar.controller.ts` — controller REST (`/api/project-calendar/:dossierId/...`)
- `project-calendar.module.ts` — module NestJS (wired dans `tome-6.module.ts`)
- `INTEGRATION.md` — ce fichier

### Data (`apps/api/data/project-templates/`)

- `phases-standard.json` — phases types par porte (P2/P3/P4/P5)

### Web (`apps/web/src/features/project-calendar/`)

- `project-calendar.api.ts` — client API + helpers Hijri/labels
- `GanttView.tsx` — Gantt SVG natif (pas de lib)
- `KanbanView.tsx` — Kanban drag&drop natif HTML5 + fallback tap mobile
- `CalendarMonthView.tsx` — vue mois 7×6 + overlay Hijri
- `TaskEditor.tsx` — bottom sheet d'édition tâche
- `CriticalPathBanner.tsx` — bandeau chemin critique
- `ProjectCalendarPage.tsx` — page tabbed (Gantt | Kanban | Calendrier | Liste)

## Modifications fichiers existants

| Fichier | Changement |
|---|---|
| `apps/api/src/tomes/tome-6/tome-6.module.ts` | Import + ré-export de `ProjectCalendarModule` |
| `apps/api/src/common/guards/mutation-gate.guard.ts` | Ajout de `/api/project-calendar` dans l'allow-list |
| `apps/web/src/tomes/tome1/router/routes.tsx` | Import `ProjectCalendarPage` + route `/projet/:dossierId/calendrier` |

## Endpoints REST

Tous protégés par `JwtAuthGuard`. Préfixe : `/api/project-calendar/:dossierId`.

| Méthode | Path | Description |
|---|---|---|
| GET | `/tasks` | Liste toutes les tâches du dossier |
| POST | `/tasks` | Crée une tâche (body `CreateTaskDto`) — recalcule CPM |
| POST | `/init-from-template?porte=P2` | Initialise depuis `phases-standard.json` (`resetExisting?: boolean`, `projectStart?: ISO date`) |
| PATCH | `/tasks/:id` | Update + recalcule CPM |
| DELETE | `/tasks/:id` | Supprime + nettoie les prédécesseurs orphelins + recalcule |
| GET | `/critical-path` | Retourne le `CpmResult` complet |
| GET | `/gantt` | Retourne le `GanttPayload` prêt à dessiner |
| POST | `/replan-cascade?fromTaskId=...&deltaDays=N` | Décale en cascade les descendants |

## Storage

**MVP** : les tâches sont stockées dans `Dossier.payload.projectCalendar`
(JSON, schéma main Prisma). Pattern identique à `Dossier.payload.packValidation`
— **aucune migration Prisma n'est nécessaire pour démarrer**.

Forme :

```jsonc
// Dossier.payload
{
  "packValidation": { /* … */ },
  "projectCalendar": {
    "projectStart": "2026-06-01",
    "tasks": [ ProjectTask, … ],
    "lastCpm": { criticalPath: [...], projectDuration: 240, ... },
    "lastCpmAt": "2026-05-26T10:30:00.000Z"
  }
}
```

## Migration Prisma cible (recommandée — non-bloquante MVP)

Quand le module sera promu hors MVP, créer le modèle dédié dans
`prisma/schema.prisma` :

```prisma
enum ProjectPhase {
  ESQ
  APS
  APD
  DCE
  DAO
  MARCHE
  EXEC
  RECEPTION
  GPA
}

enum ProjectTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELED
}

model ProjectTask {
  id                  String              @id @default(cuid())
  dossierId           String
  dossier             Dossier             @relation(fields: [dossierId], references: [id], onDelete: Cascade)

  parentId            String?
  parent              ProjectTask?        @relation("TaskHierarchy", fields: [parentId], references: [id])
  children            ProjectTask[]       @relation("TaskHierarchy")

  numero              String              // WBS, ex "1.2.3"
  titre               String
  description         String?

  phase               ProjectPhase
  startAt             DateTime?
  endAt               DateTime?
  durationDays        Int                 @default(0)
  progressPct         Int                 @default(0)

  isMilestone         Boolean             @default(false)
  isCritical          Boolean             @default(false)

  predecessors        String[]            // array de ProjectTask.id
  resourceUserIds     String[]
  resourceSupplierIds String[]

  status              ProjectTaskStatus   @default(PENDING)
  blockers            Json                @default("[]")

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([dossierId])
  @@index([phase])
  @@index([status])
  @@index([isCritical])
}
```

Migration : `npm run prisma:migrate -- --name project_tasks`.

## Routes front

- `/projet/:dossierId/calendrier` → `ProjectCalendarPage`

Pour intégrer un lien depuis l'espace dossier client (P1, P2, …) :

```tsx
<Link to={`/projet/${dossier.id}/calendrier`}>Planning projet</Link>
```

## Libs

**Aucune lib npm ajoutée.** Le calendrier Hijri est calculé par un
algorithme tabulaire (`gregorianToHijri` dans `project-calendar.api.ts`),
précision ±1 jour acceptable pour un overlay. Si une précision parfaite
est exigée plus tard, ajouter `hijri-converter` (~5 KB) et remplacer
`gregorianToHijri` par son équivalent.

## Allow-list MutationGate

Déjà ajouté dans `apps/api/src/common/guards/mutation-gate.guard.ts` :

```ts
"/api/project-calendar",  // Calendrier projet — tâches, CPM, Gantt (Tome 6)
```

## CPM — Tests rapides

Le fichier `project-calendar.cpm.ts` expose `__cpmSelfTest()` qui vérifie
l'exemple canonique :

```
A(3) ─► B(2) ─► D(4)
  └──► C(5) ─────► D
```

Résultat attendu : `projectDuration = 12`, `criticalPath = [A, C, D]`,
`slack[B] = 3`.

Exécuter manuellement (depuis racine repo) :

```bash
node -e "require('./apps/api/src/tomes/tome-6/project-calendar/project-calendar.cpm').__cpmSelfTest()"
```

(après build TS : `npm --prefix apps/api run build && node -e "console.log(JSON.stringify(require('./apps/api/dist/tomes/tome-6/project-calendar/project-calendar.cpm').__cpmSelfTest(), null, 2))"`)

## Roadmap

1. Migration Prisma `ProjectTask` (schéma dédié → recherche plein-texte, GraphQL).
2. Notifications client/owner lors d'un retard détecté (`replan-cascade`).
3. Export PDF/Excel du planning (utiliser le `ReportRendererService` existant).
4. Diagramme PERT en plus du Gantt (réutiliser `CpmResult.schedule`).
5. Synchronisation Google Calendar / Outlook pour les jalons.
