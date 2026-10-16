# Gestion de projet de construction — lots GP1 à GP5 (contrat d'intégration)

Feuille de route : `docs/gestion-projet/audit-et-ameliorations.md`. Référentiel (enrichi par la session principale, lu tel quel par le code) : `docs/gestion-projet/referentiel-phases.json`.

## Où est quoi

| Sujet | Code | Routes |
|---|---|---|
| Référentiel unique (15 phases P00–P14, correspondances catalogue / espace projet / matériaux / chiffrage / CPS / types / rôles) | `packages/contracts/src/gestion/referentiel.ts` | — |
| Profil du projet, conditions des pièces, décisions du 15/10/2026 (bureau de contrôle > 5 MDH, TRC/décennale > 3 étages ou 800 m²) | `packages/contracts/src/gestion/profil.ts` | action `profil` de `PATCH /api/cc/dossiers/:id` |
| Visa : commune → conseil régional de l'Ordre (entrées « à vérifier ») | `packages/contracts/src/gestion/ordres.ts` | — |
| Questions ouvertes paramétrables (raccordements, levée des réserves, art. 770, budget visible) | `packages/contracts/src/gestion/parametres.ts` | `GET/PUT /api/cc/gestion/parametres` (table `Parametre`, clé `gestion-projet`) |
| Documents attendus par phase et par lot, « Document manquant », normes par lot, checklists de la phase | `packages/contracts/src/gestion/pieces.ts`, `functions/_lib/dossierPieces.ts` | `/api/cc/dossiers/:id/pieces`, `/api/client/dossiers/:id/pieces`, `/api/projets/:id/pieces` (+ `/<docId>`) |
| Envoi des fichiers | dépôt de documents commun `functions/_lib/depot*.ts` (contrat v2) ; les pièces rattachent l'id du document (action `rattacher`) ; `functions/_lib/documents.ts` ne sert plus qu'à lire les fichiers déposés avant | `/api/{cc,client,projets}/depot` puis `…/pieces` |
| Checklists de chantier = PV numériques, points d'arrêt, déblocage admin motivé | `packages/contracts/src/gestion/checklists.ts`, `functions/_lib/projetsApi.ts` | `PATCH /api/cc/projets/:id/jalons/:code` `{ debloquer: { motif } }` |
| Échéances et rappels J−90 / J−30 / J−7 | `packages/contracts/src/gestion/echeances.ts`, `functions/_lib/echeances.ts` | `GET /api/cc/echeances`, `POST /api/cc/echeances/rappels`, `POST /api/taches/rappels` |
| Phase du dossier synchronisée sur l'espace projet, frise client | `packages/contracts/src/gestion/frise.ts`, `functions/_lib/projetsGestion.ts`, `functions/_lib/vueDossierClient.ts` | vues `/api/mon-dossier/:jeton`, `/api/client/dossiers/:id` |

Écrans : fiche `/cc/dossiers/:id` (Parcours P00→P14, Profil du projet, Échéances, onglet « Documents par phase »), `/cc/dashboard` (menu « Échéances »), espace client `/mon-espace` (frise, documents FR/AR), espace projet (documents du dossier, PV exigés, déblocage).

## Règles garanties

- **Aucune coordonnée** : noms de fichiers, motifs de refus et de déblocage passent par `masquerCoordonnees` ; les pièces « back-office uniquement » (identité, estimation de référence, offres) ne sont jamais servies au client ; les e-mails de rappel ne portent que titre, commune, date et action.
- **Point d'arrêt** : un jalon « porte » (ex. `84_FONDATIONS.FON.10`, armatures avant bétonnage) ne passe pas à « validé » sans le PV de sa checklist signé par tous les rôles et non refusé. Seul l'administrateur débloque, avec un motif écrit, journalisé dans `ProjetEvenement` et dans `DossierEvenement` (`journaliser()`). Débloquer une étape du dossier (statut `DEBLOQUEE`) ou le dossier exige aussi un motif.
- **Migration sans perte** : les étapes existantes gardent leur statut ; l'étape retirée `36_AFFICHAGE_RECOURS` reste affichée en historique (`PHASES_RETIREES`). Le code `32_VISA_CNOA` est conservé, son titre est « Visa de l'ordre régional compétent ».
- **Dégradation** : sans `docs/sql/gestion-projet-neon.sql`, les pièces s'affichent toutes « Document manquant » en lecture seule, le dépôt répond `sql_a_coller`, le déblocage fonctionne (motif au journal), les échéances et la frise marchent (aucune table nouvelle pour eux : `Dossier.payload.gestion`).

## Données dans `Dossier.payload.gestion` (aucune table)

`profil` (type, budgetMDH, étages, sous-sols, m², équipements, `activer`), `dates` (début des fondations, ouverture, réceptions, assurances, cautions, autres), `rappels` (`"<échéance>|<date>": [90, 30, 7]` déjà envoyés), `phaseRef` (phase P.. suivie par l'espace projet).

## Tâche planifiée des rappels

Les rappels partent à l'ouverture de `/cc/dashboard` (une fois par jour) et par le bouton. Pour un envoi chaque matin sans ouvrir le tableau de bord : définir `TACHES_SECRET` (≥ 32 caractères) dans Cloudflare Pages, puis faire appeler chaque jour `POST https://<site>/api/taches/rappels` avec l'en-tête `x-tache-secret: <TACHES_SECRET>` (Worker Cloudflare avec déclencheur planifié, ou service de cron). Destinataires : `LEAD_NOTIFY_TO` ; envoi : `RESEND_API_KEY`.

## Rattachement des checklists aux jalons

`RATTACHEMENT_CHECKLISTS` (dans `checklists.ts`) : `offres` = phases du catalogue où le PV se remplit, `arrets` = jalons porte qui l'exigent. Une checklist ajoutée au référentiel sans entrée dans ce tableau n'est proposée nulle part : ajouter sa ligne.

## Décisions du fondateur du 15/10/2026 (priment sur le référentiel)

- **Pièces graphiques ESQ / APS / APD / EXE** (`apps/web/src/features/gestion/GaleriePlans.tsx`, `packages/contracts/src/gestion/plans.ts`) : galerie par phase, catégorie (situation et masse, plans d'étage par niveau, coupes, façades par orientation, vues 3D, détails, vidéos, notices) et niveau ; visionneuse (zoom, PDF dans la page, vidéo). Fichiers : dépôt commun (contexte `dossier`, `brouillon: true` puis publication par `moderer → VISIBLE`) ; nom fixé par la case → versions numérotées par le service. Vidéos sans R2 : liens YouTube / Vimeo dans `payload.gestion.videos` (actions `video_ajouter`, `video_publier` de la fiche) ; avec R2, envoi de fichiers vidéo en morceaux (bascule automatique).
- **DEXE en parallèle de l'instruction** : `40_DOSSIER_EXECUTION` dépend du dépôt (`30`) ; `54_ATTRIBUTION_MARCHE` et `80_OUVERTURE_CHANTIER` dépendent du permis (`34`). Fiche et frise client affichent le DEXE « en cours en parallèle » dès le dépôt.
- **Mise à jour du DEXE suite au permis** (`packages/contracts/src/gestion/majDexe.ts`, `payload.gestion.majDexe`) : ouverte automatiquement par une nouvelle version d'une pièce P04 (`dossierPieces.ts`) ou par l'action `revision_permis` ; journal des écarts, pièces P05 déjà déposées « à reprendre » (badge dans « Documents par phase »), clôture `maj_dexe_cloturer` ; étape `GP_MAJ_DEXE` dans le parcours.
- **Phase démarrée après paiement** (`functions/_lib/gestionPhases.ts` → `etatPaiementPhasesDossier` de la session Devis & facturation) : une phase `bloquante` est « En attente de paiement » ; refus `409 phase_en_attente_paiement` pour la mettre en cours (fiche), pour y avancer la phase du dossier (synchronisation) et pour démarrer ou valider ses jalons (espace projet). Déblocage motivé : `POST /api/cc/dossiers/<id>/facturation { action: "debloquer", phase, motif }` (bouton dans l'en-tête de la phase). Fiche : devis, factures, statut, date de démarrage réelle par phase. Client : statut de paiement par phase, date de démarrage, prochaine échéance (ses propres factures). Tables de facturation absentes : rien n'est bloqué.

## Lot GP6 — l'étape = une page entière (fondateur, 16/10/2026)

- **Page d'étape admin** `/cc/dossiers/:id/etapes/:code` (`PageEtape.tsx`) ; le parcours A → Z de la fiche reste le sommaire (lien « Ouvrir la page » sur chaque ligne). Serveur : `GET|PATCH /api/cc/dossiers/:id/etapes/:code` (`functions/_lib/etapeDossier.ts`, `packages/contracts/src/gestion/etape.ts`).
  - En-tête : statut (déblocage avec motif), dates prévues (saisies) et réelles, démarrage de la phase (paiement), responsable ; bloc paiement de la phase.
  - Documents de l'étape (`DocumentsParPhase`, `seulementPhase`), pièces graphiques (`GaleriePlans`, `phaseUnique`) pour les études, checklists et PV (espace projet) pour le chantier.
  - « Relancer le client » : message prérempli (`EcrireMessage.texteInitial`) avec les pièces du client encore manquantes.
  - Intervenants : pros Cercles validés (`Fournisseur`, statut APPROVED), aucune coordonnée affichée ; un prestataire rejoint l'espace projet du dossier avec son rôle (`roleProjetDuMetier`), lien d'accès rendu à l'admin seulement ; message et appel vidéo par la plateforme (contexte `dossier`, objetId `<dossier>:<étape>`). Stockage : `payload.gestion.etapes[code].intervenants`.
  - Matériaux : carnet commun `DossierMateriau` de la session Matériauthèque (`docs/architecture/contrat-carnet-materiaux.md`) : `GET …/materiaux?etape=`, prescription `POST { code, etapeCode }` (ligne VALIDE), validation ou refus `PATCH`, recherche `/api/materiaux/recherche` ; le client propose depuis la matériauthèque à partir de l'APD.
  - Journal de l'étape (événements du code, de ses pièces, de sa phase) et échanges.
- **Page d'étape client** dans `/mon-espace` : une phase de la frise ouvre `EtapeClient.tsx` (`GET /api/client/dossiers/:id/etapes/:code`, une phase P.. ouvre sa première étape) : documents à déposer, plans publiés, intervenants (nom, rôle), matériaux dès l'APD, message et appel vidéo.
- **Un seul endroit pour le dossier et ses échanges** (`functions/_lib/dossierEchanges.ts`, `GET /api/cc/dossiers/:id/echanges`, onglet Échanges de la fiche) : RDV, appels vidéo (contexte `dossier`, `dossier:étape` ou `rdv` d'un RDV du dossier, ou client participant) et messages. Un RDV réutilise le dossier ouvert du client (`dossierOuvertDuClient`) ; une demande de porte complète le dossier ouvert par un RDV récent (`completerDossier`) ; les RDV orphelins du même compte ou téléphone sont rattachés (`rattacherRendezVous`), automatiquement seulement si le client n'a qu'un dossier ouvert.
- **Un seul accès client** (`functions/_lib/projetsClient.ts`) : `GET /api/client/projets`, `POST /api/client/projets/:id/ouvrir` pose la session de l'espace projet pour le membre « client » du projet (réutilisé ou créé) ; bouton « Ouvrir l'espace chantier » dans `/mon-espace`. Les liens `/projet/<jeton>` déjà envoyés restent valables.
