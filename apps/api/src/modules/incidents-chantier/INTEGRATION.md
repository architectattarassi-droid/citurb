# Integration — Incidents Chantier + Bouton SOS

Module Tome 3 (state machine & verrous chantier). Brahim (chef chantier
terrain) déclare accidents / vols / météo / etc. depuis son mobile et peut
déclencher un SOS multi-canal en HOLD 3-sec.

Périmètre exclusif livré :

```
apps/api/src/modules/incidents-chantier/
  incidents-chantier.module.ts
  incidents-chantier.controller.ts
  incidents-chantier.service.ts
  sos.service.ts
  weather-replan.service.ts
  types.ts
apps/api/data/incidents-chantier/
  emergency-contacts.json
  types-incidents.json
apps/web/src/features/incidents-chantier/
  IncidentsChantierPage.tsx
  DeclarationIncidentForm.tsx
  SOSButton.tsx
  WeatherAlertsCard.tsx
  IncidentDetailModal.tsx
  incidents-chantier.api.ts
```

---

## 1. Routing (web)

Ajouter dans `apps/web/src/application/routes.tsx` (ou équivalent) :

```tsx
import IncidentsChantierPage from "../features/incidents-chantier/IncidentsChantierPage";

// dans le bloc routes
{
  path: "/chantier/:dossierId/incidents",
  element: <IncidentsChantierPage />,
},
```

Routes alternatives utiles (optionnel) :
- `/chantier/:dossierId/incidents/:incidentId` → ouvrir IncidentDetailModal directement

---

## 2. MutationGate allow-list

Ajouter dans `apps/api/src/tomes/tome-at/security/mutation-gate.guard.ts`
(ou fichier équivalent) au tableau d'allow-list :

```ts
"/api/incidents-chantier",
```

Toutes les mutations passent par ce préfixe :
- `POST /api/incidents-chantier/dossier/:id/declarer`
- `POST /api/incidents-chantier/:id/action`
- `POST /api/incidents-chantier/:id/resolve`
- `POST /api/incidents-chantier/:id/sos`
- `POST /api/incidents-chantier/dossier/:id/weather-replan/accept`

---

## 3. Import du module dans `app.module.ts`

```ts
import { IncidentsChantierModule } from "./modules/incidents-chantier/incidents-chantier.module";

@Module({
  imports: [
    // … autres modules …
    IncidentsChantierModule,
  ],
})
export class AppModule {}
```

---

## 4. Clés i18n

Ajouter dans `apps/web/src/i18n/i18n.tsx` (préfixe `inc.`) :

| Clé | FR | EN | AR |
|-----|----|----|----|
| `inc.title` | Incidents chantier | Site incidents | حوادث الورش |
| `inc.declare` | Déclarer un incident | Declare incident | إعلان حادث |
| `inc.tab.active` | Actifs | Active | نشط |
| `inc.tab.resolved` | Résolus | Resolved | محلول |
| `inc.sos.label` | SOS | SOS | إنقاذ |
| `inc.sos.hold` | Maintenir 3 sec pour déclencher | Hold 3s to trigger | اضغط 3 ثوان |
| `inc.sos.fired.title` | SOS DÉCLENCHÉ | SOS TRIGGERED | تم إرسال الإنقاذ |
| `inc.sos.fired.body` | Secours en route. Toutes les parties ont été notifiées. | Help on the way. All parties notified. | المساعدة في الطريق |
| `inc.weather.title` | Prévisions 7 jours | 7-day forecast | توقعات 7 أيام |
| `inc.weather.accept` | Accepter le replan automatique | Accept auto-replan | قبول إعادة الجدولة |
| `inc.form.step1` | Type | Type | النوع |
| `inc.form.step2` | Description | Description | الوصف |
| `inc.form.step3` | Photos | Photos | الصور |
| `inc.form.step4` | Sévérité | Severity | الخطورة |

V1 : les composants utilisent FR direct, branchement i18n à faire dans une
seconde passe (clés stables, prefix `inc.*` réservé).

---

## 5. Env vars (.env)

```bash
# (Optionnel) Open-Meteo : aucune clé requise pour l'offre gratuite
OPENMETEO_API_KEY=

# Ops CITURBAREA — recevoir SMS + emails SOS
OPS_PHONE=+212661362476
OPS_EMAIL=ops@citurbarea.com
```

Variables existantes réutilisées :
- `TWILIO_*` (SMS multi-destinataires SOS)
- `RESEND_API_KEY` ou `SMTP_*` (emails SOS)

---

## 6. Cron jobs

Le service `WeatherReplanService` enregistre automatiquement un cron via
`@Cron("0 6 * * *", { timeZone: "Africa/Casablanca" })`. Pré-requis :
`ScheduleModule.forRoot()` dans `app.module.ts` (déjà présent).

Cron : `0 6 * * *` (06:00 Africa/Casablanca, tous les jours) — fetch
Open-Meteo + replan suggestions + ProbativeLog.

Pour activer la surveillance d'un dossier :
```ts
weatherReplanService.registerDossier({
  dossierId: "doss_xxx",
  geoloc: { lat: 33.57, lng: -7.59 }, // Casablanca
});
```

L'auto-registration est faite à la première déclaration d'incident
géolocalisé (cf. `IncidentsChantierController.declare`).

---

## 7. Migration future (Prisma)

Le service V1 persiste en JSON (`data/incidents-chantier/incidents-chantier-store.json`).
Modèle Prisma recommandé pour la V2 :

```prisma
model IncidentChantier {
  id                       String   @id @default(cuid())
  dossierId                String
  numero                   String   @unique
  type                     String   // IncidentChantierType enum
  description              String
  severite                 String
  status                   String
  photos                   Json
  geoloc                   Json?
  dateConstatation         DateTime
  dateResolution           DateTime?
  blessesNb                Int?
  montantDommageEstimeMad  Float?
  montantIndemniseMad      Float?
  leconApprise             String?
  sosTriggered             Boolean  @default(false)
  sosTriggeredAt           DateTime?
  notifiedParties          Json
  reporterId               String?
  reporterRole             String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
  actions                  IncidentChantierAction[]

  @@index([dossierId])
  @@index([status])
}

model IncidentChantierAction {
  id          String   @id @default(cuid())
  incidentId  String
  ts          DateTime @default(now())
  type        String
  actorId     String?
  actorRole   String?
  payload     Json
  incident    IncidentChantier @relation(fields: [incidentId], references: [id])

  @@index([incidentId])
}
```

Remplacer les méthodes `loadAll`/`saveAll`/`hydrate`/`flush` du service
par des appels Prisma. L'API publique reste identique.

---

## 8. ProbativeLog & Incident kernel

Le module appelle déjà :
- `ProbativeLogService.append({...})` pour chaque incident WARN+,
  pour chaque résolution, pour chaque SOS déclenché.
- `IncidentsService.createFromDoctrinePointer({...})` pour créer une row
  `Incident` (rule_id `T3-R-INC-SOS-001`, category `BYPASS_RISK`,
  severity `CRITICAL`) à chaque SOS.

Aucune action requise côté ops — la traçabilité est complète out of the box.

---

## 9. Sécurité / permissions

Toutes les routes mutations sont gardées par `JwtAuthGuard`. À enrichir
plus tard avec `RolesGuard("CLIENT","OWNER","OPS","ADMIN")` selon le
rôle du déclarant. Les endpoints `meta/*` sont publics (types et contacts
d'urgence).

---

## 10. Tests de fumée (manuel)

```bash
# 1. Lister les types
curl http://localhost:4000/api/incidents-chantier/meta/types | jq

# 2. Déclarer un incident
curl -X POST http://localhost:4000/api/incidents-chantier/dossier/doss_test/declarer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"VOL_CHANTIER","description":"Vol de ciment","severite":"WARN"}'

# 3. Déclencher un SOS
curl -X POST http://localhost:4000/api/incidents-chantier/$INCIDENT_ID/sos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contacts":{"famille":{"tel":"+212600000000","email":"famille@example.com"}}}'

# 4. Météo
curl "http://localhost:4000/api/incidents-chantier/dossier/doss_test/weather-alerts?lat=33.57&lng=-7.59" \
  -H "Authorization: Bearer $TOKEN" | jq
```
