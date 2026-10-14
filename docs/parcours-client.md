# Parcours client CITURBAREA — page par page

Version analysée : commit `48feac0` (branche `feat/backoffice-leads-local`), le 14/10/2026.
Preview : https://feat-backoffice-leads-local.citurbarea.pages.dev — production : https://citurbarea.com — back-office : https://admin.citurbarea.com

Méthode : routeur `apps/web/src/tomes/tome1/router/routes.tsx`, back-office `apps/web/src/command-center/CommandCenterApp.tsx`, Functions `functions/api/*`, SQL `docs/sql` et `docs/prix/sql`, et des contrôles en lecture seule (GET, sans aucun formulaire envoyé) sur la preview et la production.

> Limite : la vérification a porté sur les routes, l'existence des Functions et les réponses GET. Le détail écran par écran de chaque formulaire (champs, texte de confirmation, notification exacte) n'a pas été relu ligne par ligne. Les cases marquées « à vérifier » sont à confirmer pendant la visite guidée.

Légende : ✅ fonctionne (route + Function) · 🟡 partiel / dépend d'une configuration · 💤 en sommeil (page « bientôt disponible ») · ❌ manquant / à construire

---

## 1. Résumé en 10 lignes

1. **Ce qui marche de bout en bout** : découverte (accueil, guides, villes, portes, services, pages légales), estimation (`/chiffrage`, prix `/api/prix/*`), dépôt d'un lead (`/creer-compte`, portes P1–P5 → `/api/intake` / `/api/lead-funnel/capture`), prise de rendez-vous visio (`/rendez-vous` → `/rdv/<jeton>`), et le suivi par l'équipe dans `/cc/leads` et `/cc/rendez-vous` **en production**.
2. **Sur la preview, le back-office ne s'ouvre pas** : `/api/cc/session` répond 503 `access_not_configured` (variables `ADMIN_*` absentes de l'environnement « Preview » de Cloudflare). Pour l'instant, on teste `/cc` sur https://admin.citurbarea.com.
3. **Les appels vidéo ne marchent nulle part** : `/api/appels/*` répond 503 `appels_indisponibles` en preview **et** en production → les tables `DemandeAppel` et `BlocageAppel` ne sont pas créées dans Neon (`docs/sql/appels-video-neon.sql`).
4. **La messagerie ne marche pas** : en preview, 503 `messagerie_indisponible` (tables `Conversation` et `MessageConversation` absentes, `docs/sql/messagerie-neon.sql`) ; en production, la Function n'est même pas encore déployée (la branche n'est pas fusionnée).
5. **L'espace projet** `/projet/<jeton>` est en place en production (tables présentes, réponse 401 `non_connecte`) ; en preview il manque le secret de session (503 `session_non_configuree`).
6. **Le parcours casse après le RDV** : il n'y a ni compte client ni espace dossier client (`/login`, `/mon-espace` = page d'accès sans mot de passe ; lots 3a/3b non livrés).
7. **Devis, paiement et contrat** côté client : en sommeil (`/payment/*` = EnSommeil, devis/fiche dossier admin = EnSommeil, lot 3c et lot paiement).
8. **Toutes les anciennes pages chantier** (phases, PV, livraisons, réception, permis, calendrier, CPS) sont en sommeil ; seul l'espace projet (jalons Conception → Exécution → Réception, documents, discussion par jalon) les remplace.
9. **La matériauthèque affiche les prix de référence** mais **aucun fournisseur ni produit n'est publié** (`/api/catalogue/*` et `/api/cercles/annuaire` renvoient 0) : les demandes de prix n'ont personne à qui aller tant que des fiches ne sont pas validées dans `/cc/fournisseurs`.
10. **Fin de projet** (réception formelle, permis d'habiter, garanties, avis client) : rien de construit, à part le guide `/guide/permis-habiter-certificat-conformite-maroc`.

---

## 2. Tableaux par section

### A. Découverte

| n° | Étape | URL (preview) | Ce que voit / fait le client | Coulisses | Statut |
|---|---|---|---|---|---|
| A1 | Accueil | [/](https://feat-backoffice-leads-local.citurbarea.pages.dev/) | Page d'accueil, choix des 6 portes, accès estimation, RDV, WhatsApp CITURBAREA | Suivi de visite `/api/analytics-hub/event` (Function présente) | ✅ (200) |
| A2 | Guides SEO | [/guide](https://feat-backoffice-leads-local.citurbarea.pages.dev/guide), [/guide/permis-de-construire-maroc](https://feat-backoffice-leads-local.citurbarea.pages.dev/guide/permis-de-construire-maroc) | ~50 guides statiques FR / AR / EN (permis, honoraires, prix m², Rokhas…) | Fichiers statiques `apps/web/public/guide/*.html` ; les URL en `.html` redirigent (308) vers l'URL propre | ✅ (200) |
| A3 | Pages villes | [/architecte-kenitra](https://feat-backoffice-leads-local.citurbarea.pages.dev/architecte-kenitra), [/architecte-rabat](https://feat-backoffice-leads-local.citurbarea.pages.dev/architecte-rabat) | Page « architecte à <ville> » (Casablanca, Kénitra, Mohammedia, Rabat, Salé, Tanger, Témara) | Statique + `VilleLanding` | ✅ (200) |
| A4 | Services | [/services](https://feat-backoffice-leads-local.citurbarea.pages.dev/services) | Liste des services (permis Kénitra, architecte Salé…) | Statique `public/services/` | ✅ (200) |
| A5 | Portes SEO FR / EN / AR | [/fr/porte-01-projet-personnel](https://feat-backoffice-leads-local.citurbarea.pages.dev/fr/porte-01-projet-personnel), [/en/door-01-personal-family-project](https://feat-backoffice-leads-local.citurbarea.pages.dev/en/door-01-personal-family-project), [/ar/bab-01-mashrou-shakhsi-wa-usari](https://feat-backoffice-leads-local.citurbarea.pages.dev/ar/bab-01-mashrou-shakhsi-wa-usari) | Présentation d'une porte dans la langue choisie, bouton vers la porte | `PorteLanding` | ✅ (200) |
| A6 | Langue FR / AR / EN | [/ar](https://feat-backoffice-leads-local.citurbarea.pages.dev/ar), [/en](https://feat-backoffice-leads-local.citurbarea.pages.dev/en) | Versions arabes / anglaises (portes, guides, annuaire `/ar/cercles/annuaire`, appel `/ar/appel/…`, messages `/ar/messages/…`) | Le dossier `public/ar` n'est pas encore versionné (fichier non suivi dans git) | 🟡 à vérifier (200, mais couverture AR inégale selon les pages) |
| A7 | Barre mobile | toutes les pages, sur téléphone | Barre de contact en bas d'écran | Composant front, aucun appel | à vérifier sur téléphone |
| A8 | Diaspora / MRE | [/mre](https://feat-backoffice-leads-local.citurbarea.pages.dev/mre), [/cercles/diaspora](https://feat-backoffice-leads-local.citurbarea.pages.dev/cercles/diaspora) | Pages d'accueil pour les Marocains du monde | Aucun appel réseau | ✅ (200) |
| A9 | Mentions légales, confidentialité | [/mentions-legales](https://feat-backoffice-leads-local.citurbarea.pages.dev/mentions-legales), [/confidentialite](https://feat-backoffice-leads-local.citurbarea.pages.dev/confidentialite) | Pages légales HSE DECO | Statique | ✅ (200) |
| A10 | CGU | [/cgu](https://feat-backoffice-leads-local.citurbarea.pages.dev/cgu) | — | **404** : pas de page CGU. La mention « messagerie et appels vidéo » proposée dans `contrat-messagerie.md` n'est publiée nulle part | ❌ |
| A11 | Page introuvable | [/n-existe-pas](https://feat-backoffice-leads-local.citurbarea.pages.dev/n-existe-pas) | Vraie page 404 avec appel à l'action | `NotFound` (404) | ✅ |
| A12 | Réalisations | [/realisations](https://feat-backoffice-leads-local.citurbarea.pages.dev/realisations) | — | 404 à la racine (le dossier `public/realisations/` existe, sans page d'index) | ❌ |

### B. Estimation

| n° | Étape | URL | Ce que voit / fait le client | Coulisses | Statut |
|---|---|---|---|---|---|
| B1 | Chiffrage | [/chiffrage](https://feat-backoffice-leads-local.citurbarea.pages.dev/chiffrage) | Estimation du coût de construction par lot | Calcul dans le navigateur + prix `/api/prix/ouvrages` et `/api/prix/materiaux` (répondent 200, catalogue 2026-10.1) | ✅ |
| B2 | Devis détaillé | [/chiffrage/devis](https://feat-backoffice-leads-local.citurbarea.pages.dev/chiffrage/devis) | Devis estimatif détaillé imprimable | Local | ✅ (200) |
| B3 | Ancien calculateur | [/calculateur](https://feat-backoffice-leads-local.citurbarea.pages.dev/calculateur) | Redirige vers `/chiffrage` (un seul moteur) | — | ✅ |
| B4 | Simulateur | [/simulateur](https://feat-backoffice-leads-local.citurbarea.pages.dev/simulateur) | Simulateur d'honoraires | Local | ✅ (200) |
| B5 | Matériauthèque | [/materiaux](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux) | Familles de matériaux, prix de référence, variantes | `/api/prix/materiaux` ✅ ; produits fournisseurs `/api/catalogue/produits` = 0 produit publié | 🟡 (prix oui, offres fournisseurs vides) |
| B6 | Fiche matériau, phases | `/materiaux/<code>` (ex. depuis la liste) | Fiche, phases d'utilisation, visionneuse, « Écrire un message » / « Demander un appel vidéo » | Messagerie et appels indisponibles (tables absentes) | 🟡 ; attention, [/materiaux/ciment](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux/ciment) donne 404, il faut partir de la liste |
| B7 | Planning d'achat | [/materiaux/planning](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux/planning) | Calendrier d'achat des matériaux par phase | Local (`projetPlanning.ts`) | ✅ (200) |
| B8 | Panier « demande de prix » / commande | [/materiaux/commande](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux/commande) | Panier de demande de prix ; l'achat en ligne dépend des tables `Commande` / `LigneCommande` (`docs/prix/sql/achat-en-ligne.sql`) | La Function de commande n'a pas été trouvée dans `functions/api` | 🟡 demande de prix / ❌ commande en ligne (à vérifier) |
| B9 | Fournisseurs matériaux | [/materiaux/fournisseurs](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux/fournisseurs) | Liste des fournisseurs | `/api/catalogue/fournisseurs` = 0 fournisseur publié | 🟡 (vide) |
| B10 | Terrains à vendre | [/p4/terrains](https://feat-backoffice-leads-local.citurbarea.pages.dev/p4/terrains) | Annonces de terrains (sans coordonnées) | `/api/terrains` = `[]` (aucune annonce validée) | 🟡 (vide) |

### C. Prise de contact / lead

| n° | Étape | URL | Ce que voit / fait le client | Coulisses | Statut |
|---|---|---|---|---|---|
| C1 | Créer un compte (= formulaire court) | [/creer-compte](https://feat-backoffice-leads-local.citurbarea.pages.dev/creer-compte) | Formulaire court sans mot de passe | `POST /api/lead-funnel/capture` → table `Lead` → visible dans `/cc/leads` ; e-mail au cabinet si `RESEND_API_KEY` + `LEAD_NOTIFY_TO` | ✅ |
| C2 | Porte P1 particulier | [/p1](https://feat-backoffice-leads-local.citurbarea.pages.dev/p1) → [/p1/packs](https://feat-backoffice-leads-local.citurbarea.pages.dev/p1/packs) → [/p1/dossier](https://feat-backoffice-leads-local.citurbarea.pages.dev/p1/dossier) | Assistant projet, 3 packs avec devis d'honoraires, puis confirmation « demande enregistrée » → RDV / WhatsApp | Devis calculé localement ; dossier envoyé par `POST /api/intake` (Lead + Dossier) | ✅ |
| C3 | Porte P2 promoteur | [/p2](https://feat-backoffice-leads-local.citurbarea.pages.dev/p2) | Catégories et devis barème CNOA | Calcul local ; envoi `/api/intake` | ✅ |
| C4 | Porte P3 clé en main | [/p3](https://feat-backoffice-leads-local.citurbarea.pages.dev/p3) | Assistant ; bouton « Payer » retiré | `/api/intake` | ✅ |
| C5 | Porte P4 foncier | [/p4](https://feat-backoffice-leads-local.citurbarea.pages.dev/p4) | Packs foncier | `/api/intake` | ✅ |
| C6 | Dépôt de terrain | [/p4/terrains/deposer](https://feat-backoffice-leads-local.citurbarea.pages.dev/p4/terrains/deposer) | Formulaire de dépôt d'annonce | `POST /api/terrains` → `TerrainAnnonce` (EN_ATTENTE) + `Lead` P4 (source WEB_TERRAIN_DEPOT) + alerte e-mail ; validation dans `/cc/terrains` | ✅ |
| C7 | Porte P5 rapports | [/p5](https://feat-backoffice-leads-local.citurbarea.pages.dev/p5) | Choix manuel de la zone ; le document est transmis à l'architecte (WhatsApp / RDV) | `/api/intake` ; l'envoi du fichier a été retiré | 🟡 (pas de dépôt de pièce) |
| C8 | Porte P6 | [/p6](https://feat-backoffice-leads-local.citurbarea.pages.dev/p6) | Redirige vers `/cercles` (choix du fondateur) | — | ✅ (redirection) |
| C9 | WhatsApp / appel CITURBAREA | boutons du site | Ouvre WhatsApp vers le numéro de CITURBAREA (`config/contact.ts`) | Hors plateforme, rien n'est enregistré | ✅ (aucune trace dans `/cc`) |
| C10 | Demande de prix fournisseur | depuis `/materiaux` (panier) ou une fiche pro | Message au fournisseur via la plateforme | Messagerie / appels → 503 (tables absentes) ; aucun fournisseur publié | 🟡 |
| C11 | Écrire un message / Demander un appel vidéo (visiteur) | fiches pro, matériaux | Formulaire nom + e-mail ou téléphone + consentement | `POST /api/messages` ou `/api/appels` → **503** | 🟡 (tables Neon à créer) |
| C12 | Connexion client | [/login](https://feat-backoffice-leads-local.citurbarea.pages.dev/login), [/mon-espace](https://feat-backoffice-leads-local.citurbarea.pages.dev/mon-espace) | Page d'accès sans mot de passe qui oriente : client → lien reçu / `/creer-compte` / RDV ; fournisseur → `/cercles/espace` ; équipe → `/cc/login` | Pas de compte client | ❌ (lot 3a) |

### D. Après le lead

| n° | Étape | URL | Ce que voit / fait le client | Coulisses | Statut |
|---|---|---|---|---|---|
| D1 | Qualification par l'équipe | [admin /cc/leads](https://admin.citurbarea.com/cc/leads) | — (côté équipe) : liste, porte, étape, notes, formulaires abandonnés (`/api/cc/funnel`), conversions Google | `functions/api/cc/leads/*` | ✅ en production / 🟡 preview (503 `access_not_configured`) |
| D2 | Prise de RDV visio | [/rendez-vous](https://feat-backoffice-leads-local.citurbarea.pages.dev/rendez-vous) | Choix d'un créneau de 30 min (créneaux réels renvoyés par `/api/rdv/creneaux`) | `POST /api/rdv` → table `RendezVous` ; e-mail si Resend configuré ; visible dans `/cc/rendez-vous` | ✅ |
| D3 | Espace RDV du client | `/rdv/<jeton>` (lien reçu) | Voir son RDV, annuler, déplacer, compléter son dossier (`/dossier`), rejoindre la visio | `/api/rdv/<jeton>`, `/annuler`, `/deplacer`, `/dossier`, `/visio` | ✅ ; la salle visio exige `JAAS_*` → 🟡 |
| D4 | Gestion des RDV par l'équipe | [admin /cc/rendez-vous](https://admin.citurbarea.com/cc/rendez-vous) | — : liste, paramètres des créneaux, visio, « appel de suivi » et « écrire au client » | `functions/api/cc/rdv/*` ; boutons appel/message → 503 tant que les tables manquent | ✅ / 🟡 |
| D5 | Appel vidéo sur demande | `/appel/<jeton>` | Accepter, proposer un autre créneau, refuser, rejoindre | `/api/appels/*` → **503 `appels_indisponibles`** (preview et production) | 🟡 (tables + `APPELS_SECRET` + `JAAS_*`) |
| D6 | Messagerie | `/messages/<jeton>`, `/messages/boite/<jeton>` | Fil de discussion avec CITURBAREA, coordonnées masquées | `/api/messages/*` → 503 en preview ; non déployé en production | 🟡 |
| D7 | Espace projet | `/projet/<jeton>` → [/projet](https://feat-backoffice-leads-local.citurbarea.pages.dev/projet) | Après invitation par l'équipe (`/cc/projets`) : jalons, documents, discussion par jalon | `/api/projets/*` ; production ✅ (tables présentes), preview 🟡 (secret de session absent) ; fichiers sur R2 `FICHIERS` non garanti | 🟡 |
| D8 | Compte client (lot 3a) | — | Lien magique / code, cookie signé | Non livré (`functions/_lib/clientSession.ts` absent) | ❌ |
| D9 | Espace dossier client (lot 3b) | `/mon-espace` | Mes dossiers, devis, RDV, messages, documents | Non livré | ❌ |
| D10 | Dossiers côté équipe | [admin /cc/dossiers](https://admin.citurbarea.com/cc/dossiers) | — : liste en lecture (recherche, porte, contact) + appel / message au client | `GET /api/cc/dossiers` ; fiche, vue client et devis du dossier = EnSommeil | 🟡 (lecture seule, lot 3c) |
| D11 | Devis envoyé au client | `/cc/devis`, `/cc/dossiers/:id/devis` | — | EnSommeil (lot 3c) ; on passe par `/cc/simulateur` | 💤 |
| D12 | Paiement | [/payment/start](https://feat-backoffice-leads-local.citurbarea.pages.dev/payment/start) | Page « bientôt disponible » | Paiement manuel déclaratif prévu (lot 5) | 💤 |
| D13 | Contrat | — | — | Ancien service NestJS éteint ; rien côté Functions | ❌ |

### E. Projet en cours

| n° | Étape | URL | Statut |
|---|---|---|---|
| E1 | Jalons du projet (Conception → Exécution → Réception) | `/projet` (après invitation) | 🟡 (voir D7) |
| E2 | Anciennes phases études / autorisation / chantier | `/dossiers/:id/phases`, `/mon-parcours/:id`, `/dossier/:id/rokhas`, `/permis-construire/:id` | 💤 |
| E3 | Calendrier projet | `/projet/:id/calendrier`, `/dossier/:id/calendrier` | 💤 |
| E4 | PV de chantier | `/chantier/:id/pv`, `/pv-chantier/*` | 💤 |
| E5 | Livraisons, incidents, sous-traitants, copilote | `/chantier/:id/*` | 💤 |
| E6 | Documents du dossier | `/dossier/:id/documents` | 💤 (documents de l'espace projet à la place) |
| E7 | Planning d'achat matériaux | [/materiaux/planning](https://feat-backoffice-leads-local.citurbarea.pages.dev/materiaux/planning) | ✅ (outil public, non relié au projet) |
| E8 | Demandes de prix par lot | panier matériaux | 🟡 (aucun fournisseur publié, messagerie à activer) |
| E9 | Commandes en ligne | `/materiaux/commande` | ❌ / à vérifier (tables `Commande` prévues, pas de Function trouvée) |
| E10 | Appels / messages avec prestataires | depuis jalon / fiches | 🟡 (tables appels + messagerie) |
| E11 | CPS | [/cps](https://feat-backoffice-leads-local.citurbarea.pages.dev/cps) | 💤 |

### F. Fin de projet

| n° | Étape | URL | Statut |
|---|---|---|---|
| F1 | Réception | `/dossier/:id/reception` | 💤 (jalon « Réception » de l'espace projet seulement) |
| F2 | Permis d'habiter | [guide](https://feat-backoffice-leads-local.citurbarea.pages.dev/guide/permis-habiter-certificat-conformite-maroc) | ❌ (guide seulement) |
| F3 | Garanties | — | ❌ |
| F4 | Avis client | — | ❌ |

### G. Côté pro / fournisseur

| n° | Étape | URL | Coulisses | Statut |
|---|---|---|---|---|
| G1 | Vitrine Cercles | [/cercles](https://feat-backoffice-leads-local.citurbarea.pages.dev/cercles) | — | ✅ |
| G2 | Inscription pro | [/cercles/inscription](https://feat-backoffice-leads-local.citurbarea.pages.dev/cercles/inscription), [/inscription](https://feat-backoffice-leads-local.citurbarea.pages.dev/inscription) | `POST /api/cercles/inscription` → `Fournisseur` ; à valider dans `/cc/fournisseurs` | ✅ |
| G3 | Accès par code | [/cercles/espace](https://feat-backoffice-leads-local.citurbarea.pages.dev/cercles/espace) | `/api/cercles/acces/demande` + `verifier` ; preview 503 `access_not_configured`, production ✅ (401 tant que non connecté) | ✅ prod / 🟡 preview |
| G4 | Fiches société / produits / services / images / documents | onglets de l'espace | `/api/cercles/espace/*` (fiches, produits, services, images, documents) | ✅ (après connexion) |
| G5 | Annuaire et fiche pro publique | [/cercles/annuaire](https://feat-backoffice-leads-local.citurbarea.pages.dev/cercles/annuaire), `/cercles/pro/<slug>` | `/api/cercles/annuaire` = 0 fiche publiée | 🟡 (vide) |
| G6 | Appels et messages du pro | onglets « Appels vidéo » / « Messages » | 503 tant que les tables manquent | 🟡 |
| G7 | Ancien réseau social Cercles, fiche cabinet, tarifs prestataires | `/cercles/<slug>`, `/cabinet/*`, `/prestataires/tarifs` | — | 💤 |

### H. Côté admin

| n° | Écran | URL (production) | Statut |
|---|---|---|---|
| H1 | Connexion | [admin /cc/login](https://admin.citurbarea.com/cc/login) | ✅ prod / 🟡 preview (503) |
| H2 | Leads | [/cc/leads](https://admin.citurbarea.com/cc/leads) | ✅ |
| H3 | Rendez-vous | [/cc/rendez-vous](https://admin.citurbarea.com/cc/rendez-vous) | ✅ |
| H4 | Appels vidéo | [/cc/appels](https://admin.citurbarea.com/cc/appels) | 🟡 (tables) |
| H5 | Messages | [/cc/messages](https://admin.citurbarea.com/cc/messages) | 🟡 (tables + déploiement) |
| H6 | Dossiers | [/cc/dossiers](https://admin.citurbarea.com/cc/dossiers) | 🟡 lecture seule ; fiche / vue client / devis 💤 |
| H7 | Projets (inviter un client dans l'espace projet) | [/cc/projets](https://admin.citurbarea.com/cc/projets) | ✅ prod (à vérifier en usage) |
| H8 | Fournisseurs, fiches de prix, images | [/cc/fournisseurs](https://admin.citurbarea.com/cc/fournisseurs) | ✅ (`/cc/fiches-prix` n'est pas un écran : les fiches sont dans `/cc/fournisseurs`) |
| H9 | Terrains | [/cc/terrains](https://admin.citurbarea.com/cc/terrains) | ✅ |
| H10 | Matériaux / prix de référence | [/cc/materiaux](https://admin.citurbarea.com/cc/materiaux) | ✅ |
| H11 | Simulateur | [/cc/simulateur](https://admin.citurbarea.com/cc/simulateur) | ✅ |
| H12 | Tableau de bord | `/cc/dashboard` → `/cc/leads` | ✅ (redirection) |
| H13 | Visites, SEO, médias, régie, archive, cabinets, SIG, business, live, devis libre | `/cc/...` | 💤 |

---

## 3. Visite guidée en 20 clics

À faire sur **https://citurbarea.com** (public) et **https://admin.citurbarea.com** (équipe), car le back-office de la preview est fermé. Toutes les saisies sont fictives et marquées TEST.

1. Ouvrir https://citurbarea.com/ : vérifier l'accueil sur ordinateur **et** sur téléphone (barre du bas).
2. Ouvrir un guide : `/guide/permis-de-construire-maroc`, puis revenir à l'accueil par le menu.
3. Ouvrir `/architecte-kenitra` puis cliquer le bouton principal de la page.
4. Passer en arabe : `/ar/bab-01-mashrou-shakhsi-wa-usari`.
5. `/chiffrage` : saisir 150 m², R+1, Kénitra et noter le total.
6. `/chiffrage/devis` : vérifier que le devis détaillé s'affiche et s'imprime.
7. `/materiaux` : ouvrir une famille, puis une fiche matériau depuis la liste.
8. `/materiaux/planning` : vérifier le planning d'achat.
9. `/p1` : remplir l'assistant (nom « TEST Yassine », téléphone 0600000000, e-mail test+p1@citurbarea.com, budget 1 000 000 DH).
10. `/p1/packs` : choisir un pack et envoyer, puis vérifier la page de confirmation `/p1/dossier`.
11. `/creer-compte` : envoyer un second lead « TEST Créer compte ».
12. `/p4/terrains/deposer` : déposer « TEST terrain 300 m² Kénitra ».
13. `/rendez-vous` : réserver un créneau (nom « TEST RDV »).
14. Ouvrir le lien `/rdv/<jeton>` (écran de confirmation ou e-mail) : compléter le dossier, puis déplacer le RDV.
15. Se connecter sur https://admin.citurbarea.com/cc/login.
16. `/cc/leads` : retrouver les 3 leads TEST (P1, création de compte, terrain), changer l'étape et ajouter une note.
17. `/cc/rendez-vous` : retrouver « TEST RDV » et son dossier ; essayer « Demander un appel vidéo » (réponse attendue tant que les tables manquent : indisponible).
18. `/cc/terrains` : valider l'annonce TEST, puis vérifier qu'elle apparaît sur `/p4/terrains`.
19. `/cc/projets` : créer un projet « TEST » et inviter le client TEST ; ouvrir le lien `/projet/<jeton>` dans une fenêtre privée.
20. `/cc/dossiers` : vérifier que le dossier P1 TEST y figure, puis supprimer ou archiver toutes les données TEST (leads, terrain, RDV, projet).

---

## 4. Ruptures et manques, par priorité

| Prio | Rupture | Effet pour un vrai client | Qui s'en charge |
|---|---|---|---|
| 1 | Tables appels vidéo absentes (`DemandeAppel`, `BlocageAppel`) | Aucun « Demander un appel vidéo » ne marche, alors qu'il remplace l'échange de coordonnées | coller `docs/sql/appels-video-neon.sql` dans Neon ; contrat `contrat-appels-video.md` |
| 1 | Tables messagerie absentes (`Conversation`, `MessageConversation`) et Function non déployée en production | Aucun « Écrire un message » ; client, pro et fournisseur ne peuvent pas échanger | `docs/sql/messagerie-neon.sql` + fusion / déploiement de la branche ; contrat `contrat-messagerie.md` |
| 1 | Pas de compte client (lot 3a) ni d'espace dossier (lot 3b) | Après le lead, le client n'a pas d'espace à lui, seulement le lien de son RDV et les liens reçus | plan-rebranchement.md, lots 3a / 3b |
| 2 | Back-office dossiers en lecture seule (lot 3c) : pas de statut, d'invitation ni de devis PDF | L'équipe ne peut pas faire avancer le dossier dans l'outil | lot 3c |
| 2 | Paiement et contrat absents | Pas de paiement en ligne ni de contrat signé dans la plateforme | lot 5 (paiement manuel déclaratif) ; contrat à définir |
| 2 | Aucun fournisseur, produit ni terrain publié | Matériauthèque, annuaire et terrains vides ; les demandes de prix n'aboutissent pas | valider les inscriptions dans `/cc/fournisseurs` et `/cc/terrains` |
| 3 | Suivi de chantier (PV, livraisons, réception, calendrier) en sommeil | Seuls les jalons de l'espace projet existent | lot 4, via l'espace projet |
| 3 | Pas de CGU publiée (`/cgu` = 404) | La mention messagerie / appels n'est publiée nulle part | `contrat-messagerie.md` (texte proposé, à valider) |
| 3 | P5 : envoi de document retiré | Le client doit envoyer sa note de renseignements par WhatsApp ou au RDV | dépôt commun (`contrat-depot-fichiers.md`) |
| 4 | Fin de projet (réception, permis d'habiter, garanties, avis) | Rien après la réception | à construire (aucun lot prévu) |
| 4 | Commande de matériaux en ligne | Prévue (tables `Commande`), non branchée | session prix / matériaux |

---

## 5. Configuration encore manquante

**Tables Neon** (SQL à coller dans la console Neon ; l'agent ne crée pas les tables de production) :

| Fichier | Tables | État constaté |
|---|---|---|
| `docs/sql/appels-video-neon.sql` | `DemandeAppel`, `BlocageAppel` | **absentes** (503 en preview et en production) |
| `docs/sql/messagerie-neon.sql` | `Conversation`, `MessageConversation` | **absentes** (503 en preview) |
| `docs/sql/espace-projet-neon.sql` | `Projet`, `ProjetMembre`, `ProjetJalon`, `ProjetMessage`, `ProjetFichier`, `ProjetDocument`, `ProjetEvenement` | présentes en production (401 après le contrôle des tables) |
| `docs/sql/rendezvous-neon.sql` | `RendezVous`, `Parametre` | présentes (les créneaux répondent) |
| `docs/sql/terrains-neon.sql` | `TerrainAnnonce` | présente (`/api/terrains` répond `[]`) |
| `docs/prix/sql/cercles-*.sql` | `Fournisseur`, `SupplierPrice`, `DemandePrix`, `ReponsePrix`, `ProduitFournisseur`, `ServiceFournisseur`, `MateriauReferentiel`, `ImageCatalogue`… | présentes (catalogue et annuaire répondent, vides) |
| `docs/prix/sql/achat-en-ligne.sql` | `Commande`, `LigneCommande` | non vérifié |
| `docs/sql/dossiers-neon.sql` | `User`, `Dossier` | à vérifier (`/cc/dossiers`) |

**Variables Cloudflare** (relevées dans `functions/`) :

- Environnement **Preview** : il manque au minimum `ADMIN_SESSION_SECRET` et `ADMIN_PASSWORD_HASH` / `ADMIN_EMAILS` (ou `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`), `FOURNISSEUR_SESSION_SECRET` et `PROJET_SESSION_SECRET` (constaté : 503 `access_not_configured` et `session_non_configuree`).
- Les deux environnements, à vérifier : `JAAS_APP_ID`, `JAAS_KEY_ID` et `JAAS_PRIVATE_KEY_PEM` (salle visio), `APPELS_SECRET`, `RESEND_API_KEY`, `LEAD_NOTIFY_FROM` et `LEAD_NOTIFY_TO` (e-mails), `PUBLIC_WEB_URL`, binding R2 `FICHIERS` (non garanti : R2 n'est pas activé sans moyen de paiement), et en option `APPELS_CRON_CLE`.
