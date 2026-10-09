# Prix matériaux gros œuvre et VRD au Maroc : synthèse de recherche

- **Date de recherche :** 2026-10-09
- **Fichier de données :** `materiaux-gros-oeuvre.json`, avec 248 entrées et 15 indices.
- **Répartition par fiabilité :** A = 0, B = 166, C = 82.
- **Périmètre :** ciment, béton prêt à l'emploi (BPE), acier HA, treillis, agglos, briques, hourdis et poutrelles, granulats, coffrage, étanchéité, PVC d'assainissement, regards, bordures, enrobés et location de matériel.

## Avertissements de méthode

1. **Aucune source de niveau A n'a été trouvée.** Les cimentiers (LafargeHolcim, Ciments du Maroc, Asment Temara, Novacim) et les sidérurgistes (Sonasid, Riva, Maghreb Steel) ne publient pas de tarif public. Rifaa affiche « 0,00 DH » pour l'acier, les briques et les hourdis : ce sont des prix factices.
2. **La plupart des sources B sont des guides de prix agrégés** (LeChantier, Francobat, EnginLoc blog, BTPro, Archiplan) ou des **offres de vendeurs nommés sur la marketplace Tachrone**, avec minimum de commande. Aucune ne publie sa méthode. Plusieurs guides se recopient : BTPro et LeChantier donnent des chiffres identiques pour le BPE. Leur concordance ne vaut donc pas une confirmation indépendante.
3. **Taxes (HT/TTC) :** elles sont rarement indiquées. Francobat se déclare TTC. Les offres de la carrière Ste 2CH sur Tachrone et les décompositions CYPE sont HT. Pour tout le reste, la valeur est « inconnu ».
4. **CYPE (maroc.prix-construction.info) :** les prix de composants ne sont pas datés et se contredisent d'une page à l'autre. Le ciment y vaut 1,30 ou 1,64 MAD/kg selon la page. Ils sont classés C et ne servent que d'ordre de grandeur.
5. **Pages Tachrone et EnginLoc :** elles ne sont pas datées. La date retenue est donc celle du relevé (2026-10). Les prix EnginLoc « dès » sont des prix d'appel et ont été classés C.
6. **Calcul de la référence :** c'est la médiane des points milieux des fourchettes des seules sources B, après exclusion des valeurs aberrantes signalées.

## Prix de référence retenus (médiane des sources B)

| Article | Unité | Réf. retenue | Dispersion observée (A/B/C) | N sources B | Sources principales | Remarques |
|---|---|---|---|---|---|---|
| Ciment CPJ 35 (sac 50 kg) | sac | **75** (≈1 500/t) | 65 – 78 | 6 | LeChantier, EnginLoc blog, Tachrone (Holcim, CIMAT, MATERCA, VETCO) | Les offres réelles des négociants (75-78) dépassent le bas des guides. |
| Ciment CPJ 45 (sac 50 kg) | sac | **80** (≈1 600/t) | 65 – 85 | 8 | LeChantier, Francobat (TTC), Tachrone (Holcim 81, CIMAT 82, 1 600-1 700/t) | Bonne convergence des sources. |
| Ciment CPJ 55 | sac | **90** | 85 – 100 | 2 | LeChantier, EnginLoc blog | |
| Ciment CPA 55 | sac | 90 (C) | – | 0 | EnginLoc catalogue | Une seule valeur « dès ». |
| Ciment CRS | sac | 100 | 90 – 110 | 2 | LeChantier, EnginLoc blog | |
| Ciment blanc 25 kg | sac 25 kg | 110 | 80 – 130 | 2 | LeChantier, EnginLoc blog | |
| Ciment, moyenne nationale 2023 | t | 1 051 | – | 1 | Conseil de la concurrence (avis A/3/25) via Hespress | Niveau proche du départ usine (≈52 MAD/sac). L'écart avec le détail (75-80) correspond aux marges de distribution, au transport et à la taxe. |
| BPE B15 | m³ | **825** | 600 – 900 | 2 | LeChantier, BTPro | |
| BPE B20 | m³ | **925** | 800 – 1 000 | 2 | LeChantier, BTPro | Livraison incluse dans un rayon de 15 à 20 km selon BTPro. |
| BPE B25 | m³ | **1 000** (Casablanca) / 1 025 (national) | 800 – 1 150 | 10 | BTPro (7 villes), LeChantier, Tachrone (850-900 à Settat) | Agadir 1 050-1 150 ; Oujda 1 020-1 130. |
| BPE B30 | m³ | **1 150** | 920 – 1 250 | 3 | LeChantier, BTPro, Tachrone M'Y MOD (920-970) | L'offre réelle à Settat est environ 18 % sous les guides. |
| Pompage BPE | m³ ou forfait | 150 – 250 /m³, ou 3 000 – 8 000 par coulage | – | 2 | LeChantier, BTPro | Les deux sources n'utilisent pas le même mode de facturation. |
| Acier HA Fe E500, tous diamètres | t | **9 500** (9,5 MAD/kg) | 8 000 – 10 500 | ~18 | LeChantier, Francobat, EnginLoc blog, Tachrone (VETCO, Wassim/Sonasid 9-10/kg), enquête LeChantier | |
| Acier HA Ø6-8 | kg | 9,8 | 8,5 – 10,5 | 5 | Francobat, LeChantier, Tachrone | Les petits diamètres coûtent environ 3 à 5 % de plus. |
| Acier HA Ø10-12 | kg | 9,6 | 8,0 – 10,5 | 6 | idem | |
| Acier HA Ø14-16 | kg | 9,5 | 8,8 – 10,5 | 5 | idem | |
| Acier HA Ø20-25 | t | 9 300 – 9 500 (C) | – | 0 | EnginLoc catalogue | Seule source trouvée pour ces diamètres. |
| Treillis soudé ST25 | m² | **47** | 25 – 55 | 2 | LeChantier, EnginLoc blog | |
| Treillis soudé ST50 | m² | **71** | 55 – 95 | 2 | idem | Pour le ST40, LeChantier seul donne 50-75 ; pour le ST65, 95-130. |
| Agglo creux 10×20×40 | u | **4** | 2,5 – 6 | 2 | LeChantier, EnginLoc blog | |
| Agglo creux 15×20×40 | u | **5,75** | 3 – 9 | 7 | LeChantier, Francobat, Archiplan, Tachrone (Wislane, VETCO, M'Y MOD) | |
| Agglo creux 20×20×40 | u | **7** | 3,5 – 12 | 7 | Francobat, Tachrone (5-7), LeChantier | Forte contradiction entre EnginLoc (3,5-5) et LeChantier (8-12). LeChantier se contredit lui-même (6,5-8 sur une autre fiche). |
| Agglo 25 | u | 11 (faible confiance) | 7 – 16 | 1 | LeChantier ; Tachrone VETCO en C | |
| Brique creuse 6 trous | u | **1,5** | 1,2 – 2,5 | 3 | LeChantier, Archiplan, Francobat | |
| Brique creuse 8 trous | u | **2,0** | 0,9 – 2,5 | 3 | EnginLoc blog, Tachrone (Jbel Annour, Wassim) | ConstructionEstimating donne 0,9-1,2 (classé C), probablement un prix usine. |
| Brique creuse 12 trous | u | **2,0** | 1,1 – 2 | 1 | Tachrone Wassim (minimum 7 000) | Faible confiance. |
| Hourdis béton 12 | u | **5** | 4 – 7 | 2 | Tachrone (Wislane, VETCO) | |
| Hourdis béton 16 | u | **5,8** | 4,8 – 10 | 4 | EnginLoc blog, Tachrone, Francobat | **Valeur LeChantier (18-26) écartée comme aberrante.** |
| Hourdis béton 20 | u | **7,5** | 6 – 11 | 3 | EnginLoc blog, Tachrone (Wislane, Cimag) | LeChantier (24-32) écarté. |
| Hourdis béton 25 | u | 9 | 8 – 13 | 1 | Tachrone Cimag | |
| Hourdis terre cuite 16 / 20 | u | 4 / 5,25 | 3,5 – 6 | 1 | Francobat | |
| Poutrelle précontrainte | ml | **~50, à valider** | 22 – 95 | 4 | LeChantier (42-82 selon la longueur), Tachrone Old Maati (26/ml) | Désaccord majeur entre sources. CYPE donne 21,67. |
| Poutrelles + hourdis, fourniture | m² plancher | 185 | 150 – 220 | 1 | Enquête LeChantier (20 entreprises) | |
| Sable concassé 0/4, rendu chantier | m³ | **200** | 150 – 250 | 4 | LeChantier (fiche et blog), Francobat, EnginLoc blog | Le transport ajoute 80 à 150 MAD/m³ sur 30 km. |
| Sable de carrière, départ carrière | m³ | 130 | 100 – 160 | 1 | LeChantier blog | Tachrone (carrière 2CH) : 35-55 MAD/t HT. |
| Sable de rivière (oued), rendu | m³ | 255 | 180 – 350 | 2 | LeChantier blog, EnginLoc blog | |
| Sable de mer lavé, rendu | m³ | 195 | 120 – 300 | 2 | LeChantier blog, EnginLoc blog | |
| Gravier 8/15 (ou 5/15), rendu | m³ | **230** | 160 – 300 | 4 | LeChantier, Francobat, EnginLoc blog | |
| Gravier 15/25, rendu | m³ | **215** | 150 – 350 | 3 | LeChantier, EnginLoc blog | |
| Tout-venant 0/40, rendu | m³ | **155** | 110 – 200 | 3 | LeChantier, EnginLoc blog | Départ carrière : 70-120/m³ ; Tachrone 0/60 : 25-30/t HT. |
| Contreplaqué CTBX 18 mm (coffrage) | m² | **102** | 85 – 120 | 1 | LeChantier | Le filmé 18 mm coûte 180-260. |
| Bois sapin brut (C18) | m³ | 3 500 (C) | 2 500 – 4 500 | 0 | LeChantier | Aucun prix spécifique pour le coffrage. |
| Coffrage, ouvrage (fondations / dalle) | m² | 200 / 160 | 120 – 250 | 1 | Enquête LeChantier | |
| Membrane bitumineuse 4 mm ardoisée, fourniture | m² | **44,5** | 42 – 45,5 | 1 | Rifaa (440-455 MAD le rouleau de 10 m²) | |
| Étanchéité monocouche 4 mm, posée | m² | 75 | 60 – 90 | 1 | LeChantier | |
| Étanchéité SBS bicouche, posée | m² | **135** | 60 – 320 | 1 | LeChantier ; AB Maroc 180-320 en C | |
| Bitume oxydé 90/40 | kg | 30 (C) | – | 0 | Rifaa | |
| Tube PVC assainissement Ø200 SN4 | ml | **~60–65, négoce** | 55 – 153 | 1 | EnginLoc (offres 59-65, C), Bricoma détail 153/ml (B) | L'écart entre négoce et grande surface de bricolage est d'un facteur 2,5. |
| Tube PVC Ø160 SN4 | ml | 150 (C) | – | 0 | CYPE | Ouvrage posé : 251 MAD/ml HT. |
| Cadre et tampon fonte 60×60 B125 | u | 646 (C) | – | 0 | CYPE | |
| Regard 60×60×60 coulé, avec tampon | u | 1 550 (C) | – | 0 | CYPE | |
| Bordure T2 | ml | **36** | 25 – 45 | 1 | LeChantier | La pose ajoute 80-150 MAD/ml. |
| Bordure T3 | ml (≈u) | **55** | 42 – 65 | 2 | LeChantier, Tachrone Cimag (56/u) | Pour la T4 : 65/u (Cimag). |
| Enrobé bitumineux à chaud | t | 542 (C) | – | 0 | CYPE | Ouvrage de 8 cm : 106 MAD/m² HT. |
| Location bétonnière 350 L | jour | 200 (C) | 200 – 1 500 | 0 | EnginLoc | 1 500 MAD/j correspond probablement à une auto-bétonnière. |
| Location pompe à béton 36 m | jour | 6 000 (C) | – | 0 | EnginLoc | |
| Location grue à tour | jour | 8 000 (C) | – | 0 | EnginLoc | Grue mobile 50 t : dès 5 000. |
| Location mini-pelle | jour | 2 000 (C) | – | 0 | EnginLoc Casablanca | Transport non inclus. |

### Écarts régionaux (LeChantier et EnginLoc, base Casablanca-Rabat = 100)

| Poste | Écart régional |
|---|---|
| Ciment | Marrakech-Agadir +5 à 10 % ; Tanger +5 à 15 % ; Oriental et Sud +20 à 40 % ; Dakhla et Laâyoune +15 à 20 MAD/sac |
| BPE | Rabat +2 à 5 % ; Marrakech +5 à 8 % ; Tanger +5 à 10 % ; petites villes +10 à 20 % |
| Granulats | Tanger +10 à 20 % ; Marrakech +10 à 15 % ; Sud et Oriental +25 à 40 % ; Laâyoune-Dakhla : sable 200-350 MAD/m³ |

## Indices et tendances

| Indicateur | Période | Valeur |
|---|---|---|
| HCP, IPPI produits minéraux non métalliques | juin 2026 / décembre 2025 | +0,1 % / +0,1 % m/m (variations mensuelles faibles) |
| HCP, IPPI métallurgie | juin 2026 / décembre 2025 | −0,3 % / +0,1 % m/m |
| Historique LeChantier, novembre 2025 → avril 2026 | 6 mois | ciment +6 % ; acier +4,4 % ; sable +2,5 % ; BPE +3 % |
| Livraisons de ciment (Ministère de l'Habitat / APC) | fin novembre 2025 | +10,6 % (13,71 Mt) |
| Livraisons de ciment | fin juillet 2026 | −0,75 % (8,22 Mt) |
| Chiffre d'affaires Sonasid | 2025 | +16 %, tiré par les volumes |
| Conseil de la concurrence | 2022 | hausses de 1 à 2 MAD/sac |

**Lecture :** les prix de gros œuvre sont **stables à légèrement haussiers**, de l'ordre de +3 à +6 % sur 6 mois selon les guides, avec une inflation à la production quasi nulle selon le HCP. La demande de ciment est revenue à plat en 2026.

## Contradictions majeures signalées

- **Hourdis béton :** LeChantier donne 18-32 MAD/u, contre 4,5-9 pour les sept autres sources. Il s'agit probablement d'une erreur ou d'un autre produit, et la valeur a été écartée.
- **Agglo 20 :** les prix vont de 3,5-5 (EnginLoc blog) à 8-12 (LeChantier), et LeChantier se contredit entre deux fiches (6,5-8 et 8-12).
- **Poutrelles :** 26 MAD/ml sur Tachrone et 21,67 chez CYPE, contre 42-95 MAD/ml chez LeChantier.
- **Acier :** EnginLoc blog (janvier 2026) est environ 10 % sous LeChantier et Francobat (mars à mai 2026). Cet écart peut être une vraie hausse ou un biais de source.
- **Pompage BPE :** LeChantier facture au m³, BTPro au forfait.
- **Ciment :** le prix moyen 2023 du Conseil de la concurrence (≈52,5 MAD/sac) est très inférieur au prix de détail 2026 (75-80). Les deux niveaux de prix ne sont pas comparables.
- **PVC Ø200 :** 59-65 MAD/ml en négoce contre 153 MAD/ml chez Bricoma.

## Lacunes (rien de fiable trouvé)

- Tarifs officiels par marque : LafargeHolcim, Ciments du Maroc/Heidelberg, Asment Temara, Novacim, Sonasid, Riva, Maghreb Steel. Seuls Holcim, CIMAT et Ciments du Maroc apparaissent à travers des revendeurs.
- CPA 55 : une seule valeur C.
- Acier Ø20 et Ø25 : valeurs C uniquement.
- Hourdis 12 : données limitées.
- Briques 8 et 12 trous : peu de sources.
- Étais : aucun prix d'achat ni de location. Bois de coffrage et madriers : rien de spécifique.
- Hydrofuge de masse (Sika et autres) : aucun prix en MAD.
- **PVC assainissement Ø125, Ø250 et Ø315 : aucun prix.**
- Regards préfabriqués : aucun prix de fournisseur marocain.
- Enrobés : seule la valeur CYPE est disponible. Aucun bordereau public de la DRETL ou d'une commune n'a été trouvé.
- Grue mobile et grue à tour avec opérateur : seuls des prix « dès » non vérifiés sont disponibles.
- HCP : la série « indice des prix des matériaux de construction » n'existe sur data.gov.ma que jusqu'en 2022. L'IPPI ne couvre que les variations mensuelles par branche.
- Médias24, dont les articles de février 2026 reprennent les avis du Conseil de la concurrence sur le rond à béton et le ciment, renvoyait une erreur 403. Ses contenus n'ont donc pas été utilisés directement.

## 5 recommandations pour la base de prix CITURBAREA

1. **Stocker des fourchettes, pas des valeurs uniques.** Chaque article doit porter `prix_min`, `prix_ref` et `prix_max`, ainsi qu'un **coefficient régional** (Casablanca-Rabat = 1,00 ; Marrakech 1,07 ; Tanger 1,10 ; Sud et Oriental 1,25-1,35). Les écarts réels entre sources sont de ±20 à 40 %. Une valeur ponctuelle donnerait une fausse précision aux devis.
2. **Séparer fourniture, livraison et pose, et normaliser HT/TTC.** Les sources mélangent prix départ carrière, prix rendu chantier (+80 à 150 MAD/m³ pour les granulats) et prix posés (étanchéité, bordures). Il faut un champ `base` (départ, rendu ou posé) et stocker en HT. La TVA BTP est à appliquer par le moteur, et les taux sont à confirmer auprès d'un fiscaliste.
3. **Constituer un panel de négociants réels.** Tachrone (VETCO, Cimag, Wislane, Ste Wassim, M'Y MOD, Casatransmateriaux) et Rifaa affichent des offres chiffrées avec minimum de commande. Il faut demander des devis écrits trimestriels à 3 négociants dans chacune de 4 villes (Casablanca, Rabat, Marrakech, Tanger) pour obtenir des données de niveau A. C'est la seule façon de trancher les contradictions sur les hourdis, les agglos et les poutrelles.
4. **Indexer automatiquement entre deux relevés.** Il est possible de brancher l'IPPI du HCP (branches « produits minéraux non métalliques » pour le ciment, les agglos et les briques, et « métallurgie » pour l'acier), publié chaque mois sur hcp.ma, ainsi que les livraisons de ciment de l'APC comme indicateur de tension. Une alerte se déclencherait si la variation cumulée dépasse ±5 %. Il faut aussi conserver `date_prix` et `fiabilite` pour signaler les prix de plus de 6 mois.
5. **Combler en priorité les postes VRD.** PVC Ø125-315, regards, tampons et enrobés sont aujourd'hui documentés uniquement par CYPE ou EnginLoc, en C. Il faut viser les **bordereaux des prix des appels d'offres publics**, qui sont des estimations confidentielles mais dont les résultats d'ouverture des plis sont publiés sur marchespublics.gov.ma (ONEE, communes, DRETL), ainsi que les catalogues de fabricants de tubes (Ferroplast, Idoplast). En attendant, il faut signaler ces postes dans l'estimateur CITURBAREA avec une marge d'incertitude élargie (±30 %).
