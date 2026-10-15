# Contrat — Devis & Facturation, cabinets et dossiers créés par l'admin

Spécification : `docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md` (fondateur, 14/10/2026).
Session responsable : « Devis & facturation + dossiers clients existants ».
À lire par les sessions **« Débrancher l'ancienne API »** (lots 3a, 3b, 3c), espace projet, messagerie, appels vidéo.

## Principes

- **Pas de modèle concurrent** : le « Projet » de la spec **est** le `Dossier` existant ; le « Client » de la spec **est** le `User` (rôle `CLIENT`) propriétaire du dossier + les colonnes `client*` du dossier. Les tables `Projet*` (espace projet de chantier, `docs/sql/espace-projet-neon.sql`) restent l'espace collaboratif, relié par `Projet.dossierId`.
- **Émetteur** des devis et factures d'honoraires : le **cabinet** (`Cabinet`), jamais HSE DECO (éditeur de la plateforme). Mentions légales vides → bandeau « à compléter », rien n'est inventé.
- **Aucune coordonnée** du client n'est renvoyée hors de `/api/cc` ; le lien client ne renvoie aucune coordonnée de tiers (ni du cabinet).
- Calculs d'argent : **décimal exact** (`apps/web/src/domain/honoraires/decimal.ts`), jamais de flottant ; stockage en `NUMERIC(14,2)` (tables Devis/Facture, étape suivante).

## Mapping spec → tables

| Spec | Table / colonne | Notes |
|---|---|---|
| `Client.id` | `User.id` (role `CLIENT`) | compte sans mot de passe (`!sans-mot-de-passe:a-activer`), activé par le lot 3a |
| `Client.civilite`, `prenom`, `nom` | `Dossier.clientCivilite`, `clientPrenom`, `payload.client.nom` (CAPITALES) | `Dossier.clientNom` = nom affiché « Monsieur Rida MEHDAOUI » ou raison sociale |
| `Client.raisonSociale`, `ice`, `rc`, `if` | `Dossier.raisonSociale`, `ice`, `rc`, `clientIdentifiantFiscal` | ICE obligatoire sur facture si société (avertissement à la création) |
| `Client.adresse`, `ville`, `telephone`, `email` | `Dossier.clientAdresse`, `clientVille`, `clientTel`, `clientEmail` (+ `User.phone/email`) | admin seulement |
| `Client.compteActif` | `User.passwordHash` ≠ `!sans-mot-de-passe…` ou session client du lot 3a | à préciser par le lot 3a |
| `Projet.intitule`, `commune` | `Dossier.title`, `commune` | |
| `Projet.typologie`, `gabarit`, `lot`, `lotissement`, `prefecture`, `titreFoncier` | colonnes du même nom sur `Dossier` | |
| `Projet.autorisationNum/Date/Expiration` | `Dossier.autorisationNum`, `autorisationDate` (DATE), `autorisationExpiration` (DATE) | pilote l'alerte J−90 (§8.4) |
| `Projet.etatChantier` | `Dossier.etatChantier` | contexte, jamais facturé |
| Rattachement cabinet | `Dossier.cabinetId` → `Cabinet.id` | ARC-BATI = `cab_arc_bati` |
| Phase actuelle | `Dossier.phase` | codes de `packages/contracts/src/phases.catalog.ts` |
| Étapes antérieures / en cours | `DossierEtape (dossierId, phaseCode, statut, dateRealisation, note, documentIds, saisiPar)` | statuts : `FAITE_HORS_PLATEFORME`, `SANS_OBJET`, `EN_COURS` ; le lot 3c peut ajouter `FAITE`, `A_FAIRE`, `DEBLOQUEE` |
| Missions déjà réglées (§7 règle 8) | `Dossier.payload.missionsReglees[] = { code, libelle, montant ("3000.00"), date, note }` | `calculerDevis({ missionsDejaReglees })` refuse toute ligne de ces codes |
| Journal admin | `DossierEvenement (id, dossierId, auteur, action, details, createdAt)` | append-only, **aucune coordonnée** dans `details` |
| Origine | `Dossier.origine = 'ADMIN'`, `Dossier.creePar = <e-mail admin>` | les dossiers des portes gardent `origine` NULL |
| `GrilleTarifaire`, `Prestation` | constantes versionnées `apps/web/src/domain/honoraires/grilleArcBati.ts` (`arc-bati-2026-10`) ; `Cabinet.grilleId` | table à l'étape « grille éditable » si le cabinet doit modifier ses prix sans déploiement |
| `Devis`, `LigneDevis`, `Facture`, `Encaissement`, numérotation DEV/FAC/AVO | à venir dans `docs/sql/devis-facturation-neon.sql` | justificatifs et devis signé scanné : dépôt commun (`contrat-depot-fichiers.md`) |

Statut d'un dossier créé par l'admin : `SUBMITTED` s'il est au brief, `APPROVED` sinon (dossier déjà avancé, porté par le cabinet), `gestionMode = 'DELEGUE'`, `porteType = 'P1'`.

## Routes (Pages Functions)

| Route | Rôle |
|---|---|
| `GET /api/cc/cabinets` | cabinets + référentiel du formulaire (phases, prestations) ; SQL absent → ARC-BATI en lecture seule et `sqlAColler: true` |
| `POST /api/cc/cabinets` | ajoute un cabinet (nom, architecte, n° d'Ordre, ICE, IF, RC, patente, logo https) |
| `POST /api/cc/dossiers` | création admin (`functions/_lib/dossierAdmin.ts` : `validerCreation`, `creerDossierAdmin`) ; SQL absent → `503 sql_a_coller` |
| `GET /api/cc/dossiers/doublons?telephone=&email=` | comptes clients, leads, dossiers de même téléphone (9 derniers chiffres) ou e-mail |
| `GET /api/cc/dossiers/alertes-autorisation` | autorisations expirées ou à J−90, tous dossiers (y compris créés avancés) |
| `GET /api/mon-dossier/<jeton>` | lecture client par lien signé (`d1.<exp>.<id>.<hmac>`, 90 jours, secret `DOSSIER_LIEN_SECRET` à défaut `ADMIN_SESSION_SECRET`) |

Écrans : `/cc/dossiers/nouveau` (`creation/NouveauDossierAdmin.tsx`, bouton « + Nouveau dossier » de `/cc/leads` et de `/cc/dossiers`), bandeau d'alertes sur `/cc/dossiers`, `/mon-dossier/:jeton` et `/ar/mon-dossier/:jeton` (client, mobile, FR/AR, noindex).

## Pour les autres sessions

- **Lot 3c (fiche dossier admin `/cc/dossiers/:id`)** : lire les étapes dans `DossierEtape` (fusion avec `phases.catalog.ts`), le journal dans `DossierEvenement` (y écrire aussi « statut forcé », « débloqué »… via `journaliser()`), et réserver deux onglets **Devis** et **Factures** que cette session fournira (`creation/` puis `devis/` sous `command-center/modules/dossiers/`). Ne pas recréer de création de dossier ni d'invitation : `jetonDossier()` existe ; une route « régénérer le lien » peut l'appeler.
- **Lot 3a (compte client)** : quand `clientSession.ts` existe, `/mon-dossier/<jeton>` peut échanger le lien contre la session client (comme `/projet/<jeton>`) ; garder les liens déjà envoyés valides jusqu'à leur expiration.
  → **Fait (lot 3a, 15/10)** : `MonDossierPage` appelle `POST /api/client/acces/lien` à l'ouverture du lien ; les liens restent valables 90 jours ; `Client.compteActif` = session client possible (`User.role = 'CLIENT'` et `isActive`). Fiche admin `/cc/dossiers/:id` livrée (onglets Devis / Factures réservés), régénération du lien : `POST /api/cc/dossiers/<id>/lien` (appelle `jetonDossier()`).
- **Lot 3b (espace client)** : reprendre l'affichage de `MonDossierPage` (parcours, alerte d'autorisation, missions réglées) plutôt que le dupliquer ; les devis/factures s'y ajouteront (§8.1–8.3).
- **Outils pros Cercles** : toute route devis/facturation utilisée par un pro passera sous `/api/cercles/espace/outils/facturation/…` (`contrat-acces-pro.md`).
