# Prix matériaux & équipements de second œuvre / finitions — Maroc 2025-2026

- **Date de recherche :** 2026-10-09
- **Données :** `materiaux-second-oeuvre.json`, 310 entrées, toutes en MAD (DH)
- **Fiabilité :** A = 0, B = 138, C = 172

## 1. Méthode et avertissements

- **Origine des chiffres.** Chaque chiffre a été lu sur une URL réellement consultée le 2026-10-09. Rien n'est extrapolé.
- **Normalisation.** Certains prix sont ramenés à une unité commune, et la note de l'entrée l'indique avec le prix brut :
  - peinture : seau → DH/kg ;
  - câble ou gaine en couronne → DH/ml ;
  - plaque isolante → DH/m² ;
  - système PV → DH/Wc ;
  - cuisine au forfait → DH/ml.
- **Aucune source A.** Aucun tarif fabricant officiel (Super Cérame, Facemag, Colorado, Astral, Nexans, Ingelec, Roca, Technal…) n'est publié en ligne avec des prix. Les tarifs fabricants sont « sur devis ».
- **Sources B.** Ce sont presque toutes des prix publics de distributeurs en ligne : Bricoma, BniDark, Matelec, Zellijj, AZ Living, Ziribox, Sanitaire Maroc, Rifaa, Outillage Aouami. Sauf mention contraire, il s'agit de prix au détail, **TTC présumés** (prix grand public), mais la page ne le précise presque jamais. Elles sont donc codées `taxes: inconnu`. Bricoma affiche souvent des **prix promotionnels**. Le prix promo est retenu comme `prix_ref` et le prix normal comme `prix_max`.
- **Sources C.** Ce sont des guides et agrégateurs :
  - lechantier.ma : relevé « 2026-06 », méthode non publiée, incohérences internes signalées ;
  - travo.ma, alum.ma, mano.ma, bnidari.ma ;
  - CYPE : générateur non daté ;
  - enginloc.ma : cotations sans référence produit ;
  - Jumia : vendeurs tiers.

  Elles sont utiles pour les postes posés et le haut de gamme, mais **à ne pas utiliser seules** pour fixer un prix de référence.
- **Prix de référence.** Le prix retenu ci-dessous est la **médiane des sources B**. Quand aucune source B n'existe, la valeur est marquée *(indicatif C)*.

## 2. Synthèse par catégorie

### PEINTURE & ENDUITS (34 entrées : 29 B, 5 C)

Prix fourni, Bricoma, prix au kg calculés à partir des seaux.

| Article | Gamme | Réf. retenue | Dispersion B | Remarques |
|---|---|---|---|---|
| Vinylique intérieure seau 30 kg (Itovinyl, Matex, Jafep 404) | éco | **≈ 10 DH/kg** | 7,2–12,5 | Seau 30 kg : 215–375 DH |
| Vinylique 30 kg (Colovinyl 600, Cellaqua, Vinytek) | moyen | **≈ 14 DH/kg** | 13,2–18 | Petits conditionnements (5–10 kg) : 24–30 DH/kg |
| Acrylique / mat haut de gamme (Zenit, Odasat, Extralite, Notach) | haut | **≈ 47 DH/kg** | 40–66 | |
| Glycérophtalique (Astraline, Colostar, Colomat, Rexomat, Satilac) | moyen | **≈ 44 DH/kg** | 30–60 | |
| Laque acrylique à l'eau (Coloaqua, Aquastral) | haut | **55–83 DH/kg** | | |
| Façade (Jafep 504 mate / Astraloxane siloxane) | moyen / haut | 16,7 DH/kg / **59 DH/L** | | Le guide lechantier donne 95–160 DH/L (C), soit nettement plus haut |
| Enduits de lissage et rebouchage (Toupret CB, RE38, Stopastral, Silenduit) | | **≈ 11 DH/kg** | 5–17 | Enduit façade : 10–12 DH/kg |
| Pose peinture 2 couches + sous-couche | | *(indicatif C)* 30–60 DH/m² | | Main-d'œuvre seule |

- **Lacune :** aucun prix Jotun en ligne au Maroc.

### REVÊTEMENTS : carrelage, marbre, zellige, plinthes (68 entrées : 19 B, 49 C)

| Article | Gamme | Réf. retenue | Dispersion | Remarques |
|---|---|---|---|---|
| Grès cérame 45x45 | éco | **105 DH/m²** (B, 1 source) | C : 65–130 | |
| Grès cérame 60x60 / 60x120 poli ou effet marbre | moyen | **165 DH/m²** (B : 140 / 165 / 170, prix promo) | prix normaux 180–279 ; C : 80–180 | lechantier se contredit : 80–150 (blog) contre 110–180 (page prix) |
| Grès grand format 80x80 / 120x120 | haut | *(indicatif C)* 180–350 DH/m² | | |
| Faïence 30x60 | éco / moyen | 110–130 DH/m² (B, Zellijj) | C : 45–160 selon format | |
| Plinthe assortie | | *(indicatif C)* 8–25 DH/ml | | Aucune source B |
| Marbre / pierre local (Atlantic Blanc, Gris Royal, Cream Julia) | moyen | **≈ 440 DH/m²** | B : 400–470 ; C (Tiflet / Benslimane) : 280–550 | Sud (Marrakech, Agadir) : +5 à 15 % |
| Marbre importé (Crema Marfil, Blanc Carrare, Blanc Ibiza) | haut | **≈ 700 DH/m²** (B : 650–700) | C : Carrare 900–2 200 | **Contradiction** : le Carrare est à 700 chez Zellijj, contre 1 000–2 200 TTC chez Carrelage Tanger |
| Granit (Gran Perla … Labrador Noir) | moyen à luxe | **≈ 850 DH/m²** (B : 550–1 300) | C : 550–1 400 | |
| Zellige machine 10x10 | moyen | *(indicatif C)* 250–380 DH/m² | | |
| Zellige artisanal Fès 5x5 | luxe | *(indicatif C)* 650–1 100 DH/m² | | Bejmat : 450–800 (page prix), contre 300–550 dans le blog du même site |
| Pose carrelage standard | | *(indicatif C)* 50–80 DH/m² | | **Contradiction** : 80–180 sur la page prix lechantier |
| Pose grand format | | *(indicatif C)* 80–160 DH/m² | | |
| Pose marbre | | *(indicatif C)* 150–350 DH/m² | | |

- **Lacunes :**
  - aucune grille Super Cérame ou Facemag (prix sur devis en showroom) ;
  - pas de prix « importé Espagne » identifié par marque (Porcelanosa, Pamesa) ;
  - travertin uniquement en C.

### FAUX PLAFOND, PLÂTRE, STAFF (20 entrées : toutes C)

| Article | Réf. *(indicatif C)* | Remarques |
|---|---|---|
| Plaque BA13 standard (fourni) | 35–55 DH/m² | Hydrofuge : 45–70 ; ignifuge : 55–85 ; BA18 phonique : 65–95 |
| Faux plafond BA13 posé | **165 DH/m²** (130–200 ; Casablanca 150–220) | CYPE : 227,91 DH/m² HT (BA15, ossature F-530) |
| Faux plafond staff lisse posé | 90–140 (mano) | **Contradiction** : 180–280 chez lechantier |
| Corniche staff standard | 65–95 DH/ml | |
| Plâtre en sac de 25 kg | 25–45 DH/sac | |

- **Lacune :** aucune plaque BA13 avec prix affiché chez un distributeur. Rifaa et As du Placo pratiquent le « prix sur demande ».

### MENUISERIE ALUMINIUM / PVC (31 entrées : toutes C)

| Article | Réf. *(indicatif C)* | Dispersion |
|---|---|---|
| Fenêtre alu coulissante standard, fourni | **≈ 1 000 DH/m² HT** | 700–1 300 (travo, alum, lechantier blog) |
| Fenêtre alu RPT + double vitrage, fourni | **≈ 1 250 DH/m² HT** | 1 000–1 500 |
| Même fenêtre, posée | ≈ 1 450 DH/m² HT | 1 150–1 800 |
| Haut de gamme / grandes baies / galandage | 1 500–2 500 DH/m² | Schüco / Reynaers levant-coulissant : 4 500–7 500 (lechantier) |
| Porte d'entrée alu | 3 500–7 000 DH/u, ou 1 500–3 000 DH/m² | |
| PVC | 600–1 000 DH/m² HT (alum) | 10–20 % moins cher que l'alu (travo) |
| Pose seule | 150–400 DH/m² | |

- **Contradiction majeure :** la page prix lechantier donne 1 800–2 800 DH/m² pour une fenêtre alu double vitrage sans RPT, soit environ 2 fois les autres guides et son propre blog. Cette valeur est à écarter, ou à réserver au haut de gamme.
- **Lacune :** aucun tarif Technal ou Schüco spécifique, aucun prix distributeur B.

### MENUISERIE BOIS (10 entrées : toutes C)

| Article | Réf. *(indicatif C)* |
|---|---|
| Porte isoplane mélaminée 80x210 | 450–750 DH |
| Porte isoplane tubulaire | 650–1 200 DH |
| Bloc-porte complet | 1 200–3 500 DH |
| Porte pin massif | 2 800–5 500 DH |
| Porte chêne massif | 6 500–11 000 DH |
| Porte d'entrée bois massif | 8 500–18 000 DH |
| Pose porte intérieure | 200–400 DH |

- **Lacunes :** aucun prix B. Les annonces Avito de portes blindées (2 700–4 300 DH) n'ont pas pu être vérifiées (accès 403) et ne sont pas incluses.

### FERRONNERIE / GARDE-CORPS (9 entrées : toutes C)

| Article | Réf. *(indicatif C)* |
|---|---|
| Garde-corps alu barreaudage | 280–450 DH/ml |
| Garde-corps inox 304 | 450–850 DH/ml |
| Garde-corps fer forgé | 650–1 800 DH/ml |
| Garde-corps verre + inox | 1 200–1 800 DH/ml |
| Garde-corps tout verre | 1 800–2 800 DH/ml |
| Pose | 200–650 DH/ml |

- **Contradiction :** le garde-corps alu est à 800–1 500 DH/ml dans le blog lechantier, contre 280–650 sur sa page prix.

### ÉLECTRICITÉ (27 entrées : 21 B, 6 C)

| Article | Réf. retenue (B) | Remarques |
|---|---|---|
| Fil H07V-U 1,5 mm² | **2,74 DH/ml** | BniDark, Nexans/Ingelec |
| Fil H07V-U 2,5 mm² | **4,33 DH/ml** (4,25 Matelec, couronne 100 m à 425 DH ; 4,40 BniDark) | Bonne cohérence |
| Câble souple 3x1,5 / 3x2,5 / 5x2,5 | 10,1 / 17,2 / 29 DH/ml | |
| Gaine ICTA orange Ø13 / Ø16 | 3,3 / 3,9 DH/ml (couronne 50 m) | |
| Disjoncteur modulaire 1P 10/16 A (Schneider Easy9) | **36,90 DH** | Jumia : 45 DH (C) |
| Interrupteur différentiel 2P 40 A 30/300 mA (Easy9) | **299 DH** | 4P 40 A : 409 DH |
| Coffret d'abonné encastré 42 modules | **575–669 DH** | |
| Prise 2P+T / interrupteur Ingelec encastré | *(indicatif C)* 29–59 DH | Jumia, vendeurs tiers |
| Prise 2P+T étanche Simon 54 | 91,90 DH | |

- **Lacunes :**
  - aucun prix trouvé pour le fil 6 mm² ;
  - pas de tableau électrique pré-équipé (rangées) ;
  - pas de prix Legrand ni Schneider Unica en DH.

### PLOMBERIE : tubes et chauffe-eau (26 entrées : 19 B, 7 C)

| Article | Réf. retenue (B) | Remarques |
|---|---|---|
| Tube PPR PN20 Ø25 | **18 DH/ml** (Ziribox) | Ø50 : 80,4 DH/ml |
| Tube PPR PN20 Ø20 (Coprax) | 39,50 DH/u | Longueur non indiquée, probablement une barre de 4 m (non confirmé) |
| Multicouche 16x2 | *(C)* 9 DH, unité non précisée | Contradiction avec CYPE (≈ 20 DH/m le tube seul, 32,37 DH/m HT posé) |
| Chauffe-eau électrique 50 L | **≈ 1 845 DH** (1 690–1 999, prix promo) | |
| Chauffe-eau électrique 80 / 100 L | 2 259 / ≈ 3 200 DH | |
| Chauffe-eau électrique 150 / 300 L | 4 290 / 5 350 DH | |
| Chauffe-eau gaz 10 L | **≈ 1 995 DH** | Le 6 L coûte 1 129 DH |
| Chauffe-eau solaire 200 L | **≈ 12 945 DH** (11 999–13 890) | C : 9 500–14 500 |
| Chauffe-eau solaire 300 L | **≈ 16 900 DH** (15 999–17 795) | Pose : 850–955 DH (Bricoma) |

- **Lacune :** aucun prix pour le tube cuivre en DH.

### SANITAIRE (31 entrées : 25 B, 6 C)

Marque Roca dominante (Bricoma).

| Article | Gamme | Réf. retenue (B) |
|---|---|---|
| Pack WC complet (Adele, Debba) | éco | **≈ 1 080 DH** (879–1 279) |
| Pack WC (Gap, Sidney) | moyen | **≈ 2 410 DH** (2 265–2 559) |
| Pack WC (Hall, Happening, abattant amorti) | haut | **≈ 3 270 DH** (3 079–3 455) |
| Lavabo mural Debba | éco | 315 DH |
| Lavabo + colonne Debba | éco | 1 138 DH |
| Lavabo Urbi | moyen | 1 085 DH |
| Mitigeur lavabo | éco | **≈ 430 DH** (369–489) |
| Mitigeur lavabo bec haut Carelia | moyen | 959 DH |
| Mitigeur douche | | 445–749 DH |
| Mitigeur évier Mencia | | 1 239 DH |
| Mitigeur Blanco Linus | haut | 2 750 DH |
| Cabine de douche avec receveur 90x90 | | 2 349 DH |
| Paroi à l'italienne 90x200 (Orso) | | 1 519 DH |
| Paroi Roca Victoria | | 5 675 DH |
| Grohe : corps encastré | | 800 DH |
| Grohe : façade bain-douche | | 2 580 DH |
| Grohe : kit douche encastré | | 14 500 DH |
| WC suspendu complet | | *(C)* 1 800–3 200 (entrée), Geberit 3 200–6 500, Grohe 3 500–7 000 |

- **Lacunes :**
  - Jacob Delafon : aucun prix en DH ;
  - receveur de douche seul : non trouvé ;
  - Grohe : couverture limitée (3 références).

### CVC : climatisation (18 entrées : 12 B, 6 C)

| Article | Réf. retenue (B, Bricoma) | Remarques |
|---|---|---|
| Split 9 000 BTU | ≈ 3 600–4 900 DH | |
| Split 12 000 BTU (Zenya, Megalife, Taurus, Carrier) | **≈ 4 000 DH**, soit ≈ 0,33 DH/BTU | 3 650–5 499 |
| Split 18 000 BTU inverter | **≈ 6 600 DH** | 5 849–7 349 |
| Split 24 000 BTU inverter | **≈ 7 790 DH** | 7 199–9 290 |
| Marques premium (Daikin, LG, Mitsubishi) | *(C)* 12k : 5 500–9 500 ; 24k : 10 500–18 000 | Marché plus haut que les marques grand public |
| Gainable 24–36 kBTU | *(C)* 22 000–35 000 DH | |
| Pose d'un split | *(C)* 1 200–2 000 DH | |

### ISOLATION (11 entrées : 3 B, 8 C)

| Article | Réf. retenue | Remarques |
|---|---|---|
| PSE 4 cm | **24 DH/m²** (B, Rifaa) | C : PSE 5 cm 25–40 |
| XPS 4 cm | **≈ 87 DH/m²** (B, Aouami) | C : XPS 5 cm 45–70 |
| Laine de verre | 35 DH/m² (B, épaisseur non précisée) | |
| Laine de roche 5 cm / 10 cm | *(C)* 40–60 / 65–95 DH/m² | |
| ITE complète | *(C)* 220–380 DH/m² posée | |

### ASCENSEUR (8 entrées : toutes B)

Source unique : grille indicative 2026 de l'installateur Adrar Ascenseur, posé, hors génie civil, base Casablanca/Rabat.

| Article | Réf. retenue |
|---|---|
| 320 kg (≈ 4 personnes), hydraulique, 2 niveaux | 150 000–200 000 DH |
| 480 kg (≈ 6 personnes), à câble, 4 niveaux | 200 000–280 000 DH |
| 630 kg MRL, 6 niveaux | 250 000–350 000 DH |
| Niveau supplémentaire | 15 000–30 000 DH |
| Génie civil | 30 000–80 000 DH |
| Maintenance 630 kg | 15 000–22 000 DH/an |

- **Contradictions internes à la source** pour le 630 kg : 220–320 k dans la FAQ, contre 250–370 k dans le tableau.
- **Lacune :** la grille ne précise pas HT/TTC. Elle n'a pas de 2e source B ; les autres sites (bati.ma) ne publient aucun chiffre.

### SOLAIRE PV (6 entrées : toutes C)

| Article | Réf. *(indicatif C)* | Remarques |
|---|---|---|
| Panneau Jinko 550 Wc | 4,15 DH/Wc (2 280 DH TTC, Expert Groupe, fiche non datée) | Autres vendeurs : 950–1 936 DH, non vérifiables (429 / 403) |
| Système clé en main 3–10 kWc | 8,5–14 DH/Wc | |
| Batterie 5 kWh | 22 000–38 000 DH | |

- **Lacune forte :** aucun prix distributeur PV vérifiable et daté.

### CUISINE ÉQUIPÉE (11 entrées : 2 B, 9 C)

Dispersion extrême selon la définition du produit (caissons seuls ou cuisine posée avec plan).

| Source | Prix |
|---|---|
| Faidalum (cuisine alu, prix d'appel, B) | 1 500 (standard) / 2 500 / 4 000 DH/ml |
| ArtMood (fabricant, C) | MDF mélaminé 4 000–6 000 ; laqué 6 000–10 000 ; premium 10 000–18 000 DH/ml |
| lechantier (cuisine posée, C) | 8 300–15 000 DH/ml (stratifié 3 ml) |
| Plans de travail | stratifié dès 300 DH/ml ; quartz 800–1 500 (ArtMood) contre 1 800–3 500 (lechantier) ; granit 1 200–2 500 DH/ml |

- **Recommandation :** pour une estimation standard, retenir **4 000–6 000 DH/ml posé** (MDF mélaminé, hors électroménager), à confirmer.
- **Lacune :** Kitea (accès 403).

## 3. Principales contradictions relevées

1. **Pose carrelage :** 50–80 DH/m² (lechantier blog, bnidari) contre 80–180 DH/m² (page prix lechantier).
2. **Fenêtre alu :** 700–1 500 DH/m² (travo, alum, lechantier blog) contre 1 800–2 800 DH/m² (page prix lechantier).
3. **Marbre de Carrare :** 700 DH/m² (Zellijj) contre 900–2 200 DH/m² (lechantier, Carrelage Tanger).
4. **Staff lisse posé :** 90–140 (mano) contre 180–280 DH/m² (lechantier).
5. **Garde-corps alu :** 280–650 contre 800–1 500 DH/ml, les deux chez lechantier.
6. **Plan quartz :** 800–1 500 (ArtMood) contre 1 800–3 500 DH/ml (lechantier).
7. **Ascenseur 630 kg, 6 niveaux :** trois fourchettes différentes dans la même source.
8. **Multicouche 16 :** 9 DH (Sanitaire Maroc, unité incertaine) contre environ 20 DH/m (CYPE).

## 4. Lacunes (non couvertes ou seulement en C)

- **Fabricants :** aucun tarif officiel (A) dans tout le périmètre.
- **Carrelage :** Super Cérame, Facemag, importé Espagne nommément, plinthes en B.
- **Peinture :** Jotun.
- **Électricité :** fil 6 mm², tableaux pré-équipés, Legrand et Schneider Unica en DH.
- **Plomberie / sanitaire :** tube cuivre, receveur seul, Jacob Delafon.
- **Menuiseries :** Technal et Schüco en tarif propre, PVC détaillé, porte blindée vérifiée.
- **Cuisine :** Kitea.
- **Solaire :** PV en distributeur vérifiable.
- **Faux plafond :** BA13 en distributeur, staff en distributeur.

## 5. Recommandations pour la base de prix CITURBAREA

1. **Prendre les prix B comme socle fourniture.** Utiliser les prix Bricoma, BniDark et Matelec comme socle « fourni TTC grand public ». Appliquer un coefficient négoce ou pro (-10 à -20 %) pour les achats de chantier, et vérifier ce coefficient avec 2 ou 3 négociants. Ne pas confondre prix promo et prix normal : `prix_ref` = promo, `prix_max` = normal.
2. **Réserver les sources C** aux postes posés et au haut de gamme, avec un indicateur « confiance faible ». Ne jamais utiliser les fourchettes de la page prix lechantier pour l'alu (surévaluées) sans arbitrage.
3. **Normaliser** la peinture au kg ou au litre et les câbles et gaines au ml : c'est déjà fait dans le JSON.
4. **Prévoir une majoration régionale :** Marrakech et Agadir +5 à 15 %, Sud et Oriental +15 à 25 % (marbre, ascenseur). La source est C ou B selon le poste.
5. **Obtenir des sources A** en demandant des tarifs publics revendeurs à Super Cérame, Facemag, Colorado, Astral, Ingelec/Nexans et Roca. Pour l'alu, l'ascenseur et la cuisine, lancer une campagne de 3 devis par poste.
6. **Rafraîchir les prix Bricoma** tous les trimestres : les URL sont stables et listées dans le JSON.
