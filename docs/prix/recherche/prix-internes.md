# Prix internes CITURBAREA : inventaire, contradictions, nomenclature unique

> Recherche du 2026-10-09, menée en lecture seule sur le dépôt (hors `node_modules`, `dist`, `.claude/worktrees`).
> Données : `prix-internes.json` (même dossier), avec **861 entrées** normalisées, **56 lignes de DQE réel** anonymisées, **183 postes de bordereau CPS** et **89 articles TerriScan**.
> Monnaie : MAD partout. Le champ `taxes` dit si le fichier source annonce un prix HT ou TTC. Il vaut `NON_PRECISE` quand le fichier ne dit rien, ce qui arrive dans la majorité des cas.
> Données personnelles : le dossier réel « réel (Kénitra) » ne fournit que les désignations, unités, quantités, prix, sources de prix et la ville (Kénitra). Aucun nom, CIN, adresse, téléphone, RC/ICE ni numéro de devis nominatif n'a été repris.

---

## 1. Inventaire par source

| # | Fichier | Contenu chiffré | Entrées | Nature | Source citée | Date |
|---|---|---|--:|---|---|---|
| 1 | `apps/web/src/command-center/modules/dossiers/costRangesMA.ts` | Fourchettes DH/m² pour 6 types × 4 à 5 standings, poids de 15 à 16 lots par type, plancher FON 600, 6 taux d'honoraires | 123 | COUT_M2, POIDS_LOT, HONORAIRE | aucune (« validé ») | 2026 |
| 2 | `apps/web/src/tomes/tome3/portals/p1/finitionsCatalog.ts` (*le chemin indiqué dans la mission était faux*) | 19 facteurs de finition (×0,80 à ×1,70) sur 6 lots | 19 | COEF_STANDING | — | — |
| 3 | `apps/web/src/tomes/tome3/portals/p1/PermitTaxesPanel.tsx` | Taxe plancher 20/30/40 DH/m², Agence urbaine 3,6 DH/m², ODP 20 DH/m²/trim., pompiers 1 000, topographe 2 500 | 5 | TAXE, PRIX_PRESTATION | « barèmes indicatifs » | — |
| 4 | `apps/web/src/features/lead-funnel/budgetPrevisionnel.ts` | 14 tranches de budget de 1 500 à 25 000 DH/m² | 14 | COUT_M2 (tranches d'affichage) | — | — |
| 5 | `apps/web/src/features/lead-funnel/RoiCalculator.tsx` | 6 coûts de base, 12 coefficients ville + défaut 0,9, 3 coefficients standing, fourchette ×0,85/×1,18 | 22 | COUT_M2, COEF_* | aucune | — |
| 6 | `apps/api/src/tomes/tome-4/public/p1-packs-quote.service.ts` | Coût/m² P1 sur 5 niveaux (API) + 10 taux P1 | 15 | COUT_M2, HONORAIRE | — | grille 2026-06 |
| 7 | `apps/web/src/domain/p1/quote.engine.ts` | Coût/m² P1 sur 5 niveaux (web, **périmé**) | 5 | COUT_M2 | — | antérieur 2026-06 |
| 8 | `apps/api/src/tomes/tome-6/p5/pricing.service.ts` | Foncier sur 8 zones (min/milieu/max), 7 multiplicateurs foncier, 4 coûts de construction par standing, frais annexes 12 %, barèmes des rapports | 39 | COUT_M2 (foncier), HONORAIRE, TAXE… | BAM IPAI, Aykana, Sefiani, KNA, Mubawab/Avito | 2025-26 |
| 9 | `packages/pricing-cnoa/src/bareme.ts` | Barème CNOA 2021 (22 catégories), honoraires 5 %, phases, TVA 20 % | 28 | COUT_M2 (plancher), HONORAIRE, TAXE | Contrat type CNOA 2024 Annexe 2 | 2021/2024 |
| 10 | `packages/pricing-cnoa/src/grille.ts` | Grille des coûts réels : 39 fourchettes par catégorie et niveau | 39 | COUT_M2 | « arrêtées par le propriétaire » + test d'invariant | — |
| 11 | `apps/api/src/tomes/tome-3/p3/pricing.service.ts` | MOD 10 % | 1 | HONORAIRE | — | — |
| 12 | `apps/api/src/tomes/tome-4/p4/pricing.service.ts` | Packs foncier 0,3/0,6/1 %, plancher 3 000 HT | 4 | HONORAIRE | — | — |
| 13 | `apps/api/data/materials/catalog.json` + `prices-2026-05.json` | 80 matériaux (min/moyen/max) + 12 coefficients régionaux | 92 | PRIX_MATERIAU, COEF_REGIONAL | « Mercuriale ANCFCC », Sonasid, LafargeHolcim…, nombre d'observations | 2026-05 |
| 14 | `apps/api/data/prestataire-tarifs/tarifs-types-corpus.json` | 41 prestations, pose seule ou ouvrage | 41 | PRIX_PRESTATION / PRIX_OUVRAGE | « observatoire prix BTP Maroc 2026 » | 2026-05-25 |
| 15 | `apps/api/scripts/seed-referentiel.ts` | 197 produits MarketProduct répartis en 12 corps (min/max) | 197 | PRIX_MATERIAU | aucune | 2026 |
| 16 | `apps/api/scripts/seed-marketplace.ts` (*source trouvée en plus*) | 42 offres de fournisseurs **démo fictifs** (prix unique) | 42 | PRIX_MATERIAU | démo | 2026 |
| 17 | `referentiel_cps/terriscan_referentiel/prix_materiautheque_2026.json` | 122 prix en unité de vente, codes CIT-xx via `mapping.json` (tous au statut ORPHELIN) | 122 | PRIX_MATERIAU | aucune (« à affiner par offres ») | 2026-07-09 |
| 18 | `referentiel_cps/terriscan_referentiel/dossier_reel_kenitra_data.json` | 3 bordereaux réels (56 lignes), offre de base et options A/B/C, MO forfaitaires, devis entreprise | 42 + 56 | DQE_REEL | SKU Bricoma, iatm.ma, sanili.ma, devis fournisseur… | 2026-07 |
| 19 | `docs/audit/villa-cost-breakdown.md` | Totaux médians villa (dérivés du n° 1) | 5 | COUT_M2 | dérivé | — |
| 20 | `apps/web/scripts/build-seo.mjs` | Guide public sur le prix d'une villa (copie du n° 1) | 5 | COUT_M2 | dérivé | 2026 |
| 21 | `apps/api/src/modules/zillow-ma/estimation.service.ts` | Facteur IPAI DGI 2017→2026 = 1,45 | 1 | COEF_REGIONAL | BAM IPAI | — |
| — | `referentiel_gros_oeuvre.json`, `referentiel_second_oeuvre.json`, `cps-templates/lots/*.json`, `mapping.json` | **Aucun prix** (règle « aucun PU figé ») : unités, modes de métré et codes seulement | — | nomenclatures | — | — |

**Doublons sans valeur nouvelle** (non dupliqués dans le JSON) :
- `apps/api/src/modules/sig/zone-detector.service.ts` recopie les fourchettes foncières de P5.
- `ETAT_PROJET_CITURBAREA.md` (l. 277) cite un « barème standing 2000-7500 MAD/m² » obsolète.
- Les locales `portes.json` reprennent les planchers de P4 et P5.

---

## 2. Contradictions chiffrées

### 2.1 Coût de construction d'une villa (DH/m² de plancher, hors terrain et honoraires)

| Niveau | costRangesMA VIL | Grille réelle 4.5/4.6 (villa isolée) | Grille 1.1 (habitat ≤ 500 m²) | P1 **API** | P1 **web** | P5 STANDING_COST_M2 | ROI villa R+1 (×coef) | Plancher CNOA |
|---|---|---|---|--:|--:|--:|--:|--:|
| Économique | 2 500 – 3 500 | — | 2 500 – 3 500 | 2 500 | **3 000** | 3 250 | 4 160 | 1 900 (1.1) |
| Moyen standing | 4 000 – 5 200 | 5 000 – 6 000 (standard) | 4 000 – 5 000 | 4 000 | 4 000 | 4 500 | 5 200 | 4 000 (4.5) |
| Standing / haut | 5 500 – 7 000 / 7 500 – 9 500 | 8 000 – 9 000 | 6 000 – 7 000 | 6 000 | **5 000** | 7 500 | 7 540 | 6 000 (4.6) |
| Luxe | 10 000 – 14 000 | 12 000 – 13 000 | 10 000 – 11 000 | 9 000 (BLACK 13 000) | **6 000 (BLACK 7 000)** | 13 000 | — | 6 000 |

Constats :
- **P1 web et P1 API divergent** alors que `quote.engine.ts` se présente comme une « EXACT replica ». En mode hors ligne, l'écart va de –50 % (PREMIUM : 6 000 contre 9 000) à +20 % (ÉCO : 3 000 contre 2 500), et BLACK tombe de 13 000 à 7 000. Les honoraires P1 affichés hors ligne sont donc faux d'autant.
- **Trois échelles de standing incompatibles** coexistent :
  - costRangesMA : 5 paliers, avec des libellés villa décalés (ECONOMIQUE affiché « Moyen standing »).
  - Grille réelle : niveaux libres par catégorie.
  - P1, P5 et ROI : 3 ou 4 paliers aux seuils différents. Pour une même villa « haut standing », on trouve 5 000 (P1 web), 6 000 (P1 API), 7 500 (P5), 7 540 (ROI), 7 500 – 9 500 (costRangesMA) et 8 000 – 9 000 (grille).
- **Le calculateur ROI surévalue le bas de gamme.** La villa R+1 « éco » à Casablanca donne 5 200 × 0,8 × 1,15 = 4 784 DH/m², au-dessus du « Moyen standing » de costRangesMA.
- **Le budgetPrevisionnel** (1 500 → 25 000) descend sous le plancher CNOA (1 900) et ne pointe sur aucune grille.

### 2.2 Immeubles et aménagement

| Cas | costRangesMA | Grille réelle | CNOA plancher | Autres |
|---|---|---|--:|---|
| Immeuble moyen standing | IMM STANDARD 5 000 – 6 800 | 3.2 moyen : 4 500 – 5 500 | 3 700 | ROI « immeuble » : 6 500 |
| Immeuble haut standing | IMM STANDING 7 000 – 9 500 | 3.3 haut : 7 000 – 8 000 | 5 000 | — |
| Aménagement intérieur | AME ÉCO 2 500 – 4 000 / STD 4 000 – 6 000 | 6.1 : 3 000 – 4 000 ; 6.2 : 5 000 – 6 000 | 2 500 / 4 500 | ROI « commerce » : 7 000 |
| **Réel réel (Kénitra)** (commerce alimentaire ERP, 212 m²) | — | — | — | offre de base **3 302 TTC/m²** (≈ 2 751 HT) ; options A/B/C : 4 035 / 4 588 / 5 121 TTC/m² |

L'offre réelle se place dans le bas de AME ÉCONOMIQUE et **sous le plancher CNOA 6.2** (4 500). Ce plancher sert d'assiette d'honoraires, pas de prix de marché, mais cela montre que la catégorie 6.2 est mal choisie pour une petite surface commerciale.

### 2.3 Matériaux : même produit, écarts entre sources (prix de vente)

| Produit (unité normalisée) | catalog/prices-2026-05 | seed-referentiel | matériauthèque TerriScan | seed-marketplace (démo) | **Constaté (réel (Kénitra), Kénitra)** | Écart max/min |
|---|---|---|---|---|---|--:|
| Ciment CPJ 45, sac 50 kg | 78 – 92 (moy. 85) | 70 – 84 | 68 – 82 | 72 | — | ×1,35 |
| Acier HA FeE500 (DH/kg)¹ | **9,35 – 10,8** | 11,6 – 15,6 | 11 – 15 | 12,9 – 13,1 | — | ×1,7 |
| Agglo creux 20×20×40 (u) | 5,5 – 7,8 | **3,8 – 5,5** | 5,5 – 8 | 4,5 | — | ×2,1 |
| Treillis soudé ST25 (DH/m²)² | **38 – 52** | 11 – 14 | 22 – 38 | 12,4 | — | ×4,7 |
| Tube PER Ø16 (DH/ml)³ | **9 – 16** | 4,2 – 5,3 | (PPR 15 – 45) | 4,85 | PPR Ø20 : 12,5 | ×3,8 |
| Tube PVC évac. Ø100 (DH/ml)³ | **38 – 58** | 17,5 – 24,5 | 20 – 70 | 21,5 | — | ×3,3 |
| Câble 1,5 mm² (DH/ml) | **6,5 – 10** | — | 3 – 7 | — | **2,60** | ×3,8 |
| Câble 2,5 mm² (DH/ml)³ | **9,5 – 14** | 1,8 – 2,5 | 5 – 10 | — | **4,20** | ×7,8 |
| Prise 2P+T complète (u) | **65 – 120** | 18 – 40 | 35 – 110 | — | **13,5 – 21,5** | ×8,9 |
| Interrupteur différentiel 30 mA | **380 – 620** | 110 – 195 | 180 – 600 | — | (49,9 – 279 par composant) | ×5,6 |
| Chauffe-eau électrique 100 L | 2 200 – 3 200 | 1 300 – 1 850 | 1 500 – 4 500 | 1 450 | échelle 999 (50 L) / 2 159 (80 L) / 4 199 (150 L) | ×3,5 |
| Carrelage grès 60×60 (m²) | 115 – 195 | 75 – 185 | grand format 180 – 600 | 88 | — | ×6,8 |
| Chaux hydraulique (sac) | 55 – 78 (25 kg) | 75 – 98 | 70 – 95 | — | — | ×1,8 |
| Gainable inverter | — | 9 000 – 16 500 | 12 000 – 35 000 | — | 24 000 BTU : 11 200 – 12 900 ; 36 000 BTU : 14 600 – 19 999 | ×3,9 |

¹ Barre de 12 m convertie au poids théorique (Ø8 = 4,74 kg ; Ø10 = 7,40 ; Ø12 = 10,66 ; Ø16 = 18,94).
² Panneau ST25 de 6 × 2,4 m = 14,4 m².
³ Couronne de 100 m ou barre de 4 m ramenée au mètre linéaire.

Lecture :
- **`prices-2026-05.json` est systématiquement le plus cher sur le second œuvre.** Il dépasse les prix comptoir constatés de ×2 à ×5 en électricité, plomberie et treillis, alors qu'il affiche des « observations » (142, 167…) invérifiables.
- **À l'inverse, sur l'acier ce fichier est le moins cher** (~10 DH/kg contre 11 – 15 ailleurs).
- **Le gros œuvre de base** (ciment, BPE, granulats, briques, hourdis) est cohérent d'une source à l'autre, à ±15 % près.

### 2.4 Unités incompatibles entre sources (à normaliser avant toute fusion)

Le même produit change d'unité selon la source :
- **Acier** : T (catalog), BARRE (seed-referentiel), KG (matériauthèque).
- **Treillis** : m² ou panneau.
- **PER et PVC** : ml, couronne ou barre.
- **Peinture** : L ou pot de 25 kg.
- **Membranes** : m² ou rouleau de 10 m².
- **Fer** : `UNITE` dans seed-marketplace.

Les codes d'unité varient eux aussi : `U`, `UNITE`, `u`, `ens`, `fft`, `pt` et `forfait` coexistent. Le JSON garde l'unité d'origine. La future base doit stocker l'**unité de vente**, un **facteur de conversion** vers l'unité de métré, et la **masse** pour l'acier.

### 2.5 Honoraires, taxes et poids de lots

- **Honoraires** : ARCH 5 % et BET 2 % sont cohérents partout (costRangesMA, P1, CNOA). Le **topographe** vaut 0,3 % du coût travaux (costRangesMA) contre un forfait de 2 500 DH (PermitTaxesPanel), deux valeurs compatibles autour de 800 k DH de travaux. La **MOD** vaut 10 % de l'assiette CNOA en P3 mais 5 % du budget en P1. L'assiette P3 (plancher CNOA) sous-estime le coût réel de 20 à 50 % par rapport à la grille réelle.
- **Taxes** : PermitTaxesPanel et le guide SEO sont alignés (20 – 40 DH/m², 3,6 DH/m², protection civile). Aucune source ne donne la **TNB** ni les frais de **raccordement ONEE/Régie**.
- **Poids de lots** : MIX somme à **1,02** (normalisé au calcul). ELE et PLO ont le même poids pour VIL et HMB (7 %/7 %). La structure BA reste indexée sur le standing, ce qui donne 2 160 DH/m² en luxe (anomalie déjà relevée dans l'audit villa). **Aucun type ne contient de lot CVC ni de lot VRD**, sauf AME (CLM) et BUR (TEC 3 %).

---

## 3. Prix les plus fiables, et pourquoi

| Rang | Source | Fiabilité | Pourquoi |
|---|---|---|---|
| 1 | **DQE réels réel (Kénitra)** (`dqe_reels`) | Élevée pour les PU unitaires, faible en représentativité | Prix datés (2026-07) et sourcés par SKU ou par enseigne (Bricoma, iatm.ma, sanili.ma, eclairage212.ma, devis fournisseur), quantités métrées et corrigées. Limites : prix comptoir public (≈ TTC), une seule ville, un seul type de projet (ERP alimentaire), 30 lignes sur 56 « S/D ». |
| 2 | **Grille réelle P2** (`grille.ts`) | Élevée pour COUT_M2 | Valeurs arrêtées par le propriétaire, protégées par un test d'invariant (≥ plancher CNOA), granularité par catégorie réglementaire. Seul défaut : fourchettes de 1 000 DH sans source externe. |
| 3 | **costRangesMA** | Moyenne à élevée | « Validé », utilisé par le CC et publié tel quel sur le guide SEO, cohérent avec la grille ±10 %. À recaler par lot (cf. § 5). |
| 4 | **Barème CNOA 2021** | Élevée **comme plancher légal** | Texte réglementaire. Ce n'est pas un prix de marché et il ne faut jamais l'utiliser comme estimation. |
| 5 | **Gros œuvre de `prices-2026-05.json`** (ciment, BPE, granulats, briques) | Moyenne | Concordant avec 3 autres sources. Les régions sont modélisées. |
| 6 | **tarifs-types-corpus** (MO/pose) | Moyenne | Seule source de prix de **pose**. Ordres de grandeur plausibles, mais sans source primaire. |
| 7 | matériauthèque TerriScan, seed-referentiel | Faible à moyenne | Pas de source. Fourchettes très larges (grès 180 – 600, ×3,3), bornes basses de seed-referentiel souvent trop basses. |
| 8 | Second œuvre de `prices-2026-05.json` | Faible | De ×2 à ×9 au-dessus des prix constatés. Le nombre d'observations n'est pas auditable. |
| — | **À exclure** | — | `seed-marketplace.ts` (fournisseurs démo fictifs), `quote.engine.ts` (grille P1 périmée), `RoiCalculator` (constantes isolées), `budgetPrevisionnel` (tranches d'affichage). |

---

## 4. Proposition de nomenclature unique des lots

Principe : un code alpha de 3 lettres, stable et lisible (repris de costRangesMA quand il existe), plus un numéro d'ordre de 2 chiffres pour le tri et l'édition des CPS. Chaque code renvoie à toutes les nomenclatures existantes. Le détail complet est dans `prix-internes.json → nomenclatures.proposition_lots_uniques`.

| N° | Code | Libellé FR | costRangesMA | cps-templates | TerriScan | catalog.json | MarketProduct (corps) | tarifs corpus |
|---|---|---|---|---|---|---|---|---|
| 00 | INS | Installation de chantier & généralités | INS | LOT_00 | GO.01.A | — | — | nettoyage |
| 01 | TER | Terrassements | TER | LOT_01 | GO.01.B | granulats | GROS_OEUVRE | — |
| 02 | FON | Fondations & infrastructure | FON | LOT_02 (infra) | GO.02 | beton, acier, ciment | GROS_OEUVRE | — |
| 03 | STR | Structure béton armé | STR | LOT_02 | GO.03 | beton, acier, maconnerie (hourdis) | GROS_OEUVRE | — |
| 04 | MAC | Maçonnerie & enduits | MAC | LOT_03 | GO.04 | maconnerie, enduits | GROS_OEUVRE | maconnerie |
| 05 | ETA | Étanchéité & isolation | ETA | LOT_04 | GO.05 | etancheite | ETANCHEITE, ISOLATION | etancheite |
| 06 | CHC | Charpente & couverture | — | LOT_05, LOT_06 | — | — | — | — |
| 07 | FAC | Façades & habillages ext. (enseigne) | FAC, ENS | — *(à créer)* | FIN.03.A.03-04 | enduits, peinture | (ACM : MENUISERIE_ALU) | peinture |
| 08 | ALU | Menuiseries ext. alu/PVC & vitrage | ALU | LOT_07 | FIN.03.A.01-02 | menuiserie_alu | MENUISERIE (alu/PVC) | menuiserie_alu |
| 09 | BOI | Menuiseries int. bois & agencement | BOI | LOT_08 | SO.03 | menuiserie_bois | MENUISERIE (bois) | menuiserie_bois |
| 10 | MET | Métallerie, ferronnerie, charpente métal. | FER | LOT_09 | SO.01 | — | QUINCAILLERIE (serrurerie) | metallerie |
| 11 | CLO | Cloisons sèches & doublages | CLO (AME), part de MAC | LOT_10 | — | — | — | — |
| 12 | FPL | Faux plafonds, plâtre & staff | PLA | LOT_18, LOT_19 | SO.02 | (plâtre) | — | faux_plafond |
| 13 | RSO | Revêtements de sols | REV | LOT_11 | FIN.01 | revetement | REVETEMENT, MARBRERIE | carrelage |
| 14 | RMU | Revêtements muraux | part de REV | LOT_12 | FIN.02.A.03-06 | revetement | REVETEMENT | carrelage |
| 15 | PEI | Peinture | PEI | LOT_13 | FIN.02.A.01-02 | peinture | PEINTURE | peinture |
| 16 | PLO | Plomberie sanitaire & ECS | PLO | LOT_14 + LOT_17 | TEC.02 | sanitaire | PLOMBERIE, CHAUFFAGE_CLIM (ECS) | plomberie_sanitaire |
| 17 | ELE | Électricité courants forts | ELE | LOT_15 | TEC.01.A.01-10 | electrique | ELECTRICITE | electricite |
| 18 | CFA | Courants faibles, VDI & sûreté | part de TEC/SEC | LOT_20 | TEC.01.A.11 | (electrique) | ELECTRICITE | alarme, videosurveillance |
| 19 | CVC | Climatisation, ventilation, froid | CLM (AME), part de TEC | LOT_16 | TEC.03 | — | CHAUFFAGE_CLIM | climatisation |
| 20 | ASC | Ascenseurs & équipements communs | part de SEC | — | — | — | — | ascenseur_maintenance |
| 21 | ENR | Énergies renouvelables | — | — | — | — | — | photovoltaique |
| 22 | VRD | VRD, voirie & réseaux | (exclu) | LOT_26 | VRD.01 | granulats | VRD | — |
| 23 | EXT | Espaces verts & extérieurs | — | LOT_21 | — | — | VRD (clôture/ext.) | jardinage |
| 24 | DEM | Démolition, curage (réhabilitation) | DEM (AME) | — | — | — | — | — |
| 99 | TRV | Transverse (quincaillerie, outillage) | — | — | — | — | QUINCAILLERIE | — |

Justifications principales :
- **REV est éclaté en RSO et RMU.** Les CPS (LOT_11 et LOT_12) et TerriScan (FIN.01 et FIN.02) séparent déjà sols et murs, et leurs prix et unités diffèrent.
- **PLO regroupe LOT_14 et LOT_17.** Le chauffe-eau est rangé une fois en plomberie (TEC.02.A.07), une fois en CHAUFFAGE_CLIM (MarketProduct) : la nomenclature unique tranche pour PLO.
- **SEC et TEC sont dissous.** Ce sont des fourre-tout (sécurité + parties communes ; CVC + courant faible + sécurité), répartis entre CFA, CVC et ASC pour qu'un prix ne relève que d'un seul lot.
- **FAC devient un lot à part entière.** costRangesMA lui donne 5 à 8 % du coût, mais aucun lot CPS ne le porte : il faut créer un template CPS « Façades ».
- **CLO est distinct de MAC et de FPL.** La cloison BA13 (LOT_10) n'est ni de la maçonnerie ni un faux plafond.
- **Codes matériaux** : on conserve `MarketProduct.citCode` (CIT-GO-001…) comme clé matériau, avec `mapping.json` comme table de passage depuis les `materiauRefs` TerriScan. Il faut d'abord résoudre les 122 statuts ORPHELIN.

---

## 5. Ce que les DQE réels réel (Kénitra) permettent de calibrer

Dossier : aménagement d'une boulangerie-pâtisserie (ERP) à Kénitra, 212 m² de plancher (RDC 162 m² + mezzanine 50 m²). Prix constatés au comptoir ou sur le web (≈ TTC public), juillet 2026.

| Lot | Montant sourcé | Ratio /m² (212 m²) | Ce qui manque | Fourchette réaliste du lot complet | costRangesMA AME (poids × fourchette) |
|---|--:|--:|---|---|---|
| **Électricité** (24 lignes) | Matériel 29 916 (dont luminaires 13 160) + MO 9 900 = **39 816** | **188 DH/m²** (≈ 126 hors luminaires et MO) | Équipement TGBT, rail 15 ml, terre, CFa (≈ 6 000 à 14 000) | **≈ 46 000 – 54 000, soit 215 – 255 DH/m²** (hors luminaires ≈ 155 – 190) | ELE 18 % : ULTRA 270 – 450 / ÉCO **450 – 720** DH/m² |
| **Plomberie** (23 lignes) | Matériel 3 660 + MO 9 500 = **13 160** | 62 DH/m² (MO seule : **45 DH/m²**) | 20 caniveaux inox (8 800 – 22 000), PVC, sanitaires, chauffe-eau 200 L… | **≈ 33 000 – 50 000, soit 155 – 235 DH/m²** (estimation grossière par matériauthèque) | PLO 8 % : ÉCO 200 – 320 DH/m² |
| **CVC/froid** (9 lignes) | 2 gainables 31 250 + MO 6 500 = **37 750** | 178 DH/m² | Gaines, diffuseurs, extraction, air neuf | ≈ 60 000 hors chambre froide (≈ 280 DH/m²). Devis entreprise **162 169 HT**, dont **75 000 HT** de chambre froide jugée surévaluée ×2,5 : hors chambre froide **87 169 HT, soit 411 HT/m²** | CLM 12 % : ÉCO 300 – 480 DH/m² |
| Mezzanine métal 50 m² | 105 000 HT | **2 100 HT/m² de mezzanine** | — | — | (pas de lot structure dans AME) |
| Offre globale (10 lots) | 699 960 TTC | **3 302 TTC/m²** | options 855 k / 973 k / 1 086 k TTC | 4 035 – 5 121 TTC/m² | AME ÉCO 2 500 – 4 000 |

Enseignements :
1. **Électricité : AME surestime d'environ ×2.** Le lot réel pèse ≈ 7 à 8 % de l'offre de base, contre 18 % dans la grille AME. On peut proposer un poids ELE de **9 à 11 %** pour l'aménagement commercial (luminaires inclus), avec un ratio de **≈ 200 – 260 DH/m²**. Une sous-ligne « luminaires » vaut ≈ 60 DH/m² (30 panneaux LED + 40 spots + 20 spots rail + 8 BAES).
2. **Plomberie d'un local alimentaire : ≈ 150 – 240 DH/m²**, tiré par les caniveaux inox HACCP (1 pour 5 m²). La MO forfaitaire seule vaut ≈ 45 DH/m². Il faut créer un modificateur « ERP alimentaire » plutôt que relever le poids PLO général.
3. **La MO forfaitaire artisan est un étalon** à intégrer dans `tarifs-types-corpus` :
   - électricité prises + force + TGBT : 6 500 ;
   - éclairage : 3 400 pour 90 points, soit **≈ 38 DH/point**, contre 220 – 320 DH/point dans le corpus, qui inclut la fourniture : à distinguer ;
   - plombier complet : 9 500 ;
   - frigoriste : 6 500.
4. **PU matériaux à substituer dans la base** (prix comptoir 2026-07) : câble 1,5 mm² 2,60/ml, câble 2,5 mm² 4,20/ml, gaine ICTA Ø20 2,50/ml, boîte d'encastrement 3/u, prise 2P+T avec plaque 13,5 – 21,5/u, coffret TGBT polyester 80/60 1 200/u, panneau LED 600×600 155 – 259/u, BAES 156 – 295/u, gainables 24 000 BTU 11 200 – 12 900 et 36 000 BTU 14 600 – 20 000. Ils invalident le second œuvre de `prices-2026-05.json`.
5. **Corrections de métré** (« 12 et non 8 », « 20 et non 16 », « AJOUT obligatoire ») : les quantités d'une étude non vérifiée sont sous-estimées de 20 à 90 % sur certains postes. Prévoir un **coefficient de sous-métré** dans le DQE automatique.
6. **Limites** : un seul projet, prix comptoir (sans remise entrepreneur), TVA rarement explicite, 30 lignes sur 56 non chiffrées. Les ratios ci-dessus sont des **points de calibration**, pas des barèmes.

---

## 6. Recommandations pour la future base de prix

1. **Une seule table `PrixReference`** : (code nomenclature lot, code matériau CIT ou ouvrage, unité de vente, facteur de conversion, prix min/réf/max, HT/TTC, région, date, source, niveau de confiance). Les constantes du code (P1, P5, ROI, budget) doivent lire cette table au lieu de garder leurs propres grilles.
2. **Supprimer la grille de `quote.engine.ts`** (ou l'importer depuis l'API) et aligner P5 STANDING_COST_M2 et RoiCalculator sur la grille réelle et costRangesMA.
3. **Expliciter HT/TTC** dans chaque source : 54 % des entrées portant un montant (387 sur 715) sont `NON_PRECISE`.
4. **Distinguer fourniture, pose et ouvrage** : le corpus prestataires mélange « pose seule » et « fabrication + pose ».
5. **Régionaliser** avec les 12 coefficients de `prices-2026-05.json` (seule grille régionale structurée). Les coefficients ville du ROI (Casablanca 1,15… Oujda 0,78) contredisent les coefficients régionaux matériaux (Casablanca 1,00, Oriental 1,05) : les premiers mesurent le coût global, les seconds les matériaux. Il faut garder les deux, mais nommés différemment.
