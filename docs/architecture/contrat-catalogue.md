# Contrat catalogue public — produits et services des fournisseurs

Lecture publique (sans authentification, Pages Functions + Neon, **jamais l'API NestJS**) des produits et services saisis par les fournisseurs Cercles et **approuvés** en modération. Consommateurs : la matériauthèque `/materiaux` (fiches matériaux, variantes et marques) et le chiffrage. Ce document fixe l'interface attendue par le front ; la session « Cercles : fiches société, produit et service » implémente les Functions et les tables, et complète ce fichier.

Prix existants : `GET /api/prix/materiaux` — voir `docs/prix/contrat-fournisseurs-chiffrage.md` §2 (implémenté).

## Règles communes

- **Code de référence** : chaque produit approuvé est rattaché à un code CIT du catalogue (`apps/web/src/domain/materiaux/catalogue.ts`, `CIT-XX-NNN`). Un produit sans code (en attente de modération) n'est jamais renvoyé.
- **Bilingue** : tout texte affiché est un objet `Texte = { fr: string; ar?: string; en?: string }`. Le front affiche la langue demandée et **retombe sur `fr`** (`texteLocal()` dans `apps/web/src/features/materiaux/catalogueProduits.ts`).
- **Unités** : le conditionnement donne son `facteur` = quantité d'unité de référence du code CIT contenue dans une unité de vente (sac 50 kg de ciment → 50, unité de référence kg). Même convention que `UniteVente` (`domain/materiaux/types.ts`).
- **Prix** : HT, par **unité de référence** du code CIT. Publiés **seulement agrégés et à partir de 3 fournisseurs distincts** (sinon `prix: null`) — confidentialité et loi 104-12. Aucun prix nominatif d'un fournisseur, aucune coordonnée.
- **Statut** : seuls les éléments `APPROVED` de fournisseurs `APPROVED` non fictifs sont renvoyés.
- Réponse `200` même base indisponible : `{ ok: true, disponible: false, produits: [] }`. Cache public 1 h.

## `GET /api/catalogue/produits?code=CIT-GO-008&region=<code|ville>`

- `code` facultatif (sinon tous les produits approuvés, au plus 2 000) ; `region` facultative (filtre sur les zones de livraison des fournisseurs).

```json
{
  "ok": true,
  "disponible": true,
  "produits": [
    {
      "id": "prd_…",
      "codeReference": "CIT-GO-008",
      "marque": "LafargeHolcim",
      "modele": "CPJ 45 Résistant",
      "designation": { "fr": "Ciment CPJ 45, sac de 50 kg", "ar": "إسمنت CPJ 45، كيس 50 كلغ" },
      "description": { "fr": "…", "ar": "…" },
      "caracteristiques": [ { "libelle": { "fr": "Norme", "ar": "المعيار" }, "valeur": { "fr": "NM 10.1.004" } } ],
      "conditionnements": [ { "code": "sac50", "libelle": { "fr": "Sac 50 kg", "ar": "كيس 50 كلغ" }, "facteur": 50 } ],
      "photoUrl": "https://…",
      "ficheTechniqueUrl": "https://…",
      "nbFournisseurs": 4,
      "prix": { "mediane": 1.58, "min": 1.5, "max": 1.66, "nbFournisseurs": 4, "majLe": "2026-10-08" },
      "majLe": "2026-10-08"
    }
  ]
}
```

- `prix` : `null` sous 3 fournisseurs distincts.
- Plusieurs produits peuvent partager un `codeReference` : ce sont les **variantes / marques** d'un même matériau de référence ; la matériauthèque les affiche sous la fiche du code (section « Marques et variantes »).

## `GET /api/catalogue/services?code=<ouvrage>&region=` et `GET /api/prix/ouvrages?region=`

Fiches de pose / main-d'œuvre rattachées aux codes d'ouvrages du chiffrage (`apps/web/src/domain/chiffrage/ouvrages.ts`). Même conventions (Texte bilingue, agrégat ≥ 3, statut APPROVED). Forme à préciser par la session Cercles ; la matériauthèque ne les consomme pas encore.

## Côté front (déjà prêt)

- `apps/web/src/features/materiaux/catalogueProduits.ts` : `useProduits()` (une seule requête sans `code`, produits groupés par `codeReference`, cache mémoire ; 404, réseau ou `disponible: false` → liste vide, la page reste correcte), `texteLocal(t, lang)`.
- Fiche matériau : section « Marques et variantes » affichée dès qu'un produit approuvé existe pour le code — **aucune liste figée côté front**.
- Catalogue : badge « N marques » par matériau ; la recherche porte aussi sur les marques, modèles et désignations FR/AR des produits.
- Normalisation défensive (`normaliserProduits`) : produit sans code CIT valide ou sans `designation.fr` ignoré, URL non https ignorée, `prix` ignoré sous 3 fournisseurs.
