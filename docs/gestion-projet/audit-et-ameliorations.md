# Audit de l'existant et propositions — faire de CITURBAREA un vrai logiciel de gestion de projets de construction

**Version du 15 octobre 2026 — branche `feat/backoffice-leads-local` (dernier commit lu : `375b00d`).**
Document compagnon de `docs/gestion-projet/referentiel-phases.md` (le référentiel) et de `referentiel-phases.json` (les mêmes données pour le logiciel). Aucun code n'a été modifié, aucune table créée.

---

## En bref (pour le fondateur)

CITURBAREA possède déjà **beaucoup plus de matière qu'un logiciel de chantier ordinaire** : un catalogue de 49 phases et 20 lots, un référentiel technique de 406 jalons avec 77 points d'arrêt, 371 exigences tirées des normes et 98 modèles de PV, un espace projet en production (jalons, photos, discussion, PV signés en ligne, journal), un moteur de chiffrage à trois niveaux de précision, un générateur de CPS et un planning d'achat des matériaux.

Ce qui manque n'est pas le contenu technique, c'est **la colonne vertébrale de pilotage** :

1. **Pas de dates** : aucun jalon n'a de date prévue ni réelle. Il n'y a donc ni planning, ni retard mesuré, ni rappel d'échéance (sauf l'expiration de l'autorisation).
2. **Pas de suivi d'argent du chantier** : ni budget prévu, engagé ou payé, ni situations de travaux, ni retenue de garantie.
3. **Pas de liste « documents à fournir » avec un statut** (attendu, déposé, validé, refusé). Les documents existants sont des PV à remplir, pas les pièces à collecter (titre foncier, note de renseignements, permis, attestations…).
4. **Deux suivis d'avancement qui ne se parlent pas** : la phase du dossier (`DossierEtape`) et les jalons de l'espace projet (`ProjetJalon`). Le client voit sur `/mon-dossier` les « 5 prochaines phases générales », pas l'avancement réel de son chantier.
5. **Sept façons différentes de nommer les phases** et quatre de nommer les lots selon les modules, avec quelques étapes du catalogue qui peuvent **bloquer à tort** un projet (visa « CNOA », purge du recours, raccordements avant permis d'habiter, toutes les réserves levées avant le permis d'habiter).

La feuille de route (section 4) propose **14 lots d'une à deux semaines**, sans nouvelle infrastructure : tout tient dans les Pages Functions, Neon et le stockage R2 déjà en place.

---

## 1. Ce qui existe aujourd'hui

| Brique | Où | État | Ce qu'elle fait |
|---|---|---|---|
| Catalogue des phases | `packages/contracts/src/phases.catalog.ts` | vivant (source des codes) | 49 phases fixes de `00_BRIEF` à `97_RECEPTION_DEFINITIVE`, 20 lots de second œuvre, phases répétées par niveau (`85_SOUS_SOL_n`, `86_PLANCHER_Rn`), acteurs, validateurs, prérequis, documents attendus (libellé + format), branches conditionnelles (lotissement, incendie, ascenseur, financement…), drapeau `paiementMilestone`. |
| Référentiel des jalons | `apps/web/src/domain/referentiel/` (4 fichiers JSON, 1,5 Mo, version 1.0.0 du 13/10/2026) | vivant | 406 jalons dont 77 points d'arrêt, 371 exigences reformulées, 137 normes et textes (avec statut « vérifié »), 98 modèles de documents (PV, fiches, formulaires), conditions (type, sous-sol, ascenseur, piscine, ERP). |
| Espace projet | tables `Projet*` (`docs/sql/espace-projet-neon.sql`), `functions/_lib/projets.ts`, `projetsApi.ts`, `projetsNeon.ts`, routes `/api/projets/*` et `/api/cc/projets/*`, écrans `apps/web/src/features/projet/` et `/cc/projets` | en production | Jalons figés à la création, statuts (`A_FAIRE`, `EN_COURS`, `EN_ATTENTE_VALIDATION`, `VALIDE`, `BLOQUE`, `SANS_OBJET`), checklist cochée avec preuves, **points d'arrêt bloquants côté serveur** (`verifierTransition`), discussion par jalon, photos et fichiers (R2), PV types remplis et signés par rôle, salle visio par jalon, journal append-only, membres invités par lien. |
| Dossier créé par l'admin | `DossierEtape`, `DossierEvenement` (`docs/sql/devis-facturation-neon.sql`), `functions/_lib/dossierAdmin.ts`, `/cc/dossiers/nouveau`, `/mon-dossier/<jeton>` | branche en cours | Phase actuelle, étapes antérieures « faites hors plateforme », missions déjà réglées, alerte d'autorisation à J−90, invitation du client sans coordonnées. |
| Honoraires | `apps/web/src/domain/honoraires/` | branche en cours | Missions `HON_CONCEPTION` (40 %), `HON_AUTORISATION` (30 %), `HON_CHANTIER` (30 %), `HON_DECO`, prestations `BA`, `GEOTECH`, `TOPO`, `CTRL_BET`, forfaits (renouvellement, permis d'habiter, modificatif, conformité, régularisation), packs Essentiel / Personnalisé / Premium. |
| Chiffrage | `apps/web/src/domain/chiffrage/`, grille `apps/web/src/domain/prix/grille2026.ts` | vivant (local) | 22 lots (`INS` … `EXT`), métré par niveau, DQE, **trois niveaux de précision** (ratios ± 15-20 %, paramétrique ± 8-10 %, quantités saisies ± 3-5 %), aide à la décision budgétaire. |
| CPS | `apps/web/src/domain/cps/` (vivant) + gabarits `apps/api/data/cps-templates/` (données) | vivant | 23 gabarits de lots, 3 types de projets, bordereau aligné sur le DQE, clauses de marché privé corrigées après contre-audit (`clausesPrive.ts`). |
| Matériaux par phase | `apps/web/src/domain/materiaux/phases.ts`, `planning.ts`, `/materiaux/planning` | vivant (outil public) | 6 phases d'étude, 16 phases de réalisation avec calendrier indicatif, planning d'achat (dates limites de commande, budget fournitures). Non relié à un projet réel. |
| Anciennes briques | `command-center/modules/dossiers/DossierPhaseTimeline.tsx`, `ProjectMilestonesTimeline.tsx`, `PhaseWorkspace.tsx`, `theme/tokens.ts` (`PHASE_META`), `domain/p1.machine.ts`, modèles Prisma `DossierPhaseRecord`, `RokhasPhaseHistory`… | en sommeil (appels vers l'API éteinte) | À ne pas réveiller : l'espace projet les remplace (`docs/architecture/plan-rebranchement.md`). |

---

## 2. Couverture par rapport au référentiel

Légende : ✅ couvert, 🟡 partiel, ❌ absent.

| Phase du référentiel | Couverture | Commentaire |
|---|---|---|
| P00 Idée, programme, contrat | 🟡 | Lead, rendez-vous vidéo, devis d'honoraires et packs existent. Pas de « programme signé » structuré ni de contrat d'architecte généré ; jalon `00_BRIEF.GEN.04` (contrat signé) bien présent. |
| P01 Foncier, faisabilité | 🟡 | Jalons présents (01, 02, 04, 08). Le certificat de propriété et la note de renseignements ne sont que des points de checklist : pas de pièce attendue avec statut ni date de validité. Le délai réglementaire de 2 jours ouvrables de la note n'est pas connu du logiciel. |
| P02 Esquisse, APS | 🟡 | Jalons présents ; pas de validation client horodatée liée à une version de plans ; l'estimation de niveau 2 n'est pas enregistrée dans le projet. |
| P03 APD, études | 🟡 | Jalons présents (APD, mandats BET et contrôle, incendie) ; la note RTCM et la notice incendie existent comme exigences mais pas comme pièces à déposer. |
| P04 Autorisation | 🟡 | Jalons 30 à 36, bordereau des pièces, fiche de suivi d'instruction, alerte J−90 sur l'expiration. **Manquent** : numéro Rokhas, dates de dépôt et de délivrance, calcul de la péremption (fondations non commencées un an après), suivi des observations. |
| P05 Études d'exécution | ✅ | 42 jalons très détaillés (structure, fluides, détails, synthèse). Pas de lien vers une maquette BIM. |
| P06 Consultation, marchés | 🟡 | Jalons, tableau comparatif, contrôle des assurances ; CPS et DQE générés. **Manquent** : consultation des entreprises par la plateforme, montant du marché enregistré, cautions et polices avec dates d'expiration. |
| P07 Préparation | ✅ | Ordre de service, déclaration d'ouverture, cahier de chantier, réunion de démarrage, implantation (points d'arrêt). Manque le planning d'exécution exploitable. |
| P08–P09 Gros œuvre | ✅ | Point fort : réception des fonds de fouille, armatures avant coulage, essais, par niveau. Les résultats d'essais ne sont pas des données (pas d'alerte si résistance insuffisante). |
| P10 Second œuvre | 🟡 | Jalons par lot et PV d'essais ; pas de validation des échantillons reliée à la matériauthèque ni de commande par phase reliée au projet. |
| P11 Réception provisoire | 🟡 | PV de réception et de levée des réserves (modèles) ; **les réserves ne sont pas des objets suivis** (numéro, photo, délai, responsable, statut). DOE : fiche sommaire seulement. |
| P12 Conformité, permis d'habiter | 🟡 | Jalons 95, 96 ; pas d'éclatement des titres pour un immeuble (seulement `29D` pour le lotissement) ; ordre des étapes discutable (voir 3.2). |
| P13 Garantie, réception définitive | 🟡 | Jalon 97 et modèles ; aucun rappel automatique à 11-12 mois ; retenue de garantie et cautions non suivies en montant. |
| P14 Décennale, vie de l'ouvrage | ❌ | Rien après la réception définitive : pas de carnet d'entretien, pas de rappel décennal, pas d'archive exportable. |
| Processus transversaux | 🟡 | Comptes rendus de réunion (modèle), ordres de service, attachements, situations, avenants (modèles de documents). **Manquent** : journal quotidien, actions de réunion suivies, situations chiffrées, photos hebdomadaires organisées. |
| Lotissement | 🟡 | Branche du catalogue (28, 29, 29B-D) ; loi 34-21 (validité graduée de l'autorisation de lotir) non prise en compte. |
| Rénovation, extension | ❌ | Aucun type de projet « rénovation » dans l'espace projet ; seul le permis de démolir existe. Permis de réfection, modificatif et régularisation absents du catalogue (présents seulement comme forfaits d'honoraires). |

---

## 3. Incohérences et risques relevés

### 3.1 Vocabulaires différents pour la même chose

| Sujet | Variantes trouvées | Conséquence |
|---|---|---|
| **Phases** | (1) codes du catalogue `00_BRIEF`… ; (2) `PHASE_00_BRIEF`… dans `theme/tokens.ts` (12 phases) ; (3) `PHASE_01_ESQUISSE`… dans `PhaseWorkspace.tsx` ; (4) états `E0`–`E12` de `domain/p1.machine.ts` ; (5) 6 phases d'étude et 16 phases de réalisation dans `domain/materiaux/phases.ts` ; (6) libellés libres des gabarits CPS (`APD_PRET_DEPOT_PERMIS`, `EXE_AVANT_COULAGE`…) ; (7) numéro entier de phase Rokhas (Prisma). | Impossible de produire une seule frise, un seul tableau de bord ou un seul planning. Les trois premières sont en sommeil, mais le code reste. |
| **Statuts** | `ProjetJalon` (`A_FAIRE`…`SANS_OBJET`) ; `DossierEtape` (`FAITE_HORS_PLATEFORME`, `SANS_OBJET`, `EN_COURS`) ; catalogue `PhaseStatus` (`NOT_STARTED`, `WAITING_CLIENT`…, en anglais, inutilisé) ; anciens écrans (`IN_PROGRESS`, `DONE`…). | Un même jalon peut être « fait » dans un module et « à faire » dans l'autre. |
| **Rôles** | Espace projet : 14 rôles ; catalogue : 23 acteurs. `COORDINATEUR_SPS` contre `COORDONNATEUR_SPS` (orthographe) ; `ENTREPRISE` contre `ENTREPRISE_GO` / `ENTREPRISE_LOT` ; OPC, BET VRD, conservation foncière, distributeur, fournisseur absents de l'espace projet ; assureur et banque absents partout. | On ne peut pas inviter un OPC ou un distributeur dans l'espace projet ; les validateurs du catalogue ne se transposent pas tels quels. |
| **Type de projet** | Espace projet : `VILLA, MAISON, IMMEUBLE, MIXTE, ERP, LOTISSEMENT` ; dossier : `MAISON_INDIVIDUELLE, IMMEUBLE, VILLA, LOCAL_COMMERCIAL, AMENAGEMENT_INTERIEUR` ; CPS : `VILLA_R1_HS, IMMEUBLE_COLLECTIF_R_PLUS_N, LOTISSEMENT` ; drapeaux du catalogue (`DossierFlags`) différents des conditions du référentiel. | Créer l'espace projet depuis un dossier oblige à ressaisir les caractéristiques ; aucun type « rénovation ». |
| **Lots** | Chiffrage (22 codes `INS`…`EXT`), CPS (`LOT_00`…`LOT_26`), catalogue (`LOT_MACONNERIE`…), matériaux (phases de réalisation). Une table de correspondance existe pour le chiffrage (`lots.ts`) mais pas pour les autres. Les types CPS citent `LOT_22_SSI_DESENFUMAGE`, `LOT_23_ASCENSEUR`, `LOT_24_DOMOTIQUE`, `LOT_25_PHOTOVOLTAIQUE`, **qui n'ont pas de fichier** ; la piscine n'a ni lot CPS ni lot de chiffrage propre. Le README des gabarits annonce 15 types de projets et un dossier `normes/` qui n'existent pas. | Le budget par lot du chiffrage ne peut pas devenir automatiquement le budget par lot du marché, ni les situations. |
| **Zones sismiques** | Gabarits CPS : `Z1`–`Z5` (`defaultZoneSismique: "Z2"`) ; espace projet et référentiel : 0 à 4. | Risque d'erreur de zone lors de la génération du CPS depuis un projet. |

### 3.2 Étapes du catalogue qui peuvent bloquer à tort ou induire en erreur

1. **`32_VISA_CNOA`** est un prérequis de `34_PERMIS_CONSTRUIRE`. Aucun texte lu n'impose un visa ordinal du dossier (à vérifier), et « CNOA » est le sigle de l'Ordre français ; les gabarits CPS parlent de « VISA_CROA » avec un « délai légal de 15 jours » non vérifié. Tant que ce visa n'est pas confirmé, il doit pouvoir être marqué « sans objet » sans bloquer.
2. **`36_AFFICHAGE_RECOURS`** (« purge du délai de recours », constat d'huissier) reprend une notion française. Le panneau de chantier est bien obligatoire (loi 66-12), la « purge » n'est pas une étape réglementaire identifiée au Maroc.
3. **Raccordements définitifs avant le permis d'habiter** (`95B` bloque `96`) : en pratique, les distributeurs demandent le permis d'habiter pour l'abonnement définitif. L'ordre est probablement inversé (à vérifier auprès de Redal / de la société régionale de Rabat-Salé-Kénitra).
4. **`94_LEVEE_RESERVES` prérequis de la conformité et du permis d'habiter** : la levée des réserves est contractuelle (client et entreprise), le permis d'habiter est administratif. Une réserve mineure (une poignée à changer) ne doit pas retarder le permis d'habiter.
5. **Bureau de contrôle fixe et obligatoire** (`18`, `42`) : c'est un choix de qualité défendable, mais la loi ne l'impose pas en général. Pour une petite villa, il faut pouvoir le déclarer sans objet sans fausser le parcours. Ne pas le confondre avec la prestation `CTRL_BET` (visites du bureau d'études).
6. **Assurances dans les gabarits CPS** : le type « villa » affirme que la TRC « conditionne le permis de construire » et que la décennale est obligatoire. Depuis le 30/12/2024, l'obligation ne vise que les bâtiments au-dessus des seuils (habitation de plus de 3 étages ou de plus de 800 m²…). `clausesPrive.ts` a déjà corrigé le générateur, mais les données `apps/api/data/cps-templates/project-types/*.json`, déclarées « encore valables », portent toujours l'ancienne affirmation.
7. **Permis d'habiter partiel** : la spécification Devis cite un permis d'habiter partiel (cas de recette) et le forfait `PERMIS_HABITER` prévoit « total ou partiel » ; selon la presse, le ministère de l'Intérieur demande de ne plus en délivrer. À vérifier avant de le vendre.
8. **Durée de chantier d'une villa** : 12 mois dans le chiffrage (`dqe.ts`, `dureeMois`), environ 33 semaines dans le calendrier des matériaux (`materiaux/phases.ts`), 540 jours dans le gabarit CPS villa. Le référentiel retient 10 à 14 mois pour une villa R+1 avec sous-sol. Il faut une seule source.
9. **Décret 2-13-424** : n'apparaît plus dans le référentiel des jalons (remplacé par le 2-18-577, à juste titre), mais la demande initiale et certains textes marketing peuvent encore le citer. Vérifier les pages publiques et les guides.
10. **Article 770 du DOC** : la recherche web de cette session trouve des sources selon lesquelles l'action décennale doit être engagée dans les 30 jours, alors que le contre-audit du 10/10/2026 (`clausesPrive.ts`) a retiré ce délai. Le point doit être tranché par un juriste.

### 3.3 Écarts avec la règle « aucune coordonnée échangée »

- **Discussion de l'espace projet** (`ProjetMessage`, `posterMessage` dans `functions/_lib/projetsApi.ts`) : les messages ne passent pas par le moteur commun de masquage (`functions/_lib/coordonnees.ts`), contrairement à la messagerie et au catalogue. Un membre peut y écrire un numéro de téléphone que le client lira. **C'est le seul écart actif trouvé.**
- Les noms de fichiers et les PV types (champs texte libres) ne sont pas non plus contrôlés.
- La liste des membres montre le nom et la raison sociale de l'entreprise à tous (sans coordonnées) : acceptable, mais à garder en tête (recherche possible hors plateforme).
- **Devis et factures du cabinet** : la table `Cabinet` et le gabarit de devis portent le téléphone et l'e-mail de l'architecte, affichés au client. C'est cohérent avec un devis légal (mentions de l'émetteur) mais contraire à la lettre de la règle (« seules les coordonnées de CITURBAREA / HSE DECO sont publiques »). **À arbitrer par le fondateur.**
- Le référentiel proposé respecte la règle : pièces d'identité, attestations CNSS, registres de commerce et coordonnées sont marquées « back-office uniquement », et les intervenants sont désignés par leur rôle.

### 3.4 Manques structurels

| Manque | Pourquoi c'est grave |
|---|---|
| Pas de dates prévues ni réelles sur les jalons | Pas de planning, pas de retard mesurable, pas de chemin critique, pas de rappel. |
| Pas de documents attendus avec statut | On ne sait pas ce qui manque pour déposer le permis ou demander le permis d'habiter ; `DossierEtape.documentIds` existe mais n'est pas utilisé. |
| Pas de suivi financier du chantier | Le client ne voit ni budget engagé, ni montant payé, ni reste à payer ; aucune retenue de garantie n'est calculée. |
| Réserves non structurées | Impossible de relancer une entreprise réserve par réserve ou de prouver un délai dépassé. |
| Rappels limités à l'autorisation | Péremption du permis, fin de la garantie d'un an, cautions, assurances et décennale ne sont pas suivies. Les Pages Functions n'ont pas de tâche planifiée : les alertes actuelles sont calculées à la lecture. |
| Dossier et espace projet séparés | La phase du dossier n'est pas mise à jour quand un jalon est validé ; le client voit deux réalités. |
| Honoraires non reliés aux jalons | La spécification demande que « chaque prestation acceptée devienne une étape suivie » (§8.5) : aucune correspondance mission → jalon n'existe ; le drapeau `paiementMilestone` du catalogue n'est pas utilisé. |
| Estimation figée | Les estimations successives (niveau 1 à 3) ne sont pas mémorisées dans le projet ; on ne montre pas au client comment le prix se resserre. |
| Tableau de bord multi-projets | `/cc/projets` affiche seulement le nombre de jalons validés ; `/cc/dashboard` est en sommeil. |

---

## 4. Propositions et feuille de route

### 4.1 Principes

- **Une colonne vertébrale, des détails.** Les 15 phases du référentiel (`P00`…`P14`) servent à tout ce qui est vu de loin : frise client, tableau de bord, planning général, finances, rappels. Le catalogue et ses 406 jalons techniques restent la source des checklists de chantier. Chaque code du catalogue est rattaché à une phase `P..` (champ `correspondances.catalogue` du JSON).
- **Rien de lourd.** Pages Functions, Neon, R2, e-mails par Resend (déjà utilisé). Pour les rappels quotidiens : un petit Worker Cloudflare avec déclencheur planifié (Cron Trigger) qui appelle une Function protégée, ou à défaut le calcul à la lecture déjà utilisé pour l'alerte J−90.
- **Tables Neon** : jamais créées par le code ; le SQL est fourni à coller (`docs/sql/…`, ajouté à `TOUT-NEON.sql`).
- **Aucune coordonnée** : tout nouveau texte libre (journal, réserve, message, PV) passe par `functions/_lib/coordonnees.ts`.
- **Estimation qui se resserre** : chaque projet garde l'historique de ses estimations (niveau 1 → 7) et le client voit la fourchette du moment, jamais un chiffre d'esquisse présenté comme un prix.

### 4.2 Tableau impact / effort

| # | Proposition | Impact client | Impact cabinet | Effort |
|---|---|---|---|---|
| GP1 | Référentiel unique + corrections des étapes bloquantes | moyen | fort | S |
| GP2 | Checklist documentaire par jalon (attendu / déposé / validé / refusé) | fort | fort | M |
| GP3 | Points d'arrêt déblocables par l'admin avec motif | moyen | fort | S |
| GP4 | Échéances et rappels (permis, assurances, cautions, garanties) | fort | fort | S |
| GP5 | Dossier et espace projet synchronisés, vue client simple | fort | moyen | M |
| GP6 | Planning Gantt et chemin critique | fort | fort | M |
| GP7 | Réserves structurées (réception et année de garantie) | fort | fort | S |
| GP8 | Suivi financier : budget prévu / engagé / payé, situations, retenues, avenants | fort | fort | M-L |
| GP9 | Journal de chantier, actions de réunion, masquage des coordonnées | moyen | fort | M |
| GP10 | Tableau de bord multi-projets du cabinet | faible | fort | S |
| GP11 | Honoraires reliés aux jalons (facture proposée à la validation) | moyen | fort | S |
| GP12 | Historique des estimations (entonnoir de précision) | fort | moyen | S |
| GP13 | Parcours rénovation et lotissement mis à jour | moyen | moyen | S |
| GP14 | Maquette numérique (BIM / Revit) en phase exécution et DOE | faible | moyen | M |

S = une semaine, M = deux semaines, L = plus de deux semaines (à découper).

### 4.3 Les lots, dans l'ordre recommandé

#### Lot GP1 — Référentiel unique et corrections bloquantes (1 semaine)
- **But** : un seul jeu de phases pour tout le logiciel, sans casser l'existant.
- **Contenu** :
  - module `packages/contracts/src/referentielPhases.ts` qui lit `docs/gestion-projet/referentiel-phases.json` (ou une copie dans `packages/contracts/data/`) et expose phases, jalons, documents, durées et la correspondance catalogue → `P..` ;
  - tests : chaque code de `phases.catalog.ts`, chaque phase des jalons du référentiel, chaque `PhaseReal` des matériaux et chaque lot du chiffrage et du CPS a une correspondance ;
  - alias de rôles (`COORDINATEUR_SPS` = `COORDONNATEUR_SPS`, `ENTREPRISE` = `ENTREPRISE_GO`/`ENTREPRISE_LOT`) et ajout des rôles `OPC`, `BET_VRD`, `CONCESSIONNAIRE`, `FOURNISSEUR`, `ASSUREUR` dans `apps/web/src/domain/referentiel/types.ts` ;
  - table de correspondance des types de projet (dossier, espace projet, CPS, chiffrage) et ajout de `RENOVATION_EXTENSION` ;
  - corrections du catalogue (3.2) : `32_VISA_CNOA` renommé « visa ordinal (si exigé) » et rendu non bloquant ; `36_AFFICHAGE_RECOURS` réduit au panneau ; ordre raccordements / permis d'habiter à confirmer ; `94` retiré des prérequis de `95/96` ;
  - une seule durée de chantier de référence (celle du JSON), réutilisée par `dqe.ts` et `materiaux/phases.ts`.
- **Fichiers** : `packages/contracts/src/phases.catalog.ts`, `apps/web/src/domain/referentiel/types.ts`, `apps/web/src/domain/materiaux/phases.ts`, `apps/web/src/domain/chiffrage/dqe.ts`, nouveaux tests. **Tables** : aucune.
- **Attention** : un projet existant garde son instantané figé (`ProjetJalon.definition`) ; seuls les nouveaux projets profitent des corrections.

#### Lot GP2 — Checklist documentaire par jalon (2 semaines)
- **But** : savoir à tout moment quelles pièces manquent, qui doit les fournir et qui les valide.
- **Contenu** :
  - nouvelle table `ProjetDocumentAttendu` (projet, jalon, code du document, statut `ATTENDU` / `DEPOSE` / `VALIDE` / `REFUSE` / `SANS_OBJET` / `FAIT_HORS_PLATEFORME`, fichiers, producteur, validateur, motif de refus, échéance, date de validité de la pièce), générée depuis le JSON à la création du projet selon les conditions ;
  - dépôt d'un fichier depuis le jalon, validation ou refus motivé par le seul rôle validateur ;
  - un jalon point d'arrêt ne peut passer à `VALIDE` que si ses documents obligatoires sont validés ;
  - vue « pièces manquantes » par projet pour l'admin ;
  - contrôle des coordonnées sur les noms de fichiers.
- **Fichiers** : `functions/_lib/projets.ts`, `projetsApi.ts`, `projetsNeon.ts`, `apps/web/src/features/projet/PageJalon.tsx`, `Documents.tsx`, `features/projet/generation.ts`. **Tables** : `ProjetDocumentAttendu` (nouveau SQL `docs/sql/gestion-projet-neon.sql`).

#### Lot GP3 — Points d'arrêt déblocables avec motif (1 semaine, peut suivre GP2 dans la même quinzaine)
- **But** : bloquer pour de vrai, sans paralyser un chantier quand la preuve existe hors plateforme.
- **Contenu** : statut `DEBLOQUE_ADMIN` (ou champ `deblocage {par, le, motif}`) sur `ProjetJalon`, motif obligatoire, journalisé dans `ProjetEvenement` et visible du client ; même logique pour `DossierEtape` (statut `DEBLOQUEE` déjà prévu par le contrat Devis) ; badge « débloqué » dans la vue.
- **Fichiers** : `functions/_lib/projets.ts` (`verifierTransition`, `pointsArretBloquants`), `projetsApi.ts`, `VueProjet.tsx`, `PageJalon.tsx`. **Tables** : `ALTER TABLE "ProjetJalon" ADD COLUMN "deblocage" JSONB`.

#### Lot GP4 — Échéances et rappels (1 semaine)
- **But** : ne plus jamais laisser périmer un permis, expirer une assurance ou passer la fin d'une garantie sans le savoir.
- **Contenu** :
  - table `ProjetEcheance` (type, date, source, statut, dernier rappel) remplie automatiquement par les dates saisies :
    - permis + 1 an (fondations à commencer) ;
    - permis de réfection ou de démolir + 6 mois ;
    - fin de la police TRC ;
    - validité des cautions ;
    - réception provisoire + 12 mois (réception définitive) ;
    - réception + 10 ans (décennale) ;
    - validité de l'autorisation de lotir selon la loi 34-21 ;
  - rappels à J−90, J−30 et J−7 par e-mail (Resend) au cabinet et au client, sans coordonnées de tiers dans le contenu ;
  - extension de `/api/cc/dossiers/alertes-autorisation` en `/api/cc/echeances` ;
  - Worker planifié quotidien, ou calcul à la lecture en attendant.
- **Fichiers** : nouveaux `functions/_lib/echeances.ts`, `functions/api/cc/echeances.ts` ; `AlertesAutorisation.tsx` élargi. **Tables** : `ProjetEcheance`.

#### Lot GP5 — Dossier et espace projet synchronisés, vue client simple (2 semaines)
- **But** : une seule vérité d'avancement, lisible par le client sur son téléphone.
- **Contenu** :
  - quand un jalon est validé, la phase `P..` correspondante et `Dossier.phase` sont recalculées, avec une ligne dans `DossierEvenement` ;
  - à la création de l'espace projet depuis un dossier, les étapes « faites hors plateforme » deviennent des jalons `FAIT_HORS_PLATEFORME` ;
  - `/mon-dossier` affiche la frise des 15 phases (FR/AR) avec, pour la phase en cours : ce qui est fait, ce qui est attendu du client (documents, choix, signatures), la prochaine échéance, l'estimation du moment.
- **Fichiers** : `functions/_lib/projetsApi.ts`, `functions/_lib/dossierAdmin.ts`, `functions/api/mon-dossier/[jeton].ts`, page client `MonDossierPage`. **Tables** : `ALTER TABLE "DossierEtape" ADD COLUMN "phaseRef" TEXT` (code `P..`) si utile.

#### Lot GP6 — Planning Gantt et chemin critique (2 semaines)
- **Contenu** :
  - colonnes `datePrevueDebut`, `datePrevueFin`, `dateReelleDebut`, `dateReelleFin`, `dureeJours` sur `ProjetJalon` ;
  - durées par défaut tirées du JSON (villa / immeuble), ajustées au nombre de niveaux comme le calendrier des matériaux ;
  - calcul du chemin critique en fonction pure (passes avant et arrière sur les prérequis existants), avec tests ;
  - planning de référence figé à l'ordre de service, comparé au réel ;
  - diagramme dessiné en SVG maison (sans bibliothèque lourde), vue mois et vue semaine ;
  - le planning d'achat des matériaux est recalé sur les dates réelles du projet.
- **Fichiers** : nouveau `apps/web/src/domain/planning/cpm.ts` (+ tests), `apps/web/src/features/projet/Planning.tsx`, `projetsApi.ts` (modification des dates), `domain/materiaux/planning.ts`. **Tables** : `ALTER TABLE "ProjetJalon"` (dates).

#### Lot GP7 — Réserves structurées (1 semaine)
- **Contenu** :
  - table `ProjetReserve` : numéro, jalon, lot, localisation, description, photos avant et après, rôle responsable, délai, statut (`OUVERTE`, `LEVEE`, `CONTESTEE`), origine (`OPR`, `RECEPTION`, `GARANTIE`) ;
  - PV de réception et de levée générés depuis la liste ;
  - le client signale un désordre pendant l'année de garantie avec photo ;
  - relance automatique de l'entreprise à l'échéance (GP4).
- **Fichiers** : `projetsApi.ts`, nouveau `features/projet/Reserves.tsx`. **Tables** : `ProjetReserve`.

#### Lot GP8 — Suivi financier du chantier (2 semaines, puis une semaine de finitions)
- **Contenu** :
  - budget par lot à chaque niveau d'estimation ;
  - marché(s) et avenants (engagé) ;
  - situations de travaux : numéro, période, cumul, avance, retenue de garantie de 10 % plafonnée à 7 % (paramétrable), pénalités, net à payer, visa de l'architecte, paiement ;
  - vue prévu / engagé / payé par lot et courbe d'avancement financier comparée à l'avancement physique ;
  - calculs en décimal exact (`apps/web/src/domain/honoraires/decimal.ts`), montants en `NUMERIC(14,2)`.
- Les honoraires du cabinet restent dans les tables Devis / Facture prévues par la session Devis : ne pas mélanger.
- **Fichiers** : nouveau `apps/web/src/domain/finances/` (+ tests), `functions/_lib/projetsFinances.ts`, `features/projet/Finances.tsx`. **Tables** : `ProjetBudgetLigne`, `ProjetMarche`, `ProjetAvenant`, `ProjetSituation`, `ProjetPaiement`.

#### Lot GP9 — Journal de chantier, actions de réunion, masquage (2 semaines)
- **Contenu** :
  - journal quotidien sur mobile : météo, effectifs par rôle, livraisons, incidents, photos ;
  - comptes rendus de réunion dont les actions (rôle responsable, date) alimentent une liste « actions ouvertes » ;
  - **masquage des coordonnées dans `ProjetMessage`**, le journal et les champs libres des PV (`coordonnees.ts`) : l'écart actif relevé en 3.3, à corriger en priorité ;
  - export PDF du journal, en complément du cahier de chantier réglementaire.
- **Fichiers** : `projetsApi.ts` (`posterMessage`, `filtrerValeurs`), nouveaux `features/projet/Journal.tsx`. **Tables** : `ProjetJournal`, `ProjetAction`.
- Le correctif de masquage seul tient en une demi-journée et peut être fait tout de suite.

#### Lot GP10 — Tableau de bord multi-projets (1 semaine)
- **Contenu** : sur `/cc/projets`, une ligne par projet avec :
  - phase, % de jalons validés, points d'arrêt en attente ;
  - pièces manquantes, retard du planning ;
  - échéances à moins de 90 jours, écart budgétaire ;
  - filtres par cabinet, ville et type.
- Remplace `/cc/dashboard` en sommeil.
- **Fichiers** : `functions/_lib/projetsApi.ts` (requête de synthèse), `command-center/modules/projets/ProjetsModule.tsx`. **Tables** : aucune.

#### Lot GP11 — Honoraires reliés aux jalons (1 semaine)
- **Correspondance** :
  - `HON_CONCEPTION` → validation APS et APD ;
  - `HON_AUTORISATION` → permis délivré ;
  - `HON_CHANTIER` → du démarrage au permis d'habiter, éventuellement par tranches ;
  - `CTRL_BET` → une visite par point d'arrêt « plancher » et fondations ;
  - `PERMIS_HABITER` → `J12_02`.
- À la validation du jalon, une facture de la mission est **proposée** au cabinet, jamais émise automatiquement.
- **Fichiers** : `apps/web/src/domain/honoraires/`, tables Devis / Facture de la session Devis.

#### Lot GP12 — Historique des estimations (1 semaine)
- **Contenu** : table `ProjetEstimation` (niveau `N1`…`N7`, date, montant, fourchette, source : moteur, DQE, marché, situations) ; graphique « entonnoir » côté client et cabinet ; écart avec le budget du client.
- **Fichiers** : `apps/web/src/domain/chiffrage/` (export), `features/projet/`. **Tables** : `ProjetEstimation`.

#### Lot GP13 — Parcours rénovation et lotissement à jour (1 semaine)
- **Rénovation** : type de projet `RENOVATION_EXTENSION`, jalons de diagnostic de l'existant, permis de réfection (10 jours ouvrables, 6 mois), modificatif, régularisation.
- **Lotissement** : validité graduée de l'autorisation (loi 34-21), réception provisoire qui verse la voirie au domaine public, réception définitive environ un an après, pas de permis d'habiter avant réception provisoire (art. 57 de la loi 12-90).
- **Fichiers** : `apps/web/src/domain/referentiel/data/conception-procedures-reception.json`, `phases.catalog.ts`.

#### Lot GP14 — Maquette numérique (BIM) en exécution (2 semaines, quand GP2 à GP8 sont en place)
- **Contenu** :
  - dépôt des fichiers IFC exportés de Revit sur R2 ;
  - visionneuse web chargée à la demande (bibliothèque libre `web-ifc` depuis un CDN autorisé) dans les jalons des études d'exécution et dans le DOE ;
  - rattachement d'une réserve ou d'un document à un élément de la maquette (identifiant IFC) ;
  - plus tard, quantités de la maquette vers le métré de niveau 4.
- Revit reste l'outil du bureau ; la plateforme montre, compare et archive.
- **Fichiers** : `features/projet/Maquette.tsx`, `projetsApi.ts` (types de fichiers autorisés).

### 4.4 Calendrier indicatif

| Semaines | Lots |
|---|---|
| 1 | GP1 (+ correctif de masquage des messages de GP9) |
| 2-3 | GP2 |
| 4 | GP3 + GP4 |
| 5-6 | GP5 |
| 7-8 | GP6 |
| 9 | GP7 |
| 10-12 | GP8 |
| 13-14 | GP9 |
| 15 | GP10 + GP11 |
| 16 | GP12 + GP13 |
| plus tard | GP14 |

### 4.5 Questions à trancher par le fondateur

1. Coordonnées du cabinet sur les devis et factures (3.3) : exception assumée ou passage par CITURBAREA ?
2. Bureau de contrôle : obligatoire pour tous les projets CITURBAREA (choix qualité) ou seulement au-delà des seuils ?
3. Visa ordinal du dossier d'autorisation : existe-t-il en pratique à Kénitra et Rabat (Rokhas) ? Sinon, le retirer.
4. Ordre réel des raccordements définitifs et du permis d'habiter chez Redal et la société régionale de Rabat-Salé-Kénitra.
5. Délai de l'article 770 du DOC (30 jours ou non) : avis d'un juriste.
6. Les budgets et situations sont-ils visibles par le client dès le premier jour, ou seulement après signature du marché ?
