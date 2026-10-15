# Normes techniques et checklists de chantier

**CITURBAREA — complément du référentiel des phases, version du 15/10/2026.**

Ce document dit, phase par phase et lot par lot, **quelles règles techniques s'appliquent et ce qu'elles imposent concrètement** (partie 1), puis donne les **checklists de contrôle du chantier** qui serviront de PV dans le logiciel (partie 2). Les mêmes données sont dans `normes[]` et `checklistsChantier[]` de `referentiel-phases.json`.

> **Droit d'auteur.** Les normes NM, NF et EN et les DTU sont des documents payants. Ce document n'en recopie aucun texte : il reformule l'exigence et renvoie à la référence. Les valeurs chiffrées marquées « à relire » ou « à vérifier » doivent être confirmées sur la version en vigueur (catalogue IMANOR, AFNOR) avant d'être opposées à une entreprise.

**Statuts :** *vérifié* = texte officiel ou source fiable ; *partiellement vérifié* = référence sûre, valeurs tirées de la pratique ou de sources secondaires ; *à vérifier* = référence ou applicabilité au Maroc incertaine.

## Partie 1 — Normes et règles techniques

### Calcul du béton armé au Maroc : BAEL ou Eurocode 2 ?

En pratique, la grande majorité des notes de calcul de bâtiments courants au Maroc sont établies selon le **BAEL 91 modifié 99**, couplé au **RPS 2000 version 2011** pour le séisme, et les bureaux de contrôle les acceptent. L'**Eurocode 2** est accepté aussi et domine sur les grands projets et chez les BET internationaux. Aucun texte marocain lu n'impose l'un plutôt que l'autre (à vérifier). Règle CITURBAREA : la note d'hypothèses indique la règle retenue, et un même calcul n'en mélange pas deux.

### Les DTU dans les marchés marocains

Les DTU français ne sont pas des textes marocains. Ils deviennent **contractuels quand le CPS les cite**, ce qui est l'usage courant des CPS marocains. D'où la règle : le CCTP généré par CITURBAREA cite explicitement les DTU retenus pour chaque lot.

### RPS 2000 version 2011 (décret 2-02-177 ; modificatif 2-12-682 à vérifier ; zonage révisé 2-24-766 à vérifier)

*Règlement de construction parasismique des bâtiments* — statut : **partiellement vérifié** — portée : reglementaire.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Études d'exécution ; Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Déterminer la zone sismique de la commune, la classe du bâtiment (importance) et la classe de site (S1 à S5) d'après le rapport de sol, et les écrire dans la note d'hypothèses. |
| Conception | Choisir le niveau de ductilité et vérifier la régularité en plan et en élévation ; sinon, analyse dynamique. *(valeur ou applicabilité à vérifier)* |
| Conception | Vérifier les déplacements entre étages et prévoir des joints sismiques entre blocs (largeur selon le règlement, à relire). *(valeur ou applicabilité à vérifier)* |
| Conception | Dispositions constructives : cadres resserrés dans les zones critiques des poteaux et des poutres, recouvrements hors zones critiques, crochets à 135°, sections minimales des poteaux (valeurs à relire dans le chapitre 7 du RPS). *(valeur ou applicabilité à vérifier)* |
| Exécution | Contrôler sur chantier, avant chaque coulage, l'espacement des cadres en zone critique, la position des recouvrements et la fermeture des crochets. *(valeur ou applicabilité à vérifier)* |
| Exécution | Maçonnerie de remplissage chaînée (chaînages horizontaux et verticaux) conformément aux plans. *(valeur ou applicabilité à vérifier)* |

### Décret 2-12-666 du 28/05/2013 (RPCTerre)

*Constructions parasismiques en terre* — statut : **vérifié** — portée : reglementaire.

- **Phases :** Études d'exécution
- **Lots :** Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Conception | S'applique aux constructions en terre (pisé, adobe) : utile en rénovation de bâti traditionnel. |

### Décret 2-13-874 du 15/10/2014 (RTCM), loi 47-09

*Performance thermique de l'enveloppe des bâtiments neufs* — statut : **vérifié** — portée : reglementaire.

- **Phases :** Esquisse et avant-projet sommaire (APS) ; Avant-projet détaillé (APD) et premières études techniques ; Autorisation de construire (Rokhas) ; Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Solaire et thermique (RTCM), Menuiseries (alu, bois, métallerie), Étanchéité

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Identifier la zone climatique (6 zones) de la commune ; choisir l'approche prescriptive (coefficients U maximaux de toiture, murs, planchers, vitrages et facteur solaire selon le taux de baies) ou performancielle (besoins annuels de chauffage et de refroidissement plafonnés). |
| Conception | Valeurs U et facteurs solaires : à reprendre des tableaux du décret pour la zone et le type de bâtiment (non recopiés ici, à relire). *(valeur ou applicabilité à vérifier)* |
| Exécution | Contrôler la nature et l'épaisseur des isolants livrés (fiche technique, lambda) et leur continuité aux ponts thermiques (nez de dalle, acrotères). *(valeur ou applicabilité à vérifier)* |
| Exécution | Contrôler les vitrages livrés (double vitrage si prescrit, facteur solaire) avant pose. *(valeur ou applicabilité à vérifier)* |

### NM 10.1.008-2009 (norme d'application obligatoire)

*Bétons : spécification, performances, production, conformité* — statut : **vérifié** — portée : norme obligatoire.

- **Phases :** Études d'exécution ; Métré, consultation des entreprises et marchés ; Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Spécifier dans le CCTP chaque béton par sa classe de résistance (ex. C25/30 pour la structure courante), sa classe d'exposition (sols agressifs, ambiance marine à Kénitra et Rabat à apprécier), sa consistance (classe d'affaissement) et la dimension maximale des granulats. |
| Exécution | Béton prêt à l'emploi : exiger un bon de livraison mentionnant classe, exposition, consistance, heure de chargement ; refuser tout ajout d'eau sur chantier non prévu par le fournisseur. *(valeur ou applicabilité à vérifier)* |
| Exécution | Délai entre chargement et mise en place : usuellement 1 h 30 au plus (à confirmer avec le fournisseur et la norme). *(valeur ou applicabilité à vérifier)* |
| Essai | Contrôle de conformité par éprouvettes (voir ESSAIS_BETON). *(valeur ou applicabilité à vérifier)* |

### NM 10.1.004-2019 (obligatoire)

*Ciments : composition, spécifications, conformité* — statut : **vérifié** — portée : norme obligatoire.

- **Phases :** Études d'exécution ; Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau ; Second œuvre, équipements et extérieurs
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol, Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Choisir le type et la classe de ciment (ciment composé CPJ 45 courant, classe supérieure pour bétons exigeants, ciment résistant aux sulfates si le rapport de sol signale un sol agressif). |
| Exécution | Sacs marqués de la norme, stockés au sec sur palettes, utilisés avant la date limite ; refuser les sacs durcis. *(valeur ou applicabilité à vérifier)* |

### NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (obligatoires ; arrêtés à vérifier)

*Aciers pour béton armé : barres haute adhérence, ronds lisses, treillis soudés* — statut : **partiellement vérifié** — portée : norme obligatoire.

- **Phases :** Études d'exécution ; Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Nuance prescrite par le BET (haute adhérence de limite d'élasticité 500 MPa en usage courant) ; ronds lisses réservés aux usages secondaires prévus aux plans. *(valeur ou applicabilité à vérifier)* |
| Exécution | À la livraison : marquage de laminage lisible, certificat du producteur, diamètres conformes au bon ; stockage hors sol, sans rouille feuilletante. *(valeur ou applicabilité à vérifier)* |
| Exécution | Façonnage à froid, sans redressage à chaud ni soudure non prévue. *(valeur ou applicabilité à vérifier)* |

### NM 10.1.271 (granulats pour bétons, référence à vérifier)

*Granulats pour bétons et mortiers* — statut : **à vérifier** — portée : norme volontaire.

- **Phases :** Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Sable et gravette propres (pas d'argile ni de matières organiques), sable de mer non lavé interdit (chlorures) ; provenance de carrière autorisée. *(valeur ou applicabilité à vérifier)* |
| Essai | Essai d'équivalent de sable en cas de doute (seuil selon le CCTP). *(valeur ou applicabilité à vérifier)* |

### Eau de gâchage : NM correspondante à EN 1008 (référence à vérifier)

*Eau de gâchage des bétons* — statut : **à vérifier** — portée : norme volontaire.

- **Phases :** Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Eau du réseau potable admise sans essai ; eau de puits ou de citerne à analyser (chlorures, sulfates) avant usage. *(valeur ou applicabilité à vérifier)* |

### BAEL 91 modifié 99 (règles françaises)

*Calcul du béton armé aux états limites* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Études d'exécution
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Conception | En pratique marocaine, la grande majorité des notes de calcul de bâtiments courants sont établies au BAEL 91 modifié 99 couplé au RPS 2011, et les bureaux de contrôle les acceptent (pratique constatée, à vérifier auprès du bureau de contrôle du projet). *(valeur ou applicabilité à vérifier)* |
| Conception | Écrire dans la note d'hypothèses la règle de calcul retenue ; ne pas mélanger BAEL et Eurocode 2 dans un même calcul. *(valeur ou applicabilité à vérifier)* |

> L'Eurocode 2 est accepté par les bureaux de contrôle et utilisé par les BET internationaux et sur les grands projets ; il n'y a pas d'obligation marocaine d'utiliser l'un plutôt que l'autre (à vérifier).

### NF EN 1992-1-1 (Eurocode 2)

*Calcul des structures en béton* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Études d'exécution
- **Lots :** Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Admis comme alternative au BAEL ; enrobages et classes d'exposition alors cohérents avec la norme béton. *(valeur ou applicabilité à vérifier)* |

### NF DTU 13.1 Fondations superficielles

*Exécution des semelles et radiers* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Terrassement, fondations et sous-sol
- **Lots :** Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Fond de fouille propre, sans eau, sans remblai, au niveau du sol porteur défini par l'étude ; béton de propreté (environ 5 cm) avant ferraillage. *(valeur ou applicabilité à vérifier)* |
| Exécution | Profondeur hors gel et hors zone de retrait-gonflement selon l'étude de sol. *(valeur ou applicabilité à vérifier)* |

> Référence contractuelle fréquente dans les CPS marocains ; s'applique quand le CPS la cite.

### NF DTU 13.3 Dallages

*Dallages sur terre-plein* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Terrassement, fondations et sous-sol
- **Lots :** Terrassement, fondations, soutènements, sous-sol, Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Forme compactée par couches, hérisson drainant, film polyane avec recouvrements, treillis soudé calé, joints de retrait (sciage selon le DTU), épaisseur conforme aux plans. *(valeur ou applicabilité à vérifier)* |

### NF DTU 20.1 Maçonnerie de petits éléments

*Murs en briques et blocs* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Gros œuvre en élévation et mise hors d'eau
- **Lots :** Architecture

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Aplomb et planéité : écart toléré de l'ordre de 1 cm sous la règle de 2 m (valeur à relire dans la version en vigueur) ; joints garnis ; harpage des angles ; chaînages et linteaux aux plans. *(valeur ou applicabilité à vérifier)* |
| Exécution | Arrêt de la maçonnerie sous dalle avec calfeutrement souple pour laisser la flèche du plancher. *(valeur ou applicabilité à vérifier)* |

### NF DTU 21 Exécution des ouvrages en béton

*Mise en œuvre du béton* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Coffrages propres, étanches et huilés ; étaiement dimensionné ; cales d'enrobage en béton ou plastique (pas de cailloux). *(valeur ou applicabilité à vérifier)* |
| Exécution | Enrobage minimal des armatures selon l'exposition (ordre de grandeur courant : 2,5 à 3 cm en intérieur, 4 à 5 cm en contact avec le sol ou en ambiance agressive ; valeurs exactes à prendre sur les plans du BET). *(valeur ou applicabilité à vérifier)* |
| Exécution | Vibration par couches, pas de chute libre de grande hauteur ; reprise de bétonnage aux endroits prévus. *(valeur ou applicabilité à vérifier)* |
| Exécution | Cure : maintenir humide au moins 3 à 7 jours selon la température (été marocain : arrosage ou produit de cure). *(valeur ou applicabilité à vérifier)* |
| Exécution | Décoffrage et désétaiement après le délai prescrit par le BET (usuellement 21 à 28 jours pour l'étaiement des planchers, à confirmer). *(valeur ou applicabilité à vérifier)* |

### NF DTU 26.1 Enduits aux mortiers

*Enduits intérieurs et extérieurs* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Support propre, humidifié ; gobetis, corps d'enduit, finition ; épaisseur totale extérieure de l'ordre de 15 à 20 mm (à relire). *(valeur ou applicabilité à vérifier)* |
| Exécution | Treillis aux jonctions de matériaux différents (béton et brique) ; baguettes d'angle. *(valeur ou applicabilité à vérifier)* |
| Exécution | Réseaux encastrés réceptionnés avant enduit (point d'arrêt). *(valeur ou applicabilité à vérifier)* |

### NF DTU 43.1 Étanchéité des toitures-terrasses

*Toitures-terrasses sur maçonnerie* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Études d'exécution ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Étanchéité

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Pente de la forme de pente adaptée au type de toiture (ordre de 1 à 5 %), entrées d'eau pluviales en nombre suffisant avec trop-plein. *(valeur ou applicabilité à vérifier)* |
| Exécution | Relevés d'étanchéité d'au moins 15 cm au-dessus de la protection (valeur courante à relire), engravure ou bande de protection, angles renforcés. *(valeur ou applicabilité à vérifier)* |
| Essai | Essai de mise en eau avant protection (durée et hauteur selon le CPS ; usage 48 h). *(valeur ou applicabilité à vérifier)* |

### NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés)

*Carrelages de sols et de murs* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Support sec et plan ; planéité finale du carrelage de l'ordre de 3 mm sous la règle de 2 m (à relire) ; désaffleurement entre carreaux limité ; joints réguliers ; joints de fractionnement et périphériques. *(valeur ou applicabilité à vérifier)* |
| Exécution | Colle adaptée au format et à la pièce ; double encollage pour les grands formats. *(valeur ou applicabilité à vérifier)* |

### NF DTU 55.2 Revêtements muraux attachés en pierre mince

*Façades et murs en pierre* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Attaches inox, joints, épaisseurs selon le DTU. *(valeur ou applicabilité à vérifier)* |

### NF DTU 59.1 Peinture

*Travaux de peinture des bâtiments* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Support sec (humidité mesurée), impression puis deux couches de finition ; aspect selon le niveau de finition contractuel. *(valeur ou applicabilité à vérifier)* |

### NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC)

*Réseaux d'eau et d'évacuation* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Plomberie sanitaire et assainissement

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Dimensionner l'alimentation selon les débits de base et les coefficients de simultanéité ; pression au robinet suffisante (surpresseur au besoin). *(valeur ou applicabilité à vérifier)* |
| Exécution | Pentes des évacuations comprises en général entre 1 et 3 % ; ventilation primaire des chutes ; tampons de visite accessibles. *(valeur ou applicabilité à vérifier)* |
| Essai | Essai de pression de l'alimentation avant fermeture (voir ESSAI_PRESSION). *(valeur ou applicabilité à vérifier)* |

### NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique)

*Installations de chauffage, climatisation et ventilation* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Climatisation, chauffage, ventilation

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Liaisons frigorifiques isolées, tirées au vide et éprouvées à l'azote ; évacuation des condensats avec pente et siphon ; unités extérieures fixées sur supports antivibratiles. *(valeur ou applicabilité à vérifier)* |
| Essai | Mise en service : mesure des températures de soufflage, vérification des débits de ventilation des pièces humides. *(valeur ou applicabilité à vérifier)* |

> Les DTU 65 visent le chauffage ; pour la climatisation, les CPS citent souvent les recommandations des fabricants et la NF EN 378 (fluides frigorigènes).

### NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1

*Pose des fenêtres et portes, vitrages* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Menuiseries (alu, bois, métallerie)

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Classes d'air, d'eau et de vent adaptées à l'exposition (façades littorales exposées). *(valeur ou applicabilité à vérifier)* |
| Exécution | Calfeutrement continu (mastic sur fond de joint), pièce d'appui avec rejet d'eau, fixations selon le fabricant, jeu de fonctionnement des ouvrants. *(valeur ou applicabilité à vérifier)* |
| Essai | Essai d'arrosage des menuiseries exposées. *(valeur ou applicabilité à vérifier)* |

### NF DTU 25.41 (plaques de plâtre) et 58.1 (plafonds suspendus)

*Cloisons sèches et faux plafonds* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Revêtements et finitions

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Ossatures fixées selon l'entraxe du fabricant, plaques hydrofuges en pièces humides, trappes d'accès aux équipements. *(valeur ou applicabilité à vérifier)* |

### NF P01-012 Garde-corps

*Dimensions des garde-corps* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Menuiseries (alu, bois, métallerie), Architecture

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Hauteur de protection de l'ordre de 1,00 m (réduite si le garde-corps est épais, à relire), pas d'élément escaladable, vides limités (environ 11 cm) pour éviter le passage d'un enfant. *(valeur ou applicabilité à vérifier)* |

### NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier)

*Installations électriques à basse tension* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Études d'exécution ; Terrassement, fondations et sous-sol ; Second œuvre, équipements et extérieurs
- **Lots :** Électricité courants forts, Aménagements extérieurs et piscine

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Protection différentielle 30 mA des circuits terminaux ; sections et calibres cohérents (usage : 1,5 mm² pour l'éclairage, 2,5 mm² pour les prises) ; volumes des salles d'eau ; nombre de points par pièce selon la norme. *(valeur ou applicabilité à vérifier)* |
| Exécution | Boucle de terre en fond de fouille, liaisons équipotentielles des salles d'eau et de la piscine, gaines à la bonne couleur et non écrasées. *(valeur ou applicabilité à vérifier)* |
| Essai | Mesure de la résistance de terre (valeur compatible avec le différentiel : 100 Ω au plus est la recommandation usuelle, à vérifier avec le distributeur) ; test de déclenchement des différentiels ; continuité des conducteurs de protection. *(valeur ou applicabilité à vérifier)* |
| Exécution | Piscine : très basse tension de sécurité (12 V) pour l'éclairage immergé, équipotentialité du bassin. *(valeur ou applicabilité à vérifier)* |

> Le Maroc dispose de normes NM sur les installations BT ; le numéro exact et le caractère obligatoire n'ont pas été confirmés : les CPS citent la NF C 15-100.

### Règles du distributeur (ONEE, société régionale multiservices, Redal, Lydec, Amendis) et NF C 14-100 en référence

*Branchement et comptage* — statut : **à vérifier** — portée : reglementaire.

- **Phases :** Études d'exécution ; Conformité, permis d'habiter et raccordements définitifs
- **Lots :** Électricité courants forts, Voirie et réseaux divers

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Puissance demandée selon le bilan ; emplacement du coffret de comptage accessible depuis le domaine public ; poste de transformation si la puissance l'exige (immeuble, lotissement). *(valeur ou applicabilité à vérifier)* |
| Exécution | Le distributeur réceptionne le branchement ; attestation de conformité de l'installation souvent demandée. *(valeur ou applicabilité à vérifier)* |

### Loi 24-09 (marquage CMIM)

*Conformité des produits électriques et à gaz* — statut : **vérifié** — portée : reglementaire.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Électricité courants forts, Plomberie sanitaire et assainissement

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Refuser l'appareillage électrique et les chauffe-eau à gaz sans marquage de conformité CMIM. |

### Décret 2-14-499 du 15/10/2014 et exigences de la protection civile

*Sécurité contre l'incendie et la panique* — statut : **partiellement vérifié** — portée : reglementaire.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Autorisation de construire (Rokhas) ; Études d'exécution ; Second œuvre, équipements et extérieurs ; Conformité, permis d'habiter et raccordements définitifs
- **Lots :** Sécurité incendie, Architecture, Électricité courants forts, Climatisation, chauffage, ventilation

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Classer le bâtiment (habitation par famille, ERP par type et catégorie, IGH) ; en déduire isolement, stabilité au feu, nombre et largeur des dégagements, désenfumage, moyens de secours. |
| Conception | Notice de sécurité visée par un bureau de contrôle au-delà des seuils de l'arrêté 1032-21. |
| Exécution | Portes coupe-feu et matériaux selon leur classement (procès-verbaux d'essai des produits) ; colonnes sèches, RIA, extincteurs, éclairage de sécurité aux emplacements prévus (valeurs à relire dans le décret). *(valeur ou applicabilité à vérifier)* |
| Essai | Essais de fonctionnement de la détection, de l'alarme et du désenfumage en présence du bureau de contrôle ; visite de la protection civile pour un ERP (à vérifier selon la commune). *(valeur ou applicabilité à vérifier)* |

### Loi 10-03 et décret 2-11-246 (arrêté technique à vérifier)

*Accessibilité des personnes à mobilité réduite* — statut : **partiellement vérifié** — portée : reglementaire.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Études d'exécution ; Réception provisoire et levée des réserves
- **Lots :** Architecture, Ascenseurs, Voirie et réseaux divers

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Au moins une place de stationnement réservée sur vingt dans les parcs ouverts au public. |
| Conception | Cheminements sans ressaut, rampes de pente faible, portes et ascenseurs de largeur suffisante, sanitaires adaptés (valeurs chiffrées à prendre dans l'arrêté technique, à vérifier). *(valeur ou applicabilité à vérifier)* |

### Règlements de service et cahiers des prescriptions des distributeurs (ONEE, sociétés régionales multiservices, Redal, Lydec, Amendis)

*Branchements d'eau potable et d'assainissement* — statut : **à vérifier** — portée : reglementaire.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs ; Conformité, permis d'habiter et raccordements définitifs
- **Lots :** Voirie et réseaux divers, Plomberie sanitaire et assainissement

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Obtenir les prescriptions du distributeur local : diamètre et emplacement du branchement, regard de façade en limite de propriété, réseau unitaire ou séparatif, clapet anti-retour si le niveau intérieur est sous la chaussée. *(valeur ou applicabilité à vérifier)* |
| Exécution | Le raccordement au réseau public est réalisé ou contrôlé par le distributeur ; les eaux pluviales ne sont pas rejetées dans un réseau séparatif d'eaux usées. *(valeur ou applicabilité à vérifier)* |
| Essai | Essais d'étanchéité et inspection des collecteurs exigés par le distributeur avant réception (lotissement). *(valeur ou applicabilité à vérifier)* |

### Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier)

*Voirie et réseaux* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Voirie et réseaux divers, Aménagements extérieurs et piscine

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Structure de chaussée selon le trafic et la portance du sol ; pentes des collecteurs garantissant l'autocurage ; regards aux changements de direction. *(valeur ou applicabilité à vérifier)* |
| Essai | Compactage des couches contrôlé (densité par rapport à l'optimum Proctor, seuil du CCTP, souvent 95 % en couche de forme) ; essais de plaque ; épreuve des canalisations. *(valeur ou applicabilité à vérifier)* |

### NM EN 81-20 et 81-50 (construction et essais des ascenseurs), NM EN 81-70 (accessibilité) — homologation NM à vérifier

*Ascenseurs* — statut : **à vérifier** — portée : norme volontaire.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Études d'exécution ; Second œuvre, équipements et extérieurs
- **Lots :** Ascenseurs

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Dimensions de gaine, cuvette et hauteur de dernier niveau données par l'ascensoriste selon la norme ; cabine accessible si bâtiment concerné. *(valeur ou applicabilité à vérifier)* |
| Essai | Contrôle de mise en service par un organisme indépendant avant usage ; contrat d'entretien. *(valeur ou applicabilité à vérifier)* |

### NF P 94-500 (missions géotechniques), essais pressiométriques et pénétrométriques, Proctor et plaque (références françaises en usage, homologation NM à vérifier)

*Reconnaissance et contrôle des sols* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Terrain, foncier et faisabilité ; Terrassement, fondations et sous-sol
- **Lots :** Terrassement, fondations, soutènements, sous-sol, Voirie et réseaux divers

| Moment | Ce qu'elle impose |
|---|---|
| Conception | Nombre et profondeur des sondages adaptés à l'emprise et aux charges (au moins 2 à 3 sondages pour une villa, davantage pour un immeuble, à fixer par le géotechnicien). *(valeur ou applicabilité à vérifier)* |
| Essai | Réception des fonds de fouille par le géotechnicien ou l'architecte ; essais de compactage des remblais par couches (fréquence du CCTP). *(valeur ou applicabilité à vérifier)* |

### Essais du béton frais et durci (NM et EN 12350 / 12390 homologuées NM, références à vérifier) et contrôle de conformité de la NM 10.1.008

*Affaissement, éprouvettes, résistance* — statut : **partiellement vérifié** — portée : norme obligatoire.

- **Phases :** Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Structure béton armé, Terrassement, fondations, soutènements, sous-sol

| Moment | Ce qu'elle impose |
|---|---|
| Essai | Affaissement au cône d'Abrams à chaque toupie ou au moins par coulage, comparé à la classe commandée. *(valeur ou applicabilité à vérifier)* |
| Essai | Éprouvettes cylindriques (16 × 32 cm usuelles) : une série d'au moins 3 par partie d'ouvrage et par jour de coulage, et au moins une par 50 m³ (fréquence usuelle des CPS, à fixer au CCTP). *(valeur ou applicabilité à vérifier)* |
| Essai | Écrasement à 7 jours (indicatif) et 28 jours (conformité) au laboratoire ; résultat inférieur à la classe : fiche de non-conformité, décision du BET (carottage, renforcement). *(valeur ou applicabilité à vérifier)* |

### Essai de mise en eau des toitures et des bassins (DTU 43.1, CPS)

*Étanchéité* — statut : **partiellement vérifié** — portée : regle de l art.

- **Phases :** Gros œuvre en élévation et mise hors d'eau ; Second œuvre, équipements et extérieurs
- **Lots :** Étanchéité, Aménagements extérieurs et piscine

| Moment | Ce qu'elle impose |
|---|---|
| Essai | Obturer les évacuations, mettre en eau (quelques centimètres au point haut), maintenir 48 h (usage), inspecter la sous-face ; piscine : remplissage et suivi du niveau sur plusieurs jours avant revêtement. *(valeur ou applicabilité à vérifier)* |

### Épreuve des réseaux d'eau (DTU 60.1, CPS)

*Étanchéité des canalisations sous pression* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Second œuvre, équipements et extérieurs
- **Lots :** Plomberie sanitaire et assainissement, Climatisation, chauffage, ventilation

| Moment | Ce qu'elle impose |
|---|---|
| Essai | Mise en pression à environ 1,5 fois la pression de service (usage : 10 bars au moins en logement) pendant une durée fixée au CPS (souvent 1 à 2 heures) sans chute au manomètre ; valeurs à confirmer au CCTP. *(valeur ou applicabilité à vérifier)* |

### Mesure de la prise de terre (NF C 15-100)

*Sécurité électrique* — statut : **à vérifier** — portée : regle de l art.

- **Phases :** Terrassement, fondations et sous-sol ; Second œuvre, équipements et extérieurs
- **Lots :** Électricité courants forts

| Moment | Ce qu'elle impose |
|---|---|
| Essai | Mesure au telluromètre après raccordement de la boucle de fond de fouille ; valeur consignée au PV et comparée au seuil retenu (voir NFC_15_100). *(valeur ou applicabilité à vérifier)* |

### Code du travail (loi 65-99, hygiène et sécurité) et loi 18-12

*Sécurité des ouvriers* — statut : **vérifié** — portée : reglementaire.

- **Phases :** Préparation et ouverture du chantier ; Terrassement, fondations et sous-sol ; Gros œuvre en élévation et mise hors d'eau ; Second œuvre, équipements et extérieurs
- **Lots :** Architecture, Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Exécution | Équipements de protection individuelle, garde-corps provisoires aux rives de dalle, trémies obturées, échafaudages stables ; déclaration des accidents du travail. |

### Règle de Blondel (règle de l'art)

*Confort des escaliers* — statut : **vérifié** — portée : regle de l art.

- **Phases :** Avant-projet détaillé (APD) et premières études techniques ; Études d'exécution ; Gros œuvre en élévation et mise hors d'eau
- **Lots :** Architecture, Structure béton armé

| Moment | Ce qu'elle impose |
|---|---|
| Conception | 2 hauteurs + 1 giron compris entre 60 et 64 cm ; hauteur de marche régulière ; échappée suffisante (environ 2 m). |

## Partie 2 — Checklists de chantier

Chaque checklist devient un **PV de chantier** dans l'espace projet. Les points marqués ⛔ sont des **points d'arrêt** : on ne passe pas à l'étape suivante (couler, enduire, remblayer, fermer) tant qu'ils ne sont pas validés par le contrôleur indiqué. L'administration peut lever un point d'arrêt avec un motif écrit, journalisé. Contrôleur « entreprise » = autocontrôle de l'entreprise, vérifié ensuite par l'architecte.

### Modèle de PV commun

- **En-tête :** projet (titre, commune, numéro de permis), lot et checklist, niveau ou zone, date et heure, intervenants présents désignés par leur rôle et leur raison sociale (sans coordonnées), plans de référence avec leur indice, météo.
- **Constat :** pour chaque point, conforme, non conforme ou sans objet, avec observation, mesure relevée et photo.
- **Réserves :** liste numérotée avec description, localisation, rôle responsable et délai.
- **Décision :** pour une checklist avec point d'arrêt, « autorisé à poursuivre », « autorisé sous réserve de levée avant l'étape suivante » ou « refusé, reprise et nouvelle visite ». Sinon : conforme, conforme avec réserves, non conforme.
- **Signatures :** électroniques et horodatées, par les rôles signataires de la checklist ; diffusion automatique par la plateforme. Une non-conformité structurelle ouvre une fiche de non-conformité.

### Installation de chantier (`CL01_INSTALLATION_CHANTIER`)

*تهيئة الورش* — phase : Préparation et ouverture du chantier — jalon : `J07_03_INSTALLATION` — lot : Architecture. Signataires : Entreprise de gros œuvre ou générale, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Panneau de chantier en place et lisible | numéro et date du permis, nature des travaux, intervenants désignés par leur nom ou raison sociale, sans coordonnées personnelles | Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 02 | Clôture ou palissade continue, accès fermé | aucun accès du public à la zone de travaux | Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) | visuel | Architecte (maître d'œuvre) |  | photo |
| 03 | Cahier de chantier présent sur le chantier | coté, paraphé, ouvert à la date d'ouverture | Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) | document | Architecte (maître d'œuvre) | ⛔ | photo |
| 04 | Plans visés « ne varietur » et permis disponibles sur place | dernier indice des plans d'exécution affiché | Loi 66-12 (BO 6501 du 19/09/2016 ; numéro du dahir à vérifier) | document | Architecte (maître d'œuvre) |  | photo |
| 05 | Raccordements provisoires eau et électricité sécurisés | coffret avec différentiel 30 mA, câbles protégés | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 06 | Zones de stockage (ciment au sec, aciers hors sol, granulats séparés) | ciment sur palettes à l'abri, aciers sur chevrons | NM 10.1.004-2019 (obligatoire) | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 07 | Sanitaires, eau potable, équipements de protection des ouvriers | casques, chaussures, harnais disponibles | Code du travail (loi 65-99, hygiène et sécurité) et loi 18-12 | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 08 | Constat des avoisinants réalisé si mitoyenneté ou sous-sol | photos datées des fissures existantes chez les voisins | NF DTU 13.1 Fondations superficielles | document | Architecte (maître d'œuvre) |  | photo, document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Implantation (`CL02_IMPLANTATION`)

*التخطيط على الأرض* — phase : Préparation et ouverture du chantier — jalon : `J07_05_IMPLANTATION` — lot : Architecture. Signataires : Entreprise de gros œuvre ou générale, Ingénieur géomètre-topographe, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Bornes du terrain retrouvées et conformes au titre | écart de position compatible avec la précision du levé | Loi 30-93 (dahir 1-94-126 du 25/02/1994) | mesure | Ingénieur géomètre-topographe | ⛔ | document |
| 02 | Reculs par rapport aux limites et à l'alignement | égaux ou supérieurs à ceux du permis | Loi 12-90 (dahir 1-92-31 du 17/06/1992, BO 4159), modifiée par la loi 66-12 | mesure | Architecte (maître d'œuvre) | ⛔ | photo, mesure |
| 03 | Axes principaux et diagonales | écart de l'ordre du centimètre sur les diagonales (tolérance à fixer au CCTP) | NF DTU 21 Exécution des ouvrages en béton | mesure | Architecte (maître d'œuvre) | ⛔ | mesure |
| 04 | Niveau de référence ±0,00 matérialisé et rattaché | repère durable, cote rattachée au levé | NF DTU 13.1 Fondations superficielles | mesure | Ingénieur géomètre-topographe | ⛔ | photo |
| 05 | Chaises d'implantation stables et hors zone de terrassement | repères conservés pendant les fouilles | NF DTU 21 Exécution des ouvrages en béton | visuel | Entreprise de gros œuvre ou générale |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Terrassement et fonds de fouille (`CL03_TERRASSEMENT_FONDS_FOUILLE`)

*الحفر وقعر الحفريات* — phase : Terrassement, fondations et sous-sol — jalon : `J08_02_FONDS_FOUILLE` — lot : Terrassement, fondations, soutènements, sous-sol. Signataires : Entreprise de gros œuvre ou générale, Géotechnicien (laboratoire de sol), Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Profondeur atteinte égale au niveau d'assise prévu | cote mesurée par rapport au ±0,00 ; descendre jusqu'au bon sol si nécessaire | NF DTU 13.1 Fondations superficielles | mesure | Architecte (maître d'œuvre) | ⛔ | mesure, photo |
| 02 | Nature du sol conforme au rapport géotechnique | pas de remblai, de poche d'argile molle ni de matière organique | NF P 94-500 (missions géotechniques), essais pressiométriques et pénétrométriques, Proctor et plaque (références françaises en usage, homologation NM à vérifier) | visuel | Géotechnicien (laboratoire de sol) | ⛔ | photo, pv |
| 03 | Fond propre, sec et horizontal | eau pompée, terre remaniée enlevée | NF DTU 13.1 Fondations superficielles | visuel | Entreprise de gros œuvre ou générale | ⛔ | photo |
| 04 | Talus ou blindages stables | pente de talus selon le sol, blindage si profondeur ou mitoyen | Code du travail (loi 65-99, hygiène et sécurité) et loi 18-12 | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 05 | Fondations des voisins non déchaussées | pas de terrassement sous la semelle voisine sans reprise prévue | NF DTU 13.1 Fondations superficielles | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 06 | Béton de propreté coulé rapidement après réception | épaisseur d'environ 5 cm, dans la journée si possible | NF DTU 13.1 Fondations superficielles | visuel | Entreprise de gros œuvre ou générale |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Fondations : ferraillage avant coulage (`CL04_FONDATIONS_AVANT_COULAGE`)

*الأساسات: التسليح قبل الصب* — phase : Terrassement, fondations et sous-sol — jalon : `J08_03_FERRAILLAGE_FONDATIONS` — lot : Structure béton armé. Signataires : Entreprise de gros œuvre ou générale, Bureau d'études structure, Bureau de contrôle technique, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Aciers livrés conformes (nuance, diamètres, marquage) | certificat et étiquettes conformes au plan | NM 01.4.096, NM 01.4.097-2013, NM 01.4.095, NM 01.4.220 (obligatoires ; arrêtés à vérifier) | document | Architecte (maître d'œuvre) | ⛔ | bon livraison, photo |
| 02 | Dimensions des semelles, radier et longrines | conformes au plan de fondations | NF DTU 13.1 Fondations superficielles | mesure | Bureau d'études structure | ⛔ | mesure |
| 03 | Nombre, diamètre et espacement des barres | conformes au plan de ferraillage | BAEL 91 modifié 99 (règles françaises) | mesure | Bureau d'études structure | ⛔ | photo |
| 04 | Enrobages assurés par cales | cales en béton ou plastique ; enrobage au contact du sol de 4 à 5 cm ou selon plan | NF DTU 21 Exécution des ouvrages en béton | mesure | Bureau d'études structure | ⛔ | photo |
| 05 | Attentes des poteaux et voiles en place et bien positionnées | nombre, longueur de recouvrement, cadres de maintien, position vérifiée par rapport aux axes | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | mesure | Bureau d'études structure | ⛔ | photo |
| 06 | Recouvrements hors zones critiques et ligatures serrées | longueurs selon le plan | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | visuel | Bureau d'études structure | ⛔ | photo |
| 07 | Boucle de terre et fourreaux de traversée en place | câble de terre continu en fond de fouille, fourreaux EU/EP et arrivées | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 08 | Coffrages ou fouilles propres, sans terre tombée | nettoyage avant coulage | NF DTU 21 Exécution des ouvrages en béton | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 09 | Béton commandé conforme au CCTP et éprouvettes prévues | classe, exposition, consistance ; laboratoire prévenu | NM 10.1.008-2009 (norme d'application obligatoire) | document | Architecte (maître d'œuvre) | ⛔ | bon livraison, pv essai |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Soutènements et sous-sol (drainage, étanchéité, cuvelage) (`CL05_SOUTENEMENT_SOUS_SOL`)

*الجدران الاستنادية والطابق السفلي* — phase : Terrassement, fondations et sous-sol — jalon : `J08_05_SOUS_SOL` — lot : Terrassement, fondations, soutènements, sous-sol — seulement si : sousSol. Signataires : Entreprise de gros œuvre ou générale, Bureau d'études structure, Bureau de contrôle technique, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Ferraillage des voiles contre terre avant coulage | conforme au plan, enrobage côté terre selon plan | NF DTU 21 Exécution des ouvrages en béton | mesure | Bureau d'études structure | ⛔ | photo |
| 02 | Joints de reprise traités (waterstop ou équivalent) | dispositif prévu au plan posé et continu | NF DTU 21 Exécution des ouvrages en béton | visuel | Bureau d'études structure | ⛔ | photo |
| 03 | Phasage du terrassement et blindages respectés | conforme à la méthodologie visée | NF DTU 13.1 Fondations superficielles | visuel | Bureau d'études structure | ⛔ | photo |
| 04 | Support d'étanchéité sec, lisse, angles arrondis | trous de banches bouchés, balèvres arasées | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 05 | Étanchéité ou cuvelage posé selon la fiche technique | recouvrements, relevés au-dessus du terrain fini, protection mécanique | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) | ⛔ | photo, fiche technique |
| 06 | Drain périphérique, géotextile et regards | pente continue vers exutoire, regards de visite | NF DTU 13.1 Fondations superficielles | mesure | Architecte (maître d'œuvre) | ⛔ | photo |
| 07 | Remblai contre voile par couches compactées, matériau drainant | pas de remblai avant résistance suffisante du voile et accord du BET | NF P 94-500 (missions géotechniques), essais pressiométriques et pénétrométriques, Proctor et plaque (références françaises en usage, homologation NM à vérifier) | visuel | Bureau d'études structure | ⛔ | photo, pv essai |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Dallage et hérisson (`CL06_DALLAGE_HERISSON`)

*البلاطة على الأرض والحجر الجاف* — phase : Terrassement, fondations et sous-sol — jalon : `J08_06_FIN_INFRASTRUCTURE` — lot : Terrassement, fondations, soutènements, sous-sol. Signataires : Entreprise de gros œuvre ou générale, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Réseaux sous dallage essayés avant recouvrement | écoulement et étanchéité vérifiés | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | essai | Architecte (maître d'œuvre) | ⛔ | pv essai, photo |
| 02 | Forme compactée par couches | épaisseur des couches et compactage selon le CCTP | NF P 94-500 (missions géotechniques), essais pressiométriques et pénétrométriques, Proctor et plaque (références françaises en usage, homologation NM à vérifier) | essai | Laboratoire d'essais |  | pv essai |
| 03 | Hérisson propre et d'épaisseur suffisante | épaisseur au plan (souvent 15 à 20 cm) | NF DTU 13.3 Dallages | mesure | Architecte (maître d'œuvre) |  | photo |
| 04 | Film polyane continu avec recouvrements | recouvrements d'au moins 20 cm (usage) | NF DTU 13.3 Dallages | visuel | Architecte (maître d'œuvre) |  | photo |
| 05 | Treillis soudé calé et niveaux de dallage | treillis sur cales, épaisseur et niveau fini au plan | NF DTU 13.3 Dallages | mesure | Architecte (maître d'œuvre) | ⛔ | photo |
| 06 | Joints de retrait et périphériques prévus | maillage selon le DTU ou le plan | NF DTU 13.3 Dallages | visuel | Architecte (maître d'œuvre) |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Poteaux, poutres et planchers (par niveau) (`CL07_POTEAUX_POUTRES_PLANCHERS`)

*الأعمدة والروافد والبلاطات (لكل طابق)* — phase : Gros œuvre en élévation et mise hors d'eau — jalon : `J09_02_PLANCHER_NIVEAU` — lot : Structure béton armé. Signataires : Entreprise de gros œuvre ou générale, Bureau d'études structure, Bureau de contrôle technique, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Axes et niveaux reportés depuis les repères | écart de position des poteaux de l'ordre du centimètre | NF DTU 21 Exécution des ouvrages en béton | mesure | Entreprise de gros œuvre ou générale |  | mesure |
| 02 | Coffrages des poteaux d'aplomb et étanches | aplomb contrôlé au fil ou au niveau laser | NF DTU 21 Exécution des ouvrages en béton | mesure | Entreprise de gros œuvre ou générale | ⛔ | photo |
| 03 | Cadres resserrés en zones critiques des poteaux et poutres | espacement conforme au plan (dispositions RPS) | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | mesure | Bureau d'études structure | ⛔ | photo |
| 04 | Crochets des cadres fermés à 135° | tous les cadres des zones critiques | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | visuel | Bureau d'études structure | ⛔ | photo |
| 05 | Étaiement du plancher dimensionné et contreventé | étais sur appuis stables, espacement selon le BET ou le fabricant | NF DTU 21 Exécution des ouvrages en béton | visuel | Entreprise de gros œuvre ou générale | ⛔ | photo |
| 06 | Poutrelles et entrevous conformes au plan de pose | sens, entraxe, appuis, chaînage | BAEL 91 modifié 99 (règles françaises) | visuel | Bureau d'études structure | ⛔ | photo |
| 07 | Armatures des poutres, chapeaux et treillis de compression | nombre, diamètre, longueur des chapeaux au-dessus des appuis | BAEL 91 modifié 99 (règles françaises) | mesure | Bureau d'études structure | ⛔ | photo |
| 08 | Enrobages par cales | selon le plan (souvent 2,5 à 3 cm en intérieur) | NF DTU 21 Exécution des ouvrages en béton | mesure | Bureau d'études structure | ⛔ | photo |
| 09 | Réservations et fourreaux posés par les lots techniques | conformes au plan de synthèse ; aucune réservation coupant une poutre sans accord du BET | NF DTU 21 Exécution des ouvrages en béton | visuel | Architecte (maître d'œuvre) | ⛔ | photo, document |
| 10 | Escaliers : hauteur et giron des marches | règle de Blondel, marches régulières | Règle de Blondel (règle de l'art) | mesure | Architecte (maître d'œuvre) |  | mesure |
| 11 | Garde-corps provisoires en rive et trémies protégées | aucune rive ouverte | Code du travail (loi 65-99, hygiène et sécurité) et loi 18-12 | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 12 | Bons de livraison béton, affaissement et éprouvettes | classe commandée, affaissement conforme, série d'éprouvettes prélevée | Essais du béton frais et durci (NM et EN 12350 / 12390 homologuées NM, références à vérifier) et contrôle de conformité de la NM 10.1.008 | essai | Laboratoire d'essais |  | bon livraison, pv essai |
| 13 | Cure du béton | arrosage ou produit de cure pendant au moins 3 à 7 jours | NF DTU 21 Exécution des ouvrages en béton | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 14 | Décoffrage et désétaiement au délai prescrit | délai donné par le BET ; aucune charge (stock de briques) sur dalle jeune | NF DTU 21 Exécution des ouvrages en béton | visuel | Bureau d'études structure | ⛔ | photo |
| 15 | Aspect après décoffrage (nids de cailloux, fissures, flèches) | défaut structurel : fiche de non-conformité et décision du BET | NF DTU 21 Exécution des ouvrages en béton | visuel | Bureau d'études structure |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Maçonnerie (`CL08_MACONNERIE`)

*البناء بالطوب* — phase : Gros œuvre en élévation et mise hors d'eau — jalon : `J09_03_MACONNERIE` — lot : Architecture. Signataires : Entreprise de gros œuvre ou générale, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Implantation des murs et des ouvertures | conforme au plan et au tableau des menuiseries (cotes de baies) | NF DTU 20.1 Maçonnerie de petits éléments | mesure | Architecte (maître d'œuvre) |  | mesure |
| 02 | Aplomb et planéité | tolérance du DTU 20.1 (de l'ordre de 1 cm sous la règle de 2 m, à relire) | NF DTU 20.1 Maçonnerie de petits éléments | mesure | Entreprise de gros œuvre ou générale |  | mesure |
| 03 | Chaînages et raidisseurs | conformes au plan (exigence parasismique) | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 04 | Linteaux avec appuis suffisants | appui de chaque côté selon le plan | NF DTU 20.1 Maçonnerie de petits éléments | visuel | Architecte (maître d'œuvre) |  | photo |
| 05 | Joints remplis, harpage aux angles | pas de joints vides | NF DTU 20.1 Maçonnerie de petits éléments | visuel | Entreprise de gros œuvre ou générale |  | photo |
| 06 | Calfeutrement souple sous dalle | espace laissé pour la flèche du plancher | NF DTU 20.1 Maçonnerie de petits éléments | visuel | Architecte (maître d'œuvre) |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Réseaux encastrés (électricité, plomberie) avant enduits (`CL09_RESEAUX_AVANT_ENDUITS`)

*الشبكات المدمجة قبل التلبيس* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_02_RESEAUX_AVANT_FERMETURE` — lot : Plomberie sanitaire et assainissement. Signataires : Entreprise d'un corps d'état, Bureau d'études fluides, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Points électriques à la position et à la hauteur du plan | prises, interrupteurs, points lumineux conformes ; volumes des salles d'eau respectés | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | mesure | Architecte (maître d'œuvre) | ⛔ | photo |
| 02 | Gaines de section suffisante, non écrasées, boîtes fixées | une gaine par circuit selon le schéma | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | visuel | Bureau d'études fluides | ⛔ | photo |
| 03 | Saignées sans couper les chaînages ni les éléments porteurs | aucune saignée horizontale profonde dans le béton | Décret 2-02-177 du 22/02/2002 (RPS 2000), version 2011 (décret modificatif 2-12-682 à vérifier) ; zonage révisé par le décret 2-24-766 (adopté le 19/09/2024, publication à vérifier) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 04 | Alimentation en eau : matériau, diamètres, fixations | conformes au plan d'exécution | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | visuel | Bureau d'études fluides | ⛔ | photo |
| 05 | Essai de pression de l'alimentation réussi | voir ESSAI_PRESSION, aucune chute au manomètre | Épreuve des réseaux d'eau (DTU 60.1, CPS) | essai | Bureau d'études fluides | ⛔ | pv essai, photo |
| 06 | Évacuations : pentes et raccords | pente 1 à 3 %, raccords collés, siphons | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | mesure | Bureau d'études fluides | ⛔ | photo |
| 07 | Essai d'écoulement des évacuations | écoulement sans fuite ni refoulement | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | essai | Architecte (maître d'œuvre) | ⛔ | pv essai |
| 08 | Reportage photo de chaque mur et sol avant fermeture | photos datées avec repère métrique, rattachées au jalon | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | document | Entreprise d'un corps d'état | ⛔ | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Enduits (`CL10_ENDUITS`)

*التلبيس* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_03_ENDUITS_MENUISERIES` — lot : Revêtements et finitions. Signataires : Entreprise d'un corps d'état, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Réseaux encastrés réceptionnés (CL09 signée) | PV de la checklist CL09 signé | NF DTU 26.1 Enduits aux mortiers | document | Architecte (maître d'œuvre) | ⛔ | pv |
| 02 | Support propre, humidifié, gobetis appliqué | pas de poussière ni de laitance | NF DTU 26.1 Enduits aux mortiers | visuel | Entreprise d'un corps d'état |  | photo |
| 03 | Treillis aux jonctions béton et maçonnerie | sur toute jonction de matériaux différents | NF DTU 26.1 Enduits aux mortiers | visuel | Architecte (maître d'œuvre) |  | photo |
| 04 | Épaisseur et nombre de couches | selon le DTU et le CCTP | NF DTU 26.1 Enduits aux mortiers | mesure | Entreprise d'un corps d'état |  | mesure |
| 05 | Planéité et angles | règle de 2 m, baguettes d'angle droites | NF DTU 26.1 Enduits aux mortiers | mesure | Architecte (maître d'œuvre) |  | mesure |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Étanchéité des terrasses (essai de mise en eau) (`CL11_ETANCHEITE_TERRASSE`)

*عزل السطوح (اختبار الغمر)* — phase : Gros œuvre en élévation et mise hors d'eau — jalon : `J09_04_ETANCHEITE_TERRASSE` — lot : Étanchéité. Signataires : Entreprise d'un corps d'état, Architecte (maître d'œuvre), Bureau de contrôle technique.

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Forme de pente vers les évacuations | pente continue, pas de flache (contrôle à l'eau ou au niveau) | NF DTU 43.1 Étanchéité des toitures-terrasses | mesure | Architecte (maître d'œuvre) | ⛔ | photo, mesure |
| 02 | Support sec, propre, angles en gorge | humidité compatible avec le produit | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 03 | Isolant thermique conforme (si prévu) | nature et épaisseur selon la note RTCM | Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 | document | Architecte (maître d'œuvre) |  | fiche technique, photo |
| 04 | Membrane conforme à la fiche technique | produit, nombre de couches, recouvrements soudés | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) | ⛔ | fiche technique, bon livraison |
| 05 | Relevés et protection des relevés | hauteur au-dessus de la protection selon le DTU (de l'ordre de 15 cm) | NF DTU 43.1 Étanchéité des toitures-terrasses | mesure | Architecte (maître d'œuvre) | ⛔ | photo |
| 06 | Entrées d'eau pluviale et trop-pleins | platines raccordées, crapaudines | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 07 | Essai de mise en eau 48 h sans fuite en sous-face | niveau d'eau constant, sous-face sèche | Essai de mise en eau des toitures et des bassins (DTU 43.1, CPS) | essai | Architecte (maître d'œuvre) | ⛔ | pv essai, photo |
| 08 | Protection mise en œuvre après essai | dalles, gravillons ou carrelage selon le CCTP | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Entreprise d'un corps d'état |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Menuiseries (`CL12_MENUISERIES`)

*النجارة* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_03_ENDUITS_MENUISERIES` — lot : Menuiseries (alu, bois, métallerie). Signataires : Entreprise d'un corps d'état, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Plans d'atelier et échantillons visés | visa de l'architecte avant fabrication | NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | document | Architecte (maître d'œuvre) | ⛔ | document |
| 02 | Dimensions, sens d'ouverture et vitrages | conformes au tableau des menuiseries ; double vitrage si prescrit | Décret 2-13-874 du 15/10/2014 (BO 6306 du 06/11/2014), en application de la loi 47-09 | mesure | Architecte (maître d'œuvre) |  | photo |
| 03 | Fixations et calage | selon le fabricant, menuiserie d'aplomb et de niveau | NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | mesure | Entreprise d'un corps d'état |  | photo |
| 04 | Calfeutrement et pièce d'appui | mastic continu, rejet d'eau | NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | visuel | Architecte (maître d'œuvre) |  | photo |
| 05 | Fonctionnement des ouvrants et quincaillerie | ouverture et fermeture sans effort, verrouillage | NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | essai | Architecte (maître d'œuvre) |  | — |
| 06 | Essai d'arrosage des façades exposées | aucune infiltration | NF DTU 36.5 (menuiseries extérieures), NF DTU 39 (vitrerie), NF EN 14351-1 | essai | Architecte (maître d'œuvre) |  | pv essai |
| 07 | Garde-corps : hauteur et vides | selon NF P01-012 | NF P01-012 Garde-corps | mesure | Architecte (maître d'œuvre) | ⛔ | mesure |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Revêtements (sols, murs, faux plafonds, peinture) (`CL13_REVETEMENTS`)

*التكسيات* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_04_FINITIONS` — lot : Revêtements et finitions. Signataires : Entreprise d'un corps d'état, Architecte (maître d'œuvre), Maître d'ouvrage (client).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Échantillons validés par le client | référence, teinte et lot de fabrication identiques | NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | document | Maître d'ouvrage (client) | ⛔ | fiche technique |
| 02 | Support sec et plan avant pose | humidité et planéité mesurées | NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | mesure | Entreprise d'un corps d'état |  | mesure |
| 03 | Calepinage respecté | départs et coupes selon le plan | NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | visuel | Architecte (maître d'œuvre) |  | photo |
| 04 | Planéité, désaffleurement, joints | tolérances du DTU (de l'ordre de 3 mm sous 2 m) | NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | mesure | Architecte (maître d'œuvre) |  | mesure |
| 05 | Pentes des douches et terrasses | écoulement vers le siphon | NF DTU 52.1 (revêtements scellés) et 52.2 (revêtements collés) | essai | Architecte (maître d'œuvre) |  | photo |
| 06 | Faux plafonds : niveau, trappes d'accès | trappes sous chaque équipement à entretenir | NF DTU 25.41 (plaques de plâtre) et 58.1 (plafonds suspendus) | visuel | Architecte (maître d'œuvre) |  | photo |
| 07 | Peinture : couches et aspect | impression et deux couches, aspect contractuel | NF DTU 59.1 Peinture | visuel | Architecte (maître d'œuvre) |  | photo |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Climatisation, chauffage, ventilation (`CL14_CVC`)

*التكييف والتهوية* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_05_EQUIPEMENTS_ESSAYES` — lot : Climatisation, chauffage, ventilation — seulement si : climatisation. Signataires : Entreprise d'un corps d'état, Bureau d'études fluides, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Liaisons frigorifiques isolées et éprouvées | épreuve à l'azote, tirage au vide | NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | essai | Bureau d'études fluides | ⛔ | pv essai, photo |
| 02 | Évacuation des condensats | pente, siphon, raccord au réseau EU | NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | essai | Architecte (maître d'œuvre) |  | photo |
| 03 | Unités extérieures fixées et accessibles | supports antivibratiles, accès d'entretien | NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | visuel | Architecte (maître d'œuvre) |  | photo |
| 04 | Ventilation des pièces humides | débits mesurés ou entrées et sorties d'air conformes | NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | mesure | Bureau d'études fluides |  | mesure |
| 05 | Mise en service | températures de soufflage, fonctionnement des commandes | NF DTU 65 (chauffage) et NF DTU 68.3 (ventilation mécanique) | essai | Bureau d'études fluides |  | pv essai |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Essais des réseaux (avant réception) (`CL15_ESSAIS_RESEAUX`)

*اختبار الشبكات قبل التسلم* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_05_EQUIPEMENTS_ESSAYES` — lot : Électricité courants forts. Signataires : Entreprise d'un corps d'état, Bureau d'études fluides, Architecte (maître d'œuvre), Bureau de contrôle technique.

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Résistance de la prise de terre | valeur mesurée inférieure au seuil retenu (voir NFC_15_100) | Mesure de la prise de terre (NF C 15-100) | essai | Bureau d'études fluides | ⛔ | pv essai |
| 02 | Déclenchement des différentiels 30 mA | chaque différentiel testé | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | essai | Bureau d'études fluides | ⛔ | pv essai |
| 03 | Continuité des conducteurs de protection et liaisons équipotentielles | salles d'eau, piscine, canalisations métalliques | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | essai | Bureau d'études fluides | ⛔ | pv essai |
| 04 | Repérage du tableau électrique | chaque circuit étiqueté, schéma dans le tableau | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | visuel | Architecte (maître d'œuvre) |  | photo |
| 05 | Pression et débit aux points d'eau | fonctionnement de tous les robinets et chasses | NF DTU 60.1 (plomberie sanitaire), 60.11 (dimensionnement), 60.33 (évacuations PVC) | essai | Architecte (maître d'œuvre) |  | — |
| 06 | Eau chaude : température et sécurité du chauffe-eau | groupe de sécurité, évacuation des gaz si chauffe-eau à gaz (marquage CMIM) | Loi 24-09 | essai | Architecte (maître d'œuvre) | ⛔ | photo |
| 07 | Courants faibles : recette des prises et de l'interphone | test de chaque prise réseau | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | essai | Architecte (maître d'œuvre) |  | pv essai |
| 08 | Sécurité incendie : essais de détection, alarme, désenfumage | en présence du bureau de contrôle | Décret 2-14-499 du 15/10/2014 et exigences de la protection civile | essai | Bureau de contrôle technique | ⛔ | pv essai |
| 09 | Ascenseur : contrôle de mise en service | rapport de l'organisme sans réserve bloquante | NM EN 81-20 et 81-50 (construction et essais des ascenseurs), NM EN 81-70 (accessibilité) — homologation NM à vérifier | document | Bureau de contrôle technique | ⛔ | pv essai |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### VRD et raccordements (`CL16_VRD_RACCORDEMENTS`)

*الطرق والشبكات والربط* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_06_EXTERIEURS` — lot : Voirie et réseaux divers. Signataires : Entreprise d'un corps d'état, Architecte (maître d'œuvre), Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Prescriptions du distributeur obtenues | plan de branchement validé | Règlements de service et cahiers des prescriptions des distributeurs (ONEE, sociétés régionales multiservices, Redal, Lydec, Amendis) | document | Architecte (maître d'œuvre) | ⛔ | document |
| 02 | Tranchées : profondeur, lit de pose, grillage avertisseur | selon le CCTP et le distributeur | Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | mesure | Architecte (maître d'œuvre) | ⛔ | photo |
| 03 | Pentes des collecteurs et cotes fil d'eau | conformes au profil en long | Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | mesure | Bureau d'études VRD | ⛔ | mesure |
| 04 | Regards : étanchéité, cunettes, tampons | tampons de classe adaptée au trafic | Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | visuel | Architecte (maître d'œuvre) |  | photo |
| 05 | Essais d'étanchéité ou inspection des collecteurs | exigés par le distributeur pour les réseaux publics | Règlements de service et cahiers des prescriptions des distributeurs (ONEE, sociétés régionales multiservices, Redal, Lydec, Amendis) | essai | Distributeur d'eau et d'électricité (ONEE, société régionale multiservices ou délégataire) | ⛔ | pv essai |
| 06 | Compactage des remblais de tranchées et des couches de chaussée | seuil Proctor du CCTP | Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | essai | Laboratoire d'essais | ⛔ | pv essai |
| 07 | Récolement géoréférencé avant fermeture | relevé topographique des réseaux | Loi 30-93 (dahir 1-94-126 du 25/02/1994) | mesure | Ingénieur géomètre-topographe |  | document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Piscine (`CL17_PISCINE`)

*المسبح* — phase : Second œuvre, équipements et extérieurs — jalon : `J10_06_EXTERIEURS` — lot : Aménagements extérieurs et piscine — seulement si : piscine. Signataires : Entreprise d'un corps d'état, Bureau d'études structure, Architecte (maître d'œuvre).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Ferraillage du bassin avant coulage | conforme au plan BA, pièces à sceller (skimmers, refoulements, bonde) en place | NF DTU 21 Exécution des ouvrages en béton | mesure | Bureau d'études structure | ⛔ | photo |
| 02 | Essai d'étanchéité du bassin brut | niveau stable sur plusieurs jours | Essai de mise en eau des toitures et des bassins (DTU 43.1, CPS) | essai | Architecte (maître d'œuvre) | ⛔ | pv essai |
| 03 | Canalisations hydrauliques éprouvées | épreuve en pression avant remblai | Épreuve des réseaux d'eau (DTU 60.1, CPS) | essai | Architecte (maître d'œuvre) | ⛔ | pv essai |
| 04 | Électricité : très basse tension et équipotentialité | éclairage 12 V, liaison équipotentielle du bassin | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | essai | Bureau d'études fluides | ⛔ | pv essai |
| 05 | Dispositif de sécurité contre la noyade | barrière, couverture ou alarme selon le choix du client (aucune obligation marocaine identifiée, à vérifier) | NF C 15-100 (référence contractuelle) et norme marocaine des installations basse tension (NM 06.1.100 présumée, à vérifier) | visuel | Architecte (maître d'œuvre) |  | photo |
| 06 | Mise en service de la filtration | débit, temps de recyclage selon le pisciniste | Fascicule 70 du CCTG français (assainissement), catalogue marocain des structures de chaussées, normes NM EN des tuyaux (références à vérifier) | essai | Entreprise d'un corps d'état |  | pv essai |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Pré-réception (opérations préalables) (`CL18_PRE_RECEPTION`)

*العمليات السابقة للتسلم* — phase : Réception provisoire et levée des réserves — jalon : `J11_01_OPR` — lot : Architecture. Signataires : Architecte (maître d'œuvre), Entreprise de gros œuvre ou générale, Maître d'ouvrage (client).

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Tous les PV d'essais présents | CL09, CL11, CL14 à CL17 signées selon le projet | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) | ⛔ | pv |
| 02 | Visite pièce par pièce et liste des réserves | chaque réserve numérotée, localisée, photographiée, avec lot et délai | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | visuel | Architecte (maître d'œuvre) |  | photo |
| 03 | Nettoyage de fin de chantier | bâtiment et abords propres, gravats évacués | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | visuel | Architecte (maître d'œuvre) |  | photo |
| 04 | DOE remis ou en cours | plans de récolement, notices, garanties | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) |  | document |
| 05 | Rapport final du bureau de contrôle sans réserve bloquante | réserves techniques levées (sinon exclusion possible de la décennale) | Loi 17-99 (code des assurances) modifiée par la loi 59-13, art. 157-1 à 157-13 ; arrêtés 3201-24 et 3202-24 (BO 7365 du 30/12/2024) | document | Bureau de contrôle technique | ⛔ | document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Réception provisoire avec réserves (`CL19_RECEPTION_PROVISOIRE`)

*التسلم المؤقت مع التحفظات* — phase : Réception provisoire et levée des réserves — jalon : `J11_02_RECEPTION_PROVISOIRE` — lot : Architecture. Signataires : Maître d'ouvrage (client), Architecte (maître d'œuvre), Entreprise de gros œuvre ou générale.

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Ouvrage conforme au marché et en état d'être utilisé | réserves mineures seulement ; une réserve majeure justifie un refus de réception | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 02 | Liste des réserves annexée et acceptée par l'entreprise | délai de levée par réserve | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) | ⛔ | document |
| 03 | Date d'effet de la réception | date de départ de la garantie d'un an et de la décennale | Dahir des obligations et contrats, art. 769 (et 770) | document | Architecte (maître d'œuvre) | ⛔ | document |
| 04 | Remise des clés et relevés des compteurs | PV de remise | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Maître d'ouvrage (client) |  | document |
| 05 | Retenue de garantie et cautions en place | 10 % de chaque situation plafonnée à 7 %, ou caution (selon le marché) | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Maître d'ouvrage (client) |  | document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Levée des réserves (`CL20_LEVEE_RESERVES`)

*رفع التحفظات* — phase : Réception provisoire et levée des réserves — jalon : `J11_03_LEVEE_RESERVES` — lot : Architecture. Signataires : Architecte (maître d'œuvre), Maître d'ouvrage (client), Entreprise de gros œuvre ou générale.

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Chaque réserve vérifiée sur place | levée (photo après) ou maintenue (nouveau délai) | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 02 | Réserves hors délai : mise en demeure | courrier type envoyé par la plateforme | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) |  | document |
| 03 | DOE complet | toutes les pièces de la matrice des livrables (DOE) | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) | ⛔ | document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

### Réception définitive (`CL21_RECEPTION_DEFINITIVE`)

*التسلم النهائي* — phase : Année de garantie et réception définitive — jalon : `J13_02_RECEPTION_DEFINITIVE` — lot : Architecture. Signataires : Maître d'ouvrage (client), Architecte (maître d'œuvre), Entreprise de gros œuvre ou générale.

| N° | Point de contrôle | Critère ou tolérance | Référence | Méthode | Contrôleur | Arrêt | Pièces jointes |
|---|---|---|---|---|---|---|---|
| 01 | Délai de garantie écoulé | 12 mois après la réception provisoire sauf autre durée au marché | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Architecte (maître d'œuvre) | ⛔ | document |
| 02 | Désordres de l'année réparés | registre des désordres soldé | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | visuel | Architecte (maître d'œuvre) | ⛔ | photo |
| 03 | Contrôle de l'étanchéité et des façades après un hiver | aucune infiltration | NF DTU 43.1 Étanchéité des toitures-terrasses | visuel | Architecte (maître d'œuvre) |  | photo |
| 04 | Décompte général et définitif signé | solde de tout compte | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Maître d'ouvrage (client) | ⛔ | document |
| 05 | Restitution de la retenue et mainlevée des cautions | après signature du PV seulement | Décret 2-14-394 du 13/05/2016 (en vigueur au 01/10/2016) | document | Maître d'ouvrage (client) | ⛔ | document |

Décision possible : Autorisé à poursuivre (point d'arrêt levé) / Autorisé sous réserve de levée avant l'étape suivante / Refusé : reprise et nouvelle visite.

