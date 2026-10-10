# Synthèse des relectures — villa jumelée 294 m², R+1 + sous-sol

Le 2026-10-10, trois relectures ont été croisées :
- le moteur CITURBAREA et la relecture de Claude ;
- la recherche web « coût par lot × standing » (docs/prix/recherche/cout-par-lot-standing.md) ;
- le contre-audit de GPT.

Règle suivie : le moteur n'est corrigé que là où **au moins deux avis convergent**. Le reste attend des plans, l'étude de sol, le BET ou un arbitrage de l'architecte. GPT recommande lui-même de « ne pas remplacer le barème par ses valeurs » avant d'avoir corrigé la géométrie et défini les prestations par standing.

## 1. Corrections appliquées au moteur (convergence d'au moins deux avis)

| Point | Claude | Recherche | GPT | Correction appliquée |
|---|---|---|---|---|
| Cuisine aménagée absente | — | 15 000 à 70 000 DH (courante), jusqu'à 300 000 DH | Omission majeure : 15 / 30 / 50 / 100 / 200 kDH selon le standing | Forfait cuisine par standing, au montant proposé par GPT (provision H). Hors comparaison avec la grille, qui exclut la cuisine |
| Électricité basse | Signalé (99 DH/m²) | −50 à −65 % | Fondé : 170 DH/m² en moyen standing | Luminaires LED de base (prix réel Kénitra, fiabilité A), tableaux d'étage, 8 circuits spécialisés, éclairage extérieur → 124 DH/m² en moyen standing |
| Plomberie basse | Signalé (121 DH/m²) | −50 % en moyen standing | Fondé : réseaux à compléter | Alimentation générale (regard compteur, nourrices), descentes d'eaux pluviales (oubli du métré) → 139 DH/m² en moyen standing |
| Ferronnerie basse | — | −55 à −73 % | Provision insuffisante | Grilles de défense (50 % des baies, du très économique au standing) ; garde-corps d'escalier à 6 ml par volée |
| Faïence courte | — | −60 à −80 % | Quantité à vérifier, sans hausse automatique | 22 m² par salle de bain (au lieu de 18), crédence 8 m², WC invités 6 m² ; pas d'indexation sur le standing |
| Façades premium | Signalé | −50 % | Moteur crédible pour une façade simple, insuffisant en premium | Part de pierre : standing 20 %, haut standing 40 %, luxe 60 % ; moyen standing inchangé |
| Semelles et voile | Double comptage possible | — | À vérifier, sans double comptage démontré | Semelles isolées réduites de 30 % avec un sous-sol (hypothèse `ss.reductionSemelles`) → lot 02 : 349 580 → 327 727 DH (cible GPT ≈ 320 000) |
| Édicule de 24 m² | Sous-métré | — | Fondé si l'édicule est fermé | Murs, enduits et toiture de l'édicule métrés à part |

## 2. Effet sur le projet (travaux HT, avec sous-sol, Salé)

| Standing | Moteur avant | Moteur recalé | GPT | Écart recalé / GPT |
|---|--:|--:|--:|--:|
| Très économique (tâcheron) | 1 258 040 | **1 306 116** | 1 313 148 | −1 % |
| Moyen standing | 1 628 965 | **1 708 493** | 1 821 708 | −6 % |
| Standing | 1 914 651 | **2 040 031** | 2 268 336 | −10 % |
| Haut standing | 2 335 423 | **2 513 263** | 3 054 714 | −18 % |
| Luxe | 2 853 437 | **3 155 690** | 4 351 286 | −27 % |

Prix au m² du bâtiment seul (hors clôture, réseaux et cuisine), sous-sol compris : 3 216 / 4 194 / 5 013 / 6 117 / 7 519 DH HT. Le très économique reste proche des 3 000 DH/m² attendus ; sans sous-sol, il est à 3 123 DH/m².

## 3. Points non corrigés : en attente de décision

1. **Haut standing et luxe** (−18 % et −27 % par rapport à GPT, −18 % et −25 % par rapport à la grille). GPT, la recherche et Claude s'accordent sur le sous-dosage, mais pas sur le contenu. Il faut d'abord une **matrice des prestations par standing** (ce qui est inclus, exclu ou en option), à arrêter par l'architecte : sols, menuiseries, climatisation, domotique, éclairage, extérieurs.
2. **Voile de soutènement** (20 cm, B30, 100 kg/m³) : à valider par le BET (poussées, côté mitoyen coulé contre blindage, une seule face coffrée).
3. **Blindage** : le moteur ne le prévoit que du côté mitoyen. Les autres côtés (talus possible ou non, constructions voisines, accès) dépendent du site.
4. **Prix d'évacuation des déblais** (60 DH/m³ sans source) : à remplacer par un devis de terrassier.
5. **Clôture** : la formule fondée sur √terrain est fragile. Saisir le linéaire réel du plan de bornage.
6. **Sol argileux moins cher que sol moyen** : la variante est cohérente au métré, mais ce n'est pas une preuve de faisabilité (GPT : « techniquement admissible d'abord »).
7. **Tâcheron (K × 0,83)** : conservé comme scénario, pas comme coefficient universel. Il faut distinguer fournitures, main-d'œuvre, sous-traitance, risques et fiscalité.
8. **Structure en haut standing et luxe** : la recherche indexe la structure sur le standing (+34 à +52 %). GPT et Claude retiennent une structure peu dépendante des finitions. Pas de correction.

## 4. Ce qui ferait passer l'estimation en fiabilité A

- Les plans de l'architecte : géométrie réelle, tableau des menuiseries, plans des salles de bain.
- La descente de charges et le plan de coffrage du BET.
- L'étude de sol.
- Trois devis réels de villas comparables (gros œuvre, électricité, plomberie, menuiserie), avec ville et date.
