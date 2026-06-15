# Module Monitoring & Notifications

Supervision visites (Umami) + notifications instantanées (Email/Telegram) + rapports
quotidien/hebdomadaire. Module NestJS transverse : `apps/api/src/modules/monitoring/`.

| Partie | Contenu | Services |
|--------|---------|----------|
| **B1** | Analytics visites (Umami) + tracking front | `AnalyticsService` |
| **B2** | Notif instantanée nouveau dossier (Email + Telegram) | `NotificationsService`, `TelegramService` |
| **B3** | Rapport quotidien des visites | `ReportsService` |
| **B4** | Rapport hebdo SEO/GEO (visites, crawlabilité, GSC) | `ReportsService`, `CrawlHealthService`, `SearchConsoleService` |

Architecture :
- **Event-driven** : `OwnerNotifyService` ré-émet chaque event sur le bus
  (`owner.<EVENT>`), `NotificationsService` écoute `owner.DOSSIER_CREATED`. La logique
  dossier reste découplée.
- **Email** : réutilise `EmailService` (cascade **Resend → SMTP → log dev**).
- **Jamais bloquant** : chaque canal est en try/catch isolé ; un échec Telegram
  n'empêche pas l'email et inversement, ni la logique métier.
- **Crons configurables + désactivables** individuellement par env.

---

## 1. Déployer Umami sur Railway (3e service + DB dédiée)

1. **Base Postgres dédiée** : Railway → *New → Database → PostgreSQL* (séparée de la
   base applicative). Note son `DATABASE_URL`.
2. **Service Umami** : Railway → *New → Docker Image* →
   `ghcr.io/umami-software/umami:postgresql-latest`. Variables :
   | Variable | Valeur |
   |----------|--------|
   | `DATABASE_URL` | URL de la base Postgres dédiée ci-dessus |
   | `DATABASE_TYPE` | `postgresql` |
   | `APP_SECRET` | chaîne aléatoire (`openssl rand -hex 32`) |
   | `HASH_SALT` | chaîne aléatoire (`openssl rand -hex 32`) |
3. Au premier démarrage, login Umami par défaut : **admin / umami** → changer le mot
   de passe immédiatement.
4. **Créer le site** : Umami → *Settings → Websites → Add website*, nom `citurbarea`,
   domaine `citurbarea.com`. Récupérer le **Website ID** (UUID).
5. **API key** (recommandé) : *Settings → API keys → Create*. Sinon, utiliser le
   couple username/password (option B des variables).

### Activer le tracking front
Le tracking est **cookieless** (aucun bandeau RGPD) et injecté seulement si configuré
au build (sinon aucune balise — pas de 404). Renseigner côté **web** :
```
VITE_UMAMI_SCRIPT_URL=https://<umami>.up.railway.app/script.js
VITE_UMAMI_WEBSITE_ID=<website-id>
# Pour les pages SEO statiques (build-seo.mjs, lues côté Node) :
UMAMI_SCRIPT_URL=https://<umami>.up.railway.app/script.js
UMAMI_WEBSITE_ID=<website-id>
```
Puis **rebuild + commit** le front (`apps/web/dist`) pour propager l'injection :
```bash
npm --prefix apps/web run build
git add apps/web/dist && git commit -m "chore(web): inject Umami tracking"
```
> Tant que ces variables sont vides, le loader gardé ne fait rien (no-op).

---

## 2. Créer le bot Telegram + récupérer le chat_id

1. Ouvrir **@BotFather** sur Telegram → `/newbot` → suivre les étapes → récupérer le
   **token** (`TELEGRAM_BOT_TOKEN`).
2. **Démarrer une conversation** avec le bot (ou l'ajouter à un groupe/canal et y
   poster un message).
3. Récupérer le **chat_id** :
   - simple : parler à **@userinfobot** (renvoie votre id) ;
   - ou : `https://api.telegram.org/bot<token>/getUpdates` → lire
     `result[].message.chat.id` (pour un canal : id négatif type `-100…`).
4. Renseigner :
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=123456789      # fallback : TELEGRAM_ADMIN_CHAT_ID
   ```

---

## 3. Email : Resend ou SMTP

`EmailService` choisit automatiquement le premier provider disponible :
1. **Resend** (recommandé sur Railway, qui bloque le SMTP sortant) :
   ```
   RESEND_API_KEY=re_xxx
   RESEND_FROM=CITURBAREA <noreply@citurbarea.com>
   ```
2. **SMTP** (fallback) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

Destinataire des notifs/rapports : `NOTIFY_EMAIL_TO`
(fallback `OWNER_EMAIL` → `LEAD_NOTIFY_TO` → `ALERT_EMAIL_TO`).

---

## 4. Variables d'environnement (toutes)

Détail complet dans `apps/api/.env.example`. Résumé :

### Umami (B1) — API
```
UMAMI_BASE_URL=            # https://<umami>.up.railway.app (sans slash final)
UMAMI_WEBSITE_ID=          # UUID du site
UMAMI_API_KEY=             # option A (recommandé)
UMAMI_USERNAME= / UMAMI_PASSWORD=   # option B (token renouvelé auto sur 401)
```
### Umami — Front (web / build-seo)
```
VITE_UMAMI_SCRIPT_URL= / VITE_UMAMI_WEBSITE_ID=
UMAMI_SCRIPT_URL= / UMAMI_WEBSITE_ID=
```
### Notifications (B2)
```
NOTIFY_EMAIL_ENABLED=true        # "false" pour couper le canal
NOTIFY_TELEGRAM_ENABLED=true
NOTIFY_EMAIL_TO=
TELEGRAM_BOT_TOKEN= / TELEGRAM_CHAT_ID=
```
### Rapport quotidien (B3)
```
REPORT_DAILY_CRON=0 8 * * *      # TZ Africa/Casablanca
REPORT_DAILY_ENABLED=true
```
### Rapport hebdo SEO/GEO (B4)
```
REPORT_WEEKLY_CRON=0 8 * * 1     # lundi 08:00, TZ Casablanca
REPORT_WEEKLY_ENABLED=true
REPORT_CRAWL_BASE_URL=https://citurbarea.com
REPORT_CRAWL_URLS=               # CSV chemins/URLs serveur-rendus (défaut: home + pages SEO statiques)
# GSC (optionnel, désactivé par défaut)
GSC_ENABLED=false
GSC_SITE_URL=                    # https://citurbarea.com/ ou sc-domain:citurbarea.com
GSC_SERVICE_ACCOUNT_JSON=        # JSON brut ou base64  — OU —
GSC_CLIENT_EMAIL= / GSC_PRIVATE_KEY=
```
> **OPS_BASE_URL** sert à construire le lien « fiche OPS » dans les notifs.

### Search Console (optionnel) — mise en place
1. Google Cloud → activer *Search Console API* → créer un **compte de service** →
   générer une **clé JSON**.
2. Dans Search Console (propriété `citurbarea.com`) → *Paramètres → Utilisateurs et
   autorisations* → ajouter l'email du compte de service (lecture).
3. Renseigner `GSC_ENABLED=true`, `GSC_SITE_URL`, et la clé
   (`GSC_SERVICE_ACCOUNT_JSON` en base64 conseillé sur Railway).

---

## 5. Tests manuels

Tous les endpoints sont protégés (JWT + rôle `OPS`/`OWNER`/`ADMIN`). Récupérer un
token via `/auth/login`, puis :

```bash
API=https://<api>.up.railway.app          # ou http://localhost:4000
TOKEN=<jwt-ops>

# B1 — Analytics (lecture ; défaut 7 derniers jours)
curl -s "$API/api/monitoring/analytics" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/monitoring/analytics?from=2026-06-01&to=2026-06-14" -H "Authorization: Bearer $TOKEN"

# B2 — Notif nouveau dossier : créer un dossier via un tunnel porte (P1..P6)
#   ex. POST /p2/intake  → déclenche owner.DOSSIER_CREATED → Email + Telegram.
#   (idempotent : un même dossierId n'est notifié qu'une fois)

# B3 — Rapport quotidien (veille) → Email + Telegram
curl -s -X POST "$API/api/monitoring/reports/daily/run" -H "Authorization: Bearer $TOKEN"

# B4 — Rapport hebdo SEO/GEO → Email + Telegram
curl -s -X POST "$API/api/monitoring/reports/weekly/run" -H "Authorization: Bearer $TOKEN"
```

Réponses : `{ ok, configured, sent: { email, telegram } }`. Si Umami n'est pas
configuré, `configured:false` (les rapports le signalent sans planter). Le volet
crawlabilité (B4) fonctionne **sans** Umami.

### Checklist de validation finale
- [ ] `GET /api/monitoring/analytics` renvoie des chiffres (Umami configuré).
- [ ] Création d'un dossier de test → **Email + message Telegram** reçus.
- [ ] `POST .../reports/daily/run` → **Email + Telegram** « Rapport visites ».
- [ ] `POST .../reports/weekly/run` → **Email + Telegram** « Hebdo SEO/GEO »
      (score crawlabilité affiché ; GSC présent seulement si `GSC_ENABLED=true`).
