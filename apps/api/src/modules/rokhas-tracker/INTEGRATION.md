# Rokhas Tracker — Guide d'intégration

Module **CITURBAREA** — suivi visuel temps réel de l'instruction d'un permis
de construire au Maroc (circuit Rokhas) avec timeline, deadlines légales
(décret 2-13-424) et levée de réserves.

Distinction avec le module `pv-commission-rokhas` (Tome 2) :

| Module                  | Rôle                                                                |
|-------------------------|---------------------------------------------------------------------|
| `pv-commission-rokhas`  | Parse un PV (PDF) une fois la commission tenue, extrait réserves    |
| **`rokhas-tracker`**    | Suit l'instruction du dépôt à la délivrance, avec deadlines légales |

Les deux modules sont complémentaires : le tracker matérialise l'événement
`DECISION` quand un PV est parsé (via `addEvent({ type: "DECISION", pvId })`).

---

## 1. Activation backend

### 1.a Importer le module dans `app.module.ts`

`apps/api/src/app.module.ts` :

```ts
import { RokhasTrackerModule } from "./modules/rokhas-tracker/rokhas-tracker.module";

@Module({
  imports: [
    // ... existant
    RokhasTrackerModule, // ← ajouter
  ],
})
export class AppModule {}
```

Aucune modification de `tome-2.module.ts` requise — le module vit dans
`apps/api/src/modules/` (au même titre que `pv-chantier`, `archive`, etc.)
pour un cycle de release indépendant.

### 1.b Ajouter à l'allow-list MutationGate

`apps/api/src/common/guards/mutation-gate.guard.ts` — ajouter dans `allow` :

```ts
"/api/rokhas-tracker",
```

### 1.c Variables d'environnement (optionnel — webhook)

À ajouter dans `apps/api/.env` :

```bash
# Webhook entrant Rokhas (signature HMAC X-Rokhas-Signature)
ROKHAS_WEBHOOK_SECRET=change_me_to_a_long_random_secret
```

Si la variable est absente, l'endpoint `/api/rokhas-tracker/webhook`
renvoie `403` (désactivé) — les autres endpoints fonctionnent normalement.

---

## 2. Routes frontend

`apps/web/src/tomes/tome1/router/routes.tsx` — dans `children` du `PublicLayout` :

```tsx
import RokhasTrackerPage from "../../../features/rokhas-tracker/RokhasTrackerPage";

// ...
{ path: "/dossier/:dossierId/rokhas", element: <AdminHostBlock><RokhasTrackerPage /></AdminHostBlock> },
```

---

## 3. Clés i18n (à ajouter dans `apps/web/src/i18n/i18n.tsx`)

```ts
// Rokhas Tracker
"rokhas.page.title":          { fr: "Suivi de votre permis",        ar: "متابعة رخصتك",                 en: "Permit tracking" },
"rokhas.page.subtitle":       { fr: "Catégorie {category}",         ar: "الفئة {category}",            en: "Category {category}" },
"rokhas.status.in_progress":  { fr: "En instruction",                ar: "قيد المعالجة",                en: "Under review" },
"rokhas.status.delivered":    { fr: "Permis délivré",                ar: "تم تسليم الرخصة",             en: "Permit delivered" },
"rokhas.timeline.title":      { fr: "Étapes d'instruction",         ar: "مراحل المعالجة",              en: "Review stages" },
"rokhas.deadline.decision":   { fr: "Décision attendue dans",       ar: "القرار المتوقع خلال",          en: "Decision expected in" },
"rokhas.reserves.title":      { fr: "Réserves à lever",              ar: "التحفظات المراد رفعها",        en: "Reserves to clear" },
"rokhas.reserves.upload":     { fr: "Téléverser preuve",             ar: "تحميل دليل",                 en: "Upload proof" },
"rokhas.adjourned.title":     { fr: "Examen ajourné",                ar: "تأجيل الفحص",                en: "Adjourned review" },
"rokhas.refused.title":       { fr: "Décision défavorable",          ar: "قرار غير موات",              en: "Unfavorable decision" },
"rokhas.refused.appeal":      { fr: "Composer un recours",           ar: "تقديم طعن",                  en: "File an appeal" },
"rokhas.setup.title":         { fr: "Activer le suivi",              ar: "تفعيل المتابعة",              en: "Enable tracking" },
"rokhas.setup.category":      { fr: "Catégorie de projet",           ar: "فئة المشروع",                en: "Project category" },
"rokhas.setup.ref":           { fr: "Référence Rokhas / commune",   ar: "مرجع رخص / البلدية",          en: "Rokhas / town hall ref" },
"rokhas.setup.deposit_date":  { fr: "Date du dépôt",                 ar: "تاريخ الإيداع",              en: "Deposit date" },
```

Les composants utilisent actuellement des libellés FR en dur. Pour
internationaliser : injecter `const t = useT()` puis remplacer chaque
chaîne par `t("rokhas.<key>")`.

---

## 4. Endpoints exposés

| Méthode | Path                                                                       | Auth | Description                                |
|---------|----------------------------------------------------------------------------|------|--------------------------------------------|
| POST    | `/api/rokhas-tracker/dossier/:dossierId/depot`                             | JWT  | Enregistre le dépôt initial                |
| POST    | `/api/rokhas-tracker/dossier/:dossierId/event`                             | JWT  | Ajoute un événement à la timeline          |
| GET     | `/api/rokhas-tracker/dossier/:dossierId`                                   | JWT  | Récupère la vue complète (instance + deadlines + progress) |
| GET     | `/api/rokhas-tracker/dossier/:dossierId/deadlines`                         | JWT  | Liste des deadlines actives                |
| POST    | `/api/rokhas-tracker/dossier/:dossierId/reserve/:reserveId/lever`          | JWT  | Marque une réserve levée (avec preuve doc) |
| POST    | `/api/rokhas-tracker/webhook`                                              | HMAC | Ingestion externe (rokhas.ma)              |

### Bodies

**POST depot**
```json
{ "projectCategory": 1, "refRokhas": "RKH-2026-12345", "date": "2026-05-27" }
```

**POST event** (les types acceptés : voir `types.ts` `RokhasEventType`)
```json
{
  "type": "COMMISSION",
  "date": "2026-06-12",
  "payload": { "communeName": "Casablanca-Anfa" }
}
```

Pour un événement `DECISION` :
```json
{
  "type": "DECISION",
  "date": "2026-06-15",
  "payload": {
    "decision": {
      "type": "FAVORABLE_AVEC_RESERVES",
      "motifsRefus": [],
      "pvId": "pv_abc123"
    },
    "reserves": [
      { "titre": "Modifier façade", "description": "...", "articleLoi": "Art. 12", "severite": "RESERVE" }
    ]
  }
}
```

**POST lever**
```json
{ "preuveDocId": "/uploads/p5-documents/abc.pdf", "preuveUrl": "/uploads/p5-documents/abc.pdf" }
```

---

## 5. Webhook Rokhas

URL publique : `https://api.citurbarea.com/api/rokhas-tracker/webhook`

**Headers** :
- `Content-Type: application/json`
- `X-Rokhas-Timestamp: <epoch ms>`
- `X-Rokhas-Signature: sha256=<hex>`

**Signature** : `HMAC_SHA256(secret, "${timestamp}.${rawJsonBody}")`

**Anti-replay** : timestamp à ±5 min de l'heure serveur.

**Body** :
```json
{
  "dossierId": "ckxyz123",
  "type": "AVIS_SERVICES",
  "date": "2026-06-08",
  "refRokhasCommune": "RKH-2026-12345",
  "extra": { "service": "ONEE", "avis": "FAVORABLE" }
}
```

---

## 6. Modèle de données (MVP — payload Dossier)

L'instance Rokhas est stockée dans `Dossier.payload.rokhasTracker` :

```ts
type RokhasInstance = {
  dossierId: string;
  projectCategory: 1 | 2 | 3;
  depositDate: string;          // ISO
  refRokhasCommune: string | null;
  events: RokhasEvent[];
  decision: RokhasDecision | null;
  reserves: RokhasReserve[];
  delivranceDate: string | null;
  attestationPdfUrl: string | null;
  updatedAt: string;
};
```

### Migration Prisma (recommandée pour Phase 2)

```prisma
enum RokhasProjectCategory { CAT_1 CAT_2 CAT_3 }
enum RokhasDecisionType { FAVORABLE FAVORABLE_AVEC_RESERVES DEFAVORABLE AJOURNE }
enum RokhasReserveSeverite { INFO AVIS RESERVE BLOQUANT }
enum RokhasReserveStatus { OUVERTE EN_COURS LEVEE FORCLOSE }

model RokhasInstance {
  id                String   @id @default(cuid())
  dossierId         String   @unique
  projectCategory   RokhasProjectCategory
  depositDate       DateTime
  refRokhasCommune  String?
  decision          RokhasDecisionType?
  decisionDate      DateTime?
  delivranceDate    DateTime?
  attestationPdfUrl String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  dossier           Dossier  @relation("DossierRokhas", fields: [dossierId], references: [id])
  events            RokhasInstanceEvent[]
  reserves          RokhasInstanceReserve[]
}

model RokhasInstanceEvent {
  id         String   @id @default(cuid())
  instanceId String
  type       String
  date       DateTime
  payload    Json     @default("{}")
  by         String?
  createdAt  DateTime @default(now())
  instance   RokhasInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  @@index([instanceId])
}

model RokhasInstanceReserve {
  id            String   @id @default(cuid())
  instanceId    String
  titre         String
  description   String
  articleLoi    String?
  severite      RokhasReserveSeverite @default(RESERVE)
  deadlineLevee DateTime?
  status        RokhasReserveStatus   @default(OUVERTE)
  preuveDocId   String?
  preuveUrl     String?
  leveeAt       DateTime?
  leveeBy       String?
  createdAt     DateTime @default(now())
  instance      RokhasInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  @@index([instanceId])
  @@index([status])
}
```

Migration :
```bash
npm run prisma:migrate -- --name rokhas_tracker
npm run prisma:generate
```

Après migration, swap `_load` / `_save` dans `rokhas-tracker.service.ts`
pour utiliser `this.prisma.rokhasInstance.*`. Le front est inchangé.

---

## 7. Audit / Compliance

Chaque mutation (DEPOT, EVENT, RESERVE_LEVEE) produit :
- une row `ProbativeLog` (hash chain SHA-256, append-only)
- un patch `Dossier.payload.rokhasTracker.updatedAt`

En cas de décision `DEFAVORABLE` (futur enrichissement), un `Incident` peut
être levé pour escalade OPS.

---

## 8. Tests rapides (cURL)

Enregistrer le dépôt :
```bash
TOKEN="<jwt>"
DOSSIER="ckxyz123"

curl -X POST "http://localhost:4000/api/rokhas-tracker/dossier/$DOSSIER/depot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectCategory":2,"refRokhas":"RKH-2026-99","date":"2026-05-15"}'
```

Ajouter un événement :
```bash
curl -X POST "http://localhost:4000/api/rokhas-tracker/dossier/$DOSSIER/event" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"ACCUSE","date":"2026-05-16"}'
```

Lire la vue complète :
```bash
curl "http://localhost:4000/api/rokhas-tracker/dossier/$DOSSIER" \
  -H "Authorization: Bearer $TOKEN"
```

Lister deadlines :
```bash
curl "http://localhost:4000/api/rokhas-tracker/dossier/$DOSSIER/deadlines" \
  -H "Authorization: Bearer $TOKEN"
```

Lever une réserve :
```bash
curl -X POST "http://localhost:4000/api/rokhas-tracker/dossier/$DOSSIER/reserve/res_xxx/lever" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preuveDocId":"/uploads/p5-documents/abc.pdf"}'
```

---

## 9. Délais légaux (décret 2-13-424)

| Catégorie | Description                                    | Délai décision |
|-----------|------------------------------------------------|----------------|
| 1         | Constructions courantes (R+0, R+1 résidentiel) | 30 jours       |
| 2         | ERP, équipements publics, R+5 et plus          | 60 jours       |
| 3         | Grands projets, dérogations PA                 | 90 jours       |

**Silence administratif** = refus implicite (doctrine DGCL).
**Délai de levée des réserves** : 60 jours après décision.
**Délai de relance après ajournement** : 30 jours.

Tous ces délais sont définis dans `rokhas-delays.ts` (modifiables si la
réglementation évolue).
