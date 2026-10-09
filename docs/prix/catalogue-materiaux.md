# Catalogue unique de référence des matériaux

- **Source de vérité :** `apps/web/src/domain/materiaux/catalogue.ts` (version `CATALOGUE_VERSION`), types dans `types.ts`, conversions dans `conversions.ts`.
- **Tests :** `apps/web/src/domain/materiaux/catalogue.test.ts` (réconciliation, conversions, médiane, seuil d'aberration).
- **Utilisé par :** les fiches de prix fournisseurs (Cercles), `GET /api/prix/materiaux`, la page publique des prix, et le moteur de chiffrage (`apps/web/src/domain/chiffrage/`, autre chantier) via le contrat `docs/prix/contrat-fournisseurs-chiffrage.md`.

## Codes

`CIT-<PFX>-NNN`, stables, jamais renumérotés (un matériau retiré passe `actif: false`).

| Préfixe | Domaine | Origine |
|---|---|---|
| GO, ET, VRD, EL, PL, CVC, SM, FP, MB, REV, AL | gros œuvre, étanchéité, VRD, électricité, plomberie, CVC, métallerie, faux plafonds, menuiserie bois, revêtements, menuiserie alu | codes TerriScan (`mapping.json`) repris **à l'identique** pour les 122 clés, numérotation prolongée |
| IS, PE, MA, QU | isolation, peinture, marbre/pierre/zellige, quincaillerie | nouveaux préfixes |

280 matériaux dans la version 2026-10.1.

## Réconciliation des quatre sources

| Source | Taille | Traitement |
|---|---|---|
| Matériauthèque TerriScan (`referentiel_cps/terriscan_referentiel/mapping.json` + `prix_materiautheque_2026.json`) | 122 | chaque clé → `alias.terriscan`, même code CIT |
| Seed marketplace (`apps/api/scripts/seed-referentiel.ts`) | 197 | 185 noms → `alias.seed` ; 12 outils/consommables (truelle, brouette, pinceau…) listés dans `HORS_CATALOGUE_SEED` |
| `apps/api/data/materials/catalog.json` | 80 | chaque code → `alias.catalog` |
| Recherche de prix 2026-10 (`docs/prix/recherche/materiaux-*.md`) | 558 relevés | prix de référence B (médiane des sources B) repris dans `prix` ; sinon prix indicatif C |

Le test vérifie que chaque nom/code des trois premières sources apparaît **une seule fois**. Les variantes (Ø6 à Ø25, ST10/25/50, PVC Ø40/100/125, chauffe-eau 50/100/200 L…) ont un `parent` générique : leurs prix ramenés à l'unité de référence alimentent aussi la médiane du parent.

## Unités

- **`uniteRef`** : unité de comptage du composant dans un sous-détail (kg, t, m3, m2, ml, u, l, ens). Tous les prix comparés sont ramenés à cette unité, **HT**.
- **`ventes`** : unités de vente avec `facteur` = quantité d'uniteRef dans une unité de vente. Exemples : sac 50 kg de ciment = 50 kg ; barre 12 m de HA Ø12 = 12 × 0,888 = 10,656 kg ; couronne 100 m = 100 ml ; rouleau de membrane = 10 m² ; seau 30 kg de peinture = 30 kg ; tonne de sable ≈ 0,625 m³ (`approx: true`, masse volumique 1,6 t/m³).
- L'unité de référence elle-même est toujours vendable (facteur 1).
- Changement d'unité assumé par rapport à TerriScan : ciment, chaux, mortiers, colles, enduits et peintures passent du **sac / pot** au **kg** (les sous-détails dosent en kg ; la recherche normalise la peinture en DH/kg).

Cela règle les « unités incompatibles » relevées dans `docs/prix/recherche/prix-internes.md` §2.4 (acier en T / barre / kg, peinture en L / pot, membranes en m² / rouleau…).

Conversions disponibles : `prixParUniteRef`, `prixParUniteVente`, `quantiteACommander` (ex. 840 kg de ciment → 17 sacs de 50 kg).

## Prix et fiabilité

- **B** : médiane des sources B de la recherche 2026-10 (aucune source A n'existe publiquement).
- **C** : indicatif (matériauthèque 2026-07, seed, guides).
- **A** : réservé aux **prix marché fournisseurs** (médiane d'au moins 3 fiches approuvées récentes, `GET /api/prix/materiaux`) : c'est le « panel de négociants » recommandé par la recherche, alimenté par les inscrits Cercles.
- Un prix fournisseur hors **±50 %** de `prix.ref` est **signalé** à la modération (`prixAberrant`), jamais bloqué.

## Pourquoi pas de table Neon « MaterialRef »

Le catalogue est versionné dans le dépôt (revue de code, tests, aucune dérive entre front et fonctions : les Pages Functions importent le même module). Les tables Neon ne stockent que des **codes** CIT (fiches de prix, demandes). Une table pourra être ajoutée si l'administration doit éditer le catalogue sans déploiement.
