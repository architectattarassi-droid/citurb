# Prix unitaires d'ouvrages : marchés publics et documents officiels (Maroc)

Date de recherche : 2026-10-09. Données détaillées : `marches-publics.json`, avec 55 prix unitaires, 26 coûts globaux et 4 références réglementaires.

## 1. Constat principal

Aucun bordereau des prix–détail estimatif (BPDE) **rempli** n'est accessible publiquement sur Internet. Tous ceux qui ont été ouverts sont des pièces de dossier d'appel d'offres, dont la colonne des prix est vide :
- université Abdelmalek Essaâdi : AO 01/2018 et AO 16/2019 ;
- Habous Fès, mosquée Lmerja ;
- Habous Marrakech, immeubles Azzahiria ;
- Institut Scientifique de Rabat ;
- APDN : AO 12-14 et autres.

Plusieurs résumés automatiques de moteurs de recherche ont confondu les **quantités** de ces BPDE avec des prix, par exemple « béton armé 140 DH/m³ » ou « 100 DH/m³ ». **Ces chiffres sont faux et n'ont pas été retenus.**

Ce qui existe réellement en accès public :
1. **Prix contractuels cités par la Cour des comptes et les Cours régionales (CRC).** Ce sont des prix réels de marchés et de bons de commande. Ils sont surtout anciens (2005-2012) et concernent surtout la voirie et les réseaux divers (VRD).
2. **Guides et observatoires officiels donnant des prix d'ouvrages** :
   - guide ONEP / Banque mondiale de 2005, prix HT ;
   - Observatoire économique de la délégation de l'Habitat de Tétouan, exploité dans *Data in Brief* (2024), ratios 2005-2020 main d'œuvre comprise.
3. **Structure de coût au m² du Ministère de l'Habitat** pour le logement social, connue par voie de presse (2008).
4. **Coûts globaux au m²** :
   - Cour des comptes : ONDA, prisons, MEDZ ;
   - HCP : valeurs déclarées aux permis de construire ;
   - communiqués de projets publics : santé, justice, enseignement.
5. **Estimations administratives globales**, publiées par exemple par l'APDN en 2026 : elles donnent un montant TTC par marché, sans les prix unitaires.

Le portail marchespublics.gov.ma est consultable pour les avis. Mais la recherche par mot-clé n'a pas pu être utilisée par lecture automatique, et les BPDE ne figurent que dans les dossiers d'appel d'offres (DCE), qui ne sont pas remplis. Aucune authentification ni aucun captcha n'a été contourné.

## 2. Prix unitaires retenus par lot

Les médianes ne sont calculées que sur des ouvrages homogènes. Mélanger des données de 2005 et de 2020, ou du rural et de l'urbain, n'aurait pas de sens.

| Lot | Ouvrage | Valeur retenue | Fourchette observée | Base / date | Fiab. |
|---|---|---|---|---|---|
| TERRASSEMENT | Déblai en terrain ordinaire (voirie / tranchées) | **45 DH/m³** (médiane de 40, 42, 48, 69) | 30 – 69 | CRC Casablanca et Skhirate, ONEP, 2005-2010 | B |
| TERRASSEMENT | Remblai sélectionné / remblai | **45 DH/m³** | 40 – 55 | CRC 2008-2010, ONEP 2005 | B |
| TERRASSEMENT | Décapage (12 cm) | 25 DH/m² | – | CUC, marché 46/08 | B |
| GROS_OEUVRE | Gros béton | 350 DH/m³ HT | – | Préfecture de Casablanca, 2010-2011 | B |
| GROS_OEUVRE | Béton de propreté | 800 DH/m³ HT | – | ONEP 2005 (rural) | B |
| GROS_OEUVRE | Béton armé (petits ouvrages) | 1 000 DH/m³ HT | – | ONEP 2005 ; **non représentatif d'un BA de bâtiment de 2026** | B |
| GROS_OEUVRE | Toiture-terrasse : hourdis 12+4 ou 20+4 + forme + enduit sous-face | **~610 DH/m²** | 600 – 625 | Observatoire de Tétouan, 2019-2020 | B |
| GROS_OEUVRE (ratio) | Gros œuvre de logement social, au m² construit | 850 DH/m² TTC | – | Ministère de l'Habitat, 2008 | C |
| MACONNERIE | Mur extérieur en briques creuses + enduits ciment 2 faces | **277 DH/m²** | 238 (2005) – 277 (2020) | Observatoire de Tétouan | B |
| MACONNERIE | Même mur avec isolant EPS 2 à 12 cm | 298 – 391 DH/m² | – | Observatoire de Tétouan, 2020 | B |
| MACONNERIE | Mur de clôture | 180 DH/ml | – | Province de Nouaceur, 2005 | B |
| ETANCHEITE | Étanchéité épaisseur 8 mm | 140 DH/m² | – | Préfecture de Casablanca, marché 52/10 | B |
| ETANCHEITE (ratio) | Étanchéité de logement social, au m² construit | 50 DH/m² TTC | – | Ministère de l'Habitat, 2008 | C |
| REVETEMENTS | Plancher bas complet : dalle BA + chape + carrelage | 512 DH/m² | 479 – 530 | Observatoire de Tétouan, 2005-2020 | B |
| REVETEMENTS (ratio) | Revêtements de logement social, au m² construit | 150 DH/m² TTC (ancienne valeur : 190) | – | Ministère de l'Habitat, 2008 | C |
| MENUISERIE | Fenêtre aluminium simple vitrage posée | **774 DH/m²** | 674 (2018) – 774 (2020) | Observatoire de Tétouan | B |
| MENUISERIE | Fenêtre aluminium double vitrage posée | 827 DH/m² | – | Observatoire de Tétouan, 2020 | B |
| ELECTRICITE + PLOMBERIE (ratio) | Logement social, au m² construit | 185 DH/m² TTC (ancienne valeur : 220) | – | Ministère de l'Habitat, 2008 | C |
| PLOMBERIE | PVC Ø125 posé | 120 DH/ml HT | – | ONEP 2005 | B |
| PEINTURE | Peinture de sous-face d'ouvrage métallique | 120 DH/m² | – | ONDA, 2006 | B |
| PEINTURE (ratio) | Logement social, au m² construit | 30 DH/m² TTC | – | Ministère de l'Habitat, 2008 | C |
| VRD | Revêtement superficiel (bicouche) | **21 DH/m² HT** (référence) ; 41 jugé excessif | 20 – 41 | CRC Skhirate, 2010 | B |
| VRD | Enrobés en couche mince (rues) | 50 DH/m² | – | Oujda, 2011 | B |
| VRD | Béton bitumineux | 389 – 444 DH/t | – | Casablanca, 2005 | B |
| VRD | GNA 0/31,5 mis en œuvre | 215 DH/m³ | – | Casablanca, ~2008 | B |
| VRD | Dallage béton (rues, espaces publics) | **75 DH/m²** (médiane de 60, 75, 90) | 60 – 215 | CRC, 2005-2011 | B/C |
| VRD | Pavés autobloquants | 130 – 210 DH/m² | – | Nouaceur, 2005 | B |
| VRD | Bordures P1 posées | 65 – 90 DH/ml | – | CUC, 2008 | B |
| VRD | Canalisation d'assainissement posée | 480 DH/ml (diamètre non précisé) | – | Nouaceur, ~2009 | C |
| VRD | Regard construit et équipé | 8 000 DH/u (3 000 DH s'il est construit seulement) ; 2 500 DH/u en 2005 | – | Nouaceur | C |
| VRD | Voirie complète de lotissement | 160 DH/m² (déclaré, jugé sous-évalué) | 76 – 211 | Témara, 2005-2010 | C |
| ELECTRICITE / VRD | Point d'éclairage d'ambiance (potelet 3 m câblé) | 2 988 DH/u | 400 – 2 988 | Nouaceur, 2005 (déséquilibre entre marchés) | C |

**Actualisation.** Les prix de 2005-2012 doivent être revalorisés avant tout usage, au minimum par les index BTP officiels publiés chaque mois sur marchespublics.gov.ma et les séries de prix de matériaux MATNUHPV publiées sur data.gov.ma. À titre d'ordre de grandeur : le mur en briques de l'Observatoire a augmenté de +16 % entre 2005 et 2020 ; l'acier a augmenté d'environ +19 % en 2022, selon l'enquête du Ministère de l'Industrie relayée par la presse.

## 3. Coûts globaux au m² par type de projet

| Type | Projet / source | DH/m² | Date | Remarque |
|---|---|---|---|---|
| Enseignement | HCP, région Tanger-Tétouan (valeurs déclarées aux permis) | 2 000 | 2015 | sous-estimé (valeur déclarée) |
| Enseignement / social | Centre pour enfants sourds de Tanger, 2 550 m² couverts | 5 882 | 2023 | hors foncier |
| Enseignement | Lycée d'excellence (cadrage MEN) | 40 MDH de travaux par lycée | 2009-2011 | études = 10 % des travaux ; équipement = 25 % |
| Enseignement | APDN 2026 : lycée qualifiant (8,64 MDH TTC), lycée collégial (7,16 MDH TTC), 8 classes de préscolaire (2,14 MDH TTC) | ~267 000 DH TTC par classe de préscolaire | 2026 | estimations administratives, surfaces non publiées |
| Santé | Hôpital régional de Tarfaya | 8 219 | 2025 | équipement probablement inclus |
| Santé | Centre hospitalier provincial (CHP) d'Ouezzane | 7 817 | 2020 | idem |
| Santé | CHU Souss-Massa (travaux seuls) | 9 538 | 2024 | 17 692 avec équipement, selon le total annoncé |
| Santé | CHP d'Essaouira (280 lits) | 18 542 | 2026 | estimation, équipement inclus |
| Santé | Centres de santé de Rabat Nahda | 11 250 | ~2023 | petit volume, équipement inclus |
| Santé | HCP Tanger-Tétouan (déclaré) | 1 000 | 2015 | très sous-estimé |
| Administratif / justice | Tribunaux de Laâyoune (2 860 m²) | 9 091 | 2022 | enveloppe budgétaire |
| Administratif | HCP Tanger-Tétouan (déclaré) | 1 167 | 2015 | sous-estimé |
| Tertiaire | Parcs offshoring MEDZ | 7 644 – 10 250 | 2017 | Cour des comptes |
| Aéroport | Terminal 2 de Mohammed V | 10 500 TTC | 2007 | 16 264 HT avec infrastructures |
| Pénitentiaire | Prisons de la DGAPR | 27 628 – 46 887 | 2012-2017 | coût global sécurisé |
| Logement social | Structure de coût du Ministère de l'Habitat | 1 550 TTC (ancienne valeur : 1 710) | 2008 | hors foncier, études et frais |
| Moyenne nationale | AMEE (surcoût RTCM de 112 DH = 3,2 %) | ~3 500 | ~2014-2018 | valeur dérivée |
| Toutes catégories | HCP Guelmim-Es Semara (déclaré) | 1 337 | 2012 | valeur dérivée |

**Lecture.**
- Les équipements publics neufs annoncés entre 2020 et 2026 ressortent à **~6 000 à 11 000 DH/m²** couverts, et jusqu'à 18 500 DH/m² pour un hôpital équipé.
- Les montants de presse incluent souvent les études, l'équipement et les VRD.
- Les valeurs du HCP (1 000 à 2 000 DH/m²) sont des coûts **déclarés** au permis. Elles ne doivent servir que comme plancher.

## 4. Méthodes trouvées (sous-détail, coefficients)

- **Décret 2-22-431 (2023)**, dont le texte a été consulté :
  - définition du *sous-détail des prix* : matériaux et fournitures, main d'œuvre, frais de fonctionnement du matériel, frais généraux, taxes et marges ;
  - prix de référence = moyenne entre l'estimation du maître d'ouvrage et la moyenne des offres ;
  - en travaux, une offre est écartée si elle dépasse **+20 %** ou passe sous **−20 %** de l'estimation ;
  - un *prix unitaire principal* qui s'écarte de plus de **±20 %** du prix de l'estimation détaillée doit être justifié par écrit.
  - Conséquence pour CITURBAREA : un BPDE est « défendable » dans le marché public s'il reste dans une bande de ±20 % autour d'une estimation détaillée.
- **Cadrage du MEN** (Cour des comptes, Programme d'urgence) : études = 10 % des travaux ; équipement = 25 % des travaux.
- **Structure de coût du logement social du Ministère de l'Habitat (2008)** :
  - gros œuvre ≈ 55 % du coût de construction (850 sur 1 550 DH TTC) ;
  - revêtements ≈ 10 % ;
  - électricité et plomberie ≈ 12 % ;
  - étanchéité ≈ 3 % ;
  - en dehors de la construction : foncier équipé 270 DH/m², études 120 DH/m², frais divers 250 DH/m², marge d'environ 17 %.
- **Guides privés et base CYPE Maroc** (fiabilité C, cités uniquement pour la méthode) :
  - coefficient de vente K pratiqué de **1,38 à 1,45** (exemple R+2 : K = 1,41) ;
  - temps unitaires observés en 2024-2025 : béton armé en élévation 5,8 à 6,2 h/m³ ; agglos de 20 cm 1,9 à 2,1 h/m² ; enduit intérieur 1,6 à 1,7 h/m² ; ferraillage 0,10 h/kg.
  - La base CYPE Maroc n'applique que 2 % de coûts directs complémentaires et 3 % de coûts indirects. Elle ne compte ni bénéfice ni aléas, et elle intègre des coffrages métalliques. Son poteau en béton armé à 5 012 DH HT/m³ n'est donc pas transposable tel quel.
- **Pratiques à risque relevées par la Cour des comptes** :
  - paiement « par assimilation » d'ouvrages non prévus au bordereau, alors que des prix nouveaux devraient être fixés selon le CCAG-T (article 51 cité dans les rapports) ;
  - BPDE déséquilibrés : même ouvrage à 400 ou à 2 988 DH selon le marché ;
  - absence d'analyse des prix unitaires par les commissions (AREF Laâyoune).

## 5. Limites et contradictions

- **Prix publics et prix privés.** Les prix des marchés publics incluent installation de chantier, frais de bureau de contrôle et laboratoire, cautionnements (3 % définitif, retenue de garantie de 7 à 10 %), délais de paiement et risque de révision. À l'inverse, ils sont tirés vers le bas par le moins-disant, parfois jusqu'à l'offre anormalement basse.
- **Ancienneté.** 49 des 55 prix datent de 2005 à 2012. Seules les données de l'Observatoire de Tétouan (2020) et les estimations APDN (2026) sont récentes.
- **Biais de la Cour des comptes.** Les prix cités le sont parce qu'ils sont anormaux, trop hauts ou trop bas. Ce sont des signaux d'alerte, pas des moyennes.
- **Incohérences internes à certaines sources** :
  - Data in Brief : texte et tableau divergent sur le plancher bas (479 ou 512 DH/m²) et sur l'écart entre simple et double vitrage (5 ou 53 DH/m²) ;
  - Hespress, CHU Souss-Massa : 1,24 Md DH de travaux + 1,7 Md DH d'équipement > 2,3 Md DH annoncés au total ;
  - CRC Skhirate : un déblai exprimé en « DH/m² ».
- **Unités ou TVA parfois non précisées.** Elles sont alors marquées « inconnu » dans le JSON.
- **Lots non couverts** par une source publique vérifiée : béton armé de bâtiment en élévation en DH/m³, enduits seuls, carrelage seul, faux plafond, électricité au point, menuiserie bois.

## 6. Recommandations pour un sous-détail de prix CITURBAREA

1. **Construire les prix par sous-détail** et non par compilation de BPDE. Le sous-détail suit le format du décret : matériaux, main d'œuvre, matériel, frais de chantier, frais généraux, aléas, bénéfice, puis TVA de 20 %. Les sources à mobiliser :
   - matériaux : séries régionales MATNUHPV (data.gov.ma) ou les autres fichiers « matériaux » de `docs/prix/recherche` ;
   - main d'œuvre : temps unitaires observés, à confronter aux salaires du fichier main d'œuvre ;
   - coefficient K : partir de **1,40 en privé** et de **1,45 à 1,55 en public**. La bande publique tient compte de l'installation de chantier, des essais et des cautions ; c'est une recommandation, à calibrer.
2. **Contrôler chaque prix composé par trois sources**, avec ces ancres :
   - mur briques + enduits à environ 280 DH/m² (2020) ;
   - toiture hourdis à environ 610 DH/m² ;
   - plancher bas carrelé à environ 510 DH/m² ;
   - fenêtre aluminium à environ 775 DH/m² ;
   - à revaloriser de 2020 à 2026 par l'index BAT officiel.
3. **Calibrer au m² global** :
   - logement social : ventilation par lot du Ministère de l'Habitat (gros œuvre ≈ 55 %) ;
   - équipements publics : bande de 6 000 à 11 000 DH/m² couverts, tous corps d'état, hors équipement mobilier ;
   - toujours séparer études (environ 10 % des travaux), équipement et VRD.
4. **Appliquer la règle des ±20 % du décret** comme garde-fou : afficher un avertissement si un prix unitaire principal CITURBAREA s'écarte de plus de 20 % de la médiane de référence.
5. **Collecter des BPDE remplis réels.** C'est la seule voie pour une fiabilité A :
   - demander les estimations détaillées aux maîtres d'ouvrage partenaires (communes, APDN, ANEP), sur la base de la loi 31-13 d'accès à l'information ;
   - récupérer les BPDE des marchés attribués auprès des entreprises partenaires (offres retenues) ;
   - suivre les publications d'estimations APDN et ANEP en y associant la surface couverte prévue au CPS.
6. **Ne jamais utiliser les « prix » extraits automatiquement des PDF de DCE**, comme les 100 ou 140 DH/m³ de béton armé : ce sont des quantités.

## Sources principales (toutes consultées)

- Cour des comptes, rapports annuels 2008 (T1), 2012 (Vol. II l.1), 2013 (Vol. II l.1 et l.2), 2016-2017, 2018 (partie 1, établissements pénitentiaires) et évaluation du Programme d'urgence (2018) : courdescomptes.ma, URL exactes dans le JSON.
- ONEP / Banque mondiale, *Guide pour l'assainissement liquide des douars marocains* (2005) : bdd.pseau.org.
- Ettoumi et al., *Data in Brief* 52 (2024) 110048, et données Mendeley 10.17632/894wyrck2j.1.
- Décret 2-22-431 (BO 7184), via ofppt.ma.
- La Vie éco (référentiel des prix de l'Équipement, 2018) ; Bladi.net / La Vie éco (logement à 140 000 DH, 2008).
- HCP via CEIC (table MA.P003) ; HCP Direction régionale de Guelmim (statistiques de construction 2012).
- APDN, liste des appels d'offres (octobre 2026).
- Presse : Yabiladi, Le Brief, Hespress FR, Medicalis.
