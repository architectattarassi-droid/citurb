# Marché privé de la construction au Maroc : coûts au m², ouvrages posés et main-d'œuvre (2025-2026)

Recherche du 2026-10-09. Données brutes : `marche-prive-main-oeuvre.json` (149 entrées, 49 URL distinctes, fiabilité A : 7, B : 99, C : 43).

## 0. À lire avant d'utiliser ces chiffres

- **Aucune source officielle** (HCP, BAM, CDG, FNBTP, ministère) ne publie de coût de construction privé au m² par ville. Faute de mieux, la base repose sur des sites commerciaux : constructeurs, plateformes d'artisans et blogs. Ces pages sont souvent écrites pour le référencement, ne détaillent pas leur méthode et se contredisent parfois elles-mêmes (incohérences notées dans le champ `note`).
- **Les chiffres ne couvrent pas tous le même périmètre.** On peut distinguer trois marchés :
  1. **Autoconstruction ou tâcheron**, où le maître d'ouvrage achète lui-même les matériaux : gros œuvre de 1 000 à 2 000 DH/m², clé en main de 1 800 à 3 700 DH/m² (AqarMaghreb, Mawtini, forums).
  2. **Entreprise générale, HT**, hors honoraires et taxes : économique 2 500-4 200, standard 3 500-6 800, haut de gamme 5 000-15 000 DH/m² (EnginLoc, bati.ma).
  3. **Constructeur clé en main, TTC**, avec plans et marge : standard 7 500-9 000, premium 9 500-12 000, luxe 12 500-18 000+ DH/m² (OLAM, Wall Constructions).
  Pour un même standing, l'écart entre ces marchés peut dépasser un facteur 2. Dans la base de prix, il faut donc **toujours stocker le périmètre et le régime de taxes**.
- **Biais commerciaux** :
  - Les constructeurs haut de gamme (OLAM, Wall, CB Signature, geniecivil) tirent les prix vers le haut.
  - Les blogs arabophones d'autoconstruction (AqarMaghreb, Mawtini) tirent vers le bas.
  - Les plateformes d'artisans (Mano, 7rafti, Bricolat, Bnidari) ont intérêt à afficher des prix bas mais « sérieux ».
- **Contradictions majeures relevées** :
  - Menuiserie alu posée : 1 100-1 400 DH/m² chez 7rafti contre 1 800-2 800 chez LeChantier.
  - Pose de carrelage : 25-40 DH/m² chez Mano contre 70-140 chez Bricolat (Casablanca).
  - Enduit ciment : 35-65 DH/m² chez LeChantier contre 80-160 chez 7rafti.
  - Honoraires d'architecte : de 3 à 12 % selon la source (Archiplan se contredit d'un article à l'autre).
  - Classement Rabat / Casablanca : Rabat est plus cher chez EnginLoc, moins cher chez Fadil Group.

## 1. Grille coût/m² par ville × standing (cœur de cible)

### 1.1 Grille de référence par ville (entreprise générale, HT)

Colonne vertébrale : barème EnginLoc/BTPro (avril 2026). C'est le seul barème qui couvre 14 villes. Il est exprimé en m² de surface plancher, HT, tout compris (gros œuvre + second œuvre + finitions), hors terrain, honoraires, taxes et assurances. La colonne « Dispersion autres sources » reprend les fourchettes trouvées ailleurs pour la même ville.

| Ville | Économique | Standard (moyen) | Haut de gamme | Dispersion autres sources (tout standing confondu) |
|---|---|---|---|---|
| Casablanca | 3 200 – 4 000 | 4 500 – 6 500 | 7 000 – 12 000 | Fadil 2025 : 5 500-8 000 ; LeChantier calc. : 9 545 (villa std) ; geniecivil : villas 9 000-14 000 ; prog-immo (périphérie, moyen) : 3 500 |
| Rabat | 3 400 – 4 200 | 4 800 – 6 800 | 7 500 – 13 000 | Fadil : 5 200-7 000 (villa réalisée 7 000) ; Francobat R+4 moyen : 6 500 |
| Salé / Témara | n.d. | n.d. | n.d. | Aucune source chiffrée. Seul repère : 7rafti les place à +5 % (main-d'œuvre) au-dessus de Kénitra, soit ≈ moyenne de la région RSK |
| Kénitra | 2 800 – 3 500 | 4 000 – 5 800 | 6 000 – 10 000 | — |
| Tanger | 3 100 – 3 900 | 4 400 – 6 400 | 7 000 – 11 000 | Fadil : 4 500-6 500 ; geniecivil (Nord) : villas 8 000-12 000 |
| Tétouan | 3 000 – 3 700 | 4 200 – 6 000 | 6 500 – 10 500 | Zone sismique 3-4 : gros œuvre +10 à 18 % (LeChantier) |
| Marrakech | 3 000 – 3 800 | 4 200 – 6 200 | 6 500 – 15 000 | Fadil : 5 000-7 500 ; Wall (TTC) : haute gamme 8 500-10 000, luxe 12 000+ ; exemple EnginLoc 5 200 |
| Agadir | 2 900 – 3 600 | 4 100 – 6 000 | 6 500 – 11 000 | Fadil : 4 800-6 800 ; geniecivil (Sud) : villas 6 000-9 000 |
| Fès | 2 800 – 3 500 | 4 000 – 5 800 | 6 000 – 10 000 | Fadil : 4 000-5 500 |
| Meknès | 2 600 – 3 300 | 3 800 – 5 500 | 5 500 – 9 000 | Archiplan (maison standard 100 m²) : 5 000-6 000 |
| Oujda | 2 700 – 3 400 | 3 900 – 5 600 | 5 800 – 9 500 | — |
| El Jadida | 2 700 – 3 400 | 3 900 – 5 700 | 5 800 – 9 500 | — |
| Nador | 2 800 – 3 600 | 4 000 – 5 800 | 6 000 – 10 000 | Zone sismique |
| Béni Mellal | 2 500 – 3 200 | 3 600 – 5 200 | 5 200 – 8 500 | — |
| Settat | 2 500 – 3 200 | 3 500 – 5 000 | 5 000 – 8 000 | — |
| **National (autres barèmes)** | bati.ma 3 000-4 500 ; Archiplan ≥ 3 500 ; prog-immo 2 500-3 500 | bati.ma 4 500-7 000 ; Francobat 5 000-7 500 ; Archiplan 4 500-6 500 | bati.ma 7 000-10 500 ; Francobat 8 000-14 000 | **Luxe** : bati.ma 11 000-15 000 ; OLAM (TTC) 12 500-18 000+ |

**Valeurs de référence proposées pour la base Rabat-Salé-Kénitra (coef. 1,00), HT, entreprise.** La méthode : moyenne des milieux de fourchette EnginLoc pour Rabat et Kénitra.

| Standing | Référence base RSK | Fourchette basse-haute à afficher |
|---|---|---|
| Économique | ≈ 3 500 | 2 800 – 4 200 |
| Moyen / standard | ≈ 5 350 | 4 000 – 6 800 |
| Haut | ≈ 9 100 | 6 000 – 13 000 |
| Luxe | ≈ 13 000 (bati.ma 11-15 k ; OLAM TTC 12,5-18 k ÷ 1,2 ≈ 10,4-15 k HT) | 11 000 – 15 000 |

Pour obtenir un TTC, appliquer la TVA. Le taux pour un particulier passant par une entreprise n'a **pas** été vérifié sur une source 2026. Le document FH2MRE de 2011 cite 14 %, ce qui est obsolète. Il faut le confirmer dans le CGI en vigueur avant usage.

### 1.2 Écarts par type de projet (même standing)

| Type | Indice (maison R+1/R+2 = 1,00) | Sources et raisonnement |
|---|---|---|
| Maison R+1 / R+2 | 1,00 | Base |
| Villa | 1,05 – 1,18 sur le gros œuvre | Rifaa : plancher villa 1 300 contre maison 1 100 DH/m² (+18 %) ; acrotère 350 contre 250. Pas de source cohérente pour le clé en main à standing égal : l'écart des barèmes reflète surtout le standing. |
| Immeuble R+3 / R+4 | 0,87 – 0,96 | Fadil 2025 : immeuble R+3 contre maison : 3 500/3 800 (éco), 4 800/5 000 (std), 6 500/7 500 (haut). À ajouter : ascenseur (150-350 k DH), bureau de contrôle (30-80 k DH), +8 à 15 % pour R+5 contre R+2 (EnginLoc). |

### 1.3 Gros œuvre seul et clé en main

| Périmètre | Fourchette DH/m² plancher | Sources |
|---|---|---|
| Gros œuvre, tâcheron ou autoconstruction (matériaux + MO) | 1 000 – 2 000 | AqarMaghreb 2026, CTravaux (≈ 1 200) |
| Gros œuvre par plancher, simulateur (hors fondations) | 1 100 – 1 300 (+ fondations ≈ 800/m² d'emprise) | Rifaa |
| Gros œuvre par entreprise | 1 800 – 3 200 (villa R+1 éco 1 800-2 750 ; R+3 2 000-3 200) | LeChantier 2026 |
| Structure brute seule (TTC, Marrakech) | 2 400 – 2 800 | Wall Constructions |
| Gros œuvre complet avec étanchéité et toiture (TTC, Marrakech) | 3 200 – 4 400 | Wall Constructions |
| Part du gros œuvre dans le clé en main | éco 55-60 %, std 45-50 %, haut 35-40 % | EnginLoc. Les autres sources donnent 30-50 % (Francobat 30-40, prog-immo 40-50, LeChantier calc. 42). |
| Main-d'œuvre seule gros œuvre (tâcheron) | 230 – 450 (fondations ≈ 115) | AqarMaghreb 300-450 (2026) ; Mawtini 230 (2024) ; forum Marrakech 250 (~2017) |

## 2. Coefficients régionaux (base Rabat-Salé-Kénitra = 1,00)

### 2.1 Méthode

On croise deux séries indépendantes :

1. **Série A, coût global** : barème EnginLoc, milieu de la fourchette « standard » de chaque ville, divisé par la moyenne des milieux Rabat (5 800) et Kénitra (4 900), soit 5 350.
2. **Série B, main-d'œuvre et prestations posées** : grille géographique publiée par 7rafti (écarts à la moyenne nationale). On la rebase sur la moyenne RSK : (Rabat 1,12 + Salé 1,05 + Témara 1,05 + Kénitra 1,00) / 4 = 1,055.

**Coefficient proposé** = moyenne des deux séries quand elles existent toutes les deux, sinon la seule série disponible.

**Contrôles de cohérence** :
- Mano.ma (peinture et carrelage par ville).
- LeChantier : indices main-d'œuvre Marrakech/Tanger −5 à 0 %, Agadir/Fès −5 à −10 %, villes moyennes −15 à −25 %, rural −30 à −40 % contre Casablanca/Rabat.

| Ville | Série A (EnginLoc std) | Série B (7rafti rebasé) | **Coef. proposé** | Contrôle Mano (peinture int., Rabat/Salé = 1) | Commentaire |
|---|---|---|---|---|---|
| Casablanca | 1,03 | 1,09 | **1,06** | 1,13 | La main-d'œuvre est plus chère que le global |
| Rabat | 1,08 | 1,06 | **1,07** | 1,00 | |
| Salé | — | 1,00 | **1,00** | 1,00 | Une seule série |
| Témara | — | 1,00 | **1,00** | — | Une seule série |
| Kénitra | 0,92 | 0,95 | **0,93** | — | |
| Mohammedia | — | 1,02 | **1,02** | — | |
| Tanger | 1,01 | 1,02 | **1,02** | 0,93 | |
| Tétouan | 0,95 | 0,90 | **0,93** | — | + surcoût sismique gros œuvre 10-18 % |
| Marrakech | 0,97 | 1,04 | **1,01** | 0,93 | Haut de gamme/luxe : ≈ 1,15-1,18 (plafond EnginLoc 15 000) |
| Agadir | 0,94 | 1,00 | **0,97** | 0,84 | + sismique 5-10 % |
| Fès | 0,92 | 0,92 | **0,92** | 0,77 | |
| Meknès | 0,87 | 0,90 | **0,89** | 0,77 | |
| Oujda | 0,89 | 0,87 | **0,88** | 0,64 | |
| El Jadida | 0,90 | 0,95 | **0,93** | — | |
| Nador | 0,92 | 0,87 | **0,90** | — | + sismique |
| Béni Mellal | 0,82 | 0,87 | **0,85** | 0,64 | |
| Settat | 0,79 | — | **0,79** | — | Une seule série |
| Safi / Essaouira | — | 0,87 / 0,95 | **0,87 / 0,95** | — | Essaouira : logistique +8 % (OLAM) |
| Taza / Errachidia | — | 0,83 | **0,83** | — | |
| Rural | — | — | **0,65 – 0,80** | — | LeChantier, main-d'œuvre −30 à −40 % ; matériaux quasi identiques (7rafti) |

**Remarques** :
- L'écart entre villes est **plus marqué sur la main-d'œuvre que sur le coût global**, car les matériaux ont un prix quasi national. Mano donne une dispersion de 0,64 à 1,13 sur la peinture, EnginLoc de 0,79 à 1,08 sur le coût global.
  - Pour CITURBAREA, on recommande donc **deux coefficients par ville** : `coef_global`, issu du tableau ci-dessus, et `coef_mo`, environ 1,3 fois plus dispersé (écart à 1 multiplié par 1,3).
- La moyenne de la région RSK vaut bien 1,00 par construction : (1,07 + 1,00 + 1,00 + 0,93) / 4.
- Ces coefficients reposent sur deux sources privées : la confiance est **moyenne**. À recalibrer avec des devis CITURBAREA réels.

## 3. Prix d'ouvrages posés côté privé (synthèse)

| Ouvrage | Unité | Fourchette retenue | Dispersion / sources |
|---|---|---|---|
| Maçonnerie agglo 20 cm posée | m² | 180 – 250 | Double mur isolé 280-380 ; brique 12 trous 200-280 ; cloison brique 7-10 cm 80-150 (LeChantier) |
| Plancher hourdis complet | m² | 350 – 545 | Dont MO 60-100 ; dalle pleine 480-810 (LeChantier) |
| Enduit ciment | m² | 35 – 160 | 35-65 (LeChantier) contre 80-160 (7rafti) ; enduit plâtre 70-150 ; monocouche façade 85-140 |
| Carrelage posé (MO seule) | m² | 25 – 180 | Mano 25-40 (droit), Bnidari 80-150, LeChantier 80-180, Bricolat Casablanca 70-140 ; zellige 80-350 |
| Peinture intérieure | m² | MO 25-50 ; fourni-posé 60-100 | Mano, LeChantier 30-60 (MO), Archiplan 30-60 (fourni-posé) |
| Peinture façade | m² | MO 35-70 ; fourni-posé 80-130 | Mano |
| Étanchéité terrasse | m² | 80 – 160 (membrane) ; 300-550 avec forme de pente et protection | LeChantier (2 pages) |
| Étanchéité douche / salle de bain | m² / forfait | 130-200 / 500-1 500 | LeChantier, 7rafti |
| Faux plafond BA13 | m² | 130 – 280 | Mano 130-200, LeChantier 140-280, Archiplan 60-150 ; staff lisse 90-140 ; MO seule 40-80 |
| Menuiserie alu (double vitrage) | m² | 1 100 – 2 800 | 7rafti 1 100-1 400 (gamme locale) contre LeChantier 1 800-2 800 (Sapa/Hydro) ; RPT jusqu'à 3 500 ; coulissant premium 4 500-7 500 |
| Point électrique | u | 110 – 320 | Une seule source (7rafti, contexte rénovation de salle de bain). Archiplan : forfait électricité maison 8-20 k DH hors fournitures |
| Plomberie, point d'eau | u | 250 – 800 | 7rafti. Salle de bain : 6-8 points, soit 1 500-6 400 DH ; salle de bain complète 12-45 k DH |
| Piscine | u / m² | 80 000 – 200 000 (petite, béton) ; gros œuvre bassin 500-1 000 DH/m² | Sources faibles (prog-immo, VVA) ; étanchéité piscine 180-320 DH/m² |
| Clôture maçonnée | ml | ≈ 550 (h = 2,5 m) | **Une seule donnée, ancienne (~2017, forum)** : lacune |
| Garde-corps (pose seule) | ml | 200 – 650 | Alu + verre fourni-posé 1 500-3 500 DH/ml |
| VRD privée (pavé autobloquant) | m² | 65 – 280 (index, pose non distinguée) | Lacune |

## 4. Main-d'œuvre

### 4.1 Cadre légal 2026 (fiabilité A)

- **SMIG** (industrie, commerce, professions libérales, ce qui inclut le BTP), en vigueur depuis le 1er janvier 2026 : **17,92 DH/h**, soit **3 422,72 DH brut/mois** sur 191 h. Le net à payer est de 3 192,03 DH.
  - Avant 2026 : 17,10 DH/h, soit 3 266,10 DH/mois.
  - Base légale : décret n° 2.25.983, accord social du 29 avril 2024 (source : note Audinex).
  - Équivalent journalier brut sur 8 h : 143,36 DH (calcul).
- **SMAG** depuis avril 2026 : **97,44 DH/jour** (auparavant 93 DH).
- **Charges patronales** : 21,09 % au total.
  - Allocations familiales : 6,40 %.
  - Prestations court terme : 1,05 %, plafonné à 6 000 DH.
  - Prestations long terme : 7,93 %, plafonné à 6 000 DH.
  - AMO : 4,11 %, sans plafond.
  - Taxe de formation professionnelle : 1,60 %.
  - Part salariale : 6,74 %.
  - Source : Upsilon Consulting (à confirmer sur cnss.ma).
- **Coût employeur au SMIG** : 3 422,72 + 721,84 = **4 144,56 DH/mois** (calcul). La note Audinex affiche 3 596,43 DH : c'est une erreur arithmétique de la source.
- **Convention BTP** : aucune grille conventionnelle publique trouvée. LeChantier cite une « grille salariale conventionnelle BTP 2026 FNBTP/CGEM-BTP » sans lien. Elle n'a pas été retrouvée et reste donc à vérifier.

### 4.2 Taux journaliers par métier (2025-2026)

| Métier | Fourchette observée (DH/jour) | Référence proposée base RSK | Sources |
|---|---|---|---|
| Manœuvre / aide-maçon | 100 – 250 | **200** | LeChantier 150-250 ; Fadil 200-250 ; Archiplan 100-150 (sous le SMIG, informel) ; Jobsquare 3 500-5 000/mois soit 135-192/j |
| Apprenti | ≈ 200 | 180 – 200 | FNPI via Actu-Maroc et Bladi (sept. 2025) |
| Maçon qualifié (maâlem) | 200 – 450 | **330** | LeChantier 280-450 ; Fadil 350-400 ; FNPI « jusqu'à 300 » ; Archiplan 200-350 ; Jobsquare 192-308/j |
| Ferrailleur / coffreur | (pas de tarif journalier) | ≈ maçon (300-350) | Jobsquare place la même grille mensuelle que le maçon (5 000-8 000) ; Hespress cite un ferrailleur à 4 300 DH (mensuel probable). Hausse de 10 à 15 % dans les grandes villes (EnginLoc). Chantiers Mondial 2030 : +30 % (Bladi) |
| Carreleur | ≈ 190 – 350 (déduit) | 300 | Surtout payé au m² : MO 25-180 DH/m². Jobsquare : 5 000-9 000/mois |
| Plâtrier / staffeur | n.d. | — | Uniquement au m² : enduit plâtre 70-150 fourni-posé, main-d'œuvre ≈ 50 % (7rafti) |
| Peintre | 200 – 300 | 250 | Archiplan ; ou 25-60 DH/m² |
| Électricien | 300 – 550 | **400** | LeChantier 300-550 ; Fadil 400-500 ; Jobsquare 5 500-10 000/mois |
| Plombier | 300 – 550 | **400** | Mêmes sources que l'électricien |
| Chef d'équipe | 350 – 600 | 450 | Archiplan |
| Chef de chantier | 8 000 – 30 000 /mois | 13 000 – 22 000 /mois (confirmé) | Jobsquare |

**Modulateurs (LeChantier)** :
- Pic de mai à octobre : +15 %.
- Urgence : +20 %.
- Maâlem expert : environ +50 % par rapport à un aide-maçon.
- Évolution de la fourchette maçon : 260-420 DH en novembre 2025, puis 280-450 DH en avril 2026 (+6 %).

**Productivité** (m² d'agglos posés par jour, etc.) : **aucune source marocaine trouvée**.

### 4.3 Tâcherons (prix à la tâche)

- Gros œuvre en main-d'œuvre seule : **230 à 450 DH/m² de plancher**. Fondations : environ 115 DH/m².
- Formule annoncée 15 à 20 % moins chère que l'entreprise, mais elle demande une présence quotidienne du maître d'ouvrage.
- Usage fréquent : paiement **par étage**, et non au m² (forums).

## 5. Honoraires et frais annexes

| Poste | Valeur | Sources (dispersion) |
|---|---|---|
| Architecte | 3 – 12 % du coût des travaux ; valeur centrale observée 5 % | Archiplan 3-5 % (≈ 3 % + TVA) ; Francobat 4-6 % ; LesMRE 5-8 % ; LeChantier calc. 5 % ; CB Signature 5-10 % ; Archiplan 2026 6-12 % ; Jobsquare 8-12 % ; forfait villa ≈ 30 000 DH (Francobat). **Le barème CNOA n'a pas été trouvé en ligne.** |
| BET structure | 1 – 3 % (forfait villa ≈ 15 000 DH) | Francobat 1-2 %, Archiplan 1-3 %, CB Signature 3-5 % |
| Topographe | 2 000 – 15 000 DH | Archiplan 2-10 k ; Francobat ≈ 15 k |
| Laboratoire / étude de sol | 3 000 – 30 000 DH | Archiplan 3-15 k (maison) ; Francobat 10-30 k (immeuble) |
| Bureau de contrôle | 30 000 – 80 000 DH (immeuble) | Francobat (aucune donnée pour une villa) |
| Taxe sur les opérations de construction | **Plafonds légaux : 30 DH/m² couvert (logement individuel), 20 DH/m² (collectif, commercial ou administratif)** ; restauration : droit fixe ≤ 500 DH | Loi 47-06 telle que reprise par FH2MRE (2011, fiabilité A). Le taux exact relève d'un arrêté communal. **La loi 14-25 (2025) a modifié la 47-06 : vérifier si ces plafonds ont changé.** Pratique observée : 20-25 DH/m² (Francobat) |
| Occupation du domaine public (chantier) | ≤ 40 DH/m² par trimestre | Loi 47-06 (FH2MRE) |
| Permis et frais administratifs (global) | 2 000 – 10 000 DH (maison) ; 50-150 DH/m² (estimation Francobat, immeuble) | LesMRE ; Francobat |
| Raccordements eau et électricité | 5 000 – 20 000 DH (maison, selon la distance) ; 30 000 – 100 000 DH (immeuble) | LesMRE ; Francobat. **Aucune grille Lydec, Redal, Amendis ou ONEE publiée** : devis établi après étude technique (eRegulations Rabat) |
| Ascenseur | 150 000 – 350 000 DH | Francobat |
| Imprévus | 5 – 15 % | Francobat, Archiplan ; dépassements réels courants de 20 à 40 % (LesMRE) |

## 6. Concurrents et simulateurs existants

| Outil | Hypothèses publiées | Points faibles |
|---|---|---|
| **bati.ma** (calculateur + guide trimestriel) | 4 standings (3 000 → 15 000 DH/m²), coefficient par ville appliqué mais non publié | Coefficients opaques |
| **EnginLoc / BTPro** (barème) | 14 villes × 3 standings, HT, m² de surface plancher, répartition par lot (standing économique) | Pas de simulateur, méthode vague |
| **LeChantier.ma** (calculateur, estimateur salle de bain, 60+ fiches prix) | Économique 3 500-6 300, standard 6 300-8 300, haut 8 300-12 000 ; gros œuvre 42 % / second œuvre 34 % / finitions 24 % ; architecte 5 % ; permis 7 500 DH | L'exemple sort de sa propre fourchette (9 545). Fiches mises à jour mensuellement avec tendances : concurrent le plus outillé |
| **7rafti.net** (plateforme d'artisans + simulateur) | **Grille géographique publiée** (−12 % à +15 %), prix posés par lot | Couvre la rénovation plus que le neuf |
| **Rifaa.ma** (simulateur gros œuvre) | Prix par plancher (1 100-1 300), fondations 800, sous-sol 1 200-1 300, acrotère 250-350 | Gros œuvre seulement ; le formulaire contredit le tableau ; sert surtout à capter des leads |
| **Wall Constructions** (Marrakech) | Simulateur « fiable à 95 % », gros œuvre / clé en main TTC | Local, commercial |
| **OLAM Company** | 3 gammes TTC avec plans | Haut de marché |
| **Francobat** | Calculateur (sans résultat au moment du test) | Contradictions entre pages |
| **Mano.ma, Bnidari.ma, Bricolat** | Prix de main-d'œuvre au m² par ville (Mano) | Pas de date affichée (Mano) |

**Ce qu'aucun concurrent ne fait** :
- séparer clairement les trois marchés (tâcheron, entreprise HT, constructeur TTC) ;
- publier la méthode de ses coefficients régionaux (sauf 7rafti) ;
- intégrer le cadre légal (taxe de construction, SMIG, CNSS) ;
- distinguer le coefficient global du coefficient main-d'œuvre.

## 7. Lacunes

1. **Aucune donnée officielle** de coût de construction privé. Rien n'a été trouvé côté HCP, BAM, CDG ou FNBTP. La FNPI ne publie que des hausses de coût en % (anciennes).
2. **Salé, Témara, Mohammedia** : pas de coût au m² direct, uniquement un coefficient de main-d'œuvre.
3. **Productivités** (m²/jour par métier) : rien trouvé.
4. **Tâcheron par corps d'état** (carrelage, enduit à la tâche) : très partiel.
5. **Clôture, VRD privée, piscine** : sources faibles, anciennes ou forums.
6. **Raccordements** Lydec, Redal, Amendis, ONEE : aucune grille publique ; devis au cas par cas.
7. **Taxe de construction après la loi 14-25 (2025)** : plafonds 2011 non revérifiés. Les barèmes communaux (Casablanca, Rabat…) n'ont pas été trouvés en texte exploitable (guide Casainvest en PDF image).
8. **Barème CNOA** des honoraires : introuvable en ligne.
9. **Taux de TVA** applicable aux travaux immobiliers en 2026 : non vérifié sur une source primaire.
10. Médias24 (403), TelQuel, L'Économiste, Mubawab/Yakeey/Sarouty : aucun article chiffré exploitable n'a pu être consulté.

## 8. Recommandations pour la base de prix CITURBAREA

1. **Modèle de données.** Ajouter à chaque prix les champs `perimetre` (tâcheron / entreprise HT / constructeur TTC), `taxes` et `unite_surface` (surface plancher, habitable ou emprise). Sans eux, les fourchettes ne sont pas comparables.
2. **Grille par défaut (base RSK, entreprise HT)** : économique 3 500, moyen 5 350, haut 9 100, luxe 13 000 DH/m² plancher. Afficher la fourchette basse-haute du §1.1 et non un prix unique.
3. **Coefficients** : utiliser `coef_global` (tableau §2) pour le coût au m² et `coef_mo` (plus dispersé) pour les lignes de main-d'œuvre. Pour Marrakech en haut de gamme ou luxe, appliquer un surcoefficient d'environ 1,15. Pour les zones sismiques (Al Hoceima, Nador, Tétouan, Agadir), ajouter +5 à 18 % au gros œuvre.
4. **Main-d'œuvre** :
   - plancher légal 2026 = 143 DH/jour brut, soit environ 174 DH chargé ;
   - références proposées : manœuvre 200, maçon 330, électricien et plombier 400, chef d'équipe 450 DH/jour ;
   - indexer chaque année sur le SMIG et sur les relevés LeChantier (+6 % en 6 mois).
5. **Contrôle P1 / P3** :
   - P1 (5 % × budget) et P3 (10 % × coût de réalisation) : signaler tout budget client inférieur à 2 800 DH/m² en « entreprise » comme probablement sous-estimé, sauf si le périmètre déclaré est tâcheron ou autoconstruction ;
   - prévoir une provision d'imprévus d'au moins 10 % (dépassements courants de 20 à 40 %).
6. **Frais annexes par défaut (villa)** :
   - taxe de construction de 30 DH/m² couvert au maximum ;
   - raccordements 5 000-20 000 DH ;
   - topographe 2 000-15 000 DH ;
   - étude de sol 3 000-15 000 DH ;
   - BET 1-3 % ;
   - architecte 3-6 % (aligner sur le barème CNOA dès qu'il est obtenu) ;
   - bureau de contrôle obligatoire pour l'immeuble (30-80 k DH).
7. **Calibrage** : à court terme, remplacer ces valeurs par les devis reçus via les portes P1 et P3 (prix réels par ville). Viser 20 devis par ville principale pour recalculer les coefficients. Demander à la FNBTP sa grille conventionnelle 2026 et à la commune de Rabat son arrêté fiscal.
8. **Fiabilité à afficher** : signaler côté UI que les fourchettes privées proviennent de sources commerciales (fiabilité B/C). Seuls le SMIG/SMAG, la CNSS et les plafonds de la loi 47-06 sont des références réglementaires.
