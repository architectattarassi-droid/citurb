# Notifications Hub — Intégration

Module **Tome 0** (infra cross-tomes). Dispatch centralisé multi-canal :
EMAIL + SMS + WHATSAPP + PUSH + IN_APP selon préférences user + canal contextuel.

Coexiste avec les modules existants `client-notify`, `owner-notify`, `email`,
`twilio` — il ne les remplace pas (backward compatible).

## 1. Wiring backend

### `apps/api/src/app.module.ts`

Déjà appliqué :

```ts
import { NotificationsHubModule } from "./modules/notifications-hub/notifications-hub.module";

@Module({
  imports: [
    // …
    NotificationsHubModule, // global — dispatch multi-canal centralisé
    // …
  ],
})
```

`NotificationsHubModule` est `@Global()` → injectable partout sans réimport :

```ts
constructor(private readonly hub: NotificationsHubService) {}

await this.hub.dispatch({
  eventType: "PAIEMENT_RECU",
  userId: dossier.ownerId,
  payload: { amount: 1000, currency: "MAD", dossierId, ref: dossier.title },
});
```

### MutationGate

`apps/api/src/common/guards/mutation-gate.guard.ts` : ajout dans l'allow-list :

```ts
"/api/notifications-hub", // Notifications hub centralisé (Tome 0)
```

## 2. Endpoints

Toutes les routes sous `/api/notifications-hub` — JWT obligatoire (sauf `dispatch`
qui est lui-même protégé pour ne pas spammer en interne).

| Méthode | Route                                | Description                              |
|---------|--------------------------------------|------------------------------------------|
| POST    | `/dispatch`                          | Dispatch interne `{eventType,userId,payload}` |
| GET     | `/inbox?unread=true&limit=N`         | Inbox IN_APP de l'utilisateur            |
| POST    | `/:notifId/mark-read`                | Marque lue                                |
| POST    | `/mark-all-read`                     | Tout marquer lu                           |
| GET     | `/preferences`                       | Matrice `eventType × channel` + langue   |
| PATCH   | `/preferences`                       | `{eventType, channel, enabled}`           |
| PATCH   | `/preferences/lang`                  | `{lang: "fr"\|"ar"\|"en"}`                |
| GET     | `/push/vapid-public-key`             | Clé VAPID publique pour `pushManager`    |
| POST    | `/push/subscribe`                    | `{subscription: PushSubscriptionJSON}`   |
| POST    | `/push/unsubscribe`                  | `{endpoint}`                              |
| GET     | `/templates/:eventType?lang=fr`      | Rendu de template (debug)                 |

## 3. Canaux & providers

| Canal     | Provider                                          | Env requises                                                  |
|-----------|---------------------------------------------------|---------------------------------------------------------------|
| EMAIL     | `EmailService` (Resend prioritaire, SMTP fallback)| `RESEND_API_KEY` ou `SMTP_HOST/USER/PASS`                     |
| SMS       | `TwilioService` (Programmable Messaging)          | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`      |
| WHATSAPP  | WhatsApp Business Cloud API + fallback `wa.me`    | `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (opt.)  |
| PUSH      | Web Push VAPID (lib `web-push`)                   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`      |
| IN_APP    | Prisma `Notification` table existante             | (aucune)                                                       |

Chaque canal échoue silencieusement si non configuré (warning log) — le hub
n'interrompt jamais le flux métier.

## 4. Templates

`templates.service.ts` fournit **24 templates** couvrant les events critiques,
chacun en **FR/AR/EN** avec 7 variantes (subject, html, text/SMS, WhatsApp md,
push title+body, in-app title+desc, cta). Variables interpolées via
`{{userName}}`, `{{dossierId}}`, `{{amount}}`, `{{ref}}`, etc.

Event types couverts :
- **Lead** : LEAD_CONTACT_RECU, DOSSIER_CREE, PROFIL_VALIDE
- **Permis** : PERMIS_DEPOSE, PERMIS_COMMISSION_PROGRAMMEE, PERMIS_DECISION_FAVORABLE, PERMIS_DECISION_RESERVES, PERMIS_DECISION_REFUS
- **Chantier** : CHANTIER_DEMARRAGE, PV_CHANTIER_SIGNE, RETARD_DETECTE, BLOCAGE_DECLARE
- **Réception** : RECEPTION_PROVISOIRE_PROGRAMMEE, LIVRAISON_PRETE, GARANTIE_EXPIRE_J30
- **Paiement** : PAIEMENT_RECU, PACK_VALIDE, FACTURE_DISPONIBLE
- **Interactions** : MENTION_INTERACTION, INVITATION_CERCLE, MESSAGE_RECU
- **Sécurité** : OTP_CONNEXION, MOT_DE_PASSE_CHANGE
- **Fallback** : INFO_GENERIQUE

## 5. Préférences utilisateur

Stockées dans `storage/notifications-hub-prefs.json` (zéro migration Prisma).

```json
{
  "<userId>": {
    "lang": "fr",
    "muted": { "PAIEMENT_RECU:SMS": true },
    "pushSubs": [ { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } } ]
  }
}
```

Défaut : **tous les canaux opt-in** pour tous les événements. Seuls les
opt-out explicites sont persistés.

## 6. Frontend

### Routes à ajouter dans `apps/web/src/tomes/tome1/router/routes.tsx`

```tsx
import NotificationsCenterPage from "../../../features/notifications/NotificationsCenterPage";
import NotificationPreferencesPage from "../../../features/notifications/NotificationPreferencesPage";

// dans les children du PublicLayout (ou layout authentifié) :
{ path: "notifications", element: <NotificationsCenterPage /> },
{ path: "parametres/notifications", element: <NotificationPreferencesPage /> },
```

### NotificationBell dans le header

```tsx
import NotificationBell from "../../features/notifications/NotificationBell";

// dans le header (Layout.tsx ou équivalent) :
<NotificationBell />
```

Polling badge toutes les 30 s. Dropdown 10 dernières au clic, lien
"Tout voir" → `/notifications`.

### Push subscribe au load (optionnel)

Dans un wrapper auth (ex. `AuthProvider`) après login réussi :

```tsx
import { ensurePushSubscription } from "./features/notifications/notifications-hub.api";

useEffect(() => {
  if (user) ensurePushSubscription();
}, [user]);
```

UX-friendly : la fonction ne demande la permission qu'une fois. Si refusée,
l'utilisateur peut réactiver depuis `/parametres/notifications`.

### Clés i18n (à ajouter dans `apps/web/src/i18n/i18n.tsx`)

```ts
"notif.title":                  { fr: "Notifications",         ar: "الإشعارات",         en: "Notifications" },
"notif.empty":                  { fr: "Aucune notification",   ar: "لا توجد إشعارات",   en: "No notifications" },
"notif.markAllRead":            { fr: "Tout marquer lu",       ar: "تعليم الكل كمقروء", en: "Mark all read" },
"notif.viewAll":                { fr: "Tout voir",             ar: "عرض الكل",          en: "View all" },
"notif.filter.all":             { fr: "Tous",                  ar: "الكل",              en: "All" },
"notif.filter.unread":          { fr: "Non lus",               ar: "غير مقروءة",        en: "Unread" },
"notif.filter.week":            { fr: "Cette semaine",         ar: "هذا الأسبوع",       en: "This week" },
"notif.filter.important":       { fr: "Important",             ar: "هام",               en: "Important" },
"notif.prefs.title":            { fr: "Préférences notifications", ar: "تفضيلات الإشعارات", en: "Notification preferences" },
"notif.prefs.lang":             { fr: "Langue des notifications",  ar: "لغة الإشعارات",     en: "Notification language" },
"notif.prefs.push.title":       { fr: "Notifications push (navigateur)", ar: "إشعارات الدفع", en: "Push notifications (browser)" },
"notif.prefs.push.activate":    { fr: "Activer",               ar: "تفعيل",             en: "Activate" },
"notif.prefs.push.deactivate":  { fr: "Désactiver",            ar: "تعطيل",             en: "Deactivate" },
```

(Les pages livrées utilisent du français hard-codé en attente d'intégration i18n —
remplacer `"Notifications"`, `"Tous"`, etc. par `t("notif.title")`.)

## 7. Variables d'environnement

```env
# WhatsApp Business Cloud API (optionnel — fallback wa.me si absent)
WHATSAPP_BUSINESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0

# Web Push VAPID (optionnel — push désactivé si absent)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@citurbarea.ma

# Storage (déjà commun à d'autres modules)
STORAGE_DIR=/path/to/storage   # défaut: cwd/storage
```

Générer les clés VAPID :
```bash
npx web-push generate-vapid-keys --json
```

## 8. Dépendance npm (nouvelle)

```bash
npm i web-push
npm i -D @types/web-push
```

Si la lib n'est **pas** installée, le `PushChannel` log un warning et reste no-op
— les autres canaux continuent à fonctionner.

## 9. Service Worker

Pour que Web Push affiche les notifs, le SW doit gérer l'event `push` :

```js
// apps/web/src/sw/sw.ts (ou équivalent)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "CITURBAREA", {
      body: data.body || "",
      icon: data.icon || "/icons/icon.svg",
      badge: data.badge || "/icons/icon.svg",
      data: { url: data.url || "/notifications" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifications";
  event.waitUntil(clients.openWindow(url));
});
```

## 10. Doctrine & rétrocompat

- `@Tome("tome0")` car infra transverse (parallèle à `tome-at/kernel`).
- Pas de mutation hors MutationGate (allow-list mise à jour).
- IN_APP stocké via enum `NotificationType` existant — mapping interne
  (`NOTIFICATION_TYPE_MAP`) pour event hub → enum legacy. Aucun schéma cassé.
- `client-notify`, `owner-notify`, `email`, `twilio` restent en place et
  peuvent migrer progressivement vers `hub.dispatch()`.
