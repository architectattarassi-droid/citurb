# Référentiel des phases et jalons d'un projet de construction

**CITURBAREA — version 1.0 du 15 octobre 2026 — proposition à valider par le fondateur**

Ce document décrit, de l'idée du client jusqu'à la fin de la garantie décennale, toutes les étapes d'un projet de construction au Maroc : ce qu'il faut faire, qui le fait, qui valide, quels documents doivent exister, quels textes s'appliquent, combien de temps cela prend et ce qui fait déraper. Le cas de référence est une **villa** ; les écarts pour un **immeuble**, un **équipement**, un **lotissement** et une **rénovation ou extension** sont indiqués à chaque phase.

Les mêmes données existent en version structurée, réutilisable par le logiciel : `docs/gestion-projet/referentiel-phases.json` (les codes en majuscules de ce document y renvoient). L'audit de l'existant et les propositions sont dans `docs/gestion-projet/audit-et-ameliorations.md`.

**En chiffres :** 15 phases, 59 jalons (plus 7 jalons propres au lotissement et à la rénovation), dont 36 points d'arrêt, 199 documents types, 38 textes de référence ; 125 livrables d'études détaillés par lot et par phase (fichier livrables-par-lot.md), des durées pour 12 types de projets, 39 normes et règles techniques (86 exigences) et 21 checklists de chantier totalisant 142 points de contrôle (fichier normes-et-checklists-chantier.md).

**Comment lire ce document.**
- Une **phase** est une grande période du projet (exemple : « Autorisation de construire »).
- Un **jalon** est une étape vérifiable à l'intérieur d'une phase (exemple : « Permis de construire délivré »). Il est validé par une personne précise.
- Un **point d'arrêt** (⛔) est un jalon bloquant : on ne passe pas à la suite sans lui.
- Les durées sont des fourchettes réalistes d'un chef de projet au Maroc, pas des délais réglementaires (sauf mention).
- Une référence suivie de « à vérifier » n'a pas pu être confirmée sur le texte officiel : ne pas l'opposer à un tiers avant relecture.

> Avertissement : ce référentiel est un outil de pilotage. Il ne remplace ni la lecture des textes officiels, ni l'avis d'un juriste, ni les règles locales de chaque commune et agence urbaine.


## 1. Vue d'ensemble des 15 phases

| # | Phase | Durée villa | Durée immeuble | On en sort quand… | Estimation à ce stade |
|---|---|---|---|---|---|
| 0 | **Idée, programme et choix de l'architecte** (`P00_IDEE_PROGRAMME`) | 1 à 4 sem. | 2 à 8 sem. | Programme signé par le client et contrat d'architecte signé (avec devis d'honoraires accepté). | Ratio global au m² (± 25 à 30 %) |
| 1 | **Terrain, foncier et faisabilité** (`P01_FONCIER_FAISABILITE`) | 2 à 6 sem. | 4 à 10 sem. | Note de faisabilité remise et acceptée : surface constructible, gabarit, sous-sol possible ou non, budget de niveau 1 confirmé. | Ratio global au m² (± 20 à 30 %) |
| 2 | **Esquisse et avant-projet sommaire (APS)** (`P02_ESQUISSE_APS`) | 3 à 8 sem. | 4 à 10 sem. | APS validé par écrit par le client (plans, surfaces, estimation par lot dans le budget ou écart assumé). | Ratios par lot (± 15 à 20 %) |
| 3 | **Avant-projet détaillé (APD) et premières études techniques** (`P03_APD_ETUDES`) | 3 à 6 sem. | 6 à 12 sem. | APD validé par le client, bureaux d'études mandatés, notices exigées pour le dépôt prêtes. | Estimatif paramétrique par lot (± 10 %) |
| 4 | **Autorisation de construire (Rokhas)** (`P04_AUTORISATION`) | 4 à 12 sem. | 8 à 20 sem. | Arrêté de permis de construire délivré, plans visés « ne varietur » récupérés, taxe sur les opérations de construction payée, date limite de démarrage enregistrée. | Estimatif paramétrique par lot (± 10 %) |
| 5 | **Études d'exécution** (`P05_ETUDES_EXECUTION`) | 4 à 8 sem. | 8 à 16 sem. | Plans d'exécution structure visés par le bureau de contrôle quand il est mandaté, plans des lots techniques et détails d'architecture diffusés, synthèse des réservations faite. | Métré sur plans d'exécution et DQE (± 5 %) |
| 6 | **Métré, consultation des entreprises et marchés** (`P06_CONSULTATION_MARCHES`) | 3 à 8 sem. | 6 à 12 sem. | Marché(s) signé(s), assurances obligatoires souscrites, cautions remises, financement débloqué si crédit. | Prix du marché signé (prix contractuel ; provision pour aléas 5 à 10 %) |
| 7 | **Préparation et ouverture du chantier** (`P07_PREPARATION_CHANTIER`) | 1 à 3 sem. | 2 à 6 sem. | Implantation réceptionnée contradictoirement et conforme au permis ; planning d'exécution validé. | Prix du marché signé (montant du marché + provision) |
| 8 | **Terrassement, fondations et sous-sol** (`P08_GROS_OEUVRE_INFRASTRUCTURE`) | 5 à 12 sem. | 10 à 24 sem. | Fondations (et sous-sol) achevées, essais de béton conformes, étanchéité des parois enterrées et réseaux sous dallage réceptionnés, remblai compacté. | Situations et attachements réels (réel) |
| 9 | **Gros œuvre en élévation et mise hors d'eau** (`P09_GROS_OEUVRE_ELEVATION`) | 12 à 22 sem. | 24 à 44 sem. | Gros œuvre réceptionné : structure complète, essais conformes, maçonnerie et acrotères faits, étanchéité de terrasse essayée. | Situations et attachements réels (réel) |
| 10 | **Second œuvre, équipements et extérieurs** (`P10_SECOND_OEUVRE_EQUIPEMENTS`) | 16 à 30 sem. | 28 à 52 sem. | Tous les lots terminés, essais de fonctionnement réalisés, nettoyage fait : le bâtiment est prêt pour les opérations préalables à la réception. | Situations et attachements réels (réel) |
| 11 | **Réception provisoire et levée des réserves** (`P11_RECEPTION_PROVISOIRE`) | 3 à 12 sem. | 6 à 16 sem. | PV de réception provisoire signé (date de départ des garanties) et PV de levée de toutes les réserves. | Décompte provisoire puis définitif (réel) |
| 12 | **Conformité, permis d'habiter et raccordements définitifs** (`P12_CONFORMITE_PERMIS_HABITER`) | 4 à 12 sem. | 8 à 24 sem. | Permis d'habiter ou certificat de conformité délivré, abonnements définitifs eau et électricité ouverts, titres éclatés pour une copropriété. | Décompte provisoire puis définitif (réel) |
| 13 | **Année de garantie et réception définitive** (`P13_GARANTIE_RECEPTION_DEFINITIVE`) | 52 à 56 sem. | 52 à 60 sem. | PV de réception définitive signé, décompte général et définitif arrêté, retenue de garantie restituée, cautions libérées. | Décompte provisoire puis définitif (définitif) |
| 14 | **Vie de l'ouvrage et garantie décennale** (`P14_EXPLOITATION_DECENNALE`) | 520 sem. | 520 sem. | Fin de la période décennale : dossier archivé. | Décompte provisoire puis définitif (—) |

## 2. Règles communes à toutes les phases

### 2.1 Statut d'un document attendu

Chaque jalon porte une liste de documents. Chaque document a un statut, et seul le validateur désigné peut le passer à « Validé » ou « Refusé » :

| Statut | Signification |
|---|---|
| Attendu | Le document est exigé à ce jalon et n'a pas encore été déposé. |
| Déposé | Un fichier a été déposé ; il attend la vérification du validateur. |
| Validé | Le validateur l'a accepté (horodaté, nom et rôle). |
| Refusé | Le validateur l'a refusé avec un motif ; un nouveau dépôt est attendu. |
| Sans objet | Ne s'applique pas à ce projet (condition non remplie), décision tracée. |
| Fait hors plateforme | Étape antérieure à l'arrivée sur CITURBAREA (dossier repris en cours), déclaration de l'admin. |

### 2.2 Points d'arrêt

Un **point d'arrêt** est un jalon qu'on ne franchit pas sans validation écrite : tant qu'il n'est pas validé, les jalons suivants restent bloqués (exemple : on ne coule pas un plancher sans PV de réception des armatures). Le référentiel en compte **36**. Chacun peut être **débloqué par l'administration CITURBAREA**, mais seulement avec un motif écrit, horodaté et visible dans le journal du projet (exemple : visite faite et PV signé sur papier, scan déposé ensuite).

### 2.3 Une estimation qui se resserre à mesure que le projet se fige

| Niveau | Quand | Précision | Méthode | Outil CITURBAREA |
|---|---|---|---|---|
| 1. Ratio global au m² | P00, P01 | ± 20 à 30 % | Surface × coût au m² (type, standing, ville). | grille2026 / niveau 1 |
| 2. Ratios par lot | P02 | ± 15 à 20 % | Surfaces par niveau × coût au m² de chaque lot. | chiffrage niveau 1 (ratios) |
| 3. Estimatif paramétrique par lot | P03, P04 | ± 10 % | Métré paramétrique (quantités déduites de la géométrie) × prix unitaires. | chiffrage niveau 2 (paramétrique) |
| 4. Métré sur plans d'exécution et DQE | P05, P06 | ± 5 % | Quantités mesurées sur plans × prix unitaires de référence. | chiffrage niveau 3 (quantités saisies) |
| 5. Prix du marché signé | P06, P07 | contractuel + provision pour aléas 5 à 10 % | Montant du marché + provision ; base du suivi prévu / engagé / payé. | à créer (budget du projet) |
| 6. Situations et attachements réels | P08, P09, P10 | réel | Quantités constatées × prix du marché + avenants. | à créer (situations) |
| 7. Décompte provisoire puis définitif | P11, P12, P13 | définitif | Solde de tout compte. | à créer (décomptes) |

Le client voit toujours le niveau atteint et la fourchette : un chiffre d'esquisse n'est jamais présenté comme un prix.

### 2.4 Tout passe par CITURBAREA

Aucune pièce échangée entre client, professionnels et fournisseurs ne montre les coordonnées d'un tiers (téléphone, e-mail, adresse personnelle, réseaux). Les pièces d'identité, attestations CNSS, registres de commerce et coordonnées restent au back-office. Les intervenants sont désignés par leur rôle et leur raison sociale ; les échanges passent par la messagerie, les demandes d'appel vidéo et les documents de l'espace projet.

### 2.5 Décisions du fondateur (15/10/2026)

- **Bureau de contrôle** : Bureau de contrôle obligatoire pour tout projet dont le budget de travaux dépasse 5 MDH (cohérent avec les marchés publics et l'assurance décennale) ; recommandé en dessous.
- **Visa de l'Ordre** : Le visa du dossier relève du conseil régional de l'Ordre des architectes compétent pour la commune du projet. Kénitra : Kénitra, Sidi Slimane, Sidi Kacem, Ouazzane ; Rabat : Rabat, Salé, Skhirat-Témara, Khémisset ; Agadir : Sud du Maroc (liste des provinces à compléter) (antenne à Dakhla). Liste fournie par le fondateur ; les autres conseils régionaux et leurs territoires sont à compléter (à vérifier auprès de l'Ordre).
- **Facturation** : Toute la facturation passe par CITURBAREA / HSE DECO (aucun paiement direct entre client et professionnels). Contredit la règle du contrat Devis & Facturation (« émetteur = le cabinet, jamais HSE DECO ») : à réconcilier dans docs/architecture/contrat-devis-facturation.md.

## 3. Les phases en détail

### 0. Idée, programme et choix de l'architecte

*Code `P00_IDEE_PROGRAMME` — الفكرة والبرنامج واختيار المهندس المعماري*

- **Objectif.** Transformer une envie de construire en un programme écrit (besoins, surfaces, standing, budget, calendrier) et confier la mission à un architecte par un contrat signé.
- **On y entre quand :** Premier contact du client (demande de prix, rendez-vous vidéo, lead d'une porte).
- **On en sort quand :** Programme signé par le client et contrat d'architecte signé (avec devis d'honoraires accepté).
- **Durée typique :** villa 1 à 4 sem., immeuble 2 à 8 sem. Plus long quand le client hésite entre plusieurs terrains ou n'a pas arrêté son budget.
- **Ce qui fait déraper :** Budget non arrêté ou irréaliste par rapport au programme ; Plusieurs décideurs (famille, associés) qui ne valident pas en même temps ; Terrain pas encore acquis ou en indivision.
- **Estimation à ce stade :** Ratio global au m², ± 25 à 30 %. Surface souhaitée × coût au m² de la grille CITURBAREA selon type, standing et ville.
- **Textes applicables :** Loi 016-89 (dahir 1-92-122 du 10/09/1993) ; Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Maître d'ouvrage (client) | exprime le besoin, fixe le budget, signe le contrat | programme, contrat |
| Architecte (maître d'œuvre) | reformule le programme, conseille sur le budget, propose la mission | faisabilité du programme |
| Équipe CITURBAREA (administration de la plateforme) | qualifie la demande, organise le rendez-vous vidéo, ouvre le dossier | complétude du dossier |

**Jalons et documents**

#### Besoin exprimé et enveloppe budgétaire (`J00_01_BESOIN_EXPRIME`)

Recueillir le besoin (pièces, surfaces, niveaux, standing, délais) et l'enveloppe financière tout compris.  Validé par : Maître d'ouvrage (client). Délai typique : 1 semaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiche de besoin (programme sommaire) `FICHE_BESOIN` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Formulaire en ligne | Pièces et surfaces souhaitées, nombre de niveaux, sous-sol, piscine, standing, contraintes familiales. |
| Enveloppe budgétaire et mode de financement `ENVELOPPE_BUDGETAIRE` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Formulaire | Budget total TTC (terrain exclu), part autofinancée, crédit envisagé. |
| Identité du maître d'ouvrage `IDENTITE_MAITRE_OUVRAGE` | oui | Maître d'ouvrage (client) | Équipe CITURBAREA (administration de la plateforme) | PDF ou photo | CIN (personne physique) ou statuts, RC, ICE et pouvoir du signataire (société). Conservée au back-office uniquement, jamais montrée aux autres intervenants. |

#### Programme validé (`J00_02_PROGRAMME_VALIDE`)

Arrêter par écrit le programme qui servira de base à la conception et au devis d'honoraires.  Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Programme signé `PROGRAMME_SIGNE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF signé | Tableau des surfaces par niveau, prestations attendues, budget cible et calendrier cible. |
| Estimation par ratio (niveau 1) `ESTIMATION_N1` | oui | Équipe CITURBAREA (administration de la plateforme) | Architecte (maître d'œuvre) | Fiche générée par le moteur de chiffrage | Coût au m² × surface, fourchette affichée ± 25 à 30 %. |

#### ⛔ Contrat d'architecte signé (`J00_03_CONTRAT_ARCHITECTE`)

Engager l'architecte par un contrat écrit qui précise les missions (conception, autorisation, suivi de chantier), les honoraires et leur échéancier. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 semaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Devis d'honoraires accepté `DEVIS_HONORAIRES_ACCEPTE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF généré par le module Devis (acceptation horodatée) | Missions retenues (pack), base de calcul, modalités de paiement. |
| Contrat d'architecte `CONTRAT_ARCHITECTE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF signé par les deux parties | Pièce exigée dans le dossier d'autorisation (copie du contrat, arrêté 337-20). Honoraires librement négociés (l'Ordre ne diffuse plus de barème minimum depuis 2023). |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Ajouter une étude de marché et un bilan promoteur (prix de vente, charge foncière, marge) ; le maître d'ouvrage est souvent une société (statuts, ICE, pouvoir du gérant).
- *Équipement (établissement recevant du public, public ou privé)* : Programme fonctionnel détaillé (effectifs, normes du ministère de tutelle) ; en marché public, la mission d'architecte est attribuée par concours ou consultation architecturale.
- *Lotissement / VRD* : Programme de découpage (nombre et taille des lots, typologies autorisées) et bilan d'aménagement.
- *Rénovation, extension, surélévation* : Visite de l'existant dès le premier rendez-vous ; le programme distingue ce qui est conservé, démoli et ajouté.

### 1. Terrain, foncier et faisabilité

*Code `P01_FONCIER_FAISABILITE` — الأرض والوضعية العقارية ودراسة الجدوى*

- **Objectif.** Vérifier que le terrain appartient bien au client, ce que le règlement d'urbanisme permet d'y construire, la forme exacte du terrain et la nature du sol.
- **On y entre quand :** Contrat d'architecte signé (ou mission de faisabilité seule).
- **On en sort quand :** Note de faisabilité remise et acceptée : surface constructible, gabarit, sous-sol possible ou non, budget de niveau 1 confirmé.
- **Durée typique :** villa 2 à 6 sem., immeuble 4 à 10 sem. Le géotechnicien peut travailler en parallèle de l'esquisse ; un terrain non immatriculé peut demander plusieurs mois.
- **Ce qui fait déraper :** Terrain non immatriculé (réquisition en cours) ou en indivision ; Différence entre le titre foncier et le terrain réel (bornes déplacées, empiètement) ; Note de renseignements lente ou plan d'aménagement en révision ; Terrain en zone de servitude (oued, ligne électrique, route à élargir) ; Nappe phréatique ou remblais découverts au sondage.
- **Estimation à ce stade :** Ratio global au m², ± 20 à 30 %. Ratio global ajusté par les contraintes connues (sous-sol, sol médiocre, mitoyenneté, pente).
- **Textes applicables :** Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 ; Décret 2-18-577 du 12/06/2019 (BO FR 6874 du 16/04/2020) — remplace le décret 2-13-424, abrogé ; Dahir du 12/08/1913 sur l'immatriculation, modifié par la loi 14-07 (à vérifier) ; Loi 30-93 (dahir 1-94-126 du 25/02/1994) ; Loi 25-90 (dahir 1-92-7 du 17/06/1992), modifiée par les lois 66-12 et 34-21 ; Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier).
- **Missions d'honoraires liées (grille ARC-BATI) :** TOPO, GEOTECH.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Maître d'ouvrage (client) | fournit les pièces foncières | — |
| Architecte (maître d'œuvre) | analyse les règles, coordonne topographe et géotechnicien | note de faisabilité |
| Conservation foncière (ANCFCC) | délivre le certificat de propriété et le plan du titre | situation juridique |
| Agence urbaine | délivre la note de renseignements urbanistiques | règles applicables |
| Ingénieur géomètre-topographe | levé topographique rattaché (ingénieur géomètre-topographe inscrit) | levé |
| Géotechnicien (laboratoire de sol) | sondages, essais et rapport de sol | rapport géotechnique |
| Notaire | si achat en cours, indivision ou servitude | acte |

**Jalons et documents**

#### Situation foncière vérifiée (`J01_01_FONCIER_VERIFIE`)

S'assurer que le client est propriétaire (ou dispose de l'accord des copropriétaires) et que le titre correspond au terrain.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 7 jours (certificat en ligne) ; plusieurs mois si terrain non immatriculé.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Certificat de propriété récent `CERTIFICAT_PROPRIETE` | oui | Conservation foncière (ANCFCC) | Architecte (maître d'œuvre) | PDF officiel | Délivré par la conservation foncière (ANCFCC) ; à jour (moins de 3 mois en pratique, à vérifier selon la commune) ; montre propriétaires, charges et hypothèques. |
| Plan du titre foncier (plan de bornage) `PLAN_TITRE_FONCIER` | oui | Conservation foncière (ANCFCC) | Ingénieur géomètre-topographe | PDF | Contour et bornes du terrain tels qu'enregistrés ; sert à vérifier la concordance avec le terrain. |
| Acte d'acquisition ou réquisition d'immatriculation `ACTE_PROPRIETE_OU_REQUISITION` | si condition (Terrain non immatriculé ou achat récent) | Notaire | Architecte (maître d'œuvre) | PDF | Si le terrain n'est pas encore immatriculé ou si la mutation n'est pas inscrite. |
| Accord écrit des co-indivisaires `ACCORD_COINDIVISAIRES` | si condition (Indivision) | Maître d'ouvrage (client) | Notaire | PDF légalisé | Si plusieurs propriétaires sur le certificat. |

#### Note de renseignements urbanistiques obtenue (`J01_02_NRU_OBTENUE`)

Connaître les règles du plan d'aménagement applicables à la parcelle : zone, hauteur, nombre de niveaux, emprise, retraits, coefficient d'occupation, servitudes.  Validé par : Architecte (maître d'œuvre). Délai typique : 2 jours ouvrables selon le RGC (art. 6 à 8) ; 1 à 3 semaines en pratique selon l'agence urbaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Note de renseignements urbanistiques `NOTE_RENSEIGNEMENTS_URBANISTIQUES` | oui | Agence urbaine | Architecte (maître d'œuvre) | PDF (demande en ligne ou au guichet) | Zone du plan d'aménagement, hauteur maximale, nombre de niveaux, emprise, reculs, alignement, servitudes, équipements prévus. Prévue par le règlement général de construction (art. 6 à 9 du décret 2-18-577). |
| Cahier des charges et plan du lotissement `CAHIER_CHARGES_LOTISSEMENT` | si condition (Lot situé dans un lotissement autorisé) | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | PDF | Règles propres au lotissement (gabarit, façades, mitoyenneté) qui s'ajoutent au plan d'aménagement. |

#### Levé topographique et concordance (`J01_03_LEVE_TOPOGRAPHIQUE`)

Disposer d'un plan exact du terrain (limites, niveaux, voirie, réseaux, voisins) et vérifier qu'il correspond au titre foncier.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Levé topographique rattaché `LEVE_TOPOGRAPHIQUE` | oui | Ingénieur géomètre-topographe | Architecte (maître d'œuvre) | DWG + PDF signé | Rattaché au système de coordonnées national (Lambert), courbes de niveau, bornes, voirie, regards et réseaux visibles, bâtiments voisins, arbres. Signé par un ingénieur géomètre-topographe inscrit. |
| Plan de situation `PLAN_SITUATION` | oui | Ingénieur géomètre-topographe | Architecte (maître d'œuvre) | PDF | Repère la parcelle dans le quartier (échelle 1/2000 ou 1/5000 selon la commune) ; pièce du dossier d'autorisation. |
| Constat de concordance titre / terrain `NOTE_CONCORDANCE` | oui | Ingénieur géomètre-topographe | Architecte (maître d'œuvre) | PDF | Écarts de surface ou de bornes signalés ; s'il y a un écart, régler avant de concevoir (rebornage). |

#### ⛔ Étude géotechnique (`J01_04_ETUDE_GEOTECHNIQUE`)

Connaître la nature du sol, sa résistance, la présence d'eau et la classe de site au sens du RPS pour dimensionner les fondations et le sous-sol. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Bureau de contrôle technique. Délai typique : 3 à 6 semaines.

> Bloque le démarrage des plans de fondations (P05). Recommandée pour une villa sans sous-sol, indispensable avec sous-sol ou sol douteux ; exigée en pratique par le bureau de contrôle et l'assureur.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Programme de sondages `PROGRAMME_SONDAGES` | facultatif | Géotechnicien (laboratoire de sol) | Bureau d'études structure | PDF | Nombre, profondeur et type de sondages et d'essais adaptés au projet. |
| Rapport géotechnique `RAPPORT_GEOTECHNIQUE` | si condition (Indispensable avec sous-sol, immeuble, équipement ou sol douteux ; fortement recommandé ailleurs) | Géotechnicien (laboratoire de sol) | Bureau d'études structure | PDF signé | Coupes de sondage, niveau d'eau, contrainte admissible, tassements, type de fondation recommandé, classe de site RPS (S1 à S5), agressivité du sol pour le béton, conseils pour les fouilles et le sous-sol. |

#### ⛔ Faisabilité validée par le client (`J01_05_FAISABILITE_VALIDEE`)

Dire clairement au client ce qu'il peut construire, à quel coût approximatif, et avec quelles contraintes, avant de dessiner. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client). Délai typique : 1 semaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Note de faisabilité urbanistique et technique `NOTE_FAISABILITE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF | Surface de plancher maximale, gabarit, sous-sol, procédure (petit ou grand projet), intervenants obligatoires, risques, budget de niveau 1. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Étude géotechnique obligatoire en pratique (sous-sol, charges élevées) avec sondages plus profonds ; vérifier les servitudes de vue et de mitoyenneté ; levé des bâtiments voisins (hauteurs, fondations).
- *Équipement (établissement recevant du public, public ou privé)* : Vérifier l'affectation du terrain au plan d'aménagement (zone d'équipement) et, pour un projet public, la mise à disposition du terrain par l'administration.
- *Lotissement / VRD* : Le foncier doit être immatriculé ; vérifier la zone (le plan d'aménagement doit permettre le lotissement), les raccordements possibles (capacité des réseaux) et les cessions de voirie.
- *Rénovation, extension, surélévation* : Ajouter un relevé de l'existant et un diagnostic de structure (BET) ; retrouver le permis initial et le permis d'habiter du bâtiment existant.

### 2. Esquisse et avant-projet sommaire (APS)

*Code `P02_ESQUISSE_APS` — الرسم الأولي والمشروع التمهيدي الموجز*

- **Objectif.** Proposer des partis d'aménagement, en retenir un avec le client et le préciser en plans à l'échelle avec une première estimation par lot.
- **On y entre quand :** Faisabilité validée.
- **On en sort quand :** APS validé par écrit par le client (plans, surfaces, estimation par lot dans le budget ou écart assumé).
- **Durée typique :** villa 3 à 8 sem., immeuble 4 à 10 sem. Dépend surtout du nombre d'allers-retours avec le client ; le pack Essentiel (plan type) réduit cette phase à 1 à 2 semaines.
- **Ce qui fait déraper :** Modifications répétées du client ; Décision familiale tardive ; Programme qui dépasse le budget et qu'il faut réduire.
- **Estimation à ce stade :** Ratios par lot, ± 15 à 20 %. Surfaces par niveau × coût au m² par lot (gros œuvre, second œuvre, équipements, extérieurs) selon le standing ; correspond au niveau 1 du moteur de chiffrage.
- **Lots concernés :** tous lots par ratio.
- **Textes applicables :** Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 ; Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) ; Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09.
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_CONCEPTION, 3D_INT.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | conçoit, présente, chiffre | cohérence avec les règles |
| Maître d'ouvrage (client) | choisit et valide | esquisse, APS |
| Bureau d'études structure | avis sur le système porteur (facultatif à ce stade) | — |

**Jalons et documents**

#### Esquisse choisie (`J02_01_ESQUISSE_VALIDEE`)

Présenter des variantes d'implantation et de distribution et en retenir une.  Validé par : Maître d'ouvrage (client). Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Esquisses (variantes) `ESQUISSES_VARIANTES` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF (plans de principe 1/200, volumétrie, 3D si prévue) | Jusqu'à 3 variantes dans le pack Personnalisé ; plan type sans variante dans le pack Essentiel. |
| Validation écrite de l'esquisse `VALIDATION_ESQUISSE` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Validation horodatée sur la plateforme | Variante retenue et remarques. |

#### ⛔ APS validé (`J02_02_APS_VALIDE`)

Figer la distribution, les surfaces et l'aspect général, avec une estimation par lot. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 2 à 4 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plans APS `PLANS_APS` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF + DWG (1/100) | Plans de chaque niveau, coupe, façades principales, tableau des surfaces par niveau et par usage. |
| Estimation par lot (niveau 2) `ESTIMATION_APS` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Fiche du moteur de chiffrage | Montant par lot et total, fourchette ± 15 à 20 %, écart avec le budget du client. |
| Validation écrite de l'APS `VALIDATION_APS` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Validation horodatée | Vaut accord pour passer à l'APD ; toute modification ultérieure peut faire l'objet d'un avenant d'honoraires. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Optimiser la surface vendable (rendement plancher), le nombre de places de parking et la trame structurelle compatible avec le sous-sol ; consulter tôt le bureau de contrôle sur la sécurité incendie.
- *Équipement (établissement recevant du public, public ou privé)* : Valider le programme fonctionnel avec l'usager (direction, ministère) ; en marché public, l'APS est soumis à la commission du maître d'ouvrage.
- *Lotissement / VRD* : L'esquisse est le plan de découpage (voirie, lots, espaces verts, équipements) ; elle se discute tôt avec l'agence urbaine.
- *Rénovation, extension, surélévation* : Plans de l'existant en fond, avec repérage de ce qui est démoli (en jaune) et construit (en rouge) ; vérifier la capacité de l'existant à porter une surélévation.

### 3. Avant-projet détaillé (APD) et premières études techniques

*Code `P03_APD_ETUDES` — المشروع التمهيدي المفصل والدراسات التقنية الأولية*

- **Objectif.** Préciser le projet (cotes, matériaux, structure, performances thermiques, sécurité) jusqu'à un niveau suffisant pour déposer l'autorisation et chiffrer à ± 10 %.
- **On y entre quand :** APS validé.
- **On en sort quand :** APD validé par le client, bureaux d'études mandatés, notices exigées pour le dépôt prêtes.
- **Durée typique :** villa 3 à 6 sem., immeuble 6 à 12 sem. Le choix du bureau d'études et du bureau de contrôle peut retarder si on l'attend pour commencer.
- **Ce qui fait déraper :** Bureau d'études choisi tard ; Choix de matériaux non arrêtés ; Exigences du bureau de contrôle découvertes tard (incendie, accessibilité).
- **Estimation à ce stade :** Estimatif paramétrique par lot, ± 10 %. Métré paramétrique par lot et par niveau (niveau 2 du moteur de chiffrage), prix de la grille de la ville.
- **Lots concernés :** gros oeuvre, Étanchéité, menuiseries, Plomberie sanitaire et eau chaude, electricite, Climatisation, ventilation, revetements, vrd.
- **Textes applicables :** Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) ; Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 ; Décret 2-14-499 du 15/10/2014 (BO 6306 du 06/11/2014) ; Arrêté conjoint 337-20 du 21/01/2020 (BO 6874), modifié par l'arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) ; Arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) ; Loi 10-03 (dahir 1-03-58 du 12/05/2003) et décret 2-11-246.
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_CONCEPTION, BA.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | plans APD, notices, coordination | APD |
| Bureau d'études structure | prédimensionnement, système porteur, hypothèses RPS | principe structurel |
| Bureau d'études fluides | principe des réseaux, bilan de puissance (immeuble) | principe fluides |
| Bureau de contrôle technique | avis sur la conception (si mandaté) | avis de conception |
| Maître d'ouvrage (client) | valide les choix | APD |

**Jalons et documents**

#### Bureaux d'études et contrôle mandatés (`J03_01_BUREAUX_ETUDES_MANDATES`)

Confier les études de structure (et de fluides si besoin) et, si nécessaire, la mission de contrôle technique.  Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Contrat du bureau d'études structure `CONTRAT_BET_STRUCTURE` | oui | Bureau d'études structure | Maître d'ouvrage (client) | PDF signé (passé par CITURBAREA) | Missions : notes de calcul RPS, plans de coffrage et de ferraillage, visites avant coulage. |
| Contrat du bureau d'études fluides `CONTRAT_BET_FLUIDES` | si condition (Immeuble, équipement, villa avec équipements importants) | Bureau d'études fluides | Maître d'ouvrage (client) | PDF signé | Plomberie, électricité, climatisation, sécurité incendie. |
| Convention de contrôle technique `CONVENTION_BUREAU_CONTROLE` | si condition (Obligatoire au-delà de 5 MDH de budget de travaux (décision du fondateur) ; recommandé en dessous) | Bureau de contrôle technique | Maître d'ouvrage (client) | PDF signé | Missions (solidité, sécurité incendie, etc.), nombre de visites ; ses réserves non levées peuvent exclure la garantie décennale. |

#### ⛔ APD validé (`J03_02_APD_VALIDE`)

Arrêter le projet détaillé et les pièces techniques exigées au dépôt. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 2 à 5 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plans APD cotés `PLANS_APD` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF + DWG (1/100, détails 1/50) | Plans cotés, coupes, façades avec matériaux, tableau des surfaces, plan de masse avec reculs et accès. |
| Note de prédimensionnement structure `NOTE_PREDIMENSIONNEMENT` | oui | Bureau d'études structure | Architecte (maître d'œuvre) | PDF | Système porteur, trame des poteaux, type de plancher, zone sismique et classe du bâtiment (RPS), type de fondation retenu d'après le rapport de sol. |
| Note de performance énergétique (RTCM) `NOTE_PERFORMANCE_ENERGETIQUE` | oui | Architecte (maître d'œuvre) | Bureau de contrôle technique | PDF | Zone climatique, méthode retenue (prescriptive ou performancielle), isolation des parois, vitrages ; pièce citée par l'arrêté 337-20 (à vérifier selon la commune). |
| Notice de sécurité incendie `NOTICE_SECURITE_INCENDIE` | oui | Architecte (maître d'œuvre) | Bureau de contrôle technique | PDF | Visée par un bureau de contrôle seulement au-delà des seuils de l'arrêté 1032-21 (habitat individuel au-delà de R+3, collectif à partir de R+3 sur lot > 150 m², ERP, IGH) ; sinon mention de l'architecte sur les plans. |
| Notice d'accessibilité `NOTICE_ACCESSIBILITE` | si condition (Établissement recevant du public, habitat collectif) | Architecte (maître d'œuvre) | Bureau de contrôle technique | PDF | Cheminements, rampes, ascenseur, sanitaires adaptés (loi 10-03). |
| Descriptif sommaire des matériaux `DESCRIPTIF_SOMMAIRE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF | Gamme de chaque lot (menuiseries, revêtements, sanitaires, isolation) ; base du choix des matériaux dans la matériauthèque. |
| Estimation détaillée (niveau 3) `ESTIMATION_APD` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Fiche du moteur de chiffrage | Métré paramétrique par lot et par niveau ± 10 %. |
| Validation écrite de l'APD `VALIDATION_APD` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Validation horodatée | Vaut accord pour le dépôt de l'autorisation. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Bureau de contrôle à mandater dès l'APD (notice de sécurité incendie visée pour un collectif à partir de R+3 sur lot de plus de 150 m² — arrêté 1032-21) ; études fluides, ascenseur, colonne montante, télécom, parking et désenfumage.
- *Équipement (établissement recevant du public, public ou privé)* : Établissement recevant du public : sécurité incendie et accessibilité complètes, avis de la protection civile à prévoir ; en marché public, l'APD est approuvé par le maître d'ouvrage avant le dossier d'autorisation.
- *Lotissement / VRD* : APD des VRD par un BET VRD : profils de voirie, assainissement, eau potable, électricité, éclairage public, télécom ; consultation des concessionnaires sur les capacités.
- *Rénovation, extension, surélévation* : Diagnostic structure obligatoire avant toute surélévation ou ouverture de mur porteur ; note du BET sur les renforcements.

### 4. Autorisation de construire (Rokhas)

*Code `P04_AUTORISATION` — رخصة البناء (منصة رخص)*

- **Objectif.** Constituer, déposer et faire aboutir la demande d'autorisation de construire sur la plateforme Rokhas, jusqu'à la délivrance du permis et le paiement des taxes.
- **On y entre quand :** APD validé et pièces techniques prêtes.
- **On en sort quand :** Arrêté de permis de construire délivré, plans visés « ne varietur » récupérés, taxe sur les opérations de construction payée, date limite de démarrage enregistrée.
- **Durée typique :** villa 4 à 12 sem., immeuble 8 à 20 sem. Délais réglementaires d'instruction : 15 jours (petits projets) et 30 jours (grands projets) selon l'arrêté 1839-23 ; en pratique 1 à 3 mois pour une villa, 2 à 5 mois pour un immeuble à cause des observations et compléments.
- **Ce qui fait déraper :** Dossier incomplet (pièce manquante, signature) ; Observations de la commission à corriger ; Avis de la protection civile ou d'un concessionnaire en retard ; Plan d'aménagement en cours de révision ; Taxes non payées qui bloquent la délivrance.
- **Estimation à ce stade :** Estimatif paramétrique par lot, ± 10 %. Estimation APD mise à jour des modifications demandées par la commission.
- **Textes applicables :** Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 ; Décret 2-18-577 du 12/06/2019 (BO FR 6874 du 16/04/2020) — remplace le décret 2-13-424, abrogé ; Arrêté conjoint 337-20 du 21/01/2020 (BO 6874), modifié par l'arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) ; Arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) ; Arrêté conjoint 338-20 du 21/01/2020 (BO 6874) + circulaire DGCL du 23/04/2020 ; Arrêté conjoint 1839-23 du 10/07/2023 (BO 7212), pris en application de la loi 55-19 et du décret 2-22-141 ; Loi 47-06 (fiscalité des collectivités territoriales), modifiée ; Loi 55-19 (dahir 1-20-06 du 06/03/2020) et décrets d'application (2-22-141 ; 2-22-385 à 387).
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_AUTORISATION, DEPOT_RENOUV, MODIFICATIF, REGULARISATION.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | constitue, signe et dépose le dossier, répond aux observations | complétude technique |
| Maître d'ouvrage (client) | signe la demande, paie frais et taxes | — |
| Commune (guichet unique, président du conseil communal) | guichet unique de l'urbanisme, président du conseil communal qui signe le permis | décision |
| Agence urbaine | avis sur la conformité au document d'urbanisme | avis |
| Protection civile | avis sécurité incendie (grands projets, ERP) | avis |
| Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | avis réseaux si demandé par la commission | avis |
| Ordre national des architectes | conseil régional compétent pour la commune : visa du dossier (décision du fondateur) | visa |

**Jalons et documents**

#### Dossier d'autorisation constitué (`J04_01_DOSSIER_CONSTITUE`)

Réunir les pièces principales (au dépôt) et préparer les pièces complémentaires (avant délivrance) selon l'arrêté 337-20 modifié.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Demande d'autorisation signée `DEMANDE_AUTORISATION_SIGNEE` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Formulaire Rokhas | Signée par le propriétaire ou son mandataire. |
| Plans architecturaux du dossier `PLANS_AUTORISATION` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF signé électroniquement (Rokhas) | Plan de situation, plan de masse, plans de tous les niveaux, coupes, façades, à l'échelle demandée par la commune ; signés par l'architecte. |
| Visa du conseil régional de l'Ordre des architectes `VISA_ORDRE_REGIONAL` | oui | Ordre national des architectes | Architecte (maître d'œuvre) | Visa (forme dans Rokhas à confirmer) | Conseil compétent selon la commune du projet (décision du fondateur) : Kénitra pour Kénitra, Sidi Slimane, Sidi Kacem, Ouazzane ; Rabat pour Rabat, Salé, Skhirat-Témara, Khémisset ; Agadir pour le sud avec une antenne à Dakhla. Base légale non lue dans la loi 016-89 (à vérifier). |
| Copie du contrat d'architecte `COPIE_CONTRAT_ARCHITECTE` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF | Pièce principale exigée par l'arrêté 337-20. |
| Certificat de propriété (au dépôt) `CERTIFICAT_PROPRIETE_DEPOT` | oui | Conservation foncière (ANCFCC) | Commune (guichet unique, président du conseil communal) | PDF | Même pièce qu'en P01, à jour au jour du dépôt. |
| Levé topographique (au dépôt) `LEVE_TOPOGRAPHIQUE_DEPOT` | oui | Ingénieur géomètre-topographe | Commune (guichet unique, président du conseil communal) | PDF | Repris de P01. |
| Notice de sécurité incendie (au dépôt) `NOTICE_SECURITE_INCENDIE_DEPOT` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF | Visée par un bureau de contrôle au-delà des seuils de l'arrêté 1032-21. |
| Note de performance énergétique (au dépôt) `NOTE_PERFORMANCE_ENERGETIQUE_DEPOT` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF | Reprise de P03 ; exigence à confirmer commune par commune. |
| Fiche de renseignements `FICHE_RENSEIGNEMENTS_STATISTIQUES` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | Formulaire | Simplement signée depuis l'arrêté 1032-21 ; pièce complémentaire. |
| Plans de structure `PLANS_STRUCTURE_DEPOT` | si condition (Selon la procédure et la commune) | Bureau d'études structure | Commune (guichet unique, président du conseil communal) | PDF | Pièce complémentaire à produire avant la délivrance (arrêté 337-20). |
| Dossier télécommunications (pré-câblage) `DOSSIER_TELECOM` | si condition (Immeuble, équipement) | Bureau d'études fluides | Commune (guichet unique, président du conseil communal) | PDF | Pièce complémentaire pour les immeubles (pré-équipement télécom). |
| Dossier de démolition `DOSSIER_DEMOLITION` | si condition (Construction existante à démolir) | Bureau d'études structure | Commune (guichet unique, président du conseil communal) | PDF | Étude technique d'un ingénieur (décret 2-18-475, art. 13). |

#### ⛔ Dépôt sur Rokhas et récépissé (`J04_02_DEPOT_ROKHAS`)

Déposer le dossier complet et obtenir le numéro de dossier qui fait courir les délais. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre). Délai typique : 1 jour.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Récépissé de dépôt Rokhas `RECEPISSE_DEPOT` | oui | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF ou capture du numéro | Numéro de dossier, date de dépôt, type de procédure (petit ou grand projet). |
| Quittance des frais de dossier `QUITTANCE_FRAIS_DOSSIER` | si condition (Selon la commune) | Maître d'ouvrage (client) | Équipe CITURBAREA (administration de la plateforme) | PDF | Frais de service selon la commune. |

#### Instruction et avis de la commission (`J04_03_INSTRUCTION`)

Suivre l'instruction, répondre aux observations, obtenir les avis (agence urbaine, protection civile, concessionnaires).  Validé par : Architecte (maître d'œuvre). Délai typique : 15 jours à 3 mois (petits projets), 30 jours à 5 mois (grands projets).

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Avis de la commission `AVIS_COMMISSION` | oui | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF (procès-verbal Rokhas) | Favorable, favorable sous réserve, ou défavorable avec motifs. |
| Réponse aux observations et plans corrigés `REPONSE_OBSERVATIONS` | si condition (Avis avec réserves) | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF | Chaque observation reprise avec la correction apportée. |
| Avis de la protection civile ou attestation de sécurité incendie `AVIS_PROTECTION_CIVILE` | si condition (Grand projet, ERP, immeuble) | Protection civile | Commune (guichet unique, président du conseil communal) | PDF | Le RGC 2-18-577 a remplacé, pour certains dossiers, l'avis de la protection civile par des attestations de professionnels (à vérifier selon la commune et le type de bâtiment). |

#### ⛔ Permis de construire délivré (`J04_04_PERMIS_DELIVRE`)

Récupérer l'arrêté de permis et les plans visés, payer la taxe, enregistrer la date limite de démarrage des travaux. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Commune (guichet unique, président du conseil communal). Délai typique : 1 à 2 semaines après avis favorable.

> Aucun travail sur le terrain avant ce jalon. Le permis est périmé si les travaux de fondation ne commencent pas dans l'année (loi 12-90, art. 49) : rappel automatique à J−90.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Arrêté de permis de construire `ARRETE_PERMIS_CONSTRUIRE` | oui | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF officiel | Numéro, date, bénéficiaire, objet ; la date sert au calcul de l'échéance de validité. |
| Plans visés « ne varietur » `PLANS_NE_VARIETUR` | oui | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF | Seuls plans opposables sur le chantier ; toute modification exige un permis modificatif. |
| Quittance de la taxe sur les opérations de construction `QUITTANCE_TAXE_CONSTRUCTION` | oui | Maître d'ouvrage (client) | Équipe CITURBAREA (administration de la plateforme) | PDF | Taxe communale (loi 47-06) payée avant la délivrance ; montant selon l'arrêté fiscal de la commune. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : « Grand projet » : passage en commission avec agence urbaine et services ; notice incendie visée par le bureau de contrôle, avis de la protection civile ; pièces complémentaires (dossier télécom, plans de structure) avant délivrance.
- *Équipement (établissement recevant du public, public ou privé)* : Grand projet ; avis de la protection civile systématique pour un ERP ; pour un projet public, l'autorisation reste nécessaire (sauf régimes particuliers, à vérifier).
- *Lotissement / VRD* : Ce n'est pas un permis de construire mais une autorisation de lotir (loi 25-90) ; dossier avec plan de lotissement, VRD, cahier des charges ; durée de validité graduée selon la surface (loi 34-21, à vérifier).
- *Rénovation, extension, surélévation* : Selon les travaux : permis de construire (extension, surélévation), permis de réfection (travaux sans modification de structure ni de façade, délivré en 10 jours ouvrables, valable 6 mois — décret 2-18-475) ou permis de démolir (validité 6 mois). Un plan modifié d'un projet autorisé exige un permis modificatif.

### 5. Études d'exécution

*Code `P05_ETUDES_EXECUTION` — دراسات التنفيذ*

- **Objectif.** Produire les plans et notes qui permettent de construire sans improviser : structure calculée au séisme, réseaux, détails d'architecture, synthèse des réservations.
- **On y entre quand :** APD validé (peut commencer pendant l'instruction du permis, au risque de modifications).
- **On en sort quand :** Plans d'exécution structure visés par le bureau de contrôle quand il est mandaté, plans des lots techniques et détails d'architecture diffusés, synthèse des réservations faite.
- **Durée typique :** villa 4 à 8 sem., immeuble 8 à 16 sem. Les études peuvent se chevaucher avec l'instruction du permis ; elles sont souvent sous-estimées et rattrapées sur chantier, ce qui coûte cher.
- **Ce qui fait déraper :** Bureau d'études surchargé ; Allers-retours avec le bureau de contrôle ; Modifications du permis non reportées ; Réservations oubliées découvertes au coulage.
- **Estimation à ce stade :** Métré sur plans d'exécution et DQE, ± 5 %. Métré sur plans d'exécution (quantités saisies : niveau 3 du moteur de chiffrage).
- **Lots concernés :** Terrassement, Fondations, Structure béton armé (poteaux, poutres, voiles, planchers), Maçonnerie, Étanchéité, menuiseries, Plomberie sanitaire et eau chaude, electricite, Climatisation, ventilation, vrd.
- **Textes applicables :** Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) ; NM 10.1.008-2009 (norme d'application obligatoire) ; NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (normes d'application obligatoire ; numéros d'arrêtés à vérifier) ; Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 ; Décret 2-14-499 du 15/10/2014 (BO 6306 du 06/11/2014).
- **Missions d'honoraires liées (grille ARC-BATI) :** BA, CTRL_BET.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Bureau d'études structure | notes de calcul et plans de béton armé | plans structure |
| Bureau d'études fluides | plans plomberie, électricité, climatisation | plans fluides |
| Architecte (maître d'œuvre) | plans d'exécution architecture, détails, synthèse | cohérence d'ensemble |
| Bureau de contrôle technique | visa des notes et plans | visa structure |

**Jalons et documents**

#### ⛔ Structure calculée et visée (`J05_01_STRUCTURE_VISEE`)

Disposer de notes de calcul et de plans de coffrage et de ferraillage conformes au RPS, visés par le contrôle quand il existe. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Bureau de contrôle technique. Délai typique : 3 à 8 semaines.

> Aucun coulage de béton sans plan de ferraillage diffusé « bon pour exécution ».

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Note d'hypothèses `NOTE_HYPOTHESES_STRUCTURE` | oui | Bureau d'études structure | Bureau de contrôle technique | PDF | Zone sismique, classe du bâtiment, classe de site, charges, matériaux (classes de béton, nuances d'acier), contrainte du sol. |
| Note de calcul (dont vérification sismique) `NOTE_CALCUL_RPS` | oui | Bureau d'études structure | Bureau de contrôle technique | PDF | Descente de charges, fondations, poteaux, poutres, planchers, voiles, vérification RPS 2000 version 2011. |
| Plans de fondations `PLANS_FONDATIONS` | oui | Bureau d'études structure | Bureau de contrôle technique | PDF + DWG | Implantation, semelles ou radier, longrines, niveaux d'assise. |
| Plans de coffrage par niveau `PLANS_COFFRAGE` | oui | Bureau d'études structure | Architecte (maître d'œuvre) | PDF + DWG | Dimensions des éléments, réservations structurelles, niveaux. |
| Plans de ferraillage `PLANS_FERRAILLAGE` | oui | Bureau d'études structure | Bureau de contrôle technique | PDF + DWG | Armatures de chaque élément, recouvrements, cadres resserrés aux nœuds (dispositions parasismiques), enrobages. |
| Visa du bureau de contrôle sur la structure `VISA_BUREAU_CONTROLE_STRUCTURE` | si condition (Bureau de contrôle mandaté) | Bureau de contrôle technique | Architecte (maître d'œuvre) | PDF (avis) | Avis favorable ou réserves à lever avant exécution. |

#### Plans des lots techniques (`J05_02_LOTS_TECHNIQUES`)

Dimensionner et dessiner plomberie, électricité, climatisation et réseaux extérieurs de la parcelle.  Validé par : Architecte (maître d'œuvre). Délai typique : 2 à 6 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plans de plomberie et assainissement `PLANS_PLOMBERIE` | oui | Bureau d'études fluides | Architecte (maître d'œuvre) | PDF + DWG | Alimentation, eau chaude, évacuations eaux usées et pluviales, pentes, regards. |
| Plans d'électricité (courants forts et faibles) `PLANS_ELECTRICITE` | oui | Bureau d'études fluides | Architecte (maître d'œuvre) | PDF + DWG | Implantation des points, tableau, schéma unifilaire, terre, télécom, interphone. |
| Bilan de puissance `BILAN_PUISSANCE` | oui | Bureau d'études fluides | Architecte (maître d'œuvre) | PDF | Puissance à demander au distributeur. |
| Plans de climatisation et ventilation `PLANS_CVC` | si condition (Climatisation prévue, immeuble, équipement) | Bureau d'études fluides | Architecte (maître d'œuvre) | PDF | Unités, liaisons, évacuations des condensats, ventilation des pièces humides. |
| Plans des réseaux extérieurs de la parcelle `PLANS_VRD_PARCELLE` | oui | Architecte (maître d'œuvre) | Bureau d'études fluides | PDF | Branchements eau, électricité, assainissement (ou assainissement autonome), eaux pluviales, piscine. |

#### ⛔ Détails d'architecture et synthèse des réservations (`J05_03_DETAILS_SYNTHESE`)

Dessiner ce qui fait la qualité (étanchéité, menuiseries, escaliers, calepinage) et vérifier que structure et réseaux ne se percutent pas. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre), Bureau d'études structure. Délai typique : 2 à 4 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plans d'exécution architecture `PLANS_EXECUTION_ARCHITECTURE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF + DWG (1/50) | Plans cotés de chaque niveau, cloisons, sols, faux plafonds. |
| Carnet de détails `CARNET_DETAILS` | oui | Architecte (maître d'œuvre) | Bureau de contrôle technique | PDF (1/20 à 1/5) | Acrotères et relevés d'étanchéité, seuils, appuis de fenêtres, escaliers, garde-corps, joints. |
| Tableau des menuiseries `TABLEAU_MENUISERIES` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF ou tableur | Repère, dimensions, matériau, vitrage, sens d'ouverture. |
| Plan de synthèse des réservations `SYNTHESE_RESERVATIONS` | oui | Architecte (maître d'œuvre) | Bureau d'études structure | PDF + DWG | Trémies, fourreaux, gaines techniques reportés sur les plans de coffrage avant coulage. |
| Maquette numérique (BIM) `MAQUETTE_NUMERIQUE` | facultatif | Architecte (maître d'œuvre) | Équipe CITURBAREA (administration de la plateforme) | IFC + fichier natif (Revit) | Facultative en villa ; utile pour la synthèse, le métré et le dossier des ouvrages exécutés. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Plans par niveau, plans de synthèse tous corps d'état, études ascenseur, désenfumage, colonne montante, parking ; la maquette numérique (BIM) devient rentable à partir de R+4.
- *Équipement (établissement recevant du public, public ou privé)* : Études complètes tous lots (CVC, SSI, courants faibles, cuisine collective…) ; en marché public, le dossier d'exécution fait partie du dossier d'appel d'offres.
- *Lotissement / VRD* : Plans d'exécution VRD visés par les concessionnaires (eau, électricité, assainissement) avant les travaux.
- *Rénovation, extension, surélévation* : Plans de renforcement, reprises en sous-œuvre, étaiements provisoires ; relevé précis de l'existant obligatoire avant les plans.

### 6. Métré, consultation des entreprises et marchés

*Code `P06_CONSULTATION_MARCHES` — القياس واستشارة المقاولات والصفقات*

- **Objectif.** Chiffrer précisément, consulter les entreprises par la plateforme, comparer à prestations égales, signer les marchés et mettre en place assurances et cautions.
- **On y entre quand :** Plans d'exécution suffisants pour métrer (au minimum structure et architecture).
- **On en sort quand :** Marché(s) signé(s), assurances obligatoires souscrites, cautions remises, financement débloqué si crédit.
- **Durée typique :** villa 3 à 8 sem., immeuble 6 à 12 sem. Une consultation sérieuse demande 2 à 3 semaines de réponse des entreprises, plus l'analyse et la négociation.
- **Ce qui fait déraper :** Offres trop dispersées faute de DQE commun ; Entreprise choisie sans vérifications (références, assurances, sous-traitance) ; Assurance TRC ou décennale non souscrite ; Accord bancaire tardif.
- **Estimation à ce stade :** Prix du marché signé, prix contractuel ; provision pour aléas 5 à 10 %. DQE quantifié sur plans d'exécution, puis prix des offres retenues (montant du marché).
- **Lots concernés :** tous lots.
- **Textes applicables :** Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) ; Décret 2-22-431 du 08/03/2023 (en vigueur au 01/09/2023), abroge le décret 2-12-349 ; Dahir des obligations et contrats, art. 769 (et 770) ; Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024) ; Arrêté 3201-24 du 20/12/2024 (BO 7365) ; Loi 18-12 (dahir 1-14-190 du 29/12/2014) ; Loi 107-12 modifiant la loi 44-00 (BO du 18/02/2016).

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | métré, CPS, DQE, analyse des offres | rapport d'analyse |
| Entreprise de gros œuvre ou générale | remet son offre par la plateforme | — |
| Entreprise d'un corps d'état | remet son offre (corps d'état séparés) | — |
| Maître d'ouvrage (client) | choisit et signe | attribution, marché |
| Assureur | TRC (maître d'ouvrage), décennale (constructeurs) | polices |
| Banque | crédit et déblocages | accord de financement |
| Équipe CITURBAREA (administration de la plateforme) | organise la consultation sans échange de coordonnées, vérifie les pièces de l'entreprise | conformité administrative |

**Jalons et documents**

#### Métré et DQE (`J06_01_METRE_DQE`)

Quantifier chaque ouvrage et produire un cadre de prix commun à toutes les entreprises.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Métré détaillé `METRE_DETAILLE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur + PDF | Quantités par ouvrage, par niveau et par lot, avec hypothèses écrites. |
| Bordereau des prix unitaires (BPU) `BPU` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur | Désignation de chaque prix, unité ; laissé en blanc pour les entreprises. |
| Détail quantitatif et estimatif (DQE) confidentiel `DQE_ESTIMATIF` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur | Estimation de référence du maître d'ouvrage (± 5 %), jamais transmise aux entreprises. |

#### ⛔ Dossier de consultation prêt (`J06_02_DCE_PRET`)

Arrêter les clauses administratives et techniques avec le client avant de consulter. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Cahier des prescriptions spéciales (CPS) `CPS` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF + DOCX | Clauses administratives (prix, délai, pénalités, retenue de garantie, révision, réception, assurances) et prescriptions techniques par lot. |
| Règlement de la consultation `REGLEMENT_CONSULTATION` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF | Pièces à remettre, critères de choix, date limite ; les questions passent par la messagerie de la plateforme. |
| Planning prévisionnel des travaux `PLANNING_PREVISIONNEL` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF (diagramme) | Délai global, phases, jalons contractuels. |

#### Offres reçues et analysées (`J06_03_OFFRES_ANALYSEES`)

Comparer les offres à prestations égales et négocier par la plateforme.  Validé par : Architecte (maître d'œuvre). Délai typique : 2 à 4 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Offres des entreprises `OFFRES_ENTREPRISES` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | BPU/DQE remplis + mémoire technique (PDF) | Déposées sur la plateforme ; coordonnées des entreprises visibles du seul back-office. |
| Tableau comparatif des offres `TABLEAU_COMPARATIF` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur + PDF | Prix par lot, écarts au DQE confidentiel, prix anormalement bas, délais, réserves. |
| Rapport d'analyse et proposition d'attribution `RAPPORT_ANALYSE_OFFRES` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF | Recommandation motivée. |

#### ⛔ Marché de travaux signé (`J06_04_MARCHE_SIGNE`)

Contractualiser avec la ou les entreprises retenues après vérification de leurs pièces. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Marché (contrat) de travaux `MARCHE_TRAVAUX` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF signé | Pièces contractuelles, montant, délai, pénalités, retenue de garantie, modalités de paiement par situations, sous-traitance. |
| Pièces administratives de l'entreprise `PIECES_ADMINISTRATIVES_ENTREPRISE` | oui | Entreprise de gros œuvre ou générale | Équipe CITURBAREA (administration de la plateforme) | PDF | Registre de commerce, attestation fiscale, attestation CNSS, qualification et classification si exigées. Conservées au back-office. |

#### ⛔ Assurances et cautions en place (`J06_05_ASSURANCES_CAUTIONS`)

Vérifier les assurances obligatoires et les garanties financières avant tout démarrage. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Équipe CITURBAREA (administration de la plateforme). Délai typique : 1 à 3 semaines.

> Pas d'ordre de service de commencer sans attestation TRC (maître d'ouvrage) et décennale (constructeurs) quand le projet y est assujetti, ni sans assurance accidents du travail de l'entreprise.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Police tous risques chantier (TRC) `POLICE_TRC` | si condition (Habitation de plus de 3 étages ou de plus de 800 m², partie non résidentielle de plus de 400 m², bâtiment commercial, industriel, hôtelier ou sportif ; recommandée ailleurs) | Assureur | Équipe CITURBAREA (administration de la plateforme) | PDF | Souscrite par le maître d'ouvrage jusqu'à la réception (code des assurances modifié par la loi 59-13, obligatoire depuis le 30/12/2024). |
| Attestation de responsabilité civile décennale `ATTESTATION_RC_DECENNALE` | si condition (Mêmes seuils que la TRC) | Assureur | Équipe CITURBAREA (administration de la plateforme) | PDF | Pour chaque constructeur (entreprise, architecte, BET) ; exigée ensuite pour le permis d'habiter. |
| Attestation d'assurance de l'architecte `ATTESTATION_RC_PRO_ARCHITECTE` | oui | Assureur | Équipe CITURBAREA (administration de la plateforme) | PDF | Responsabilité professionnelle en cours de validité. |
| Attestation accidents du travail de l'entreprise `ATTESTATION_ASSURANCE_AT` | oui | Entreprise de gros œuvre ou générale | Équipe CITURBAREA (administration de la plateforme) | PDF | Loi 18-12 ; couvre les ouvriers du chantier. |
| Caution définitive (ou retenue) `CAUTION_DEFINITIVE` | si condition (Si prévue au marché) | Entreprise de gros œuvre ou générale | Maître d'ouvrage (client) | PDF (banque) | Garantit la bonne exécution ; 3 % du montant initial en marché public (CCAG-Travaux art. 15), taux libre fixé par le CPS en privé ; la retenue de garantie usuelle est de 10 % de chaque situation plafonnée à 7 %. |
| Caution de restitution d'avance `CAUTION_AVANCE` | si condition (Avance prévue) | Entreprise de gros œuvre ou générale | Maître d'ouvrage (client) | PDF (banque) | Si une avance est versée à la signature. |
| Accord de financement bancaire `ACCORD_FINANCEMENT` | si condition (Crédit) | Banque | Maître d'ouvrage (client) | PDF | Montant, conditions de déblocage par tranches (souvent sur attestation de l'architecte). |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Souvent entreprise générale ou lots groupés ; OPC et coordonnateur sécurité recommandés ; TRC et décennale obligatoires (au-delà de 3 étages ou 800 m²) ; VEFA : réservation puis contrat préliminaire possibles après le permis, paiements par stades et caution d'achèvement ou de restitution (loi 107-12).
- *Équipement (établissement recevant du public, public ou privé)* : Projet public : appel d'offres selon le décret 2-22-431 (publicité, commission d'ouverture des plis, cautionnement provisoire et définitif), CPS conforme au CCAG-Travaux applicable de plein droit.
- *Lotissement / VRD* : Marchés VRD (terrassement, voirie, assainissement, eau, électricité, éclairage, télécom) souvent par lots, sous contrôle des concessionnaires.
- *Rénovation, extension, surélévation* : Consultation en régie ou au forfait ; prévoir une provision plus large (10 à 20 %) pour les découvertes dans l'existant.

### 7. Préparation et ouverture du chantier

*Code `P07_PREPARATION_CHANTIER` — تحضير وافتتاح الورش*

- **Objectif.** Démarrer le chantier en règle : ordre de service, déclaration d'ouverture, cahier de chantier, panneau, installation, implantation contrôlée.
- **On y entre quand :** Marché signé, permis délivré, assurances en place.
- **On en sort quand :** Implantation réceptionnée contradictoirement et conforme au permis ; planning d'exécution validé.
- **Durée typique :** villa 1 à 3 sem., immeuble 2 à 6 sem. Le raccordement provisoire en eau et électricité peut prendre plusieurs semaines : le demander dès le marché signé.
- **Ce qui fait déraper :** Raccordement provisoire en retard (groupe électrogène et citerne en attendant) ; Voisin qui conteste (mitoyenneté, fissures préexistantes non constatées) ; Implantation qui ne respecte pas les reculs du permis.
- **Estimation à ce stade :** Prix du marché signé, montant du marché + provision. Budget de référence = marché signé ; suivi engagé / payé dès l'ordre de service.
- **Lots concernés :** Installation de chantier.
- **Textes applicables :** Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) ; Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 ; Loi 65-99 (code du travail), livre II titre IV ; Loi 83-21 (2023) sur les sociétés régionales multiservices.
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_CHANTIER.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | ordre de service, réunion de démarrage, contrôle d'implantation | implantation |
| Entreprise de gros œuvre ou générale | installation, planning d'exécution, implantation | — |
| Ingénieur géomètre-topographe | implantation des axes et des niveaux | plan d'implantation |
| Commune (guichet unique, président du conseil communal) | reçoit la déclaration d'ouverture | — |
| Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | raccordements provisoires | — |
| Coordonnateur sécurité et santé | plan de sécurité (immeuble) | plan de sécurité |

**Jalons et documents**

#### ⛔ Ordre de service de commencer (`J07_01_ORDRE_SERVICE_COMMENCER`)

Fixer officiellement la date de départ du délai d'exécution. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 jour.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Ordre de service de commencer les travaux `OS_COMMENCER` | oui | Architecte (maître d'œuvre) | Entreprise de gros œuvre ou générale | PDF signé, notifié par la plateforme | Date de démarrage = départ du délai contractuel ; accusé de réception de l'entreprise. |

#### ⛔ Ouverture du chantier déclarée (`J07_02_OUVERTURE_DECLAREE`)

Remplir les obligations de la loi 66-12 : déclaration d'ouverture, panneau, palissade, cahier de chantier. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 7 jours.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Déclaration d'ouverture de chantier `DECLARATION_OUVERTURE_CHANTIER` | oui | Maître d'ouvrage (client) | Commune (guichet unique, président du conseil communal) | Formulaire (Rokhas ou guichet) | Date d'ouverture déclarée à la commune (loi 66-12). |
| Photo du panneau de chantier `PHOTO_PANNEAU_CHANTIER` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | Photo datée | Panneau avec numéro et date du permis, nature des travaux, intervenants (sans coordonnées personnelles). |
| Cahier de chantier ouvert `CAHIER_CHANTIER` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | Registre papier (pièce complémentaire) + copie numérique des pages | Tenu sur le chantier, visé à chaque visite par l'architecte, le BET, le laboratoire ; présenté aux contrôleurs (loi 66-12). |

#### Chantier installé et sécurisé (`J07_03_INSTALLATION`)

Clôturer, raccorder provisoirement, organiser les accès, le stockage et la sécurité.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plan d'installation de chantier `PLAN_INSTALLATION_CHANTIER` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | PDF | Clôture, accès, stockage, baraques, sanitaires, raccordements, grue le cas échéant. |
| Raccordements provisoires eau et électricité `RACCORDEMENT_PROVISOIRE` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | PDF (contrat ou devis du distributeur) | Ou solution de remplacement (groupe, citerne) écrite. |
| Constat de l'état des avoisinants `CONSTAT_AVOISINANTS` | si condition (Mitoyenneté, sous-sol, immeuble) | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF avec photos datées (ou constat d'huissier) | Fissures existantes chez les voisins avant terrassement. |
| Plan de sécurité du chantier `PLAN_SECURITE_CHANTIER` | si condition (Immeuble, équipement, chantier à plusieurs entreprises) | Coordonnateur sécurité et santé | Architecte (maître d'œuvre) | PDF | Risques, protections collectives, EPI, procédure accident. |

#### Réunion de démarrage et planning (`J07_04_REUNION_DEMARRAGE`)

Caler les règles du chantier : planning, circuit des documents, points d'arrêt, réunions, échantillons.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 semaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réunion de démarrage `PV_REUNION_DEMARRAGE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type de l'espace projet, signé en ligne | Intervenants (par rôle), jour des réunions, liste des points d'arrêt, circuit des plans et des situations. |
| Planning d'exécution de l'entreprise `PLANNING_EXECUTION` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | PDF + données (tâches, durées, liens) | Planning détaillé par tâche et par niveau, cohérent avec le délai du marché ; base du Gantt de la plateforme. |
| Planning d'approvisionnement des matériaux `PLANNING_APPROVISIONNEMENT` | facultatif | Équipe CITURBAREA (administration de la plateforme) | Architecte (maître d'œuvre) | Généré par la plateforme | Dates limites de commande par phase (planning d'achat). |

#### ⛔ Implantation réceptionnée (`J07_05_IMPLANTATION`)

Vérifier sur le terrain que les axes, les reculs et les niveaux respectent le permis avant de creuser. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 3 jours.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV d'implantation `PV_IMPLANTATION` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type signé + photos | Axes, reculs par rapport aux limites, niveau de référence (± 0,00) contrôlés contradictoirement. |
| Plan d'implantation du topographe `PLAN_IMPLANTATION_TOPO` | si condition (Immeuble, terrain en pente, limites douteuses ; recommandé partout) | Ingénieur géomètre-topographe | Architecte (maître d'œuvre) | PDF + DWG | Coordonnées des axes et repères. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Constat contradictoire des immeubles voisins (huissier) avant terrassement ; plan d'installation avec grue, palissade, accès ; coordonnateur sécurité et plan de sécurité.
- *Équipement (établissement recevant du public, public ou privé)* : Ordre de service notifié par le maître d'ouvrage public ; réunion de lancement avec l'usager.
- *Lotissement / VRD* : Ouverture du chantier VRD déclarée ; piquetage des voies et des lots par le topographe.
- *Rénovation, extension, surélévation* : Protection des parties conservées, étaiements, constat de l'état initial (photos datées) ; occupants éventuels à informer.

### 8. Terrassement, fondations et sous-sol

*Code `P08_GROS_OEUVRE_INFRASTRUCTURE` — الحفر والأساسات والطابق تحت الأرضي*

- **Objectif.** Réaliser la partie enterrée de l'ouvrage conformément au rapport de sol et aux plans, avec les contrôles avant chaque coulage.
- **On y entre quand :** Implantation réceptionnée.
- **On en sort quand :** Fondations (et sous-sol) achevées, essais de béton conformes, étanchéité des parois enterrées et réseaux sous dallage réceptionnés, remblai compacté.
- **Durée typique :** villa 5 à 12 sem., immeuble 10 à 24 sem. Villa sans sous-sol : 5 à 7 semaines ; avec sous-sol : 9 à 12 semaines. Immeuble avec un sous-sol et soutènement : 3 à 6 mois.
- **Ce qui fait déraper :** Sol différent du rapport (remblai, eau) : fondations à reprendre ; Fouilles inondées par la pluie ou la nappe ; Retard du BET pour la visite avant coulage ; Béton refusé à la livraison ou essais non conformes ; Voisin fragilisé (mitoyenneté).
- **Estimation à ce stade :** Situations et attachements réels, réel. Quantités constatées contradictoirement (attachements) × prix du marché ; écarts au marché suivis lot par lot.
- **Lots concernés :** Terrassement, Fondations, Murs de soutènement et sous-sol, etancheite enterree, plomberie sous dallage, mise a la terre.
- **Textes applicables :** Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) ; NM 10.1.008-2009 (norme d'application obligatoire) ; NM 10.1.004-2019 (norme d'application obligatoire) ; NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (normes d'application obligatoire ; numéros d'arrêtés à vérifier) ; Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier).
- **Missions d'honoraires liées (grille ARC-BATI) :** CTRL_BET.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Entreprise de gros œuvre ou générale | exécute | autocontrôle |
| Architecte (maître d'œuvre) | contrôle la conformité aux plans | réception des fonds de fouille avec le géotechnicien |
| Géotechnicien (laboratoire de sol) | confirme le sol en fond de fouille | fond de fouille |
| Bureau d'études structure | vérifie les ferraillages avant coulage | ferraillage |
| Bureau de contrôle technique | contrôle par sondage, émet des avis | avis |
| Laboratoire d'essais | prélèvements et essais de béton, compactage | essais |
| Fournisseur de matériaux | béton prêt à l'emploi, aciers (certificats) | — |

**Jalons et documents**

#### Terrassement réalisé (`J08_01_TERRASSEMENT`)

Creuser aux cotes des plans, évacuer les déblais et protéger les fouilles.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Attachement des terrassements `ATTACHEMENT_TERRASSEMENT` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | Document type signé | Volumes réellement excavés et évacués, nature des terrains rencontrés. |
| Photos des fouilles `PHOTOS_FOUILLES` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | Photos datées | Vue générale et détails des parois. |

#### ⛔ Fonds de fouille réceptionnés (`J08_02_FONDS_FOUILLE`)

Confirmer que le sol d'assise correspond au rapport géotechnique avant de couler le béton de propreté. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Géotechnicien (laboratoire de sol), Architecte (maître d'œuvre). Délai typique : 1 jour (visite).

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception des fonds de fouille `PV_RECEPTION_FONDS_FOUILLE` | oui | Architecte (maître d'œuvre) | Géotechnicien (laboratoire de sol) | Document type signé + photos | Niveau d'assise, nature du sol, absence d'eau et de remblai ; décision : accepté, approfondir, purger. |

#### ⛔ Ferraillage des fondations réceptionné (`J08_03_FERRAILLAGE_FONDATIONS`)

Contrôler armatures, enrobages, attentes et réservations avant de couler les fondations. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Bureau de contrôle technique. Délai typique : 1 jour (visite).

> Aucun coulage sans PV signé. Déblocage admin seulement avec motif écrit (ex. visite faite mais PV signé hors plateforme).

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Certificats de conformité des aciers `CERTIFICATS_ACIERS` | oui | Fournisseur de matériaux | Architecte (maître d'œuvre) | PDF + photos des étiquettes | Nuance et diamètre conformes aux normes NM d'application obligatoire. |
| PV de réception des armatures avant coulage (fondations) `PV_RECEPTION_FERRAILLAGE_FONDATIONS` | oui | Bureau d'études structure | Bureau de contrôle technique | Document type signé + photos | Conformité au plan, enrobages (cales), recouvrements, attentes des poteaux, boucle de terre et fourreaux en place. |

#### Fondations coulées et essais du béton (`J08_04_COULAGE_ESSAIS`)

Couler avec un béton conforme et prouver sa résistance par des essais.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines ; résultats à 7 et 28 jours.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Bons de livraison du béton `BONS_LIVRAISON_BETON` | oui | Fournisseur de matériaux | Architecte (maître d'œuvre) | Photo ou PDF | Classe de résistance, classe d'exposition, heure de fabrication et d'arrivée, volume. |
| Fiche de prélèvement des éprouvettes `PV_PRELEVEMENT_EPROUVETTES` | oui | Laboratoire d'essais | Architecte (maître d'œuvre) | Document type | Nombre d'éprouvettes, essai d'affaissement, partie d'ouvrage concernée. |
| Résultats d'essais du béton (7 et 28 jours) `RAPPORT_ESSAIS_BETON` | oui | Laboratoire d'essais | Bureau d'études structure | PDF | Résistance mesurée comparée à la classe prescrite ; non-conformité → fiche et décision du BET. |

#### ⛔ Sous-sol et parois enterrées réceptionnés (`J08_05_SOUS_SOL`)

Réaliser voiles contre terre, étanchéité, drainage et plancher haut du sous-sol avec les mêmes contrôles. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Architecte (maître d'œuvre). Délai typique : 4 à 8 semaines par sous-sol. Seulement si : {"sousSol":true}.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception des armatures des voiles `PV_RECEPTION_FERRAILLAGE_VOILES` | oui | Bureau d'études structure | Bureau de contrôle technique | Document type signé + photos | Avant chaque coulage de voile. |
| PV de réception de l'étanchéité des parois enterrées et du drainage `PV_ETANCHEITE_PAROIS_ENTERREES` | oui | Architecte (maître d'œuvre) | Bureau d'études structure | Document type signé + photos | Support, produit, relevés, protection, drain et regards avant remblaiement. |

#### ⛔ Infrastructure achevée (`J08_06_FIN_INFRASTRUCTURE`)

Clore l'infrastructure : réseaux sous dallage testés, remblai compacté, dallage ou plancher bas, essais conformes. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV d'essai des réseaux sous dallage `PV_RESEAUX_SOUS_DALLAGE` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type signé + photos | Écoulement et étanchéité des canalisations avant enrobage. |
| Fiche de compactage des remblais `FICHE_COMPACTAGE` | si condition (Remblai sous dallage ou contre voile) | Laboratoire d'essais | Architecte (maître d'œuvre) | PDF | Essais de compactage par couche. |
| PV de fin d'infrastructure `PV_FIN_INFRASTRUCTURE` | oui | Architecte (maître d'œuvre) | Bureau d'études structure | Document type signé | Synthèse des contrôles, non-conformités levées. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Soutènement provisoire ou définitif (parois, voiles contre terre), rabattement de nappe éventuel, radier général fréquent, plusieurs coulages par zone ; bureau de contrôle présent à chaque point d'arrêt.
- *Équipement (établissement recevant du public, public ou privé)* : Idem immeuble selon la taille ; en marché public, attachements contradictoires signés par le maître d'ouvrage.
- *Lotissement / VRD* : Terrassements généraux, décapage, plateformes de voirie, tranchées de réseaux ; essais de compactage par couche.
- *Rénovation, extension, surélévation* : Reprises en sous-œuvre éventuelles, fondations de l'extension désolidarisées de l'existant (joint), vigilance sur les fondations existantes découvertes.

### 9. Gros œuvre en élévation et mise hors d'eau

*Code `P09_GROS_OEUVRE_ELEVATION` — الأشغال الكبرى فوق الأرض والحماية من المياه*

- **Objectif.** Monter poteaux, voiles et planchers niveau par niveau, puis la maçonnerie et l'étanchéité de toiture, jusqu'à un bâtiment fermé et hors d'eau.
- **On y entre quand :** Infrastructure achevée.
- **On en sort quand :** Gros œuvre réceptionné : structure complète, essais conformes, maçonnerie et acrotères faits, étanchéité de terrasse essayée.
- **Durée typique :** villa 12 à 22 sem., immeuble 24 à 44 sem. Compter 3 à 5 semaines par plancher en villa, 3 à 4 semaines par niveau en immeuble avec rotation des coffrages ; maçonnerie décalée de deux niveaux en immeuble.
- **Ce qui fait déraper :** Désétaiement trop tôt ou étais insuffisants ; Réservations oubliées (percements ensuite dans le béton) ; Pénurie de main-d'œuvre qualifiée (coffreurs, ferrailleurs) ; Hausse du prix de l'acier non prévue au marché ; Mois de Ramadan et été : rendement réduit.
- **Estimation à ce stade :** Situations et attachements réels, réel. Situations mensuelles sur attachements ; contrôle du ratio d'acier et du volume de béton par niveau.
- **Lots concernés :** Structure béton armé (poteaux, poutres, voiles, planchers), Maçonnerie, Étanchéité, Isolation thermique.
- **Textes applicables :** Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) ; NM 10.1.008-2009 (norme d'application obligatoire) ; NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (normes d'application obligatoire ; numéros d'arrêtés à vérifier) ; Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09.
- **Missions d'honoraires liées (grille ARC-BATI) :** CTRL_BET.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Entreprise de gros œuvre ou générale | exécute | autocontrôle |
| Bureau d'études structure | réception des armatures à chaque niveau | ferraillage |
| Bureau de contrôle technique | contrôle et avis | avis |
| Laboratoire d'essais | essais de béton par niveau | essais |
| Entreprise d'un corps d'état | plombier et électricien posent les réservations avant coulage | réservations |
| Architecte (maître d'œuvre) | conformité aux plans et au permis | réception gros œuvre |

**Jalons et documents**

#### ⛔ Poteaux et voiles du niveau réceptionnés (répété par niveau) (`J09_01_POTEAUX_VOILES_NIVEAU`)

Contrôler les armatures et coffrages verticaux de chaque niveau avant coulage. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure. Délai typique : 1 jour (visite) par niveau. Répété à chaque niveau.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception des armatures des poteaux et voiles `PV_RECEPTION_FERRAILLAGE_POTEAUX` | oui | Bureau d'études structure | Bureau de contrôle technique | Document type signé + photos | Cadres resserrés aux extrémités, recouvrements, aplomb des coffrages. |

#### ⛔ Plancher du niveau réceptionné et coulé (répété par niveau) (`J09_02_PLANCHER_NIVEAU`)

Contrôler étaiement, armatures et réservations du plancher, couler, prélever, puis désétayer au bon moment. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Bureau d'études structure, Bureau de contrôle technique. Délai typique : 3 à 5 semaines par niveau (villa). Répété à chaque niveau.

> Point d'arrêt majeur : c'est ici que se jouent la solidité et la sécurité parasismique. Une visite de contrôle de chantier (mission CTRL_BET) par dalle est la base du devis.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiche de contrôle des réservations avant coulage `FICHE_RESERVATIONS_AVANT_COULAGE` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type + photos | Fourreaux, boîtiers, trémies et gaines posés par plombier et électricien. |
| PV de réception des armatures du plancher `PV_RECEPTION_FERRAILLAGE_PLANCHER` | oui | Bureau d'études structure | Bureau de contrôle technique | Document type signé + photos | Poutres, chapeaux, treillis, enrobages, étaiement. |
| Bons de livraison du béton du niveau `BONS_LIVRAISON_BETON_NIVEAU` | oui | Fournisseur de matériaux | Architecte (maître d'œuvre) | Photo ou PDF | Comme en fondations. |
| Résultats d'essais du béton du niveau `RAPPORT_ESSAIS_BETON_NIVEAU` | oui | Laboratoire d'essais | Bureau d'études structure | PDF | 7 et 28 jours. |
| Rapport de visite du bureau de contrôle `RAPPORT_VISITE_BUREAU_CONTROLE` | si condition (Bureau de contrôle mandaté) | Bureau de contrôle technique | Architecte (maître d'œuvre) | PDF | Avis et réserves éventuelles. |

#### Maçonnerie et acrotères (`J09_03_MACONNERIE`)

Monter les murs et cloisons en briques ou agglos avec chaînages et linteaux, et les acrotères prêts pour l'étanchéité.  Validé par : Architecte (maître d'œuvre). Délai typique : 3 à 8 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiche d'autocontrôle maçonnerie `FICHE_AUTOCONTROLE_MACONNERIE` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | Document type + photos | Aplomb, chaînages, linteaux, harpage, ouvertures aux cotes du tableau des menuiseries. |

#### ⛔ Étanchéité de toiture essayée (`J09_04_ETANCHEITE_TERRASSE`)

Poser l'étanchéité sur un support réceptionné et prouver qu'elle tient l'eau avant de la protéger. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception du support d'étanchéité `PV_RECEPTION_SUPPORT_ETANCHEITE` | oui | Architecte (maître d'œuvre) | Entreprise d'un corps d'état | Document type + photos | Pentes (forme de pente), propreté, relevés, angles, évacuations. |
| PV d'essai de mise en eau `PV_ESSAI_MISE_EN_EAU` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type + photos | Durée d'essai et hauteur d'eau selon le CPS (48 h est l'usage) ; contrôle en sous-face. |
| Fiche technique et garantie du produit d'étanchéité `FICHE_TECHNIQUE_ETANCHEITE` | oui | Fournisseur de matériaux | Architecte (maître d'œuvre) | PDF | Produit posé, conditions de garantie. |

#### ⛔ Gros œuvre réceptionné (hors d'eau) (`J09_05_RECEPTION_GROS_OEUVRE`)

Clore le gros œuvre avant de lancer les corps d'état secondaires. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre), Bureau d'études structure. Délai typique : 1 semaine.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Synthèse des essais de béton `SYNTHESE_ESSAIS_BETON` | oui | Laboratoire d'essais | Bureau d'études structure | PDF | Tous niveaux, non-conformités traitées. |
| PV de réception du gros œuvre `PV_RECEPTION_GROS_OEUVRE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type signé | Structure, maçonnerie, étanchéité ; réserves éventuelles. |
| Plans de récolement de la structure `PLAN_RECOLEMENT_STRUCTURE` | facultatif | Bureau d'études structure | Architecte (maître d'œuvre) | PDF + DWG | Modifications d'exécution reportées ; pièce du dossier des ouvrages exécutés. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Cycle répété par niveau (5 à 8 niveaux) ; cage d'ascenseur et escalier en voiles ; contrôle de la verticalité ; gaines techniques ; étanchéité de grande terrasse avec essai par zones.
- *Équipement (établissement recevant du public, public ou privé)* : Grandes portées (poutres précontraintes ou charpente métallique possibles), joints de dilatation, contrôles renforcés.
- *Lotissement / VRD* : Sans objet (VRD) : remplacé par les couches de chaussée, réseaux, bordures, essais des réseaux.
- *Rénovation, extension, surélévation* : Liaison avec l'existant (goujons, joints), surélévation légère si l'existant le permet, protection des parties occupées.

### 10. Second œuvre, équipements et extérieurs

*Code `P10_SECOND_OEUVRE_EQUIPEMENTS` — الأشغال الثانوية والتجهيزات والمحيط الخارجي*

- **Objectif.** Réaliser les réseaux, enduits, menuiseries, revêtements, peintures, équipements et extérieurs, avec les essais avant fermeture des réseaux.
- **On y entre quand :** Gros œuvre hors d'eau (les menuiseries extérieures sont commandées dès les cotes prises).
- **On en sort quand :** Tous les lots terminés, essais de fonctionnement réalisés, nettoyage fait : le bâtiment est prêt pour les opérations préalables à la réception.
- **Durée typique :** villa 16 à 30 sem., immeuble 28 à 52 sem. Les lots se chevauchent ; le chemin critique passe en général par réseaux → enduits → revêtements → peinture, et par les menuiseries aluminium (5 à 8 semaines de fabrication).
- **Ce qui fait déraper :** Choix de finitions tardifs du client (carrelage, sanitaires) ; Délais de fabrication des menuiseries ; Réseaux fermés sans essai ; Coordination entre lots (un lot abîme le travail d'un autre) ; Ascenseur livré en retard (immeuble).
- **Estimation à ce stade :** Situations et attachements réels, réel. Situations mensuelles ; écarts liés aux choix de finitions chiffrés en avenants avant exécution.
- **Lots concernés :** Plomberie sanitaire et eau chaude, Électricité courants forts et faibles, Climatisation, ventilation, Enduits et chapes, Menuiseries extérieures aluminium, Menuiseries intérieures bois, Métallerie, ferronnerie, garde-corps, Faux plafonds, plâtre, staff, Revêtements de sols, Revêtements muraux (faïence, zellige), Peinture, Appareils sanitaires, Ascenseur, Sécurité incendie (détection, désenfumage, extincteurs), Solaire thermique et photovoltaïque, VRD et aménagements extérieurs, Piscine.
- **Textes applicables :** Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 ; Décret 2-14-499 du 15/10/2014 (BO 6306 du 06/11/2014) ; Loi 10-03 (dahir 1-03-58 du 12/05/2003) et décret 2-11-246 ; Loi 24-09.
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_DECO, 3D_INT.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Entreprise d'un corps d'état | plombier, électricien, menuisier, carreleur, peintre, etc. | autocontrôles |
| Fournisseur de matériaux | matériaux et équipements commandés par la plateforme | — |
| Architecte (maître d'œuvre) | échantillons, conformité, coordination des lots | réception par lot |
| Bureau d'études fluides | essais des réseaux | PV d'essais |
| Maître d'ouvrage (client) | choisit les finitions | échantillons |
| Pilote OPC (ordonnancement, pilotage, coordination) | coordination des lots (immeuble) | planning |

**Jalons et documents**

#### Échantillons et choix de finitions validés (`J10_01_ECHANTILLONS_VALIDES`)

Faire choisir et valider par écrit chaque finition avant commande, au bon moment du planning d'achat.  Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : en continu, 2 à 6 semaines avant chaque lot.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiche de validation des échantillons `FICHE_VALIDATION_ECHANTILLONS` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type + photos (référence matériauthèque) | Référence, couleur, quantité, prix ; écart au marché chiffré. |
| Bons de commande des matériaux `BONS_COMMANDE_MATERIAUX` | si condition (Fourniture par le client ou par la plateforme) | Équipe CITURBAREA (administration de la plateforme) | Maître d'ouvrage (client) | Généré par la plateforme | Commandes passées par CITURBAREA auprès des fournisseurs (aucune coordonnée échangée). |

#### ⛔ Réseaux encastrés essayés avant fermeture (`J10_02_RESEAUX_AVANT_FERMETURE`)

Tester plomberie et électricité encastrées et les photographier avant enduits et chapes. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre), Bureau d'études fluides. Délai typique : 1 à 2 jours par niveau.

> Les photos des réseaux avant fermeture sont la mémoire du bâtiment : sans elles, toute fuite future coûte une démolition à l'aveugle.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV d'essai de pression de la plomberie `PV_ESSAI_PRESSION` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type + photo du manomètre | Pression et durée selon le CPS. |
| PV d'essai d'écoulement des évacuations `PV_ESSAI_ECOULEMENT` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Pentes, étanchéité des raccords. |
| Reportage photo des réseaux avant fermeture `PHOTOS_RESEAUX_AVANT_FERMETURE` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Photos datées par pièce | Chaque mur et sol avec un repère métrique. |

#### Enduits, chapes et menuiseries posés (`J10_03_ENDUITS_MENUISERIES`)

Préparer les supports et fermer le bâtiment avec des menuiseries conformes.  Validé par : Architecte (maître d'œuvre). Délai typique : 6 à 12 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiche d'autocontrôle enduits et chapes `FICHE_AUTOCONTROLE_ENDUITS` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Planéité, épaisseur, humidité avant revêtement. |
| PV de réception des menuiseries `PV_RECEPTION_MENUISERIES` | oui | Architecte (maître d'œuvre) | Entreprise d'un corps d'état | Document type + photos | Conformité au tableau, fonctionnement, joints, vitrage ; essai d'arrosage des fenêtres exposées. |

#### Revêtements, faux plafonds et peintures (`J10_04_FINITIONS`)

Réaliser les finitions conformément aux échantillons validés.  Validé par : Architecte (maître d'œuvre). Délai typique : 6 à 12 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Fiches d'autocontrôle des finitions `FICHES_AUTOCONTROLE_FINITIONS` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Documents types | Carrelage (calepinage, joints, planéité), faux plafonds, peinture (nombre de couches). |

#### ⛔ Équipements installés et essayés (`J10_05_EQUIPEMENTS_ESSAYES`)

Mettre en service et essayer chaque équipement avant la réception. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre), Bureau d'études fluides. Délai typique : 1 à 3 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV d'essais électriques (terre, différentiels) `PV_ESSAIS_ELECTRIQUES` | oui | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type + mesures | Valeur de la terre, déclenchement des différentiels, continuité. |
| Attestation de conformité de l'installation électrique `ATTESTATION_CONFORMITE_ELECTRIQUE` | si condition (Selon le distributeur) | Entreprise d'un corps d'état | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | PDF | Souvent demandée par le distributeur pour l'abonnement ; organisme et forme à vérifier localement. |
| PV de mise en service climatisation `PV_MISE_EN_SERVICE_CVC` | si condition (Climatisation) | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Fonctionnement, évacuation des condensats. |
| PV d'essai d'étanchéité gaz `PV_ESSAI_GAZ` | si condition (Installation gaz) | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Réseau gaz intérieur. |
| PV de contrôle de l'ascenseur `PV_CONFORMITE_ASCENSEUR` | si condition (Ascenseur) | Bureau de contrôle technique | Architecte (maître d'œuvre) | PDF | Contrôle par organisme avant mise en service. |
| PV d'essais des installations de sécurité incendie `PV_ESSAIS_SECURITE_INCENDIE` | si condition (Immeuble, ERP) | Bureau de contrôle technique | Architecte (maître d'œuvre) | PDF | Détection, alarme, désenfumage, éclairage de sécurité, extincteurs, RIA. |

#### Extérieurs, VRD de la parcelle et piscine (`J10_06_EXTERIEURS`)

Terminer clôture, portail, aménagements, réseaux extérieurs, piscine et solaire.  Validé par : Architecte (maître d'œuvre). Délai typique : 3 à 8 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception des réseaux extérieurs `PV_RECEPTION_VRD_PARCELLE` | oui | Architecte (maître d'œuvre) | Entreprise d'un corps d'état | Document type + photos | Regards, pentes, raccordement au réseau public ou assainissement autonome. |
| PV d'essai d'étanchéité et de filtration de la piscine `PV_ESSAI_PISCINE` | si condition (Piscine) | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Mise en eau, filtration, sécurité électrique. |
| PV de mise en service solaire (eau chaude, photovoltaïque) `PV_INSTALLATION_SOLAIRE` | si condition (Solaire) | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | Document type | Fixations, raccordements, production. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Second œuvre en cascade, étage par étage ; colonnes montantes, gaines palières, ascenseur (commande 4 à 6 mois avant), sécurité incendie (désenfumage, éclairage de sécurité, extincteurs), pré-câblage télécom, parties communes.
- *Équipement (établissement recevant du public, public ou privé)* : Lots techniques lourds (CVC, SSI, courants faibles, cuisine collective), essais et mises en service contrôlés par le bureau de contrôle.
- *Lotissement / VRD* : Réseaux eau, assainissement, électricité moyenne et basse tension, éclairage public, télécom, chaussées et trottoirs, espaces verts ; essais de pression et inspection des réseaux d'assainissement.
- *Rénovation, extension, surélévation* : Remplacement des réseaux anciens, mise aux normes électriques, raccord des finitions avec l'existant.

### 11. Réception provisoire et levée des réserves

*Code `P11_RECEPTION_PROVISOIRE` — التسلم المؤقت ورفع التحفظات*

- **Objectif.** Constater contradictoirement l'achèvement, lister les défauts (réserves), remettre le dossier des ouvrages exécutés et faire lever les réserves.
- **On y entre quand :** Fin des travaux annoncée par l'entreprise.
- **On en sort quand :** PV de réception provisoire signé (date de départ des garanties) et PV de levée de toutes les réserves.
- **Durée typique :** villa 3 à 12 sem., immeuble 6 à 16 sem. La levée des réserves traîne souvent : fixer un délai par réserve et le suivre.
- **Ce qui fait déraper :** Réserves floues (« reprendre peinture ») sans localisation ; Entreprise qui quitte le chantier une fois payée ; Client qui emménage avant la réception ; Dossier des ouvrages exécutés jamais remis.
- **Estimation à ce stade :** Décompte provisoire puis définitif, réel. Décompte provisoire : marché + avenants − pénalités − retenue de garantie.
- **Lots concernés :** tous lots.
- **Textes applicables :** Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) ; Dahir des obligations et contrats, art. 769 (et 770) ; Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024).
- **Missions d'honoraires liées (grille ARC-BATI) :** HON_CHANTIER.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | organise les opérations préalables, rédige le PV et la liste des réserves | PV |
| Maître d'ouvrage (client) | prononce la réception | PV de réception |
| Entreprise de gros œuvre ou générale | lève les réserves, remet le DOE | — |
| Bureau de contrôle technique | rapport final de contrôle | rapport final |

**Jalons et documents**

#### Opérations préalables à la réception (`J11_01_OPR`)

Visiter tout l'ouvrage avec l'entreprise et dresser la liste des défauts avant la réception.  Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Convocation à la réception `CONVOCATION_RECEPTION` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Notification de la plateforme | Date, heure, intervenants convoqués (par rôle). |
| Liste des réserves `LISTE_RESERVES_OPR` | oui | Architecte (maître d'œuvre) | Entreprise de gros œuvre ou générale | Tableau structuré + photo par réserve | Numéro, localisation (niveau, pièce), lot, description, photo, délai, responsable. |
| Rapport final du bureau de contrôle `RAPPORT_FINAL_BUREAU_CONTROLE` | si condition (Bureau de contrôle mandaté) | Bureau de contrôle technique | Architecte (maître d'œuvre) | PDF | Avis final ; les réserves techniques non levées peuvent être exclues de la garantie (arrêté 3201-24). |

#### ⛔ Réception provisoire prononcée (`J11_02_RECEPTION_PROVISOIRE`)

Signer le PV qui transfère la garde de l'ouvrage au client et fait partir les garanties. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 jour.

> La date de ce PV déclenche automatiquement les rappels : fin de la garantie d'un an, réception définitive, décennale (10 ans).

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception provisoire `PV_RECEPTION_PROVISOIRE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type signé en ligne par client, architecte et entreprise | Avec ou sans réserves ; liste des réserves annexée ; date d'effet. |
| Dossier des ouvrages exécutés (DOE) `DOE` | oui | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | PDF + DWG (et maquette si BIM) | Plans de récolement de tous les lots, notices et garanties des équipements, PV d'essais, fiches techniques des matériaux, photos des réseaux avant fermeture. |
| Décompte provisoire `DECOMPTE_PROVISOIRE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur + PDF | Travaux exécutés, avenants, pénalités, avances, retenue de garantie, reste à payer. |
| PV de remise des clés `PV_REMISE_CLES` | oui | Entreprise de gros œuvre ou générale | Maître d'ouvrage (client) | Document type | Clés, badges, télécommandes, relevés des compteurs. |

#### ⛔ Réserves levées (`J11_03_LEVEE_RESERVES`)

Faire corriger chaque réserve dans son délai et le constater. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre), Maître d'ouvrage (client). Délai typique : 2 à 12 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de levée des réserves `PV_LEVEE_RESERVES` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type signé | Chaque réserve : levée (photo après) ou maintenue (nouveau délai, mise en demeure). |
| Mise en demeure de l'entreprise `MISE_EN_DEMEURE_RESERVES` | si condition (Carence de l'entreprise) | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Courrier type | Si une réserve n'est pas levée dans le délai ; exécution aux frais de l'entreprise prévue au marché. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Réception des parties communes et de chaque logement ; remise aux acquéreurs (VEFA) avec leur propre état des lieux ; rapport final du bureau de contrôle exigé par l'assureur décennal.
- *Équipement (établissement recevant du public, public ou privé)* : Réception par une commission du maître d'ouvrage public (CCAG-Travaux) ; le délai de garantie part de la réception provisoire.
- *Lotissement / VRD* : Réception provisoire des travaux d'équipement par la commune avec l'agence urbaine et les concessionnaires ; elle conditionne la vente des lots et l'éclatement des titres.
- *Rénovation, extension, surélévation* : Réception partielle possible si une partie reste occupée ; réserves à distinguer de l'état de l'existant.

### 12. Conformité, permis d'habiter et raccordements définitifs

*Code `P12_CONFORMITE_PERMIS_HABITER` — المطابقة ورخصة السكن والربط النهائي*

- **Objectif.** Déclarer l'achèvement, obtenir le permis d'habiter (ou le certificat de conformité), raccorder définitivement et, si besoin, éclater les titres.
- **On y entre quand :** Travaux achevés (au plus tard réception provisoire).
- **On en sort quand :** Permis d'habiter ou certificat de conformité délivré, abonnements définitifs eau et électricité ouverts, titres éclatés pour une copropriété.
- **Durée typique :** villa 4 à 12 sem., immeuble 8 à 24 sem. La commission de récolement compare la construction aux plans autorisés : toute différence bloque. L'éclatement des titres d'un immeuble prend souvent plusieurs mois.
- **Ce qui fait déraper :** Construction non conforme au permis (niveau, surface, façade) : régularisation nécessaire ; Pièces techniques manquantes (attestations) ; Commission qui tarde à passer ; Taxes ou contribution non réglées.
- **Estimation à ce stade :** Décompte provisoire puis définitif, réel. Coût final constaté ; frais administratifs et de raccordement ajoutés au bilan.
- **Textes applicables :** Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 ; Décret 2-18-577 du 12/06/2019 (BO FR 6874 du 16/04/2020) — remplace le décret 2-13-424, abrogé ; Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) ; Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024) ; Loi 18-00 (dahir du 03/10/2002), modifiée par la loi 106-12 (dahir 1-16-49 du 27/04/2016) ; Dahir du 12/08/1913 sur l'immatriculation, modifié par la loi 14-07 (à vérifier) ; Loi 83-21 (2023) sur les sociétés régionales multiservices ; Loi 55-19 (dahir 1-20-06 du 06/03/2020) et décrets d'application (2-22-141 ; 2-22-385 à 387) ; Code général des impôts, art. 275 et suivants (à vérifier).
- **Missions d'honoraires liées (grille ARC-BATI) :** PERMIS_HABITER, ATTESTATION_CONFORMITE, REGULARISATION.

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Architecte (maître d'œuvre) | atteste la conformité, constitue et dépose le dossier | attestation de conformité |
| Maître d'ouvrage (client) | déclare l'achèvement, signe la demande | — |
| Commune (guichet unique, président du conseil communal) | commission de récolement, délivrance | permis d'habiter |
| Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | abonnements définitifs | branchement |
| Ingénieur géomètre-topographe | plans de copropriété ou de lots | plans |
| Conservation foncière (ANCFCC) | éclatement des titres | titres |
| Notaire | règlement de copropriété, ventes | actes |

**Jalons et documents**

#### ⛔ Achèvement déclaré et conformité attestée (`J12_01_ACHEVEMENT_DECLARE`)

Déclarer la fin des travaux, fermer le cahier de chantier et attester la conformité au permis. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Architecte (maître d'œuvre). Délai typique : 1 à 2 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Déclaration d'achèvement des travaux `DECLARATION_ACHEVEMENT` | oui | Maître d'ouvrage (client) | Commune (guichet unique, président du conseil communal) | Formulaire (Rokhas) | Déclaration de fin de travaux (loi 66-12). |
| Attestation de conformité de l'architecte `ATTESTATION_CONFORMITE_ARCHITECTE` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | PDF signé | L'architecte atteste que les travaux sont conformes aux plans autorisés ; il ne la signe que si c'est vrai. |
| Cahier de chantier clôturé `CAHIER_CHANTIER_CLOTURE` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | Registre + copie numérique | Toutes les visites consignées. |
| Attestations techniques annexes `ATTESTATIONS_TECHNIQUES` | si condition (Selon la commune et le projet) | Bureau d'études structure | Commune (guichet unique, président du conseil communal) | PDF | Attestation du BET, du bureau de contrôle, de conformité télécom, sécurité incendie, selon la commune et la taille du projet. |

#### ⛔ Permis d'habiter ou certificat de conformité délivré (`J12_02_PERMIS_HABITER`)

Obtenir l'autorisation d'occuper l'immeuble après visite de la commission. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Commune (guichet unique, président du conseil communal). Délai typique : 1 mois réglementaire (art. 55 de la loi 12-90, puis substitution de l'autorité locale) ; 1 à 3 mois en pratique.

> Plus de permis d'habiter partiel selon les consignes récentes du ministère de l'Intérieur (presse, à vérifier). Occuper sans permis d'habiter expose le propriétaire à des sanctions et bloque en pratique l'abonnement définitif et la vente.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Demande de permis d'habiter / certificat de conformité `DEMANDE_PERMIS_HABITER` | oui | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | Formulaire Rokhas + pièces | Avec la déclaration d'achèvement et les attestations. |
| PV de la commission de récolement `PV_COMMISSION_RECOLEMENT` | si condition (Quand l'architecte n'a pas dirigé les travaux ou que la commune organise une visite ; sinon l'attestation de l'architecte remplace le récolement (RGC art. 48 à 52)) | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF | Constat de conformité ou liste des écarts à corriger. |
| Attestation d'assurance décennale jointe à la demande `ATTESTATION_RCD_PERMIS_HABITER` | si condition (Bâtiment assujetti (mêmes seuils que la TRC)) | Assureur | Commune (guichet unique, président du conseil communal) | PDF | Exigée pour le permis d'habiter des bâtiments assujettis à l'assurance construction. |
| Permis d'habiter (ou certificat de conformité) `PERMIS_HABITER` | oui | Commune (guichet unique, président du conseil communal) | Architecte (maître d'œuvre) | PDF officiel | Permis d'habiter pour l'habitation, certificat de conformité pour les autres usages. |

#### Raccordements définitifs (`J12_03_RACCORDEMENTS_DEFINITIFS`)

Ouvrir les abonnements définitifs eau, électricité et assainissement auprès du distributeur.  Validé par : Maître d'ouvrage (client). Délai typique : 2 à 8 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Contrats d'abonnement eau et électricité `CONTRATS_ABONNEMENT` | oui | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | Maître d'ouvrage (client) | PDF | Le distributeur demande en général le permis d'habiter (pratique à vérifier selon le distributeur). |

#### Titres éclatés (copropriété ou lots) (`J12_04_ECLATEMENT_TITRES`)

Créer un titre foncier par appartement ou par lot pour permettre les ventes définitives.  Validé par : Conservation foncière (ANCFCC). Délai typique : 2 à 6 mois. Seulement si : {"types":["IMMEUBLE","LOTISSEMENT"]}.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Plans de copropriété ou de lotissement (géomètre) `PLANS_COPROPRIETE` | oui | Ingénieur géomètre-topographe | Conservation foncière (ANCFCC) | PDF + DWG | Parties privatives et communes, quotes-parts. |
| Règlement de copropriété `REGLEMENT_COPROPRIETE` | si condition (Immeuble en copropriété) | Notaire | Conservation foncière (ANCFCC) | Acte | Selon la loi 18-00 (modifiée par la loi 106-12). |
| Titres fonciers individuels `TITRES_FONCIERS_INDIVIDUELS` | oui | Conservation foncière (ANCFCC) | Notaire | PDF (certificats) | Un titre par lot ou par appartement. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Permis d'habiter de l'immeuble, puis éclatement des titres (plans de copropriété par un géomètre, règlement de copropriété selon la loi 18-00, titres par appartement) indispensable pour les ventes définitives ; syndic à constituer.
- *Équipement (établissement recevant du public, public ou privé)* : Certificat de conformité (et non permis d'habiter) ; visite de conformité de la protection civile pour un ERP avant ouverture au public.
- *Lotissement / VRD* : Après réception provisoire des équipements : dépôt du plan du lotissement à la conservation foncière et création des titres des lots (éclatement) ; les lots peuvent alors être vendus.
- *Rénovation, extension, surélévation* : Certificat de conformité ou permis d'habiter de l'extension ; pour une réfection, simple déclaration d'achèvement selon la commune (à vérifier).

### 13. Année de garantie et réception définitive

*Code `P13_GARANTIE_RECEPTION_DEFINITIVE` — سنة الضمان والتسلم النهائي*

- **Objectif.** Pendant l'année qui suit la réception provisoire, faire réparer les désordres signalés, puis prononcer la réception définitive et libérer retenues et cautions.
- **On y entre quand :** Réception provisoire signée (rappel automatique à 11 mois).
- **On en sort quand :** PV de réception définitive signé, décompte général et définitif arrêté, retenue de garantie restituée, cautions libérées.
- **Durée typique :** villa 52 à 56 sem., immeuble 52 à 60 sem. Délai de garantie habituel : 12 mois (CCAG-Travaux pour les marchés publics, CPS pour le privé).
- **Ce qui fait déraper :** Désordres signalés oralement sans trace ; Entreprise injoignable ou en difficulté ; Retenue restituée trop tôt.
- **Estimation à ce stade :** Décompte provisoire puis définitif, définitif. Décompte général et définitif.
- **Textes applicables :** Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) ; Dahir des obligations et contrats, art. 769 (et 770).

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Maître d'ouvrage (client) | signale les désordres par la plateforme | réception définitive |
| Architecte (maître d'œuvre) | qualifie les désordres, organise la réception définitive | PV |
| Entreprise de gros œuvre ou générale | répare | — |
| Banque | libère les cautions | mainlevée |

**Jalons et documents**

#### Désordres de l'année de garantie suivis (`J13_01_SUIVI_GARANTIE`)

Tracer chaque désordre signalé, sa qualification et sa réparation.  Validé par : Architecte (maître d'œuvre). Délai typique : 12 mois.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Registre des désordres `REGISTRE_DESORDRES` | oui | Maître d'ouvrage (client) | Architecte (maître d'œuvre) | Tableau structuré + photos (plateforme) | Date, description, photo, qualification (garantie, usure, usage), réparation. |

#### ⛔ Réception définitive prononcée (`J13_02_RECEPTION_DEFINITIVE`)

Constater la fin de la garantie et l'absence de désordre non réparé. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client), Architecte (maître d'œuvre). Délai typique : 1 à 4 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| PV de réception définitive `PV_RECEPTION_DEFINITIVE` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Document type signé | Date, désordres réglés. |
| Décompte général et définitif `DECOMPTE_GENERAL_DEFINITIF` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | Tableur + PDF signé | Solde de tout compte entre client et entreprise. |

#### ⛔ Retenue restituée et cautions libérées (`J13_03_GARANTIES_LIBEREES`)

Rendre à l'entreprise ce qui lui revient, et rien avant. **Point d'arrêt** (déblocable par l'admin avec motif). Validé par : Maître d'ouvrage (client). Délai typique : 1 à 4 semaines.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Mainlevée des cautions `MAINLEVEE_CAUTIONS` | si condition (Cautions remises) | Maître d'ouvrage (client) | Banque | Courrier type | Caution définitive, caution de retenue de garantie. |
| Restitution de la retenue de garantie `RESTITUTION_RETENUE` | si condition (Retenue pratiquée) | Maître d'ouvrage (client) | Entreprise de gros œuvre ou générale | Preuve de paiement | Montant retenu sur les situations. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Désordres remontés par le syndic et les acquéreurs ; garantie biennale des équipements prévue par la VEFA (loi 44-00 modifiée, à vérifier).
- *Équipement (établissement recevant du public, public ou privé)* : Réception définitive prononcée par le maître d'ouvrage public, mainlevée du cautionnement définitif et restitution de la retenue selon le CCAG-Travaux.
- *Lotissement / VRD* : Réception définitive des équipements environ un an après la réception provisoire ; les malfaçons de l'année sont reprises aux frais du lotisseur (loi 25-90 modifiée).
- *Rénovation, extension, surélévation* : Identique, sur la partie neuve.

### 14. Vie de l'ouvrage et garantie décennale

*Code `P14_EXPLOITATION_DECENNALE` — حياة البناية والضمان العشري*

- **Objectif.** Accompagner le client pendant les dix ans de responsabilité des constructeurs : entretien, déclaration des désordres graves, archivage.
- **On y entre quand :** Réception (provisoire) : le délai de dix ans court à partir de la réception selon l'usage (point de départ exact à vérifier dans le DOC et la police).
- **On en sort quand :** Fin de la période décennale : dossier archivé.
- **Durée typique :** villa 520 sem., immeuble 520 sem. Dix ans.
- **Ce qui fait déraper :** Désordre grave découvert et non déclaré à temps (certaines sources lisent l'art. 770 du DOC comme imposant d'agir dans les 30 jours du fait ; le contre-audit du CPS du 10/10/2026 conteste cette lecture : à vérifier, et dans le doute agir immédiatement) ; DOE perdu ; Entretien non fait (étanchéité, joints) qui fait perdre la garantie.
- **Estimation à ce stade :** Décompte provisoire puis définitif, —. Coûts d'entretien prévisionnels (facultatif).
- **Textes applicables :** Dahir des obligations et contrats, art. 769 (et 770) ; Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024).

**Qui fait quoi**

| Acteur | Rôle | Valide |
|---|---|---|
| Maître d'ouvrage (client) | entretient, signale | — |
| Assureur | instruit les sinistres décennaux | indemnisation |
| Architecte (maître d'œuvre) | conseille, fournit l'historique | — |
| Équipe CITURBAREA (administration de la plateforme) | archive le dossier, envoie les rappels d'entretien | — |

**Jalons et documents**

#### Dossier d'entretien remis (`J14_01_DOSSIER_EXPLOITATION`)

Donner au client ce qu'il doit entretenir et quand.  Validé par : Architecte (maître d'œuvre). Délai typique : à la réception.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Carnet d'entretien du bâtiment `CARNET_ENTRETIEN` | oui | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | PDF généré | Étanchéité, joints, menuiseries, chauffe-eau, climatisation, piscine, ascenseur : fréquence et rappels. |

#### Suivi des désordres graves (`J14_02_SUIVI_DECENNAL`)

Déclarer immédiatement tout désordre qui menace la solidité ; constituer le dossier pour l'assureur.  Validé par : Architecte (maître d'œuvre). Délai typique : pendant 10 ans.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Déclaration de sinistre à l'assureur décennal `DECLARATION_SINISTRE` | si condition (Désordre grave) | Maître d'ouvrage (client) | Assureur | Courrier + photos + DOE | Envoyée sans attendre après la découverte (délai d'action de l'art. 770 du DOC à vérifier : 30 jours selon certaines sources). |

#### Fin des garanties et archivage (`J14_03_FIN_GARANTIES`)

Clore le dossier en conservant tout l'historique.  Validé par : Équipe CITURBAREA (administration de la plateforme). Délai typique : à 10 ans.

| Document | Obligatoire | Produit par | Validé par | Format | Contenu attendu |
|---|---|---|---|---|---|
| Archive complète du projet `ARCHIVE_DOSSIER` | oui | Équipe CITURBAREA (administration de la plateforme) | Maître d'ouvrage (client) | Export PDF + fichiers | Toutes les pièces, PV, plans, photos et le journal du projet. |

**Écarts selon le type de projet**

- *Immeuble collectif (R+2 à R+8)* : Le syndic porte l'entretien des parties communes et les déclarations ; contrats d'entretien ascenseur et sécurité incendie obligatoires en pratique.
- *Équipement (établissement recevant du public, public ou privé)* : Registre de sécurité et vérifications périodiques des installations (ERP).
- *Lotissement / VRD* : Après transfert, l'entretien des VRD relève de la commune et des concessionnaires.
- *Rénovation, extension, surélévation* : Identique sur la partie neuve.

## 4. Processus transversaux (pendant tout le chantier)

| Processus | Phases | Fréquence | Documents |
|---|---|---|---|
| **Réunions de chantier et comptes rendus** | P07, P08, P09, P10, P11 | hebdomadaire (villa : tous les 7 à 15 jours) | Compte rendu de réunion de chantier (`PV_REUNION_CHANTIER`) : Avancement par lot, décisions, actions avec responsable (rôle) et date, points d'arrêt à venir, photos. |
| **Cahier de chantier et journal de chantier** | P07, P08, P09, P10, P11, P12 | à chaque visite / chaque jour | Journal de chantier numérique (`JOURNAL_CHANTIER`) : Complète le cahier de chantier réglementaire (qui reste le registre officiel). |
| **Attachements, situations et décomptes** | P08, P09, P10, P11, P13 | mensuelle | Attachement contradictoire (`ATTACHEMENT`) : Quantités réalisées constatées ensemble.<br>Situation de travaux (`SITUATION_TRAVAUX`) : Cumul réalisé × prix du marché, déductions (avance, retenue de garantie), montant à payer ; visée par l'architecte avant paiement.<br>Décompte provisoire mensuel (`DECOMPTE_PROVISOIRE_MENSUEL`) : Montant certifié payable par le client.<br>Preuve de paiement (`PREUVE_PAIEMENT`) : Rattachée à la situation. |
| **Ordres de service, avenants et travaux supplémentaires** | P07, P08, P09, P10, P11 | à la demande | Ordre de service (`ORDRE_SERVICE`) : Arrêt, reprise, modification ; signé et notifié par la plateforme.<br>Devis de travaux supplémentaires (`DEVIS_TRAVAUX_SUPPLEMENTAIRES`) : Avant exécution, jamais après.<br>Avenant au marché (`AVENANT`) : Objet, impact sur le prix et sur le délai. |
| **Plan de contrôle, essais et non-conformités** | P08, P09, P10 | selon le plan des points d'arrêt | Plan des points d'arrêt (`PLAN_POINTS_ARRET`) : Liste des contrôles bloquants par niveau et par lot, avec qui valide.<br>Fiche de non-conformité (`FICHE_NON_CONFORMITE`) : Constat, cause, décision (démolir, renforcer, accepter), levée. |
| **Approvisionnement et réception des matériaux** | P06, P07, P08, P09, P10 | selon le planning d'achat | Bon de livraison (`BON_LIVRAISON`) : Quantité, référence, date ; réserves à la livraison.<br>Certificat de conformité ou marquage du produit (`CERTIFICAT_CONFORMITE_PRODUIT`) : Normes NM obligatoires (ciment, aciers, béton prêt à l'emploi), marquage CMIM pour le matériel électrique. |
| **Sécurité du chantier** | P07, P08, P09, P10 | continue | Fiche d'accident ou de presque-accident (`FICHE_ACCIDENT`) : Déclaration de l'accident du travail par l'employeur (loi 18-12). |
| **Reportage photo daté** | P07, P08, P09, P10, P11 | hebdomadaire et à chaque point d'arrêt | Photos d'avancement (`PHOTOS_AVANCEMENT`) : Mêmes points de vue chaque semaine ; sans visage ni plaque d'immatriculation. |

## 5. Parcours particuliers

### Parcours d'un lotissement (aménageur)

| Jalon | Se place après | Point d'arrêt | Validé par | Délai | Documents |
|---|---|---|---|---|---|
| Autorisation de lotir délivrée (`JL_01_AUTORISATION_LOTIR`) — Obtenir l'autorisation de lotir sur dossier (plan de lotissement, VRD, cahier des charges). | P03_APD_ETUDES | oui | Commune (guichet unique, président du conseil communal) | 2 à 6 mois | Dossier de demande d'autorisation de lotir : Plan de lotissement, plans VRD (BET VRD), cahier des charges, certificat de propriété, levé.<br>Autorisation de lotir : Validité de 3, 5, 7, 10 ou 15 ans selon la superficie depuis la loi 34-21 (textes d'application attendus avant août 2027). |
| Travaux d'équipement réalisés (`JL_02_TRAVAUX_EQUIPEMENT`) — Réaliser voirie, assainissement, eau, électricité, éclairage, télécom, espaces verts. | P07_PREPARATION_CHANTIER | non | Architecte (maître d'œuvre), Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | 4 à 18 mois | PV d'essais des réseaux VRD : Pression eau potable, inspection assainissement, essais de chaussée, réception électricité par le distributeur. |
| Réception provisoire des équipements (`JL_03_RECEPTION_PROVISOIRE_EQUIPEMENTS`) — Faire constater par la commission (commune, agence urbaine, concessionnaires) la bonne exécution des équipements. | P10_SECOND_OEUVRE_EQUIPEMENTS | oui | Commune (guichet unique, président du conseil communal) | 1 à 3 mois | PV de réception provisoire des travaux d'équipement : Commission convoquée dans les 30 jours de la déclaration d'achèvement ; verse voirie et réseaux au domaine public communal ; ouvre le droit de vendre les lots et conditionne les permis d'habiter des constructions (loi 12-90, art. 57). |
| Titres des lots établis (`JL_04_ECLATEMENT_TITRES_LOTS`) — Déposer le plan de lotissement et créer un titre par lot. | P11_RECEPTION_PROVISOIRE | non | Conservation foncière (ANCFCC) | 2 à 6 mois | Titres fonciers des lots : Un titre par lot. |
| Réception définitive des équipements (`JL_05_RECEPTION_DEFINITIVE_EQUIPEMENTS`) — Constater la bonne tenue des équipements pendant l'année (voirie et réseaux sont déjà versés au domaine public communal depuis la réception provisoire). | P13_GARANTIE_RECEPTION_DEFINITIVE | oui | Commune (guichet unique, président du conseil communal) | environ un an après la réception provisoire (commission convoquée dans les 30 jours suivant l'année écoulée) | PV de réception définitive des équipements : Libère l'aménageur de l'entretien. |

### Compléments pour une rénovation ou une extension

| Jalon | Se place après | Point d'arrêt | Validé par | Délai | Documents |
|---|---|---|---|---|---|
| Relevé et diagnostic de l'existant (`JR_01_DIAGNOSTIC_EXISTANT`) — Connaître ce qui existe et ce qu'il peut supporter. | P01_FONCIER_FAISABILITE | oui | Bureau d'études structure, Architecte (maître d'œuvre) | 2 à 4 semaines | Relevé de l'existant : Plans, coupes, façades de l'état actuel.<br>Diagnostic de structure : Sondages, ferraillage, capacité à porter une surélévation.<br>Permis et permis d'habiter de l'existant : Pour vérifier que l'existant est régulier. |
| Autorisation adaptée aux travaux (`JR_02_AUTORISATION_ADAPTEE`) — Choisir la bonne procédure : permis de construire, modificatif, réfection, démolition ou régularisation. | P03_APD_ETUDES | oui | Commune (guichet unique, président du conseil communal) | 10 jours ouvrables (réfection) à 3 mois (extension) | Permis de réfection, modificatif, de démolir ou de régularisation : Décret 2-18-475 : réfection en 10 jours ouvrables, validité 6 mois ; démolition délivrée en un mois, validité 6 mois. |

## 6. Lots de travaux : quand on les traite et comment on les chiffre

| Lot | Choisi en | Chiffré finement en | Exécuté en | Codes existants (chiffrage / CPS / référentiel) |
|---|---|---|---|---|
| Installation de chantier | P06 | P06 | P07 | INS / LOT_00_GENERALITES / 82_INSTALLATION_CHANTIER |
| Terrassement | P03 | P05 | P08 | TER / LOT_01_TERRASSEMENT / 83_TERRASSEMENT |
| Fondations | P03 | P05 | P08 | FON / LOT_02_GO_BETON / 84_FONDATIONS |
| Murs de soutènement et sous-sol | P03 | P05 | P08 | FON / LOT_02_GO_BETON / 85_SOUS_SOL |
| Structure béton armé (poteaux, poutres, voiles, planchers) | P02 | P05 | P09 | STR / LOT_02_GO_BETON / 86_PLANCHER |
| Maçonnerie | P02 | P05 | P09 | MAC / LOT_03_MACONNERIE / LOT_MACONNERIE |
| Étanchéité | P03 | P05 | P09 | ETA / LOT_04_ETANCHEITE / LOT_ETANCHEITE |
| Isolation thermique | P03 | P05 | P09/P10 | ETA / LOT_04_ETANCHEITE / LOT_ISOLATION |
| Enduits et chapes | P03 | P05 | P10 | MAC / LOT_03_MACONNERIE / LOT_ENDUITS |
| Façades | P03 | P05 | P10 | FAC / LOT_03_MACONNERIE + LOT_13_PEINTURE / LOT_FACADE |
| Menuiseries extérieures aluminium | P03 | P05 | P10 | ALU / LOT_07_MENUISERIE_EXT_ALU / LOT_MENUISERIE_ALU |
| Menuiseries intérieures bois | P03 | P06 | P10 | BOI / LOT_08_MENUISERIE_INT_BOIS / LOT_MENUISERIE_BOIS |
| Métallerie, ferronnerie, garde-corps | P03 | P05 | P10 | MET / LOT_09_METALLERIE / LOT_FERRONNERIE |
| Faux plafonds, plâtre, staff | P03 | P06 | P10 | FPL / LOT_18_FAUX_PLAFONDS + LOT_19_STAFF_STUC / LOT_FAUX_PLAFOND |
| Revêtements de sols | P03 puis échantillons P10 | P06 | P10 | RSO / LOT_11_REVETEMENTS_SOLS / LOT_CARRELAGE / LOT_REVETEMENT_SOL |
| Revêtements muraux (faïence, zellige) | P03 puis échantillons P10 | P06 | P10 | RMU / LOT_12_REVETEMENTS_MURS / LOT_CARRELAGE |
| Peinture | P03 | P06 | P10 | PEI / LOT_13_PEINTURE / LOT_PEINTURE |
| Plomberie sanitaire et eau chaude | P03 | P05 | P09 (réservations) / P10 | PLO / LOT_14_PLOMBERIE_SANITAIRE + LOT_17_PLOMBERIE_ECS / LOT_PLOMBERIE |
| Appareils sanitaires | P03 puis échantillons P10 | P06 | P10 | PLO / LOT_14_PLOMBERIE_SANITAIRE / LOT_SANITAIRE |
| Électricité courants forts et faibles | P03 | P05 | P08 (terre) / P09 / P10 | ELE + CFA / LOT_15_ELECTRICITE + LOT_20_VDI_COURANTS_FAIBLES / LOT_ELECTRICITE / LOT_DOMOTIQUE |
| Climatisation, ventilation | P03 | P05 | P10 | CVC / LOT_16_CLIMATISATION / LOT_CVC |
| Ascenseur | P02 | P05 | P10 | ASC / LOT_23_ASCENSEUR (gabarit absent) / LOT_ASCENSEUR |
| Sécurité incendie (détection, désenfumage, extincteurs) | P03 | P05 | P10 | — / LOT_22_SSI_DESENFUMAGE (gabarit absent) / LOT_SECURITE_INCENDIE |
| Solaire thermique et photovoltaïque | P03 | P05 | P10 | ENR / LOT_25_PHOTOVOLTAIQUE (gabarit absent) / — |
| VRD et aménagements extérieurs | P03 | P05 | P10 | VRD + EXT / LOT_26_VRD_VOIRIE + LOT_21_ESPACES_VERTS / LOT_AMENAGEMENT_EXT / LOT_PORTAIL_CLOTURE |
| Piscine | P02 | P05 | P10 | EXT / — (absent) / — (jalon 40_DOSSIER_EXECUTION.PIS.01 seulement) |

## 7. Timelines types

### Villa R+1 avec sous-sol, environ 350 m² de plancher, Kénitra ou Rabat, entreprise générale, client décidé

Hypothèses : Terrain immatriculé dans un lotissement autorisé ; Petit projet au sens du règlement général de construction (instruction réglementaire 15 jours, réelle 1 à 3 mois) ; Géotechnique en parallèle de l'esquisse ; Pas de crédit bancaire.

```text
Mois            012345678901234567890123456789012
                █································  * Programme, contrat d'architecte
                ██·······························  * Certificat de propriété, note de renseignements, levé topo
                ·░░······························    Étude géotechnique
                ·██······························  * Esquisse et APS
                ··██·····························  * APD, BET, notices
                ···██····························  * Dossier d'autorisation et dépôt Rokhas
                ····██···························  * Instruction, observations, permis
                ····░░░··························    Études d'exécution (structure, fluides, détails)
                ·····██··························  * Métré, DCE, consultation, marché, assurances
                ·······█·························  * Préparation, déclaration d'ouverture, implantation
                ·······█·························  * Terrassement du sous-sol
                ········█························  * Fondations (radier ou semelles)
                ·········██······················  * Voiles du sous-sol, étanchéité, plancher haut sous-sol
                ··········██·····················  * Poteaux et plancher haut RDC
                ···········██····················  * Poteaux et plancher terrasse R+1
                ············██···················  * Maçonnerie, acrotères, étanchéité terrasse (hors d'eau)
                ·············░░··················    Commande des menuiseries aluminium (fabrication 5 à 8 semaines)
                ·············███·················  * Réseaux encastrés, enduits, chapes
                ···············███···············  * Menuiseries, revêtements, faux plafonds
                ·················██··············  * Peinture, équipements, extérieurs, piscine
                ················░░░░░············    Demande de raccordement définitif (anticipée)
                ··················██·············  * Opérations préalables et réception provisoire
                ···················░░············    Levée des réserves
                ···················██············  * Déclaration d'achèvement, permis d'habiter
                ·····················█···········  * Raccordements définitifs, emménagement
                ···················░░░░░░░░░░░░░·    Année de garantie puis réception définitive
```

█ = tâche du chemin critique, ░ = tâche en parallèle (marge). Graduation : un caractère = un mois (0 = premier contact).

| Tâche | Début (mois) | Fin (mois) | Chemin critique |
|---|---|---|---|
| Programme, contrat d'architecte | M0 | M1 | oui |
| Certificat de propriété, note de renseignements, levé topo | M0.5 | M1.5 | oui |
| Étude géotechnique | M1 | M2.5 | non |
| Esquisse et APS | M1.5 | M2.75 | oui |
| APD, BET, notices | M2.75 | M3.75 | oui |
| Dossier d'autorisation et dépôt Rokhas | M3.75 | M4.25 | oui |
| Instruction, observations, permis | M4.25 | M6 | oui |
| Études d'exécution (structure, fluides, détails) | M4.5 | M6.25 | non |
| Métré, DCE, consultation, marché, assurances | M5.75 | M7 | oui |
| Préparation, déclaration d'ouverture, implantation | M7 | M7.5 | oui |
| Terrassement du sous-sol | M7.5 | M8 | oui |
| Fondations (radier ou semelles) | M8 | M9 | oui |
| Voiles du sous-sol, étanchéité, plancher haut sous-sol | M9 | M10.5 | oui |
| Poteaux et plancher haut RDC | M10.5 | M11.5 | oui |
| Poteaux et plancher terrasse R+1 | M11.5 | M12.5 | oui |
| Maçonnerie, acrotères, étanchéité terrasse (hors d'eau) | M12 | M13.5 | oui |
| Commande des menuiseries aluminium (fabrication 5 à 8 semaines) | M13 | M15 | non |
| Réseaux encastrés, enduits, chapes | M13.5 | M15.5 | oui |
| Menuiseries, revêtements, faux plafonds | M15 | M17.5 | oui |
| Peinture, équipements, extérieurs, piscine | M17 | M18.75 | oui |
| Demande de raccordement définitif (anticipée) | M16 | M20.5 | non |
| Opérations préalables et réception provisoire | M18.75 | M19.25 | oui |
| Levée des réserves | M19.25 | M20.5 | non |
| Déclaration d'achèvement, permis d'habiter | M19.25 | M21 | oui |
| Raccordements définitifs, emménagement | M21 | M21.75 | oui |
| Année de garantie puis réception définitive | M19.25 | M31.25 | non |
| Garantie décennale (10 ans après réception) | M19.25 | M139.25 | non |

**Chemin critique.** Foncier et note de renseignements → APS → APD → instruction du permis → marché → implantation → fondations → sous-sol → planchers (un cycle par niveau) → étanchéité (hors d'eau) → réseaux et enduits → revêtements → peinture → réception → permis d'habiter → raccordement.

**En résumé.** Environ 7 mois d'études et d'autorisation, 11 à 12 mois de chantier, 2 mois de réception et de permis d'habiter : de 18 à 24 mois de l'idée aux clés selon les aléas (fourchette réaliste au Maroc).

### Immeuble R+4 avec un sous-sol (parking), environ 2 000 m² de plancher, Rabat ou Kénitra, promoteur

Hypothèses : Grand projet (commission) ; notice incendie visée par bureau de contrôle ; avis de la protection civile ; Assurances TRC et décennale obligatoires ; Entreprise générale ou lots groupés, OPC mandaté ; Vente en l'état futur d'achèvement possible après permis (loi 107-12, conditions à vérifier).

```text
Mois            01234567890123456789012345678901234567890123
                ██··········································  * Programme, bilan promoteur, contrat d'architecte
                ███·········································  * Foncier, note de renseignements, levé, géotechnique
                ··███·······································  * Esquisse, APS, APD (avec BET et bureau de contrôle)
                ···██·······································  * Notice incendie visée, note RTCM, dossier télécom
                ····████····································  * Dépôt Rokhas, commission grands projets, observations, permis
                ······░░░░··································    Études d'exécution, visa du bureau de contrôle
                ········██··································  * Métré, DCE, consultation, marché, TRC et décennale
                ··········█·································  * Préparation, constat des avoisinants, installation (grue), implantation
                ···········██·······························  * Terrassement et soutènement
                ············██······························  * Fondations (radier)
                ··············██····························  * Sous-sol (voiles, étanchéité, plancher haut)
                ················██████······················  * Structure RDC à R+4 et terrasse (environ 1 mois par niveau)
                ···············░░░░░░·······················    Commande ascenseur (fabrication 4 à 6 mois)
                ··················█████·····················  * Maçonnerie (décalée de deux niveaux), étanchéité terrasse
                ·····················█████████··············  * Second œuvre en cascade par étage, colonnes montantes, parties communes
                ··························░░░░··············    Montage et contrôle de l'ascenseur, sécurité incendie
                ······························█·············  * Opérations préalables et réception provisoire
                ·······························███··········  * Permis d'habiter, raccordements définitifs
                ·······························█████········  * Éclatement des titres, règlement de copropriété, livraisons
                ·······························░░░░░░░░░░░░·    Année de garantie puis réception définitive
```

█ = tâche du chemin critique, ░ = tâche en parallèle (marge). Graduation : un caractère = un mois (0 = premier contact).

| Tâche | Début (mois) | Fin (mois) | Chemin critique |
|---|---|---|---|
| Programme, bilan promoteur, contrat d'architecte | M0 | M1.5 | oui |
| Foncier, note de renseignements, levé, géotechnique | M0.5 | M2.5 | oui |
| Esquisse, APS, APD (avec BET et bureau de contrôle) | M2 | M4.5 | oui |
| Notice incendie visée, note RTCM, dossier télécom | M3.5 | M4.75 | oui |
| Dépôt Rokhas, commission grands projets, observations, permis | M4.75 | M8 | oui |
| Études d'exécution, visa du bureau de contrôle | M6 | M9.5 | non |
| Métré, DCE, consultation, marché, TRC et décennale | M8 | M10 | oui |
| Préparation, constat des avoisinants, installation (grue), implantation | M10 | M11 | oui |
| Terrassement et soutènement | M11 | M12.5 | oui |
| Fondations (radier) | M12.5 | M14 | oui |
| Sous-sol (voiles, étanchéité, plancher haut) | M14 | M16 | oui |
| Structure RDC à R+4 et terrasse (environ 1 mois par niveau) | M16 | M21.5 | oui |
| Commande ascenseur (fabrication 4 à 6 mois) | M15 | M21 | non |
| Maçonnerie (décalée de deux niveaux), étanchéité terrasse | M18 | M23 | oui |
| Second œuvre en cascade par étage, colonnes montantes, parties communes | M21 | M30 | oui |
| Montage et contrôle de l'ascenseur, sécurité incendie | M26 | M29.5 | non |
| Opérations préalables et réception provisoire | M30 | M31 | oui |
| Permis d'habiter, raccordements définitifs | M31 | M33.5 | oui |
| Éclatement des titres, règlement de copropriété, livraisons | M31.5 | M36 | oui |
| Année de garantie puis réception définitive | M31 | M43 | non |

**Chemin critique.** Foncier → APD avec notices visées → commission grands projets → marché → soutènement et fondations → sous-sol → structure niveau par niveau → maçonnerie → second œuvre étage par étage → réception → permis d'habiter → éclatement des titres (qui conditionne les ventes définitives).

**En résumé.** Environ 10 mois d'études et d'autorisation, 20 mois de chantier, 3 à 6 mois de conformité et d'éclatement des titres : de 30 à 38 mois de l'idée aux ventes définitives.

## 8. Livrables par lot et par phase

Le détail complet (125 pièces : contenu minimal, ce qui n'y figure pas encore, producteur, validateur) est dans **`docs/gestion-projet/livrables-par-lot.md`** et dans `livrables[]` du JSON. Carte d'ensemble : nombre de pièces par case (« — » = pas de livrable propre à ce stade).

| Lot | ESQ | APS | APD | AUT | PRO/DCE | EXE | VISA | DOE |
|---|---|---|---|---|---|---|---|---|
| Architecture | 1 | 2 | 2 | 2 | 4 | 3 | 1 | 1 |
| Structure béton armé | — | 1 | 2 | 1 | 3 | 4 | 1 | 1 |
| Terrassement, fondations, soutènements, sous-sol | — | 1 | 1 | — | 2 | 3 | 1 | 1 |
| Voirie et réseaux divers | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 |
| Plomberie sanitaire et assainissement | — | 1 | 1 | 1 | 3 | 3 | 1 | 1 |
| Électricité courants forts | — | 1 | 2 | — | 2 | 4 | 1 | 1 |
| Courants faibles et VDI | — | — | 1 | 1 | 1 | 1 | 1 | 1 |
| Climatisation, chauffage, ventilation | — | 1 | 1 | — | 1 | 1 | 1 | 1 |
| Sécurité incendie | — | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Ascenseurs | — | 1 | 1 | — | 1 | 1 | 1 | 1 |
| Menuiseries (alu, bois, métallerie) | — | — | 1 | — | 2 | 1 | 1 | 1 |
| Étanchéité | — | — | 1 | — | 1 | 1 | 1 | 1 |
| Revêtements et finitions | — | — | 1 | — | 1 | 1 | 1 | 1 |
| Aménagements extérieurs et piscine | 1 | — | 1 | 1 | 1 | 1 | 1 | 1 |
| Solaire et thermique (RTCM) | — | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

Précision de l'estimation : Esquisse ± 25 à 30 % ; Avant-projet sommaire ± 15 à 20 % ; Avant-projet détaillé ± 10 % ; Dossier d'autorisation (Rokhas) ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique) ; Projet et dossier de consultation (PRO/DCE) ± 5 % (DQE confidentiel) ; Exécution et plans d'atelier (EXE, PAC/PEO) ± 3 à 5 % puis prix du marché ; Visa des documents d'exécution et d'atelier prix du marché + avenants ; Dossier des ouvrages exécutés et plans de récolement coût réel (décompte).

Chaque phase du JSON porte aussi `documentsAttendus[]` : la liste complète de ses pièces (documents des jalons, livrables d'études, documents récurrents des processus transversaux, pièces des parcours particuliers), chacune avec `obligatoire` et sa `condition` (exemple : « bureau de contrôle si budget > 5 MDH »). L'écran peut ainsi afficher « Document manquant » pour chaque pièce absente.

## 9. Comparaison des phases d'études

| Phase | Question à laquelle elle répond | Échelles | Ce qui est figé | Ce qui n'existe pas encore | Qui produit | Qui valide | Précision | Rokhas ou privé |
|---|---|---|---|---|---|---|---|---|
| **Esquisse** | Quoi construire et où sur la parcelle ? | 1/200, 1/500 | Implantation, organisation générale, volumétrie | Cotes, structure, réseaux, matériaux | Architecte | Maître d'ouvrage | ± 25 à 30 % | Privé (contrat d'architecte) |
| **Avant-projet sommaire** | Le projet tient-il dans le règlement et le budget ? | 1/100 | Distribution, surfaces, nombre de niveaux, principe structurel | Cotes de détail, dimensions des réseaux, détails | Architecte (BET en avis) | Maître d'ouvrage | ± 15 à 20 % | Privé |
| **Avant-projet détaillé** | Le projet est-il défini au point de pouvoir l'autoriser et le chiffrer ? | 1/100, 1/50 | Cotes, niveaux, trame et système porteur, matériaux par lot, performances thermiques et sécurité, gaines techniques | Armatures, réservations exactes, plans d'atelier, calepinages | Architecte + BET (prédimensionnement) | Maître d'ouvrage | ± 10 % | Privé ; sert de base au dossier Rokhas |
| **Dossier d'autorisation (Rokhas)** | Le projet respecte-t-il les règles d'urbanisme ? | 1/2000 à 1/100 | Ce qui est autorisé : implantation, hauteur, surfaces, façades, affectations (plans « ne varietur ») | Rien de technique : la commune ne contrôle ni la structure ni les réseaux intérieurs | Architecte (signature électronique) | Commune après avis conforme de l'agence urbaine | ± 10 % | Rokhas : pièces de l'arrêté 337-20 modifié |
| **Projet et dossier de consultation (PRO/DCE)** | Que doivent chiffrer les entreprises, à prestations égales ? | 1/50, détails 1/20 | Quantités, prescriptions techniques (CCTP), clauses administratives (CPS), cadre de prix | Méthodes et plans d'atelier des entreprises | Architecte + BET | Maître d'ouvrage | ± 5 % | Privé (marché de travaux) |
| **Exécution et plans d'atelier (EXE, PAC/PEO)** | Comment construire exactement chaque élément ? | 1/50, 1/20, détails 1/10 à 1/5 | Ferraillage, réservations synthétisées, diamètres, calibres, plans d'atelier | — (seules les modifications de chantier viendront) | BET (structure, fluides), architecte (détails, synthèse), entreprises (plans d'atelier) | Bureau de contrôle (au-delà de 5 MDH), architecte | ± 3 à 5 % puis prix du marché | Privé ; plans de structure parfois demandés en pièce complémentaire |
| **Visa des documents d'exécution et d'atelier** | Ce que l'entreprise va fabriquer est-il conforme ? | selon les plans visés | Accord avant fabrication | — | Architecte ; BET pour la structure et les fluides | Bureau de contrôle si mandaté | prix du marché + avenants | Privé |
| **Dossier des ouvrages exécutés et plans de récolement** | Qu'a-t-on réellement construit ? | 1/50 et plus | Mémoire du bâtiment : plans conformes, notices, garanties, PV | — | Entreprises, contrôlées par l'architecte | Architecte, maître d'ouvrage | coût réel | Privé ; l'attestation de conformité de l'architecte sert au permis d'habiter |

### 9.1 APD face au dossier d'exécution

| Critère | APD | Exécution (synthèse, EXE, plans d'atelier) |
|---|---|---|
| Ce qui est figé | Programme, surfaces, cotes principales, niveaux, trame et système porteur, matériaux et gammes, performances (RTCM, incendie), gaines techniques | Tout ce qui permet de construire : sections et positions des armatures, réservations exactes, diamètres et pentes des réseaux, calibres électriques, détails de pose, plans d'atelier |
| Structure | Prédimensionnement (sections approchées, type de fondation) | Note de calcul complète RPS, plans de coffrage et de ferraillage, nomenclature des aciers |
| Réseaux | Implantation des appareils et des points, bilans de principe | Tracés cotés, diamètres, schémas unifilaires et isométriques, notes de calcul |
| Synthèse | Gaines réservées dans les plans | Plan de synthèse : chaque trémie et fourreau reporté sur le coffrage avant coulage |
| Plans d'atelier | Aucun | Menuiseries, métallerie, ascenseur, charpente, préfabriqués : dessinés par l'entreprise, visés par l'architecte ou le BET |
| Échelles | 1/100, quelques 1/50 | 1/50, 1/20, détails 1/10 à 1/5 |
| Estimation | ± 10 % (paramétrique) | ± 3 à 5 % (métré sur plans), puis prix du marché |
| Qui est responsable | L'architecte de la conception ; le BET du principe structurel | Le BET de ses calculs et plans ; l'architecte de la synthèse et des détails ; l'entreprise de ses plans d'atelier et de l'exécution ; le bureau de contrôle donne un avis (il ne remplace pas le BET) |
| Une modification coûte | Peu : on redessine | Cher : nouvelles notes, nouveaux plans, parfois avenant ; après coulage, démolition |

### 9.2 Ce que demandent la commune et l'agence urbaine (Rokhas) face à ce qui relève du marché privé

**Exigé par l'administration via Rokhas :**

- Plans architecturaux réglementaires signés électroniquement par l'architecte (situation, masse, niveaux, façades, coupes)
- Certificat de propriété, demande signée, fiche de renseignements, copie du contrat d'architecte
- Levé topographique
- Notice de sécurité incendie (visée par un bureau de contrôle au-delà des seuils de l'arrêté 1032-21)
- Note de performance énergétique (RTCM)
- Pièces complémentaires avant délivrance : plans de structure, dossier télécom, cahier de chantier, selon la procédure et la commune (à vérifier)
- Visa du conseil régional de l'Ordre compétent pour la commune (décision du fondateur ; forme exacte dans Rokhas à confirmer)
- Taxes communales payées en ligne
- Au permis d'habiter : déclaration d'achèvement, attestation de conformité de l'architecte, attestation décennale si le bâtiment est assujetti, attestation télécom si besoin

**Relève du contrat privé (maître d'ouvrage, architecte, BET, entreprises) :**

- Esquisse, APS, APD et toutes les validations du client
- Notes de calcul et plans d'exécution complets (structure, fluides), synthèse
- CPS, CCTP, BPU, DQE, marché, avenants, ordres de service
- Plans d'atelier et visas
- PV de chantier (fonds de fouille, armatures, essais), situations, réception, DOE
- Bureau de contrôle : obligatoire au-delà de 5 MDH (décision du fondateur), sinon choix du client

> La commune et l'agence urbaine contrôlent la conformité urbanistique (où, combien, quelle hauteur, quel usage), pas la qualité constructive. La solidité relève du BET, de l'architecte, de l'entreprise et, au-delà de 5 MDH, du bureau de contrôle ; la loi 66-12 les rend tous responsables d'une infraction non signalée.

## 10. Durées par type de projet

Semaines, fourchette basse et haute, estimées par un chef de projet au Maroc (hypothèses à remplacer par le planning réel). Certaines étapes se chevauchent (études d'exécution pendant l'instruction, extérieurs pendant les finitions) : le total n'est pas la somme des lignes. Il va de l'idée aux clés, ou aux titres pour un lotissement.

| Type | Total (mois) | Chemin critique |
|---|---|---|
| Villa R+1 sans sous-sol (200 à 300 m²) | 14 à 20 | APS → APD → permis → marché → fondations → 2 planchers → étanchéité → enduits → finitions → réception → permis d'habiter. |
| Villa R+1 avec sous-sol (300 à 450 m²) | 17 à 24 | Géotechnique → APD → permis → marché → terrassement → sous-sol (soutènement, étanchéité) → planchers → hors d'eau → second œuvre → réception → permis d'habiter. |
| Petit immeuble R+2 à R+4 (600 à 1 500 m²) | 26 à 38 | APD → permis → marché et assurances → fondations → structure niveau par niveau → maçonnerie → second œuvre étage par étage → réception → permis d'habiter → éclatement des titres. |
| Immeuble R+5 à R+8 avec 1 à 2 sous-sols (2 000 à 6 000 m²) | 36 à 54 | APD → commission grands projets → marché → soutènement et sous-sols → structure (5 à 9 niveaux) → second œuvre en cascade et ascenseurs → réception → permis d'habiter → titres. |
| Équipement public (école, centre de santé, 1 000 à 3 000 m²) | 30 à 48 | Programmation → désignation de l'architecte → APD approuvé → appel d'offres → approbation du marché → gros œuvre → lots techniques → réception par commission → certificat de conformité. |
| Local commercial ou bureaux (aménagement ou petit bâtiment, 100 à 800 m²) | 5 à 14 | Relevé → APD (sécurité ERP) → autorisation → travaux techniques → certificat de conformité. |
| Lotissement petit (moins de 5 ha, moins de 100 lots) | 18 à 32 | Découpage → APD VRD → autorisation de lotir → plans visés par les distributeurs → travaux d'équipement → réception provisoire → titres (ventes possibles). |
| Lotissement moyen (5 à 30 ha, par tranches) | 30 à 60 | Plan d'ensemble → autorisation de lotir → réseaux structurants → tranche 1 → réception provisoire → titres, puis tranches suivantes. |
| Rénovation légère (sans toucher à la structure ni à la façade) | 3 à 7 | Diagnostic → permis de réfection (valable 6 mois) → travaux → réception. |
| Rénovation lourde ou surélévation | 12 à 24 | Diagnostic → note de renforcement → permis → renforcements → structure neuve → second œuvre → conformité. |
| Extension (nouvelle partie accolée) | 8 à 16 | APD → permis → fondations désolidarisées → gros œuvre → second œuvre → permis d'habiter. |
| Projet industriel ou hangar (charpente métallique, 1 000 à 5 000 m²) | 12 à 24 | APD → autorisation → plans d'atelier → fabrication de la charpente (pendant les fondations) → montage → couverture → lots techniques → certificat de conformité. |

### Villa R+1 sans sous-sol (200 à 300 m²)

Budget indicatif : 1.2 à 3 MDH. Bureau de contrôle : non obligatoire sous 5 MDH (recommandé). **Total : 14 à 20 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Esquisse et APS | Études | 2 – 6 | nombre de variantes, décisions du client |
| APD et notices | Études | 2 – 4 | choix des matériaux |
| Note de renseignements | Administratif | 0.5 – 3 | 2 jours ouvrables réglementaires ; agence urbaine |
| Visa du conseil régional de l'Ordre | Administratif | 0.5 – 2 | conseil compétent selon la commune (à confirmer) |
| Instruction Rokhas et permis (petit projet) | Administratif | 2 – 10 | observations, compléments, taxes |
| Études d'exécution (en parallèle de l'instruction) | Études | 3 – 6 | disponibilité du BET |
| Consultation et marché | Consultation | 3 – 6 | nombre d'entreprises, négociation |
| Terrassement et fondations | Travaux | 4 – 6 | nature du sol, pluie |
| Gros œuvre (2 planchers), maçonnerie, étanchéité | Travaux | 12 – 18 | main-d'œuvre, approvisionnement acier, Ramadan et été |
| Second œuvre (réseaux, enduits, menuiseries) | Travaux | 10 – 16 | délais de fabrication des menuiseries |
| Finitions et équipements | Travaux | 6 – 10 | choix tardifs du client |
| Extérieurs et raccordements (en parallèle) | Travaux | 3 – 6 | piscine, clôture |
| Réception et levée des réserves | Réception | 3 – 8 | réactivité de l'entreprise |
| Permis d'habiter | Administratif | 4 – 10 | 1 mois réglementaire ; conformité au permis |

**Chemin critique :** APS → APD → permis → marché → fondations → 2 planchers → étanchéité → enduits → finitions → réception → permis d'habiter.

### Villa R+1 avec sous-sol (300 à 450 m²)

Budget indicatif : 2 à 5 MDH. Bureau de contrôle : non obligatoire sous 5 MDH ; au-delà, obligatoire. **Total : 17 à 24 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Esquisse et APS | Études | 3 – 7 | décisions du client |
| Étude géotechnique (en parallèle) | Études | 3 – 6 | laboratoire, nappe |
| APD et notices | Études | 3 – 5 | principe de soutènement |
| Note de renseignements | Administratif | 0.5 – 3 | agence urbaine |
| Visa du conseil régional de l'Ordre | Administratif | 0.5 – 2 | à confirmer |
| Instruction Rokhas et permis | Administratif | 3 – 12 | observations |
| Études d'exécution | Études | 4 – 8 | soutènement, synthèse |
| Consultation et marché | Consultation | 3 – 7 | négociation |
| Terrassement, fondations, sous-sol, étanchéité enterrée | Travaux | 9 – 14 | nappe, mitoyens, évacuation des déblais |
| Gros œuvre en élévation, maçonnerie, étanchéité | Travaux | 12 – 18 | main-d'œuvre |
| Second œuvre | Travaux | 10 – 16 | menuiseries |
| Finitions et équipements | Travaux | 6 – 10 | choix du client |
| Extérieurs, piscine, raccordements | Travaux | 4 – 8 | piscine |
| Réception et réserves | Réception | 3 – 8 | entreprise |
| Permis d'habiter | Administratif | 4 – 10 | conformité |

**Chemin critique :** Géotechnique → APD → permis → marché → terrassement → sous-sol (soutènement, étanchéité) → planchers → hors d'eau → second œuvre → réception → permis d'habiter.

### Petit immeuble R+2 à R+4 (600 à 1 500 m²)

Budget indicatif : 3 à 10 MDH. Bureau de contrôle : obligatoire au-delà de 5 MDH (décision du fondateur) ; décennale obligatoire au-delà de 3 étages ou 800 m². **Total : 26 à 38 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Esquisse, APS, bilan promoteur | Études | 4 – 8 | rendement plancher, parking |
| APD avec BET et contrôle | Études | 4 – 8 | notice incendie, RTCM |
| Visa du conseil régional de l'Ordre | Administratif | 0.5 – 2 | à confirmer |
| Instruction Rokhas et permis | Administratif | 6 – 16 | petit ou grand projet selon la commune (à vérifier) ; observations |
| Études d'exécution et visa du contrôle | Études | 6 – 12 | allers-retours avec le bureau de contrôle |
| Consultation, marché, TRC et décennale | Consultation | 4 – 8 | assureur |
| Terrassement, fondations (et sous-sol éventuel) | Travaux | 6 – 16 | sous-sol, mitoyens |
| Structure (3 à 4 semaines par niveau), maçonnerie, étanchéité | Travaux | 16 – 28 | nombre de niveaux, rotation des coffrages |
| Second œuvre en cascade par étage | Travaux | 20 – 32 | coordination des lots |
| Finitions, parties communes, ascenseur | Travaux | 8 – 14 | ascenseur, choix des acquéreurs |
| Raccordements et abords | Travaux | 4 – 8 | distributeur |
| Réception et réserves (communs et logements) | Réception | 4 – 10 | nombre de logements |
| Permis d'habiter, attestation décennale, éclatement des titres | Administratif | 8 – 26 | plans de copropriété, conservation foncière |

**Chemin critique :** APD → permis → marché et assurances → fondations → structure niveau par niveau → maçonnerie → second œuvre étage par étage → réception → permis d'habiter → éclatement des titres.

### Immeuble R+5 à R+8 avec 1 à 2 sous-sols (2 000 à 6 000 m²)

Budget indicatif : 10 à 40 MDH. Bureau de contrôle : obligatoire. **Total : 36 à 54 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Esquisse, APS, bilan | Études | 6 – 12 | programme, montage financier |
| APD complet (incendie, accessibilité, ascenseurs, parkings) | Études | 6 – 12 | bureau de contrôle |
| Visa du conseil régional de l'Ordre | Administratif | 0.5 – 2 | à confirmer |
| Commission grands projets, permis | Administratif | 10 – 24 | commission, avis, pièces complémentaires |
| Études d'exécution, synthèse, visa du contrôle | Études | 10 – 16 | complexité, BIM |
| Consultation, marché, assurances | Consultation | 6 – 10 | entreprise générale ou lots |
| Terrassement, soutènement, 1 à 2 sous-sols | Travaux | 16 – 30 | nappe, parois, mitoyens |
| Structure (3 à 4 semaines par niveau), maçonnerie | Travaux | 28 – 44 | grue, coffrages, main-d'œuvre |
| Second œuvre en cascade | Travaux | 32 – 52 | coordination (OPC) |
| Finitions, ascenseurs, sécurité incendie | Travaux | 10 – 18 | ascenseurs (fabrication 4 à 6 mois) |
| Raccordements, poste de transformation | Travaux | 8 – 20 | distributeur |
| Réception et réserves | Réception | 6 – 12 | nombre de logements |
| Permis d'habiter, éclatement des titres | Administratif | 12 – 30 | conservation foncière |

**Chemin critique :** APD → commission grands projets → marché → soutènement et sous-sols → structure (5 à 9 niveaux) → second œuvre en cascade et ascenseurs → réception → permis d'habiter → titres.

### Équipement public (école, centre de santé, 1 000 à 3 000 m²)

Budget indicatif : 5 à 30 MDH. Bureau de contrôle : obligatoire (marché public, au-delà de 5 MDH). **Total : 30 à 48 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Programmation et désignation de l'architecte (concours ou consultation) | Études | 8 – 24 | procédure du maître d'ouvrage public |
| Esquisse et APS validés par le maître d'ouvrage | Études | 6 – 12 | commissions de validation |
| APD | Études | 6 – 12 | normes du ministère de tutelle |
| Autorisation (grand projet) | Administratif | 6 – 16 | commission |
| Dossier d'appel d'offres (CPS conforme au CCAG-Travaux) | Études | 6 – 12 | contrôle des pièces |
| Appel d'offres (décret 2-22-431), jugement, approbation, OS | Consultation | 8 – 16 | délais de publicité et d'approbation (à vérifier) |
| Gros œuvre | Travaux | 20 – 36 | taille, attachements |
| Second œuvre et lots techniques | Travaux | 20 – 32 | lots séparés |
| VRD et abords | Travaux | 6 – 12 | réseaux |
| Réception provisoire par commission | Réception | 2 – 8 | commission |
| Certificat de conformité, visite de sécurité | Administratif | 4 – 12 | protection civile |

**Chemin critique :** Programmation → désignation de l'architecte → APD approuvé → appel d'offres → approbation du marché → gros œuvre → lots techniques → réception par commission → certificat de conformité.

### Local commercial ou bureaux (aménagement ou petit bâtiment, 100 à 800 m²)

Budget indicatif : 0.3 à 5 MDH. Bureau de contrôle : selon budget (au-delà de 5 MDH) et ERP. **Total : 5 à 14 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Relevé, esquisse et APS | Études | 2 – 4 | existant |
| APD, incendie et accessibilité si ERP | Études | 2 – 6 | classement ERP |
| Autorisation (réfection, modificatif ou construire) | Administratif | 2 – 12 | nature des travaux |
| Consultation | Consultation | 2 – 4 | corps d'état |
| Travaux d'aménagement | Travaux | 8 – 24 | lots techniques, enseigne |
| Réception | Réception | 1 – 4 | — |
| Certificat de conformité | Administratif | 4 – 10 | visite de sécurité si ERP |

**Chemin critique :** Relevé → APD (sécurité ERP) → autorisation → travaux techniques → certificat de conformité.

### Lotissement petit (moins de 5 ha, moins de 100 lots)

Budget indicatif : 3 à 20 MDH. Bureau de contrôle : selon budget (au-delà de 5 MDH). **Total : 18 à 32 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Plan de découpage, topographie, géotechnique | Études | 6 – 12 | terrain |
| APD VRD et consultation des distributeurs | Études | 6 – 12 | capacité des réseaux |
| Autorisation de lotir | Administratif | 8 – 24 | commission, avis des distributeurs |
| Exécution VRD visée par les distributeurs | Études | 6 – 12 | distributeurs |
| Marchés VRD | Consultation | 4 – 8 | lots |
| Travaux d'équipement | Travaux | 26 – 52 | réseaux électriques, pluie |
| Réception provisoire des équipements | Réception | 4 – 12 | commission convoquée dans les 30 jours |
| Titres des lots | Administratif | 8 – 24 | conservation foncière |
| Réception définitive (environ un an après) | Réception | 52 – 60 | malfaçons de l'année |

**Chemin critique :** Découpage → APD VRD → autorisation de lotir → plans visés par les distributeurs → travaux d'équipement → réception provisoire → titres (ventes possibles).

### Lotissement moyen (5 à 30 ha, par tranches)

Budget indicatif : 20 à 150 MDH. Bureau de contrôle : obligatoire. **Total : 30 à 60 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Plan d'ensemble et tranches | Études | 10 – 20 | concertation agence urbaine |
| APD VRD | Études | 8 – 16 | réseaux structurants |
| Autorisation de lotir (validité selon superficie, loi 34-21) | Administratif | 12 – 36 | grandes opérations |
| Exécution VRD par tranche | Études | 8 – 16 | distributeurs |
| Marchés VRD | Consultation | 6 – 12 | tranches |
| Travaux d'équipement par tranche | Travaux | 52 – 104 | postes, assainissement |
| Réceptions provisoires par tranche | Réception | 8 – 16 | commission |
| Titres | Administratif | 12 – 30 | volume |

**Chemin critique :** Plan d'ensemble → autorisation de lotir → réseaux structurants → tranche 1 → réception provisoire → titres, puis tranches suivantes.

### Rénovation légère (sans toucher à la structure ni à la façade)

Budget indicatif : 0.1 à 1 MDH. Bureau de contrôle : non. **Total : 3 à 7 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Relevé et diagnostic | Études | 1 – 2 | accès |
| Projet et descriptif | Études | 2 – 4 | choix du client |
| Permis de réfection (10 jours ouvrables) | Administratif | 2 – 4 | commune |
| Consultation | Consultation | 1 – 3 | — |
| Travaux | Travaux | 4 – 16 | découvertes dans l'existant |
| Réception | Réception | 1 – 2 | — |

**Chemin critique :** Diagnostic → permis de réfection (valable 6 mois) → travaux → réception.

### Rénovation lourde ou surélévation

Budget indicatif : 0.8 à 6 MDH. Bureau de contrôle : au-delà de 5 MDH ; recommandé pour toute surélévation. **Total : 12 à 24 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Relevé, diagnostic structure, sondages | Études | 3 – 6 | accès aux fondations |
| APS et APD | Études | 4 – 8 | capacité de l'existant |
| Permis de construire ou modificatif (régularisation éventuelle) | Administratif | 6 – 16 | régularité de l'existant |
| Études de renforcement | Études | 4 – 8 | reprises en sous-œuvre |
| Consultation | Consultation | 3 – 6 | — |
| Démolitions, renforcements, structure neuve | Travaux | 8 – 20 | étaiements, occupants |
| Second œuvre et finitions | Travaux | 10 – 24 | raccords avec l'existant |
| Réception | Réception | 2 – 6 | — |
| Permis d'habiter ou certificat de conformité | Administratif | 4 – 12 | conformité |

**Chemin critique :** Diagnostic → note de renforcement → permis → renforcements → structure neuve → second œuvre → conformité.

### Extension (nouvelle partie accolée)

Budget indicatif : 0.4 à 3 MDH. Bureau de contrôle : selon budget. **Total : 8 à 16 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Relevé et esquisse | Études | 2 – 4 | existant |
| APD et structure | Études | 2 – 5 | joint avec l'existant |
| Permis de construire | Administratif | 4 – 12 | COS, reculs |
| Consultation | Consultation | 2 – 4 | — |
| Fondations et gros œuvre | Travaux | 6 – 14 | accès |
| Second œuvre et raccords | Travaux | 8 – 16 | — |
| Réception | Réception | 1 – 4 | — |
| Permis d'habiter | Administratif | 4 – 10 | — |

**Chemin critique :** APD → permis → fondations désolidarisées → gros œuvre → second œuvre → permis d'habiter.

### Projet industriel ou hangar (charpente métallique, 1 000 à 5 000 m²)

Budget indicatif : 3 à 30 MDH. Bureau de contrôle : obligatoire au-delà de 5 MDH ; décennale (bâtiment industriel). **Total : 12 à 24 mois.**

| Étape | Nature | Semaines (bas – haut) | Ce qui fait varier |
|---|---|---|---|
| Programme industriel et esquisse | Études | 3 – 6 | process |
| APD, incendie, charpente | Études | 4 – 8 | classement de l'activité |
| Autorisation (grand projet ; étude d'impact si activité classée, à vérifier) | Administratif | 8 – 24 | zone industrielle, CRI |
| Exécution et plans d'atelier de charpente | Études | 6 – 12 | charpentier |
| Consultation | Consultation | 4 – 8 | acier |
| Fondations et dallage industriel (fabrication de la charpente en parallèle) | Travaux | 6 – 12 | planéité du dallage |
| Montage charpente, couverture, bardage | Travaux | 8 – 16 | levage, vent |
| Lots techniques (électricité, incendie, process) | Travaux | 8 – 16 | puissance électrique |
| VRD, voiries lourdes | Travaux | 6 – 12 | réseaux |
| Réception | Réception | 2 – 6 | — |
| Certificat de conformité, visite de sécurité | Administratif | 4 – 12 | protection civile |

**Chemin critique :** APD → autorisation → plans d'atelier → fabrication de la charpente (pendant les fondations) → montage → couverture → lots techniques → certificat de conformité.

## 11. Normes et règles techniques

39 normes et règles, 86 exigences concrètes (conception, exécution, essais), chacune rattachée à ses phases et à ses lots : voir **`docs/gestion-projet/normes-et-checklists-chantier.md`** et `normes[]` du JSON.

| Norme | Statut | Phases | Lots |
|---|---|---|---|
| RPS 2000 version 2011 (décret 2-02-177 ; modificatif 2-12-682 à vérifier ; zonage révisé 2-24-766 à vérifier) | partiellement vérifié | P03, P05, P08, P09 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| Décret 2-12-666 du 28/05/2013 (RPCTerre) | vérifié | P05 | Structure béton armé |
| Décret 2-13-874 du 15/10/2014 (RTCM), loi 47-09 | vérifié | P02, P03, P04, P05, P10 | Solaire et thermique (RTCM), Menuiseries (alu, bois, métallerie), Étanchéité |
| NM 10.1.008-2009 (norme d'application obligatoire) | vérifié | P05, P06, P08, P09 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| NM 10.1.004-2019 (obligatoire) | vérifié | P05, P08, P09, P10 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol, Revêtements et finitions |
| NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (obligatoires ; arrêtés à vérifier) | partiellement vérifié | P05, P08, P09 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| NM 10.1.271 (granulats pour bétons, référence à vérifier) | à vérifier | P08, P09 | Structure béton armé |
| Eau de gâchage : NM correspondante à EN 1008 (référence à vérifier) | à vérifier | P08, P09 | Structure béton armé |
| BAEL 91 modifié 99 (règles françaises) | partiellement vérifié | P03, P05 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| NF EN 1992-1-1 (Eurocode 2) | partiellement vérifié | P05 | Structure béton armé |
| NF DTU 13.1 Fondations superficielles | partiellement vérifié | P08 | Terrassement, fondations, soutènements, sous-sol |
| NF DTU 13.3 Dallages | partiellement vérifié | P08 | Terrassement, fondations, soutènements, sous-sol, Revêtements et finitions |
| NF DTU 20.1 Maçonnerie de petits éléments | partiellement vérifié | P09 | Architecture |
| NF DTU 21 Exécution des ouvrages en béton | partiellement vérifié | P08, P09 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| NF DTU 26.1 Enduits aux mortiers | partiellement vérifié | P10 | Revêtements et finitions |
| NF DTU 43.1 Étanchéité des toitures-terrasses | partiellement vérifié | P05, P09 | Étanchéité |
| NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | partiellement vérifié | P10 | Revêtements et finitions |
| NF DTU 55.2 Revêtements muraux attachés en pierre mince | à vérifier | P10 | Revêtements et finitions |
| NF DTU 59.1 Peinture | partiellement vérifié | P10 | Revêtements et finitions |
| NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | partiellement vérifié | P05, P10 | Plomberie sanitaire et assainissement |
| NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | à vérifier | P05, P10 | Climatisation, chauffage, ventilation |
| NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | partiellement vérifié | P05, P10 | Menuiseries (alu, bois, métallerie) |
| NF DTU 25.41 (plaques de plâtre) et 58.1 (plafonds suspendus) | à vérifier | P10 | Revêtements et finitions |
| NF P01-012 Garde-corps | partiellement vérifié | P05, P10 | Menuiseries (alu, bois, métallerie), Architecture |
| NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | à vérifier | P05, P08, P10 | Électricité courants forts, Aménagements extérieurs et piscine |
| Règles du distributeur (ONEE, société régionale multiservices, Redal, Lydec, Amendis) et NF C 14-100 en référence | à vérifier | P05, P12 | Électricité courants forts, Voirie et réseaux divers |
| Loi 24-09 (marquage CMIM) | vérifié | P10 | Électricité courants forts, Plomberie sanitaire et assainissement |
| Décret 2-14-499 du 15/10/2014 et exigences de la protection civile | partiellement vérifié | P03, P04, P05, P10, P12 | Sécurité incendie, Architecture, Électricité courants forts, Climatisation, chauffage, ventilation |
| Loi 10-03 et décret 2-11-246 (arrêté technique à vérifier) | partiellement vérifié | P03, P05, P11 | Architecture, Ascenseurs, Voirie et réseaux divers |
| Règlements de service et cahiers des prescriptions des distributeurs (ONEE, sociétés régionales multiservices, Redal, Lydec, Amendis) | à vérifier | P05, P10, P12 | Voirie et réseaux divers, Plomberie sanitaire et assainissement |
| Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | à vérifier | P05, P10 | Voirie et réseaux divers, Aménagements extérieurs et piscine |
| NM EN 81-20 et 81-50 (construction et essais des ascenseurs), NM EN 81-70 (accessibilité) — homologation NM à vérifier | à vérifier | P03, P05, P10 | Ascenseurs |
| NF P 94-500 (missions géotechniques), essais pressiométriques et pénétrométriques, Proctor et plaque (références françaises en usage, homologation NM à vérifier) | à vérifier | P01, P08 | Terrassement, fondations, soutènements, sous-sol, Voirie et réseaux divers |
| Essais du béton frais et durci (NM et EN 12350 / 12390 homologuées NM, références à vérifier) et contrôle de conformité de la NM 10.1.008 | partiellement vérifié | P08, P09 | Structure béton armé, Terrassement, fondations, soutènements, sous-sol |
| Essai de mise en eau des toitures et des bassins (DTU 43.1, CPS) | partiellement vérifié | P09, P10 | Étanchéité, Aménagements extérieurs et piscine |
| Épreuve des réseaux d'eau (DTU 60.1, CPS) | à vérifier | P10 | Plomberie sanitaire et assainissement, Climatisation, chauffage, ventilation |
| Mesure de la prise de terre (NF C 15-100) | à vérifier | P08, P10 | Électricité courants forts |
| Code du travail (loi 65-99, hygiène et sécurité) et loi 18-12 | vérifié | P07, P08, P09, P10 | Architecture, Structure béton armé |
| Règle de Blondel (règle de l'art) | vérifié | P03, P05, P09 | Architecture, Structure béton armé |

## 12. Checklists de chantier (PV du logiciel)

21 checklists, 142 points de contrôle numérotés dont 82 points d'arrêt : voir **`docs/gestion-projet/normes-et-checklists-chantier.md`** et `checklistsChantier[]` du JSON.

| Checklist | Phase | Jalon | Points | Dont points d'arrêt |
|---|---|---|---|---|
| Installation de chantier (`CL01_INSTALLATION_CHANTIER`) | Préparation et ouverture du chantier | `J07_03_INSTALLATION` | 8 | 2 |
| Implantation (`CL02_IMPLANTATION`) | Préparation et ouverture du chantier | `J07_05_IMPLANTATION` | 5 | 4 |
| Terrassement et fonds de fouille (`CL03_TERRASSEMENT_FONDS_FOUILLE`) | Terrassement, fondations et sous-sol | `J08_02_FONDS_FOUILLE` | 6 | 4 |
| Fondations : ferraillage avant coulage (`CL04_FONDATIONS_AVANT_COULAGE`) | Terrassement, fondations et sous-sol | `J08_03_FERRAILLAGE_FONDATIONS` | 9 | 8 |
| Soutènements et sous-sol (drainage, étanchéité, cuvelage) (`CL05_SOUTENEMENT_SOUS_SOL`) | Terrassement, fondations et sous-sol | `J08_05_SOUS_SOL` | 7 | 7 |
| Dallage et hérisson (`CL06_DALLAGE_HERISSON`) | Terrassement, fondations et sous-sol | `J08_06_FIN_INFRASTRUCTURE` | 6 | 2 |
| Poteaux, poutres et planchers (par niveau) (`CL07_POTEAUX_POUTRES_PLANCHERS`) | Gros œuvre en élévation et mise hors d'eau | `J09_02_PLANCHER_NIVEAU` | 15 | 9 |
| Maçonnerie (`CL08_MACONNERIE`) | Gros œuvre en élévation et mise hors d'eau | `J09_03_MACONNERIE` | 6 | 1 |
| Réseaux encastrés (électricité, plomberie) avant enduits (`CL09_RESEAUX_AVANT_ENDUITS`) | Second œuvre, équipements et extérieurs | `J10_02_RESEAUX_AVANT_FERMETURE` | 8 | 8 |
| Enduits (`CL10_ENDUITS`) | Second œuvre, équipements et extérieurs | `J10_03_ENDUITS_MENUISERIES` | 5 | 1 |
| Étanchéité des terrasses (essai de mise en eau) (`CL11_ETANCHEITE_TERRASSE`) | Gros œuvre en élévation et mise hors d'eau | `J09_04_ETANCHEITE_TERRASSE` | 8 | 6 |
| Menuiseries (`CL12_MENUISERIES`) | Second œuvre, équipements et extérieurs | `J10_03_ENDUITS_MENUISERIES` | 7 | 2 |
| Revêtements (sols, murs, faux plafonds, peinture) (`CL13_REVETEMENTS`) | Second œuvre, équipements et extérieurs | `J10_04_FINITIONS` | 7 | 1 |
| Climatisation, chauffage, ventilation (`CL14_CVC`) | Second œuvre, équipements et extérieurs | `J10_05_EQUIPEMENTS_ESSAYES` | 5 | 1 |
| Essais des réseaux (avant réception) (`CL15_ESSAIS_RESEAUX`) | Second œuvre, équipements et extérieurs | `J10_05_EQUIPEMENTS_ESSAYES` | 9 | 6 |
| VRD et raccordements (`CL16_VRD_RACCORDEMENTS`) | Second œuvre, équipements et extérieurs | `J10_06_EXTERIEURS` | 7 | 5 |
| Piscine (`CL17_PISCINE`) | Second œuvre, équipements et extérieurs | `J10_06_EXTERIEURS` | 6 | 4 |
| Pré-réception (opérations préalables) (`CL18_PRE_RECEPTION`) | Réception provisoire et levée des réserves | `J11_01_OPR` | 5 | 2 |
| Réception provisoire avec réserves (`CL19_RECEPTION_PROVISOIRE`) | Réception provisoire et levée des réserves | `J11_02_RECEPTION_PROVISOIRE` | 5 | 3 |
| Levée des réserves (`CL20_LEVEE_RESERVES`) | Réception provisoire et levée des réserves | `J11_03_LEVEE_RESERVES` | 3 | 2 |
| Réception définitive (`CL21_RECEPTION_DEFINITIVE`) | Année de garantie et réception définitive | `J13_02_RECEPTION_DEFINITIVE` | 5 | 4 |

## 13. Textes et réglementations

Statut : **vérifié** = texte officiel lu ou référence confirmée par une source fiable ; **partiellement vérifié** = référence sûre mais détails tirés de la presse ou de la doctrine ; **à vérifier** = à relire avant tout usage contractuel. Vérification faite le 15/10/2026.

| Texte | Objet | Ce que cela impose concrètement | Statut |
|---|---|---|---|
| Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 | Urbanisme | Permis de construire obligatoire en commune urbaine, centre délimité et zones périphériques (art. 40), délivré par le président du conseil communal (art. 41) ; silence de 2 mois = permis réputé accordé (art. 48) ; permis périmé si les fondations ne commencent pas dans l'année (art. 49) ; architecte inscrit à l'Ordre et ingénieurs obligatoires (art. 50 à 53), l'architecte suit le chantier jusqu'au permis d'habiter ; à 150 m² de plancher ou moins, l'architecte n'est obligatoire que pour la conception (art. 54) ; permis d'habiter ou certificat de conformité obligatoire avant usage, l'attestation de l'architecte peut remplacer le récolement, délai d'un mois puis substitution de l'autorité locale (art. 55) ; dans un lotissement, pas de permis d'habiter avant la réception provisoire des équipements (art. 57) ; plan d'aménagement : effets limités à 10 ans (art. 28). | vérifié |
| Décret 2-92-832 du 14/10/1993 (BO 4225) | Application de la loi 12-90 | Procédures des documents d'urbanisme ; règles hors périmètres couverts (parcelle d'au moins 1 ha, hauteur 8,50 m). | vérifié |
| Décret 2-18-577 du 12/06/2019 (BO FR 6874 du 16/04/2020) — remplace le décret 2-13-424, abrogé | Règlement général de construction : forme et conditions de délivrance des autorisations et pièces exigibles | Note de renseignements urbanistiques délivrée par l'agence urbaine en 2 jours ouvrables, sans valeur d'accord (art. 6 à 8) ; guichets uniques ; commission (préfecture ou province, commune, agence urbaine) dont l'avis de l'agence urbaine est obligatoire et s'impose (art. 39) ; grands projets : avis en 15 jours ouvrables au plus, 5 jours ouvrables pour compléter les pièces (annexe 2) ; petits projets : décision rapide (annexe 3) ; pièces principales obligatoires au dépôt, complémentaires plus tard (art. 36-37) ; permis d'habiter et certificat de conformité (art. 48 à 52) : la demande vaut déclaration d'achèvement, l'attestation de conformité de l'architecte qui a dirigé les travaux remplace le récolement ; dématérialisation (art. 53-54). | vérifié |
| Arrêté conjoint 337-20 du 21/01/2020 (BO 6874), modifié par l'arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) | Pièces des dossiers d'autorisation | Pièces principales (au dépôt) et complémentaires (avant délivrance) : copie du contrat d'architecte, notice de sécurité incendie, note de performance énergétique, fiche de renseignements, dossier télécom, plans de structure, cahier de chantier… La notice incendie n'est visée par un bureau de contrôle qu'au-delà de seuils (individuel au-delà de R+3, collectif à partir de R+3 sur lot > 150 m², ERP, IGH). | vérifié |
| Arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) | Modification des pièces exigibles | Dossier en un exemplaire ; seuils du visa de la notice incendie par un bureau de contrôle. | vérifié |
| Arrêté conjoint 338-20 du 21/01/2020 (BO 6874) + circulaire DGCL du 23/04/2020 | Dématérialisation (plateforme Rokhas) | Dépôt, instruction et délivrance en ligne obligatoires (autorisations, permis d'habiter, certificats de conformité) ; signature électronique des architectes et de la commission ; paiement des taxes en ligne. | partiellement vérifié |
| Arrêté conjoint 1839-23 du 10/07/2023 (BO 7212), pris en application de la loi 55-19 et du décret 2-22-141 | Délais maximaux des décisions d'urbanisme | Délai global : 15 jours (petits projets), 30 jours (grands projets, lotissements, morcellements), le silence valant accord selon la presse. Texte officiel à relire. | partiellement vérifié |
| Loi 55-19 (dahir 1-20-06 du 06/03/2020) et décrets d'application (2-22-141 ; 2-22-385 à 387) | Simplification des procédures administratives | Délais plafonnés et silence valant accord pour une liste de décisions ; articulation avec l'avis conforme de l'agence urbaine à vérifier. | partiellement vérifié |
| Loi 25-90 (dahir 1-92-7 du 17/06/1992), modifiée par les lois 66-12 et 34-21 | Lotissements, groupes d'habitations, morcellements | Autorisation de lotir ; travaux d'équipement ; réception provisoire (commission convoquée dans les 30 jours de la déclaration d'achèvement, voirie et réseaux versés au domaine public communal à cette date) ; réception définitive environ un an après ; aucune vente de lot inscrite sans réception provisoire. | vérifié |
| Loi 34-21 (dahir 1-26-61 du 28/07/2026, BO 7533 du 10/08/2026) | Réforme de la loi 25-90 | Validité de l'autorisation de lotir graduée (3, 5, 7, 10 ou 15 ans selon la superficie) ; morcellement réputé autorisé après 30 jours ; textes d'application attendus avant le 10/08/2027. | partiellement vérifié |
| Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) | Contrôle et répression des infractions d'urbanisme et de construction | Déclaration d'ouverture de chantier à la commune avant les travaux ; chantier clôturé et panneau (numéro et date de l'autorisation) ; documents techniques conservés sur le chantier ; cahier de chantier tenu pendant toute la durée des travaux ; déclaration de fermeture du chantier et de fin des travaux ; contrôleurs habilités à arrêter le chantier ; architecte, ingénieur, entrepreneur et topographe co-auteurs s'ils ne signalent pas une infraction sous 48 h ; amendes de 10 000 à 100 000 DH pour construction sans autorisation. | partiellement vérifié |
| Décret 2-18-475 du 12/06/2019, modifié par le décret 2-23-103 | Permis de réfection, de régularisation et de démolition | Réfection : délivrée en 10 jours ouvrables, valable 6 mois non renouvelables ; démolition : étude d'un ingénieur, délivrée en un mois, valable 6 mois ; régularisation sous conditions. | vérifié |
| Loi 016-89 (dahir 1-92-122 du 10/09/1993) | Profession d'architecte et Ordre national des architectes | Inscription à l'Ordre, exercice, organes ordinaux. L'obligation d'un contrat écrit et d'un visa ordinal du dossier n'a pas été lue dans le texte (à vérifier). Depuis la transaction avec le Conseil de la concurrence du 22/02/2023, l'Ordre ne diffuse plus de barème minimum : les honoraires sont libres. L'organe s'appelle le Conseil national de l'Ordre des architectes (pas « CNOA », sigle français). | partiellement vérifié |
| Loi 30-93 (dahir 1-94-126 du 25/02/1994) | Profession d'ingénieur géomètre-topographe (ONIGT) | Seul un ingénieur géomètre-topographe inscrit signe les levés et plans fonciers. | partiellement vérifié |
| Dahir du 12/08/1913 sur l'immatriculation, modifié par la loi 14-07 | Immatriculation foncière (ANCFCC) | Réquisition, bornage, titre foncier, certificats de propriété, éclatement et création de titres. | à vérifier |
| Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | Règlement de construction parasismique | Zones sismiques, classes de bâtiments, types de sites (S1 à S5), régularité, ductilité, méthodes de calcul et dispositions constructives (cadres resserrés, chaînages) ; note de calcul par l'ingénieur. | partiellement vérifié |
| Décret 2-12-666 du 28/05/2013 | Règlement parasismique des constructions en terre | Constructions en terre (pisé, adobe) : utile en rénovation rurale ou médina. | vérifié |
| Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 | Règlement thermique de construction au Maroc | Bâtiments neufs résidentiels et tertiaires (hors habitat rural individuel) : performances de l'enveloppe par zone climatique (6 zones), méthode prescriptive ou performancielle ; fiche ou note de conformité dans le dossier de permis. | vérifié |
| Décret 2-14-499 du 15/10/2014 (BO 6306 du 06/11/2014) | Règlement de sécurité contre l'incendie et la panique dans les constructions | Classement par type de bâtiment (habitation, ERP, IGH, travail), dispositions constructives, désenfumage, installations, moyens de secours. Seuils détaillés (IGH) à relire ; le RGC 2-18-577 a remplacé l'avis de la protection civile par des attestations de professionnels pour certains dossiers (à vérifier). | partiellement vérifié |
| Loi 10-03 (dahir 1-03-58 du 12/05/2003) et décret 2-11-246 | Accessibilités | Accessibilité des constructions ouvertes au public et de l'habitat collectif (cheminements, stationnement réservé, équipements). | vérifié |
| NM 10.1.008-2009 (norme d'application obligatoire) | Bétons : spécification, performances, production, conformité | Classes de résistance et d'exposition, production et contrôle de conformité, y compris le béton prêt à l'emploi. | vérifié |
| NM 10.1.004-2019 (norme d'application obligatoire) | Ciments | Types et classes de ciments, conformité, marquage. | vérifié |
| NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (normes d'application obligatoire ; numéros d'arrêtés à vérifier) | Aciers pour béton armé (barres HA, ronds lisses, treillis) | Nuances, caractéristiques, marquage de laminage, certificats. | partiellement vérifié |
| Loi 24-09 | Sécurité des produits (marquage CMIM) | Matériel électrique basse tension et appareils à gaz conformes et marqués avant mise sur le marché. | vérifié |
| Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | CCAG applicable aux marchés de travaux (publics) | Applicable de plein droit aux marchés publics, référence pour les marchés privés : cautionnement définitif 3 % du montant initial (art. 15) ; retenue de garantie 1/10 de chaque acompte plafonnée à 7 %, remplaçable par une caution (art. 16 et 64) ; délai de garantie 12 mois après la réception provisoire sauf CPS (art. 73 et 75) ; libération à la réception définitive ; ordres de service, attachements, décomptes, avenants. | partiellement vérifié |
| Décret 2-22-431 du 08/03/2023 (en vigueur au 01/09/2023), abroge le décret 2-12-349 | Marchés publics | Règles uniques État, collectivités, établissements publics : publicité, cautionnement provisoire (au plus 2 % de l'estimation), préférence nationale, part réservée aux TPME, coopératives et auto-entrepreneurs, critères durables. | vérifié |
| Dahir des obligations et contrats, art. 769 (et 770) | Responsabilité décennale des constructeurs | Architecte ou ingénieur et entrepreneur répondent 10 ans de l'écroulement total ou partiel ou du danger évident d'écroulement dû aux matériaux, à la construction ou au sol ; l'architecte qui n'a pas dirigé les travaux ne répond que de son plan ; délai pour agir : 30 jours du fait selon une partie de la doctrine (art. 770), lecture contestée par le contre-audit du CPS du 10/10/2026 (apps/web/src/domain/cps/clausesPrive.ts) — à vérifier ; clause contraire nulle. | partiellement vérifié |
| Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024) | Assurances construction obligatoires | Depuis le 30/12/2024 : tous risques chantier souscrite par le maître d'ouvrage jusqu'à la réception, responsabilité civile décennale des architectes, ingénieurs et entrepreneurs à partir de la réception ; bâtiments concernés : habitation de plus de 3 étages ou de plus de 800 m², partie non résidentielle de plus de 400 m², bâtiments industriels, commerciaux, hôteliers, sportifs ; attestation décennale exigée pour le permis d'habiter ; exclusions admises dont les réserves du bureau de contrôle non levées et l'arrêt de chantier de plus de 45 jours ; amendes jusqu'à 100 000 DH. | vérifié |
| Arrêté 3201-24 du 20/12/2024 (BO 7365) | Assurances construction : plafonds, franchises, exclusions | Garanties au moins égales au montant des travaux, franchises maximales (TRC 7 % ou 20 000 DH ; RCD 7 % ou 50 000 DH), exclusions encadrées. | vérifié |
| Loi 18-12 (dahir 1-14-190 du 29/12/2014) | Accidents du travail | Assurance obligatoire de l'employeur ; déclaration de l'accident. | vérifié |
| Loi 65-99 (code du travail), livre II titre IV | Hygiène et sécurité | Obligations de sécurité de l'employeur sur le chantier. | vérifié |
| Loi 107-12 modifiant la loi 44-00 (BO du 18/02/2016) | Vente d'immeuble en l'état futur d'achèvement | Réservation facultative après permis (acompte plafonné à 5 %, rétractation 1 mois) ; contrat préliminaire obligatoire (acte authentique ou professionnel habilité) ; paiements échelonnés par stades (fondations au niveau du RDC, gros œuvre, finitions, clés — pourcentages à recouper) ; caution de restitution ou d'achèvement. | partiellement vérifié |
| Loi 18-00 (dahir du 03/10/2002), modifiée par la loi 106-12 (dahir 1-16-49 du 27/04/2016) | Copropriété des immeubles bâtis | Règlement de copropriété obligatoire (règlement type par décret de 2017), syndic et conseil syndical, copropriété verticale et construction progressive. | vérifié |
| Loi 83-21 (2023) sur les sociétés régionales multiservices | Distribution eau, électricité, assainissement | Une société par région reprend la distribution : Casablanca-Settat depuis le 01/10/2024 (fin de Lydec) ; Rabat-Salé-Kénitra opérationnelle depuis le 01/06/2025, Redal gardant son périmètre jusqu'en 2028 ; Tanger-Tétouan-Al Hoceima à partir du 01/09/2025. L'interlocuteur des raccordements change selon la ville. | vérifié |
| Loi 47-06 (fiscalité des collectivités territoriales), modifiée | Taxe sur les opérations de construction et de lotissement | Taxes communales payées avant la délivrance de l'autorisation ; tarifs selon l'arrêté fiscal de la commune. | partiellement vérifié |
| Code général des impôts, art. 275 et suivants | Contribution sociale de solidarité sur les livraisons à soi-même | Due par le particulier qui construit pour lui-même un logement au-delà d'une surface couverte (300 m² selon les guides) ; barème par m² ; déclaration après l'achèvement. | à vérifier |
| Loi 47-18 (dahir 1-19-18 du 13/02/2019) | Centres régionaux d'investissement | Guichet des projets d'investissement ; utile pour les équipements et grands projets privés. | vérifié |
| Loi 64-23 (BO 7533 du 10/08/2026 selon la presse) | Agences régionales d'urbanisme et d'habitat | Doivent reprendre progressivement le rôle des agences urbaines ; à suivre région par région. | à vérifier |

### Corrections importantes par rapport aux idées reçues

- Le **décret 2-13-424** (règlement général de construction de 2013) est **abrogé** : le texte en vigueur est le **décret 2-18-577** du 12 juin 2019.
- Le permis de construire n'a pas une « validité d'un an » : il est **périmé si les fondations ne sont pas commencées un an** après sa délivrance (art. 49 de la loi 12-90).
- Le permis d'habiter n'exige pas toujours une visite de commission : **l'attestation de conformité de l'architecte qui a dirigé les travaux remplace le récolement** (art. 55 de la loi 12-90, RGC). Le ministère de l'Intérieur a demandé de ne plus délivrer de permis d'habiter partiels (presse, à vérifier).
- **TRC et décennale sont obligatoires depuis le 30/12/2024**, mais seulement pour les bâtiments au-dessus des seuils (habitation de plus de 3 étages ou de plus de 800 m², etc.) : une villa R+1 de 350 m² n'y est en principe pas assujettie ; l'assurance reste recommandée.
- Le **bureau de contrôle** n'est pas obligatoire de manière générale ; il l'est de fait pour viser la notice incendie au-delà des seuils de l'arrêté 1032-21, et ses réserves non levées peuvent faire perdre la garantie décennale.
- L'Ordre ne fixe plus de **barème d'honoraires** minimum (transaction du 22/02/2023 avec le Conseil de la concurrence).
- À Rabat, **Redal** reste l'interlocuteur des raccordements jusqu'en 2028 malgré la société régionale multiservices ; à Casablanca, la SRM a remplacé Lydec.

## Annexe A — Sources

- Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 : <https://adala.justice.gov.ma/api/uploads/2024/03/05/urbanisme-1709645110854.pdf> ; <http://www.auks.ma/wp-content/uploads/2019/11/dahir1-92-31.pdf>
- Décret 2-92-832 du 14/10/1993 (BO 4225) : <https://www.auks.ma/lois-et-reglementations/>
- Décret 2-18-577 du 12/06/2019 (BO FR 6874 du 16/04/2020) — remplace le décret 2-13-424, abrogé : <https://adala.justice.gov.ma/api/uploads/2025/10/21/D%C3%A9cret%20n%C2%B0%202-18-577%20%20approuvant%20le%20r%C3%A8glement%20g%C3%A9n%C3%A9ral%20de%20construction%20fixant%20la%20forme%20et%20les%20conditions%20de%20d%C3%A9livrance%20des%20autorisations%20et%20des%20pi%C3%A8-1761035957074.pdf> ; <http://www.auks.ma/wp-content/uploads/2019/11/decret%20RGC%202019.pdf>
- Arrêté conjoint 337-20 du 21/01/2020 (BO 6874), modifié par l'arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) : <http://www.auks.ma/wp-content/uploads/2021/06/arr%C3%AAt%C3%A9_NSI-Fr.pdf>
- Arrêté conjoint 1032-21 du 13/04/2021 (BO 6992) : <http://www.auks.ma/wp-content/uploads/2021/06/arr%C3%AAt%C3%A9_NSI-Fr.pdf>
- Arrêté conjoint 338-20 du 21/01/2020 (BO 6874) + circulaire DGCL du 23/04/2020 : <https://medias24.com/2021/11/24/plateforme-rokhas-loctroi-des-cles-de-signatures-electroniques-en-cours-de-deblocage/> ; <https://fr.le360.ma/economie/dematerialisation-vers-une-acceleration-de-la-generalisation-de-la-plateforme-rokhasma-220119/>
- Arrêté conjoint 1839-23 du 10/07/2023 (BO 7212), pris en application de la loi 55-19 et du décret 2-22-141 : <http://www.auks.ma/wp-content/uploads/2023/07/Arrete-conjoint-n%C2%B01839.23.pdf> ; <https://fnh.ma/article/actualites-marocaines/decisions-administratives>
- Loi 55-19 (dahir 1-20-06 du 06/03/2020) et décrets d'application (2-22-141 ; 2-22-385 à 387) : <https://www.bladi.net/maroc-pistes-ministere-interieur-simplifier-procedures,103249.html>
- Loi 25-90 (dahir 1-92-7 du 17/06/1992), modifiée par les lois 66-12 et 34-21 : <https://adala.justice.gov.ma/api/uploads/2024/12/18/lotissement,%20groupes%20d'habitations%20et%20morcellements%20(1)-1734515529014.pdf>
- Loi 34-21 (dahir 1-26-61 du 28/07/2026, BO 7533 du 10/08/2026) : <https://reaconsult.ma/tendances-et-conseils-en-immobilier/loi-34-21-lotissements-maroc-bo-7533-analyse-comparative>
- Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) : <https://www.lavieeco.com/au-royaume/une-loi-pour-mettre-fin-a-la-pagaille-des-chantiers-de-construction-2/> ; <https://fr.le360.ma/economie/repression-des-infractions-durbanisme-le-decret-dapplication-enfin-publie-au-bulletin-officiel-209759/>
- Décret 2-18-475 du 12/06/2019, modifié par le décret 2-23-103 : <http://www.auks.ma/wp-content/uploads/2023/05/Decret-n%C2%B02.18.475_Version-Consolidee_FR-1.pdf>
- Loi 016-89 (dahir 1-92-122 du 10/09/1993) : <https://fr.le360.ma/economie/pratiques-anticoncurrentielles-entre-architectes-ce-qua-decide-le-conseil-de-la-concurrence_JLGOD36FJ5DSJAYKWXQ2IRHRP4/>
- Loi 30-93 (dahir 1-94-126 du 25/02/1994) : <https://adala.justice.gov.ma/api/uploads/2024/03/27/l'exercice%20de%20la%20profession%20d'ing%C3%A9nieur%20g%C3%A9om%C3%A8tre-%20topographe-1711541874179.pdf>
- Dahir du 12/08/1913 sur l'immatriculation, modifié par la loi 14-07 : <https://www.ancfcc.gov.ma>
- Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) : <https://fr.le360.ma/societe/reglement-parasismique-en-attendant-une-revision-globale-une-reconsideration-du-zonage-sismique_BYOCCX6BYVGFJONIY465E2IRQM/>
- Décret 2-12-666 du 28/05/2013 : <https://medias24.com/2024/09/03/le-reglement-parasismique-marocain-sera-actualise-dans-80-communes/>
- Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 : <https://energetique.uae.ma/textes_energ/decret_%202_13_874%20_construction.pdf> ; <https://prod.iea.org/policies/8570-decree-n-2-13-874-on-thermal-regulation-of-buildings>
- Décret 2-14-499 du 15/10/2014 (BO 6306 du 06/11/2014) : <https://medias24.com/2014/09/19/le-conseil-du-gouvernement-adopte-des-projets-de-decret-sur-la-construction-la-sante-et-la-defense/>
- Loi 10-03 (dahir 1-03-58 du 12/05/2003) et décret 2-11-246 : <https://auessaouira.ma/wp-content/uploads/2015/06/decret_81.pdf>
- NM 10.1.008-2009 (norme d'application obligatoire) : <https://www.mcinet.gov.ma/sites/default/files/liste%20NMO%20et%20reglementation%20technique%2015042022.pdf>
- NM 10.1.004-2019 (norme d'application obligatoire) : <https://www.mcinet.gov.ma/sites/default/files/liste%20NMO%20et%20reglementation%20technique%2015042022.pdf>
- NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (normes d'application obligatoire ; numéros d'arrêtés à vérifier) : <https://www.mcinet.gov.ma/sites/default/files/liste%20NMO%20et%20reglementation%20technique%2015042022.pdf>
- Loi 24-09 : <https://verigates.bureauveritas.com/sites/verigates/files/2023-11/Maroc_Guide%20sur%20le%20marquage%20CMim%20des%20produits%20electrique_Ed%201.4.pdf>
- Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) : <https://www.marchespublics.gov.ma/pmmp/download/pdf/2-14-394-fr.pdf> ; <https://www.tgr.gov.ma/wps/wcm/connect/48e2b53e-6fa9-4ee9-a6ae-bbde89b37b6f/2-14-394ccag.pdf?MOD=AJPERES>
- Décret 2-22-431 du 08/03/2023 (en vigueur au 01/09/2023), abroge le décret 2-12-349 : <https://medias24.com/2023/03/24/marches-publics-le-nouveau-decret-entrera-en-vigueur-en-septembre-2023/> ; <https://medias24.com/2023/06/19/la-reforme-des-marches-publics-resumee-par-la-tgr-document/>
- Dahir des obligations et contrats, art. 769 (et 770) : <https://reaconsult.ma/tendances-et-conseils-en-immobilier/garantie-decennale-construction-maroc-recours> ; <https://adala.justice.gov.ma/>
- Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024) : <https://fnh.ma/article/actualite-financiere-maroc/construction-nouvelles-assurances-obligatoires> ; <https://medias24.com/2025/01/17/entree-en-vigueur-des-assurances-obligatoires-tous-risques-chantier-et-responsabilite-civile-decennale/>
- Arrêté 3201-24 du 20/12/2024 (BO 7365) : <https://adala.justice.gov.ma/>
- Loi 18-12 (dahir 1-14-190 du 29/12/2014) : <https://www.demarchesmaroc.com/accident-travail/>
- Loi 65-99 (code du travail), livre II titre IV : <https://adala.justice.gov.ma/api/uploads/2024/04/30/code%20du%20travail-1714463246806.pdf>
- Loi 107-12 modifiant la loi 44-00 (BO du 18/02/2016) : <https://fnh.ma/article/actualite-economique/entretien-tout-ce-qu-il-faut-savoir-des-nouvelles-procedures-de-la-vefa>
- Loi 18-00 (dahir du 03/10/2002), modifiée par la loi 106-12 (dahir 1-16-49 du 27/04/2016) : <https://adala.justice.gov.ma/api/uploads/2024/03/05/Statut%20de%20la%20copropri%C3%A9t%C3%A9%20des%20immeubles%20b%C3%A2tis-1709644798716.pdf>
- Loi 83-21 (2023) sur les sociétés régionales multiservices : <https://medias24.com/2025/06/05/rabat-sale-kenitra-la-srm-operationnelle-et-pilote-les-investissements-redal-conserve-la-gestion-de-son-perimetre-jusquen-2028/> ; <https://fr.le360.ma/economie/services-publics-exit-lydec-la-srm-casablanca-settat-demarre-son-activite-ce-mardi-1er-octobre_CRLMMKIC7VHWFGXNDCWES5NGGU/>
- Loi 47-18 (dahir 1-19-18 du 13/02/2019) : <https://adala.justice.gov.ma/>
- Loi 64-23 (BO 7533 du 10/08/2026 selon la presse) : <https://lematin.ma/nation/urbanisme-agences-regionales-et-guichet-unique-pour-les-grands-projets/360975>
- Référentiel des jalons déjà présent dans le dépôt (normes, exigences, modèles de PV, vérifiés au 13/10/2026) : `apps/web/src/domain/referentiel/data/*.json`.

## Annexe B — Correspondance avec les codes déjà utilisés dans le logiciel

Chaque phase du JSON porte `correspondances.catalogue` (codes de `packages/contracts/src/phases.catalog.ts`, utilisés par l'espace projet et par `DossierEtape`), `correspondances.materiaux` (phases d'étude et de réalisation de la matériauthèque) et `correspondances.chiffrage` (niveau du moteur de chiffrage). Les lots portent leurs codes du chiffrage (`INS`, `TER`…), des gabarits CPS (`LOT_00`…) et du référentiel des jalons (`LOT_*`). Le référentiel proposé ici est volontairement plus **grossier** que le catalogue existant (15 phases au lieu d'environ 55 phases et lots) : il sert de **colonne vertébrale commune** (vue client, tableau de bord, planning, finances), le catalogue détaillé restant la source des checklists techniques.
