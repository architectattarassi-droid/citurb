# CITURBAREA — Module Devis & Facturation
## Canevas fonctionnel complet pour implémentation

> **Destinataire** : chat en charge du développement CITURBAREA.
> **Source** : trois devis réels produits pour ARC-BATI ARCHITECTURE (Ouazzane, Casablanca, Mehdaoui), reconstitués ici sous forme de spécification.
> **Objectif** : générer tout devis et toute facture directement depuis CITURBAREA, par mission isolée ou pour un projet complet, sans rédaction manuelle.
> **Version** : 1.0 — 14 octobre 2026

---

## 0. Périmètre

### Dans le périmètre
- Catalogue de prestations et grille tarifaire versionnée du cabinet.
- Moteur de métré et de calcul du coût prévisionnel des travaux.
- Calcul des honoraires d'architecte et de leurs quotes-parts.
- Trois modes de tarification : **au pourcentage**, **au forfait**, **à l'unité** (visite, étage, pièce).
- Assemblage en **packs** (offres exclusives présentées côte à côte).
- Génération du devis (PDF + DOCX), acceptation, conversion en facture(s), suivi des encaissements.
- Facturation par mission (tranche) ou pour le projet complet.

### Hors périmètre (v1)
- Comptabilité générale, liasse fiscale, déclaration TVA.
- Facturation des autres intervenants (BET, laboratoire, géomètre) : le cabinet les référence « sur devis », il ne les refacture pas.
- Signature électronique qualifiée (prévoir le champ, pas l'implémentation).

---

## 1. Modèle de données

### 1.1 Entités

```
Client
Projet
  └── Metre (1..1)         — le relevé de surfaces
  └── Devis (0..n)
        └── LigneDevis (1..n)
        └── Pack (0..n)    — variantes exclusives d'un même devis
  └── Facture (0..n)
        └── LigneFacture (1..n)
        └── Encaissement (0..n)
GrilleTarifaire (versionnée, indépendante des projets)
  └── Prestation (1..n)
```

### 1.2 `Client`

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `civilite` | enum | `M.` \| `Mme` \| `Société` |
| `nom`, `prenom` | string | rendu « Monsieur Rida MEHDAOUI » — nom en capitales |
| `raisonSociale` | string? | si `Société` |
| `ice`, `if`, `rc` | string? | identifiants fiscaux marocains, **obligatoires sur facture** si société |
| `adresse`, `ville` | string | |
| `telephone`, `email` | string | |
| `compteActif` | bool | a créé son compte sur citurbarea.com |

### 1.3 `Projet`

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `clientId` | uuid | |
| `intitule` | string | « Construction d'un immeuble R+1 » |
| `typologie` | enum | `MAISON_INDIVIDUELLE` \| `IMMEUBLE` \| `VILLA` \| `LOCAL_COMMERCIAL` \| `AMENAGEMENT_INTERIEUR` |
| `gabarit` | string | `R+2`, `R+3+SS`, `R+1` — voir 2.1 pour le parsing |
| `lot` | string? | « Lot n° 624 » |
| `lotissement` | string? | « Lotissement Alliance Darna » |
| `commune` | string | « Mehdiya » |
| `prefecture` | string | « Kénitra » |
| `titreFoncier` | string? | « TF 84848/13 » |
| `autorisationNum` | string? | « GUcmha-0036/2023 » |
| `autorisationDate` | date? | |
| `autorisationExpiration` | date? | pilote l'alerte de renouvellement (voir 8.4) |
| `etatChantier` | text? | « Permis d'habiter partiel délivré pour le rez-de-chaussée » |

> **Règle** : `commune` et `prefecture` sont séparées — le texte de mission nomme la commune (« dépôt auprès de la Commune de Mehdiya »), l'en-tête affiche les deux.

### 1.4 `Metre` — relevé de surfaces

| Champ | Type | Notes |
|---|---|---|
| `superficieTerrain` | decimal | m² |
| `deductionEmprise` | decimal | retrait / passage non bâti — Ouazzane : 12 m² |
| `surfaceCour` | decimal | déduite des niveaux concernés |
| `encorbellementProfondeur` | decimal? | en m — Casablanca : 2 |
| `empriseEtageAvecEncorbellement` | decimal? | surface au sol d'un étage en débord — Casablanca : 192 m² |
| `niveaux` | Niveau[] | voir ci-dessous |

`Niveau` :

| Champ | Type | Valeurs |
|---|---|---|
| `code` | enum | `SOUS_SOL` \| `RDC` \| `ETAGE` \| `TERRASSE` \| `MEZZANINE` |
| `rang` | int | 0 pour RDC, 1..n pour étages, −1 pour sous-sol |
| `usage` | enum | `HABITATION` \| `COMMERCIAL` \| `PARKING` \| `TECHNIQUE` |
| `surface` | decimal | m² — calculée (voir 2.2) ou saisie |
| `surfaceSource` | enum | `CALCULEE` \| `SAISIE` — traçabilité |
| `deductionCour` | bool | la cour est-elle déduite à ce niveau |

> **Point ouvert à trancher dans l'UI** (les deux cas ont dû être supposés sur le devis Casablanca) :
> 1. Le sous-sol prend-il l'emprise totale du terrain ou l'emprise réduite ?
> 2. La cour est-elle déduite au RDC, ou seulement aux étages ?
> → **Exiger une réponse explicite à la saisie**, ne jamais supposer. Afficher un bandeau d'hypothèse sur le devis tant que non tranché.

### 1.5 `GrilleTarifaire` et `Prestation`

La grille est **versionnée et datée** : un devis émis fige la version de grille utilisée (`grilleVersionId`), de sorte qu'un devis ancien reste reproductible.

| Champ `Prestation` | Type | Notes |
|---|---|---|
| `code` | string | `HON_CONCEPTION`, `HON_AUTORISATION`, `HON_CHANTIER`, `HON_DECO`, `BA`, `GEOTECH`, `TOPO`, `CTRL_BET`, `DEPOT_RENOUV`, `3D_INT` |
| `libelle` | string | « Dépôt et suivi de l'autorisation de construire » |
| `descriptif` | text | la ligne en italique sous le titre |
| `modeTarification` | enum | `POURCENTAGE_HONORAIRES` \| `POURCENTAGE_TRAVAUX` \| `FORFAIT` \| `UNITAIRE` |
| `valeur` | decimal | 30 (%) \| 5000 (DH) \| 500 (DH/unité) |
| `unite` | enum? | `VISITE` \| `ETAGE` \| `PIECE` \| `M2` |
| `caractere` | enum | `OBLIGATOIRE` \| `FACULTATIVE` \| `RECOMMANDEE` \| `SUR_DEMANDE` |
| `intervenant` | enum | `ARCHITECTE` \| `BUREAU_ETUDES` \| `LABORATOIRE` \| `GEOMETRE` |
| `horsHonoraires` | bool | n'entre pas dans l'assiette des 5 % |
| `actif` | bool | |

### 1.6 Grille ARC-BATI à charger en données de départ

**Honoraires d'architecte** — assiette : 5 % du coût prévisionnel des travaux.

| Code | Libellé | Quote-part | Caractère |
|---|---|---|---|
| `HON_CONCEPTION` | Plan personnalisé — 3 variantes + rendus 3D + modifications jusqu'à version finale | 40 % | Facultative |
| `HON_AUTORISATION` | Dépôt et suivi de l'autorisation de construire | 30 % | Obligatoire |
| `HON_CHANTIER` | Suivi de chantier et permis d'habiter | 30 % | Obligatoire |
| `HON_DECO` | Décoration et aménagement intérieur | 30 % | Facultative (s'ajoute aux 100 %) |

**Prestations hors honoraires**

| Code | Libellé | Tarif | Caractère | Intervenant |
|---|---|---|---|---|
| `BA` | Plans de béton armé et note de calcul | 2 000 DH* | Obligatoire | Bureau d'études |
| `GEOTECH` | Étude géotechnique | 6 000 DH* | Recommandée | Laboratoire |
| `TOPO` | Plan topographique | 2 500 DH* | Sur demande | Géomètre |
| `CTRL_BET` | Contrôle technique de chantier | 500 DH / visite | Obligatoire | Bureau d'études |
| `3D_INT` | 3D intérieure et décoration | 20 000 DH / étage (jusqu'à 5 pièces habitables) | Sur demande | Architecte |
| `DEPOT_RENOUV` | Dépôt et obtention d'une nouvelle décision d'autorisation | 5 000 DH forfait | — | Architecte |

> \* **Ces trois montants sont calibrés sur une maison individuelle.** Ils ne tiennent pas pour un immeuble R+3 avec sous-sol : sur le devis Casablanca, ils ont été laissés en « Sur devis ». Le module doit porter un **seuil de validité par typologie** sur chaque prestation forfaitaire, et basculer automatiquement en « Sur devis » hors de ce domaine, plutôt que d'appliquer un prix faux.

```
Prestation.domaineValidite: {
  typologies: ['MAISON_INDIVIDUELLE'],
  surfacePlancherMax: 400,
  niveauxMax: 3,
  sousSol: false
}
```

**Base de calcul du coût des travaux**

| Poste | PU observé | Assiette |
|---|---|---|
| Élévation / construction | 2 500 DH/m² (maison Ouazzane) · 3 000 DH/m² (immeuble Casablanca) | surface de plancher totale |
| Fondations | 600 DH/m² | emprise au sol, **un seul niveau** |

> Le PU d'élévation est saisi par projet, jamais codé en dur. Proposer une valeur par défaut selon `typologie` et `commune`, modifiable.

### 1.7 `Devis`

| Champ | Type | Notes |
|---|---|---|
| `id`, `numero` | uuid, string | voir 6.1 |
| `projetId` | uuid | |
| `grilleVersionId` | uuid | fige la grille |
| `type` | enum | `MISSION_COMPLETE` \| `MISSION_PARTIELLE` \| `COMPLEMENTAIRE` |
| `dateEmission` | date | |
| `validiteJours` | int | défaut 30 |
| `coutPrevisionnelTravaux` | decimal | gelé à l'émission |
| `assietteHonoraires` | decimal | = coût × taux |
| `tauxHonoraires` | decimal | défaut 5 % |
| `presentation` | enum | `DETAILLEE` \| `PACKS` — voir 4 |
| `statut` | enum | voir 6.2 |
| `hypotheses` | text[] | les suppositions de métré à afficher au client |
| `modalitesPaiement` | enum | voir 5.3 |
| `packChoisiId` | uuid? | renseigné à l'acceptation si `PACKS` |

### 1.8 `LigneDevis`

| Champ | Type |
|---|---|
| `prestationCode`, `libelle`, `descriptif` | string |
| `modeTarification`, `quotePart`, `quantite`, `prixUnitaire` | — |
| `montant` | decimal (calculé, voir 2.4) |
| `caractere`, `intervenant`, `horsHonoraires` | enum / bool |
| `groupe` | enum | `A_HONORAIRES_OBLIGATOIRES` \| `B_TECHNIQUE_OBLIGATOIRE` \| `C_FACULTATIF` \| `D_SUR_DEMANDE` |
| `packId` | uuid? |

> Le champ `groupe` existe parce qu'un client a confondu honoraires d'architecte et prestations de bureau d'études. **Le rendu doit séparer physiquement les deux**, avec l'intervenant nommé sur chaque ligne et un sous-total par groupe.

### 1.9 `Facture` / `Encaissement`

| Champ `Facture` | Type | Notes |
|---|---|---|
| `numero` | string | séquence légale, sans trou — voir 6.1 |
| `devisId` | uuid? | une facture peut exister sans devis |
| `type` | enum | `ACOMPTE` \| `SITUATION` \| `SOLDE` \| `FORFAIT_UNIQUE` |
| `lignes` | LigneFacture[] | reprises du devis, montant partiel possible |
| `montantHT`, `tauxTVA`, `montantTVA`, `montantTTC` | decimal | TVA par défaut **20 %**, champ modifiable, mention « TVA applicable selon la réglementation en vigueur » si non assujetti |
| `retenueSource` | decimal? | prévoir le champ (prestations de services) |
| `dateEcheance` | date | |
| `statut` | enum | `BROUILLON` \| `EMISE` \| `PARTIELLEMENT_REGLEE` \| `REGLEE` \| `ANNULEE` |

`Encaissement` : `montant`, `date`, `mode` (`ESPECES` \| `CHEQUE` \| `VIREMENT` \| `EFFET`), `reference`, `justificatifUrl`.

> **Avoir, pas suppression** : une facture émise ne se supprime ni ne se modifie. Correction = avoir (`type: AVOIR`, montant négatif, référence à la facture d'origine).

---

## 2. Moteur de calcul

### 2.1 Parsing du gabarit

```
"R+2"      → RDC + 2 étages                    = 3 niveaux
"R+3+SS"   → sous-sol + RDC + 3 étages         = 5 niveaux
"R+1"      → RDC + 1 étage                     = 2 niveaux
```

Le parsing **propose** la liste de niveaux ; l'utilisateur confirme ou corrige. Jamais de niveau créé silencieusement.

### 2.2 Surfaces par niveau

```
surface(SOUS_SOL)  = superficieTerrain − deductionEmprise(sous-sol)          [paramètre à trancher]
surface(RDC)       = superficieTerrain − deductionEmprise − (deductionCour ? surfaceCour : 0)
surface(ETAGE_i)   = (empriseEtageAvecEncorbellement ?? (superficieTerrain − deductionEmprise)) − surfaceCour
surfacePlancher    = Σ surface(niveau)
```

Cas de référence :

| Projet | Calcul | Plancher |
|---|---|---|
| Ouazzane R+2 | (107 − 12) × 3 | 285 m² |
| Casablanca R+3+SS | 162 + (162−16) + (192−16)×3 | 836 m² |

### 2.3 Coût prévisionnel des travaux

```
coutElevation  = surfacePlancher × PU_elevation
coutFondations = emprise_au_sol  × PU_fondations          [un seul niveau]
coutTravaux    = coutElevation + coutFondations
```

Ouazzane : 285 × 2 500 + 95 × 600 = 712 500 + 57 000 = **769 500 DH**
Casablanca : 836 × 3 000 = **2 508 000 DH** (fondations non chiffrées séparément — à harmoniser)

> **Incohérence à résoudre** : le poste fondations a été isolé à Ouazzane, pas à Casablanca. Le module doit imposer un choix explicite : `fondationsIncluses: boolean`. Si `false`, le poste est obligatoire.

### 2.4 Montant d'une ligne

```
POURCENTAGE_HONORAIRES → montant = assietteHonoraires × quotePart
POURCENTAGE_TRAVAUX    → montant = coutTravaux × quotePart
FORFAIT                → montant = valeur
UNITAIRE               → montant = prixUnitaire × quantite
```

### 2.5 Arrondis

Calculs en décimal, **jamais en flottant**. Affichage à 2 décimales, séparateur de milliers espace insécable, suffixe « DH » : `125 400,00 DH`. Les quotes-parts produisent légitimement des centimes (30 % de 125 400 = 37 620,00 ; 30 % de 35 625 = 10 687,50) — ne pas arrondir à l'entier.

---

## 3. Catalogue de missions

Trois familles, toutes rencontrées :

### 3.1 Mission au pourcentage (projet neuf)
Assiette = coût des travaux. Répartition 40 / 30 / 30 (+30 % déco). C'est le cas Ouazzane et Casablanca.

### 3.2 Mission forfaitaire administrative
Indépendante du coût des travaux. Cas Mehdaoui : renouvellement d'autorisation expirée, 5 000 DH.
Autres forfaits à prévoir au catalogue :
- Dépôt et obtention d'une nouvelle décision d'autorisation (autorisation expirée)
- Demande de permis d'habiter (total ou partiel)
- Modificatif de plans sur projet autorisé
- Attestation de conformité
- Régularisation

### 3.3 Prestation unitaire
`CTRL_BET` à la visite, `3D_INT` à l'étage. Le suivi de chantier est **réglable au forfait ou à la visite**, au choix du client : prévoir le basculement sans recalculer le total.

> **Décompte des visites de contrôle** : la base usuelle est *fondations + une visite par dalle*. Sur le devis Ouazzane, le client a annoncé 6 visites (fondations + 5 dalles) pour un R+2, alors que le gabarit en appelle normalement 4. Le module **propose** le décompte déduit du gabarit, **signale l'écart** si l'utilisateur saisit autre chose, et n'impose rien.

---

## 4. Packs

Un devis peut présenter plusieurs offres **mutuellement exclusives**. Le client en coche une.

| Pack | Composition | Quote-part cumulée |
|---|---|---|
| **Essentiel** | `HON_AUTORISATION` + `HON_CHANTIER` | 60 % |
| **Personnalisé** | + `HON_CONCEPTION` | 100 % |
| **Premium** | + `HON_DECO` | 130 % |

Règles :
- Le pack Essentiel repose sur un **plan type 2D, sans variante, sans 3D et sans modification après validation**. Cette mention doit apparaître *dans la ligne même*, en évidence — c'est la source de litige la plus probable.
- Les packs sont exclusifs : la validation exige exactement un `packChoisiId`.
- Un pack est une composition de prestations, pas un prix figé : il se recalcule si l'assiette change.
- Le total des honoraires à 100 % (`assietteHonoraires`) reste affiché même quand le pack retenu n'en couvre que 60 %, afin que le client comprenne le rapport.

---

## 5. Gabarit de document

### 5.1 Devis — structure imposée

```
[En-tête cabinet]
  ARC-BATI ARCHITECTURE
  Yassine ATTARASSI — Architecte DENA, Ordre des Architectes du Maroc
  Bureau 6, Immeuble Meryam C — angle rue Chellah & Mbarek Doukkali, Kénitra
  +212 700 127 892 | architectattarassi@gmail.com
  [filet horizontal bleu nuit]

[Titre]      DEVIS D'HONORAIRES  (+ « — MISSION COMPLÉMENTAIRE » si type ≠ MISSION_COMPLETE)
[Sous-titre] objet du devis, en italique

[Tableau d'identification]
  Maître d'ouvrage · Maître d'œuvre · Projet · Situation · Titre foncier ·
  Autorisation initiale · État du chantier · Date du devis · Validité
  → les lignes vides sont masquées, pas remplies de pointillés, sauf si
    le document est imprimé pour remplissage manuel (flag `pourRemplissageManuel`)

1. BASE DE CALCUL          (si mission au pourcentage)
   Tableau : Niveau | Détail du calcul | Surface
   Le détail du calcul est affiché littéralement : « (192 − 16) × 3 »
   Note : le coût prévisionnel est une estimation, base de calcul des honoraires,
          et n'engage pas le coût réel de construction.

1'. OBJET DE LA MISSION    (si mission forfaitaire — remplace la section 1)

2. HONORAIRES
   Soit le tableau détaillé des quotes-parts, soit le tableau des trois packs.

3. PRESTATIONS HORS HONORAIRES D'ARCHITECTE
   Intervenant nommé sur chaque ligne. Sous-total propre.

4. EXCLUSIONS  /  MISSIONS SUR DEMANDE

5. RÉCAPITULATIF           (si plusieurs groupes)
   A — Honoraires obligatoires de l'architecte
   B — Prestations techniques obligatoires
   TOTAL À ENGAGER OBLIGATOIREMENT (A + B)
   C, D, E — facultatives, listées sous le total obligatoire

6. MODALITÉS

[Signatures]  Le maître d'ouvrage (nom + « Lu et approuvé ») | L'architecte
              Case à cocher du pack retenu si présentation PACKS

[Bandeau CITURBAREA]  — voir 5.4
```

### 5.2 Facture — différences

- Titre `FACTURE N° …`, mentions légales obligatoires : ICE, IF, RC, patente du cabinet **et** ICE du client si société.
- Ligne TVA explicite : HT / TVA 20 % / TTC.
- Référence au devis accepté et à la date d'acceptation.
- Mention de l'échéance et du mode de règlement attendu.
- Pas de section « base de calcul » : la facture reprend les lignes acceptées, pas le métré.

### 5.3 Modalités de paiement — énumération

| Code | Texte généré |
|---|---|
| `AVANCE_TOTALE` | « La totalité du forfait est payable d'avance, à la commande. Le dépôt du dossier n'est engagé qu'après encaissement. » |
| `50_50` | « 50 % à la commande, solde à la délivrance de la décision. » |
| `PAR_TRANCHES` | « Règlement par tranches, à l'achèvement de chaque mission. » |
| `PAR_VISITE` | « Suivi de chantier réglable à la visite ; nombre de visites arrêté au démarrage du chantier. » |

Mentions systématiques :
- Les frais et taxes communaux sont à la charge du maître d'ouvrage.
- Les délais de délivrance dépendent des services instructeurs et ne sont pas garantis par le cabinet.
- Montants en dirhams ; TVA applicable selon la réglementation en vigueur.
- Devis valable 30 jours ; son acceptation vaut ordre de service.

### 5.4 Bandeau CITURBAREA — pied de page de tout devis

```
[filet bleu nuit]
SUIVEZ VOTRE PROJET EN LIGNE
ARC-BATI met à votre disposition un espace client sur www.citurbarea.com :
avancement du dossier administratif, plans, pièces justificatives et échanges
avec le cabinet, consultables à tout moment.
Créez votre compte client sur www.citurbarea.com, ou demandez-nous une
invitation à l'adresse contact@citurbarea.com.
```

Si `client.compteActif = true`, remplacer par un lien direct vers le projet :
`www.citurbarea.com/projets/{projetId}` + QR code.

### 5.5 Charte

| Élément | Valeur |
|---|---|
| Police | Calibri (corps 10 pt, titres de section 11 pt gras, titre 13 pt) |
| Bleu nuit | `#1F3864` — titres, filets, nom du cabinet |
| Fond de tableau clair | `#EEF1F7` — en-têtes et lignes de total |
| Gris de libellé | `#F5F5F5` — colonne de gauche du tableau d'identification |
| Gris de descriptif | `#595959` italique 9 pt |
| Rouge d'alerte | `#C00000` — mentions restrictives (« plan type 2D, sans variantes ») |
| Or | `#7F6000` — pack Premium |
| Bordures | `#BFBFBF` extérieures, `#D9D9D9` intérieures |
| Marges | 2,0 cm haut/bas, 1,8 cm gauche/droite |

### 5.6 Sortie

- **PDF** : document de référence, celui qu'on envoie et qu'on archive.
- **DOCX** : exigé — le cabinet retouche à la main (nom du client, références administratives tardives).
- Les deux portent le même numéro et le même hash de contenu, stocké sur le devis.

---

## 6. Numérotation et cycle de vie

### 6.1 Numérotation

```
Devis   : DEV-{AAAA}-{NNNN}        ex. DEV-2026-0043
Facture : FAC-{AAAA}-{NNNN}        séquence stricte, sans trou, non réinitialisée en cours d'année
Avoir   : AVO-{AAAA}-{NNNN}
```

Séquence facture allouée **à l'émission**, jamais au brouillon.

### 6.2 Statuts du devis

```
BROUILLON → EMIS → ACCEPTE → FACTURE
                 ↘ REFUSE
                 ↘ EXPIRE   (dateEmission + validiteJours dépassée, job quotidien)
```

- `EMIS` fige : coût des travaux, grille tarifaire, surfaces, montants. Toute modification ultérieure crée une **révision** (`DEV-2026-0043-R2`), pas une écriture en place.
- `ACCEPTE` exige : pack choisi si présentation PACKS, date d'acceptation, et pièce justificative (devis signé scanné, ou acceptation horodatée dans l'espace client).

### 6.3 Du devis à la facture

Trois chemins :

1. **Projet complet** — une facture unique sur le total accepté.
2. **Par mission** — une facture par prestation ou groupe de prestations achevé. La ligne de devis porte alors un état d'avancement (`NON_FACTUREE` \| `PARTIELLEMENT_FACTUREE` \| `FACTUREE`).
3. **Acompte + solde** — l'acompte n'est rattaché à aucune ligne ; il s'impute au prorata à la facturation du solde.

**Invariant** : `Σ montants facturés (hors avoirs) ≤ montant du devis accepté`. Tout dépassement exige un devis complémentaire — c'est le mécanisme qui a servi pour le renouvellement d'autorisation Mehdaoui.

---

## 7. Règles de gestion (invariants)

1. Une prestation `horsHonoraires = true` n'entre jamais dans l'assiette des 5 %.
2. Les packs d'un même devis sont exclusifs ; exactement un est retenu à l'acceptation.
3. Un forfait hors de son `domaineValidite` s'affiche « Sur devis », jamais à son prix nominal.
4. Une prestation facultative non commandée n'est pas facturée, même si elle figure au devis.
5. Une facture émise est immuable ; correction par avoir uniquement.
6. Les hypothèses de métré non tranchées apparaissent explicitement sur le devis, dans `hypotheses`.
7. Le devis mentionne la commune d'instruction nommément dans le descriptif de la mission de dépôt.
8. Une mission déjà réglée par le client **ne reparaît pas en ligne facturable** — elle peut figurer en « état du chantier » à titre de contexte, sous un champ distinct. (Cas Mehdaoui : permis d'habiter partiel déjà délivré et payé.)
9. Le suivi de chantier est hors mission dès qu'il n'est pas explicitement coché.
10. Toute modification de plans par rapport à l'autorisation initiale constitue une mission distincte.

---

## 8. Fonctions attendues de l'espace client

1. **Consultation** du devis, des factures et de leur état de règlement.
2. **Acceptation en ligne** avec choix du pack, horodatée, valant ordre de service.
3. **Téléchargement** PDF et DOCX.
4. **Alerte d'expiration d'autorisation** : à J−90 de `autorisationExpiration`, notifier le client et proposer au cabinet un devis de renouvellement pré-rempli depuis le catalogue (`DEPOT_RENOUV`). C'est exactement le cas Mehdaoui, que rien n'avait anticipé.
5. **Avancement du dossier administratif** adossé aux missions du devis : chaque prestation acceptée devient une étape suivie.

---

## 9. Jeux de données de recette

Les trois devis réels, à reproduire au centime près pour valider le moteur.

### 9.1 Ouazzane — R+2, mission au pourcentage détaillée

```json
{
  "projet": { "intitule": "Construction d'une maison individuelle R+2",
              "typologie": "MAISON_INDIVIDUELLE", "gabarit": "R+2", "commune": "Ouazzane" },
  "metre": { "superficieTerrain": 107, "deductionEmprise": 12,
             "niveaux": [ {"code":"RDC","surface":95}, {"code":"ETAGE","rang":1,"surface":95},
                          {"code":"ETAGE","rang":2,"surface":95} ] },
  "pu": { "elevation": 2500, "fondations": 600 },
  "attendu": {
    "surfacePlancher": 285,
    "coutElevation": 712500, "coutFondations": 57000, "coutTravaux": 769500,
    "assietteHonoraires": 38475,
    "HON_CONCEPTION": 15390, "HON_AUTORISATION": 11542.50, "HON_CHANTIER": 11542.50,
    "BA": 2000, "CTRL_BET": 3000, "GEOTECH": 6000, "TOPO": 2500,
    "totalObligatoire": 28085,
    "totalToutesPrestations": 51975
  }
}
```

### 9.2 Casablanca — R+3+SS, présentation en packs

```json
{
  "projet": { "intitule": "Construction d'un immeuble R+3 avec sous-sol",
              "typologie": "IMMEUBLE", "gabarit": "R+3+SS", "commune": "Casablanca" },
  "metre": { "superficieTerrain": 162, "surfaceCour": 16,
             "encorbellementProfondeur": 2, "empriseEtageAvecEncorbellement": 192,
             "niveaux": [ {"code":"SOUS_SOL","rang":-1,"usage":"PARKING","surface":162},
                          {"code":"RDC","rang":0,"usage":"COMMERCIAL","surface":146},
                          {"code":"ETAGE","rang":1,"usage":"HABITATION","surface":176},
                          {"code":"ETAGE","rang":2,"usage":"HABITATION","surface":176},
                          {"code":"ETAGE","rang":3,"usage":"HABITATION","surface":176} ] },
  "pu": { "elevation": 3000 },
  "hypotheses": [
    "Sous-sol compté à l'emprise totale du terrain, sans déduction de cour",
    "Cour de 16 m² déduite également au RDC"
  ],
  "attendu": {
    "surfacePlancher": 836, "coutTravaux": 2508000, "assietteHonoraires": 125400,
    "packEssentiel": 75240, "packPersonnalise": 125400, "packPremium": 163020,
    "HON_CONCEPTION": 50160, "HON_AUTORISATION": 37620,
    "HON_CHANTIER": 37620, "HON_DECO": 37620
  }
}
```

### 9.3 Mehdaoui — R+1, mission forfaitaire complémentaire

```json
{
  "client": { "civilite": "M.", "prenom": "Rida", "nom": "MEHDAOUI" },
  "projet": { "intitule": "Construction d'un immeuble R+1", "gabarit": "R+1",
              "lot": "Lot n° 624", "lotissement": "Lotissement Alliance Darna",
              "commune": "Mehdiya", "prefecture": "Kénitra",
              "titreFoncier": "TF 84848/13",
              "autorisationNum": "GUcmha-0036/2023",
              "autorisationExpiration": "expirée",
              "etatChantier": "Permis d'habiter partiel délivré pour le rez-de-chaussée" },
  "devis": { "type": "COMPLEMENTAIRE", "presentation": "DETAILLEE",
             "modalitesPaiement": "AVANCE_TOTALE",
             "lignes": [ { "prestationCode": "DEPOT_RENOUV", "montant": 5000 } ],
             "exclusions": ["Taxes et redevances communales",
                            "Modification du projet autorisé",
                            "Prestations des autres intervenants",
                            "Suivi de chantier"] },
  "attendu": { "total": 5000, "sectionBaseDeCalcul": false }
}
```

---

## 10. Points à trancher avant implémentation

1. **Sous-sol et cour** : règle de déduction par niveau, à figer dans l'UI de métré (§1.4).
2. **Fondations** : poste systématiquement isolé, ou PU d'élévation réputé tout compris ? Les deux pratiques coexistent dans les devis produits (§2.3).
3. **Domaine de validité des forfaits** : seuils exacts par typologie pour `BA`, `GEOTECH`, `TOPO`, `CTRL_BET` (§1.6).
4. **Décompte des dalles** : formule de déduction depuis le gabarit, pour proposer le nombre de visites de contrôle (§3.3).
5. **TVA** : régime du cabinet, taux applicable aux honoraires d'architecture, retenue à la source éventuelle.
6. **Mentions légales du cabinet** : ICE, IF, RC, patente, à charger en configuration pour les factures.
7. **Acceptation en ligne** : valeur juridique retenue au Maroc, et ce qui doit rester signé sur papier.

---

## 11. Ordre d'implémentation suggéré

1. `GrilleTarifaire` + `Prestation` + chargement de la grille ARC-BATI (§1.6).
2. `Metre` + moteur de surfaces et de coût (§2) — validé par les trois jeux de recette (§9).
3. `Devis` détaillé + rendu PDF/DOCX (§5) — commencer par le cas Mehdaoui, le plus simple (forfait, pas de métré).
4. Packs (§4).
5. `Facture` + `Encaissement` + avoirs (§1.9, §6.3).
6. Espace client : consultation, acceptation, téléchargement (§8.1–3).
7. Alerte d'expiration d'autorisation (§8.4).
