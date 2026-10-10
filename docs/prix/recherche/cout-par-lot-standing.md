# Coût par lot et par standing : villa / maison individuelle au Maroc (2025-2026)

Recherche du 2026-10-10. Données : `cout-par-lot-standing.json`, même dossier. Le fichier contient 157 entrées :
- 102 références **dérivées** (17 lots × 6 standings), de type `REFERENCE_DERIVEE` ;
- 55 **observations** sourcées, de type `OBSERVATION`.

Ce document complète `marche-prive-main-oeuvre.md` (prix globaux par ville, main-d'œuvre) et `materiaux-second-oeuvre.md` (prix unitaires). Il n'en reprend les chiffres que pour les recouper ou les contredire. Son objet est la **ventilation par lot et par standing**, qui manquait.

## 0. À lire avant usage

- **Aucune source publique ne ventile le coût d'une villa lot par lot et standing par standing.** On trouve au mieux :
  - **EnginLoc/BTPro** (12/04/2026) : une seule grille lot par lot (12 postes), et seulement pour le standing **économique** ;
  - **LeChantier.ma** (05/04/2026) : la décomposition **interne au gros œuvre** ;
  - **EnginLoc, LeChantier et AqarMaghreb** : la part du GO selon le standing ;
  - **construire-a-marrakech** : une seule répartition en 5 blocs pour le **luxe** ;
  - pour les autres lots, des forfaits (« villa 150 m² : 40-60 k ») publiés par des guides commerciaux non datés au jour près.
- Le tableau du §4 est donc une **reconstruction**, pas une observation. Pour chaque lot :
  - le standing économique s'aligne sur EnginLoc ;
  - les autres standings appliquent, soit la part du GO du standing, soit le rapport des prix unitaires de gamme ;
  - le résultat est ensuite contrôlé par les forfaits observés.

  La méthode est détaillée au §3, et chaque cellule du JSON porte sa justification dans `note`.
- Fiabilité :
  - **aucune donnée A** : rien d'officiel sur le coût privé par lot ;
  - **B** : EnginLoc, LeChantier (articles datés), bati.ma ;
  - **C** : tout le reste (guides non datés, pages commerciales, forums), dont toutes les références dérivées.
- **Périmètre.** Sauf mention contraire, les prix s'entendent en DH par m² de **surface plancher** :
  - hors terrain, honoraires, taxes, imprévus et raccordements ;
  - fourni-posé par une **entreprise**, hors TVA ;
  - exception : le standing « très économique », chiffré en **tâcheron ou autoconstruction** (matériaux + main-d'œuvre, sans marge d'entreprise).

## 1. Standings retenus

| Code JSON | Libellé | Correspondance dans les sources |
|---|---|---|
| `TRES_ECONOMIQUE` | Très économique (tâcheron / autoconstruction) | AqarMaghreb « اقتصادي », Mawtini, La Vie éco 2012, logement social |
| `ECONOMIQUE` | Économique | EnginLoc éco, bati.ma éco, LeChantier éco |
| `MOYEN_STANDING` | Moyen standing | EnginLoc « standard », bati.ma « moyen », LeChantier « standard » |
| `STANDING` | Standing | Bas des « haut de gamme » LeChantier et Francobat, AE Architectes « moyen » à Marrakech |
| `HAUT_STANDING` | Haut standing | bati.ma haut, Wall haute gamme, AE haut |
| `LUXE` | Luxe | bati.ma luxe, Wall luxe, AE très haut de gamme, construire-a-marrakech |

## 2. Prix global au m² par standing (recoupement)

| Standing | **Réf. retenue** | Fourchette | Observations (DH/m² plancher) |
|---|---|---|---|
| Très éco. | **2 300** | 1 800 – 3 200 | AqarMaghreb 04/2026 (autoconstruction) : éco 1 800-2 400, moyen 2 800-3 700. Mawtini 2024 : ≈ 1 370 (R+2 de 3 × 100 m², contesté). La Vie éco 2012 : villa 2 800-3 000, maison 2 000-2 500. |
| Économique | **3 500** | 2 800 – 4 500 | bati.ma (25/06/2026) 3 000-4 500 ; LeChantier (15/03/2026) 2 500-3 500 (tableau) ou 3 200-4 500 (intro) ; Francobat 3 800-4 800 ; Fadil 3 800 ; Archiplan ≥ 3 500 ; AE (Marrakech) 4 000-6 000 |
| Moyen standing | **5 000** | 4 000 – 6 500 | bati.ma 4 500-7 000 ; EnginLoc standard 4 000-6 800 ; LeChantier 3 500-5 500 (blog), **6 300-8 300 (calculateur du même site)** ; Francobat villa standard 5 000-6 500 ; LeChantier villas R+1 250 m² 4 000-5 000 (entrée) et 5 000-7 000 (milieu) |
| Standing | **7 000** | 6 000 – 8 500 | LeChantier haut 5 500-8 000 / 6 500-8 500 ; Francobat haut 6 500-9 000 ; Fadil 6 500-8 000 ; AE moyen (Marrakech) 6 000-9 000 |
| Haut standing | **9 500** | 8 000 – 12 000 | bati.ma 7 000-10 500 ; Wall (TTC) 8 500-10 000 / 10 000-12 000 ; AE 9 000-14 000 ; geniecivil 7 000-12 000 ; LeChantier calculateur 8 300-12 000 |
| Luxe | **14 000** | 11 000 – 20 000 | bati.ma 11 000-15 000 ; Wall 12 000+ ; AE 14 000-20 000+ ; construire-a-marrakech 12 000-25 000 (Marrakech, selon quartier) |

Ces références restent proches de celles de `marche-prive-main-oeuvre.md` §1.1 (économique 3 500, moyen 5 350, haut 9 100, luxe 13 000). Les deux paliers « très économique » et « standing » ont été ajoutés pour coller à la nomenclature du projet.

## 3. Méthode de reconstruction

1. **Économique = grille EnginLoc.** Valeurs reprises telles quelles : structure 770-950, maçonnerie 350-460, plomberie 280-380, électricité 245-340, etc.
   - Seul ajustement : retenir le bas ou le milieu de fourchette. La somme des milieux EnginLoc atteint 106-108 % de son propre total.
2. **Lots du gros œuvre aux autres standings** = GO du standing × poids interne.
   - Poids internes : structure 42 %, maçonnerie 20 %, fondations 11,4 %, façades 16 %, étanchéité 6 %, terrassement 4,6 %. Ils sont tirés d'EnginLoc éco et de la décomposition LeChantier.
   - Part du GO par standing : 58 → 54 → 48 → 46 → 41 → 36 % (§6).
3. **Lots de second œuvre et de finitions** = valeur économique × rapport de prix unitaire de gamme. Exemples :
   - alu standard 1 100-1 400 DH/m², contre RPT 1 800-3 000 et levant-coulissant 4 500-7 500 ;
   - grès 105-165 DH/m², contre marbre local 440, marbre importé 700 et marbre premium 1 500-3 000.

   Ces valeurs sont ensuite **contrôlées** par les forfaits ramenés au m² : guides LeChantier électricité et plomberie, domotique, climatisation, cuisine AE.
4. **Contrôle de cohérence.** La somme des 17 lots doit représenter 90 à 106 % du total de référence (dernières lignes du tableau). Le complément correspond aux lots non ventilés : installation de chantier, divers et imprévus (EnginLoc 5-8 %).
5. **Lots traités au forfait (§5).** Ascenseur, solaire, VRD, clôture, extérieurs, piscine et sous-sol dépendent du projet plus que de la surface : ils ne sont pas convertis en DH/m².

## 4. Tableau lot × standing (DH/m² plancher, HT, référence et fourchette min–max)

| Lot | Très éco. | Économique | Moyen standing | Standing | Haut standing | Luxe |
|---|---|---|---|---|---|---|
| Installation de chantier | n.d. | n.d. | n.d. | n.d. | n.d. | n.d. |
| Terrassements (hors sous-sol) | **60** (40–110) | **90** (75–175) | **100** (75–175) | **130** (75–200) | **160** (100–450) | **220** (100–450) |
| Fondations (hors sous-sol) | **150** (115–250) | **250** (220–400) | **300** (250–500) | **350** (250–500) | **400** (300–700) | **550** (400–700) |
| Structure béton armé (poteaux, poutres, planchers, escalier, toiture) | **600** (450–800) | **820** (770–950) | **950** (800–1 200) | **1 200** (900–1 400) | **1 450** (1 100–1 800) | **2 000** (1 500–2 500) |
| Maçonnerie et enduits intérieurs | **250** (200–350) | **400** (350–460) | **450** (400–600) | **550** (400–750) | **650** (450–750) | **850** (650–1 000) |
| Étanchéité et isolation (toiture) | **80** (60–150) | **130** (105–150) | **150** (105–275) | **180** (150–275) | **220** (150–300) | **300** (200–400) |
| Façades (enduits ext., parements) | **150** (100–250) | **290** (280–380) | **350** (280–450) | **450** (350–600) | **600** (400–900) | **900** (600–1 500) |
| Menuiseries extérieures aluminium | **150** (45–250) | **270** (245–340) | **400** (300–500) | **550** (450–750) | **850** (650–1 100) | **1 400** (1 000–2 000) |
| Menuiseries intérieures bois (portes, placards, cuisine) | **120** (50–170) | **220** (175–270) | **300** (220–450) | **400** (300–600) | **600** (400–900) | **950** (600–1 500) |
| Métallerie, ferronnerie, garde-corps | **40** (20–80) | **80** (40–125) | **100** (40–150) | **150** (100–330) | **220** (125–350) | **350** (200–500) |
| Faux plafonds, plâtre, staff | **30** (0–60) | **70** (30–150) | **120** (80–200) | **170** (120–250) | **250** (180–400) | **450** (300–800) |
| Revêtements de sols (carrelage, marbre) | **200** (100–250) | **290** (280–380) | **380** (280–500) | **500** (380–700) | **750** (550–1 000) | **1 400** (900–2 600) |
| Revêtements muraux (faïence, zellige) | **60** (30–70) | **70** (50–130) | **120** (80–180) | **170** (120–250) | **260** (180–400) | **450** (300–800) |
| Peinture (intérieure) | **70** (50–70) | **110** (60–230) | **160** (80–230) | **200** (150–280) | **280** (200–400) | **420** (280–700) |
| Plomberie sanitaire (réseaux + appareils) | **150** (20–200) | **290** (280–380) | **350** (200–450) | **450** (300–550) | **600** (400–800) | **900** (600–1 200) |
| Électricité (courants forts) | **130** (20–200) | **270** (245–340) | **330** (250–400) | **420** (300–500) | **550** (400–750) | **750** (500–1 000) |
| Courants faibles, domotique, sécurité | 0 (non prévu) | **15** (0–30) | **70** (50–120) | **150** (100–230) | **350** (175–500) | **800** (600–1 250) |
| Climatisation | 0 (non prévu) | **30** (0–60) | **150** (100–200) | **250** (175–300) | **350** (200–500) | **550** (400–800) |
| **Somme des lots ci-dessus** | **2 240** | **3 695** | **4 780** | **6 270** | **8 540** | **13 240** |
| Total de référence (§2) | 2 300 (1 800–3 200) | 3 500 (2 800–4 500) | 5 000 (4 000–6 500) | 7 000 (6 000–8 500) | 9 500 (8 000–12 000) | 14 000 (11 000–20 000) |
| Somme / total | 0,97 | 1,06 | 0,96 | 0,90 | 0,90 | 0,95 |
| Part du gros œuvre dans la somme | 58 % | 54 % | 48 % | 46 % | 41 % | 36 % |

Le gros œuvre regroupe ici les lots terrassement, fondations, structure, maçonnerie, étanchéité et façades.

**Lecture en % (part de chaque lot dans la somme)**, à comparer aux poids fixes du moteur interne (`costRangesMA.ts`, VIL) :

| Lot | Très éco. | Éco | Moyen | Standing | Haut | Luxe | **Interne VIL (fixe)** |
|---|--:|--:|--:|--:|--:|--:|--:|
| Terrassement | 2,7 | 2,4 | 2,1 | 2,1 | 1,9 | 1,7 | 3 |
| Fondations | 6,7 | 6,8 | 6,3 | 5,6 | 4,7 | 4,2 | 8 |
| Structure | 26,8 | 22,2 | 19,9 | 19,1 | 17,0 | 15,1 | 18 |
| Maçonnerie | 11,2 | 10,8 | 9,4 | 8,8 | 7,6 | 6,4 | 8 |
| Étanchéité | 3,6 | 3,5 | 3,1 | 2,9 | 2,6 | 2,3 | 4 |
| Façades | 6,7 | 7,8 | 7,3 | 7,2 | 7,0 | 6,8 | 8 |
| Alu | 6,7 | 7,3 | 8,4 | 8,8 | 10,0 | 10,6 | 9 |
| Bois | 5,4 | 6,0 | 6,3 | 6,4 | 7,0 | 7,2 | 6 |
| Ferronnerie | 1,8 | 2,2 | 2,1 | 2,4 | 2,6 | 2,6 | 2 |
| Faux plafonds | 1,3 | 1,9 | 2,5 | 2,7 | 2,9 | 3,4 | 4 |
| Sols + murs | 11,6 | 9,7 | 10,4 | 10,7 | 11,8 | 14,0 | 11 |
| Peinture | 3,1 | 3,0 | 3,3 | 3,2 | 3,3 | 3,2 | 3 |
| Plomberie | 6,7 | 7,8 | 7,3 | 7,2 | 7,0 | 6,8 | 7 |
| Électricité | 5,8 | 7,3 | 6,9 | 6,7 | 6,4 | 5,7 | 7 |
| Courants faibles | 0 | 0,4 | 1,5 | 2,4 | 4,1 | 6,0 | — |
| Climatisation | 0 | 0,8 | 3,1 | 4,0 | 4,1 | 4,2 | — |

Le moteur interne (GO ≈ 49 %, poids identiques pour tous les standings) correspond bien au **moyen standing**. En revanche :
- il **surestime la structure et le GO en haut standing et en luxe** (+5 à +13 points) ;
- il **sous-estime alu, sols, domotique et climatisation** dans ces mêmes standings ;
- il n'a **ni lot courants faibles ni lot climatisation** pour la villa, alors que ces deux lots pèsent 8 à 10 % en haut standing et en luxe.

## 5. Lots au forfait (non convertis en DH/m²)

| Lot | Valeurs observées | Source (date, fiabilité) |
|---|---|---|
| **Installation de chantier** | **Aucune donnée privée marocaine.** Annonces de palissade sans métrage (250-650 DH). | Lacune. Côté marché public, voir `marches-publics.md` (coefficient K) |
| **Ascenseur / élévateur villa** | Élévateur à vis 2 niveaux 80-120 k ; hydraulique 2 niveaux 150-200 k ; +15-30 k par niveau ; génie civil (gaine, fosse) +30-80 k ; raccordement 5-15 k ; plateforme PMR 3 niveaux 120-280 k | Adrar Ascenseur 2026 (C) ; LeChantier guide ascenseurs 2026 (C) |
| **Solaire** | CES posé : 150 L 8-14 k, 200 L 12-20 k, 300 L 18-28 k, 400 L 25-38 k. PV posé : 3 kWc 28-42 k, 5 kWc 45-65 k, 10 kWc 85-120 k. Villa 200 m² PV + CES 75-100 k. Le blog « étapes » donne un CES à 8-15 k. | LeChantier 12/04/2026 (B) |
| **VRD / assainissement** | Raccordements villa 5-20 k (déjà dans le dépôt) ; bati.ma 20-60 k (extrait moteur) ; AE 30-100 k (villa 400 m²). Fosse septique en kit posée 22,5-30 k (annonce) ; cuve PEHD 5 000 L ≈ 25 k hors pose (CYPE). Raccordement à l'égout ≈ 1 355 DH HT + ≈ 610 DH HT/ml (CYPE, hors terrassement). | C |
| **Clôture** | Mur h = 2 m : 450-1 000 DH/ml HT (3 devis réels, Marrakech, 08/2021) ; 1 100 DH/ml (simulateur Francobat 2026). Avant cette recherche, la seule donnée était ≈ 550 DH/ml (forum, ~2017). | Mondevis (C, devis réels) ; Francobat (C) |
| **Extérieurs** | Villa std 200 m² : 80 k (EnginLoc) ; haut standing 400 m² : 200-500 k (AE) ; luxe 400 m² : 850 k, soit 12 % du budget (construire-a-marrakech) ; jardin ≤ 15 k (La Vie éco 2012) | B / C |
| **Piscine** | Coque 7×3 : 120-180 k ; béton 8×4 : 180-280 k ; béton 10×5 haut de gamme : 350-600 k ; débordement 10×5 : 200-400 k (AE) ; débordement chauffée : 400-800 k ; pool house et plages : +50-150 k ; électrolyse : 15-25 k | LeChantier guide piscine (C) ; AE 05/2026 (C) ; construire-a-marrakech (C) |
| **Cuisine** (comprise dans le lot bois du §4) | Moyen : 15-70 k (LeChantier étapes) ; haut standing : 100-300 k (AE) ; 2012 : 80 k + 20 k d'électroménager (La Vie éco) | C |

## 6. Part gros œuvre / second œuvre / finitions par standing

| Standing | GO | Second œuvre | Finitions | Sources |
|---|---|---|---|---|
| Très éco. / tâcheron | **50-55 %** | ← 45-50 % → | | AqarMaghreb : GO 1 000-1 200, finitions 800-1 200, soit ≈ 50/50. Logement social MHPV : GO ≈ 55 %, revêtements 10 %, électricité + plomberie 12 %, étanchéité 3 % (fiabilité A, déjà dans `marches-publics.md`). La Vie éco 2012 : GO 44 %, finitions ≈ 40 %. |
| Économique | **55-60 %** | ← 40-45 % → | | EnginLoc 2026 (B). Francobat simulateur : GO 50-65 %. |
| Moyen standing | **42-50 %** | 25-34 % | 20-26 % | EnginLoc 45-50 % ; LeChantier exemple 43/31/26 ; calculateur 42/34/24 ; tableau 35-40/25-30/20-25 (avec 8-12 % d'architecte dans la base) ; LeChantier gros œuvre 40-55 %. |
| Standing | **≈ 42-46 %** | | | Interpolation : aucune source directe. |
| Haut standing | **33-40 %** | ← 60-67 % → | | EnginLoc 35-40 % (finitions jusqu'aux 2/3) ; AqarMaghreb ≈ 33 % (GO 1 600-2 000, finitions 2 500-5 000) ; Wall : finitions 40-60 %. |
| Luxe | **≈ 35-38 %** | 33 % | + équipements techniques 16 % et extérieurs 13 % | construire-a-marrakech (villa 400 m², hors honoraires). |

**Constat clé.** En DH/m², le GO ne fait que doubler de l'économique au luxe : environ 1 900-2 000 à 4 500-5 000 en entreprise, et 1 000-2 000 en tâcheron. Les finitions et le second œuvre, eux, sont multipliés par 4 à 6. L'écart entre standings tient donc d'abord aux finitions.

## 7. Coût du sous-sol

| Valeur | Périmètre | Source |
|---|---|---|
| 1 200 (maison) – 1 300 (villa) DH/m² | Sous-sol, GO seul (MO + matériaux) | Rifaa simulateur 2026 (C) |
| 1 800 DH/m² (entièrement enterré) | GO, simulateur. « Plus cher qu'un semi-enterré » : blindage, étanchéité renforcée | Francobat simulateur 2026 (C) |
| +20 à 30 % sur le coût de la villa | « Sous-sol ou demi-niveau », terrassement et étanchéité compris | AE Architectes 05/2026 (C) |
| 800 000 – 1 500 000 DH par niveau de sous-sol | GO + étanchéité (extrait moteur, page source non identifiée) | **Non retenu** : invérifiable, et incohérent avec les valeurs ci-dessus |
| ≈ 970 DH/m² TTC (GO de toute la villa, sous-sol compris) | PFE étudiant, prix 2020 | 4GenieCivil (C), trop bas pour 2026 |

**Référence proposée** pour un sous-sol enterré de villa, GO compris (terrassement, voiles, dalle, étanchéité enterrée, drainage), aménagement sommaire :
- **1 300 à 1 800 DH/m² de sous-sol**, soit 0,35-0,5 fois le prix au m² d'un niveau courant en moyen standing ;
- ajouter les finitions du local selon l'usage (parking, cave ou salle de jeux) ;
- prévoir +20-30 % en présence de nappe ou de rocher.

Aucune source ne ventile le voile de soutènement ni l'étanchéité enterrée au m² : c'est une **lacune**. Les prix d'étanchéité publiés (80-250 DH/m²) concernent les toitures-terrasses.

## 8. Tâcheron contre entreprise générale

| Indicateur | Valeur | Source |
|---|---|---|
| Écart de prix global | Entreprise structurée **+15 à 25 %** | LeChantier (02/2025 et 03/2026, C) |
| Économie en autoconstruction (tâcheron + achat des matériaux) | **−15 à −20 %** | AqarMaghreb 04/2026 (C) ; déjà dans `marche-prive-main-oeuvre.md` |
| Marge d'entreprise générale | **10-20 %** du coût total | Archiplan 06/2025 (C) |
| Dérive des délais chez le maâlem | +30 à 50 % | LeChantier (C) |
| MO seule du gros œuvre | 230-450 DH/m² (2024-2026) ; 270-330 DH/m² en 2012 | Mawtini, AqarMaghreb, La Vie éco |
| MO seule de peinture | 25 / 30-35 / 40-45 DH/m² peint (ordinaire / moyen / pro) | Décor Samir 02/2026 (C) |
| MO seule de pose de zellige | 80-150 (industriel), 150-300 (beldi), 300-600 (formes complexes) DH/m², plus 30-70 DH/m² de colle et préparation | Bricolat (extrait moteur, C) |
| Fourni-posé, plâtre | BA13 + LED 120-220 ; rumi 150-300 ; sculpté 400-800 DH/m² | Decorzaz 2026 (C) |

**Règle de calage proposée** : prix tâcheron = prix entreprise × 0,80 (0,75-0,85), sur l'ensemble des lots. Cet écart est **cohérent entre trois sources indépendantes** (LeChantier, AqarMaghreb, Archiplan).

Le très économique ne se réduit pas pour autant à « économique × 0,8 » : les prestations changent aussi (pas de climatisation, de domotique ni de faux plafond, appareillage minimal). D'où une colonne distincte au §4.

## 9. Contradictions relevées

1. **LeChantier se contredit sur le standard.** Blog : 3 500-5 500 (tableau) ou 4 500-6 500 (introduction). Calculateur : 6 300-8 300, avec un exemple à 9 545 DH/m² « standard ». Le calculateur est probablement calé sur Casablanca, finitions comprises, mais rien ne le dit.
2. **Part du GO chez Francobat** : 50-65 % sur le simulateur, 30-40 % sur la page immeuble.
3. **Peinture** : EnginLoc éco 175-230 DH/m² plancher, contre 50-140 chez Décor Samir (intérieur, tâcheron). L'écart s'explique en partie par la peinture de façade et la marge d'entreprise, mais il reste supérieur à un facteur 2.
4. **Électricité et plomberie** : les forfaits « villa R+1 200 m² » du blog LeChantier (électricité 12-25 k, plomberie 15-30 k, soit 60-150 DH/m²) sont **2 à 4 fois inférieurs** au guide du même site (250-500 et 200-400 DH/m²) et à EnginLoc. Les forfaits bas correspondent vraisemblablement à la main-d'œuvre et aux fournitures de base, sans appareillage ni sanitaires.
5. **Menuiseries alu** : LeChantier étapes 15-40 k pour une villa (75-200 DH/m²) contre EnginLoc 245-340 et La Vie éco 2012 217-333. La borne LeChantier est irréaliste au vu des prix unitaires (≥ 1 100 DH/m² de baie).
6. **Sous-sol** : de 1 200 DH/m² (Rifaa) à 1 800 (Francobat), et à +20-30 % du coût total (AE). Les périmètres ne sont pas comparables.
7. **Marrakech luxe** : AE 14 000-20 000+ et construire-a-marrakech 12 000-25 000, contre bati.ma national 11 000-15 000. L'écart est cohérent avec le surcoefficient ≈ 1,15 déjà proposé pour Marrakech en haut de gamme.

## 10. Lacunes

1. **Installation de chantier** : aucune donnée privée (ni % ni forfait).
2. **Ventilation lot par lot au-delà de l'économique** : aucune source. Les colonnes moyen à luxe sont **dérivées**.
3. **Voile de soutènement et étanchéité enterrée** : aucun prix au m².
4. **Façades haut de gamme** (pierre, bardage, ACM) : prix au m² de façade seulement (construire-a-marrakech), et aucun ratio surface de façade / m² plancher.
5. **Ratios de quantités** (m² de baies, de faïence ou de plafond par m² plancher) : aucune source marocaine. Ce sont pourtant les clés pour passer des prix unitaires aux DH/m².
6. **Ferronnerie** : seulement La Vie éco 2012 (100 k pour 300 m²) et un forfait escalier + garde-corps.
7. **Climatisation gainable ou VRV de villa** : un seul forfait (LeChantier) et une seule fourchette de clim centralisée (AE).
8. **DQE réels de villa publiés** : les documents Scribd et PDFCoffee sont illisibles sans compte, et le PFE 4GenieCivil date de 2020. La meilleure source réelle reste le dossier Kénitra interne (`prix-internes.md`).
9. **Sites inaccessibles** : ecolohome.ma (403), loutfiamenagement.com (DNS), ebmamenagement.com (certificat expiré), missa7a.com (domaine expiré), et la page Tachrone menuiserie (vide). bati.ma ne publie pas ses chiffres de lot dans le HTML (calculateur JavaScript).

## 11. Recommandations pour le moteur de chiffrage

1. **Rendre les poids de lots dépendants du standing.** Utiliser la table en % du §4 à la place des poids VIL fixes de `costRangesMA.ts`. Au minimum, faire glisser la part du GO de 58 % (très éco.) à 36 % (luxe).
2. **Ajouter les lots manquants** :
   - « courants faibles / domotique » et « climatisation » pour la villa ;
   - ascenseur, solaire, VRD, clôture, piscine et sous-sol au **forfait ou à l'unité** plutôt qu'en % : ils dépendent du projet, pas de la surface.
3. **Coefficient tâcheron** de 0,80 (0,75-0,85) au niveau de chaque lot, en gardant une colonne très économique propre (prestations réduites).
4. **Sous-sol** : chiffrer à part, à 1 300-1 800 DH/m² de sous-sol (GO + étanchéité), avec +20-30 % en cas de nappe ou de rocher.
5. **Recaler sur devis réels.** Priorités : alu, ferronnerie, façades, faux plafonds et climatisation. Ce sont les lots où l'écart entre sources dépasse un facteur 2.

## 12. Sources consultées (2026-10-10)

| Source | URL | Date | Fiab. |
|---|---|---|---|
| EnginLoc / BTPro, barème coût construction | https://enginloc.ma/blog/cout-construction-m2-maroc-bareme | 12/04/2026 | B |
| LeChantier, coût du gros œuvre | https://lechantier.ma/en/blog/cout-gros-oeuvre-maroc | 05/04/2026 | B |
| LeChantier, prix construction m² 2026 | https://lechantier.ma/fr/blog/prix-construction-m2-maroc-2026 | 15/03/2026 | B |
| LeChantier, étapes construction maison | https://lechantier.ma/fr/blog/etapes-construction-maison-maroc | 15/02/2025 | C |
| LeChantier, calculateur | https://lechantier.ma/en/outils/calculateur-prix-construction | 2026 | C |
| LeChantier, guides électricité / plomberie / climatisation / domotique / ascenseurs / piscine / terrassement | https://lechantier.ma/fr/guides/electricite (et `/plomberie`, `/climatisation`, `/domotique`, `/ascenseurs`, `/piscine`, `/terrassement`) | 2026 | C |
| LeChantier, énergie solaire | https://lechantier.ma/fr/blog/energie-solaire-maison-maroc | 12/04/2026 | B |
| LeChantier, villas modernes | https://lechantier.ma/blog/villas-modernes-maroc-inspiration | 30/03/2026 | C |
| bati.ma, coût construction maison | https://bati.ma/guide/cout-construction-maison-maroc | 25/06/2026 | B |
| Wall Constructions, Marrakech | https://www.wallconstructions.com/prix-construction-marrakech | 2026 | C |
| AE Architectes, villa Marrakech | https://ae-architectes.com/combien-coute-une-villa-marrakech | 01/05/2026 | C |
| Construire à Marrakech, villa de luxe | https://www.construire-a-marrakech.com/cout-construction-villa-marrakech/ | © 2026 | C |
| Rifaa, simulateur | https://rifaa.ma/simulateur-cout-construction/ | 2026 | C |
| Francobat, simulateur | https://francobat.ma/simulateur-calcul-estimation-cout-construction-maroc/ | 2026 | C |
| Francobat, immeuble | https://francobat.ma/combien-coute-construction-immeuble/ | 18/03/2026 | C |
| Archiplan, guide 2026 | https://www.archiplan.ma/post/guide-complet-du-co%C3%BBt-de-la-construction-au-maroc-2026 | 27/06/2025 | C |
| Fadil Group | https://fadilgroup.ma/prix-construction-m%C2%B2-maroc-2025/ | 17/07/2025 | C |
| geniecivil.ma | https://geniecivil.ma/apercu-des-couts-actuels-de-construction-au-maroc-en-2025/ | 31/03/2025 | C |
| AqarMaghreb (ar.) | https://www.aqarmaghreb.com/2026/04/cost-per-square-meter-building-morocco.html | 04/2026 | C |
| Mawtini News (ar.) | https://mawtininews.com/archives/14398/ | 15/07/2024 | C |
| La Vie éco, construire votre maison | https://www.lavieeco.com/argent/construire-votre-maison-a-combien-cela-vous-revient-22391/ | 06/2012 (màj 12/2022) | C |
| Décor Samir, peinture 100 m² (ar.) | https://www.decoresamir.com/taklifa-sibagha-100m-maroc/ | 27/02/2026 | C |
| Decorzaz, guide plâtre 2026 (ar.) | https://decorzaz.com/دليل-الجبس-المغربي-2026-الأنواع،-الأسعار/ | 2026 | C |
| Caméra Marrakech, domotique petite villa | https://www.camera-marrakech.com/prix-domotique-petite-villa-maroc-2026/ | 04/03/2026 | C |
| MAdomotique, prix 2026 | https://www.madomotique.ma/prix-installation-domotique-maroc-2026-guide-tarifs/ | 28/09/2026 | C |
| Adrar Ascenseur, prix | https://adrarascenseur.com/prix/ | 2026 | C |
| Mondevis, mur de clôture n° 3619 | https://www.mondevis.ma/prix-construction-3619-mur-de-cloture.html | 30/08/2021 | C |
| 4GenieCivil, villa R+1 (PFE) | https://www.4geniecivil.com/2026/02/villa-r1-maroc-etude-metre-prix.html | prix 2020 | C |
| Extraits de moteur non relus (bati.ma plomberie, Tachrone menuiserie, Bricolat zellige, Mouhim fosse septique, CYPE Maroc) | voir `note` dans le JSON | 2026 | C |
