# Mon Parcours — Intégration

Dashboard client unifié : timeline 5 phases (Lead/Manage/Permit/Site/Delivery)
+ next action + paiements + documents + contact expert.

## 1. Backend — wiring `app.module.ts`

Ajouter dans la section **Non-tome modules** de
`apps/api/src/app.module.ts` :

```typescript
import { DossierOverviewModule } from "./modules/dossier-overview/dossier-overview.module";

// imports: [
//   ...
//   DossierOverviewModule,
// ]
```

Aucune migration Prisma requise (lecture seule, agrège depuis modèles
existants : `Dossier` + `RokhasDossier` + `Payment` + `DossierDocument` + `payload`).

### MutationGate

Le contrôleur n'expose **que** `GET /api/dossier-overview/:dossierId`.
Aucune mutation → aucune entrée à ajouter dans l'allow-list.

## 2. Frontend — wiring routes

Ajouter dans `apps/web/src/tomes/tome1/router/routes.tsx` :

```tsx
import MonParcoursPage from "../../../features/mon-parcours/MonParcoursPage";

// dans le tableau de routes (client authentifié) :
{ path: "/mon-parcours/:dossierId", element: <MonParcoursPage /> }
```

Recommandation UX : ajouter un raccourci "Mon Parcours" dans la navigation
client après login (icône : carte / route).

## 3. i18n — clés à ajouter dans `i18n.tsx` (`DICT`)

Toutes les chaînes ci-dessous sont actuellement codées en FR dans les
composants. Pour activer i18n, remplacer chaque chaîne par `t("parcours.xxx")`
et ajouter au dictionnaire :

```typescript
"parcours.title": {
  fr: "Mon Parcours", ar: "مساري", en: "My Journey",
},
"parcours.next_action": {
  fr: "Prochaine action", ar: "الإجراء التالي", en: "Next action",
},
"parcours.deadline": {
  fr: "Échéance", ar: "الموعد النهائي", en: "Deadline",
},
"parcours.contact_expert": {
  fr: "Contacter mon expert", ar: "تواصل مع خبيري", en: "Contact my expert",
},
"parcours.pull_refresh": {
  fr: "Tirez pour actualiser", ar: "اسحب للتحديث", en: "Pull to refresh",
},
"parcours.pull_release": {
  fr: "Relâchez pour actualiser", ar: "أفلت للتحديث", en: "Release to refresh",
},
"parcours.global_progress": {
  fr: "Progression globale", ar: "التقدم الإجمالي", en: "Global progress",
},
"parcours.steps_title": {
  fr: "Mon parcours en 5 étapes", ar: "مساري في 5 مراحل", en: "My journey in 5 steps",
},
"parcours.phase.lead": { fr: "Lead", ar: "تواصل", en: "Lead" },
"parcours.phase.manage": { fr: "Manage", ar: "إدارة", en: "Manage" },
"parcours.phase.permit": { fr: "Permis", ar: "رخصة", en: "Permit" },
"parcours.phase.site": { fr: "Chantier", ar: "ورش", en: "Site" },
"parcours.phase.delivery": { fr: "Réception", ar: "تسليم", en: "Delivery" },
"parcours.status.done": { fr: "Terminé", ar: "منتهي", en: "Done" },
"parcours.status.active": { fr: "En cours", ar: "جاري", en: "Active" },
"parcours.status.pending": { fr: "À venir", ar: "قادم", en: "Pending" },
"parcours.status.blocked": { fr: "Bloqué", ar: "محجوب", en: "Blocked" },
"parcours.payments.title": { fr: "Paiements", ar: "المدفوعات", en: "Payments" },
"parcours.payments.total": { fr: "Total", ar: "الإجمالي", en: "Total" },
"parcours.payments.paid": { fr: "Versé", ar: "مدفوع", en: "Paid" },
"parcours.payments.due": { fr: "À régler", ar: "مستحق", en: "Due" },
"parcours.payments.schedule": { fr: "Échéancier", ar: "الجدول", en: "Schedule" },
"parcours.docs.title": { fr: "Documents clés", ar: "الوثائق الأساسية", en: "Key documents" },
"parcours.docs.empty": {
  fr: "Aucun document disponible pour le moment.",
  ar: "لا توجد وثائق متاحة حاليا.",
  en: "No documents available yet.",
},
"parcours.error.title": {
  fr: "Impossible de charger votre parcours",
  ar: "تعذر تحميل مسارك",
  en: "Unable to load your journey",
},
"parcours.retry": { fr: "Réessayer", ar: "أعد المحاولة", en: "Retry" },
"parcours.last_update": {
  fr: "Dernière mise à jour", ar: "آخر تحديث", en: "Last update",
},
"parcours.all_ok": {
  fr: "Tout est en ordre — votre projet avance comme prévu.",
  ar: "كل شيء على ما يرام — مشروعك يسير وفق الخطة.",
  en: "All clear — your project is on track.",
},
```

## 4. Variables d'environnement (optionnel)

Le service propose un fallback support :

- `OWNER_WHATSAPP_PHONE` : numéro WhatsApp affiché si aucun expert
  n'est assigné au dossier.
- `SUPPORT_EMAIL` : email support de repli.

## 5. Données attendues dans `Dossier.payload`

Le service tolère l'absence de champs (retourne `null/0`), mais lit si présents :

| Clé payload                | Type    | Usage                          |
| -------------------------- | ------- | ------------------------------ |
| `packValidation.status`    | string  | État du pack (Tome 1)          |
| `architectName`            | string  | Architecte assigné             |
| `architectPhone`           | string  | Tel architecte (WhatsApp link) |
| `architectEmail`           | string  | Email architecte               |
| `architectPhoto`           | string  | URL avatar                     |
| `opsContact`               | object  | Contact OPS dédié              |
| `lead.score`               | number  | Score lead 0–100               |
| `lead.source`              | string  | Origine du lead                |
| `lead.firstContactAt`      | ISO     | Date premier contact           |
| `paymentSchedule[]`        | array   | Jalons paiement                |
| `pvChantier[]`             | array   | PV chantier (Tome 2)           |
| `projectCalendar.tasks[]`  | array   | Tâches projet (Tome 6)         |
| `receptionProvisoireAt`    | ISO     | Date réception provisoire      |
| `permisHabiter`            | object  | Statut PH (delivery phase)     |
| `contractSignedAt`         | ISO     | Date signature contrat         |

## 6. Sécurité

- JWT requis (guard `JwtAuthGuard`).
- Seuls le propriétaire du dossier OU un rôle
  `ADMIN`/`SUPER_ADMIN`/`OWNER`/`OPS` peuvent lire l'agrégat.
- Aucun champ doctrine (rule_id, tome_ref, incident_id) n'est exposé.

## 7. Performance

- Une seule requête Prisma (`findUnique` + `include` rokhas/payments/documents/owner).
- Pas de N+1.
- Pas de cache serveur — l'agrégat est rapide (< 50 ms typique).
- Front : pas de polling, refresh manuel via pull-to-refresh.
