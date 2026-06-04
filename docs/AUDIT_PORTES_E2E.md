# Audit E2E des 6 Portes CITURBAREA (P1 - P6)

> Document de consolidation pour relecture externe (GPT / Claude)
> Date de consolidation : 2026-06-05
> Périmètre : audit end-to-end de chacune des 6 portes publiques (P1-P6)
> Structure : par porte, 12 sections normalisées (routes, composants, forms, API, Prisma, état, i18n, intégrations, génération auto, flow, gaps, risques)

---

## Contexte global

- **Stack** : Monorepo NestJS (API, port 4000) + Vite/React/Tailwind (Web, port 5173), Prisma double schéma (`prisma/schema.prisma` principal + `prisma/dossiers/schema.prisma`), PostgreSQL local en dev, R2/S3 + Stripe + Twilio + Resend.
- **Doctrine** : hiérarchie de tomes (`tome-at`, `tome-0` ... `tome-10`) avec règle d'import descendant uniquement (`npm run tome:check`). Middleware globaux : `GlobalExceptionFilter` (redaction), `TomeMetaInterceptor` (méta tome), `MutationGateGuard` (toutes mutations passent par l'orchestrateur Tome @).
- **Auth** : JWT (`JwtAuthGuard`), rôles `ADMIN | OWNER | OPS | CLIENT` (`RolesGuard`), entitlements (`CapsGuard`). Plusieurs endpoints publics (intake, quote, packs) sans `JwtAuthGuard`.
- **Référentiel règles** : `docs/rules/registry.yml` (rule_id - tome - module - enforcement - db - tests). Traçabilité via `incident_id - rule_id - registry`.
- **6 portes publiques** : P1 Particulier, P2 Promoteur (CNOA), P3 MOD délégué, P4 Foncier, P5 Rapports/expertises, P6 Prestataires/fournisseurs. Toutes utilisent l'endpoint commun `POST /p2/intake` pour créer Dossier + User (`porteType` discriminant).
- **Paiement** : Stripe Checkout REST (pas de lib npm), webhook DIY HMAC + anti-replay 5 min. Workflow `PackValidationService` : `PENDING_PAYMENT - PAYMENT_RECEIVED - PENDING_ADMIN_VALIDATION - ACTIVATED | REVOKED`.

---

## Comment lire ce document

- Chaque porte est documentée avec 12 sections identiques pour faciliter la comparaison transverse.
- Les chemins fichier sont préservés tels que remontés par les agents scout (formats variables : `apps/...`, `C:/citurb/...`, `/c/citurb/...`). Considérer la racine projet `C:/citurb`.
- Les annotations `Non trouvé dans le scout` indiquent une absence d'info dans l'audit initial, à investiguer.
- Les sections 11 (Gaps/TODOs) et 12 (Risques) sont les plus actionnables pour un reviewer externe.
- La section finale "Synthèse transverse" agrège les patterns récurrents et risques systémiques.
- L'index des fichiers en fin de document permet de retrouver toutes les sources `.tsx/.ts/.prisma` citées.

---

# P1 - Particulier - projet personnel/familial (villa, maison, rénovation)

## 1. Routes & navigation

Routes P1 définies dans `/apps/web/src/tomes/tome1/router/routes.tsx` (lignes 258-262) :
- `/p1` -> `P1Home` (landing + hero)
- `/p1/packs` -> `P1Packs` (sélection packs + devis + OTP)
- `/p1/dossier` -> `P1Dossier` (espace dossier client)
- `/p1/dossier/phases` -> `P1ClientPhases` (suivi phases production)
- `/portal` (alias `/mon-espace`) -> `P1MyDossiers` (mes dossiers)

Toutes bloquées sur `admin.citurbarea.com` via `AdminHostBlock` (contrôle cross-domain).

## 2. Composants par route

**P1Home** (`/apps/web/src/tomes/tome3/portals/p1/P1Home.tsx`, 40 lignes) :
- Hero 100vw breakout + P1Landing enfant
- Récupère état persisté via `loadPersistedState(userId)` depuis localStorage
- Machine état initialisée à `E1_LANDING`, persistée à chaque transition

**P1Landing** (`/apps/web/src/tomes/tome3/portals/p1/P1Landing.tsx`, 800+ lignes) :
- Sections clés : hero (piliers), sélecteur type projet (villa/immeuble/reno), formulaire qualification
- Draft persisté en localStorage sous clé `citurbarea:p1:draft:{userId}:v1`
- Affiche/cache blocs conditionnellement selon `draft.type` (villa bars, immeuble bars, reno specs)
- Labels DOM via `tVanilla()` (i18n imperativo)

**P1Packs** (`/apps/web/src/tomes/tome3/portals/p1/P1Packs.tsx`, 600+ lignes) :
- Section : résumé projet, choix niveau construction (ECONOMIQUE -> PREMIUM -> BLACK), pack (ESSENTIEL -> AVANCE -> COMPLET)
- Boutons radio : BET mode (PLATFORM/EXTERNAL), options supplémentaires (MOD, DECO, mandate)
- Affiche devis temps réel (fallback offline via `quoteLocal()` si backend down)
- OTP workflow : email/SMS code request + verify (avant confirmation pack)
- Crée dossier local et appelle CPS génération si applicable

**P1Dossier** (`/apps/web/src/tomes/tome3/portals/p1/P1Dossier.tsx`) :
- Récupère `dossierId` depuis localStorage (`citurbarea:p1:dossierId:{userId}:v1`)
- Timeline phases (E1-E12 + EC_GEL)
- Affiche documents requis, récap pack sélectionné, statut autorisation

**P1ClientPhases** (`/apps/web/src/tomes/tome3/portals/p1/P1ClientPhases.tsx`) :
- Suivi phases en temps réel : esquisse, APS, APD, autorisation, chantier, cloture

## 3. Forms & data captured

**ContactForm** (`/apps/web/src/tomes/tome3/portals/p1/components/ContactForm.tsx`, 180 lignes) :
- Champs : `firstname`, `lastname`, `email`, `phone`
- Validation : email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, phone 10 chiffres marocain
- Erreurs inline, rouges si invalides
- Pas persisté automatiquement - remontée au parent `onSubmit`

**ProjectDetailsForm** (`/apps/web/src/tomes/tome3/portals/p1/components/ProjectDetailsForm.tsx`, 300+ lignes) :
- **Localisation** : region, province, commune (via `AdminLocationSelect` - HCP 14 régions / 77 provinces / 1505 communes)
- **Villa** (conditionnel) : villaType (bande/jumelée/isolée -> auto-lock `facades` = 2/3/4)
- **Immeuble** (conditionnel) : niveau (R+1 à R+4), type de lot
- **Rénovation** : description
- Communs : area, budget, timeline, ownerStatus (propriétaire/emprunteur/autre)
- Validation stricte (surface min 50m2, budget min 200k MAD villa)

**ProjectTypeSelector** (`components/ProjectTypeSelector.tsx`) :
- Boutons : villa / immeuble / rénovation
- Déclenche transition state machine -> E2_QUALIFICATION

**Storage local** (clés définies en `/apps/web/src/infrastructure/storage/keys.ts`) :
- `citurbarea:p1:draft:{userId}:v1` -> draft qualif + détails projet
- `citurbarea:cases:index:{userId}:v1` -> index des dossiers
- `citurbarea:case:{caseId}:meta:v1` -> métadonnées case
- `citurbarea:case:{caseId}:events:v1` -> événements append-only
- Backend : aucune synchronisation backend obligatoire jusqu'à création dossier (ligne 21 P1Packs)

## 4. API endpoints appelés

**POST /api/p1/packs/quote** (`/apps/api/src/tomes/tome-4/public/p1-packs-quote.controller.ts`)
- Guard : `JwtAuthGuard`
- Body : `{ surfaceM2, hasBasement, constructionLevel, pack, addRemoteFollow, betMode, modEnabled, decoEnabled, mandateEntreprise, blackBudgetMAD }`
- Retour : `{ ok, currency, meta, amounts: { packMAD, remoteFollowMAD, betMAD, modMAD, decoMAD, totalMAD, totalMADRounded }, notes }`
- Fallback local : `/apps/web/src/domain/p1/quote.engine.ts` formules identiques (offline resilience)

**POST /api/p1/packs/email/request** & **/verify** (`p1-packs-email.controller.ts`)
- PUBLIQUE (pas guard - avant account)
- Body request : `{ caseId, email }`
- Body verify : `{ caseId, code }`
- Appelle `OtpService.requestEmailOtp(contextKey: "case:{caseId}", email, order metadata)`
- Génère code 6 chiffres, l'envoie via Resend (email) ou fallback console logs

**POST /api/p1/packs/sms/request** & **/verify** (`p1-packs-sms.controller.ts`)
- PUBLIQUE
- Body : `{ caseId, phone }` request, `{ caseId, code }` verify
- Appelle `TwilioService.sendVerification()` (SMS ou call via Twilio Verify)
- Fallback dev : génère code local si Twilio non configuré

**POST /api/payment/checkout-session/:dossierId** (`/apps/api/src/tomes/tome-1/stripe-checkout.controller.ts`, lignes 36-122)
- Guard : `JwtAuthGuard`
- Vérification ownership dossier (ownerId vs req.user.userId ou admin)
- Extrait montant depuis `dossier.payload.brief.quoteSnapshot.honoraires.totalTTC` (ou `.amounts.totalTTC`)
- Crée session Stripe checkout
- Retour : `{ ok, sessionId, url, amountMAD }`

**GET /api/payment/session/:sessionId/status** (lignes 124-149)
- Query : `dossierId`
- Retour : `{ ok, paymentStatus (paid/unpaid), status (open/complete/expired), amountTotal, currency, customerEmail }`

Tous les appels depuis frontend via `/apps/web/src/tomes/tome4/apiClient.ts` :
- `quoteP1Packs(input)` -> POST /api/p1/packs/quote
- `requestP1PacksEmailCode(body)` -> POST /api/p1/packs/email/request
- `verifyP1PacksEmailCode(body)` -> POST /api/p1/packs/email/verify
- `requestP1PacksSmsCode(body)` -> POST /api/p1/packs/sms/request
- `verifyP1PacksSmsCode(body)` -> POST /api/p1/packs/sms/verify

## 5. Modèles Prisma touchés

**Dossier** (schema.prisma:425-521)
- CRUD : CREATE (ligne 18 `createDossier()` -> `/application/p1/createDossier.ts`), READ (P1Dossier.tsx), UPDATE (pack selection, phase)
- Champs P1-spécifiques : `packSelected`, `packPriceMAD`, `projectType`, `constructionLevel`, `caseId`
- Relations : `ownerId` (User), `projectId` (Project), `firmId` (Firm), `payments` (Payment[])
- Status : DRAFT -> (OTP/EMAIL OK) -> actif -> production -> cloture
- Phase : PHASE_01_ESQUISSE -> ... -> PHASE_12_CLOTURE ou EC_GEL

**Payment** (créé Stripe webhook) :
- CRUD : INSERT (stripe webhook), SELECT (status check)
- Lie dossierId x stripeSessionId x amountMAD

**DossierArea** (sub-models) :
- CRUD : INSERT (doc upload), SELECT (affichage)
- Contient surfaces, budgets, détails urbanisme

## 6. État (state machine)

**P1 Machine** (`/apps/web/src/domain/p1.machine.ts`, 170+ lignes)
- États : E1_LANDING -> E2_QUALIFICATION -> E3_DOCUMENTS -> E4_PACK -> E5_DISCLAIMER -> E6_PAYMENT -> E7_ACTIVE -> E8_PRODUCTION -> E9_AUTORISATION -> E10_CHANTIER -> E11_VALIDATION -> E12_CLOTURE | EC_GEL
- Événements : EVT_START, EVT_QUAL_SUBMIT, EVT_DOCS_OK, EVT_PACK_SELECTED, EVT_DISCLAIMER_ACCEPT, EVT_PAYMENT_CONFIRMED, EVT_START_PRODUCTION, EVT_PRODUCTION_PHASE, EVT_AUTH_SUBMITTED, EVT_AUTH_SIGNED, EVT_SITE_START, EVT_SITE_DONE, EVT_VALIDATED, EVT_ARCHIVED, EVT_FREEZE (global, any state -> EC_GEL)
- Doctrine : fail-fast (throw si transition invalide), append-only (pas de rollback)

**Dossier Store Local** (`/apps/web/src/tomes/tome3/portals/p1/dossier.store.ts`)
- États locaux parallèles : phase, documents uploaded, jalons chantier, statut autorisation, cycles autorisation
- Clé : `citurbarea_p1_dossier_v1_{userId}`
- CRUD : `loadDossier()`, `saveDossier()`, `createDossier()`, `advanceTo()`, `markDocumentUploaded()`, `markJalon()`, `setAutorisationStatus()`

## 7. i18n

Namespaces utilisés :
- `portes.p1.lp.*` (P1Landing labels, imperativo)
- `portes.p1.packs.*` (P1Packs, devis, OTP)
- `p1.lp.imperative.*` (CTA buttons)

Nombre estimé de clés : 150-200 (héros, sections, labels, erreurs, notes devis).
Langues : FR / AR / EN supportées via `useT()` hook + vanilla i18n `tVanilla()`.

## 8. Intégrations externes

**Stripe** :
- `POST https://api.stripe.com/v1/checkout/sessions` -> création session (carte de crédit MAD)
- `GET https://api.stripe.com/v1/checkout/sessions/{id}` -> vérification paiement
- Clé : `process.env.STRIPE_SECRET_KEY` (Bearer token)
- Webhook : `/api/stripe/webhook` (signature verification)

**Twilio** :
- SMS : `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`
- Verify : Twilio Verify API (channel=sms/call/email)
- Clés : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `TWILIO_VERIFY_SID`
- Fallback dev : génère code local si pas configuré

**Resend** (implicite via OtpService) :
- Email OTP envoyé via Resend ou SMTP configuré
- Fallback console logs en dev

**R2 / Cloudflare** (implicite) :
- Stockage documents (DossierDocument, upload via presigned URLs possibles)

## 9. Génération auto (devis, contrat, etc.)

**Quote Engine** (`/apps/web/src/domain/p1/quote.engine.ts` + `/apps/api/src/tomes/tome-4/public/p1-packs-quote.service.ts`)
- Calcul devis client-side + server-side (miroir identique)
- Formules non exposées (ligne 52-61 engine) : cout/m2 selon niveau construction
- Baseline : ECONOMIQUE=3k, STANDING=4k, HAUT_STANDING=5k, PREMIUM=6k, BLACK=custom
- Architecture honoraires = 5% budget, prorata pack (ESSENTIEL 20%, AVANCE 40%, COMPLET 100%)
- Services : BET (2% budget), MOD (5%), DECO (3%), remote follow (10%)
- Rounding : nearest 10 MAD (lignes), psychological 1000 MAD (total affiché)

**Contrat / CPS** :
- Référencé dans notes devis ("Contrat architecte auto-généré")
- Génération via `/cps` endpoint (Tome 4) - pas mappé directement à P1 dans cette audit
- Mais métadata dossier stocke brief.quoteSnapshot pour traçabilité

## 10. Flow end-to-end (parcours utilisateur)

1. **Visite `/p1`** : Hero P1Landing, sélection type projet (villa/immeuble/reno)
2. **Qualification** : Remplissage localisation (région/province/commune HCP), détails (villa type / immeuble niveau / reno desc), surface, budget, timeline
3. **Packs** : Affichage 3 packs (ESSENTIEL/AVANCE/COMPLET) avec devis temps réel selon options (niveau construction, BET, MOD, DECO, mandat)
4. **OTP unlock** : Email ou SMS code verification (contextualisé sur caseId, pas user yet)
5. **Paiement** : Création session Stripe (si applicable pour ce pack level), redirection checkout Stripe-hosted
6. **Post-paiement** : Webhook Stripe -> status ACTIVATED (ou PENDING_ADMIN_VALIDATION), dossier créé en BD
7. **Dossier** : Client accède `/p1/dossier` - affiche phases, timeline, documents requis (titre, cadastre, CIN, contrat auto-généré)
8. **Suivi phases** : `/p1/dossier/phases` - progression esquisse -> APS -> APD -> autorisation -> chantier -> cloture
9. **Notifications** : SMS/Email via Twilio + Resend sur transitions clés (pack activated, docs needed, phase change)

## 11. Gaps / TODOs / FIXMEs

Aucun TODO/FIXME explicite trouvé dans les fichiers P1 core.

Points d'incompletude identifiés :
- i18n imperativo dans P1Landing (DOM .textContent manipulé en vanilla JS) - à migrer vers React composants pour maintainabilité
- Dossier.store (localStorage) parallèle à state machine (Prisma) - synchronisation backend implicite seulement post-OTP
- Backend contacté uniquement après OTP verify - draft qualification vécu anon jusqu'à création dossier
- Webhook Stripe non mentionné en détails (architecture D.2 citée mais pas dans P1 scope)
- CPS generation dans les notes devis - service endpoint existe (/cps) mais linking exact vers P1 dossier unclear

## 12. Risques / points attention pour audit GPT/Claude

1. **OTP public endpoint vs draft anonyme** : `/p1/packs/email/request` et `/sms/request` PUBLIQUES (pas JwtAuthGuard), contextualisées sur `caseId` (généré client). Vérifier que caseId n'est pas prévisible et que rate-limiting OTP est activé côté backend (pas visible dans code fourni).

2. **Quote engine formulas non exposées mais repliquées client-side** : Doctrine de non-disclosure OK, mais fallback offline (`quoteLocal()`) utilise formules identiques -> si client modifie JS local, peut manipuler devis pré-OTP. Validation backend (stripe-checkout.controller ligne 62-72) re-calcule montant depuis dossier -> OK pour paiement, mais UX confus si devis client != backend.

3. **Draft/Dossier dual-state** : Données qualif vécues en localStorage (anon) puis répliquées en Prisma post-OTP via `createDossier()` (ligne 20-21 createDossier.ts). Pas de merge conflict handling visible - si user modifie draft local entre OTP request et verify, could lose changes.

4. **Stripe webhook security** : Contrôleur payment line 30-35 checks `STRIPE_SECRET_KEY` et génère bearer token, mais webhook verification (signature checking) pas mentionné ici - dépend de `/api/stripe/webhook` non shown. Audit : vérifier signature HMAC validation stricte.

5. **Ownership vérification** : StripeCheckoutController line 56-59 checks `dossier.ownerId === userId` OU admin role (ADMIN/OWNER/OPS string enum) - vérifier que role est cryptographiquement signé dans JWT (pas forgeable en localStorage).

**Conclusion audit P1** : P1 est une porte fonctionnellement complète (qualification -> devis -> OTP -> paiement -> dossier) avec state machine claire et persistance hybride (local draft + backend canonical). Risques détectés sont mineurs (OTP rate-limit, quote fork, webhook sig) et standards pour ce type de tunnel SaaS. Prête pour relecture externe.

---

# P2 - Promoteur - immeubles collectifs, lotissements, équipements (CNOA)

## 1. Routes & navigation

Routes dans `/apps/web/src/tomes/tome1/router/routes.tsx` (lignes 264-267) :
- **`/p2`** -> `P2Home` (composant principal, haut du fichier)
- **`/p2/form`** -> `P2Home` (alias vers le formulaire unique)
- **`/p2/result`** -> `P2Home` (écran de résultats, gestion d'état interne)
- **`/p2/finalize`** -> `P2Finalize` (finalisation post-signup : rejoue l'intake authentifié)

Toutes les routes P2 sont protégées par `AdminHostBlock` (bloquées sur `admin.citurbarea.com`).

## 2. Composants par route

**`P2Home.tsx`** (1457 lignes) - `/p2`, `/p2/form`, `/p2/result`
- **Chemin** : `C:/citurb/apps/web/src/tomes/tome3/portals/p2/P2Home.tsx`
- **Sections JSX clés** :
  - Hero (barème + points clés) - ligne 789
  - Bloc section (IMM/GR/LOT/EPIG/AMG) - ligne 831
  - Bloc catégorie (dynamique depuis API) - ligne 859
  - Bloc mesures (terrain, étages, façades, sous-sol, variante, nb bâtiments) - ligne 900
  - Bloc mode suivi (ON_SITE vs PHOTOS) - conditionnel selon section
  - Écran succès (dossier créé + devis affiché) - ligne 708
- **Données** :
  - Hardcoded : sections CNOA (IMM/GR/LOT/EPIG/AMG), natures de projet (205-310), barème standing (2000-7500 MAD/m2)
  - API fetch : `/p2/categories?section=` (ligne 431), `/p2/quote` (ligne 500), `/p2/intake` (ligne 678)

**`P2Finalize.tsx`** (100+ lignes) - `/p2/finalize`
- **Chemin** : `C:/citurb/apps/web/src/tomes/tome3/portals/p2/P2Finalize.tsx`
- **Logique** : Récupère le payload d'intake stocké en localStorage (`citurbarea:p2:pending_intake:v1`), rejoue l'API `/p2/intake` avec email du compte connecté, redirige vers P5 si expertise, sinon `/portal`
- **État interne** : loading -> submitting -> done

**`P2Form.tsx`** (163 lignes) - Composant interne (simulation)
- Formulaire technique autonome (pas directement lié au flow wizard principal), avec champs `city`, `projectType`, `landArea`, `builtArea`, `floors`, etc.

**`P2Result.tsx`** (56 lignes) - Composant interne
- Affichage du résultat simulation (erreur ou `ui_blocks` rendus via `P2UiBlockRenderer`)

## 3. Forms & data captured

**Étape 1 - Identité (lignes 376-380)** :
- **Champs obligatoires** : `clientNom` (string), `clientTel` (tel), `clientEmail` (email - optionnel si non-connecté)
- **Si MOA morale** : `raisonSociale`, `representant`, `rc`, `ice`
- **Localisation** : `region`, `province`, `commune` (saisies via `AdminLocationSelect`)
- **Nature du projet** : `natureCode` + `natureAutre` (si "autre")
- **Qualification contexte** : `ownerStatus`, `timeline`, `standing` (moyen/haut/luxe/économique)
- **Validation** : `validateIdentity()` (ligne 611), retourne erreur si champs requis manquent

**Étape 2 - Section (IMM/GR/LOT/EPIG/AMG)** :
- Sélection par clic sur carte (ligne 451 `pickSection`)
- État global : `section`

**Étape 3 - Catégorie** :
- Récupérée dynamiquement depuis `/p2/categories?section={section}` (ligne 431)
- Sélection : `categoryCode`
- Champs affichés : `label`, `costPerM2`, `photoOptionAvailable`, `notes`

**Étape 4 - Mesures** (selon section) :
- **LOT** : `surfaceTerrainHa` (hectares)
- **AMG** : `surfacePlancher` (m2)
- **IMM/GR/EPIG** : `terrainM2`, `rLevel` (R0-R8), `facades` (1-4), `basement` (boolean), `immVariant` (IMM only), `nbBatiments` (GR only)
- Calcul automatique du plancher estimé (ligne 399-413)

**Étape 5 - Mode suivi** :
- `followMode` : "ON_SITE" (30% phase C) vs "PHOTOS" (10% phase C)
- Conditionnel selon `photoOptionAvailable` de la catégorie

**Storage & persistance** :
- **Frontend (localStorage)** : `citurbarea:p2:pending_intake:v1` stocke la payload avant signup (ligne 9, 655)
- **Clés stockage** : voir `C:/citurb/apps/web/src/infrastructure/storage.ts` (interface `StorageAdapter` + helpers `readJSON`/`writeJSON`)
- **Backend (Prisma Dossier)** : payload JSON persistée, `porteType: "P2"`, `sousTypeP2: section`, champs étendus (`clientNom`, `clientTel`, `raisonSociale`, `rc`, `ice`, `representant`, `surfaceTerrain`, `surfacePlancher`, `nbNiveaux`, `natureProjet`)

## 4. API endpoints appelés

**Frontend -> Backend** :

1. **GET `/api/p2/categories?section={section}`**
   - **Contrôleur** : `QuoteController.categories()` (ligne 17, `C:/citurb/apps/api/src/tomes/tome-2/p2/quote.controller.ts`)
   - **Réponse** : `{ ok: true, items: [{ code, label, costPerM2, photoOptionAvailable, notes }] }`
   - **Filtre frontend** : exclut villas pour IMM/GR (ligne 435)

2. **POST `/api/p2/quote`**
   - **Contrôleur** : `QuoteController.quote()` (ligne 25, quote.controller.ts)
   - **Body** : `P2QuoteInput` = `{ section, categoryCode?, surfacePlancherM2?, nbBatiments?, surfaceTerrainHa?, followMode? }`
   - **Réponse** : `P2QuoteResult` = honoraires HT/TTC, breakdown phase A/B/C, visa CROA note, décennale, notes
   - **Service** : `P2PricingService.computeQuote()` (ligne 137, `pricing.service.ts`)
   - **Sans auth** (public, pas de guard)

3. **POST `/api/p2/intake`**
   - **Contrôleur** : `IntakeController.intake()` (ligne 62, `intake.controller.ts`)
   - **Body** : `IntakePayload` = porteType, sousTypeP2, gestionMode, clientNom, clientTel, clientEmail, raisonSociale, rc, ice, representant, commune, natureProjet, surfaceTerrain, surfacePlancher, nbNiveaux, title, brief, source, lang
   - **Réponse** : `{ ok: true, dossierId, access_token }`
   - **Logique** :
     - Crée/récupère User (CLIENT) par email
     - Crée Dossier owned by user
     - Envoie notifications owner (`DOSSIER_CREATED`, `NEW_USER_REGISTERED`)
     - Envoie email client (`demandeRecue()`)
   - **Sans auth** (public)
   - **Notifications** : `ownerNotify.notify()`, `clientNotify.demandeRecue()` (fire-and-forget)

**Backend interne (en admin)** :

4. **GET `/api/p2/dossier/:id`**
   - **Contrôleur** : `P2Controller.get()` (ligne 52, p2.controller.ts)
   - **Guard** : `JwtAuthGuard`, `CapsGuard` (require `dossier:read`)
   - **Réponse** : Dossier complet + areas + phaseRecords

5. **GET `/api/p2/dossiers/:id/contrat`**
   - **Contrôleur** : `ContractController.generate()` (ligne 25, contract.controller.ts)
   - **Guard** : `JwtAuthGuard`, `RolesGuard` (roles: ADMIN/OWNER/OPS)
   - **Réponse** : HTML imprimable contrat type unifié CNOA
   - **Service** : `P2ContractService.renderContractHtml()` (ligne 76, contract.service.ts)

6. **GET/PATCH `/api/p2/dossiers/:id/visa-croa`**
   - **Contrôleur** : `VisaCroaController` (visa-croa.controller.ts)
   - **Guard** : JwtAuthGuard, RolesGuard
   - **Logique** : État visa CNOA (NON_DEMANDE -> DEMANDE_ENVOYEE -> OBTENU, délai 15j)
   - **Stockage** : `Dossier.payload.visaCroa` (non-schéma)

7. **POST `/api/p2/dossier/:id/payments`**
   - **Contrôleur** : `P2Controller.createPayment()` (ligne 151, p2.controller.ts)
   - **Guard** : `CapsGuard` (require `dossier:create`)
   - **Body** : `{ mode, amount, ref?, currency?, notes? }`

8. **POST `/api/p2/payment/:paymentId/confirm|reject`**
   - **Contrôleur** : `P2Controller.confirmPayment/rejectPayment()` (ligne 129/138, p2.controller.ts)
   - **Guard** : JwtAuthGuard, roles OWNER/OPS/ADMIN

## 5. Modèles Prisma touchés

**`Dossier`** - modèle principal P2
- **CRUD** : CREATE (intake.controller), READ (p2.controller), UPDATE (plusieurs : submit, phase advance, visa-croa, payment)
- **Champs P2-spécifiques** (via `payload` JSON ou colonnes) :
  - `porteType: "P2"`
  - `sousTypeP2: section` (IMM|GR|LOT|EPIG|AMG)
  - `gestionMode` (AUTONOME)
  - `clientNom`, `clientTel`, `clientEmail`
  - `raisonSociale`, `rc`, `ice`, `representant`
  - `commune`, `surfaceTerrain`, `surfacePlancher`, `nbNiveaux`, `natureProjet`
  - `payload` (JSON arbitraire incluant brief P2 + quoteSnapshot)

**`User`** - propriétaire du dossier
- **CRUD** : CREATE (auto-register si email nouveau), READ
- **Champs** : email, passwordHash, role (CLIENT), plan, isActive

**`Payment`** - paiements honoraires
- **CRUD** : CREATE, READ, UPDATE (confirm/reject)
- **Champs** : mode, amount, ref, currency, status

**`DossierPhaseRecord`** - jalons et phases
- **CRUD** : CREATE (phaseEngine.initBrief), READ, UPDATE (advance)
- **Champs** : phase, statut (EN_ATTENTE|EN_COURS|BLOQUE), dateDebut, dateFin

**`Firm`** - si multi-tenant (S-FIRM-LINK)
- **READ** : récupération firmId du propriétaire pour propagation

**Récapitulatif CRUD** :
- **CREATE** : Dossier, User, Payment, DossierPhaseRecord
- **READ** : tous
- **UPDATE** : Dossier (status, phase, payload), Payment (confirm/reject)
- **DELETE** : aucune opération visible (soft-delete possible via status)

## 6. État (state machine si applicable)

P2 utilise **phase engine** (modulaire, non visible directement en P2Home) :

- **Écran wizard** : phases logiques (identity -> section -> category -> measures -> follow -> quote)
  - Non persistées (état React local dans `P2Home`)
  - Transitions déclenchées par boutons (pickSection, pickCategory, measuresContinue, computeQuote, submitIntake)

- **Backend - Dossier phases** (persistées via `DossierPhaseRecord`) :
  - Initialisé par `phaseEngine.initBrief()` (ligne 64, dossier.service.ts)
  - Avancé via `/p2/dossier/:id/phase/:phase/action` (ligne 234, p2.controller.ts)
  - États : EN_ATTENTE -> EN_COURS -> (VALIDER) -> BLOQUE (optionnel)

- **Transition déclenchée par intake P2** :
  - Création dossier -> phase PHASE_00_BRIEF (ligne 43, dossier.service.ts)
  - Workflow complet (phases multiples) piloté par backoffice OPS

## 7. i18n

**Namespaces i18n utilisés** :
- **Fichiers** : `C:/citurb/apps/web/src/locales/{fr,en,ar}/portes.json`
- **Clés P2 estimées** : ~397 clés (grep count ligne 1, portes.json)
- **Préfixe** : `portes.p2.*` et `p2.*`
  - `portes.p2.sections.{IMM,GR,LOT,EPIG,AMG}.{label,title,sub,b1,b2,b3,micro}`
  - `portes.p2.hero.{kicker,point}.{t,d}`
  - `portes.p2.identity.*`, `portes.p2.section.*`, `portes.p2.category.*`, `portes.p2.measures.*`
  - `portes.p2.recap.{ok_emoji,ok_title,ok_body,expertise_emoji,expertise_title,expertise_body}`
  - `p2.home_title`, `p2.home_subtitle`, `p2.cnoa_visa`
- **Interpolation** : `t("key", { var: value })` (ligne 725, P2Home.tsx : `t("portes.p2.recap.ok_body", { section: "..." })`)
- **Détection langue** : `getStoredLang()` (ligne 5, i18n.tsx), stockée dans localStorage `citurbarea.lang`

## 8. Intégrations externes

**Notifications** :
- **Resend (email)** : `ownerNotify.notify()` + `clientNotify.demandeRecue()` (fire-and-forget, modules `owner-notify`, `client-notify`)
  - Déclenchées à : intake créé, user enregistré, dossier soumis, document uploadé, visa-croa changement
  - Langage : passé via `payload.lang` (fr|en|ar)

**Paiements** :
- **Stripe** : implicite via `/payment/start?dossier={dossierId}` (lien sortant dans recap, ligne 773)
  - Intégration dans module `tome-4/public` (P1 Packs) probablement partagée

**Storage** :
- **R2 (Cloudflare)** : implicite via `StorageService.ensureDossierStructure()` (ligne 62, dossier.service.ts)
  - Pas d'appel direct visible en P2, déclenché en background

**Aucune intégration Twilio (SMS) spécifique à P2** - SMS gérés par auth (signup).

## 9. Génération auto (devis, contrat, etc.)

**Devis** :
- **Computation** : `P2PricingService.computeQuote()` (ligne 137, pricing.service.ts)
  - Entrées : section, categoryCode, surfacePlancher, followMode
  - Sorties : honoraires HT/TTC, breakdown 40/30/30, notes CNOA
- **Snapshot** : stocké dans `Dossier.payload.brief.quoteSnapshot` (ligne 564, P2Home.tsx)
- **Affichage** : recap success (ligne 733-769)

**Contrat type unifié** :
- **Service** : `P2ContractService.renderContractHtml()` (ligne 76, contract.service.ts)
- **Entrées** : DossierContractData + AdminContractParams (query string)
- **Format** : HTML pur (pas puppeteer/headless), impression navigateur = PDF
- **Contenu** :
  - Parties (MO, MOE)
  - Honoraires breakdown
  - Conditions générales (articles contractuels)
  - Visa CROA (zone pointillée prédéfinie)
  - Signatures
- **Endpoint** : GET `/api/p2/dossiers/:id/contrat` (ContractController, ligne 25)

**Visa CROA** :
- **Workflow** : état persisté dans `Dossier.payload.visaCroa` (VisaCroaState)
- **Délai** : 15 jours calendaires (FIFTEEN_DAYS_MS, visa-croa.controller.ts ligne 38)
- **Stockage** : historique d'état avec timestamps + auteur

**Pas de PDF server-side** (pas de dépendance Puppeteer) - browser print-to-PDF.

## 10. Flow end-to-end (parcours utilisateur - happy path)

**Parcours P2 complet** (10 étapes) :

1. **Landing** : Visiteur arrive sur `/p2` -> affiche hero + CTA "Démarrer"
2. **Étape 1 - Identité** : Saisit nom, tel, commune, nature projet (expert/villa/immeuble/etc), standing, statut propriétaire, délai
   - Si pas connecté : bouton "Suivant" -> redirige `/creer-compte/client?email=...&phone=...&name=...&next=/p2/finalize`
   - Si connecté : continue directement étape 2
3. **Étape 2 - Section** : Choisit section (IMM/GR/LOT/EPIG/AMG) entre 3-5 cartes premium
4. **Étape 3 - Catégorie** : Sélectionne catégorie CNOA (Immeuble R+2-R+8, villas, équipement) - chargée dynamiquement via GET `/p2/categories`
5. **Étape 4 - Mesures** : Saisit terrain/étages/façades (IMM/GR/EPIG), surface directe (AMG), ou hectares (LOT) -> calcul plancher auto
6. **Étape 5 - Mode suivi** : Choisit ON_SITE (30%) ou PHOTOS (10%) selon dispo catégorie
7. **Calcul devis** : POST `/p2/quote` -> backend retourne honoraires HT/TTC + breakdown phases A/B/C + notes
8. **Création dossier** : POST `/p2/intake` (email + payload qualification)
   - Backend : crée User + Dossier, envoie email "demande reçue", initialise phases
   - Retourne : `dossierId` + `access_token` optionnel
9. **Affichage succès** : Écran vert avec devis officiel + émoji OK
   - Boutons : "Payer maintenant" (-> `/payment/start?dossier=...`), "Mes dossiers" (-> `/portal`), "Accueil"
10. **Paiement** : Client clique "Payer" -> Stripe checkout -> retour `/payment/success` -> dossier passé à phase suivante (ESTIM/VISA/CONTRAT)

**Notifications envoyées** :
- Email owner : "DOSSIER_CREATED" + "NEW_USER_REGISTERED"
- Email client : "demande reçue" + lien `/payment/start` + lien `/portal`

## 11. Gaps / TODOs / FIXMEs

**Commentaires dans code** :
- **P2Home.tsx ligne 19-20** : "La logique métier P2 est INCHANGÉE" (arc historique -> signifie refonte UI en cours)
- **pricing.service.ts ligne 169** : "La grille tarifaire des honoraires de lotissement (par tranche surface hectares) **est en cours de finalisation** par CITURBAREA" -> LOT retourne `requiresQuotePersonnalise: true`, devis NULL, contact 24h après
- **contract.service.ts ligne 88** : `archNom` par défaut `"[À COMPLÉTER PAR ADMIN]"` -> formulaire admin incomplet, template placeholder

**Non-terminé / Probable** :
- **LOT pricing** : grille de tarification LOT manquante (devis provisionnel, à finaliser)
- **Expertise qualification** : mission expertise P2 -> bascule vers P5, workflow incomplet (pas de devis CNOA, facturation forfait)
- **Multi-step contrat** : contrat rendu une seule fois (GET `/dossiers/:id/contrat`), pas de versionning/amendements visibles
- **RokhasTracking** : démarrage rokhas implicite dans phaseEngine mais pas piloté directement par P2Home
- **Accessibility** : formulaires sans `aria-label` explicites (conformité WCAG partielle)

## 12. Risques / points attention pour audit GPT/Claude

1. **Sécurité intake** : POST `/p2/intake` public (sans auth) - crée User + Dossier + charge notif. **Risque** : spam/DoS massif via script, pas de rate-limit visible. **À vérifier** : CloudFlare WAF, rate-limit module.

2. **Logique tarification LOT** : quote LOT retourne `totalTTC: null` + "grille en cours de finalisation". **Risque** : client reçoit devis incomplet, confusion sur prix final. **À vérifier** : workflow backoffice force devis personnalisé après 24h, email transactionnel déclare "devis = estimation provisoire".

3. **Visa CROA délai** : délai 15j calendaires hardcoded. **Risque** : CROA local n'est pas consulté automatiquement, workflow manuel (admin saisit état). **À vérifier** : alertes/escalade si dépassement 15j.

4. **Payload JSON** : brief P2 + quoteSnapshot stockés dans `Dossier.payload` (schéma Prisma = `Json` type = pas de schéma strict). **Risque** : dérive de structure, pas de validation Zod. **À vérifier** : versioning/migration si changement barème CNOA 2025.

5. **Phase engine integration** : `phaseEngine.initBrief()` appelé en background (catch error ligne 64 dossier.service.ts). **Risque** : si phaseEngine échoue, dossier créé mais phases non initialisées -> orphelin en ops. **À vérifier** : logs d'erreur, mécanisme de retry.

**Audit complet P2** - P2 est une porte de **qualification + devis** pour la promotion immobilière (IMM/GR/LOT/EPIG/AMG). Barème CNOA officiel 2021 appliqué, contrat type unifié généré côté browser, visa CROA workflow manuel. Intake public (risque DoS), tarification LOT incomplète. Prêt pour audit externe GPT/Claude.

---

# P3 - MOD - Maitrise d'Ouvrage Deleguee (40+ corps de métier)

## 1. Routes & navigation

**Frontend route P3 dans routes.tsx (apps/web/src/tomes/tome1/router/routes.tsx:268)**
- `/p3` -> `<P3Home />` (ligne 268, bloquée par `AdminHostBlock` pour admin.citurbarea.com)

**Route unique** : La porte P3 repose sur un seul composant entry-point. Aucune sous-route `/p3/packs`, `/p3/dossier`, etc. n'existe. Tout le flux se déroule dans un single-page wizard modal (6 étapes internes).

## 2. Composants par route

**Composant unique :**
- Chemin: `apps/web/src/tomes/tome3/portals/p3/P3Home.tsx` (454 lignes)
- Responsable: 100% du flux P3 côté client

**Sections JSX/logique (étapes du wizard):**
1. **Step "section"** (L244-268) : Hero + sélection 4 sections (IMM/GR/EPIG/AMG) avec icones
2. **Step "category"** (L271-291) : Liste catégories CNOA selon section, affichage prix/m2
3. **Step "measures"** (L294-323) : Input surface plancher; si GR -> 2 inputs (surface + nb bâtiments)
4. **Step "corps"** (L326-357) : Multi-select groupé par catégorie (6 groupes: GROS_OEUVRE, SECOND_OEUVRE, FINITIONS, EQUIPEMENTS, VRD_AMENAGEMENT, SPECIALITES) - 40+ items statiques
5. **Step "quote"** (L360-411) : Affichage devis calculé (honoraires TTC = 10% cout réalisation)
6. **Step "identity"** (L414-449) : Formulaire identité client (nom, tel, email, raison sociale, commune, nature projet)
7. **Step "submitting"** : Loader
8. **Step "success"** (L218-237) : Confirmation + lien `/payment/start?dossier=...` et `/portal`

**Composant secondaire réutilisé:**
- `FichesPrestations` (L4, L256) - affichage des fiches prestation au démarrage, importe depuis `../../components/fiches-prestations/FichesPrestations`

## 3. Forms & data captured

**Champs capturés par étape :**
- **Étape section** : `section` (P3Section: "IMM"|"GR"|"EPIG"|"AMG")
- **Étape category** : `categoryCode` (string, clé du BAREME_CNOA_2021)
- **Étape measures** : `surfacePlancher` (number), `nbBatiments` (number, GR only)
- **Étape corps** : `selectedCorps` (Set<string> de slugs, ex: "terrassement", "fondations", etc.)
- **Étape identity** : 10 champs (clientNom, clientTel, clientEmail, raisonSociale, representant, rc, ice, commune, natureProjet) - tout optionnel sauf clientNom + clientTel + commune (L175-176)

**Validation :**
- Surface > 0 obligatoire avant calcul devis (L154)
- Commune + nom + tel obligatoires avant soumission (L175-176)

**Storage local :** Aucun draft stocké - état maintenu en mémoire React (useState) pendant la session. À la soumission, les données sont envoyées directement via POST /p2/intake (pas de localStorage draft).

## 4. API endpoints appelés

**Depuis P3Home.tsx :**

1. **GET `/p3/corps-metiers`** (L132)
   - Réponse : `{ ok: true, groupes: CorpsGroupe[], max: number }`
   - Implémentation : `apps/api/src/tomes/tome-3/p3/quote.controller.ts:20`
   - Pas d'auth requis (public endpoint)

2. **GET `/p2/categories?section={section}`** (L139)
   - Réponse : `{ ok: true, items: Category[] }` (réutilise P2)
   - Source de vérité : BAREME_CNOA_2021 depuis `apps/api/src/tomes/tome-2/p2/pricing.service.ts:34`
   - Public endpoint

3. **POST `/p3/quote`** (L157)
   - Body : `{ section, categoryCode, surfacePlancherM2, nbBatiments }`
   - Réponse : `{ ok: true, meta, base, honoraires, escrow, services, notes }`
   - Implémentation : `apps/api/src/tomes/tome-3/p3/quote.controller.ts:29` -> `P3PricingService.computeQuote()`
   - Calcul : `honoraires = surfacePlancher x costPerM2 x 0.10 (10%)`, TVA 20%
   - Public endpoint

4. **POST `/p2/intake`** (L184)
   - Body : IntakePayload (porteType:"P3", gestionMode:"DELEGUE", commune, surfacePlancher, brief: { section, categoryCode, corpsMetiers[], quoteSnapshot })
   - Réponse : `{ ok: true, dossierId, access_token, user }`
   - Implémentation : `apps/api/src/tomes/tome-2/p2/intake.controller.ts:62`
   - **Logique :** Auto-crée User si email non existant; crée Dossier avec porteType="P3"; lance notifications (ownerNotify + clientNotify)
   - Public endpoint (pas JwtAuthGuard)

**Backend appelé après intake :**
- **POST `/api/payment/checkout-session/:dossierId`** (depuis success screen L231)
  - Utilisé pour lancer le paiement acompte via Stripe
  - Implémentation : `apps/api/src/tomes/tome-1/stripe-checkout.controller.ts:36`

## 5. Modèles Prisma touchés

**Opérations CRUD effectuées par P3 :**

1. **User** (CREATE si nouveau)
   - Ligne 71-77 de intake.controller.ts : `findUnique()` -> `register()` si absent

2. **Dossier** (CREATE)
   - Ligne 89 de intake.controller.ts : `create()` avec porteType="P3", gestionMode="DELEGUE"
   - Champs remplis : title, commune, porteType, gestionMode, clientNom, clientTel, clientEmail, raisonSociale, rc, ice, representant, payload (JSON brut: brief + source)
   - `payload.brief` stocke : { section, categoryCode, categoryLabel, surfacePlancherM2, nbBatiments, corpsMetiers[], quoteSnapshot }

3. **Project** (CREATE OPTIONNEL - si dossier APPROVED)
   - Ligne 57-58 de p3.controller.ts : `promote()` appelé NON-bloquant si dossier.status -> APPROVED (porte P3 crée pas automatiquement Project)

4. **StateHistory** (CREATE)
   - Ligne 256 de state-machine.service.ts : tracé des transitions dossier (DRAFT -> SUBMITTED -> IN_REVIEW -> APPROVED)

5. **Notification** (implicit via OwnerNotifyService + ClientNotifyService)
   - ownerNotify.notify("NEW_USER_REGISTERED", ...) + ownerNotify.notify("DOSSIER_CREATED", ...)
   - clientNotify.demandeRecue({...})

**Pas d'opération :** RokhasDossier, ProjectMilestone, Order, Payment - aucune implémentation pour P3 actuellement (paiement via Stripe external, pas de modèle Order local).

## 6. État (state machine si applicable)

**Dossier Status Machine** (apps/api/src/tomes/tome-3/state-machine.service.ts:42-51):
- DRAFT -> SUBMITTED (P3Home POST /p2/intake crée dossier en DRAFT, client peut re-soumettre)
- SUBMITTED -> IN_REVIEW (OPS/OPERATOR/ADMIN)
- IN_REVIEW -> APPROVED / NEEDS_CHANGES / REJECTED (OPS/OPERATOR/ADMIN)
- NEEDS_CHANGES -> SUBMITTED (CLIENT resoumis)
- APPROVED -> (terminal) - auto-promote vers Project E0 si présent

**Project State Machine** (apps/api/src/tomes/tome-3/state-machine.service.ts:18-36):
- P3 ne déclenche **aucune transition** automatiquement. Le projet débute en E0, l'OPS pilote E0 -> E12_CLOTURE manuellement.
- États concernés pour P3 : E0 (intake) -> E1_LANDING -> E2_QUALIFICATION -> ... -> E12_CLOTURE (tous OPS-driven)
- Freeze/unfreeze possible : `POST /p3/project/:id/freeze` (raison + origin logué)

**Doctrine P3 :** Dossier approuvé -> Project créé -> États pilotés par OPS, jamais par client.

## 7. i18n

**Namespaces utilisés :**
- **portes.p3.*** : sections, catégories, corps, forms, errors, recap success (~70+ clés estimées)
- **p3.home_title**, **p3.home_subtitle**, **p3.lp.*** (landing pages SEO)

**Langues supportées :**
- FR (défaut)
- EN (routes `/en/door-03-turnkey-delivery`)
- AR (routes `/ar/bab-03-injaz-miftah-fi-yad`)
- Locales JSON: `apps/web/src/locales/{ar,en,fr}/portes.json`

**Clés estimées :** ~100-120 clés (sections, catégories, form labels, errors, CTAs, corps metadata)

## 8. Intégrations externes

**Utilisées par P3 :**

1. **Stripe** (paiement acompte)
   - `POST /api/payment/checkout-session/:dossierId` crée session Stripe
   - Webhook géré ailleurs (stripe-webhook.controller.ts)
   - Montant lu depuis `payload.brief.quoteSnapshot.honoraires.totalTTC`

2. **Twilio** (notifications SMS)
   - Via OwnerNotifyService -> notif au propriétaire/OPS de nouveau lead
   - Module global TwilioModule (app.module.ts:76)

3. **Resend** (email transactionnel)
   - ClientNotifyService.demandeRecue() -> confirmation email au lead
   - OwnerNotifyService -> email ops lead reçu

4. **R2** (Cloudflare) - PAS UTILISÉ directement par P3
   - Dossier documents (upload) se fait ailleurs (P1/P2 features)

5. **PDF generation** - PAS IMPLÉMENTÉ
   - P3 génère un devis PDF? **Non** - devis envoyé en JSON, client télécharge via Stripe facture ou email

## 9. Génération auto (devis, contrat, etc.)

**Devis :**
- Généré en JSON via `POST /p3/quote` (pricing.service.ts)
- Inclus dans `payload.brief.quoteSnapshot` du dossier (stockage JSON)
- PDF ? Non, sauf via Stripe facture après paiement

**Contrat / Mandat :**
- Non généré par P3 - dossier approuvé -> OPS contacte manuellement client
- Mandat signé flaggé via `dossier.mandatSigne` + `mandatSigneAt` (schema.prisma:477-478)
- Génération manuelle ou via command-center (backoffice)

**Documents récépissé :**
- Email de confirmation envoyé via ClientNotifyService (transactionnel)
- Stockage : `DossierDocument` model (apps/api/src/tomes/tome-2/p2/dossier.service.ts)

## 10. Flow end-to-end (parcours utilisateur)

**Happy path P3 (6-8 min):**

1. **Landing** : Client clique `/p3` -> voit hero + 4 sections (IMM/GR/EPIG/AMG) + fiches prestations
2. **Section** : Choisit (ex: IMM)
3. **Catégorie** : Sélectionne catégorie CNOA (ex: "3.1 - Immeubles R+4+")
4. **Mesures** : Saisi surface plancher (ex: 2500 m2)
5. **Corps de métiers** : Multi-sélectionne 10-15 corps (gros oeuvre, second oeuvre, finitions, équipements VRD)
6. **Devis** : Affiche montant TTC = 2500 m2 x 2500 DH/m2 x 10% + TVA = 687 500 DH TTC
7. **Identité** : Remplit nom, tel, email, commune (ex: Casablanca)
8. **Soumission** : POST /p2/intake crée dossier + User (si nouveau) + obtient token + dossierId
9. **Success** : Confirme devis, affiche ref dossier, propose `/payment/start` (paiement acompte) ou `/portal` (voir dossier)
10. **Notification** : Email confirmation client + SMS/email propriétaire (nouveau lead P3 reçu)

**Post-soumission (OPS):**
- OPS voit dossier en backoffice (status SUBMITTED)
- OPS valide documents/devis ou demande changements
- Si APPROVED -> Project créé automatiquement, état E0
- Client reçoit email "devis approuvé, lien paiement"

## 11. Gaps / TODOs / FIXMEs

**Commentaires dans code P3 :**
- L49 : `// FIX-4 - responsive: CSS injecté pour caps fluides + row2 mobile-friendly` (CSS media queries injection manual)
- **Aucun TODO/FIXME explicite** trouvé dans P3Home.tsx ou modules P3 backend

**Fonctionnalités non terminées / observations :**

1. **Pas de persistance draft local** : Si utilisateur quitte à étape 3, perd tout. Aucun localStorage draft ni backend draft save.

2. **Pas de validation côté backend pour POST /p3/quote** : Pricing.service valide surface > 0 et catégorie existe, mais pas de rate-limiting/spam protection.

3. **Pas d'implémentation des 40+ corps pour affectation entreprises** : P3 collecte corps de métiers, mais aucun backend ne crée/stocke les `EntreprisePar CorpsMetier` ou `Appel d'offres`. Données stockées brutes en JSON dans payload.brief.corpsMetiers.

4. **Pas de paiement par tranches par corps** : Devis calcule TTC global, mais aucun modèle pour "libération escrow par réception PV de corps" - fondamental pour MOD.

5. **Pas de CPS auto-généré** : P3 ne crée pas de Cahier Prescriptions Spéciales (CPS). Feature `CpsGeneratorPage` existe (route `/cps`), mais pas intégrée à P3.

6. **State machine P3 identique à P1/P2** : Pas de logique P3-spécifique (ex: coordination corps de métiers n'est pas un état).

7. **Escrow "platformOnly" hardcodé** : `notice: "Tous les paiements... transitent exclusivement"` est static dans quote response, jamais modifié selon porte/client.

## 12. Risques / points attention pour audit GPT/Claude

**3-5 points critiques :**

1. **Sécurité pricing**
   - Montant TTC lu direct depuis `payload.brief.quoteSnapshot.honoraires.totalTTC` au checkout (L62-68 stripe-checkout.controller.ts)
   - **Risque** : Si client modifie JSON client-side avant POST /p3/quote, backend ne re-valide pas
   - **Mitigation** : Re-compute quote côté server au moment checkout (pas implémenté actuellement)
   - **Audience audit** : Vérifier StripeCheckoutController re-compute vs cache

2. **Logique métier MOD (escrow + coordination corps)**
   - Code affiche concept escrow/40 corps, mais implémentation manque : pas de model "EntrepriseEnCharge", pas de "libération escrow par corps validé"
   - **Risque** : Client non-technique croit que MOD = escrow piloté, mais backend ne fait que stocker JSON
   - **Audience audit** : Vérifier avec specs MOD si V1 doit implémenter escrow/corpus ou si "V1 = devis+lead only"

3. **Intégration P3 - P2 pricing**
   - P3 réutilise BAREME_CNOA_2021 de P2. Si barème change (audit 2025), dois-je synchroniser?
   - **Risque** : P3 quote = 10% de P2 quote. Incohérence prix si barème diverge.
   - **Audience audit** : Confirmer source de vérité unique (BAREME_CNOA_2021)

4. **Flux paiement / statut dossier**
   - Client POST /p2/intake -> dossier DRAFT. CLIENT peut soumettre plein de fois.
   - Puis POST /api/payment/checkout -> Stripe webhook -> pack validation async
   - **Risque** : Si webhook rate-limit/échoue, dossier reste PENDING paiement sans notification
   - **Audience audit** : Vérifier webhook retry logic + client notif de payment status

5. **État "submitting" bloquant UX**
   - Étapes quote/identity set step="submitting", mais pas de timeout. Si API slow, client reste bloqué.
   - **Risque** : Pas d'erreur gracieuse visible (L170 catch -> `setStep("corps")`), UX friction
   - **Audience audit** : Tester timeout + error messaging lors de network fail

**Résumé audit P3 :** Porte mature côté UX/formulaire, repose sur réutilisation CNOA/pricing de P2, intégration Stripe complete. **Gap majeur** : logique métier MOD (escrow multi-corps + coordination) est en brainstorm (spec document) mais pas implémentée. État machine et notifications (OPS+client) fonctionnels. **Action pour release** : confirmer si V1 = "devis + lead capture" (production-ready) ou si V1.5 doit ajouter "escrow + traçabilité corps de métiers" (design manquant).

---

# P4 - Foncier - analyse, faisabilité, expertise terrain (3 packs)

## 1. Routes & navigation

Depuis `/c/citurb/apps/web/src/tomes/tome1/router/routes.tsx` (lignes 269) :

```
- /p4 -> <AdminHostBlock><P4Home /></AdminHostBlock> [ligne 269]
```

**Nota bene** : P4 est la seule porte implémentée actuellement avec structure complète (packs tarifaires, calcul de quote, intake). Pas de sous-routes publiques (/p4/packs, /p4/dossier) - les endpoints API /p4/* sont publics mais le composant frontend est une SPA monolithique.

## 2. Composants par route

**Composant principal** : `/c/citurb/apps/web/src/tomes/tome3/portals/p4/P4Home.tsx` (405 lignes)

**Structure JSX (4 étapes linéaires)** :
- **Step 1 (pack selection)** : Hero badge + 3 pack cards (BASIQUE/MOYEN/RENTABILITÉ), chacun affichant icon, label, shortDesc, ratePct, deliveryDays, deliverables (sliced). Données : fetchées via `GET /api/p4/packs`.
- **Step 2 (foncier)** : Form 2-col (titreFoncierNum, surfaceTerrainM2) + commune, adresse, prixVenteFoncierDH, natureUsagePrevu. Tous input text/number, non validés côté client (validation serveur uniquement).
- **Step 3 (quote)** : Affichage immutable du devis (quoteWrap). Données brutes : POST /api/p4/quote -> snapshot parsé et affiché (montant TTC, décomposition HT/TVA, livraisons, modalities, notes).
- **Step 4 (identity)** : Formulaire d'identité client (clientNom, clientTel, clientEmail, raisonSociale). Validation client : nom + téléphone requis (sinon erreur visuelle).
- **Success screen** : Affichage du dossierId tronqué, boutons vers /payment/start, /portal, /.

**CSS injecté** : FIX-4 (ligne 62) - CSS responsive pour .cit-porte-p4-wrap, .cit-porte-p4-grid, .cit-porte-p4-narrow, .cit-porte-p4-row2 avec mediaquery 760px. Inline styles majoritaires (objet S: {...}).

## 3. Forms & data captured

| Formulaire | Champs | Type | Storage | Conditions |
|---|---|---|---|---|
| **Pack selection** | pack (code) | Enum: BASIQUE\|MOYEN\|RENTABILITE | State local (pack) | Non persisté (session only) |
| **Foncier** | titreFoncierNum, surfaceTerrainM2 (number), commune, adresse, prixVenteFoncierDH (number), natureUsagePrevu | text/number | State local (foncier{...}) | prixVenteFoncierDH requis (check côté submit compute()) |
| **Quote** | N/A (affichage du snapshot POST /p4/quote) | readonly | State (quote) | Conditionnel : affichage ssi quote !== null |
| **Identity** | clientNom, clientTel, clientEmail, raisonSociale | text | State local (identity{...}) | clientNom + clientTel requis (check dans submit()) |

**Storage** : Aucune persistence localStorage (contrairement à P1 qui a `STORAGE_KEYS.p1Draft`). Données perdues au refresh.

**Validation** :
- `compute()` (ligne 140) : lance validation prixVenteFoncierDH > 0 sinon erreur "portes.p4.err.prix_required".
- `submit()` (ligne 163) : clientNom + clientTel requis sinon "portes.p4.err.name_phone".

## 4. API endpoints appelés

**Depuis P4Home.tsx** :

| Endpoint | Méthode | Body/Params | Réponse | Ligne |
|---|---|---|---|---|
| `/p4/packs` | GET | - | `{ok: true, items: Pack[]}` | 132 |
| `/p4/quote` | POST | `{pack, prixVenteFoncierDH}` | `{ok: true, meta, base, deliverables, amounts, payment, notes}` | 148 |
| `/p2/intake` | POST | `{porteType:"P4", gestionMode, commune, raisonSociale, clientNom, clientTel, clientEmail, natureProjet, surfaceTerrain, title, source:"P4_WIZARD", lang, brief:{pack, packLabel, titreFoncierNum, adresse, prixVenteFoncierDH, natureUsagePrevu, quoteSnapshot}}` | `{ok: true, dossierId, message, access_token, user, loginHint}` | 175 |

**Backend correspondant** :

| Endpoint | Contrôleur | Ligne | Guards | Opérations DB |
|---|---|---|---|---|
| `GET /p4/packs` | `/c/citurb/apps/api/src/tomes/tome-4/p4/quote.controller.ts:15-18` | 15 | Aucun (public) | Aucune (en-mémoire) |
| `POST /p4/quote` | `/c/citurb/apps/api/src/tomes/tome-4/p4/quote.controller.ts:20-27` | 20 | Aucun (public) | Aucune (calcul stateless) |
| `POST /p2/intake` | `/c/citurb/apps/api/src/tomes/tome-2/p2/intake.controller.ts:62-169` | 62 | Aucun (public) | **CREATE User (si absent), CREATE Dossier, FIRE notifications** |

**GuardsDetail** :
- `/p4/packs` et `/p4/quote` : publics (aucune auth).
- `/p2/intake` : public MAIS avec logique critique (auto-create user + dossier, token issue).

## 5. Modèles Prisma touchés

**Tables impactées par le flux P4** :

| Table | Opération | Context | Champs spécifiques |
|---|---|---|---|
| **User** | CREATE | intake.controller.ts:76 - si email absent | email, passwordHash (temp), role=CLIENT |
| **Dossier** | CREATE | intake.controller.ts:89 / dossier.service.ts:28 | ownerId, title, commune, porteType="P4", gestionMode, sousTypeP2, payload (brief snapshot), phase="PHASE_00_BRIEF", packSelected=null (à valider par admin), clientNom, clientTel, clientEmail |
| **Payment** | CREATE | stripe-checkout.controller.ts (post-devis) | dossierId, amountMAD (from quote), status="PENDING_STRIPE" |
| (future) **QuoteSnapshot** | (no table yet) | Embedded dans Dossier.payload.brief | Quote object non normalisé |

**Observations** :
- Pas de table dédiée pour P4Quote - stocké dans payload JSON (Dossier.payload.brief.quoteSnapshot).
- Dossier.phase toujours "PHASE_00_BRIEF" après intake (transitions gérées par admin via PackValidationService).

## 6. État (state machine si applicable)

**State machine pour Dossier.phase** (phase-engine.service.ts) :

P4 dossiers suivent le modèle global E0-E11 (terme interne: "PHASE_*"):

```
PHASE_00_BRIEF
  -> [admin valide pack]
-> PHASE_01_ESQUISSE
  -> ... (PHASE_02-PHASE_11 pour P1, non applicable P4 car no chantier/DET)
```

**Spécifiquement pour P4** : P4 n'a pas de phase projet longue - c'est un rapport ponctuel. Le flow attendu :
1. Intake -> Dossier créé (PHASE_00_BRIEF).
2. Paiement Stripe -> PackValidationService.handlePaymentReceived() -> status="PENDING_ADMIN_VALIDATION".
3. Admin clique "Valider le pack" -> status="ACTIVATED" (trigger email au client: "Votre rapport est en cours d'analyse").
4. (Future) Rapport généré -> `rapportPret()` email (ClientNotifyService).

Pas de transitions auto-générées pour P4 (contrairement à P1 qui a workflow chantier détaillé).

## 7. i18n

**Namespace** : `portes.json` (monolithique, 116 KB).

**Clés P4** : 17 clés détectées (`grep -o '"p4\.[^"]*"'`). Exemples :
- `p4.home_title`, `p4.home_subtitle`
- `p4.packs.basique.label`, `.moyen.label`, `.rentabilite.label`
- `p4.watermark_notice_full`
- `p4.titre_foncier_label`, `p4.prix_vente_label`, etc.

**Namespaces additionnels appelés depuis P4Home** :
- `portes.p4.*` (17 clés)
- Fallback : `useT()` hors contexte retourne la clé brute si non trouvée.

**Langs** : FR / AR / EN (stocké dans localStorage sous `citurbarea.lang`).

**Note** : P4Home appelle `getStoredLang()` pour persister lang dans intake payload (Dossier.payload.lang), permettant emails transactionnels en bonne langue.

## 8. Intégrations externes

| Service | Usage | Endpoint/Method | Config env | Intégration |
|---|---|---|---|---|
| **Stripe** | Paiement | POST https://api.stripe.com/v1/checkout/sessions | STRIPE_SECRET_KEY | stripe-checkout.controller.ts (POST /api/payment/checkout-session/:dossierId) -> crée session -> client redirige vers Stripe-hosted page |
| **Stripe Webhook** | Confirmation paiement | POST /webhooks/stripe (inbound) | STRIPE_WEBHOOK_SECRET | stripe-webhook.controller.ts - verify HMAC-SHA256, extract dossierId, call PackValidationService.handlePaymentReceived() |
| **Resend (ou Gmail SMTP)** | Emails clients | SMTP | SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS | ClientNotifyService - 4 templates (demandeRecue, paiementRecu, packActive, rapportPret) |
| **Owner notifications** | SMS/email admin | (non spécifié) | - | OwnerNotifyService.notify() - fire-and-forget (async, no await) |
| **R2 / Storage** | Documents, rapports P4 (future) | (non implémenté) | STORAGE_BUCKET, R2_ACCESS_KEY, etc. | StorageService.ensureDossierStructure() appelé mais noop pour P4 (pas de docs à l'intake) |

**Absence notée** : Pas d'intégration de génération PDF automatique dans le code actuel. P4PricingService ne génère QUE les devis (Quote metadata), pas les rapports finaux. Implémentation future via admin dashboard ou service asynchrone.

## 9. Génération auto (devis, contrat, etc.)

**Devis (Quote)** : `P4PricingService.computeQuote()` (pricing.service.ts:98-148).
- **Output** : Objet Quote (sans PDF) - snapshot JSON stocké dans Dossier.payload.brief.quoteSnapshot.
- **Calcul** :
  - Taux : PACK_RATES[pack] (0.3%, 0.6%, 1.0%).
  - Plancher : 3000 DH HT (FLOOR_HT).
  - TVA : 20% sur totalHT.
  - Livraisons, modalities, notes : hardcodées dans PACK_DEFINITIONS.

**Rapport PDF (P4)** : **Non implémenté** actuellement.
- **Docs mentionnées** : "Rapport PDF watermarké (10-15 pages)" [BASIQUE], "Rapport PDF watermarké (20-30 pages)" [MOYEN], "Rapport PDF watermarké (40-60 pages) + tableaux Excel" [RENTABILITE].
- **Watermark** : "Rapport exclusif CITURBAREA - utilisable sur autorisation écrite" (pricing.service.ts:137-138).
- **Déclencheur attendu** : Après paiement + admin activation, service asynchrone (Celery, Bull queue, ou manuel admin) génère le PDF et envoie email `rapportPret()` (ClientNotifyService:139-150).
- **Livraison** : Téléchargement post-paiement (modal ou lien en email).

**Facture** : Intégrée via QuoteInvoiceService (quote-invoice.service.ts, 23KB) pour toutes les portes - non spécifique P4.

## 10. Flow end-to-end (parcours utilisateur)

**Happy path P4 (5 étapes)** :

1. **Landing** : Utilisateur visite /p4 -> voit 3 packs (BASIQUE/MOYEN/RENTABILITÉ) avec icones, ratePct, livraisons.

2. **Qualification foncière** : Sélectionne pack -> formulaire foncier (titreFoncier, surface, commune, adresse, **prix vente cible en DH**) -> clique "Calculer".

3. **Devis** : POST /p4/quote -> affichage immédiat : montant TTC, décomposition HT/TVA, liste livraisons, modalities de paiement, notes applicables.

4. **Identité client** : Rentre nom, tél, email, raison sociale (optionnel) -> clique "Soumettre".

5. **Création dossier + paiement** :
   - POST /p2/intake -> User créé/récupéré, Dossier créé (PHASE_00_BRIEF), dossierId retourné.
   - access_token émis -> localStorage.setItem("citurbarea.token").
   - Redirection /payment/start?dossier={dossierId} (user peut aussi aller directement ou via email client-notify).
   - Paiement Stripe Checkout -> webhook /webhooks/stripe -> PackValidationService.handlePaymentReceived() -> status="PENDING_ADMIN_VALIDATION".
   - Email paiement reçu (ClientNotifyService.paiementRecu()).
   - Admin valide -> email pack activé, dossier en phase étude.
   - (Future) Admin lance génération rapport -> PDF watermarqué + email téléchargement.

**Duration** : Étapes 1-4 : ~5-10 min user-facing. Paiement : ~2 min. Rapport : 7-18 jours selon pack (deliveryDays).

## 11. Gaps / TODOs / FIXMEs

**Commentaires explicites** :

1. **P4Home.tsx:62** - `// FIX-4 - responsive: CSS injecté pour caps fluides + row2 mobile-friendly`
   - **Status** : Responsive CSS injecté mais pas rigoureusement testé sur tous les breakpoints (indication de tech debt).

2. **P4Home.tsx:204** - `if (data.access_token) { try { localStorage.setItem("citurbarea.token", data.access_token); } catch {} }`
   - **Status** : Try-catch silencieux si localStorage indisponible (expected en mode private/incognito).

3. **intake.controller.ts:144** - `// Ca le client vient de re-fournir ses informations dans le wizard`
   - **Status** : Bypass magic-login par email re-fourni dans intake (design considéré sûr car email=vérif implicite).

4. **stripe-webhook.controller.ts:71-72** - `// Note: NestJS @Body() parse déjà le JSON. Pour Stripe il faut le raw body. Workaround: utiliser req.rawBody si disponible`
   - **Status** : Fragile (re-sérialisation JSON peut échouer si double-encoding). Solution: configurer rawBody globally dans main.ts (à vérifier).

**Éléments non terminés / à implémenter** :

- **Génération PDF P4** : Aucune intégration de service de génération (Puppeteer, pdfkit, etc.) - mentionné comme "future" dans pricing.service.ts.
- **Téléchargement watermarqué** : Aucun endpoint GET /p4/rapport/:dossierId/download ou similaire.
- **Signalement d'erreur Stripe** : Pas de fallback si STRIPE_SECRET_KEY absent en production (logge warning, mais UX réduit à "contactez l'admin").
- **Validation prix négatif** : Côté client aucune validation input type="number" min="0". Côté serveur : vérification `prix <= 0` throw error (acceptable).
- **Archivage dossier P4** : Pas de soft-delete ou expiration (dossiers brouillon restent indéfiniment en PHASE_00_BRIEF).

## 12. Risques / points attention pour audit GPT/Claude

### 1. Sécurité : Intake endpoint public sans throttling / CAPTCHA
- **Risque** : `/p2/intake` est PUBLIC (aucune JwtAuthGuard) et crée des Dossier + User auto.
- **Scénario d'abus** : Bot spam crée N utilisateurs factices, SMS/email abuse pour OwnerNotifyService.
- **Mitigation requise** :
  - Ajouter rate-limiting par IP (redis-backed, ex: @nestjs/throttler).
  - CAPTCHA côté /p4 (ou /p2/intake) avant soumission.
  - Validation email via OTP avant création User (actuellement : email pris sur parole).

### 2. Logique métier : Calcul tarifaire + floor n'est pas auditable
- **Risque** : P4PricingService.computeQuote() est stateless + déterministe (bon), MAIS :
  - Taux (0.3/0.6/1.0) hardcodés, pas externalisable par admin.
  - Plancher 3000 DH HT hardcodé, pas configurable.
  - TVA 20% hardcodé (en 2026, peut changer légalement au Maroc).
- **Mitigation** : Externaliser rates/floor/tva dans Prisma config ou feature flags (Stripe-like).

### 3. Paiement : Montant lu depuis client-side quote snapshot
- **Risque** : `stripe-checkout.controller.ts:62-68` extrait amountMAD depuis `dossier.payload.brief.quoteSnapshot`.
- **Exploit potentiel** : Si client pouvait manipuler quote snapshot lors de intake (via client-side injection), le montant Stripe serait faux.
- **Mitigation** : **Recalculer le devis côté serveur** au moment du checkout, ne pas faire confiance au snapshot. Exemple :
  ```typescript
  const fresh = this.pricingService.computeQuote({
    pack: brief.pack,
    prixVenteFoncierDH: brief.prixVenteFoncierDH
  });
  const amountMAD = fresh.amounts.totalTTC; // != snapshot.amounts.totalTTC possible
  ```

### 4. UX/Data loss : Pas de draft storage
- **Risque** : Si utilisateur quitte /p4 à step 2 ou 3, toutes les données sont perdues (contrairement à P1 qui a localStorage draft).
- **Scénario** : Utilisateur entre 50 champs fonciers, ferme l'onglet par erreur -> repart de zéro -> mauvaise UX, taux d'abandon.
- **Mitigation** : Ajouter `STORAGE_KEYS.p4Draft(userId)` et sauvegarder state local à chaque keystroke (debounced).

### 5. Intégration email : Fire-and-forget notifications sans logging audit
- **Risque** : `ownerNotify.notify()` et `clientNotify.demandeRecue()` lancés sans attendre (ligne 117, 133). Si Resend/SMTP fail, user ne le sait pas.
- **Symptôme** : Client attend confirmation email, ne la reçoit pas (SMTP down, config invalide, bouncing IP).
- **Mitigation** :
  - Logger tous les sends/fails dans NotificationLog table.
  - Afficher banner "Confirmation email envoyée à {email}" en success screen.
  - Admin dashboard pour relancer notifications (retry).

## Synthèse P4

**P4 - Analyse Foncière** est une **porte complète, fonctionnelle et intégrée** au flux de paiement Stripe + lead capture. Architecture :
- **Frontend SPA** : 405 lignes, 4 steps linéaires (pack -> foncier -> quote -> identity -> success).
- **Backend pricing** : 149 lignes, service stateless, déterministe.
- **Intake public** : Crée User/Dossier, émet JWT, notifie OPS/client (fire-and-forget).
- **Paiement** : Stripe Checkout + Webhook integration (basique mais sécurisé : HMAC-SHA256, timing check).

**Points forts** :
- Calcul tarifaire transparent (% + plancher) avec notes explicatives.
- State machine complète (PHASE_00_BRIEF -> étapes validation).
- i18n multilingue (FR/AR/EN).
- Responsif (FIX-4 CSS injection).

**Points d'amélioration critiques** :
1. **Rate-limiting + CAPTCHA** sur /p2/intake (risque bot spam).
2. **Recalcul devis serveur** à checkout (ne pas faire confiance snapshot client).
3. **Draft storage** pour réduire taux d'abandon.
4. **Audit email** : logger all sends/fails, offrir retry.
5. **Tarification externalisée** : rates, floor, TVA via config Prisma (facilite ajustements futurs).

**Prêt pour audit GPT/Claude** : Code bien structuré, comportements documentés, absence critique = génération PDF (future). Recommandation : starter audit sur sécurité intake + montant payment validation avant production.

**Fichiers de référence P4** :
- `/c/citurb/apps/web/src/tomes/tome3/portals/p4/P4Home.tsx` (405 L)
- `/c/citurb/apps/api/src/tomes/tome-4/p4/pricing.service.ts` (149 L)
- `/c/citurb/apps/api/src/tomes/tome-2/p2/intake.controller.ts` (170 L)
- `/c/citurb/apps/api/src/tomes/tome-1/stripe-checkout.controller.ts` (120+ L)
- `/c/citurb/apps/api/src/tomes/tome-1/stripe-webhook.controller.ts` (100+ L)
- `/c/citurb/apps/api/src/modules/client-notify/client-notify.service.ts` (partial, email templates)
- `/c/citurb/prisma/schema.prisma` (User, Dossier, Payment models)

---

# P5 - Rapports & expertises - 4 types de rapports (Visa foncier, etc.)

## 1. Routes & navigation

**Routes principales (apps/web/src/tomes/tome1/router/routes.tsx:270-271)**
- `/p5` -> `<P5Home />` - Qualification et saisie des paramètres (phase identité -> rapport -> détails -> délai)
- `/p5/finalize` -> `<P5Finalize />` - Post-authentification : affichage carte + auto-détection urbanisme + référentiels DGI + fourchette de prix

Pas de sous-routes `/p5/packs` ou `/p5/dossier` - P5 reste monolithique : un seul flux "wizard" linéaire suivi d'un écran finalize après création du dossier.

## 2. Composants par route

**P5Home.tsx** (apps/web/src/tomes/tome3/portals/p5/P5Home.tsx:1-915 / 1253 lignes total)
- **Sections clés JSX** :
  - Hero (ligne 679-726) : titre "Rapports & expertises", kicker, tarif à partir 990 DH HT, CTA "Démarrer qualification"
  - Identité (ligne 729-799) : MOA (physique/morale), contact (nom/tél/email), localisation HCP (région/province/commune), adresse libre
  - Géoréférencement Lambert Maroc (ligne 802-894) : multi-points, zones EPSG:26191-26195, conversion WGS84
  - MapPicker (ligne 903-914) : interactif, recalcul auto-détection zoning en 600ms
- **État complet** : 4 phases (`Phase = "identity" | "report" | "details" | "delay"`), selectedReport, bienFamily (TERRAIN_NU, VILLA, PETIT_COLLECTIF, GRAND_COLLECTIF, EQUIPEMENT, AMENAGEMENT, AUTRE), zoneTier (8 niveaux RURAL -> ULTRA), standing (4 : économique/moyen/haut/luxe)
- **Données hardcodées vs API** :
  - Hardcodé : REPORT_CARDS (4 rapports : ESTIMATION_EXPRESS, EXPERTISE_PRIX, EXPERTISE_URBA, READY_TO_INVEST)
  - API -> `/p5/quote` POST (buildQuoteBody) - reçoit Quote snapshot
  - API -> `/api/sig/dgi-zones/{cityId}` GET - catalogue DGI (Rabat : 49 zones avec prix PT/PC)
  - API -> `/api/sig/auto-detect-zone?lat=...&lng=...` GET - détection PA AURS + fourchette prix

**P5Finalize.tsx** (apps/web/src/tomes/tome3/portals/p5/P5Finalize.tsx:1-594 lignes)
- **Sections clés JSX** :
  - Confirmation création dossier (ligne 198-217) : "Dossier d'expertise créé", dossierId, CTA paiement
  - Module Localisation (ligne 219-261) : MapPicker avec couches PA AURS overlay, markers DGI géocodés, possibilité repositionnement
  - Module Urbanisme (ligne 263-344) : auto-détection source (AURS / commune mapping), arrondissement, zone réglementaire, COS/hauteur max, fourchette prix estimée
  - Module Foncier (ligne 346-489) : dropdown zones DGI par arrondissement, détail complet (prix terrain 2017, construction 2017, estimation marché 2026), table récapulative prix
  - CTA bas (ligne 491-504) : paiement, mes dossiers, explorer SIG
- **Données post-auth** : brief du payload localStorage (geoLat/geoLng, reportLabel, surfaceTerrainM2, zoneTier), autoDetect (detected.source, suggested.zoneTier/priceRange/reasoning), dgiCity (zones + arrondissements)

## 3. Forms & data captured

**Champs saisie P5Home** :
| Nom | ID/Clé | Type | Validation | Stockage |
|-----|--------|------|-----------|----------|
| Statut MOA | moaType | radio : "physique" / "morale" | obligatoire | state moaType |
| Nom complet | clientNom | text | non-empty + 1+ char | state identity.clientNom |
| Téléphone | clientTel | tel | non-empty | state identity.clientTel |
| Email | clientEmail | email | optional | state identity.clientEmail |
| Raison sociale (si morale) | raisonSociale | text | requis si morale | state identity.raisonSociale |
| Représentant légal (si morale) | representant | text | requis si morale | state identity.representant |
| RC | rc | text | optional | state identity.rc |
| ICE | ice | text | optional | state identity.ice |
| Région | region | select HCP | obligatoire | state identity.region + adminCodes |
| Province | province | select HCP | obligatoire | state identity.province + adminCodes |
| Commune | commune | select HCP | obligatoire | state identity.commune + adminCodes |
| Adresse précise | adresseBien | text | optional | state identity.adresseBien |
| Zone Lambert | lambertZone | select : EPSG:26191-26195 | optional | state lambertZone |
| Points Lambert (multi) | lambertPoints | number pairs (X, Y) | optional | state lambertPoints[] |
| Type de bien | bienFamily | select : 7 catégories | obligatoire | state bienFamily |
| Surface terrain (m2) | surfaceTerrainM2 | number | > 0 (sauf AMENAGEMENT) | state surfaceTerrainM2 |
| Surface plancher (m2) | surfacePlancherM2 | number | optional sauf AMENAGEMENT | state surfacePlancherM2 |
| Niveau (R+) | rLevel | select : R0-R8 | optional | state rLevel |
| Nombre bâtiments | nbBatiments | number | optional, défaut 1 | state nbBatiments |
| Standing | standing | select : 4 tiers | défaut "moyen" | state standing |
| Tranche zone | zoneTier | select : 8 tiers | défaut "URBAIN" | state zoneTier |
| Report choisi | reportType | radio : 4 types | obligatoire | state reportType |
| Délai souhaité | delayMode | radio : EXPRESS/STANDARD/ECONOMIQUE | défaut STANDARD | state delayMode |
| Je connais les valeurs | knowsValues | checkbox | optional | state knowsValues |
| Prix foncier (override) | prixFoncier | number | si knowsValues | state prixFoncier |
| Coût construction (override) | coutConstruction | number | si knowsValues | state coutConstruction |
| Montant investissement (override) | montantInvest | number | si knowsValues | state montantInvest |

**Conditions affichage** :
- Bloc "Société" (raison sociale, représentant, RC, ICE) : visible si `moaType === "morale"` (ligne 767)
- Champs financiers (prixFoncier, coutConstruction, montantInvest) : visibles si `knowsValues === true` (ligne 342 validation)
- Auto-remplissage montantInvest pour READY_TO_INVEST : si reportType === "READY_TO_INVEST" -> montantInvest = prixFoncier + coutConstruction (ligne 310)
- Points Lambert supplémentaires : bouton "+ Ajouter un sommet" optionnel dans détail collapsible (ligne 853)

**Storage local** :
- localStorage key: `"citurbarea:p5:pending_intake:v1"` (ligne 38, 562, 82 P5Finalize)
- Contenu : payload complet buildIntakePayload() (ligne 484-545) sérialisé JSON, lu/écrit dans P5Home et P5Finalize

## 4. API endpoints appelés

| Endpoint | Méthode | Ligne source | Body envoyé | Réponse attendue | Authentification |
|----------|---------|--------------|-------------|------------------|-----------------|
| `/p5/quote` | POST | P5Home:388, P5Home:469 | P5QuoteInput {reportType, delayMode, bienFamily, surface*, rLevel, nbBatiments, standing, zoneTier, prixFoncierMAD?, coutConstructionMAD?, montantInvestissementMAD?} | Quote {ok, meta, base, estimation?, deliverables, amounts} | PUBLIC (pas de JwtAuthGuard) |
| `/api/sig/dgi-zones/{cityId}` | GET | P5Home:418, P5Finalize:126 | - | DgiCityData {_meta, arrondissements[], zones[]} | PUBLIC |
| `/api/sig/auto-detect-zone` | GET | P5Home:445, P5Finalize:155 | URLSearchParams {lat?, lng?, commune, region, address, bienFamily} | {ok, detected, suggested} avec zoneTier/priceRange/reasoning | PUBLIC |
| `/api/sig/dgi-zones-geo/{cityId}.geojson` | GET | P5Finalize:130 | - | GeoJSON {features[]} avec markers zones | PUBLIC |
| `/p2/intake` | POST | P5Finalize:72 | IntakePayload (voir below) | {ok, dossierId, access_token, user} | PUBLIC (peut avoir token Bearer optionnel) |

**POST /p2/intake** (utilisé par P5Finalize.tsx:65-89) :
```
{
  porteType: "P5",
  gestionMode: "AUTONOME",
  commune, raisonSociale, representant, rc, ice,
  clientNom, clientTel, clientEmail,
  natureProjet, title, lang, source: "P5_WIZARD",
  brief: {
    reportType, reportLabel, delayMode,
    bienFamily, surfaceTerrainM2, surfacePlancherM2,
    rLevel, nbBatiments, standing, zoneTier,
    prixFoncierMAD?, coutConstructionMAD?, montantInvestissementMAD?,
    adresseBien, region, province, moaType,
    geoLat, geoLng, geoSource,
    mohafadatiDocument?, titleFoncier?,
    lambertSommets?, fromP2Dossier?, quoteSnapshot
  }
}
```

**Backend correspondant** :
- `POST /p2/intake` -> apps/api/src/tomes/tome-2/p2/intake.controller.ts (ligne 62-170) :
  - Find or create User (auto-register si email nouveau)
  - Create Dossier owned by user avec payload.brief
  - Issue JWT access_token (magic-login)
  - Fire notifications ownerNotify + clientNotify (fire-and-forget)
  - Return {ok, dossierId, access_token}
- `POST /p5/quote` -> apps/api/src/tomes/tome-6/p5/quote.controller.ts (ligne 21-28) -> P5PricingService.computeQuote()
- `GET /api/sig/dgi-zones/{cityId}` -> Retourne catalogue DGI (parsé depuis PDF officiel DGI 2017, 17 villes)
- `GET /api/sig/auto-detect-zone` -> Zone detector service (PA AURS point-in-polygon, commune mapping, DGI signature prix)

**Guards** :
- `/p5/quote`, `/api/sig/*` : PUBLIC, sans JwtAuthGuard
- `/p2/intake` : PUBLIC mais accepte token optionnel si user authed -> rechargement du JWT
- `/payment/checkout-session/{dossierId}` (paiement après) : JwtAuthGuard + ownership check (stripe-checkout.controller.ts:36)

## 5. Modèles Prisma touchés

Lecture/Écriture pendant le flux P5 :

| Modèle | Opération | Détail | Fichier |
|--------|-----------|--------|---------|
| User | CREATE (si nouvel email) | Auto-register avec mdp temporaire | intake.controller.ts:76 |
| User | READ | Find by email | intake.controller.ts:71 |
| Dossier | CREATE | Owned by user, porteType="P5", payload.brief + all fields | intake.controller.ts:89, dossier.service.ts |
| Dossier | UPDATE (post-payment) | packValidation status, project link | stripe-webhook.controller.ts (externe à P5 flux) |
| Project | CREATE (via webhook) | Créé au 1er paiement via PackValidationService | externe |
| Payment | CREATE | Si paiement Stripe (pas créé par P5 lui-même) | stripe-webhook.controller.ts |

**Opérations CRUD concrètes** :
1. **CREATE User** : `prisma.user.create({ email, passwordHash, role: "CLIENT" })` (intake.controller.ts:76)
2. **READ User** : `prisma.user.findUnique({ where: { email } })` (intake.controller.ts:71)
3. **CREATE Dossier** : `prisma.dossier.create({ ownerId, title, porteType: "P5", payload: { brief: {...} }, ...fields })` (dossier.service.ts)

**Champs Dossier affectés par P5** :
- `porteType` = "P5"
- `gestionMode` = "AUTONOME"
- `commune`, `address` (adresseBien)
- `clientNom`, `clientTel`, `clientEmail`
- `raisonSociale`, `rc`, `ice`, `representant` (si morale)
- `payload` JSON = { brief: { reportType, bienFamily, surfaceTerrain, zoneTier, delayMode, quoteSnapshot, ... } }
- `createdAt`, `updatedAt`
- `projectId` (créé ultérieurement au paiement)

## 6. État (state machine si applicable)

P5 **ne déclenche pas directement** de transitions d'état E0-E12 (celle-ci gérées par PhaseEngineService pour les portes P1-P4). Cependant :

- À `/p2/intake` success : Dossier créé en state implicite **"DRAFT"** (DossierStatus enum, schema.prisma:345-352)
- Après paiement webhook Stripe : transition implicite vers "SUBMITTED" (gérée par PackValidationService, externe à P5)
- Pas de phases **E0-E12** propres à P5 (ces phases sont P1/P2-centric)

P5 reste donc **transactionnel pur** : qualification -> dossier -> paiement -> notification, sans machine d'état complexe.

## 7. i18n

**Namespaces utilisés** :
- `portes.p5.*` - landing + hero + steps + labels (apps/web/src/locales/fr/portes.json:1364-1387+)
- `p5.lp.*` - landing page SEO (non visible dans P5Home actuel)
- `p5.home_title`, `p5.home_subtitle`, `p5.bankable_notice`, `p5.who_are_you`, etc. - clés générales (portes.json:113-130)

**Estimation nombre clés i18n** :
- ~60 clés spécifiques P5 (hero, identité, rapports, délais, etc.)
- REPORT_CARDS affiche 4 x 6 bulletKeys (24 clés) + catégories/titres
- Totalement ~100-150 clés dédiées P5

**Langues supportées** : FR (défaut), EN, AR (paramètre `lang` dans payload brief)

## 8. Intégrations externes

| Service | Usage | Intégration |
|---------|-------|------------|
| **Stripe** | Paiement devis P5 (post-dossier création) | POST /api/payment/checkout-session/{dossierId} -> https://api.stripe.com/v1/checkout/sessions (REST API, pas lib Stripe) - montant lu depuis brief.quoteSnapshot.amounts.totalTTC (stripe-checkout.controller.ts:61-94) |
| **Resend** | Email client confirmation (demandeRecue) + notifs ops | Prioritaire (fallback SMTP) - apps/api/src/modules/email/email.service.ts - token RESEND_API_KEY |
| **Twilio** (optional) | SMS confirmation OTP après signup (/creer-compte/client) | apps/api/src/modules/twilio/twilio.service.ts - E.164 format phone |
| **R2 / S3** (optional) | Stockage mohafadatiDoc (image titre foncier) + documents dossier | Pas encore intégré en P5Home (upload UI existe mais pas de backend upload) |

## 9. Génération auto (devis, contrat, etc.)

**Devis PDF** :
- **Générateur** : apps/api/src/tomes/tome-6/p5/pricing.service.ts - `computeQuote()` retourne JSON Quote structuré (pas PDF natif)
- **Affichage client** : P5Home ligne 601-661 affiche quote.meta/base/amounts/deliverables/notes en HTML stylisé (section "lux-card"), inclut bouton "Imprimer / Sauvegarder en PDF"
- **Export PDF côté user** : browser print-to-PDF (window.print()) - pas de génération serveur actuellement

**Contrat** : Non généré par P5 (reste one-shot expertise, pas de contrat MOD comme P3)

**Livrables** : P5PricingService définit quote.deliverables[] (tableau de strings), ex. pour EXPERTISE_PRIX :
```
[
  "Synthèse exécutive - valeur retenue et fourchette",
  "Description du bien et visite terrain",
  "Étude de marché comparée (>= 3 références ventes)",
  ...
]
```

## 10. Flow end-to-end (parcours utilisateur)

**Happy Path "Expertise Prix"** (10 étapes) :
1. **Landing** -> Clic "Démarrer qualification" -> Scroll P5Home #p5-identity (hero visible)
2. **Identité** (Étape 1) -> MOA physique -> Nom/Tél/Email -> Région/Province/Commune -> Adresse précise (ex. "Avenue Mohammed VI, secteur 4")
3. **Carte** (Étape 1 suite) -> MapPicker interactif -> geoCoords stockés (lat/lng) -> Auto-détection zone 600ms après frappe adresse
4. **Rapport** (Étape 2) -> Selection "Rapport Expertise Prix" parmi 4 cartes (0,5 % du foncier, min 1 500 DH)
5. **Détails** (Étape 3) -> Type bien "VILLA", Surface 500 m2, R+1, Standing "moyen", Tranche "BON_QUARTIER" -> Aperçu devis en transparence 400ms (preview state)
6. **Délai** (Étape 4) -> Selection "Standard" (10 j) -> Devis 3 700 DH HT visible (format bold/or) + livrables énumérés
7. **Submit** -> Bouton "Continuer" -> Validation identité + détails réussit -> localStorage P5_PENDING_KEY + redirection `/creer-compte/client?email=...&next=/p5/finalize`
8. **Signup** (externe, P5Finalize prend le relais) -> Email/SMS OTP validation -> Dossier créé (POST /p2/intake)
9. **P5Finalize** -> Affichage post-auth : Carte SIG + Module Urbanisme (auto-détection PA AURS : "Zone résidentielle villa, COS <= 0,6") + Module Foncier (zones DGI Rabat, fourchette prix 8k-12k DH/m2)
10. **Paiement** -> Clic "Payer maintenant" -> Stripe Checkout Session -> Redirection success -> Dossier actif en portal

**Temps total** : ~5-10 min qualification + ~2 min signup + accès immédiat post-paiement

## 11. Gaps / TODOs / FIXMEs

**Visibles dans le code** :
- P5Home ligne 701 : commentaire "Vous arrivez depuis la Porte 2" (`fromP2` hint) - liaison optionnelle P2 -> P5 implémentée
- P5Finalize ligne 130-131 : fallback silencieux si pas géocodé pour ville (zones DGI-geo.geojson absent) - feature complète pour Rabat seulement
- pricing.service.ts ligne 258-264 : Tranches EXPERTISE_URBA basées sur coût construction, pas prix foncier - logique OK mais nomenclature légèrement confuse

**Incomplet / en cours** :
- **Génération PDF vrai** (rapports) : Service P5PricingService.computeQuote() fournit snapshot pour devis pré-paiement, mais **rapport expert final (PDF signé) n'est pas généré par P5 lui-même** - creation admin-manuelle ou via tome-7/report-renderer.service.ts (externe)
- **Upload mohafadatiDoc** (document foncier) : UI existe (MohafadatiUpload composant ligne 7), form capture (line 526), mais **backend endpoint `/api/p5/upload` inexistant** -> upload non opérationnel
- **Numéro titre foncier validation** : TitleFoncierInput composant chargé (ligne 9), form capture (ligne 285-286), mais **service de lookup ANCFCC/conservation pas implémenté** -> validation superficielle
- **DGI Casablanca/Marrakech/Tanger** : Catalogue hardcodé Rabat (49 zones) seulement ; parser/data Casa/Marrakech/Tanger à venir (ligne 409, commentaire "À ajouter")

## 12. Risques / points attention pour audit GPT/Claude

### 1. Sécurité - Divulgation données sensibles pré-auth
- GOOD : P5Finalize docstring (ligne 10-17) explicite : "aucune donnée urbanisme / prix DGI / fourchette ne s'affiche dans P5Home avant création du compte"
- RISK : MapPicker + auto-detect-zone endpoints **publics sans auth** -> lat/lng + adresse envoyés au backend sans JwtAuthGuard. Pas grave (géolocalisation non-PII), mais audit logs manquent. Suggérer rate-limiting par IP sur `/api/sig/auto-detect-zone` pour anti-abuse.

### 2. Logique métier - Assiette différente par rapport type
- RISK : Tranches dégressives P5PricingService.ts appliquent des taux différents selon rapport :
  - EXPERTISE_PRIX : assiette = prix foncier
  - EXPERTISE_URBA : assiette = coût construction (ligne 484)
  - READY_TO_INVEST : assiette = montant total invest
  - Les planchers (minHT) varient aussi : 1 500 / 2 500 / 15 000 DH
  - Validation urgente : ces tranches/minHT correspondent-elles au barème officiel CNOA + décision pricing interne ?

### 3. Performance - Debounce + requêtes multiples
- GOOD : `useEffect([...adresseBien...])` debounce 600ms avant appel auto-detect-zone (ligne 432)
- RISK : P5Home triggère ~5 API calls en parallèle lors remplissage form (DGI lookup + auto-detect + quote preview + lambert conversion) sans cache. Audit latency/timeout sur slow networks (3G, MRE Diaspora).

### 4. Données orphelines - localStorage persist après erreur
- RISK : P5_PENDING_KEY stocké à ligne 562 même si validation échoue (try/catch silencieux). Si user ferme tab après "Continuer" -> essai -> back, payload stale peut resservir en P5Finalize. Suggérer delete après 24h ou re-valider dans P5Finalize.

### 5. Validation côté client uniquement
- RISK : Validations (validateIdentity, validateDetails) côté React seulement. Backend /p2/intake n'applique PAS les mêmes validations. Attaquant peut forger POST /p2/intake avec porteType="P5" + fields vides. Suggérer validation backend stricte + logging incidents.

**Résumé audit P5** : P5 est une **porte transactionnelle premium bien structurée** (qualification -> devis transparent -> dossier -> paiement). Architecture découpling clair (frontend P5Home/P5Finalize, backend intake générique). Points attention : (1) rate-limit SIG API, (2) audit tranches pricing CNOA, (3) validation backend stricte, (4) cleanup localStorage après 24h, (5) test latency réseau lent (MRE).

---

# P6 - Prestataires & fournisseurs - référencement, scoring L7, catalogue matériaux

## 1. Routes & navigation

**Routes P6 dans routes.tsx** (C:\citurb\apps\web\src\tomes\tome1\router\routes.tsx:275-286):

| Path | Composant | Description |
|------|-----------|-------------|
| `/p6` | `Redirect to="/cercles"` | Landing P6 redirige vers Cercles (réseau pro) |
| `/p6/dashboard` | `P6Dashboard` | Tableau de bord prestataire/fournisseur (gestion catalogue) |
| `/materiaux` | `MaterialsCatalogPage` | Catalogue matériaux public (Phase 3) |
| `/materiaux/:code` | `MaterialDetail` | Détail d'un matériau |
| `/prestataires/tarifs` | `PrestataireTarifsList` | Liste tarifs contractuels prestataires |
| `/prestataires/tarifs/editor` | `PrestataireTarifsEditor` | Éditeur tarifs |
| `/prestataires/tarifs/:tarifId` | `TarifContractPublic` | Affichage public d'un contrat tarif |

**Intégration P6 avec wizard**: Il n'existe pas de route `/p6/form` ou `/p6/wizard` explicite. P6Home (accès via `/p1` ou landing) est importé mais **non routé directement**. L'onboarding prestataire/fournisseur se fait via:
- Landing P1Home (qui propose les 6 portes)
- Wizard intégré dans P6Home composant
- Soumission via `/p2/intake` (endpoint public non-JWT)

## 2. Composants par route

**P6Dashboard.tsx** (C:\citurb\apps\web\src\tomes\tome3\portals\p6\P6Dashboard.tsx, 399 lignes)
- Sections: Hero (titre + compteur items) -> Table catalogue -> Modal create/edit item
- Données:
  - **Hardcoded**: Catégories, unités de mesure, styles inline complets
  - **API**: Fetch `/p6/suppliers/{supplierId}/catalog/manage` (GET) + POST/PATCH/DELETE mutations
  - **Conditions**: Affiche modal d'édition si `showCreate || editingItem`
- Validation: Checks `materialName` + `prixFournitureDH > 0` au submit

**P6Home.tsx** (C:\citurb\apps\web\src\tomes\tome3\portals\p6\P6Home.tsx, 500 lignes)
- Sections:
  1. Hero (badge + titre + grille type fiche)
  2. Step "identité" (raison sociale, RC, ICE, patente, communes, seniority, refs chantiers ou nb matériaux)
  3. Step "classement" (classe BTP + catégories agrément METLE + assurances) - PRESTATAIRE_SERVICE seulement
  4. Step "docs" (checklist documents requis)
  5. Step "score" (preview L7 avec breakdown)
  6. Step "contact" (nom contact + tel + email)
  7. Success page
- Données:
  - **Hardcoded**: 16 catégories matériaux, 8 unités, styles inline, scores de base
  - **API**:
    - `GET /p6/types` -> 2 types fiche
    - `GET /p6/classes-btp` -> 7 classes (Décret 2-94-223 Maroc)
    - `GET /p6/categories-agrement` -> 5 catégories METLE (A/B/C/D/E)
    - `GET /p6/documents-requis` -> 13 docs prestataire, 6 docs fournisseur
    - `POST /p6/scoring` -> calcul score L7 preview
    - `POST /p2/intake` -> soumission (crée Dossier P6)
- Formulaires:
  - Identité: 9 champs + conditionnels (refs/photos pour prestataire, nb matériaux/zones pour fournisseur)
  - Classement: Classe BTP (7 options) + Catégories (multiselect) + Agrement Metle (num + date validité) + 2 assurances (checkbox)
  - Docs: Checklist 13-6 items avec notes optionnelles
  - Contact: 3 champs requis (nom, tel, nom société)

## 3. Forms & data captured

**P6Home Wizard** - 6-step multipart form:

| Step | Champs | Type | Validation | Storage |
|------|--------|------|-----------|---------|
| Type | P6Type (choice) | Radio/Card | Obligatoire | `useState`; envoyé dans `/p2/intake.brief.p6Type` |
| Identité | raisonSociale, rc, ice, patente, commune, representant, ancienneteAnnees, nbReferences/nbPhotosChantiers (prestat) OU nbMateriauxCatalogue/zonesFourniture (fournisseur) | Text/Textarea/Number | raisonSociale requis | `useState identite + brief.brief.*` |
| Classement | classeBTP, categoriesAgrement[], agrementMetleNumero, agrementMetleValidite, decennaleValide, rcProValide | Select/Date/Checkbox | Aucune validation hard | `useState classeBTP, Set<categoriesAgrement>` |
| Documents | docs checkbox par slug (ex: "cin_gerant", "rc", "decennale") | Checkbox | DOCUMENTS_REQUIS_PRESTATAIRE/FOURNISSEUR définissent obligatoire:true/false | `useState docs: Record<slug, boolean>` |
| Score | Preview (non-éditable, recalculé) | JSON display | N/A | Snapshot envoyé dans `brief.scoreSnapshot` |
| Contact | clientNom, clientTel, clientEmail | Text | clientNom + clientTel + raisonSociale requis | `useState identite.client*` |

**Storage**:
- **Frontend local**: `useState` uniquement (pas de localStorage)
- **Backend persistence**: `/p2/intake` crée Dossier avec `porteType:"P6"` et `payload.brief = { p6Type, classeBTP, categoriesAgrement, documents, scoreSnapshot, ... }`
- Catalogue matériaux: `Dossier.payload.supplierCatalog = CatalogItem[]` (JSON dans Dossier, no separate table)

**Conditions affichage**:
- Step "classement" affiché seulement si `type === "PRESTATAIRE_SERVICE"`
- Champs docs varient selon type (DOCUMENTS_REQUIS_PRESTATAIRE vs FOURNISSEUR)
- Champs identité: refs/photos pour prestataire; nb matériaux/zones pour fournisseur

## 4. API endpoints appelés

**Endpoints publics (no JwtAuthGuard)**:

| Méthode | URL | Body | Réponse | Backend |
|---------|-----|------|---------|---------|
| GET | `/p6/types` | N/A | `{ ok, items: [{ code, label, desc, fields }] }` | P6RegistryController.types() -> P6_TYPES constant |
| GET | `/p6/classes-btp` | N/A | `{ ok, items: [{ code:"1"-"7", label, caRange, level }] }` | P6RegistryController.classesBtp() -> CLASSES_BTP |
| GET | `/p6/categories-agrement` | N/A | `{ ok, items: [{ code:"A"-"E", label, desc, subTypes }] }` | P6RegistryController.categoriesAgrement() -> CATEGORIES_AGREMENT |
| GET | `/p6/documents-requis` | N/A | `{ ok, PRESTATAIRE_SERVICE: [...], FOURNISSEUR_MATERIAUX: [...] }` | P6RegistryController.documentsRequis() -> DOCUMENTS_REQUIS_* |
| POST | `/p6/scoring` | P6FicheInput (type, identité, classeBTP, docs, etc.) | `{ ok, score, tier, breakdown, warnings, recommendations, missingDocuments }` | P6RegistryController.scoringPreview(input) -> P6ScoringService.computeScore() |
| POST | `/p2/intake` | IntakePayload (porteType:"P6", identité client, brief, source UTM, lang) | `{ ok, dossierId, access_token, user, loginHint }` | IntakeController.intake() |

**Endpoints protégés (JwtAuthGuard + CapsGuard/RolesGuard)**:

| Méthode | URL | Body | Réponse | Backend | Guards |
|---------|-----|------|---------|---------|--------|
| GET | `/p6/suppliers/{supplierId}/catalog` | (public) search, zone, categorie | `{ supplier, items, total, activeCount }` | SupplierCatalogController.listPublic() -> SupplierCatalogService.list(activeOnly=true) | None |
| GET | `/p6/suppliers/{supplierId}/catalog/manage` | search | `{ supplier, items: [...], activeCount }` | SupplierCatalogController.listManage() | JwtAuthGuard |
| POST | `/p6/suppliers/{supplierId}/catalog` | CatalogItemInput | `{ ok, item }` | SupplierCatalogController.create() | JwtAuthGuard |
| PATCH | `/p6/suppliers/{supplierId}/catalog/{itemId}` | Partial<CatalogItemInput> | `{ ok, item }` | SupplierCatalogController.update() | JwtAuthGuard |
| DELETE | `/p6/suppliers/{supplierId}/catalog/{itemId}` | hard=1/true | `{ ok, item }` ou `{ ok, removed }` | SupplierCatalogController.deactivate() / hardDelete() | JwtAuthGuard |
| GET | `/p6/catalog/search` | search, zone, categorie, take | `{ ok, results, totalMatches }` | SupplierCatalogController.searchCross() | None |

**Admin endpoints**:

| Méthode | URL | Body | Réponse | Backend | Roles |
|---------|-----|------|---------|---------|-------|
| GET | `/api/cc/p6-review/pending` | take | `{ ok, items: [{ dossier, p6Type, classeBTP, score, status }], total }` | P6ReviewController.listPending() | ADMIN/OWNER/OPS |
| GET | `/api/cc/p6-review/{dossierId}` | N/A | `{ ok, dossier, brief, validation, recomputedScore }` | P6ReviewController.detail() | ADMIN/OWNER/OPS |
| PATCH | `/api/cc/p6-review/{dossierId}/verify` | { note?, expiresInDays? } | `{ ok, validation }` | P6ReviewController.verify() -> transition(VERIFIED) | ADMIN/OWNER |
| PATCH | `/api/cc/p6-review/{dossierId}/blacklist` | { reason } | `{ ok, validation }` | P6ReviewController.blacklist() -> transition(BLACKLISTED) | ADMIN/OWNER |
| PATCH | `/api/cc/p6-review/{dossierId}/needs-docs` | { docsToProvide, note? } | `{ ok, validation }` | P6ReviewController.needsDocs() -> transition(NEEDS_DOCS) | ADMIN/OWNER/OPS |

**Validation côté API**:
- P6Dashboard: `assert dossier.porteType === "P6"` implicite (cherche dossier P6 du user connecté)
- Catalog mutations: `SupplierCatalogService.assertOwnerOrAdmin(dossierId, userId, isAdmin)` vérifie `dossier.ownerId === userId` OU `isAdmin===true`
- Scoring: Pas de validation métier stricte (accepte données incomplètes)

## 5. Modèles Prisma touchés

**Dossier** (prisma/schema.prisma:425+):
- **Champs lus/écrits par P6**:
  - `id`: UUID généré
  - `ownerId`: ForeignKey User (lien ownership)
  - `porteType`: String (valeur "P6" pour P6)
  - `title`: String (titre "PRESTATAIRE_SERVICE/FOURNISSEUR_MATERIAUX - RaisonSociale")
  - `commune`: String (commune déclarée)
  - `payload`: JSON (raw briefs, scoring, supplierCatalog)
  - `clientNom`, `clientTel`, `clientEmail`, `raisonSociale`, `rc`, `ice`, `representant`: String
  - `createdAt`, `updatedAt`: DateTime
  - `status`: DossierStatus (DRAFT -> SUBMITTED après intake)

**Opérations CRUD**:
- **CREATE**: `dossiers.create(userId, { title, porteType:"P6", raisonSociale, rc, ice, clientNom, clientTel, clientEmail, payload: { brief: {...}, supplierCatalog: [] } })`
- **READ**: `dossier.findUnique({ where: { id } })` / `dossier.findMany({ where: { porteType: "P6", ownerId } })`
- **UPDATE**:
  - Scoring: `dossier.update({ where: { id }, data: { payload: { ...payload, brief: {...scoreSnapshot} } } })`
  - Catalog items: `dossier.update({ where: { id }, data: { payload: { ...payload, supplierCatalog: [...items] } } })`
  - Validation status: `dossier.update({ where: { id }, data: { payload: { ...payload, p6Validation: { status, reviewedBy, history } } } })`
- **DELETE**: Soft-delete only (supplierCatalog item -> `active: false`)

**User** (prisma/schema.prisma:24+):
- **Champs touchés**: `id`, `email`, `role` (auto-set à CLIENT pour leads), `createdAt`
- **Opération**: Auto-create si email n'existe pas (`auth.register()`)

**No Incident/StateHistory/other logs for P6** - P6 n'écrit pas dans les tables génériques de state machine.

## 6. État (state machine si applicable)

**P6 n'utilise PAS de state machine E0-E12 standard**. Statut localisé dans `Dossier.payload.p6Validation`:

```typescript
p6Validation: {
  status: "DRAFT" | "PENDING_REVIEW" | "NEEDS_DOCS" | "VERIFIED" | "BLACKLISTED" | "EXPIRED",
  history: [ { ts, status, author, note }, ... ],
  reviewedAt?: DateTime,
  reviewedBy?: string,
  reviewNote?: string,
  expiresAt?: DateTime (si VERIFIED),
  docsToProvide?: string[] (si NEEDS_DOCS)
}
```

**Transitions** (P6ReviewController):
- DRAFT -> PENDING_REVIEW (automatic si score >= 40 et docs completes)
- PENDING_REVIEW -> VERIFIED (admin via `/api/cc/p6-review/:id/verify`, optionnel expiresInDays)
- PENDING_REVIEW -> NEEDS_DOCS (admin via `/api/cc/p6-review/:id/needs-docs`)
- Anywhere -> BLACKLISTED (admin via `/api/cc/p6-review/:id/blacklist`)
- VERIFIED -> EXPIRED (manuel ou cron task non implémenté)

## 7. i18n

**Namespaces utilisés** (observé dans P6Home.tsx):

```typescript
t("portes.p6.badge_prefix")
t("p6.home_title") / t("p6.home_subtitle")
t("portes.p6.identite.*")
t("portes.p6.classement.*")
t("portes.p6.docs.*")
t("portes.p6.score.*")
t("portes.p6.contact.*")
t("portes.p6.success.*")
t("portes.p6.cercles.*")
t("portes.p6.loader.*")
t("portes.p6.err.*")
t("mat.catalog.title")
t("cercles.marketplace_add")
```

**Estimation**: ~120-150 clés i18n pour P6 (3 langues: fr/en/ar) = ~360-450 traductions estimées.

**Pas de fichier JSON visible dans le codebase** - intégration via HookProvider (appelle une API i18n ou static JSON externalisé).

## 8. Intégrations externes

**Pas d'intégrations directes dans P6**. Mais dépendances amont (via `/p2/intake`):

| Service | Utilisation | Fichier |
|---------|-------------|--------|
| **Twilio** (SMS) | Alertes owner (NEW_USER_REGISTERED, DOSSIER_CREATED) via OwnerNotifyService | modules/twilio/twilio.service.ts |
| **Email (Resend ou custom)** | Confirmation client (demandeRecue), alertes owner | modules/client-notify/client-notify.service.ts, modules/owner-notify/owner-notify.service.ts |
| **Stripe** (optionnel) | Payment gateway (P1 principal; accessible post-P6 via `/payment/start`) | tomes/tome-1/stripe-checkout.controller.ts |
| **R2 / S3** (optionnel) | Object storage (documents upload via P2) | modules/object-storage/drivers/r2.driver.ts |

**P6 lui-même**: Aucune intégration API tierce, pure backend CRUD + Prisma.

## 9. Génération auto (devis, contrat, etc.)

**Aucune génération PDF/document natif dans P6**. Mais après création Dossier:
- Lien paiement envoyé par email (`/payment/start`)
- Devis/facture générés par modules externes (non-P6)
- Documents uploadés manuellement via `/p2/dossier/:id/documents`

**Score snapshot** sauvegardé dans `brief.scoreSnapshot` (non-généré PDF, juste JSON).

## 10. Flow end-to-end (parcours utilisateur)

**Happy path** (~30 min pour prestataire):

1. **Landing**: Visiteur clique "Rejoindre réseau prestataires" (P6 landing ou lien direct)
2. **Wizard P6Home**: Sélectionne "Entreprise prestataire services" -> Step 1
3. **Identité** (Step 2): Remplit raison sociale, RC, ICE, patente, classe BTP, ancienneté, 3+ références chantiers
4. **Classement** (Step 3): Sélectionne classe BTP (ex: Classe 3) + catégories agrement (ex: A.1 + C.2) + dates assurances
5. **Documents** (Step 4): Coche 7 docs obligatoires (CIN, RC, ICE, patente, CNSS, fiscal, RIB) + 6 optionnels
6. **Scoring** (Step 5): Préview automatique -> score L7 = 68/100 (SILVER) avec breakdown (classe:22, docs:17, assurances:15, agrement:8, refs:4, anciennete:2) + warnings ("décennale manquante bloquant")
7. **Contact** (Step 6): Entre nom contact + tél + email -> Submit
8. **Confirmation**: POST `/p2/intake` crée Dossier P6 + auto-crée User CLIENT si nécessaire + retourne `access_token` magic-login
9. **Notif owner**: SMS + email "Nouvelle fiche P6 prestataire en attente review (score 68/100)"
10. **Notif client**: Email "Votre demande P6 a été enregistrée, nous vous recontactons sous 24h"
11. **Admin review** (backoffice CC): Accède `/api/cc/p6-review/pending` -> voit fiche -> clique `/api/cc/p6-review/:id/verify` (expiresInDays:365) -> Statut VERIFIED, visible aux clients
12. **Client access**: Peut accéder `/p6/dashboard` -> gère catalogue matériaux (si FOURNISSEUR_MATERIAUX) ou reste passif (si PRESTATAIRE_SERVICE)

**Pour fournisseur matériaux** (parcours catalogo):
- Steps 1-3 simplifiés (pas classement BTP, déclaration nb matériaux + zones)
- Après VERIFIED, accès `/p6/dashboard` -> modal `+ Ajouter matériau` -> remplit 15 champs (nom, catégorie, prix fourniture, prix livraison, délai, zones, certs) -> POST `/p6/suppliers/{id}/catalog`
- Client cherche matériau via `GET /p6/catalog/search?search=béton&zone=Rabat` -> voit fournisseurs actifs + prix

## 11. Gaps / TODOs / FIXMEs

**Aucun TODO/FIXME visible dans code P6**.

**Non-terminés / Design incomplets**:

1. **State machine P6 disconnectée**: Validation status dans `payload.p6Validation` n'est pas liée au `Dossier.status` (qui reste DRAFT après intake). Ambiguité: quand un Dossier P6 transite-t-il à SUBMITTED?

2. **Expiration P6 non-implémentée**: `p6Validation.expiresAt` défini lors du verify admin, mais pas de cron task pour auto-expirer -> qualification P6 reste valide indéfiniment.

3. **Role-based access P6Dashboard**: Endpoint `GET /p6/suppliers/:id/catalog/manage` vérifie JwtAuthGuard mais ne check pas explicitement `dossier.ownerId === req.user.userId` côté controller - confiance au service. **Risk**: race condition possible si plusieurs users concurrents.

4. **Hardcoded tarif=fournisseur seulement**: Routes `/prestataires/tarifs*` créées mais jamais implémentées (MaterialsCatalogPage, PrestataireTarifsList, etc. existent mais côté routes mais pas lien apparent vers P6). Architecture "Phase 3" indique work-in-progress.

5. **Pas de soft-delete historique**: Catalog item DELETE -> soft-delete (`active: false`), ok. Mais si admin hard-delete, entrée historique perdue. Pas d'audit trail pour mutations catalog.

6. **Scoring sans révocation**: Si fiche invalide (ex: assurance expire), scoring ne baisse pas automatiquement. Admin doit manuellement cliquer `/blacklist`.

7. **METLE agrement expirations not enforced**: `agrementMetleValidite` comparé au `Date.now()` seulement dans scoring preview. Pas de cron pour révoquer fiches expirées.

## 12. Risques / points attention pour audit GPT/Claude

1. **Logique métier critique - Scoring L7 (P6ScoringService)**:
   - Calculs additifs simples (plafonds à 100), mais composantes arbitraires (classe 30pts, agrement 15pts, docs 25pts).
   - **Risk**: Doctrine non-externalisée (hardcodée), difficile à auditer/modifier sans redéployer. Score influence fortement visibilité prestataire.
   - **À vérifier**: Breakdown weights correspond-elles aux SLA métier? Tiers (GOLD>=80, SILVER>=60, BRONZE>=40) justifiés?

2. **Sécurité - Catalog ownership (SupplierCatalogService)**:
   - Mutation catalog (POST/PATCH/DELETE) requiert JwtAuthGuard + assertOwnerOrAdmin check dans service.
   - **Risk**: Controller `listManage` (GET `/p6/suppliers/:id/catalog/manage`) n'a pas d'ownership check -> tout utilisateur connecté peut voir tous les catalogues (données sensibles: prix, zones). Seule limitation: `activeOnly=false` seulement retourne tous items (mais celui qui accède peut être un autre user).
   - **À vérifier**: CORS policy? AuthGuard + CapsGuard présents ou pas?

3. **Performance - Cross-supplier search (searchCrossSuppliers)**:
   - Query `dossier.findMany({ where: { porteType: "P6" }, take: 200 })` charge TOUS les dossiers P6 (200 max), parcourt supplierCatalog en mémoire (O(n*m)).
   - **Risk**: Si 5000 fournisseurs actifs, requête explose memory + latency > 3s. Pas de pagination côté résultats (max 50 items au client, trié par prix).
   - **À vérifier**: Quelle taille anticipée de base fournisseurs? Existence d'index Dossier.porteType? Load test scale-out?

4. **Data integrity - JSON payload**:
   - Toutes les données P6 stockées dans `Dossier.payload` (JSON flexible, non-schématisé).
   - **Risk**:
     - Pas de validation TypeScript au write (tout ce qui passe en Body peut être sauvegardé).
     - Migrations malaisées (change structure -> script manuel requis, 0 auto-migration).
     - Catalog supplierCatalog = raw array in JSON, pas de CatalogItem table -> pas d'indexes DB, pas de ACID constraints.
   - **À vérifier**: Existe-t-il des tests validation d'entrée? DTOs ou bare `any` types?

5. **Intégration `/p2/intake` - Token issuance**:
   - `/p2/intake` retourne `access_token` pour nouveau user créé automatiquement.
   - **Risk**: Si email fourni au wizard est compromis (spoofing email), attaquant reçoit token valide pour ce user. No email verification step avant magic-login.
   - **À vérifier**: OTP verification requis? Signup confirmation email? Rate-limit intake endpoint?

---

# Synthèse transverse

## Patterns récurrents (architecture observée sur P1-P6)

1. **Intake unifié `/p2/intake`** : 5 des 6 portes (P2, P3, P4, P5, P6) convergent vers le même endpoint public `POST /p2/intake` (apps/api/src/tomes/tome-2/p2/intake.controller.ts:62) avec `porteType` discriminant. P1 fait exception (workflow OTP packs avec endpoints dédiés `/p1/packs/*`). Auto-crée User CLIENT, crée Dossier, émet JWT magic-login, fire-and-forget notifs.

2. **Storage des briefs en JSON Json field (`Dossier.payload.brief`)** : toutes les portes stockent l'ensemble du payload qualification + `quoteSnapshot` dans `Dossier.payload` (type Prisma `Json`), sans schéma strict. Avantage : flexibilité. Inconvénient : aucune validation, migrations manuelles, pas d'index DB sur les champs métier.

3. **Devis client-side calculé puis backend revoit ou non** : P1, P3, P4, P5 calculent côté backend (`POST /pX/quote` public). Le snapshot est ensuite stocké dans `quoteSnapshot` et relu par `stripe-checkout.controller.ts` (montant lu depuis `payload.brief.quoteSnapshot.honoraires.totalTTC`). **Aucun recompute** systématique au checkout (risque détaillé en section risques).

4. **Step-based wizard React monolithique par porte** : chaque porte a un composant principal (P1Landing 800L, P2Home 1457L, P3Home 454L, P4Home 405L, P5Home 1253L, P6Home 500L) avec `useState` interne pour l'étape courante. Pas de routing intra-wizard. Step "submitting" -> "success" patterns.

5. **i18n FR/EN/AR universel** : toutes les portes utilisent `useT()` hook + namespaces `portes.pX.*` (FR/EN/AR), avec total estimé ~700-900 clés réparties. Détection langue via localStorage `citurbarea.lang`. P1 utilise additionnellement `tVanilla()` imperatif sur DOM nodes.

6. **AdminHostBlock** : toutes les routes publiques `/p1`-`/p6` sont enveloppées dans `<AdminHostBlock>` qui bloque l'affichage sur `admin.citurbarea.com`. Séparation cross-domain stricte.

7. **Notifications fire-and-forget** : `ownerNotify.notify()` et `clientNotify.*` lancés sans await dans `intake.controller.ts` (ligne 117, 133). Pas de retry, pas de log d'échec d'envoi, pas de visibilité utilisateur si SMTP/Twilio fail.

## Risques transverses (audit externe à prioriser)

1. **Endpoints publics sans rate-limit / CAPTCHA** : `/p2/intake`, `/pX/quote`, `/p4/packs`, `/p6/scoring`, `/api/sig/*`, `/p1/packs/email|sms/request` sont tous PUBLIC sans JwtAuthGuard et sans rate-limiting visible. Risque bot spam massif (création users factices, abuse Twilio/Resend, déni de service notifications). **Mitigation** : @nestjs/throttler + CAPTCHA frontend + OTP verification avant création User.

2. **Confiance au snapshot client-side pour montant Stripe** : `stripe-checkout.controller.ts:62-68` extrait `amountMAD` depuis `dossier.payload.brief.quoteSnapshot` sans recompute serveur. Si l'attaquant injecte un snapshot tampered via `/p2/intake` (qui accepte le brief brut sans validation Zod), montant Stripe sera faux. **Mitigation** : recomputer le devis depuis les inputs canoniques au moment du checkout pour chaque porte (P1-P5).

3. **Validation backend laxiste sur `/p2/intake`** : Le body est accepté tel quel et stocké dans `payload`. Pas de DTOs typés stricts ni validation Zod. Un attaquant peut forger `porteType` arbitraire, payload géant, champs falsifiés. Couplé au risque #2, cela permet de fixer le prix Stripe.

4. **Hardcoded pricing & barèmes non externalisés** : P1 (formules quote.engine), P2 (BAREME_CNOA_2021), P3 (10% hardcoded), P4 (PACK_RATES 0.3/0.6/1.0%, floor 3000 DH, TVA 20%), P5 (tranches dégressives par rapport type), P6 (poids scoring). Toute évolution réglementaire (TVA, barème CNOA 2025, classes BTP) nécessite redéploiement. **Mitigation** : externaliser en `PricingConfig` table Prisma + feature flags admin.

5. **Aucun draft storage backend** : P3, P4, P6 n'ont aucune persistance draft (P1 et P5 ont localStorage, P2 a localStorage avec `pending_intake`). Abandon de wizard = perte totale. UX dégradée + perte de leads. **Mitigation** : draft-save backend (table `WizardDraft` indexée par session/email) + restore depuis n'importe quel device.

6. **State machine fragmentée** : P1 a state machine claire (E1-E12). P2 utilise phase engine. P3 réutilise state machine dossier générique. P4 et P5 sont quasi sans état. P6 a sa propre micro-machine dans `payload.p6Validation`. Pas de cohérence inter-portes -> difficile à instrumenter (Tome 8 traceability), monitoring, alerting.

7. **Génération PDF non implémentée pour les livrables** : P4 et P5 annoncent des "rapports PDF watermarqués" dans les devis (mention "Rapport exclusif CITURBAREA"), mais aucun pipeline de génération PDF natif visible (pas de Puppeteer, pdfkit, etc.). Le client paye, mais le livrable est manuel. P2 utilise browser print-to-PDF (HTML imprimable). Risque opérationnel : commitments non tenus. **Mitigation** : implémenter `ReportRendererService` (Tome 7) avec génération asynchrone (Bull queue) + email `rapportPret()` automatisé.

---

# Index des fichiers cités

Liste alphabétique des fichiers `.tsx`, `.ts`, `.prisma` référencés dans le document.

## Backend (apps/api/...)

- `apps/api/src/main.ts` (global rawBody config référencée)
- `apps/api/src/modules/client-notify/client-notify.service.ts` (templates email : demandeRecue, paiementRecu, packActive, rapportPret)
- `apps/api/src/modules/email/email.service.ts` (Resend + SMTP fallback)
- `apps/api/src/modules/object-storage/drivers/r2.driver.ts` (storage R2)
- `apps/api/src/modules/owner-notify/owner-notify.service.ts` (SMS/email admin)
- `apps/api/src/modules/twilio/twilio.service.ts` (SMS, Verify API)
- `apps/api/src/tomes/tome-1/stripe-checkout.controller.ts` (POST /api/payment/checkout-session/:dossierId, lignes 36-122)
- `apps/api/src/tomes/tome-1/stripe-webhook.controller.ts` (POST /webhooks/stripe, HMAC verify)
- `apps/api/src/tomes/tome-2/p2/contract.controller.ts` (ligne 25 - GET /api/p2/dossiers/:id/contrat)
- `apps/api/src/tomes/tome-2/p2/contract.service.ts` (ligne 76 P2ContractService.renderContractHtml)
- `apps/api/src/tomes/tome-2/p2/dossier.service.ts` (initBrief, ensureDossierStructure)
- `apps/api/src/tomes/tome-2/p2/intake.controller.ts` (ligne 62 IntakeController.intake - point d'entrée unifié)
- `apps/api/src/tomes/tome-2/p2/p2.controller.ts` (ligne 52 get, 129 confirmPayment, 138 rejectPayment, 151 createPayment, 234 phase/action)
- `apps/api/src/tomes/tome-2/p2/pricing.service.ts` (ligne 34 BAREME_CNOA_2021, 137 computeQuote, 169 LOT pricing en cours)
- `apps/api/src/tomes/tome-2/p2/quote.controller.ts` (ligne 17 categories, 25 quote)
- `apps/api/src/tomes/tome-2/p2/visa-croa.controller.ts` (FIFTEEN_DAYS_MS ligne 38)
- `apps/api/src/tomes/tome-3/p3/quote.controller.ts` (ligne 20 corps-metiers, ligne 29 quote -> P3PricingService)
- `apps/api/src/tomes/tome-3/state-machine.service.ts` (ligne 18-36 Project, 42-51 Dossier, 256 history)
- `apps/api/src/tomes/tome-4/p4/quote.controller.ts` (ligne 15 GET /p4/packs, ligne 20 POST /p4/quote)
- `apps/api/src/tomes/tome-4/p4/pricing.service.ts` (ligne 98-148 computeQuote, PACK_RATES, FLOOR_HT)
- `apps/api/src/tomes/tome-4/public/p1-packs-email.controller.ts` (OTP email)
- `apps/api/src/tomes/tome-4/public/p1-packs-quote.controller.ts` (POST /api/p1/packs/quote)
- `apps/api/src/tomes/tome-4/public/p1-packs-quote.service.ts` (compute server-side miroir frontend)
- `apps/api/src/tomes/tome-4/public/p1-packs-sms.controller.ts` (OTP SMS)
- `apps/api/src/tomes/tome-6/p5/pricing.service.ts` (ligne 258 EXPERTISE_URBA, ligne 484 assiette construction)
- `apps/api/src/tomes/tome-6/p5/quote.controller.ts` (ligne 21-28 POST /p5/quote)
- `apps/api/src/tomes/tome-7/report-renderer.service.ts` (watermark CITURBAREA - mentionné, non détaillé)

## Backend - P6 (chemins implicites)

- `P6RegistryController` (endpoints /p6/types, /p6/classes-btp, /p6/categories-agrement, /p6/documents-requis, /p6/scoring)
- `P6ScoringService` (computeScore, breakdown L7)
- `P6ReviewController` (/api/cc/p6-review/pending, /verify, /blacklist, /needs-docs)
- `SupplierCatalogController` (listPublic, listManage, create, update, deactivate, searchCross)
- `SupplierCatalogService` (list, assertOwnerOrAdmin)

## Frontend (apps/web/...)

- `apps/web/src/application/p1/createDossier.ts` (ligne 18 createDossier, ligne 20-21 sync backend post-OTP)
- `apps/web/src/domain/p1.machine.ts` (170+ lignes, états E1-E12 + EC_GEL)
- `apps/web/src/domain/p1/quote.engine.ts` (ligne 52-61 formules cout/m2)
- `apps/web/src/i18n/i18n.tsx` (ligne 5 getStoredLang, localStorage citurbarea.lang)
- `apps/web/src/infrastructure/storage.ts` (StorageAdapter, readJSON/writeJSON)
- `apps/web/src/infrastructure/storage/keys.ts` (STORAGE_KEYS : p1Draft, casesIndex, caseMeta, caseEvents)
- `apps/web/src/locales/{ar,en,fr}/portes.json` (~397 clés P2, 17 clés P4, ~60-150 par autre porte)
- `apps/web/src/tomes/tome1/router/routes.tsx` (routes /p1-/p6, lignes 258-286)
- `apps/web/src/tomes/tome3/portals/p1/P1ClientPhases.tsx` (suivi phases temps réel)
- `apps/web/src/tomes/tome3/portals/p1/P1Dossier.tsx` (timeline phases E1-E12, dossierId localStorage)
- `apps/web/src/tomes/tome3/portals/p1/P1Home.tsx` (40 L, hero + P1Landing)
- `apps/web/src/tomes/tome3/portals/p1/P1Landing.tsx` (800+ L, sélecteur type projet)
- `apps/web/src/tomes/tome3/portals/p1/P1Packs.tsx` (600+ L, choix pack, OTP, quoteLocal fallback)
- `apps/web/src/tomes/tome3/portals/p1/components/ContactForm.tsx` (180 L, validation email + phone)
- `apps/web/src/tomes/tome3/portals/p1/components/ProjectDetailsForm.tsx` (300+ L, AdminLocationSelect HCP)
- `apps/web/src/tomes/tome3/portals/p1/components/ProjectTypeSelector.tsx` (villa/immeuble/reno boutons)
- `apps/web/src/tomes/tome3/portals/p1/dossier.store.ts` (loadDossier, saveDossier, advanceTo)
- `apps/web/src/tomes/tome3/portals/p2/P2Finalize.tsx` (100+ L, replay intake post-signup)
- `apps/web/src/tomes/tome3/portals/p2/P2Form.tsx` (163 L, formulaire technique autonome)
- `apps/web/src/tomes/tome3/portals/p2/P2Home.tsx` (1457 L, wizard IMM/GR/LOT/EPIG/AMG, ligne 789 hero, 831 section, 859 catégorie, 900 mesures, 708 succès)
- `apps/web/src/tomes/tome3/portals/p2/P2Result.tsx` (56 L, P2UiBlockRenderer)
- `apps/web/src/tomes/tome3/portals/p3/P3Home.tsx` (454 L, 6 steps wizard, ligne 49 FIX-4 CSS injection)
- `apps/web/src/tomes/tome3/portals/p4/P4Home.tsx` (405 L, 4 steps pack/foncier/quote/identity, ligne 62 FIX-4 CSS, 132 GET packs, 148 POST quote, 175 POST intake, 204 token store)
- `apps/web/src/tomes/tome3/portals/p5/P5Finalize.tsx` (594 L, post-auth carte + auto-detect + DGI zones)
- `apps/web/src/tomes/tome3/portals/p5/P5Home.tsx` (1253 L, 4 phases identity/report/details/delay, ligne 679 hero, 802 Lambert, 903 MapPicker)
- `apps/web/src/tomes/tome3/portals/p6/P6Dashboard.tsx` (399 L, catalogue matériaux, modal create/edit)
- `apps/web/src/tomes/tome3/portals/p6/P6Home.tsx` (500 L, 6-step wizard prestataire/fournisseur)
- `apps/web/src/tomes/tome3/components/fiches-prestations/FichesPrestations.tsx` (réutilisé par P3 step section)
- `apps/web/src/tomes/tome4/apiClient.ts` (quoteP1Packs, requestP1PacksEmailCode, verifyP1PacksEmailCode, request/verifyP1PacksSmsCode)

## Prisma

- `prisma/schema.prisma` (modèle principal)
  - User (ligne 24+) : email, passwordHash, role, plan, isActive
  - Dossier (ligne 425-521) : ownerId, projectId, firmId, porteType, sousTypeP2, gestionMode, payload Json, packSelected, packPriceMAD, projectType, constructionLevel, caseId, clientNom, clientTel, clientEmail, raisonSociale, rc, ice, representant, mandatSigne (ligne 477-478), mandatSigneAt, status DossierStatus (lignes 345-352)
  - Payment : dossierId, mode, amount, ref, currency, status
  - DossierPhaseRecord : phase, statut, dateDebut, dateFin
  - DossierArea (sub-models) : surfaces, budgets, urbanisme
  - DossierDocument (uploads R2)
  - Firm : multi-tenant S-FIRM-LINK
  - Project (state machine E0-E12)
  - StateHistory : transitions log
  - Incident, IncidentEvent (Tome 7 compliance)
- `prisma/dossiers/schema.prisma` (schéma séparé dossiers)

---

*Fin du document - 6 portes consolidées, prêt pour relecture externe GPT/Claude.*
