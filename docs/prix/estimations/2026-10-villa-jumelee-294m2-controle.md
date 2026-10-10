# Contrôle de conformité du CPS régénéré — villa jumelée 294 m²

Document contrôlé : CPS généré le 10/10/2026 — 1 708 506,29 DH HT / 2 050 207,55 DH TTC.
Les contrôles sont exécutés par programme sur le document réellement produit (module `domain/cps/controle.ts`, rejoué à chaque test automatique).

Statuts : **Corrigé** = défaut résolu et contrôle réussi ; **Provisoire** = hypothèse documentée conservée jusqu'à validation ; **Bloquant** = empêche l'émission comme pièce contractuelle.

## 1. Contrôles automatiques

**Bilan : 16 corrigés, 8 provisoires, 0 bloquants.**

| Réf. | Contrôle | Statut | Preuve tirée du document généré |
|:--|:--|:--|:--|
| BPDE-1 | Chaque montant = quantité × PU affichés | Corrigé | 71 postes recalculés au centime, 0 écart |
| BPDE-2 | Sous-totaux de lots = somme des postes | Corrigé | 17 lots vérifiés |
| BPDE-3 | Récapitulatif = somme des lots ; TVA et TTC exacts | Corrigé | Somme des lots 1 708 506,29 ; récapitulatif 1 708 506,29 HT ; TVA 20 % 341 701,26 ; TTC 2 050 207,55 (= HT + TVA). Écart d'arrondi BPDE / calcul : 13,73 DH |
| BPDE-4 | Page de garde cohérente avec le Titre IV | Corrigé | Page de garde : 1 708 506,29 HT / 2 050 207,55 TTC |
| OUV-1 | Chaque ouvrage du chiffrage figure une seule fois au BPDE (fusions comprises) | Corrigé | 71 ouvrages chiffrés ; omis : aucun ; en double : aucun ; fusionnés restés visibles : aucun |
| OUV-2 | Ouvrages enterrés regroupés au lot 02 | Corrigé | FON.12, FON.13 au lot 02 |
| OUV-3 | Hérisson compris dans le PU du dallage (pas de poste séparé) | Corrigé | FON.07 absent du BPDE ; mention « PU hérisson compris » au poste du dallage |
| OUV-4 | WC invités : périmètre précisé au poste | Corrigé | 14.05 — Fourniture et pose de cuvette WC céramique NM EN 997 avec réservoir double chasse et mécanisme (WC invités du RDC ; les salles de bain sont équipées aux postes complémentaires) — u — 1 — 2 784 |
| CL-1 | Aucune référence à l'art. 770 ni à un « 769 bis » du DOC | Corrigé | 0 occurrence dans les Titres I à IV et annexes |
| CL-2 | TRC / RCD présentées comme contractuelles (seuils ACAPS non atteints) | Provisoire | Articles TRC et RCD : « à titre contractuel », seuils légaux rappelés |
| CL-3 | Plafond des pénalités unique (8 %) | Corrigé | 4 mentions chiffrées, toutes à 8 % (2 % pour les pénalités particulières) ; 1 renvoi(s) au plafond sans chiffre |
| CL-4 | CCAG-T jamais présenté comme applicable de plein droit | Corrigé | Mention explicite au Titre I ; tous les fondements CCAG portent « à titre de référence » |
| CL-5 | Décret 2-22-431 (marchés publics) non opposé au marché privé | Corrigé | 0 mention |
| CL-6 | Statut non contractuel et conditions de levée avant signature | Corrigé | Bloc « Statut » en tête et tableau des arbitrages présents |
| CL-7 | Hiérarchie documentaire et règle de discordance | Corrigé | Pièce de rang supérieur prévaut ; Titre II prime sur les désignations abrégées du BPDE ; quantités réelles aux PU si ouvrage inchangé |
| CL-8 | Installation de chantier rémunérée par le seul forfait 00.01 | Provisoire | 00.01 = 33 499,85 DH HT (2 % des ouvrages). Les PU incluent 10 % de frais de chantier (conduite, encadrement, consommables) ; affectation des dépenses en Annexe 4, décomposition chiffrée exigée de l'entrepreneur |
| GEN-1 | Aucun texte de travail ni renvoi à un seuil ou délai non défini | Corrigé | 0 mention de travail, de seuil ou de délai non défini (A.6, A.13, A.16, A.19, A.20, A.25) |
| GEN-2 | Variables contractuelles arrêtées | Provisoire | 4 mention(s) de variable ouverte, signalée(s) dans les conditions de levée et au tableau des arbitrages |
| GEN-3 | Mentions « [à compléter] » | Provisoire | 3 : [à compléter], [à compléter : coef a] |
| CL-9 | Assurances : obligations limitées aux parties au marché, assurabilité confirmée par l'assureur | Provisoire | RCD exigée de l'entrepreneur seul ; architecte et BET renvoyés à leurs contrats ; confirmation de l'assureur avant signature |
| CL-10 | Discordance : modification technique substantielle → examen contradictoire et prix nouveau | Corrigé | Clause présente à l'article « Pièces constitutives » |
| FISC-1 | Régime fiscal des prix de matériaux (HT supposé / TVA non indiquée par la source) | Provisoire | 25 matériaux de gros œuvre retenus HT sans vérification (≈ 547 087,54 DH HT) ; incidence si TTC ≈ −125 830,13 DH HT (7,4 %) ; déclaré en Annexe 4 et dans les conditions de levée |
| RT-1 | Réserves BET / géotechnique maintenues (Annexe 3) | Provisoire | Annexe 3 présente ; réduction des semelles qualifiée de non structurelle ; quantités par ratio à remplacer par les plans d'exécution |
| RT-2 | Rapprochement matériaux ↔ postes du BPDE | Provisoire | Colonne présente au Titre III |

**Conditions bloquantes hors document** (le CPS reste non contractuel tant qu'elles ne sont pas levées) : étude géotechnique G2, note de calcul et plans d'exécution du BET, tableau des menuiseries avec 2 ou 3 offres sur la même fiche technique, arbitrages du maître d'ouvrage.

## 2. Audit différentiel (version du 09/10 → version corrigée)

### Titre I — articles

- Ajoutés : Responsabilité décennale des constructeurs ; Signalement des désordres et exercice des recours ; Garantie contractuelle de bon fonctionnement (2 ans) ; Assurance Tous Risques Chantier ; Assurance de responsabilité civile décennale ; Situations, délais de paiement et intérêts de retard ; Cautionnement définitif ; Caractère des prix ; Réceptions ; Règlement des différends et droit applicable ; Nature et règlement des prix ; Autorisations administratives et commencement des travaux
- Retirés ou renommés : Garantie décennale ; Délai d'action et forclusion de la garantie décennale ; Garantie biennale de bon fonctionnement (2 ans) ; Assurance Tous Risques Chantier (TRC) obligatoire ; Assurance Responsabilité Civile Décennale (RCD) obligatoire ; Responsabilité civile professionnelle de l'architecte ; Délais de paiement et intérêts de retard ; Cautionnement définitif et garanties bancaires ; Révision des prix (index BTP/TP) ; Réception provisoire et réception définitive ; Règlement des litiges et droit applicable ; Forme et caractère des prix ; Assurances ; Visas et autorisations
- Modifiés : Pièces constitutives du marché ; Valeurs contractuelles arrêtées ; Garantie de parfait achèvement (1 an) ; Avance, acomptes et situations de travaux ; Délai d'exécution et ordres de service ; Pénalités de retard ; Retenue de garantie ; Résiliation du marché ; Force majeure ; Sous-traitance ; Protection des données personnelles (CNDP)

### Références légales (nombre d'occurrences, document entier)

| Référence | Avant | Après |
|:--|--:|--:|
| Art. 770 du DOC | 14 | 0 |
| « 769 bis » | 2 | 0 |
| « biennale » | 8 | 1 |
| Décret 2-22-431 | 1 | 0 |
| « obligatoire » + assurance | 5 | 0 |
| « à titre contractuel » | 0 | 2 |

« biennale » restant : uniquement dans le fondement de l'article sur la garantie de bon fonctionnement, pour rappeler que la garantie biennale légale (loi 44-00) vise la VEFA et ne s'applique pas ici.

### Titre IV — BPDE

- Total des postes : 1 708 491,00 → 1 708 506,29 DH HT (écart 15,29 DH, arrondis au centime).
- Postes ajoutés : 2.C1, 2.C2 ; retirés : 4.C1, 4.C2.
- 4.C1 → 2.C1 : « Drainage périphérique : drain Ø100, massif drainant, géotextile » déplacé (7 480,00 → 7 480,06 DH).
- 4.C2 → 2.C2 : « Étanchéité des parois enterrées : primaire + membrane bitumineuse + protection » déplacé (17 187,00 → 17 187,36 DH).
- Postes dont la désignation ou le montant change de 1 DH ou plus : 9.

| Poste | Avant | Après | Motif |
|:--|--:|--:|:--|
| 2.01 | 7 690,00 | 7 693,64 | arrondi au centime (quantité et PU arrêtés au centime) |
| 2.04-a | 158 366,00 | 158 376,25 | arrondi au centime (quantité et PU arrêtés au centime) |
| 2.08 | 41 543,00 | 41 542,20 | désignation |
| 3.01 | 68 023,00 | 68 021,41 | arrondi au centime (quantité et PU arrêtés au centime) |
| 3.07-a | 65 495,00 | 65 497,29 | arrondi au centime (quantité et PU arrêtés au centime) |
| 3.07-b | 22 696,00 | 22 697,14 | arrondi au centime (quantité et PU arrêtés au centime) |
| 3.08 | 27 523,00 | 27 524,36 | arrondi au centime (quantité et PU arrêtés au centime) |
| 13.01-b | 47 790,00 | 47 786,47 | arrondi au centime (quantité et PU arrêtés au centime) |
| 14.05 | 2 785,00 | 2 784,91 | désignation |
