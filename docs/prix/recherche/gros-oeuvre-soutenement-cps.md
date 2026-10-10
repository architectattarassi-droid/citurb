# Gros œuvre, fondations, planchers, soutènements, cour anglaise et CPS : villa au Maroc, 2025-2026

- **Date de la recherche :** 2026-10-10. Les données structurées sont dans `gros-oeuvre-soutenement-cps.json`.
- **Complète, sans les répéter :** `cout-par-lot-standing.md` (lots par standing) et `marche-prive-main-oeuvre.md` (tâcheron, entreprise et main-d'œuvre). Les chiffres déjà présents dans ces fichiers ne sont rappelés que pour le recoupement.
- **Monnaie et taxes :** DH, HT, sauf mention contraire.
- **Fiabilité :**
  - **A** : texte officiel ou document de marché public ;
  - **B** : source marocaine datée et détaillée ;
  - **C** : simulateur commercial, page non datée ou **calcul CITURBAREA** (hypothèses explicites).

## 0. Ce qu'il faut savoir sur les sources

1. **Aucune source publique marocaine ne donne de prix de mur de soutènement au mètre linéaire selon la hauteur.** Ni la cour anglaise ni la dalle nervurée ne sont chiffrées non plus. Les prix au ml des §4 et §5 sont donc des **calculs** : quantités types multipliées par des prix unitaires sourcés. Leurs hypothèses sont données et il faut les recaler sur devis.
2. **Le générateur CYPE Maroc** (maroc.prix-construction.info) est la seule base marocaine qui détaille fondations, voiles, soutènements, drainage et étanchéité enterrée.
   - Ses prix ne sont pas datés et la méthode est espagnole.
   - Il compte la main-d'œuvre à 63-79 DH/h, environ 3 à 4 fois le coût d'un ouvrier de tâcheron marocain.
   - En revanche, ses quantités (kg d'acier par m³, m³ par m², heures) sont solides.
   - Classement : **B pour les quantités, C pour les prix**.
3. **Plusieurs pages CYPE existent en deux versions**, avec des écarts d'environ 5 % (par exemple, mur BA de soutènement 1 456,56 ou 1 475,12 DH/m³ ; plancher 25+5 461,96 ou 486,53 DH/m²). La valeur retenue est celle de la page consultée le 10/10/2026.
4. **Les repères de l'architecte (1 200 DH/m² de gros œuvre et 600 DH/m² de fondations) sont confirmés** par deux sources indépendantes et par un calcul ascendant (voir §1.4 et §2.3).

---

## 1. Gros œuvre villa, au m² de plancher

### 1.1 Niveaux de prix publiés

| Périmètre | DH/m² plancher | Source (date) | Fiab. |
|---|---|---|---|
| Gros œuvre, « à partir de » / moyenne | **≈ 1 200** | CTravaux (non daté, © 2026) | C |
| Gros œuvre par plancher, MO + matériaux (sans fondations) | 1 100 (maison) – 1 300 (villa standing) | Rifaa, simulateur 2026 | C |
| Gros œuvre par plancher (RDC et étages) | 1 550 ; fondations 1 400 × surface constructible ; sous-sol enterré 1 800 | Francobat, simulateur (non daté) | C |
| Gros œuvre villa R+1 éco, par entreprise | 1 800 – 2 750 | LeChantier, 05/04/2026 | B |
| Gros œuvre villa R+1 standing, par entreprise | 2 000 – 3 200 | LeChantier, 05/04/2026 | B |
| Seuil d'alerte (offre trop basse en 2026) | < 1 800 | LeChantier, guide gros œuvre et terrassement 2026 | B |
| Gros œuvre villa 2025 | 2 000 – 3 500 | Habitat Services Plus, 02/11/2024 | C |
| Structure brute (béton, acier, dalles, voiles, sans étanchéité ni extérieurs), Marrakech | 2 400 – 2 800 | Wall Constructions (via recherche, non refetché) | C |

**Lecture.** Deux familles coexistent, comme déjà noté dans `marche-prive-main-oeuvre.md` :
- **le tâcheron**, à qui le maître d'ouvrage paie MO et matières au coût, sans frais généraux d'entreprise : 1 000 à 1 500 DH/m² ;
- **l'entreprise**, qui facture HT avec marge, installation de chantier et BPE : 1 800 à 3 200 DH/m².

Le repère de l'architecte (1 200, MO + matière, sans dalles pleines) se situe en bas de la première famille.

### 1.2 Décomposition par poste (parts publiées)

LeChantier (05/04/2026) donne les parts du gros œuvre suivantes :

| Poste | Part |
|---|---|
| Terrassement | 5-8 % |
| Fondations | 12-20 % |
| Structure | 20-30 % |
| Murs | 15-22 % |
| Dalles | 18-25 % |
| Escalier + toiture | 8-12 % |

Les poids internes déjà retenus dans `cout-par-lot-standing.md` ne sont pas modifiés : structure 42 %, maçonnerie 20 %, façades 16 %, fondations 11,4 %, étanchéité 6 %, terrassement 4,6 %.

### 1.3 Prix unitaires posés (rappel des sources consultées)

| Ouvrage | Prix | Source | Fiab. |
|---|---|---|---|
| Décapage 20-30 cm | 25 – 40 DH/m² | LeChantier 04/2026 | B |
| Fouilles en rigole / en puits | 80 – 150 / 100 – 200 DH/m³ | LeChantier 04/2026 | B |
| Évacuation des déblais | 60 – 120 DH/m³ (80 – 180 selon guide terrassement) | LeChantier | B |
| Remblai compacté | 50 – 80 DH/m³ | LeChantier 04/2026 | B |
| Béton de propreté | 700 – 900 DH/m³ | LeChantier 04/2026 | B |
| Béton armé B25 de fondation (hors acier) | 1 200 – 1 500 DH/m³ | LeChantier 04/2026 | B |
| Acier HA E500 | 9 000 – 10 000 DH/t | LeChantier 04/2026 (cf. `materiaux-gros-oeuvre.md` : réf. 9 500) | B |
| Coffrage | 150 – 250 DH/m² | LeChantier 04/2026 | B |
| Plancher hourdis complet | 350 – 545 DH/m² | LeChantier 04/2026 | B |
| Dalle pleine complète | 480 – 810 DH/m² | LeChantier 04/2026 | B |
| Acrotère h 60-100 | 250 – 400 DH/ml | LeChantier 04/2026 ; Rifaa 250-350 | B |
| Escalier 2 volées + palier (béton + MO) | 12 000 – 22 000 DH/u | LeChantier 04/2026 | B |
| Forme de pente + bicouche + protection | 60-100 + 80-150 + 120-200 DH/m² | LeChantier 04/2026 | B |
| Surcoût sismique (zones 3-4 / zone 1) | +10-18 % / +3-5 % sur le gros œuvre | LeChantier 04/2026 | B |
| Surcoût BPE | +80 à 150 DH/m³, soit 3 à 5 % du gros œuvre | LeChantier, guide gros œuvre 2026 | B |
| Fondations spéciales (sol difficile) | +15 à 35 % du gros œuvre | LeChantier, guide gros œuvre 2026 | B |

### 1.4 Recoupement ascendant du repère « 1 200 DH/m² » (calcul CITURBAREA, fiabilité C)

**Cas type :** villa R+1 de 200 m² de plancher et 100 m² d'emprise, sur semelles isolées. Plancher hourdis 16+4 au RDC et en toiture-terrasse, sans sous-sol. Prix tâcheron, MO + matières.

| Poste | Hypothèse de quantité | DH/m² plancher (bas – haut) |
|---|---|---|
| Terrassement (décapage, fouilles, remblai, évacuation) | ≈ 45 m³ de fouilles + 20 m³ évacués | 60 – 80 |
| Fondations (béton de propreté, semelles, amorces, longrines, gros béton) | 0,12 m³ BA/m² emprise ; voir §2 | 175 – 235 |
| Poteaux, poutres, chaînages | 0,08-0,10 m³/m² × ≈ 3 200 DH/m³ coffré-armé | 260 – 330 |
| Planchers hourdis 16+4 | 1,0 m² de plancher/m² (RDC + terrasse) × 350-450 | 350 – 450 |
| Escalier | 12-22 k DH / 200 m² | 60 – 110 |
| Maçonnerie (agglo/brique extérieure, cloisons) | 1,2-1,5 m² de mur/m² × ≈ 150 | 180 – 225 |
| Acrotères | ≈ 40 ml × 250-400 | 50 – 80 |
| **Sous-total « gros œuvre nu »** | | **≈ 1 135 – 1 510** |
| Enduits ciment intérieurs et extérieurs (si inclus) | 2,5-3 m²/m² × 35-65 | +90 – 195 |
| Étanchéité toiture (forme, bicouche, protection) | 100 m² × 260-450 / 200 | +130 – 225 |
| **Gros œuvre « complet »** | | **≈ 1 355 – 1 930** |

**Conclusion :** **1 200 DH/m²** correspond à un gros œuvre « nu » (structure + planchers hourdis + maçonnerie + fondations courantes) payé au tâcheron. Il exclut les enduits, l'étanchéité, la dalle pleine et les sous-sols. Une dalle pleine à la place des hourdis ajouterait environ 130 à 265 DH/m² plancher (voir §3).

### 1.5 Ce que recouvre « le gros œuvre » au Maroc

Les sources ne s'accordent pas :

| Source | Contenu du gros œuvre |
|---|---|
| **CPS public APDN (Tanger 2015)** | Lot 1 « Gros œuvre - revêtement - étanchéité » : terrassements, fondations, dallages, assainissement, BA en élévation, planchers corps creux, cloisons (linteaux compris), **enduits intérieurs et extérieurs**, appuis, revêtements. L'**étanchéité** forme un sous-chapitre avec couronnement d'acrotère, forme de pente et solins. |
| **LeChantier 2026** | Terrassement, fondations, structure, murs, dalles, escalier et **toiture** (acrotères, forme de pente, étanchéité, protection). **Pas d'enduits.** |
| **Rifaa** | Prix par plancher : « main d'œuvre et matériaux de gros œuvre ». Acrotère à part, finitions exclues. |
| **Wall Constructions** | « Structure brute » = béton, acier, dalles, voiles, **sans étanchéité ni extérieurs**. |
| **Habitat Services Plus** | Fondations, murs porteurs, structure, toiture et « isolation de base ». |

**Recommandation pour le moteur :** décomposer le gros œuvre en trois sous-lots, chacun avec un drapeau `inclus_dans_GO` :
- `GO_nu` (fondations, structure, planchers, maçonnerie, escalier, acrotères) ;
- `enduits` ;
- `etancheite_toiture`.

Cela évite de comparer 1 200 « nu » à 2 500 « complet ».

### 1.6 Part main-d'œuvre / matière

| Indicateur | Valeur | Source |
|---|---|---|
| MO seule du gros œuvre (tâcheron) | 230 – 450 DH/m² plancher, soit **≈ 20-35 %** d'un gros œuvre à 1 200-1 500 | `marche-prive-main-oeuvre.md` |
| Plancher hourdis | MO 60-100 sur 350-545, soit ≈ 17-18 % | LeChantier |
| Dalle pleine | MO 80-130 sur 480-810, soit ≈ 16-17 % | LeChantier |
| Semelle BA (CYPE) | MO 12 % du prix au m³ | CYPE |
| Mur de sous-sol (CYPE) | MO 15 % | CYPE |
| Coffrage (CYPE) | MO 49-60 %, d'où l'intérêt de suivre le coffrage à part | CYPE |
| Gabion | MO 24 % | CYPE |

---

## 2. Fondations

### 2.1 Prix au m³ (béton armé et autres)

| Type | DH/m³ HT | Acier (kg/m³) | Coffrage inclus ? | Source | Fiab. |
|---|---|---|---|---|---|
| Semelle isolée BA (GFI010) | **1 783** | 50 (51) | non (GFI030 à part ; ≈ 74 DH/m² d'après la recherche) | CYPE Maroc | C |
| Semelle isolée en béton massif, non armé (GFI020) | 1 102 | – | non | CYPE Maroc | C |
| Semelle filante BA (GFF010) | **2 302** | ≈ 100 (102) | non | CYPE Maroc | C |
| Radier (GFA010) | **2 218** | ≈ 85 (86,7) | non | CYPE Maroc | C |
| Mur de sous-sol / voile enterré (GS) | 1 785 | 50 (51) | non (coffrage une face GSM020 : 128 DH/m²) | CYPE Maroc | C |
| Semelle sur pieux | ≈ 2 081 | ≈ 80 | – | CYPE (via recherche) | C |
| Fondations isolées | 600 – 900 | – | – | LeChantier, guide terrassement 2026 | C (périmètre flou, probablement béton seul) |
| Fondations filantes | 800 – 1 400 DH/**ml** | – | – | LeChantier, guide terrassement 2026 | C |
| Béton cyclopéen / gros béton | 866 (CYPE, mur) ; 350 (Préfecture de Casablanca, 2010) | – | – | CYPE ; `marches-publics.md` | C / B |
| Fouilles en puits | 100 – 200 | – | – | LeChantier | B |

**Contradiction.** CYPE donne la semelle filante plus chère au m³ que l'isolée (2 302 contre 1 783), parce qu'elle prévoit deux fois plus d'acier (100 contre 50 kg/m³). Les ratios français disent l'inverse :
- btp-cours : filantes 20/30/40, isolées 30/40/50 kg/m³ ;
- Polyvert : filantes 40-50, isolées 50-60 kg/m³.

**Recommandation :** prendre 40-60 kg/m³ pour les deux types en villa.

### 2.2 Ratios d'acier par élément (kg/m³ de béton)

| Élément | btp-cours (min / moy / max) | Polyvert (zone sismique modérée) |
|---|---|---|
| Semelles isolées | 30 / 40 / 50 | 50 – 60 |
| Semelles filantes | 20 / 30 / 40 | 40 – 50 |
| Longrines | 40 / 60 / 80 | 70-80 (non chargées) ; parasismiques 5 kg/ml |
| Radier | 45 / 60 / 80 | 50 – 70 (100 si étanche) |
| Poteaux | 50 / 80 / 150 | 125 – 150 (> 25×25) ; 200 (< 25×25) |
| Poutres | 80 / 130 / 180 | 200 (sur la retombée) |
| Voiles et soubassement | 20 / 40 / 80 | Infrastructure : 8-10 kg TS + 3-4 kg HA par m² de voile |
| Planchers poutrelles-entrevous | 30 / 35 / 40 | – |
| Habitation, global | – | 75-85 kg/m³, sur une base de 0,35-0,40 m³ de béton/m² de dalle (≈ 30 kg/m²) |

Ces ratios sont français (BAEL, zone sismique modérée). Au Maroc (RPS 2000/2011), ils sont plutôt à prendre en haut de fourchette en zones 3-4.

### 2.3 Fondations au m² d'emprise et recoupement du repère « 600 DH/m² »

| Source | Valeur | Périmètre | Fiab. |
|---|---|---|---|
| **Architecte (repère)** | **600 DH/m² d'emprise** | Semelles isolées, MO + matière | – |
| CTravaux | ≈ 600 DH/m² | « Plateforme » : excavation, nivellement, préparation des fondations | C |
| Rifaa | 800 DH/m² ; **600** « fondation avec sous-sol » | Surface non précisée (emprise selon toute vraisemblance) | C |
| LeChantier | 50 000 – 100 000 DH pour une villa R+1 de 200 m² | Soit 250-500 DH/m² plancher, ou **500-1 000 DH/m² d'emprise** (100 m²) | B |
| Francobat | 1 400 DH/m² × « surface constructible » | Base ambiguë | C |
| `marche-prive-main-oeuvre.md` | MO seule des fondations ≈ 115 DH/m² | – | – |

**Calcul CITURBAREA (C)** pour une villa **R+1** sur semelles isolées, bon sol à environ 1,5 m, trame de poteaux de 4-5 m :

| Composant | Quantité / m² d'emprise | Prix unitaire | DH/m² emprise |
|---|---|---|---|
| BA semelles + amorces + longrines | 0,10 – 0,14 m³ | 2 000 – 2 200 DH/m³ (avec 50 kg d'acier) | 200 – 310 |
| Coffrage (longrines, amorces) | 0,35 – 0,45 m² | 100 – 150 | 35 – 70 |
| Béton de propreté | 0,02 m³ | 800 | 15 |
| Gros béton de rattrapage | 0,05 – 0,15 m³ | 350 – 870 | 20 – 130 |
| Fouilles + remblai + évacuation | 0,4 – 0,5 m³ | ≈ 200 cumulé | 80 – 120 |
| **Total** | | | **≈ 350 – 645** |

- Acier : **5 – 8 kg/m² d'emprise** en R+1.
- En **R+2**, avec des semelles plus grandes : 0,14 – 0,20 m³ BA/m² d'emprise, 7 – 11 kg d'acier/m², **≈ 500 – 800 DH/m²**.
- Ces volumes sont une hypothèse de prédimensionnement. Aucune source marocaine ne donne de ratio m³/m² d'emprise.

**Verdict :** **600 DH/m² d'emprise est cohérent** pour des semelles isolées de villa R+1/R+2 en bon sol, terrassement de fondation compris, sans hérisson ni dallage du RDC.
- Le hérisson et le dallage ajoutent environ 260-430 DH/m² d'emprise : hérisson 20 cm + dallage BA 15 cm à 260-350 DH/m² (LeChantier, dalle béton 06/2026).
- **Radier** : 0,25-0,35 m³/m² × 2 200 + coffrage de rive, soit ≈ 600-850 DH/m² d'emprise, et plus si cuvelage.
- **Puits / gros béton profond** : ajouter (profondeur − 1,5 m) × section des puits × (fouille 100-200 + béton cyclopéen 350-870 DH/m³).

---

## 3. Planchers

| Type | Épaisseur | Prix posé DH/m² | Acier | Source | Fiab. |
|---|---|---|---|---|---|
| Hourdis complet (poutrelles + hourdis 150-220, béton 80-120, treillis + acier 40-70, étaiement 20-35, MO 60-100) | non précisée (16+4 courant) | **350 – 545** | – | LeChantier 04/2026 | B |
| Plancher unidirectionnel, poutrelles précontraintes, entrevous béton | 25+5 (30 cm) | **486,53** (autre version 461,96) | ≈ 2,1 kg HA + 1,1 m² de TS/m² ; béton 0,11 m³/m² | CYPE GPH010 | C |
| Toiture-terrasse hourdis 12+4 ou 20+4 + forme + enduit sous-face | – | ≈ 610 | – | Observatoire de Tétouan 2019-2020 (`marches-publics.md`) | B |
| Dalle pleine (coffrage 120-200, béton B25 180-300, acier 100-180, MO 80-130) | 15 – 20 cm | **480 – 810** | – | LeChantier 04/2026 | B |
| Dalle pleine (avec nervures et chaînages, sans poteaux) | 24 cm | **717,51** | ≈ 21 kg/m² ; ciment 116 kg/m² | CYPE GPB010 | C |
| Dalle sur sol ou terrasse lissée (pas un plancher porté) | 10 / 15 / 20 cm | 180-280 / 260-350 / 340-450 | treillis | LeChantier, dalle béton 06/2026 | B |
| Pose seule de hourdis (MO) | – | 30 – 50 | – | LeChantier, hourdis 10/2026 | B |
| Hourdis béton 16 ou 20 (unité) | – | 3,5 – 6 DH/u | – | LeChantier 10/2026 (cf. `materiaux-gros-oeuvre.md`) | B |
| Dalle nervurée | – | **non trouvé** | – | – | lacune |

- **Surcoût de la dalle pleine sur le hourdis :** +35 à 50 % au m². LeChantier donne 480-810 contre 350-545 (milieux : 645 contre 448, soit +44 %). CYPE donne 717 contre 487, soit +47 %, avec des épaisseurs différentes. En villa R+1, cela représente environ **+130 à +265 DH/m² de plancher** sur le gros œuvre, ce qui justifie le « sans dalles pleines » du repère.
- **Ratios d'acier :** hourdis 30-40 kg/m³ (btp-cours), soit 2-4 kg/m² de plancher avec la table de compression. Dalle pleine ≈ 21 kg/m² en 24 cm (CYPE), ou ≈ 8 kg TS + 4 kg HA en 20 cm (Polyvert).
- **Portées usuelles.** Aucune table de fabricant marocain n'a été trouvée. Les valeurs ci-dessous viennent de la règle de prédimensionnement BAEL h ≥ L/22,5 (connaissance générale, non vérifiée en ligne : fiabilité C). Les tables des fabricants restent la référence.

  | Plancher | Portée maximale (L/22,5) |
  |---|---|
  | 12+4 | ≈ 3,6 m |
  | 16+4 | ≈ 4,5 m |
  | 20+4/5 | ≈ 5,4-5,6 m |
  | 25+5 | ≈ 6,7 m |

  Une poutrelle précontrainte de fabricant peut aller au-delà : Fimurex R annonce 8,50 m avec étais.

---

## 4. Murs de soutènement

### 4.1 Prix unitaires sourcés

| Ouvrage | Prix HT | Contenu | Source | Fiab. |
|---|---|---|---|---|
| Mur BA en L/T (patin + talon), H ≤ 3 m | **1 475 DH/m³** | Béton B30 sur chantier, acier **≈ 22 kg/m³** (faible), barbacanes PVC ; **coffrage exclu** | CYPE ATS030 | C |
| Coffrage de mur de soutènement, 2 faces, H ≤ 3 m | **97,46 DH/m²** (par face) | Panneaux métalliques ; MO 49 % | CYPE ATS040 | C |
| Mur en béton cyclopéen, H ≤ 3 m | **866 DH/m³** (autre version 792) | 60 % béton + 40 % moellons, drains ; sans fondation ni coffrage | CYPE ATS020 | C |
| Mur en maçonnerie de moellons calcaires, H ≤ 3 m | **1 860 DH/m³** | Mortier de chaux M-15 (poste surévalué), drains ; sans fondation | CYPE ATS010 | C |
| Mur en gabions double torsion, 1 face vue | **723 DH/m³** | Cages 4×1×1 m, pierre granitique ; MO 24 % | CYPE BGM020 | C |
| Gabions, kit cage + pierre calcaire / pose | 380-480 / 80-180 DH/m³ | Soit **460-660 DH/m³ posé** ; Marrakech/Agadir +10-20 %, Atlas +15-30 % | LeChantier, 15/06/2026 | B |
| Gabions : règles de hauteur | ≤ 1,5 m sans étude ; 1,5-3 m étude recommandée ; > 3 m étude obligatoire ; base = 0,6-0,8 H | – | LeChantier, 15/06/2026 | B |
| Mur de clôture (repère, ce n'est pas un soutènement) | 369,50 DH/ml (CYPE) ; 1 100 DH/ml (Francobat) ; 550 (forum 2017) | – | divers | C |

### 4.2 Prix au mètre linéaire selon la hauteur (calcul CITURBAREA, fiabilité C)

**Hypothèses.** La hauteur H est la hauteur de terre retenue, sans surcharge, sol courant, drainage compris.
- **BA cantilever (en L ou T) :**
  - voile d'épaisseur ≈ H/12 (20 cm au minimum), semelle de largeur ≈ 0,6 H et d'épaisseur 25-40 cm ;
  - béton armé mis en œuvre à 2 100 DH/m³, fourchette 1 800-2 500 : BPE B25 ≈ 1 000-1 150, plus la mise en œuvre, plus 60-80 kg d'acier à environ 11 DH/kg posé ;
  - coffrage 130 DH/m², fourchette 100-250 ;
  - fouilles et remblai : 100-200 DH/m³ ;
  - drainage : barbacanes, gravier, drain ;
  - badigeon bitumineux sur la face arrière.
- **Gabions :** base 0,6-0,8 H, prix 600 DH/m³ (fourchette 460-720), plus réglage et géotextile.
- **Moellons ou béton cyclopéen (poids) :** largeur moyenne ≈ 0,4-0,5 H + 0,3 m, plus une semelle. Prix 1 300 DH/m³ : c'est une **hypothèse** entre le cyclopéen CYPE (866) et les moellons CYPE (1 860).

| H (m) | BA cantilever DH/ml (min – **réf** – max) | BA en DH/m² de parement (réf) | Gabions DH/ml | Moellons / cyclopéen DH/ml |
|---|---|---|---|---|
| 1 | 1 200 – **1 500** – 2 200 | 1 500 | 400 – **530** – 700 | 900 – **1 300** – 1 800 |
| 2 | 2 500 – **3 200** – 4 500 | 1 600 | 1 000 – **1 300** – 1 600 | 2 100 – **3 100** – 4 400 |
| 3 | 4 300 – **5 400** – 7 400 | 1 800 | 1 900 – **2 600** – 3 100 | 3 900 – **5 800** – 8 200 (déconseillé) |
| 4 | 6 300 – **7 800** – 10 600 | 1 950 | étude obligatoire, ancrages : non chiffré | non pertinent |

**Volumes par ml retenus :**
- BA : 0,40 / 0,89 / 1,57 / 2,4 m³ ; coffrage 2,5 / 4,6 / 6,7 / 8,8 m² ;
- gabions : 0,75 / 2,0 / 4,0 m³ ;
- poids : 0,8 / 2,1 / 4,0 m³.

**Lecture :** au-delà de 2 m, le mur poids coûte autant que le BA ou plus. Le gabion est 2 à 2,5 fois moins cher, mais il est réservé aux jardins et aux limites où son aspect est accepté.

**Coefficients d'emplacement proposés pour le moteur.** Ils sont dérivés du calcul (C) et sont à valider par l'architecte :

| Emplacement | Coefficient | Raison |
|---|---|---|
| Jardin / terrasse | 1,00 | Accès libre, talutage provisoire possible |
| Limite de propriété | 1,15 – 1,30 | Fouille blindée ou en passes alternées, coffrage une face contre terre, pas de débord de semelle chez le voisin (semelle en « L inversé », donc plus d'acier) |
| Sous-sol (voile porteur) | voir §4.3 | Le mur porte aussi le plancher : prix au m² de voile |
| Cour anglaise | voir §5 | – |

Pour toute hauteur supérieure à 3 m ou en présence d'une surcharge (voirie, bâtiment voisin), ajouter une étude géotechnique et de structure. LeChantier chiffre l'étude de sol G2 AVP à 5 000-15 000 DH.

### 4.3 Voile de sous-sol, drainage et étanchéité associés

| Élément | Prix HT | Source | Fiab. |
|---|---|---|---|
| Voile BA enterré (béton + acier 50 kg/m³, hors coffrage) | 1 785 DH/m³ | CYPE | C |
| Coffrage une face, mur de sous-sol (H ≤ 3 m) | 128 DH/m² | CYPE GSM020 | C |
| Étanchéité extérieure, membrane SBS 2,5 mm sur primaire | **133,61 DH/m²** (sans protection anti-poinçonnement) | CYPE EEM030 | C |
| Nappe drainante PEHD à excroissances + géotextile | **92,78 DH/m²** | CYPE EEM090 | C |
| Tranchée drainante en pied de mur (tube PVC Ø200, gravier, géotextile, 45×70 cm ; hors terrassement) | **436 DH/ml** (matières 87 %) | CYPE AAO020 | C |
| Imperméabilisation de radier, membrane SBS | 208,52 DH/m² | CYPE EEF010 (via recherche) | C |
| Étanchéité cristalline pour fondations (Penetron, Xypex, Mapei) | 95 – 180 DH/m² | LeChantier, 15/06/2026 | B |
| Sous-sol complet, au m² de sous-sol | 1 200 (maison) – 1 300 (villa) | Rifaa 2026 | C |
| Sous-sol entièrement enterré | 1 800 DH/m² | Francobat (non daté) | C |
| Surcoût d'un sous-sol ou d'un demi-niveau (terrassement + étanchéité) | +20 à 30 % du coût de construction | AE Architectes Marrakech, 01/05/2026 | C |

**Calcul C : voile de sous-sol de 20-25 cm au m² de voile**, terrassement et remblai compris :
- BA ≈ 0,22 m³ × 2 100 = 460 ;
- coffrage deux faces 240 ;
- étanchéité 134 ;
- nappe 93 ;
- drain (436/3 m) ≈ 145 ;
- terrassement et remblai ≈ 150.

Total : **≈ 1 200 DH/m² de voile** (850 – 1 600), soit ≈ 3 600 DH/ml pour 3 m de hauteur.

---

## 5. Cour anglaise

**Définition.** Une cour anglaise est un dégagement extérieur en contrebas du sol. Elle donne de la lumière, de l'aération et éventuellement un accès au sous-sol (Office québécois de la langue française).

**Règle marocaine trouvée** (une seule, à généraliser avec prudence). Le règlement du Plan d'aménagement de Mghogha-Souani (Tanger, homologation, décembre 2022), article 17 « Caves et sous-sols », prévoit que :
- le sous-sol n'est pas compté dans le COS ni comme niveau ;
- sa périphérie peut être entièrement dégagée s'il ouvre sur une cour anglaise ;
- pour les villas, les caves doivent émerger d'au moins 1/4 de leur hauteur, sans dépasser 80 cm, avec soupiraux ;
- un sous-sol totalement enterré exige ventilation, éclairage et sécurité étudiés.

Aucune largeur minimale de cour anglaise n'a été trouvée au Maroc. Pour comparaison, Montréal impose 1,5 × 1,5 m au minimum en cour avant. Le même plan limite le mur de clôture sur voie à 1,20 m de soubassement (plus 0,60 m de treillis en zone A) et les clôtures mitoyennes à 2,40 m.

**Composition type et calcul au ml (C).** Largeur nette 1,2 m, profondeur 3 m.

| Composant | Base | DH/ml (min – **réf** – max) |
|---|---|---|
| Mur de soutènement côté terre, H = 3 m (§4.2) | BA cantilever | 4 300 – **5 400** – 7 400 |
| Fond : hérisson + dalle BA 15 cm, 1,2 m² | 300-500 DH/m² (LeChantier dalle 15 cm 260-350 + hérisson) | 360 – **480** – 600 |
| Forme de pente + enduit hydrofuge ou étanchéité du fond | 1,2 m² × 70-170 | 80 – **120** – 200 |
| Évacuation EP : avaloir ou regard tous les 4-6 m, raccordement | avaloir 880, regard 795-1 183 DH/u (CYPE) | 150 – **250** – 400 |
| Protection en tête : garde-corps acier ≈ 987 DH/ml, alu-verre ≈ 1 463 (CYPE) ; ou grille caillebotis ≈ 521 DH/m² | – | 600 – **990** – 1 500 |
| Couronnement / chaperon | – | 60 – **100** – 150 |
| Surplus de fouille + évacuation (≈ 3,6 m³/ml) | 140-280 DH/m³ | 500 – **720** – 1 000 |
| **Total cour anglaise** | | **6 000 – 8 000 – 11 000 DH/ml** |

Le mur côté bâtiment est le voile du sous-sol, déjà compté au §4.3. Si la cour anglaise est fermée par une grille horizontale, on ne compte pas de garde-corps mais 1,2 m² de caillebotis (≈ 625 DH/ml).

---

## 6. Jardins et terrasses en pente

| Ouvrage | Valeur | Source / base | Fiab. |
|---|---|---|---|
| Muret de soutènement de jardin, H 0,6 m, BA | ≈ 900 DH/ml (700 – 1 200) | Calcul : 0,27 m³ × 2 100 + 1,5 m² de coffrage + drainage | C |
| Muret de jardin, H 0,6 m, maçonnerie / moellons | ≈ 750 DH/ml (550 – 1 000) | Calcul : 0,45 m³ × 1 300 + 150 | C |
| Muret en gabions, H 1 m | 400 – 700 DH/ml | §4.2 (LeChantier, CYPE) | C |
| Escalier extérieur béton (béton + MO, hors habillage) | **10 000 – 20 000 DH/u** | LeChantier 04/2026 | B |
| Habillage des marches (marbre, granit, carrelage) | 200 – 600 DH/marche | LeChantier 04/2026 | B |
| Terrasse en remblai, 1 m de haut, au m² | ≈ 520 DH/m² (330 – 630) | Calcul : remblai compacté 50-80 + tout-venant apporté 155 DH/m³ (`materiaux-gros-oeuvre.md`) + dallage 15 cm 260-350 (LeChantier) ; hors revêtement et hors mur de rive | C |
| Remblai compacté (sur place) | 50 – 80 DH/m³ | LeChantier 04/2026 | B |
| Terrain en pente, surcoût global villa | 200 000 – 500 000 DH (terrassement + fondations spéciales) | AE Architectes, 01/05/2026 | C |
| Aménagements extérieurs complets, villa haut de gamme | 200 000 – 500 000 DH | AE Architectes, 01/05/2026 | C |
| Revêtement drainant gazon / dalle alvéolaire, garde-corps, regards | voir CYPE (§5) | – | C |

**Règle de modélisation proposée :** décomposer le terrain en pente en trois lignes :
1. n murets de soutènement × ml × hauteur, avec le prix du §4.2 et un coefficient de 1,00 pour le jardin ;
2. surfaces de terrasses en remblai × hauteur moyenne ;
3. escaliers extérieurs en unités, ou par marche si l'on dispose d'un prix futur.

---

## 7. CPS type d'une villa (marché privé)

### 7.1 Ce qui existe

- **Aucun modèle public de CPS de villa privée** n'a été trouvé, ni chez le CNOA ni ailleurs. Le contrat d'architecte CNOA existe déjà dans CITURBAREA (P2), mais il ne s'agit pas d'un CPS d'entreprise.
- En marché privé, les clauses sont libres, sous réserve du Dahir des obligations et contrats. La garantie décennale relève de l'article 769 du DOC, rappelé par le CCAG-T aux articles 25-6 et 78.
- La pratique est de **reprendre le CCAG-T public comme référentiel** et un CPS public de bâtiment comme gabarit.
- Une recherche (non vérifiée dans le texte de loi) cite la loi 59-13 pour l'assurance décennale obligatoire. **À vérifier.**

### 7.2 CCAG-T (décret n° 2-14-394 du 13 mai 2016, BO n° 6470 du 2 juin 2016) : valeurs par défaut (fiabilité A)

| Clause | Valeur par défaut (« sauf stipulation contraire du CPS ») | Article |
|---|---|---|
| Cautionnement définitif | **3 %** du montant initial, à constituer dans les 20 jours ; restitué à la réception définitive | art. 15 |
| Pénalité si le cautionnement définitif n'est pas constitué (sans cautionnement provisoire) | 1 % du montant initial | art. 15-3 |
| Assurances avant démarrage | Véhicules, accidents du travail, RC du maître d'ouvrage, dommages aux ouvrages ; décennale si le CPS la prévoit, du PV de réception définitive jusqu'à la fin de la 10e année | art. 25 |
| Retenue de garantie | **1/10 de chaque acompte**, plafonnée à **7 %** du montant initial (+ avenants) ; remplaçable par une caution | art. 64 |
| Acomptes sur approvisionnements | Jusqu'à 4/5 de la valeur | art. 64-4 |
| Pénalité de retard | **1/1000 du montant du marché par jour calendaire** | art. 65 |
| Plafond des pénalités de retard | **8 %** du montant initial (+ travaux supplémentaires) | art. 65-7 |
| Pénalités particulières (documents, obligations) | Plafonnées à **2 %** | art. 66 |
| Augmentation de la masse des travaux | Plafonnée à 10 % | art. 57 |
| Diminution > 25 % | Indemnisation | art. 58 |
| Variation de quantité d'un poste > 50 % ET > 10 % du marché | Indemnité plafonnée à 15 % du prix unitaire | art. 59 |
| Travaux supplémentaires sans avenant | ≤ 10 % | art. 55 |
| Résiliation si la révision dépasse ± 50 % | – | art. 54 |
| Réception provisoire | Convocation sous 10 jours après l'avis d'achèvement ; transfert de propriété et des risques ; point de départ de la garantie | art. 73 |
| Délai de garantie | **12 mois** après le PV de réception provisoire ; obligation de parfait achèvement | art. 75 |
| Réception définitive | Demande au plus tard 20 jours avant la fin de la garantie ; le maître d'ouvrage désigne les personnes sous 10 jours | art. 76 |
| Après réception définitive | Seules les garanties particulières et la décennale (DOC art. 769) subsistent | art. 78 |
| Avances | Décret n° 2-14-272 | art. 63 |

**Plan du CCAG-T** (9 chapitres) :
1. Dispositions générales ;
2. Garanties du marché ;
3. Obligations générales de l'entrepreneur ;
4. Préparation et exécution des travaux ;
5. Interruption des travaux ;
6. Prix et règlement des comptes ;
7. Réceptions et garanties ;
8. Mesures coercitives ;
9. Règlement des différends et litiges.

**Contradiction relevée.** Le CPS APDN de 2015 (ci-dessous) plafonne les pénalités à **10 %**, alors que le CCAG-T 2016 retient **8 %**. Une recherche signale aussi des CPS récents du ministère de l'Équipement à 8 %. Le 10 % souvent cité vient du CCAG français ou d'anciens CPS.

**Décret 2-22-431** (8 mars 2023, en vigueur le 1er septembre 2023) : il remplace le décret 2-12-349 (passation des marchés, cautionnement provisoire à l'article 24). **Il n'a pas été vérifié** si un nouveau CCAG-T a remplacé le 2-14-394, qui renvoie encore au 2-12-349. C'est une lacune à lever sur marchespublics.gov.ma.

### 7.3 Gabarit observé : CPS APDN n° DCT/CONSTR-UNITES-PRESCOLAIRES/TNG/47-15 (Tanger, 2015, construction neuve, lot unique, fiabilité A pour la structure)

1. **Chapitre I, Indications générales :**
   - art. 1-5 : objet, composition, maître d'ouvrage, pièces constitutives, connaissance du dossier ;
   - art. 6 : délai de **5 mois** et pénalité de **1/1000 par jour**, plafond **10 %** ;
   - art. 7 : documents à fournir (assurances avant démarrage, cautionnement sous 30 jours, échantillons et plans d'exécution sous 15 jours, plans de récolement 15 jours avant la réception provisoire) ;
   - art. 8 : cautionnement provisoire **80 000 DH**, définitif **3 %**, retenue **10 % plafonnée à 7 %**, délai de garantie **1 an** ;
   - art. 9-30 : domicile, contrôle, échantillons, provenance des matériaux, récolement, nantissement, réceptions provisoire et définitive, ordres de service, modifications, travaux supplémentaires, malfaçons, encadrement, assurance RC et décennale (DOC 769), approvisionnement, **mode de règlement au métré** (prix du BPDE × quantités réellement exécutées), nettoyage, timbre, litiges ;
   - art. 31-48 : mode d'exécution, essais (DGA art. 4-3), organisation et installation de chantier, augmentation ou diminution de la masse, prix, **révision des prix** P = P0 × (0,15 + 0,85 × BAT6/BAT6₀) × TVA (arrêté n° 3-14-08 du 10/03/2008, indice BAT6 tous corps d'état), décomptes, compte prorata, frais divers, contrôle technique, dérogations au DGA et au CCAG-T, sous-traitance, résiliation.
2. **Chapitre II, Prescriptions techniques** par lot : gros œuvre (tolérances, bétons, essais, enduits), revêtements, menuiseries, plomberie, électricité, peinture, etc. Références : Devis général d'architecture (DGA), cahiers CSTB, DTU, normes marocaines.
3. **Chapitre III, Description des ouvrages et mode d'évaluation :**
   - **terrassements** : fouilles en masse et en puits/rigoles **au m³** (blindage et épuisement inclus), remblais au m³ théorique sans foisonnement, compactage à 95 % OPM par couches de 20 cm ;
   - **fondations** : béton de propreté m³ ; béton cyclopéen m³ (coffrage inclus) ; maçonnerie de moellons m³ ; **béton armé m³ coffrage compris** ; **acier au kg** (poids normalisés NF A 45-002) ;
   - **dallages** : hérisson 20 cm au m² ; dallage BA 15 cm au m² ;
   - **assainissement** : buses PVC au ml (terrassement compris) ; regards à l'unité, toute profondeur ;
   - **élévation** : BA m³ ; acier kg ; **planchers corps creux 12+5 / 20+5 au m², vides déduits** ;
   - **maçonnerie** : cloisons et doubles cloisons au m², linteaux et raidisseurs compris, vides déduits ; enduits au m² ; appuis au ml ;
   - **étanchéité** : couronnement d'acrotère au ml ; forme de pente au m² ; solins au ml ; étanchéité autoprotégée au m² ; gargouilles à l'unité ;
   - **extérieurs** : mur de clôture au ml.
4. **Chapitre IV, Bordereau des prix - détail estimatif (BPDE)** : n° de prix, désignation, unité, quantité, prix unitaire HT, total ; puis total HT, TVA, TTC.

### 7.4 Plan type retenu pour un CPS de villa privée CITURBAREA (proposition)

1. **Clauses administratives**
   - Objet et parties : maître d'ouvrage, architecte maître d'œuvre, BET, bureau de contrôle, entreprise ou tâcheron.
   - Pièces contractuelles par ordre de priorité : acte d'engagement, CPS, BPDE, plans visés, rapport géotechnique, CCAG-T 2-14-394 **pris comme référence contractuelle**, DGA/DTU/RPS 2000 (version 2011).
   - Forme du prix : forfaitaire ou au métré (BPDE), avec révision BAT6 si le délai dépasse 12 mois, sinon prix fermes.
   - Délai global et délais partiels : gros œuvre, hors d'eau, réception.
   - **Pénalité de retard de 1/1000 par jour calendaire, plafond 8 %** (valeurs CCAG-T). En privé, on voit aussi 1/500 avec un plafond de 10 % (non sourcé ici).
   - Avance éventuelle (≤ 10-30 % ; LeChantier recommande 30 % au plus) contre caution.
   - **Retenue de garantie de 10 % par décompte, plafond 7 %** (en privé : 5-10 % selon une source non vérifiée), remplaçable par une caution bancaire.
   - Cautionnement définitif de 3 % (facultatif en privé).
   - Assurances : RC chantier, accidents du travail, TRC, décennale (DOC 769).
   - Réception provisoire avec PV de réserves, garantie de parfait achèvement de 12 mois, réception définitive et libération de la retenue.
   - Sous-traitance soumise à agrément, résiliation, litiges (médiation ou arbitrage, tribunal).
2. **Prescriptions techniques par lot :** 01 terrassement et soutènements ; 02 fondations ; 03 structure BA ; 04 planchers ; 05 maçonnerie et enduits ; 06 étanchéité (toiture, enterrée, cour anglaise) ; 07 VRD et extérieurs ; puis les lots de second œuvre.
3. **Modes de métré :** ceux du §7.3, inchangés.
4. **BPDE** : avec les identifiants du moteur de chiffrage, un prix par poste et un sous-détail facultatif.

---

## 8. Contradictions et lacunes

### Contradictions

1. **Plafond des pénalités** : 8 % (CCAG-T 2016) contre 10 % (CPS APDN 2015 et pratique ancienne).
2. **Semelles isolées ou filantes, kg/m³** : CYPE 50 contre 100 ; btp-cours et Polyvert donnent des filantes plutôt moins armées que les isolées.
3. **Mur BA de soutènement CYPE** : 22 kg/m³, bien en dessous des 40-80 kg/m³ courants pour un voile contre terre. Le prix CYPE sous-estime donc l'acier, mais surestime la main-d'œuvre.
4. **Périmètre des « fondations »** :
   - CTravaux (600) parle de « plateforme » ;
   - Rifaa (800, ou 600 avec sous-sol) n'indique pas la surface de référence ;
   - Francobat (1 400) compte par « surface constructible » ;
   - LeChantier compte au forfait.

   Les surfaces de référence ne sont pas comparables sans hypothèse.
5. **Étendue du « gros œuvre »** : avec ou sans enduits et étanchéité (§1.5).
6. **LeChantier guide terrassement** : « fondations isolées 600-900 DH/m³ » est en dessous du BA B25 seul (1 200-1 500 DH/m³ sur la page coût du gros œuvre du même site). C'est probablement du béton non armé ou un prix de MO.

### Lacunes

1. Aucun prix de mur de soutènement au ml ou au m² publié au Maroc, quelle que soit la hauteur : le §4.2 est un calcul.
2. Aucun prix de cour anglaise, et aucune règle de largeur minimale au Maroc.
3. Dalle nervurée : aucun prix.
4. Portées des hourdis : pas de table de fabricant marocain (règle L/22,5 seulement).
5. Ratios m³ de béton et kg d'acier par m² d'emprise de villa : aucune source marocaine (§2.3 = hypothèse).
6. Moellons en marché privé marocain : aucun prix au m³ fiable (CYPE surévalué par le mortier de chaux).
7. CPS de villa privée publié : aucun. Il faut aussi vérifier si un nouveau CCAG-T a suivi le décret 2-22-431, et ce que prévoit la loi 59-13.
8. Escaliers extérieurs au ml ou par marche : non trouvé (forfait seulement).

**Prochaine étape recommandée :** faire chiffrer par 3 tâcherons et 2 entreprises, à Casablanca et Marrakech, un BPDE type construit sur le plan du §7.4. Il comprendrait des murs de soutènement de 1, 2 et 3 m, une cour anglaise de 1,2 × 3 m et un voile de sous-sol, ce qui permettrait de passer les §4 et §5 de C à B.

---

## 9. Sources consultées (10/10/2026)

| Source | URL | Date | Fiab. |
|---|---|---|---|
| LeChantier, coût du gros œuvre 2026 | https://lechantier.ma/en/blog/cout-gros-oeuvre-maroc | 05/04/2026 | B |
| LeChantier, guide gros œuvre | https://lechantier.ma/en/guides/gros-oeuvre | 2026 | B |
| LeChantier, guide terrassement | https://lechantier.ma/en/guides/terrassement | 2026 | B/C |
| LeChantier, prix gabion | https://lechantier.ma/fr/prix/gabion | 15/06/2026 | B |
| LeChantier, prix dalle béton | https://lechantier.ma/fr/prix/dalle-beton | 15/06/2026 | B |
| LeChantier, prix hourdis | https://lechantier.ma/fr/prix/hourdis | 10/10/2026 | B |
| LeChantier, prix étanchéité | https://lechantier.ma/fr/prix/etancheite | 15/06/2026 | B |
| CTravaux, prix du gros œuvre | https://ctravaux.ma/quel-est-le-prix-des-gros-oeuvres-au-maroc/ | non daté | C |
| Rifaa, simulateur | https://rifaa.ma/simulateur-cout-construction/ | 2026 | C |
| Francobat, simulateur | https://francobat.ma/simulateur-calcul-estimation-cout-construction-maroc/ | non daté | C |
| Francobat, immeuble | https://francobat.ma/combien-coute-construction-immeuble/ | 18/03/2026 | C |
| Habitat Services Plus | https://www.habitatservicesplus.com/prix-gros-oeuvre-m2-au-maroc-en-2025/ | 02/11/2024 | C |
| AE Architectes, villa Marrakech | https://ae-architectes.com/combien-coute-une-villa-marrakech | 01/05/2026 | C |
| CYPE, semelle BA | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Fondations/Semelles_isolees/Semelle_de_fondation_en_beton_arme.html | non daté | C |
| CYPE, semelle béton massif | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Fondations/Semelles_isolees/Semelle_de_fondation_en_beton_massif.html | non daté | C |
| CYPE, semelle filante BA | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Fondations/Semelles_filantes/GFF010_Semelle_filante_de_fondation_en_bet.html | non daté | C |
| CYPE, radier | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Fondations/Radiers/Radier.html | non daté | C |
| CYPE, mur de sous-sol | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/GS_Structures_enterrees_et_semi-e/Murs_de_sous-sol/Mur_de_sous-sol.html | non daté | C |
| CYPE, coffrage mur de sous-sol | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/GS_Structures_enterrees_et_semi-e/Murs_de_sous-sol/GSM020_Systeme_de_coffrage_pour_un_mur_de_.html | non daté | C |
| CYPE, plancher poutrelles | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Planchers/Poutrelles_et_entrevous/GPH010_Plancher_unidirectionnel_avec_poutr.html | non daté | C |
| CYPE, dalle pleine | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Planchers/Dalles_pleines_en_beton/Dalle_pleine.html | non daté | C |
| CYPE, poteau BA | https://maroc.prix-construction.info/construction_neuve/Structure_et_gros_oeuvre/Poteaux__poutres_et_ossatures/Beton_coule_en_place/Poteau_en_beton_arme.html | non daté | C |
| CYPE, mur de soutènement BA | https://maroc.prix-construction.info/construction_neuve/VRD_et_amenagements_exterieurs/Terrassement/Murs_de_soutenement/Mur_de_soutenement_en_beton_arme.html | non daté | C |
| CYPE, mur cyclopéen | https://maroc.prix-construction.info/construction_neuve/VRD_et_amenagements_exterieurs/Terrassement/Murs_de_soutenement/Mur_de_soutenement_en_beton_cyclopeen.html | non daté | C |
| CYPE, mur en moellons | https://maroc.prix-construction.info/construction_neuve/VRD_et_amenagements_exterieurs/Terrassement/Murs_de_soutenement/ATS010_Mur_de_soutenement_en_maconnerie_de.html | non daté | C |
| CYPE, coffrage mur de soutènement | https://maroc.prix-construction.info/construction_neuve/VRD_et_amenagements_exterieurs/Terrassement/Murs_de_soutenement/ATS040_Systeme_de_coffrage_pour_mur_de_sou.html | non daté | C |
| CYPE, gabions | https://maroc.prix-construction.info/espaces_urbains/Amenagements_exterieurs/Gros_oeuvre/Murs/BGM020_Mur_en_gabions_en_maille_a_double_t_0_0_0_0_2_1_0_0_1_0_0.html | non daté | C |
| CYPE, étanchéité mur enterré | https://maroc.prix-construction.info/construction_neuve/Enveloppe_et_finition_exterieure/Etancheite__impermeabilisations/Murs_de_sous-sol/EEM030_Impermeabilisation_d_un_mur_en_beto.html | non daté | C |
| CYPE, nappe drainante | https://maroc.prix-construction.info/renovation/Enveloppe_et_finition_exterieure/Etancheite/EEM_Impermeabilisation_de_murs_de_/EEM090_Couche_drainante_et_filtrante_exter.html | non daté | C |
| CYPE, tranchée drainante | https://maroc.prix-construction.info/espaces_urbains/VRD_et_amenagements_exterieurs/Assainissement/Drainage/AAO020_Tranchee_drainante_sur_le_perimetre.html | non daté | C |
| btp-cours, ratios d'acier | https://www.btp-cours.com/les-ratios-dacier/ | non daté | C |
| Polyvert (IUT Strasbourg), ratios d'acier | https://polyvert.iutrs.unistra.fr/ratios-daciers-dour-les-ouvrages-courants/ | non daté | C |
| CCAG-T, décret 2-14-394 (BO 6470) | https://www.marchespublics.gov.ma/pmmp/download/pdf/2-14-394-fr.pdf | 13/05/2016 | A |
| CPS APDN, unités préscolaires Tanger 47-15 | https://www.apdn.ma/appeloffre/doc/CPS-RC-_DCT-CONSTR-UNITES-PRESCOLAIRES-TNG-47-15.pdf | 2015 | A |
| Plan d'aménagement Mghogha-Souani, règlement | https://aut.gov.ma/s/website/PA_Mghogha_Souani_R.pdf | 12/2022 | A |
| OQLF, « cour anglaise » | https://vitrinelinguistique.oqlf.gouv.qc.ca/fiche-gdt/fiche/26558214/cour-anglaise | – | B (définition) |
| Techniprojet, étude de soutènement d'une villa mitoyenne (Agora Rabat) : hypothèses fc28 30 MPa, sol 5 bars, BAEL/RPS ; aucun prix | https://alacademia.org.ma/wp-content/uploads/sites/18/2026/03/21-DCE-AGORA-GO-TP-NDC-TZ-Stabilisation-de-la-villa-mitoyenne.pdf | 2020 / rév. 11/2025 | – |
