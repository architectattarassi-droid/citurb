# Livrables par lot et par phase

**CITURBAREA — complément du référentiel des phases (`referentiel-phases.md`), version du 15/10/2026.**

Pour chaque lot et chaque phase d'études : les pièces à produire, leur échelle, leur contenu minimal, ce qui n'y figure pas encore, qui les produit et qui les valide, et la précision de l'estimation à ce stade. Les codes `LV_…` sont ceux de `livrables[]` dans `referentiel-phases.json`.

**Phases :** ESQ = Esquisse (estimation ± 25 à 30 %) ; APS = Avant-projet sommaire (estimation ± 15 à 20 %) ; APD = Avant-projet détaillé (estimation ± 10 %) ; AUT = Dossier d'autorisation (Rokhas) (estimation ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique)) ; PRO/DCE = Projet et dossier de consultation (PRO/DCE) (estimation ± 5 % (DQE confidentiel)) ; EXE = Exécution et plans d'atelier (EXE, PAC/PEO) (estimation ± 3 à 5 % puis prix du marché) ; VISA = Visa des documents d'exécution et d'atelier (estimation prix du marché + avenants) ; DOE = Dossier des ouvrages exécutés et plans de récolement (estimation coût réel (décompte)).

**Règles communes**
- En pratique marocaine, le BET livre souvent ses plans d'exécution de structure **avant** la consultation : les entreprises chiffrent alors sur l'EXE et non sur un PRO. Le référentiel accepte les deux ordres.
- Les **plans d'atelier** (PAC/PEO) sont dessinés par l'entreprise après la signature du marché et **visés** avant fabrication.
- Le **bureau de contrôle** est obligatoire au-delà de 5 MDH de budget (décision du fondateur). En dessous, les validations « bureau de contrôle » conditionnelles reviennent à l'architecte et au BET.
- Aucune pièce échangée ne porte les coordonnées d'un tiers (règle « tout passe par CITURBAREA ») ; toute la facturation passe par CITURBAREA / HSE DECO.

## Sommaire comparatif

| Phase | Ce qui est figé | Ce qui n'existe pas encore | Précision |
|---|---|---|---|
| Esquisse | Implantation, organisation générale, volumétrie | Cotes, structure, réseaux, matériaux | ± 25 à 30 % |
| Avant-projet sommaire | Distribution, surfaces, nombre de niveaux, principe structurel | Cotes de détail, dimensions des réseaux, détails | ± 15 à 20 % |
| Avant-projet détaillé | Cotes, niveaux, trame et système porteur, matériaux par lot, performances thermiques et sécurité, gaines techniques | Armatures, réservations exactes, plans d'atelier, calepinages | ± 10 % |
| Dossier d'autorisation (Rokhas) | Ce qui est autorisé : implantation, hauteur, surfaces, façades, affectations (plans « ne varietur ») | Rien de technique : la commune ne contrôle ni la structure ni les réseaux intérieurs | ± 10 % |
| Projet et dossier de consultation (PRO/DCE) | Quantités, prescriptions techniques (CCTP), clauses administratives (CPS), cadre de prix | Méthodes et plans d'atelier des entreprises | ± 5 % |
| Exécution et plans d'atelier (EXE, PAC/PEO) | Ferraillage, réservations synthétisées, diamètres, calibres, plans d'atelier | — (seules les modifications de chantier viendront) | ± 3 à 5 % puis prix du marché |
| Visa des documents d'exécution et d'atelier | Accord avant fabrication | — | prix du marché + avenants |
| Dossier des ouvrages exécutés et plans de récolement | Mémoire du bâtiment : plans conformes, notices, garanties, PV | — | coût réel |

## Architecture

*الهندسة المعمارية*

### Architecture — Esquisse

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Esquisses : plans de principe et volumétrie `LV_ESQ_ARCHI_PLANS` | 1/200 (plan de masse 1/500) | implantation sur le levé avec reculs réglementaires ; organisation des pièces et circulations ; surfaces approchées par niveau ; volumétrie ou 3D ; 1 à 3 variantes | cotes ; épaisseurs de murs ; trame structurelle ; réseaux ; matériaux | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 25 à 30 %.

### Architecture — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans APS de tous les niveaux, coupe et façades `LV_APS_ARCHI_PLANS` | 1/100 (plan de masse 1/200) | plans de chaque niveau avec surfaces par pièce ; une coupe significative avec hauteurs d'étage ; façades principales ; tableau des surfaces par niveau et par usage ; emplacement des escaliers, gaines et pièces humides ; principe de trame de poteaux | cotes de détail ; épaisseurs définitives ; menuiseries dimensionnées ; réservations | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| Notice descriptive sommaire `LV_APS_ARCHI_NOTICE` | — | parti architectural ; standing visé par lot ; système constructif envisagé | marques et références | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 15 à 20 %.

### Architecture — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans APD cotés `LV_APD_ARCHI_PLANS` | 1/100, pièces principales à 1/50 | cotes intérieures et extérieures ; niveaux finis par rapport au ±0,00 et au terrain naturel ; épaisseurs de murs et cloisons ; trame de poteaux arrêtée avec le BET ; escaliers dimensionnés (marches, échappée) ; gaines techniques réservées ; façades avec matériaux et ouvertures ; coupes avec hauteurs sous plafond ; plan de terrasse avec pentes et évacuations ; tableau des surfaces conforme au règlement | réservations précises ; armatures ; détails 1/20 ; plans d'atelier ; calepinages | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| Descriptif par lot (gamme des matériaux) `LV_APD_ARCHI_NOTICE` | — | pour chaque lot : nature des ouvrages, gamme ou performance attendue, équipements | quantités ; prix unitaires | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 10 %.

### Architecture — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans réglementaires du dossier Rokhas `LV_AUT_ARCHI_PLANS` | situation 1/2000 à 1/5000; masse 1/500 ou 1/200; niveaux, coupes, façades 1/100 (échelles selon la commune, à vérifier) | plan de situation ; plan de masse avec limites, reculs, accès, emprise, hauteurs, raccordements ; plans de tous les niveaux avec affectation des locaux ; façades et coupes avec hauteur réglementaire et cotes de niveau ; tableau des surfaces (emprise, surface de plancher, COS/CUS si applicable) ; signature électronique de l'architecte | aménagements intérieurs détaillés ; structure (sauf pièce complémentaire) ; détails techniques | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | oui |
| Pièces administratives jointes `LV_AUT_ARCHI_FICHE` | — | demande signée du propriétaire ; certificat de propriété ; copie du contrat d'architecte ; fiche de renseignements ; visa du conseil régional de l'Ordre compétent pour la commune (décision du fondateur) | — | Architecte (maître d'œuvre) | Agence urbaine | oui |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Architecture — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans PRO de tous les niveaux `LV_PRO_DCE_ARCHI_PLANS` | 1/50 | cotation complète ; cloisons et doublages ; revêtements par pièce ; faux plafonds et hauteurs ; repérage des menuiseries ; positions des équipements sanitaires et électriques coordonnées avec les BET | plans d'atelier ; synthèse définitive des réservations | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| Carnet de détails de principe `LV_PRO_DCE_ARCHI_CARNET_DETAILS` | 1/20 | acrotères et relevés ; seuils ; appuis de baies ; escaliers ; garde-corps | détails de fabrication | Architecte (maître d'œuvre) | Bureau de contrôle technique | si condition (bureau de contrôle mandaté (obligatoire au-delà de 5 MDH)) |
| CCTP des lots architecturaux (maçonnerie, cloisons, finitions) `LV_PRO_DCE_ARCHI_CCTP` | — | nature et qualité des matériaux ; normes ; mise en œuvre ; tolérances ; essais et points d'arrêt ; échantillons à soumettre | prix | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| BPU et DQE des lots architecturaux `LV_PRO_DCE_ARCHI_DQE_BPU` | — | postes numérotés alignés sur le CPS ; unités ; quantités du métré ; estimation confidentielle | prix des entreprises | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Architecture — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution architecture et plans de synthèse `LV_EXE_ARCHI_PLANS` | 1/50 | toutes cotes d'implantation et de niveaux ; réservations coordonnées avec structure et fluides (synthèse) ; repérage des détails | — | Architecte (maître d'œuvre) | Bureau de contrôle technique | si condition (synthèse obligatoire au-delà de R+2 ou d'un budget de 5 MDH, recommandée ailleurs) |
| Carnet de détails d'exécution `LV_EXE_ARCHI_CARNET_DETAILS` | 1/20 à 1/5 | acrotères ; seuils et rejingots ; joints de dilatation ; appuis et bavettes ; escaliers et garde-corps ; pièces humides | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| Calepinages `LV_EXE_ARCHI_PLANS_2` | 1/20 | sols et faïences ; façades (joints, modénatures) | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Architecture — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des plans d'atelier et des fiches produits des entreprises `LV_VISA_ARCHI_VISA` | — | avis : vu sans observation, vu avec observations, refusé ; conformité au DCE et au permis ; échantillons validés | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Architecture — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de récolement architecture `LV_DOE_ARCHI_RECOLEMENT` | 1/50 | état réellement construit ; surfaces finales ; références des finitions posées (via la plateforme) | — | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Structure béton armé

*هيكل الخرسانة المسلحة*

### Structure béton armé — Esquisse

Pas de livrable propre : avis oral du BET sur les portées et la faisabilité d'un sous-sol.

### Structure béton armé — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Note de principe structurel `LV_APS_STRUCTURE_BA_NOTICE` | — | système porteur (portiques, voiles) ; trame ; type de plancher (corps creux 16+4 ou 20+5, dalle pleine) ; joints ; zone sismique et classe du bâtiment (RPS) | calculs ; sections | Bureau d'études structure | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Structure béton armé — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Note de prédimensionnement `LV_APD_STRUCTURE_BA_NOTE_CALCUL` | — | hypothèses de charges ; classe de site d'après le rapport de sol ; sections approchées des poteaux et poutres ; épaisseurs des dalles ; type de fondation retenu | ferraillage ; vérifications détaillées | Bureau d'études structure | Architecte (maître d'œuvre) | oui |
| Plans de principe de la structure `LV_APD_STRUCTURE_BA_PLANS` | 1/100 | trame cotée ; voiles de contreventement ; poteaux et poutres principaux ; trémies majeures | armatures ; réservations fines | Bureau d'études structure | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 10 %.

### Structure béton armé — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de structure (pièce complémentaire) `LV_AUT_STRUCTURE_BA_PLANS` | 1/100 | plans de coffrage simplifiés et note signés par l'ingénieur | ferraillage complet | Bureau d'études structure | Commune (guichet unique, président du conseil communal) | si condition (pièce complémentaire avant délivrance selon l'arrêté 337-20 et la commune (à vérifier)) |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Structure béton armé — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de coffrage pour consultation `LV_PRO_DCE_STRUCTURE_BA_PLANS` | 1/50 | dimensions de tous les éléments ; niveaux ; trémies | armatures détaillées (souvent déjà disponibles au Maroc, où le BET livre l'EXE avant la consultation) | Bureau d'études structure | Architecte (maître d'œuvre) | oui |
| CCTP gros œuvre béton armé `LV_PRO_DCE_STRUCTURE_BA_CCTP` | — | classes de béton et d'exposition (NM 10.1.008) ; aciers (normes NM) ; enrobages ; tolérances ; essais et prélèvements ; points d'arrêt avant coulage | — | Bureau d'études structure | Architecte (maître d'œuvre) | oui |
| Quantités de gros œuvre `LV_PRO_DCE_STRUCTURE_BA_DQE_BPU` | — | volumes de béton par élément et par niveau ; ratios d'acier (kg/m³) ou tonnage ; coffrages (m²) | — | Bureau d'études structure | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Structure béton armé — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Note de calcul complète `LV_EXE_STRUCTURE_BA_NOTE_CALCUL` | — | descente de charges ; modèle et vérification sismique RPS 2000 version 2011 ; fondations ; poteaux, poutres, dalles, voiles, escaliers | — | Bureau d'études structure | Bureau de contrôle technique | si condition (visa du bureau de contrôle si budget > 5 MDH (décision du fondateur), sinon validée par l'architecte) |
| Plans de coffrage par niveau `LV_EXE_STRUCTURE_BA_PLANS` | 1/50 | cotes et niveaux de chaque élément ; réservations structurelles et trémies issues de la synthèse ; repérage des coupes | — | Bureau d'études structure | Architecte (maître d'œuvre) | oui |
| Plans de ferraillage `LV_EXE_STRUCTURE_BA_PLANS_2` | 1/50 et 1/20 | sections et diamètres d'armatures ; espacements ; longueurs de recouvrement ; cadres resserrés en zones critiques ; enrobages ; attentes | — | Bureau d'études structure | Bureau de contrôle technique | oui |
| Nomenclature des aciers `LV_EXE_STRUCTURE_BA_NOMENCLATURE` | — | repère, diamètre, forme, longueur, nombre, poids par élément | — | Bureau d'études structure | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Structure béton armé — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Avis du bureau de contrôle sur notes et plans ; visa du BET sur les plans de préfabrication (poutrelles, prédalles) `LV_VISA_STRUCTURE_BA_VISA` | — | avis favorable ou réserves à lever avant exécution | — | Bureau de contrôle technique | Architecte (maître d'œuvre) | si condition (bureau de contrôle mandaté (au-delà de 5 MDH)) |

Précision de l'estimation : prix du marché + avenants.

### Structure béton armé — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de récolement de la structure et synthèse des essais `LV_DOE_STRUCTURE_BA_RECOLEMENT` | 1/50 | modifications d'exécution ; résistances obtenues ; charges d'exploitation admissibles (utile pour une future surélévation) | — | Bureau d'études structure | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Terrassement, fondations, soutènements, sous-sol

*الحفر والأساسات والجدران الاستنادية والطابق تحت الأرضي*

### Terrassement, fondations, soutènements, sous-sol — Esquisse

Pas de livrable : hypothèse de sous-sol et contraintes tirées du levé topographique.

### Terrassement, fondations, soutènements, sous-sol — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Rapport géotechnique de conception `LV_APS_INFRA_RAPPORT` | — | sondages ; niveau de nappe ; contrainte admissible ; tassements ; classe de site ; agressivité du sol ; recommandations de fondation et de soutènement | dimensionnement | Géotechnicien (laboratoire de sol) | Bureau d'études structure | si condition (indispensable avec sous-sol, immeuble ou équipement) |

Précision de l'estimation : ± 15 à 20 %.

### Terrassement, fondations, soutènements, sous-sol — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan du sous-sol et principe des fondations `LV_APD_INFRA_PLANS` | 1/100 | niveaux ; rampe (pente à vérifier selon le règlement local) ; principe de soutènement (voile contre terre, paroi berlinoise en mitoyenneté) ; niveau d'assise ; principe de drainage et d'étanchéité | dimensionnement | Bureau d'études structure | Architecte (maître d'œuvre) | si condition (sous-sol ou sol difficile) |

Précision de l'estimation : ± 10 %.

### Terrassement, fondations, soutènements, sous-sol — Dossier d'autorisation (Rokhas)

Pas de pièce propre : la profondeur du sous-sol figure sur les coupes architecturales.

### Terrassement, fondations, soutènements, sous-sol — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan de terrassement `LV_PRO_DCE_INFRA_PLANS` | 1/100 | emprises ; profondeurs ; volumes de déblais et remblais ; évacuation ; phasage | méthode de l'entreprise | Bureau d'études structure | Architecte (maître d'œuvre) | oui |
| CCTP terrassement et fondations `LV_PRO_DCE_INFRA_CCTP` | — | réception des fonds de fouille par le géotechnicien ; blindage ; épuisement des eaux ; compactage et essais | — | Bureau d'études structure | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Terrassement, fondations, soutènements, sous-sol — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de fondations et de soutènement `LV_EXE_INFRA_PLANS` | 1/50 | semelles ou radier ; longrines ; niveaux d'assise ; attentes ; voiles contre terre ; drainage ; joints | — | Bureau d'études structure | Bureau de contrôle technique | oui |
| Note de calcul des soutènements `LV_EXE_INFRA_NOTE_CALCUL` | — | poussée des terres ; surcharges des voisins ; nappe ; phases provisoires | — | Bureau d'études structure | Bureau de contrôle technique | si condition (sous-sol) |
| Méthodologie de terrassement et de blindage de l'entreprise `LV_EXE_INFRA_PLANS_ATELIER` | 1/100 | phasage ; blindages provisoires ; protections des mitoyens ; pompage | — | Entreprise de gros œuvre ou générale | Bureau d'études structure | si condition (sous-sol ou mitoyenneté) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Terrassement, fondations, soutènements, sous-sol — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa de la méthodologie par le BET et le géotechnicien `LV_VISA_INFRA_VISA` | — | accord sur le phasage et les protections ; conditions d'arrêt | — | Bureau d'études structure | Architecte (maître d'œuvre) | si condition (sous-sol) |

Précision de l'estimation : prix du marché + avenants.

### Terrassement, fondations, soutènements, sous-sol — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Récolement des fondations `LV_DOE_INFRA_RECOLEMENT` | 1/50 | niveaux d'assise réels ; PV de fonds de fouille ; essais de compactage | — | Entreprise de gros œuvre ou générale | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Voirie et réseaux divers

*الطرق والشبكات المختلفة*

### Voirie et réseaux divers — Esquisse

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Principe des accès et des raccordements `LV_ESQ_VRD_PLANS` | 1/500 | accès véhicules et piétons ; points de raccordement supposés | réseaux | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | facultatif |

Précision de l'estimation : ± 25 à 30 %.

### Voirie et réseaux divers — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Schéma de principe des réseaux `LV_APS_VRD_PLANS` | 1/200 | points de raccordement publics ; assainissement autonome si pas de réseau ; voirie interne | diamètres ; profils | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Voirie et réseaux divers — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans VRD d'avant-projet `LV_APD_VRD_PLANS` | 1/200 (1/500 en lotissement) | réseaux eaux usées, eaux pluviales, eau potable, électricité, télécom ; profils en long de principe en lotissement ; note de dimensionnement des débits ; consultation des distributeurs | détails de regards ; cotes fil d'eau définitives | Bureau d'études VRD | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | si condition (lotissement ou équipement ; pour une villa, intégré aux plans de l'architecte) |

Précision de l'estimation : ± 10 %.

### Voirie et réseaux divers — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan de masse avec raccordements ; en lotissement, dossier VRD complet `LV_AUT_VRD_PLANS` | 1/500 | raccordements ; en lotissement : voirie, assainissement, eau, électricité, éclairage, télécom et avis des distributeurs | — | Bureau d'études VRD | Agence urbaine | oui |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Voirie et réseaux divers — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans, profils en long et en travers `LV_PRO_DCE_VRD_PLANS` | 1/200 à 1/500; profils 1/100 à 1/1000 | tracés ; diamètres ; pentes ; regards ; structure de chaussée | — | Bureau d'études VRD | Architecte (maître d'œuvre) | oui |
| CCTP et DQE VRD `LV_PRO_DCE_VRD_CCTP` | — | matériaux ; essais (pression, inspection caméra, compactage) ; mètres linéaires, regards, m² de chaussée | — | Bureau d'études VRD | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Voirie et réseaux divers — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution VRD approuvés par les distributeurs `LV_EXE_VRD_PLANS` | 1/200; regards 1/20 | profils en long cotés (fil d'eau, pentes, DN) ; regards ; branchements ; postes | — | Bureau d'études VRD | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | oui |
| Plans de postes et ouvrages du distributeur `LV_EXE_VRD_PLANS_ATELIER` | selon le distributeur | poste de transformation ; comptages | — | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | Bureau d'études VRD | si condition (lotissement, immeuble, équipement) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Voirie et réseaux divers — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des distributeurs (eau, électricité, assainissement) `LV_VISA_VRD_VISA` | — | approbation des plans d'exécution avant travaux | — | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | Architecte (maître d'œuvre) | si condition (lotissement ou réseau public créé) |

Précision de l'estimation : prix du marché + avenants.

### Voirie et réseaux divers — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de récolement des réseaux géoréférencés `LV_DOE_VRD_RECOLEMENT` | 1/200 à 1/500 | cotes fil d'eau réelles ; regards ; profondeurs ; PV d'essais (exigés pour la réception d'un lotissement) | — | Ingénieur géomètre-topographe | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | oui |

Précision de l'estimation : coût réel (décompte).

## Plomberie sanitaire et assainissement

*السباكة الصحية والتطهير*

### Plomberie sanitaire et assainissement — Esquisse

Pas de livrable : regrouper et superposer les pièces humides.

### Plomberie sanitaire et assainissement — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Principe de plomberie `LV_APS_PLOMBERIE_NOTICE` | — | superposition des pièces humides ; gaines ; mode de production d'eau chaude (gaz, électrique, solaire) | diamètres | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Plomberie sanitaire et assainissement — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Implantation des appareils et principe des descentes `LV_APD_PLOMBERIE_PLANS` | 1/100 | appareils sanitaires ; gaines ; descentes eaux usées, vannes et pluviales ; besoins en eau ; production d'eau chaude | diamètres ; pentes ; tracés | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 10 %.

### Plomberie sanitaire et assainissement — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Assainissement autonome `LV_AUT_PLOMBERIE_PLANS` | 1/200 | fosse et épandage hors zone desservie | — | Bureau d'études fluides | Commune (guichet unique, président du conseil communal) | si condition (pas de réseau public (à vérifier selon la commune)) |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Plomberie sanitaire et assainissement — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans des réseaux principaux `LV_PRO_DCE_PLOMBERIE_PLANS` | 1/50 | tracés ; diamètres de principe ; nourrices ; points d'eau | plans d'atelier | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| Nomenclature des appareils sanitaires `LV_PRO_DCE_PLOMBERIE_NOMENCLATURE` | — | type et gamme par pièce | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| CCTP et DQE plomberie `LV_PRO_DCE_PLOMBERIE_CCTP` | — | matériaux (PPR, multicouche, PVC) ; essais de pression et d'écoulement ; appareils | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Plomberie sanitaire et assainissement — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution plomberie `LV_EXE_PLOMBERIE_PLANS` | 1/50; salles d'eau 1/20 | diamètres d'alimentation ; diamètres d'évacuation (DN) ; pentes (1 à 2 % minimum, à vérifier selon le CCTP) ; réservations reportées en synthèse | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| Schémas isométriques des colonnes `LV_EXE_PLOMBERIE_SCHEMA_UNIFILAIRE` | — | colonnes ; vannes ; clapets ; ventilations primaires | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| Note de dimensionnement `LV_EXE_PLOMBERIE_NOTE_CALCUL` | — | débits ; pressions ; surpresseur ou bâche si nécessaire | — | Bureau d'études fluides | Bureau de contrôle technique | si condition (immeuble ou équipement) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Plomberie sanitaire et assainissement — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des fiches techniques et des plans de l'entreprise `LV_VISA_PLOMBERIE_VISA` | — | conformité des matériaux et des appareils | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Plomberie sanitaire et assainissement — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Récolement plomberie `LV_DOE_PLOMBERIE_RECOLEMENT` | 1/50 | tracés réels ; photos des réseaux avant fermeture ; notices et garanties ; PV d'essais | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Électricité courants forts

*الكهرباء — التيار القوي*

### Électricité courants forts — Esquisse

Pas de livrable.

### Électricité courants forts — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Puissance estimée et local technique `LV_APS_ELEC_CFO_NOTICE` | — | puissance prévisionnelle ; emplacement du comptage et du tableau général | — | Bureau d'études fluides | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Électricité courants forts — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Implantation des points électriques `LV_APD_ELEC_CFO_PLANS` | 1/100 | prises ; éclairage ; commandes ; tableaux | sections de câbles ; calibres | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| Bilan de puissance prévisionnel `LV_APD_ELEC_CFO_NOTE_CALCUL` | — | puissances par usage ; foisonnement ; puissance à demander | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 10 %.

### Électricité courants forts — Dossier d'autorisation (Rokhas)

Pas de pièce propre pour une villa ; principe de colonne montante dans les pièces complémentaires d'un immeuble (à vérifier).

### Électricité courants forts — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Schéma unifilaire de principe `LV_PRO_DCE_ELEC_CFO_SCHEMA_UNIFILAIRE` | — | tableaux ; départs ; protections de principe | calibres définitifs | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| CCTP, DQE et nomenclature d'appareillage `LV_PRO_DCE_ELEC_CFO_CCTP` | — | normes ; marquage CMIM ; gammes ; quantités | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Électricité courants forts — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution courants forts `LV_EXE_ELEC_CFO_PLANS` | 1/50 | circuits repérés ; cheminements ; réservations | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |
| Schémas unifilaires des tableaux `LV_EXE_ELEC_CFO_SCHEMA_UNIFILAIRE` | — | calibres ; sections ; différentiels 30 mA ; sélectivité | — | Bureau d'études fluides | Bureau de contrôle technique | si condition (bureau de contrôle mandaté) |
| Note de calcul (chutes de tension, courts-circuits) `LV_EXE_ELEC_CFO_NOTE_CALCUL` | — | chutes de tension ; pouvoir de coupure ; colonne montante | — | Bureau d'études fluides | Bureau de contrôle technique | si condition (immeuble ou équipement) |
| Plan de mise à la terre `LV_EXE_ELEC_CFO_PLANS_2` | 1/100 | boucle en fond de fouille ; liaisons équipotentielles | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Électricité courants forts — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Validation du branchement par le distributeur et visa des schémas de l'entreprise `LV_VISA_ELEC_CFO_VISA` | — | demande de puissance acceptée ; appareillage conforme | — | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : prix du marché + avenants.

### Électricité courants forts — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Schémas et plans conformes à l'exécution `LV_DOE_ELEC_CFO_RECOLEMENT` | 1/50 | schémas unifilaires mis à jour ; PV de terre et de différentiels ; attestation de conformité | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Courants faibles et VDI

*التيار الضعيف والصوت والمعطيات والصورة*

### Courants faibles et VDI — Esquisse

Pas de livrable.

### Courants faibles et VDI — Avant-projet sommaire

Pas de livrable : niveau d'équipement souhaité noté dans la notice.

### Courants faibles et VDI — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Implantation des prises de communication, TV, interphone, alarme `LV_APD_ELEC_CFA_PLANS` | 1/100 | points ; local ou baie | câblage | Bureau d'études fluides | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : ± 10 %.

### Courants faibles et VDI — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Dossier télécom (pré-câblage) `LV_AUT_ELEC_CFA_FICHE` | — | colonne télécom ; locaux ; adduction | — | Bureau d'études fluides | Commune (guichet unique, président du conseil communal) | si condition (immeuble ou équipement (pièce complémentaire)) |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Courants faibles et VDI — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Synoptique VDI et sûreté `LV_PRO_DCE_ELEC_CFA_SYNOPTIQUE` | — | baie ; câblage catégorie 6 ou fibre ; vidéosurveillance ; contrôle d'accès | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Courants faibles et VDI — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution courants faibles `LV_EXE_ELEC_CFA_PLANS` | 1/50 | cheminements ; prises repérées ; baie ; domotique | — | Bureau d'études fluides | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Courants faibles et VDI — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des fiches produits `LV_VISA_ELEC_CFA_VISA` | — | compatibilité ; marquage | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Courants faibles et VDI — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Synoptiques conformes et cahier de recette `LV_DOE_ELEC_CFA_RECOLEMENT` | — | repérage des prises ; tests des liaisons | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Climatisation, chauffage, ventilation

*التكييف والتدفئة والتهوية*

### Climatisation, chauffage, ventilation — Esquisse

Pas de livrable.

### Climatisation, chauffage, ventilation — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Principe de climatisation et de ventilation `LV_APS_CVC_NOTICE` | — | système (split, gainable, multisplit, VRV) ; emplacement des unités extérieures | puissances | Bureau d'études fluides | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Climatisation, chauffage, ventilation — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de principe CVC `LV_APD_CVC_PLANS` | 1/100 | unités ; gaines principales ; ventilation des pièces humides ; bilan thermique sommaire | dimensionnement des réseaux | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (climatisation prévue) |

Précision de l'estimation : ± 10 %.

### Climatisation, chauffage, ventilation — Dossier d'autorisation (Rokhas)

Pas de pièce propre (certaines communes encadrent les unités en façade, à vérifier).

### Climatisation, chauffage, ventilation — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Bilan thermique, CCTP et DQE CVC `LV_PRO_DCE_CVC_CCTP` | — | puissances par local ; matériel ; quantités | — | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (climatisation prévue) |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Climatisation, chauffage, ventilation — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'exécution CVC `LV_EXE_CVC_PLANS` | 1/50 | liaisons frigorifiques ; condensats ; gaines dimensionnées ; réservations | — | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (climatisation prévue) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Climatisation, chauffage, ventilation — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des plans d'atelier et du matériel `LV_VISA_CVC_VISA` | — | conformité aux puissances | — | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (climatisation prévue) |

Précision de l'estimation : prix du marché + avenants.

### Climatisation, chauffage, ventilation — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Récolement CVC `LV_DOE_CVC_RECOLEMENT` | 1/50 | PV de mise en service ; notices ; entretien | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | si condition (climatisation prévue) |

Précision de l'estimation : coût réel (décompte).

## Sécurité incendie

*السلامة من الحرائق*

### Sécurité incendie — Esquisse

Pas de livrable (villa : sans objet sauf cas particulier).

### Sécurité incendie — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Classement et principes de sécurité `LV_APS_SSI_NOTICE` | — | classement du bâtiment (habitation, ERP et catégorie, IGH) ; dégagements ; accès des secours | — | Architecte (maître d'œuvre) | Bureau de contrôle technique | si condition (immeuble, ERP, équipement) |

Précision de l'estimation : ± 15 à 20 %.

### Sécurité incendie — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Notice de sécurité incendie et plans de sécurité `LV_APD_SSI_NOTICE` | 1/100 | classement ; isolement ; dégagements et largeurs ; désenfumage ; moyens de secours | implantation des équipements | Architecte (maître d'œuvre) | Bureau de contrôle technique | oui |

Précision de l'estimation : ± 10 %.

### Sécurité incendie — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Notice de sécurité incendie du dossier `LV_AUT_SSI_NOTICE` | — | visée par un bureau de contrôle au-delà des seuils de l'arrêté 1032-21 ; sinon mention de l'architecte ; attestation ou avis de la protection civile selon le cas (à vérifier) | — | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | oui |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Sécurité incendie — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans SSI pour consultation `LV_PRO_DCE_SSI_PLANS` | 1/50 | détection ; alarme ; désenfumage ; RIA ; extincteurs ; éclairage de sécurité ; CCTP et DQE | — | Bureau d'études fluides | Bureau de contrôle technique | si condition (immeuble, ERP, équipement) |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Sécurité incendie — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Synoptique SSI et plans d'implantation `LV_EXE_SSI_SYNOPTIQUE` | 1/50 | détecteurs ; déclencheurs ; centrale ; note de désenfumage (débits) | — | Bureau d'études fluides | Bureau de contrôle technique | si condition (immeuble, ERP, équipement) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Sécurité incendie — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Avis du bureau de contrôle `LV_VISA_SSI_VISA` | — | conformité au règlement de sécurité | — | Bureau de contrôle technique | Architecte (maître d'œuvre) | si condition (immeuble, ERP, équipement) |

Précision de l'estimation : prix du marché + avenants.

### Sécurité incendie — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Registre de sécurité et plans d'évacuation `LV_DOE_SSI_RECOLEMENT` | — | PV d'essais ; plans d'évacuation affichés ; rapport final du contrôle | — | Entreprise d'un corps d'état | Bureau de contrôle technique | si condition (immeuble, ERP, équipement) |

Précision de l'estimation : coût réel (décompte).

## Ascenseurs

*المصاعد*

### Ascenseurs — Esquisse

Pas de livrable.

### Ascenseurs — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Principe d'ascenseur `LV_APS_ASCENSEUR_NOTICE` | — | nombre ; position de la cage ; charge et vitesse de principe | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | si condition (ascenseur) |

Précision de l'estimation : ± 15 à 20 %.

### Ascenseurs — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Gaine, cuvette et machinerie `LV_APD_ASCENSEUR_PLANS` | 1/50 | dimensions intérieures de gaine ; profondeur de cuvette ; hauteur sous dalle en dernier niveau ; charge ; vitesse ; nombre d'arrêts | plans de l'ascensoriste | Architecte (maître d'œuvre) | Bureau d'études structure | si condition (ascenseur) |

Précision de l'estimation : ± 10 %.

### Ascenseurs — Dossier d'autorisation (Rokhas)

Pas de pièce propre : la gaine figure sur les plans.

### Ascenseurs — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| CCTP et DQE ascenseur `LV_PRO_DCE_ASCENSEUR_CCTP` | — | normes EN 81-20/50 ; accessibilité EN 81-70 ; maintenance | — | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (ascenseur) |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Ascenseurs — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'installation de l'ascensoriste `LV_EXE_ASCENSEUR_PLANS_ATELIER` | 1/20 à 1/50 | réservations ; ancrages ; charges sur dalle et en cuvette ; alimentation électrique | — | Entreprise d'un corps d'état | Bureau d'études structure | si condition (ascenseur) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Ascenseurs — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des plans de l'ascensoriste `LV_VISA_ASCENSEUR_VISA` | — | compatibilité avec la cage en béton | — | Bureau d'études structure | Architecte (maître d'œuvre) | si condition (ascenseur) |

Précision de l'estimation : prix du marché + avenants.

### Ascenseurs — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Contrôle de mise en service et dossier technique `LV_DOE_ASCENSEUR_RAPPORT` | — | PV de l'organisme de contrôle ; contrat d'entretien | — | Bureau de contrôle technique | Architecte (maître d'œuvre) | si condition (ascenseur) |

Précision de l'estimation : coût réel (décompte).

## Menuiseries (alu, bois, métallerie)

*النجارة (ألمنيوم، خشب، حدادة)*

### Menuiseries (alu, bois, métallerie) — Esquisse

Pas de livrable.

### Menuiseries (alu, bois, métallerie) — Avant-projet sommaire

Pas de livrable propre : ouvertures dessinées en façade.

### Menuiseries (alu, bois, métallerie) — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Tableau des menuiseries de principe `LV_APD_MENUISERIES_NOMENCLATURE` | — | dimensions ; matériau ; type d'ouvrant ; vitrage et performances (RTCM) | quincaillerie ; profils | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 10 %.

### Menuiseries (alu, bois, métallerie) — Dossier d'autorisation (Rokhas)

Pas de pièce propre : ouvertures en façade.

### Menuiseries (alu, bois, métallerie) — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Tableau complet des menuiseries `LV_PRO_DCE_MENUISERIES_NOMENCLATURE` | — | repère ; dimensions ; sens d'ouverture ; vitrage ; quincaillerie ; finition | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |
| Détails de pose `LV_PRO_DCE_MENUISERIES_CARNET_DETAILS` | 1/20 | appuis ; tapées ; étanchéité ; garde-corps | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Menuiseries (alu, bois, métallerie) — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans d'atelier du fabricant `LV_EXE_MENUISERIES_PLANS_ATELIER` | 1/10 à 1/5 | profils ; coupes ; fixations ; pièces d'appui ; joints ; cotes prises sur site | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Menuiseries (alu, bois, métallerie) — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des plans d'atelier et des échantillons `LV_VISA_MENUISERIES_VISA` | — | profils et teintes validés avant fabrication | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Menuiseries (alu, bois, métallerie) — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Menuiseries posées `LV_DOE_MENUISERIES_RECOLEMENT` | — | références ; PV d'essai d'arrosage ; garanties ; entretien | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Étanchéité

*العزل المائي*

### Étanchéité — Esquisse

Pas de livrable.

### Étanchéité — Avant-projet sommaire

Pas de livrable propre : type de toiture (accessible ou non).

### Étanchéité — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan de toiture `LV_APD_ETANCHEITE_PLANS` | 1/100 | pentes ; évacuations ; complexe d'étanchéité et isolation de principe | détails | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 10 %.

### Étanchéité — Dossier d'autorisation (Rokhas)

Pas de pièce propre.

### Étanchéité — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan de toiture et détails d'étanchéité `LV_PRO_DCE_ETANCHEITE_CARNET_DETAILS` | 1/50 et 1/10 | relevés ; acrotères ; entrées d'eau ; joints ; complexe ; CCTP et DQE | — | Architecte (maître d'œuvre) | Bureau de contrôle technique | si condition (bureau de contrôle mandaté) |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Étanchéité — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Détails d'exécution et fiches produits `LV_EXE_ETANCHEITE_CARNET_DETAILS` | 1/10 à 1/5 | points singuliers ; parois enterrées ; avis technique du produit | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Étanchéité — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des fiches produits `LV_VISA_ETANCHEITE_VISA` | — | conformité au CCTP | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Étanchéité — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Récolement et garanties `LV_DOE_ETANCHEITE_RECOLEMENT` | — | plan de toiture ; PV de mise en eau ; garanties du fabricant et de l'applicateur | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Revêtements et finitions

*التكسيات والتشطيبات*

### Revêtements et finitions — Esquisse

Pas de livrable.

### Revêtements et finitions — Avant-projet sommaire

Pas de livrable propre : standing par pièce dans la notice.

### Revêtements et finitions — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Descriptif des finitions par pièce `LV_APD_FINITIONS_NOTICE` | — | sols ; murs ; plafonds ; peintures | références | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 10 %.

### Revêtements et finitions — Dossier d'autorisation (Rokhas)

Pas de pièce propre.

### Revêtements et finitions — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans de revêtements et tableau des finitions `LV_PRO_DCE_FINITIONS_PLANS` | 1/50 | nature par pièce ; surfaces ; CCTP et DQE en m² | calepinage | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Revêtements et finitions — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Calepinages et plans de faux plafonds `LV_EXE_FINITIONS_PLANS` | 1/20 et 1/50 | départs de pose ; joints ; trappes ; luminaires ; niveaux | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Revêtements et finitions — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des échantillons `LV_VISA_FINITIONS_VISA` | — | références choisies par le client | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Revêtements et finitions — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Références posées et stock de réserve `LV_DOE_FINITIONS_RECOLEMENT` | — | produits ; fournisseurs (via la plateforme) ; quantités de réserve ; notices | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | oui |

Précision de l'estimation : coût réel (décompte).

## Aménagements extérieurs et piscine

*التهيئة الخارجية والمسبح*

### Aménagements extérieurs et piscine — Esquisse

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Principe des extérieurs `LV_ESQ_EXTERIEURS_PISCINE_PLANS` | 1/200 | implantation de la piscine ; jardin ; stationnement | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | facultatif |

Précision de l'estimation : ± 25 à 30 %.

### Aménagements extérieurs et piscine — Avant-projet sommaire

Pas de livrable propre : plan de masse aménagé.

### Aménagements extérieurs et piscine — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Aménagements et piscine `LV_APD_EXTERIEURS_PISCINE_PLANS` | 1/100 | dimensions du bassin ; local technique ; clôture ; plantations | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | si condition (extérieurs ou piscine) |

Précision de l'estimation : ± 10 %.

### Aménagements extérieurs et piscine — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plan de masse avec piscine et clôture `LV_AUT_EXTERIEURS_PISCINE_PLANS` | 1/200 | hauteur de clôture selon le règlement ; reculs du bassin | — | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | si condition (piscine ou clôture) |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Aménagements extérieurs et piscine — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans, CCTP et DQE des extérieurs `LV_PRO_DCE_EXTERIEURS_PISCINE_CCTP` | 1/50 | matériaux ; quantités | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | si condition (extérieurs ou piscine) |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Aménagements extérieurs et piscine — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Plans BA et hydraulique de la piscine `LV_EXE_EXTERIEURS_PISCINE_PLANS` | 1/50 | structure du bassin ; filtration et débits ; éclairage en très basse tension ; équipotentialité | — | Bureau d'études structure | Architecte (maître d'œuvre) | si condition (piscine) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Aménagements extérieurs et piscine — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des plans du pisciniste `LV_VISA_EXTERIEURS_PISCINE_VISA` | — | étanchéité ; hydraulique ; sécurité | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | si condition (piscine) |

Précision de l'estimation : prix du marché + avenants.

### Aménagements extérieurs et piscine — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Notices et PV d'essais des extérieurs `LV_DOE_EXTERIEURS_PISCINE_RECOLEMENT` | — | réseaux d'arrosage ; piscine | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | si condition (extérieurs ou piscine) |

Précision de l'estimation : coût réel (décompte).

## Solaire et thermique (RTCM)

*الطاقة الشمسية والحرارية*

### Solaire et thermique (RTCM) — Esquisse

Pas de livrable : orientation et compacité.

### Solaire et thermique (RTCM) — Avant-projet sommaire

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Stratégie thermique `LV_APS_SOLAIRE_RTCM_NOTICE` | — | zone climatique ; isolation ; protections solaires | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | facultatif |

Précision de l'estimation : ± 15 à 20 %.

### Solaire et thermique (RTCM) — Avant-projet détaillé

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Note de performance énergétique (RTCM) `LV_APD_SOLAIRE_RTCM_NOTE_CALCUL` | — | méthode prescriptive ou performancielle ; U des parois ; vitrages et facteur solaire ; eau chaude solaire ou photovoltaïque | — | Architecte (maître d'œuvre) | Bureau de contrôle technique | si condition (bâtiment neuf soumis au RTCM) |

Précision de l'estimation : ± 10 %.

### Solaire et thermique (RTCM) — Dossier d'autorisation (Rokhas)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Note ou fiche de performance énergétique du dossier `LV_AUT_SOLAIRE_RTCM_FICHE` | — | reprise de l'APD, signée par l'architecte | — | Architecte (maître d'œuvre) | Commune (guichet unique, président du conseil communal) | si condition (bâtiment neuf soumis au RTCM) |

Précision de l'estimation : ± 10 % (inchangée : le dossier administratif n'apporte pas de précision technique).

### Solaire et thermique (RTCM) — Projet et dossier de consultation (PRO/DCE)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| CCTP isolation et solaire `LV_PRO_DCE_SOLAIRE_RTCM_CCTP` | — | isolants ; capteurs ; panneaux ; quantités | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : ± 5 % (DQE confidentiel).

### Solaire et thermique (RTCM) — Exécution et plans d'atelier (EXE, PAC/PEO)

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Implantation et schémas solaires `LV_EXE_SOLAIRE_RTCM_PLANS` | 1/100 | capteurs ou panneaux ; charges sur terrasse validées par le BET ; schéma hydraulique ou électrique (onduleur, protections) | — | Bureau d'études fluides | Architecte (maître d'œuvre) | si condition (solaire prévu) |

Précision de l'estimation : ± 3 à 5 % puis prix du marché.

### Solaire et thermique (RTCM) — Visa des documents d'exécution et d'atelier

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Visa des fiches produits `LV_VISA_SOLAIRE_RTCM_VISA` | — | performances conformes | — | Architecte (maître d'œuvre) | Maître d'ouvrage (client) | oui |

Précision de l'estimation : prix du marché + avenants.

### Solaire et thermique (RTCM) — Dossier des ouvrages exécutés et plans de récolement

| Pièce | Échelle | Contenu minimal | Pas encore à ce stade | Produit par | Validé par | Obligatoire |
|---|---|---|---|---|---|---|
| Notices et attestation de conformité RTCM `LV_DOE_SOLAIRE_RTCM_RECOLEMENT` | — | attestation si exigée (à vérifier) | — | Entreprise d'un corps d'état | Architecte (maître d'œuvre) | facultatif |

Précision de l'estimation : coût réel (décompte).

