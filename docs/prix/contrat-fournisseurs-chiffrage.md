# Contrat fournisseurs ↔ moteur de chiffrage

À l'attention du chantier « Moteur de chiffrage villa » (`apps/web/src/domain/chiffrage/`). Ce document décrit comment les prix des fournisseurs inscrits sur Cercles remontent dans un sous-détail de prix, sans dupliquer la logique du moteur.

## 1. Codes matériaux : une seule nomenclature

Les composants « matériau » d'un sous-détail d'ouvrage portent le **code CIT** du catalogue `apps/web/src/domain/materiaux/catalogue.ts` (ex. `CIT-GO-008` ciment CPJ 45, `CIT-GO-024` acier HA Ø12, `CIT-GO-011` sable 0/4), et une **quantité exprimée dans `uniteRef`** de ce code (kg de ciment, kg d'acier, m³ de sable…).

```ts
import { materiau } from "@/domain/materiaux/catalogue";   // chemin relatif dans le dépôt
const ciment = materiau("CIT-GO-008");                      // uniteRef "kg", prix.ref 1.6 DH/kg (B)
```

Si le moteur a déjà ses propres codes de composants, il suffit d'une table de correspondance `{ codeComposant → codeCIT }` ; les lots suivent la nomenclature `LOT_NN_*` des cps-templates (champ `lots` de chaque matériau).

## 2. Prix marché fournisseurs (public, sans authentification)

`GET /api/prix/materiaux?region=<region>&codes=CIT-GO-008,CIT-GO-024`

- `region` : code de région (`casablanca-settat`, `rabat-sale-kenitra`, `marrakech-safi`, `tanger-tetouan-al-hoceima`, `fes-meknes`, `oriental`, `souss-massa`, `beni-mellal-khenifra`, `draa-tafilalet`, `guelmim-oued-noun`, `laayoune-sakia-el-hamra`, `dakhla-oued-ed-dahab`) ou nom de ville (converti en région). Absent → national.
- `codes` : facultatif (sinon tout le catalogue).
- Réponse (cache public 1 h) :

```json
{
  "ok": true,
  "catalogueVersion": "2026-10.1",
  "region": "casablanca-settat",
  "genereLe": "2026-10-09T20:00:00.000Z",
  "materiaux": [
    {
      "code": "CIT-GO-008",
      "uniteRef": "kg",
      "recherche": { "min": 1.3, "ref": 1.6, "max": 1.7, "fiabilite": "B" },
      "marche": { "mediane": 1.56, "min": 1.5, "max": 1.62, "nbOffres": 4, "nbFournisseurs": 4, "fiabilite": "A", "plusRecente": "2026-10-08" },
      "retenu": { "prix": 1.56, "fiabilite": "A", "source": "fournisseurs" }
    }
  ]
}
```

Règles :
- Prix **HT par `uniteRef`** (le fournisseur saisit dans son unité de vente ; la conversion est faite à l'enregistrement).
- `marche` = médiane des fiches **approuvées**, **valides** (date de validité non dépassée) et mises à jour depuis **moins de 120 jours**, des fournisseurs **approuvés** qui livrent la région (ou toutes régions). Les déclinaisons (`parent`) comptent pour le matériau générique.
- `fiabilite` du marché : **A** si au moins 3 fournisseurs distincts, **B** si 1 ou 2. `marche` vaut `null` sans offre.
- `retenu` : marché si fiabilité A, sinon prix de recherche (`source: "recherche"`, fiabilité B ou C). Le moteur peut afficher les deux.
- Table absente ou base indisponible : la fonction répond quand même (200) avec `marche: null` partout et `"marcheDisponible": false`.

Adaptateur prêt à l'emploi côté front : `apps/web/src/domain/materiaux/prixMarche.ts` (`chargerPrixMarche(region)`, `prixRetenu(code, donnees)`), avec repli sur `prix.ref` du catalogue hors ligne.

## 3. Demande de prix depuis le DQE (RFQ)

Depuis l'écran de chiffrage / DQE, pour un lot :

```ts
import { ouvrirDemandePrix } from "@/domain/materiaux/demandePrix"; // à venir (étape 4b)
ouvrirDemandePrix({ lot: "LOT_02_GO_BETON", ville: "Rabat", lignes: [{ code: "CIT-GO-008", quantite: 840 /* en uniteRef */ }, …] });
```

Le bordereau est envoyé aux fournisseurs approuvés de la région qui couvrent ces matériaux ; ils répondent ligne à ligne sur le même bordereau ; le client compare. Chaque demande crée un Lead (`/cc/leads`). Contrat détaillé ajouté à l'étape 4.
