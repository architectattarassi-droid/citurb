# Inventaire des appels du front vers l'ancienne API NestJS (éteinte)

Généré le 2026-10-13 par analyse statique de apps/web/src (appels apiFetch/fetch/api.*). Route « vivante » = servie par une Cloudflare Pages Function de functions/.

Résumé : 363 appels, 11 servis par les Functions, **352 vers l'API morte**.

## Par module (nombre d'appels morts — exemples de routes)

```
  85  features/cercles/api.ts  ::  /api/cercles  /api/cercles/${encodeURIComponent  /api/cercles/:id  /api/cercles/:id/join  /api/cercles/:id/leave  /api/cercles/:id/invitations  (+67)
  38  command-center/modules/dossiers  ::  /p2/categories  /p1/packs/quote  /p2/quote  /p2/dossier/:id/devis  /api/cc/devis  /api/cc/dossiers/admin-create  (+26)
  14  features/reception-conformite/reception-conformite.api.ts  ::  /api/reception/dossier/:id  /api/reception/dossier/:id/garanties  /api/reception/dossier/:id/provisoire  /api/reception/dossier/:id/provisoire/sign  /api/reception/dossier/:id/provisoire/finalize  /api/reception/dossier/:id/leveereserves  (+8)
  13  features/cabinet/api.ts  ::  /api/pro/${encodeURIComponent  /api/pro/me/slug  /api/pro/me/projects  /api/pro/me/projects/:id  /api/pro/me/projects/:id/publish  /api/pro/me/projects/:id/media  (+3)
  13  tomes/tome3/portals/p1  ::  /p2/dossier/:id/client/sous-phases  /p2/dossier/:id/phase/status  /p2/dossier/:id/sous-phases/:id/client-validate  /p2/dossier/:id/sous-phases/:id/client-reject  /p2/dossier/:id/documents  /p2/dossier/:id/disclaimer  (+6)
  11  features/sous-traitants/sous-traitants.api.ts  ::  /api/sous-traitants/catalog/lots  /api/sous-traitants/dossier/:id  /api/sous-traitants/:id  /api/sous-traitants/dossier/:id/assign  /api/sous-traitants/:id/contrat  /api/sous-traitants/:id/contrat/sign  (+5)
  10  features/incidents-chantier/incidents-chantier.api.ts  ::  /api/incidents-chantier/meta/types  /api/incidents-chantier/meta/emergency-contacts  /api/incidents-chantier/dossier/:id  /api/incidents-chantier/:id  /api/incidents-chantier/dossier/:id/declarer  /api/incidents-chantier/:id/action  (+4)
  10  features/livraisons-materiaux/livraisons-materiaux.api.ts  ::  /api/livraisons/dossier/:id  /api/livraisons/dossier/:id/calendar  /api/livraisons/commande/:id  /api/livraisons/commande/:id/audit  /api/livraisons/commande  /api/livraisons/commande/:id/confirm-supplier  (+4)
   9  features/notifications/notifications-hub.api.ts  ::  /api/notifications-hub/inbox  /api/notifications-hub/${encodeURIComponent  /api/notifications-hub/mark-all-read  /api/notifications-hub/preferences  /api/notifications-hub/preferences/lang  /api/notifications-hub/push/vapid-public-key  (+2)
   8  features/pv-chantier/pv-chantier.api.ts  ::  /api/pv-chantier/dossier/:id  /api/pv-chantier/compliance/:id  /api/pv-chantier/:id  /api/pv-chantier/:id/sign  /api/pv-chantier/:id/finalize  /api/pv-chantier/:id/photos
   7  features/dossier-interactions/dossier-interactions.api.ts  ::  /api/dossier/${encodeURIComponent  /api/me/mentions
   7  features/permis-construire/permis-construire.api.ts  ::  /dossier/${encodeURIComponent
   7  tomes/tome4/apiClient.ts  ::  /auth/login  /auth/me  /p1/packs/email/request  /p1/packs/email/verify  /p1/packs/sms/request  /p1/packs/sms/verify  (+1)
   6  features/documents-repo/documents-repo.api.ts  ::  /api/documents-repo/dossier/:id  /api/documents-repo/:id  /api/documents-repo/:id/verifyX  /api/documents-repo/:id/sign  /api/documents-repo/:id/request-signature
   6  features/materials/materials.api.ts  ::  /api/materials/catalogX  /api/materials/catalog/search  /api/materials/${encodeURIComponent  /api/materials/index/citurbarea
   6  tomes/tome3/portals/p6  ::  /p2/dossier/ops/all  /p6/suppliers/:id/catalog/manage  /p6/suppliers/:id/catalog/:id  /p6/suppliers/:id/catalog  /p6/scoring
   5  command-center/modules/firms  ::  /firms  /firms/:id/users  /firms/:id/dossiers  /firms/:id/users/${assignUserId.trim
   5  command-center/modules/validations  ::  /api/cc/pack-validation/pending  /api/cc/p6-review/pending  /api/cc/pack-validation/:id/validate  /api/cc/p6-review/:id/verify  /api/cc/p6-review/:id/blacklist
   5  features/cps-generator/CpsGeneratorPage.tsx  ::  /api/cps/project-types  /api/cps/generate  /api/cps/bordereau-chiffre  /api/cps/marketplace/match  /api/livraisons/commande
   5  features/cps-generator/DossierCpsPage.tsx  ::  /api/cps/project-types  /api/cps/dossier/:id/signatures  /api/cps/dossier/:id/generate  /api/cps/dossier/:id/sign
   5  features/rokhas-tracker/rokhas-tracker.api.ts  ::  /api/rokhas-tracker/dossier/${encodeURIComponent
   5  tomes/tome2/RokhasClientPortal.tsx  ::  /p2/dossier/:id/rokhas/client-data  /p2/dossier/:id/rokhas/saisie  /p2/dossier/:id/rokhas/client-submit  /p2/dossier/:id/rokhas/esign
   5  tomes/tome3/portals/p5  ::  /api/sig/dgi-zones/:id  /api/sig/dgi-zones-geo/X.geojson  /api/sig/auto-detect-zone
   4  command-center/modules/archive  ::  /api/cc/archive/dossier/:id/full  /api/cc/archive/facets  /api/cc/archive/search  /api/cc/archive/vault
   4  features/pv-commission/pv-commission.api.ts  ::  /api/pv-commission/dossier/${encodeURIComponent  /api/pv-commission/${encodeURIComponent
   4  tomes/tome3/portals/payment  ::  /api/payment/methods/info  /api/payment/checkout-session/:id  /api/payment/declare-manual/:id  /api/payment/session/:id/status
   3  command-center/modules/inscrits  ::  /api/cc/inscrits  /api/cc/inscrits/:id/verify  /api/cc/inscrits/:id/deactivate
   3  features/geo/AdminLocationSelect.tsx  ::  /api/sig/admin/regions  /api/sig/admin/provinces  /api/sig/admin/communes
   3  features/geo/SigExplorer.tsx  ::  /p2/dossier  /api/sig/sources  /api/sig/references
   3  tomes/tome3/portals/p2  ::  /p2/simulate  /p2/categories  /p2/quote
   3  tomes/tome5/pages/SignupSMS.tsx  ::  /api/auth/signup  /api/auth/verify-sms  /api/auth/resend-sms
   2  command-center/layout  ::  /api/cc/snapshot/current  /api/admin/bridge/to-user
   2  command-center/modules/ads  ::  /api/ads/admin  /api/ads/admin/:id
   2  command-center/modules/dashboard  ::  /api/cc/snapshot/current  /api/cc/media
   2  features/chef-copilote/CopiloteChantierPage.tsx  ::  /api/chef-copilote/suggestions/:id  /api/chef-copilote/ask
   2  features/media/ArticleDetailPage.tsx  ::  /api/articles/mine/:id  /api/articles/slug/${encodeURIComponent
   2  tomes/tome2/RokhasPhaseTimeline.tsx  ::  /p2/dossier/:id/rokhas/documents/:id/validate  /p2/dossier/:id/rokhas/documents/:id/send
   2  tomes/tome5/AuthProvider.tsx  ::  /auth/send-otp  /auth/verify-otp
   2  tomes/tome5/pages/ClientSignup.tsx  ::  /auth/email-signup  /auth/client-signup/confirm
   2  tomes/tome5/pages/ForgotPassword.tsx  ::  /auth/password-reset/request  /auth/password-reset/confirm
   1  command-center/modules/business  ::  /p2/dossier/ops/all
   1  command-center/modules/projects  ::  /p2/dossier/ops/all
   1  command-center/modules/territorial  ::  /p2/dossier/ops/all
   1  command-center/modules/visitors  ::  /api/analytics-hub/visitors
   1  command-center/pages  ::  /p2/dossier/ops/all
   1  components/error-boundary  ::  /api/telemetry/client-error
   1  context/FirmContext.tsx  ::  /firms/:id
   1  features/analytics/MetricsDashboardPage.tsx  ::  /api/analytics-hub/dashboard
   1  features/cercles/CercleChatPage.tsx  ::  /auth/me
   1  features/cercles/ProfilePage.tsx  ::  /auth/me
   1  features/dossier-phases/useDossierPhases.ts  ::  /api/dossier/:id/phases
   1  features/geo/MapPicker.tsx  ::  /api/sig/maroc-admin/X.geojson
   1  features/geo/MohafadatiUpload.tsx  ::  /p5/documents/upload
   1  features/mandataires-registry/MandataireSearchPage.tsx  ::  /api/mandataires/search
   1  features/mon-parcours/mon-parcours.api.ts  ::  /api/dossier-overview/:id
   1  features/opci-tokenise/OpciOfferingsPage.tsx  ::  /api/opci-tokenise/offerings
   1  features/zillow-ma/EstimationPage.tsx  ::  /api/zillow-ma/estimation
   1  lib/web-vitals.ts  ::  /api/telemetry/vitals
   1  tomes/tome5/components/ClientProfileBanner.tsx  ::  /p2/dossier
   1  tomes/tome5/pages/ConfirmEmail.tsx  ::  /auth/email-signup/confirm
   1  tomes/tome5/pages/Login.tsx  ::  /api/cercles/me/profile
   1  tomes/tome5/pages/Signup.tsx  ::  /auth/register
```

## Détail (fichier:ligne → route)

- command-center/layout/CCKpiBar.tsx:44 → /api/cc/snapshot/current
- command-center/layout/CCLayout.tsx:100 → /api/admin/bridge/to-user
- command-center/modules/ads/AdsModule.tsx:35 → /api/ads/admin
- command-center/modules/ads/AdsModule.tsx:47 → /api/ads/admin/X
- command-center/modules/archive/ArchiveDossierView.tsx:64 → /api/cc/archive/dossier/X/full
- command-center/modules/archive/ArchiveModule.tsx:107 → /api/cc/archive/facets
- command-center/modules/archive/ArchiveModule.tsx:119 → /api/cc/archive/search
- command-center/modules/archive/ArchiveVault.tsx:61 → /api/cc/archive/vault
- command-center/modules/business/BusinessModule.tsx:25 → /p2/dossier/ops/all
- command-center/modules/dashboard/CCDashboard.tsx:37 → /api/cc/snapshot/current
- command-center/modules/dashboard/CCDashboard.tsx:38 → /api/cc/media
- command-center/modules/dossiers/CostEngine.tsx:57 → /p2/categories
- command-center/modules/dossiers/CostEngine.tsx:64 → /p1/packs/quote
- command-center/modules/dossiers/CostEngine.tsx:89 → /p2/quote
- command-center/modules/dossiers/DevisEditor.tsx:72 → /p2/dossier/X/devis
- command-center/modules/dossiers/DevisEditor.tsx:101 → /p2/dossier/X/devis
- command-center/modules/dossiers/DevisLibre.tsx:55 → /api/cc/devis
- command-center/modules/dossiers/DevisLibre.tsx:79 → /api/cc/devis
- command-center/modules/dossiers/DossierAdminCreate.tsx:82 → /api/cc/dossiers/admin-create
- command-center/modules/dossiers/DossierDetail.tsx:159 → /p2/dossier/X/phase/X/message
- command-center/modules/dossiers/DossierDetail.tsx:333 → /p2/dossier/ops/X
- command-center/modules/dossiers/DossierDetail.tsx:348 → /p2/dossier/X/phase/X/detail
- command-center/modules/dossiers/DossierDetail.tsx:357 → /p2/dossier/X/phase/X/action
- command-center/modules/dossiers/DossierDetail.tsx:385 → /p2/dossier/X/phase/X/detail
- command-center/modules/dossiers/DossierPhaseTimeline.tsx:46 → /p2/dossier/X/phase/status
- command-center/modules/dossiers/DossierShadowView.tsx:41 → /p2/dossier/X/complet
- command-center/modules/dossiers/DossierShadowView.tsx:70 → /p2/dossier/X/admin/unblock
- command-center/modules/dossiers/DossierShadowView.tsx:74 → /p2/dossier/X/admin/patch
- command-center/modules/dossiers/DossierShadowView.tsx:78 → /p2/dossier/X/admin/patch
- command-center/modules/dossiers/DossierShadowView.tsx:362 → /p2/dossier/X/sous-phases/X/X
- command-center/modules/dossiers/DossierShadowView.tsx:573 → /api/cc/pack-validation/X
- command-center/modules/dossiers/DossierShadowView.tsx:583 → /api/cc/pack-validation/X/mark-paid
- command-center/modules/dossiers/DossierShadowView.tsx:595 → /api/cc/pack-validation/X/validate
- command-center/modules/dossiers/DossierShadowView.tsx:609 → /api/cc/pack-validation/X/revoke
- command-center/modules/dossiers/DossierShadowView.tsx:840 → /api/cc/dossiers/X/notify-report-ready
- command-center/modules/dossiers/DossierShadowView.tsx:989 → /p2/dossiers/X/visa-croa
- command-center/modules/dossiers/DossierShadowView.tsx:1012 → /p2/dossiers/X/visa-croa
- command-center/modules/dossiers/DossierShadowView.tsx:1138 → /api/cc/drive/status
- command-center/modules/dossiers/DossierShadowView.tsx:1144 → /api/cc/drive/connect
- command-center/modules/dossiers/DossierShadowView.tsx:1156 → /api/cc/drive/mirror/X
- command-center/modules/dossiers/DossiersModule.tsx:103 → /p2/dossier/ops/all
- command-center/modules/dossiers/DossiersModule.tsx:118 → /p2/dossier/X/documents
- command-center/modules/dossiers/DossiersModule.tsx:130 → /p2/dossier/X/payments
- command-center/modules/dossiers/DossiersModule.tsx:140 → /p3/dossier/X/transition
- command-center/modules/dossiers/DossiersModule.tsx:163 → /p3/dossier/X/transition
- command-center/modules/dossiers/DossiersModule.tsx:178 → /api/cc/dossiers/X/invite
- command-center/modules/dossiers/ProjectMilestonesTimeline.tsx:34 → /p2/project/X/milestones
- command-center/modules/dossiers/ProjectMilestonesTimeline.tsx:48 → /p2/project/X/milestones/X/advance
- command-center/modules/dossiers/ProjectMilestonesTimeline.tsx:68 → /p2/project/X/milestones/init
- command-center/modules/firms/FirmsModule.tsx:35 → /firms
- command-center/modules/firms/FirmsModule.tsx:45 → /firms/X/users
- command-center/modules/firms/FirmsModule.tsx:46 → /firms/X/dossiers
- command-center/modules/firms/FirmsModule.tsx:53 → /firms/X/users/${assignUserId.trim
- command-center/modules/firms/FirmsModule.tsx:64 → /firms
- command-center/modules/inscrits/InscritsModule.tsx:78 → /api/cc/inscrits
- command-center/modules/inscrits/InscritsModule.tsx:113 → /api/cc/inscrits/X/verify
- command-center/modules/inscrits/InscritsModule.tsx:134 → /api/cc/inscrits/X/deactivate
- command-center/modules/projects/ProjectsModule.tsx:51 → /p2/dossier/ops/all
- command-center/modules/territorial/TerritorialModule.tsx:21 → /p2/dossier/ops/all
- command-center/modules/validations/ValidationsModule.tsx:74 → /api/cc/pack-validation/pending
- command-center/modules/validations/ValidationsModule.tsx:75 → /api/cc/p6-review/pending
- command-center/modules/validations/ValidationsModule.tsx:124 → /api/cc/pack-validation/X/validate
- command-center/modules/validations/ValidationsModule.tsx:192 → /api/cc/p6-review/X/verify
- command-center/modules/validations/ValidationsModule.tsx:202 → /api/cc/p6-review/X/blacklist
- command-center/modules/visitors/VisitorsModule.tsx:40 → /api/analytics-hub/visitors
- command-center/pages/OwnerLive.tsx:43 → /p2/dossier/ops/all
- components/error-boundary/GlobalErrorBoundary.tsx:77 → /api/telemetry/client-error
- context/FirmContext.tsx:23 → /firms/X
- features/analytics/MetricsDashboardPage.tsx:27 → /api/analytics-hub/dashboard
- features/cabinet/api.ts:86 → /api/pro/${encodeURIComponent
- features/cabinet/api.ts:88 → /api/pro/${encodeURIComponent
- features/cabinet/api.ts:92 → /api/pro/${encodeURIComponent
- features/cabinet/api.ts:98 → /api/pro/me/slug
- features/cabinet/api.ts:99 → /api/pro/me/projects
- features/cabinet/api.ts:101 → /api/pro/me/projects
- features/cabinet/api.ts:103 → /api/pro/me/projects/X
- features/cabinet/api.ts:105 → /api/pro/me/projects/X
- features/cabinet/api.ts:107 → /api/pro/me/projects/X/publish
- features/cabinet/api.ts:109 → /api/pro/me/projects/X/media
- features/cabinet/api.ts:111 → /api/pro/me/projects/X/media/X
- features/cabinet/api.ts:113 → /api/pro/me/projects/X/media/reorder
- features/cabinet/api.ts:117 → /uploads/presign
- features/cercles/api.ts:224 → /api/cercles
- features/cercles/api.ts:228 → /api/cercles/${encodeURIComponent
- features/cercles/api.ts:230 → /api/cercles
- features/cercles/api.ts:232 → /api/cercles/X
- features/cercles/api.ts:235 → /api/cercles/X/join
- features/cercles/api.ts:236 → /api/cercles/X/leave
- features/cercles/api.ts:238 → /api/cercles/X/invitations
- features/cercles/api.ts:240 → /api/cercles/X/members
- features/cercles/api.ts:244 → /api/cercles/X/posts
- features/cercles/api.ts:248 → /api/cercles/X/posts/X
- features/cercles/api.ts:254 → /api/cercles/X/posts
- features/cercles/api.ts:276 → /api/cercles/X/posts/X/replies
- features/cercles/api.ts:278 → /api/cercles/X/posts/X/upvote
- features/cercles/api.ts:283 → /api/cercles/X/posts/X/pin
- features/cercles/api.ts:287 → /api/feed
- features/cercles/api.ts:291 → /api/feed/posts
- features/cercles/api.ts:293 → /api/feed/posts/X
- features/cercles/api.ts:295 → /api/cercles/X/posts/X
- features/cercles/api.ts:297 → /api/feed/posts/X
- features/cercles/api.ts:299 → /api/feed/posts/X/upvote
- features/cercles/api.ts:303 → /api/feed/posts/X/replies
- features/cercles/api.ts:305 → /api/feed/public
- features/cercles/api.ts:309 → /api/feed/public/X
- features/cercles/api.ts:320 → /api/feed/posts/X
- features/cercles/api.ts:324 → /api/cercles/X/rooms
- features/cercles/api.ts:326 → /api/cercles/X/rooms
- features/cercles/api.ts:328 → /api/cercles/X/rooms/X/start
- features/cercles/api.ts:330 → /api/cercles/X/rooms/X/end
- features/cercles/api.ts:332 → /api/cercles/X/rooms/X/join
- features/cercles/api.ts:335 → /api/cercles/feed
- features/cercles/api.ts:336 → /api/cercles/discovery
- features/cercles/api.ts:339 → /api/cercles/annuaire/facets
- features/cercles/api.ts:343 → /api/cercles/annuaire/search
- features/cercles/api.ts:345 → /api/cercles/annuaire/suggestions
- features/cercles/api.ts:346 → /api/cercles/me/profile
- features/cercles/api.ts:347 → /api/cercles/me/profile
- features/cercles/api.ts:348 → /api/cercles/profile/X
- features/cercles/api.ts:349 → /api/cercles/profile/X/cercles
- features/cercles/api.ts:350 → /api/cercles/profile/X/posts
- features/cercles/api.ts:351 → /api/cercles/profile/X/rooms
- features/cercles/api.ts:354 → /api/cercles/connections/X
- features/cercles/api.ts:355 → /api/cercles/connections/X/accept
- features/cercles/api.ts:356 → /api/cercles/connections/X/reject
- features/cercles/api.ts:357 → /api/cercles/connections
- features/cercles/api.ts:358 → /api/cercles/connections/pending
- features/cercles/api.ts:416 → /api/cercles/X/messages${qs
- features/cercles/api.ts:422 → /api/cercles/X/messages
- features/cercles/api.ts:428 → /api/cercles/X/messages/X
- features/cercles/api.ts:434 → /api/cercles/X/messages/X
- features/cercles/api.ts:440 → /api/cercles/X/messages/X/reactions
- features/cercles/api.ts:446 → /api/cercles/X/messages/read
- features/cercles/api.ts:452 → /api/cercles/X/messages/search
- features/cercles/api.ts:457 → /api/cercles/X/messages/typing
- features/cercles/api.ts:547 → /api/cercles/${encodeURIComponent
- features/cercles/api.ts:550 → /api/cercles/X/apply
- features/cercles/api.ts:556 → /api/cercles/X/my-application
- features/cercles/api.ts:559 → /api/cercles/applications/X
- features/cercles/api.ts:562 → /api/cercles/X/applications${status
- features/cercles/api.ts:567 → /api/cercles/applications/X/approve
- features/cercles/api.ts:573 → /api/cercles/applications/X/reject
- features/cercles/api.ts:579 → /api/cercles/X/cotisation/X/mark-paid
- features/cercles/api.ts:589 → /api/cercles/X/invite-email
- features/cercles/api.ts:595 → /api/cercles/X/invitations
- features/cercles/api.ts:598 → /api/cercles/invitations/lookup
- features/cercles/api.ts:635 → /api/cercles/public/signup
- features/cercles/api.ts:663 → /api/cercles/invitations/signup
- features/cercles/api.ts:732 → /api/dm/threads
- features/cercles/api.ts:735 → /api/dm/threads
- features/cercles/api.ts:745 → /api/dm/threads/X/messagesX
- features/cercles/api.ts:749 → /api/dm/threads/X/messages
- features/cercles/api.ts:755 → /api/dm/threads/X/read
- features/cercles/api.ts:758 → /api/dm/threads/X/pin
- features/cercles/api.ts:761 → /api/dm/threads/X
- features/cercles/api.ts:764 → /api/dm/threads/X/messages/X
- features/cercles/api.ts:767 → /api/dm/unread
- features/cercles/api.ts:834 → /api/marketplace/meta
- features/cercles/api.ts:837 → /api/marketplace/taxonomy
- features/cercles/api.ts:845 → /api/marketplace/products${qs.toString
- features/cercles/api.ts:851 → /api/marketplace/products/X
- features/cercles/api.ts:859 → /api/marketplace/my-offers
- features/cercles/api.ts:864 → /api/marketplace/offers
- features/cercles/api.ts:867 → /api/marketplace/offers/X
- features/cercles/api.ts:870 → /api/marketplace/offers/X
- features/cercles/api.ts:879 → /api/marketplace/admin/famille-photo
- features/cercles/api.ts:884 → /api/marketplace/admin/populate-photos
- features/cercles/CercleChatPage.tsx:71 → /auth/me
- features/cercles/ProfilePage.tsx:81 → /auth/me
- features/chef-copilote/CopiloteChantierPage.tsx:24 → /api/chef-copilote/suggestions/X
- features/chef-copilote/CopiloteChantierPage.tsx:36 → /api/chef-copilote/ask
- features/cps-generator/CpsGeneratorPage.tsx:54 → /api/cps/project-types
- features/cps-generator/CpsGeneratorPage.tsx:66 → /api/cps/generate
- features/cps-generator/CpsGeneratorPage.tsx:76 → /api/cps/bordereau-chiffre
- features/cps-generator/CpsGeneratorPage.tsx:88 → /api/cps/marketplace/match
- features/cps-generator/CpsGeneratorPage.tsx:124 → /api/livraisons/commande
- features/cps-generator/DossierCpsPage.tsx:32 → /api/cps/project-types
- features/cps-generator/DossierCpsPage.tsx:37 → /api/cps/dossier/X/signatures
- features/cps-generator/DossierCpsPage.tsx:49 → /api/cps/dossier/X/generate
- features/cps-generator/DossierCpsPage.tsx:62 → /api/cps/dossier/X/signatures
- features/cps-generator/DossierCpsPage.tsx:66 → /api/cps/dossier/X/sign
- features/documents-repo/documents-repo.api.ts:147 → /api/documents-repo/dossier/X
- features/documents-repo/documents-repo.api.ts:152 → /api/documents-repo/X
- features/documents-repo/documents-repo.api.ts:156 → /api/documents-repo/X/verifyX
- features/documents-repo/documents-repo.api.ts:195 → /api/documents-repo/X
- features/documents-repo/documents-repo.api.ts:207 → /api/documents-repo/X/sign
- features/documents-repo/documents-repo.api.ts:218 → /api/documents-repo/X/request-signature
- features/dossier-interactions/dossier-interactions.api.ts:97 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:163 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:173 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:181 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:191 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:201 → /api/dossier/${encodeURIComponent
- features/dossier-interactions/dossier-interactions.api.ts:212 → /api/me/mentions
- features/dossier-phases/useDossierPhases.ts:89 → /api/dossier/X/phases
- features/geo/AdminLocationSelect.tsx:71 → /api/sig/admin/regions
- features/geo/AdminLocationSelect.tsx:86 → /api/sig/admin/provinces
- features/geo/AdminLocationSelect.tsx:97 → /api/sig/admin/communes
- features/geo/MapPicker.tsx:810 → /api/sig/maroc-admin/X.geojson
- features/geo/MohafadatiUpload.tsx:50 → /p5/documents/upload
- features/geo/SigExplorer.tsx:134 → /p2/dossier
- features/geo/SigExplorer.tsx:144 → /api/sig/sources
- features/geo/SigExplorer.tsx:155 → /api/sig/references
- features/incidents-chantier/incidents-chantier.api.ts:177 → /api/incidents-chantier/meta/types
- features/incidents-chantier/incidents-chantier.api.ts:181 → /api/incidents-chantier/meta/emergency-contacts
- features/incidents-chantier/incidents-chantier.api.ts:186 → /api/incidents-chantier/dossier/X
- features/incidents-chantier/incidents-chantier.api.ts:190 → /api/incidents-chantier/X
- features/incidents-chantier/incidents-chantier.api.ts:194 → /api/incidents-chantier/dossier/X/declarer
- features/incidents-chantier/incidents-chantier.api.ts:202 → /api/incidents-chantier/X/action
- features/incidents-chantier/incidents-chantier.api.ts:214 → /api/incidents-chantier/X/resolve
- features/incidents-chantier/incidents-chantier.api.ts:219 → /api/incidents-chantier/X/sos
- features/incidents-chantier/incidents-chantier.api.ts:233 → /api/incidents-chantier/dossier/X/weather-alertsX
- features/incidents-chantier/incidents-chantier.api.ts:238 → /api/incidents-chantier/dossier/X/weather-replan/accept
- features/livraisons-materiaux/livraisons-materiaux.api.ts:118 → /api/livraisons/dossier/X
- features/livraisons-materiaux/livraisons-materiaux.api.ts:123 → /api/livraisons/dossier/X/calendar
- features/livraisons-materiaux/livraisons-materiaux.api.ts:128 → /api/livraisons/commande/X
- features/livraisons-materiaux/livraisons-materiaux.api.ts:133 → /api/livraisons/commande/X/audit
- features/livraisons-materiaux/livraisons-materiaux.api.ts:136 → /api/livraisons/commande
- features/livraisons-materiaux/livraisons-materiaux.api.ts:139 → /api/livraisons/commande/X/confirm-supplier
- features/livraisons-materiaux/livraisons-materiaux.api.ts:145 → /api/livraisons/commande/X/reject-supplier
- features/livraisons-materiaux/livraisons-materiaux.api.ts:151 → /api/livraisons/commande/X/livraison-prete
- features/livraisons-materiaux/livraisons-materiaux.api.ts:157 → /api/livraisons/commande/X/reception
- features/livraisons-materiaux/livraisons-materiaux.api.ts:166 → /api/livraisons/commande/X/anomalie
- features/mandataires-registry/MandataireSearchPage.tsx:30 → /api/mandataires/search
- features/materials/materials.api.ts:80 → /api/materials/catalogX
- features/materials/materials.api.ts:85 → /api/materials/catalog/search
- features/materials/materials.api.ts:89 → /api/materials/${encodeURIComponent
- features/materials/materials.api.ts:93 → /api/materials/${encodeURIComponent
- features/materials/materials.api.ts:97 → /api/materials/index/citurbarea
- features/materials/materials.api.ts:104 → /api/materials/${encodeURIComponent
- features/media/ArticleDetailPage.tsx:129 → /api/articles/mine/X
- features/media/ArticleDetailPage.tsx:152 → /api/articles/slug/${encodeURIComponent
- features/mon-parcours/mon-parcours.api.ts:80 → /api/dossier-overview/X
- features/notifications/notifications-hub.api.ts:77 → /api/notifications-hub/inbox
- features/notifications/notifications-hub.api.ts:83 → /api/notifications-hub/${encodeURIComponent
- features/notifications/notifications-hub.api.ts:91 → /api/notifications-hub/mark-all-read
- features/notifications/notifications-hub.api.ts:100 → /api/notifications-hub/preferences
- features/notifications/notifications-hub.api.ts:106 → /api/notifications-hub/preferences
- features/notifications/notifications-hub.api.ts:115 → /api/notifications-hub/preferences/lang
- features/notifications/notifications-hub.api.ts:126 → /api/notifications-hub/push/vapid-public-key
- features/notifications/notifications-hub.api.ts:135 → /api/notifications-hub/push/subscribe
- features/notifications/notifications-hub.api.ts:144 → /api/notifications-hub/push/unsubscribe
- features/opci-tokenise/OpciOfferingsPage.tsx:19 → /api/opci-tokenise/offerings
- features/permis-construire/permis-construire.api.ts:142 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:149 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:161 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:176 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:185 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:192 → /dossier/${encodeURIComponent
- features/permis-construire/permis-construire.api.ts:202 → /dossier/${encodeURIComponent
- features/pv-chantier/pv-chantier.api.ts:109 → /api/pv-chantier/dossier/X
- features/pv-chantier/pv-chantier.api.ts:114 → /api/pv-chantier/compliance/X
- features/pv-chantier/pv-chantier.api.ts:117 → /api/pv-chantier/X
- features/pv-chantier/pv-chantier.api.ts:120 → /api/pv-chantier/dossier/X
- features/pv-chantier/pv-chantier.api.ts:126 → /api/pv-chantier/X
- features/pv-chantier/pv-chantier.api.ts:132 → /api/pv-chantier/X/sign
- features/pv-chantier/pv-chantier.api.ts:138 → /api/pv-chantier/X/finalize
- features/pv-chantier/pv-chantier.api.ts:146 → /api/pv-chantier/X/photos
- features/pv-commission/pv-commission.api.ts:68 → /api/pv-commission/dossier/${encodeURIComponent
- features/pv-commission/pv-commission.api.ts:74 → /api/pv-commission/${encodeURIComponent
- features/pv-commission/pv-commission.api.ts:99 → /api/pv-commission/${encodeURIComponent
- features/pv-commission/pv-commission.api.ts:108 → /api/pv-commission/${encodeURIComponent
- features/reception-conformite/reception-conformite.api.ts:169 → /api/reception/dossier/X
- features/reception-conformite/reception-conformite.api.ts:172 → /api/reception/dossier/X/garanties
- features/reception-conformite/reception-conformite.api.ts:178 → /api/reception/dossier/X/provisoire
- features/reception-conformite/reception-conformite.api.ts:184 → /api/reception/dossier/X/provisoire/sign
- features/reception-conformite/reception-conformite.api.ts:190 → /api/reception/dossier/X/provisoire/finalize
- features/reception-conformite/reception-conformite.api.ts:203 → /api/reception/dossier/X/leveereserves
- features/reception-conformite/reception-conformite.api.ts:210 → /api/reception/dossier/X/definitive
- features/reception-conformite/reception-conformite.api.ts:216 → /api/reception/dossier/X/definitive/sign
- features/reception-conformite/reception-conformite.api.ts:222 → /api/reception/dossier/X/definitive/finalize
- features/reception-conformite/reception-conformite.api.ts:229 → /api/reception/dossier/X/demande-permis-habiter
- features/reception-conformite/reception-conformite.api.ts:242 → /api/reception/dossier/X/visite-conformite
- features/reception-conformite/reception-conformite.api.ts:252 → /api/reception/dossier/X/certificat-conformite
- features/reception-conformite/reception-conformite.api.ts:264 → /api/reception/dossier/X/sinistre
- features/reception-conformite/reception-conformite.api.ts:276 → /api/reception/dossier/X/photos
- features/rokhas-tracker/rokhas-tracker.api.ts:92 → /api/rokhas-tracker/dossier/${encodeURIComponent
- features/rokhas-tracker/rokhas-tracker.api.ts:98 → /api/rokhas-tracker/dossier/${encodeURIComponent
- features/rokhas-tracker/rokhas-tracker.api.ts:107 → /api/rokhas-tracker/dossier/${encodeURIComponent
- features/rokhas-tracker/rokhas-tracker.api.ts:117 → /api/rokhas-tracker/dossier/${encodeURIComponent
- features/rokhas-tracker/rokhas-tracker.api.ts:128 → /api/rokhas-tracker/dossier/${encodeURIComponent
- features/sous-traitants/sous-traitants.api.ts:149 → /api/sous-traitants/catalog/lots
- features/sous-traitants/sous-traitants.api.ts:154 → /api/sous-traitants/dossier/X
- features/sous-traitants/sous-traitants.api.ts:159 → /api/sous-traitants/X
- features/sous-traitants/sous-traitants.api.ts:164 → /api/sous-traitants/dossier/X/assign
- features/sous-traitants/sous-traitants.api.ts:170 → /api/sous-traitants/X/contrat
- features/sous-traitants/sous-traitants.api.ts:176 → /api/sous-traitants/X/contrat/sign
- features/sous-traitants/sous-traitants.api.ts:182 → /api/sous-traitants/X/situation
- features/sous-traitants/sous-traitants.api.ts:188 → /api/sous-traitants/X/situation/X/valider
- features/sous-traitants/sous-traitants.api.ts:194 → /api/sous-traitants/X/situation/X/rejeter
- features/sous-traitants/sous-traitants.api.ts:200 → /api/sous-traitants/X/evaluation
- features/sous-traitants/sous-traitants.api.ts:213 → /api/sous-traitants/dossier/X/audit-loi-32-99
- features/zillow-ma/EstimationPage.tsx:24 → /api/zillow-ma/estimation
- lib/web-vitals.ts:85 → /api/telemetry/vitals
- tomes/tome2/RokhasClientPortal.tsx:582 → /p2/dossier/X/rokhas/client-data
- tomes/tome2/RokhasClientPortal.tsx:643 → /p2/dossier/X/rokhas/saisie
- tomes/tome2/RokhasClientPortal.tsx:660 → /p2/dossier/X/rokhas/client-submit
- tomes/tome2/RokhasClientPortal.tsx:676 → /p2/dossier/X/rokhas/esign
- tomes/tome2/RokhasClientPortal.tsx:920 → /p2/dossier/X/rokhas/client-submit
- tomes/tome2/RokhasPhaseTimeline.tsx:46 → /p2/dossier/X/rokhas/documents/X/validate
- tomes/tome2/RokhasPhaseTimeline.tsx:54 → /p2/dossier/X/rokhas/documents/X/send
- tomes/tome3/portals/p1/P1ClientPhases.tsx:99 → /p2/dossier/X/client/sous-phases
- tomes/tome3/portals/p1/P1ClientPhases.tsx:100 → /p2/dossier/X/phase/status
- tomes/tome3/portals/p1/P1ClientPhases.tsx:116 → /p2/dossier/X/sous-phases/X/client-validate
- tomes/tome3/portals/p1/P1ClientPhases.tsx:127 → /p2/dossier/X/sous-phases/X/client-reject
- tomes/tome3/portals/p1/P1Dashboard.tsx:94 → /p2/dossier/X/documents
- tomes/tome3/portals/p1/P1Dashboard.tsx:240 → /p2/dossier/X/disclaimer
- tomes/tome3/portals/p1/P1Dashboard.tsx:501 → /p2/dossier/X
- tomes/tome3/portals/p1/P1Dashboard.tsx:635 → /p3/project/X/transition
- tomes/tome3/portals/p1/P1Dossier.tsx:35 → /p2/dossier/X
- tomes/tome3/portals/p1/P1MyDossiers.tsx:52 → /p2/dossier
- tomes/tome3/portals/p1/P1Packs.tsx:320 → /p2/intake
- tomes/tome3/portals/p1/P1Packs.tsx:438 → /p2/dossier/create
- tomes/tome3/portals/p1/SponsoredMaterials.tsx:35 → /api/ads/materials
- tomes/tome3/portals/p2/p2.api.ts:9 → /p2/simulate
- tomes/tome3/portals/p2/P2Home.tsx:394 → /p2/categories
- tomes/tome3/portals/p2/P2Home.tsx:541 → /p2/quote
- tomes/tome3/portals/p5/P5Finalize.tsx:123 → /api/sig/dgi-zones/X
- tomes/tome3/portals/p5/P5Finalize.tsx:127 → /api/sig/dgi-zones-geo/X.geojson
- tomes/tome3/portals/p5/P5Finalize.tsx:152 → /api/sig/auto-detect-zone
- tomes/tome3/portals/p5/P5Home.tsx:462 → /api/sig/dgi-zones/X
- tomes/tome3/portals/p5/P5Home.tsx:489 → /api/sig/auto-detect-zone
- tomes/tome3/portals/p6/P6Dashboard.tsx:108 → /p2/dossier/ops/all
- tomes/tome3/portals/p6/P6Dashboard.tsx:127 → /p6/suppliers/X/catalog/manage
- tomes/tome3/portals/p6/P6Dashboard.tsx:143 → /p6/suppliers/X/catalog/X
- tomes/tome3/portals/p6/P6Dashboard.tsx:145 → /p6/suppliers/X/catalog
- tomes/tome3/portals/p6/P6Dashboard.tsx:159 → /p6/suppliers/X/catalog/X
- tomes/tome3/portals/p6/P6Home.tsx:182 → /p6/scoring
- tomes/tome3/portals/payment/PaymentPages.tsx:78 → /api/payment/methods/info
- tomes/tome3/portals/payment/PaymentPages.tsx:88 → /api/payment/checkout-session/X
- tomes/tome3/portals/payment/PaymentPages.tsx:110 → /api/payment/declare-manual/X
- tomes/tome3/portals/payment/PaymentPages.tsx:302 → /api/payment/session/X/status
- tomes/tome4/apiClient.ts:115 → /auth/login
- tomes/tome4/apiClient.ts:119 → /auth/me
- tomes/tome4/apiClient.ts:173 → /p1/packs/email/request
- tomes/tome4/apiClient.ts:177 → /p1/packs/email/verify
- tomes/tome4/apiClient.ts:198 → /p1/packs/sms/request
- tomes/tome4/apiClient.ts:202 → /p1/packs/sms/verify
- tomes/tome4/apiClient.ts:244 → /p1/packs/quote
- tomes/tome5/AuthProvider.tsx:134 → /auth/send-otp
- tomes/tome5/AuthProvider.tsx:140 → /auth/verify-otp
- tomes/tome5/components/ClientProfileBanner.tsx:33 → /p2/dossier
- tomes/tome5/pages/ClientSignup.tsx:79 → /auth/email-signup
- tomes/tome5/pages/ClientSignup.tsx:104 → /auth/client-signup/confirm
- tomes/tome5/pages/ConfirmEmail.tsx:28 → /auth/email-signup/confirm
- tomes/tome5/pages/ForgotPassword.tsx:35 → /auth/password-reset/request
- tomes/tome5/pages/ForgotPassword.tsx:70 → /auth/password-reset/confirm
- tomes/tome5/pages/Login.tsx:43 → /api/cercles/me/profile
- tomes/tome5/pages/Signup.tsx:22 → /auth/register
- tomes/tome5/pages/SignupSMS.tsx:56 → /api/auth/signup
- tomes/tome5/pages/SignupSMS.tsx:89 → /api/auth/verify-sms
- tomes/tome5/pages/SignupSMS.tsx:113 → /api/auth/resend-sms
