# Plan de rebranchement — API NestJS éteinte → Cloudflare Pages Functions + Neon

Décision du fondateur (« option B ») : l'API NestJS (`apps/api`) et sa base Railway ne seront pas réhébergées. Un seul back-end : `functions/` (Cloudflare Pages Functions) + Neon, rebranché progressivement, un lot validé à la fois.

Référence : [inventaire-api-morte.md](inventaire-api-morte.md) (inventaire initial) et le cliquet [appels-morts.json](appels-morts.json), mesuré par `node apps/web/scripts/appels-morts.mjs` (`--detail` : fichier:ligne → route ; `--atteignables` : seulement le code livré).

## Règle produit pour tout module réveillé ou rebranché : aucune coordonnée entre parties

Décision du fondateur (CLAUDE.md, « Principe produit : tout passe par CITURBAREA ») : aucun téléphone, e-mail, adresse ou lien externe d'un tiers n'est affiché entre clients, prestataires et fournisseurs ; seules les coordonnées de CITURBAREA / HSE DECO apparaissent.

- Avant de réveiller un module en sommeil, retirer l'affichage des coordonnées de tiers : notamment `features/cabinet/CabinetPublicPage.tsx` (phonePublic/emailPublic), `features/cercles/EditProfilePage.tsx`, `InscriptionPage.tsx`, `ProfilePage.tsx`, annuaire Cercles.
- Espace dossier client (lot 3b) : le client ne voit jamais les coordonnées des prestataires/fournisseurs, et inversement.
- Back-office : l'équipe CITURBAREA voit les coordonnées (c'est elle qui fait l'intermédiaire) ; elles ne sont jamais renvoyées par une route publique ou client.
- Geste de contact entre parties : « Demander un appel vidéo » (`docs/architecture/contrat-appels-video.md`) ou échange via la plateforme.

## Trois règles

1. **Zéro impasse** : aucune page accessible (visiteur ou admin) ne dépend d'un appel mort. Mesure : *appels morts atteignables depuis `main.tsx`* = **0** (test `apps/web/src/lib/appels-morts.test.ts`).
2. **Plus jamais de nouveau branchement mort** : le même test échoue si le total d'appels morts du code source augmente. On le fait baisser à chaque rebranchement (`--write`).
3. **Rebrancher par ordre de valeur**, un lot à la fois (voir « Ordre proposé »).

## Bilan du lot 1 « zéro impasse »

| Mesure (même analyseur) | Avant | Après |
|---|---|---|
| Appels morts dans le code source | 446 | 408 |
| dont atteignables (livrés aux visiteurs / à l'admin) | **421** | **0** |
| Appels vers des routes vivantes de `functions/` | 49 | 60 |

Les 408 restants sont dans des modules **en sommeil** : plus importés par le routeur, donc absents du bundle livré. Ils restent dans le dépôt comme référence métier pour leur rebranchement (règles, écrans), et sont supprimés au fur et à mesure.

Mécanique :
- `apps/web/src/ui/EnSommeil.tsx` : page « bientôt disponible » sans appel réseau, `noindex`, avec issues (décrire son projet → `/creer-compte`, WhatsApp, rendez-vous visio, et un équivalent quand il existe). Variante `admin` pour le back-office.
- Routes conservées (les anciens liens ne tombent pas en 404), liens retirés des menus.
- Back-office : entrées de menu grisées « en cours de rebranchement ».

## Décisions par module

Légende décision : **FUSION** = redirigé vers un équivalent vivant ; **LOCAL** = calcul fait dans le navigateur (même moteur que l'ex-API) ; **REBRANCHÉ** = nouvelle Pages Function ; **SOMMEIL** = page `EnSommeil` ; **RETIRÉ** = appel supprimé sans perte fonctionnelle.
Priorité : 1 = prochain lot … 4 = seulement sur demande. Effort : S (< ½ j), M (1–2 j), L (> 2 j).

### Site public

| Module | Routes UI | Appels morts (avant) | Décision | Équivalent nouveau | Prio. | Effort |
|---|---|---|---|---|---|---|
| Auth client (AuthProvider, Login, Signup, SignupSMS, ClientSignup, ConfirmEmail, ForgotPassword, VerifyPhone) | `/login`, `/creer-compte*`, `/confirmer-email`, `/mot-de-passe-oublie`, `/verify-phone` | 13 (tome5) + 7 (apiClient) | FUSION | `/login` = page d'accès sans mot de passe (client → lien reçu / `/creer-compte` / RDV ; fournisseur → `/cercles/espace` par code ; équipe → `/cc/login`). `/creer-compte*` = formulaire court (lead). Autres écrans → `/login`. Jetons JWT hérités purgés. | 1 (lot 3a) | M |
| Mon espace client (P1MyDossiers, ClientProfileBanner) | `/portal`, `/mon-espace` | 2 | FUSION | page d'accès `/login` | 1 (lot 3b) | M |
| P1 — packs (P1Packs) | `/p1/packs` | 4 | LOCAL + REBRANCHÉ | devis `domain/p1/quote.engine` (quoteLocal) ; dossier via `/api/intake` ; mode « full » (codes e-mail/SMS) retiré | — | fait |
| P1 — dossier client local (P1Dossier, P1Dashboard, P1ClientPhases, RokhasPhaseTimeline) | `/p1/dossier`, `/p1/dossier/phases` | 8 + 7 (tome2) | FUSION | `P1Confirmation` (demande enregistrée → RDV / WhatsApp). Les pièces téléversées n'allaient nulle part. | 1 (lot 3b) | — |
| P1 — matériaux sponsorisés | (dans le constructeur de coût P1) | 2 | RETIRÉ | — (régie pub en sommeil) | 4 | S |
| P2 — catégories et devis | `/p2` | 3 | LOCAL | `@citurbarea/pricing-cnoa` (categoriesDeSection, computeQuote) | — | fait |
| P2/P5 — finalisation après inscription | `/p2/finalize`, `/p5/finalize` | 3 | FUSION | → `/creer-compte` (le dossier part déjà par `/api/intake`) | — | — |
| P3, P4 | `/p3`, `/p4` | 0 | — | soumission par `/api/intake` déjà vivante ; bouton « Payer » retiré de l'écran de succès | — | — |
| P5 — zones DGI, auto-détection, upload note de renseignements | `/p5` | 5 | RETIRÉ | choix manuel de la zone ; document transmis à l'architecte (WhatsApp/RDV) | 3 (module geo) | M |
| P6 (P6Home, P6Dashboard) | `/p6` → `/cercles`, `/p6/dashboard` | 10 | FUSION | `/cercles/espace` (espace fournisseur par code) | — | — |
| Géo : listes Région/Province/Commune, couches SIG, carte HCP (AdminLocationSelect, MapPicker, SigExplorer) | `/sig`, formulaires P2/P5 | 9 | RETIRÉ (saisie libre) + SOMMEIL `/sig` | à republier en JSON statique (données HCP absentes du dépôt : `data/geo` non versionné) | 3 | M |
| Cercles — réseau social (feed, cercles, posts, live, messages, profils, associations) | `/cercles/:slug*`, `/cercles/messages*`, `/cercles/profile/*`, `/cercles/nouveau`, `/post/:id` | 88 (avec marketplace) | SOMMEIL | — | 4 | L |
| Cercles — marketplace / mes offres | `/cercles/marketplace*`, `/cercles/mes-offres` | (inclus ci-dessus) | FUSION | `/cercles/espace` (fiches de prix, `/api/cercles/espace/*`) | — | — |
| Cercles — annuaire | `/cercles/annuaire` | (inclus) | SOMMEIL | à reconstruire sur la table `Fournisseur` (fiches publiques) | 2 | S |
| Cercles — accueil, bienvenue, édition de profil | `/cercles`, `/cercles/bienvenue`, `/cercles/me/edit` | (inclus) | FUSION | `/cercles` = vitrine ; bienvenue → `/cercles` ; édition → `/cercles/espace` | — | — |
| Inscription architecte (ancienne) | `/inscription/architecte` | (inclus) | FUSION | `/inscription` (inscription pro, `/api/cercles/inscription`) | — | — |
| Fiche cabinet | `/cabinet/*` | 13 | SOMMEIL | — | 4 | M |
| Matériauthèque | `/materiaux*` | 6 | FUSION | nouvelle matériauthèque (autre session, prix `/api/prix/materiaux`) ; `GET /api/catalogue/produits` posé en version d'attente conforme au contrat (`disponible: false`) en attendant la session Cercles | — | fait |
| Tarifs prestataires | `/prestataires/tarifs*` | 10 | SOMMEIL | `/cercles/espace` (fiches de prix fournisseurs) | 4 | M |
| Espace projet : documents, phases, parcours, calendrier, réception, Rokhas, permis, chantier (PV, incidents, sous-traitants, livraisons, copilote), PV commission, interactions | `/dossier/:id/*`, `/dossiers/:id/phases*`, `/mon-parcours/:id`, `/projet/:id/calendrier`, `/permis-construire/:id`, `/chantier/:id/*`, `/pv-chantier/*` | 14 + 13 + 10 + 10 + 9 + 8 + 8 + 7 + 7 + 6 + 6 + 2 + 1 + 1 | SOMMEIL | **espace projet** livré par une autre session (`/projet/:jeton`, `/cc/projets`, `/api/projets/*`, tables `Projet*` — `docs/sql/espace-projet-neon.sql`) : les anciens écrans y seront redirigés, ne pas dupliquer | 2 | L |
| Générateur de CPS | `/cps`, `/dossier/:id/cps` | 10 | SOMMEIL | session DCE (moteur `domain/cps`) | 2 | M |
| Paiement en ligne (Stripe) | `/payment/start|success|cancel` | 4 | SOMMEIL | paiement manuel déclaratif (virement + justificatif, validé en back-office) | 2 | M |
| Articles (média) | `/media/article/:slug` | 2 | SOMMEIL | guides statiques `/guide/*` | 4 | S |
| Notifications | `/notifications` | 9 | SOMMEIL | — | 4 | M |
| Métriques publiques | `/metrics` | 1 | SOMMEIL | `/cc/leads` (funnel) | 4 | S |
| Estimation foncière (zillow-ma), OPCI, mandataires | `/foncier/estimation`, `/opci`, `/mandataires` | 3 | SOMMEIL | `/p4` pour l'estimation | 4 | M |
| Coffre admin (vault MFA) | `/admin/*` | 26 | FUSION | → `/cc/login` (Cloudflare Access ou mot de passe, `functions/api/cc/login.ts`) | — | — |
| Cabinets en marque blanche (FirmContext) | sous-domaines | 1 | RETIRÉ | tout le monde « master » | 4 | M |
| Web Vitals | toutes | 2 | RETIRÉ | (l'endpoint n'a jamais existé côté Functions) | 4 | S |
| Rapport de plantage (GlobalErrorBoundary) | toutes | 2 | REBRANCHÉ | `functions/api/telemetry/client-error.ts` (journal de la fonction, sans donnée personnelle) | — | fait |
| Sonde API + intake NestJS (leadBridge) | portes | — | RETIRÉ | `apiAvailable()` = toujours faux ; dossier via `/api/intake` uniquement | — | fait |
| Pages sans appel réseau | `/mre`, `/cercles/diaspora`, `/docs`, `/simulateur`, `/terriscan`, `/chiffrage*`, `/rendez-vous`, `/rdv/:jeton`, `/p4/terrains*`, `/guide/*`, portes SEO | 0 | — | inchangées (URL Railway de `/docs` remplacées) | — | — |

### Back-office (`/cc`)

| Module | Route | Appels morts (avant) | Décision | Équivalent nouveau | Prio. | Effort |
|---|---|---|---|---|---|---|
| Bandeau KPI (toutes les pages) | — | 1 | REBRANCHÉ | `functions/api/cc/snapshot/current.ts` : leads 7 j / total, RDV à venir, dossiers, fournisseurs et terrains à valider (comptages Neon) | — | fait |
| Tableau de bord | `/cc/dashboard` | 2 | FUSION | → `/cc/leads` (le bandeau KPI donne la vue d'ensemble) | 3 | M |
| Pont vault → JWT (CCLayout), login API locale (CCLogin) | — | 1 + 2 | RETIRÉ | session Access / cookie (`/api/cc/session`) | — | — |
| Leads, Rendez-vous, Fournisseurs & prix, Terrains | `/cc/leads`, `/cc/rendez-vous`, `/cc/fournisseurs`, `/cc/terrains` | 0 | — | déjà sur Functions | — | — |
| Inscrits Cercles | `/cc/inscrits` | 3 | FUSION | → `/cc/fournisseurs` | — | — |
| Validations (packs, P6) | `/cc/validations` | 5 | FUSION | → `/cc/fournisseurs` (onglet « Fiches signalées ») ; validation des packs → lot paiement | 2 | M |
| Dossiers | `/cc/dossiers` | 60 (module dossiers) | REBRANCHÉ (lecture) | `DossiersListe` sur `GET /api/cc/dossiers` (recherche, porte, contact, payload) | 1 (lot 3c : actions) | M |
| Fiche dossier, vue client (shadow), devis du dossier | `/cc/dossiers/:id`, `…/shadow`, `…/devis` | (inclus) | SOMMEIL | lot 3c | 1 | L |
| Simulateur (honoraires P1/P2) | `/cc/simulateur` | 3 (CostEngine) | LOCAL | `quoteLocal` + `@citurbarea/pricing-cnoa` (+ choix du niveau de la grille) ; onglet « chiffrage détaillé » = `domain/chiffrage` | — | fait |
| Devis libre | `/cc/devis` | (inclus) | SOMMEIL | `/cc/simulateur` ; devis PDF → lot 3c | 2 | M |
| Visites | `/cc/visites` | 1 | SOMMEIL | `/cc/leads` (formulaires abandonnés, `/api/cc/funnel`) | 3 | S |
| SEO / GEO | `/cc/seo` | 11 | SOMMEIL | — | 4 | M |
| Médias | `/cc/media` | 0 (maquette) | SOMMEIL | — | 4 | — |
| Projets, Intelligence territoire, Business, Live | `/cc/projects`, `/cc/territorial`, `/cc/business`, `/cc/live` | 4 | SOMMEIL | dérivables de `Dossier` après le lot 3c | 3 | M |
| Régie pub | `/cc/publicite` | 2 | SOMMEIL | — | 4 | M |
| Archive | `/cc/archive*` | 4 | SOMMEIL | — | 4 | M |
| Cabinets | `/cc/firms` | 5 | SOMMEIL | — | 4 | M |
| SIG · PA | `/cc/sig` | (geo) | SOMMEIL | module geo | 3 | M |

### Application de bureau

`apps/desktop/main.js` : URL Railway remplacées par `https://citurbarea.com` (portail, docs, cercles) et `https://admin.citurbarea.com` (command center, archive) ; sondes de l'autotest vers l'API retirées.

## Ordre proposé pour la suite (règle 3)

Un lot à la fois, validé par le fondateur avant le suivant.

1. **Lot 3a — compte client léger** : lien magique / code envoyé par e-mail ou WhatsApp, cookie signé (modèle `functions/_lib/adminSession.ts` et `functions/api/cercles/acces/*`), sans mot de passe. Table `ClientAcces` (ou colonnes sur `Lead`). Remplace la page d'accès `/login` côté client. **Session client réutilisable** : un helper unique (`functions/_lib/clientSession.ts` : `lireSessionClient(request, env) → { clientId, dossierIds } | null`) pour que d'autres modules (appels vidéo, espace projet) authentifient le client sans dupliquer le cookie. Au même lot : ajouter le genre « client » à `ActeurConnecte` (`functions/_lib/appelsService.ts`) et une route `<chemin du cookie client>/appels/[[chemin]].ts` calquée sur `functions/api/projets/appels` (contrat `docs/architecture/contrat-appels-video.md`, section « À brancher par les autres sessions »). Ne pas retirer le bloc `<DemanderAppelVideo …>` de `DossiersListe.tsx`.
2. **Lot 3b — espace dossier client minimal** (`/mon-espace`) : mes dossiers (table `Dossier` existante, reliée aux `Lead` et `RendezVous`), estimation/devis (moteurs locaux), RDV (déjà en Functions), et deux emplacements **« Messages » et « Documents »** branchés sur la messagerie et le dépôt de documents communs (session « Appels vidéo » / Cercles, contrat à venir dans docs/architecture/) — **aucune messagerie ni aucun stockage de fichiers propre à ce lot**. Même emplacements dans `/cc/dossiers` (lot 3c). La session client `lireSessionClient` (lot 3a) sert aussi à la boîte de réception du client. Branchements à faire au lot 3a/3b (contrats `docs/architecture/contrat-messagerie.md` et `contrat-depot-fichiers.md`) : genre « client » dans `ActeurConnecte`/`cleDe` (`functions/_lib/messagerieService.ts`) ; route `<chemin du cookie client>/messages/[[chemin]].ts` calquée sur `functions/api/cercles/espace/messages` ; écrans `<BoiteMessages source={{type:"client"}} />` et `<EcrireMessage porte="client" contexte="dossier" objetId={dossierId} invites={[{type:"admin"}]} />` ; documents par le dépôt commun, un message ne portant qu'une référence `meta.documents=[{id,nom}]`. En attendant, le client utilise son lien de fil et son lien de boîte signé (`/messages/boite/<jeton>`, 180 j). À **coordonner avec la session « espace projet »** (tables `Projet*`, fichiers sur R2) pour ne pas créer deux espaces.
   - **Appels vidéo** : pas de visio développée ici. Un emplacement est laissé dans l'écran dossier (contexte « dossier », identifiant du dossier, participants : client + architecte/admin) ; le module générique « appel vidéo sur demande, accord de toutes les parties » (autre session, `functions/_lib/visio.ts`) s'y branche — interface dans `docs/architecture/contrat-appels-video.md`.
3. **Lot 3c — back-office dossiers** : actions sur `/cc/dossiers` (statut, note, invitation du client par lien, devis PDF) sur les mêmes tables ; même emplacement « demander un appel vidéo » côté admin, sans visio propre.
   - **Coordination « Devis & facturation + dossiers clients existants »** (autre session, spec `docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md`) : création de dossier par l'admin (client existant d'ARC-BATI ou d'un autre cabinet, dossier déjà avancé), devis, factures, encaissements. Ces fonctions ne sont **pas** reprises ici : le lot 3c se limite au statut, à la note, à l'invitation du client par lien et aux emplacements Messages / Documents / Appel vidéo. Tables partagées (`User`, `Dossier`, `Projet*`, futur `Cabinet`) : mapping dans `docs/architecture/contrat-devis-facturation.md` — le lire avant de commencer 3a/3b/3c et signaler tout conflit à cette session.
4. Outils de chantier (PV, livraisons, réception) — via l'espace projet.
5. Paiement manuel déclaratif (virement + justificatif, validation admin) ; validations de packs.
6. Catalogue produits fournisseurs (`/api/catalogue/produits` complet, session Cercles), annuaire Cercles, CPS (session DCE), module geo (JSON statique HCP).
7. Le reste reste en sommeil tant qu'il n'est pas demandé : réseau social Cercles, OPCI, estimation foncière, mandataires, copilote, régie pub, métriques, SEO cockpit, cabinets, archive.

## Stockage des documents

Ne relève plus de ce plan : le dépôt de documents est commun à toute la plateforme (session « Appels vidéo » avec la session Cercles ; R2 déjà prévu par l'espace projet). L'espace dossier client et `/cc/dossiers` le réutilisent.
