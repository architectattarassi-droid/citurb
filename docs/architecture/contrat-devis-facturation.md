# Contrat — Devis & Facturation, cabinets et dossiers créés par l'admin

Spécification : `docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md` (fondateur, 14/10/2026).
Session responsable : « Devis & facturation + dossiers clients existants ».
À lire par les sessions **« Débrancher l'ancienne API »** (lots 3a, 3b, 3c), espace projet, messagerie, appels vidéo.

## Principes

- **Pas de modèle concurrent** : le « Projet » de la spec **est** le `Dossier` existant ; le « Client » de la spec **est** le `User` (rôle `CLIENT`) propriétaire du dossier + les colonnes `client*` du dossier. Les tables `Projet*` (espace projet de chantier, `docs/sql/espace-projet-neon.sql`) restent l'espace collaboratif, relié par `Projet.dossierId`.
- **Émetteur** de tous les devis et factures, frais de cabinet compris : **CITURBAREA, porté par HSE DECO** (société de mise en relation et de gestion de projets) — décision du fondateur du 15/10/2026. Constante `EMETTEUR` (`apps/web/src/domain/honoraires/emetteur.ts`) : identifiants légaux HSE DECO (ICE, IF, RC, patente, siège) **vides tant que le fondateur ne les a pas fournis** → « à compléter » sur la facture ; coordonnées : uniquement `apps/web/src/config/contact.ts`.
- Le **cabinet** (`Cabinet` : ARC-BATI ou autre) apparaît comme **architecte du projet** (nom, architecte, n° d'Ordre), **sans téléphone, e-mail ni adresse** ; il sert à la **répartition interne des honoraires**. Ses coordonnées restent au back-office.
- **Écart avec la spec v1** : §5.1 plaçait le cabinet en en-tête (adresse, téléphone, e-mail) et §5.2 exigeait les mentions légales « du cabinet » ; §5.4 disait « ARC-BATI met à votre disposition… ». Remplacés par : en-tête CITURBAREA / HSE DECO, mentions légales de HSE DECO, bandeau « CITURBAREA met à votre disposition… » (`BANDEAU_SUIVI`), ligne « Architecte du projet : ARC-BATI ARCHITECTURE — Yassine ATTARASSI, architecte DENA ».
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
| Architecte du projet (répartition interne) | `Dossier.cabinetId` → `Cabinet.id` | ARC-BATI = `cab_arc_bati` ; jamais émetteur |
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

## Devis (étape 2, 15/10/2026)

- **Tables** : `Devis` (saisie `entree`, document figé `document`, `hashContenu`, montants NUMERIC) et `SequenceDocument (type, annee, dernier)` — `docs/sql/devis-facturation-neon.sql`.
- **Cycle de vie** : `BROUILLON` (sans numéro, modifiable, supprimable) → `EMIS` (numéro `DEV-AAAA-NNNN` alloué **dans la même instruction SQL** que le passage à EMIS ; le serveur recalcule tout et fige document + empreinte SHA-256) → `REFUSE`. `EXPIRE` est le statut **effectif** calculé à la lecture (date d'émission + validité dépassée) : pas de tâche planifiée sur Pages. Modifier un devis émis = **révision** (nouveau brouillon, émis sous `DEV-AAAA-NNNN-R2`, sans consommer de numéro ; l'original porte `remplacePar`). `ACCEPTE` / `FACTURE` : étape suivante (packs, preuve d'acceptation, factures).
- **Routes** : `GET|POST /api/cc/dossiers/<id>/devis` ; `GET|PATCH|DELETE /api/cc/devis/<id>`, `POST /api/cc/devis/<id> { action: "emettre" | "reviser" | "refuser" }` (`functions/_lib/devisDepot.ts`). La saisie est relue par `validerEntreeDevis` ; aucun montant envoyé par le navigateur n'est lu.
- **Rendu PDF et DOCX** : `apps/web/src/domain/honoraires/rendu/` — générateurs **sans dépendance** (PDF écrit à la main, polices standard Helvetica ; DOCX = XML Word dans un zip « stocké »), exécutés **dans le navigateur** (aucun service payant, aucune limite CPU de Function, aucun fichier de verrouillage npm touché). Les deux sortent du même modèle (`documentDevis.ts`), portent le même numéro et la même empreinte, et sont **déterministes** (même contenu → mêmes octets). Calibri : imposée dans le DOCX ; le PDF utilise Helvetica (Calibri n'est pas embarquable librement ; sa métrique libre Carlito pourra être embarquée plus tard).
- **Écarts de texte avec la spec** (émetteur CITURBAREA) : « Les délais … ne sont garantis ni par CITURBAREA ni par l'architecte » (au lieu de « par le cabinet ») ; bandeau « CITURBAREA met à votre disposition… » ; QR code du bandeau §5.4 non fait (lien `/mon-espace` en texte).
- **Fiche admin** : onglet Devis = `apps/web/src/command-center/modules/dossiers/devis/OngletDevis.tsx` (branché dans `FicheDossier.tsx`). Aperçu HTML réutilisable pour l'espace client : `devis/ApercuDocument.tsx`.

## Acceptation, échéancier, factures et paiements par phase (étape 3, 15/10/2026)

Décision du fondateur : **chaque phase P00…P14 démarre après paiement de son échéance**, selon le contrat (devis accepté) et ses modalités ; devis, factures et statut de paiement s'affichent dans la timeline du projet.

- **Acceptation** (`EMIS` → `ACCEPTE`) : exactement un pack si présentation PACKS (règle 2) ; seules les prestations facultatives **commandées** sont facturées (règle 4) ; « Sur devis » jamais facturable ; prestations hors honoraires (BET, labo, géomètre) **exclues par défaut** (case à cocher, point à trancher). Preuve obligatoire : devis signé scanné (admin, dépôt commun contexte `facturation`) ou acceptation **en ligne horodatée** par le client (`preuveAcceptation = { type: "EN_LIGNE", horodatage, clientId, empreinteDevis }`). Devis expiré ou remplacé : refus. Colonnes `Devis.montantAccepte`, `Devis.lignesAcceptees`.
- **Échéancier** (`EcheancePaiement`) : proposé à l'acceptation selon `modalitesPaiement` — `AVANCE_TOTALE` : 100 % à la signature ; `50_50` : acompte à la signature + solde avant la phase suivante ; `PAR_TRANCHES` / `PAR_VISITE` : chaque mission répartie à parts égales sur les phases qui la portent (référentiel : `PhaseRef.missions`), première tranche à la signature. Modifiable par l'admin (somme = montant accepté ; échéance facturée figée) ; chaque modification journalisée (`ECHEANCIER_MODIFIE`, avant / après).
- **Factures** : une par échéance, `FAC-AAAA-NNNN` (type FORFAIT_UNIQUE, ACOMPTE, SITUATION ou SOLDE), émise par CITURBAREA / HSE DECO, TVA 20 % par défaut (modifiable), retenue à la source prévue, échéance J+15 par défaut, montant en lettres. Numéro alloué dans l'instruction `INSERT` même (aucun trou ; double facturation d'une échéance impossible : index unique partiel). Immuable ; correction par **avoir** `AVO-AAAA-NNNN` (montant négatif, motif obligatoire ; avoir total → facture `ANNULEE`, l'échéance redevient facturable).
- **Encaissements** (`Encaissement`) : virement, chèque, espèces, effet ; référence ; justificatif dans le dépôt commun ; plafonnés au reste à payer ; statut facture `EMISE` → `PARTIELLEMENT_REGLEE` → `REGLEE`. Aucun paiement en ligne.
- **Déblocage** (`DeblocagePaiement`) : l'admin lève le point d'arrêt d'une phase non payée avec un **motif écrit** (≥ 10 caractères), journalisé `PHASE_DEBLOQUEE_SANS_PAIEMENT`.

### Interface pour la gestion de projet (timeline, blocage du démarrage)

- **Côté serveur** : `etatPaiementPhasesDossier(sql, dossierId, aujourdhui)` — `functions/_lib/facturationDepot.ts` ; **HTTP admin** : `GET /api/cc/dossiers/<id>/paiements` → `{ phases }`. Tables absentes → `null` : ne rien bloquer.
- Pour chacune des 15 phases (`PhasePaiement`, `apps/web/src/domain/honoraires/facturation.ts`) : `phase`, `ordre`, `libelle`, `devis[]` (id, numéro), `echeances[]` (id, libellé, montant HT, facturée), `factures[]` (numéro, type, statut, dû, payé, restant, échéance), `du` / `paye` / `restant` (TTC net d'avoirs ; `estime: true` si une échéance n'est pas encore facturée), `statut`, `datePaiementComplet`, **`bloquante`** (échéance non payée et pas de déblocage), `deblocage` (motif, par, le), `aucuneEcheance`.
- **Statuts** : `NON_DUE` (pas encore exigible : phase au-delà de la suivante, ou aucune échéance), `A_EMETTRE` (exigible, facture pas encore émise), `EMISE`, `PARTIELLE`, `PAYEE`, `EN_RETARD` (date d'échéance de la facture dépassée). Plusieurs échéances sur une phase : le plus grave l'emporte (EN_RETARD > A_EMETTRE > PARTIELLE > EMISE > NON_DUE > PAYEE).
- Règle d'usage : **ne pas démarrer une phase dont `bloquante === true`** ; proposer à l'admin le bouton de déblocage motivé (`POST /api/cc/dossiers/<id>/facturation { action: "debloquer", phase, motif }`).
- La phase actuelle du dossier (code du catalogue) est ramenée au référentiel par `phaseDuCatalogue()`.
- **Champs figés (lus par `functions/_lib/gestionPhases.ts`, commit 427f641)** : `phase`, `bloquante`, `statut`, `du`, `paye`, `restant`, `estime`, `factures[]`, `devis[]`, `deblocage`, `datePaiementComplet`, `aucuneEcheance`. Toute modification de leur forme se coordonne d'abord avec la session « Gestion de projet BTP ». Usage en place : démarrage refusé si `bloquante` (fiche : 409 `phase_en_attente_paiement`, synchronisation de l'espace projet, jalons) ; date de démarrage affichée = `datePaiementComplet`, sinon `deblocage.le`.

### Routes de l'étape 3

| Route | Rôle |
|---|---|
| `POST /api/cc/devis/<id> { action: "accepter", pack?, commandees[], inclureHorsHonoraires?, dateAcceptation, justificatif }` | acceptation admin (scan signé obligatoire) |
| `GET /api/cc/dossiers/<id>/facturation` | état par phase, devis acceptés, échéancier, factures, encaissements |
| `POST /api/cc/dossiers/<id>/facturation` | `echeancier`, `facturer`, `encaisser`, `avoir`, `debloquer` |
| `GET /api/cc/dossiers/<id>/paiements` | état par phase seul (gestion de projet) |
| `GET /api/cc/factures/<id>` | document figé + empreinte (PDF / DOCX générés dans le navigateur) |
| `GET /api/cc/dossiers/<id>/justificatifs/<docId>` | scan signé / justificatif de paiement (dépôt commun, contexte `facturation`) |
| `GET|POST /api/client/dossiers/<id>/facturation` | espace client : devis, factures, paiements par phase ; acceptation en ligne |

Écrans : `devis/Acceptation.tsx`, `devis/OngletFactures.tsx` (fiche admin), `features/espace-client/DevisFactures.tsx` (/mon-espace, FR/AR).
