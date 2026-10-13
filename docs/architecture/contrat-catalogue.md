# Contrat catalogue public — produits et services des fournisseurs

Lecture publique (sans authentification, Pages Functions + Neon, **jamais l'API NestJS**) des produits et services saisis par les fournisseurs Cercles et **approuvés** en modération. Consommateurs : la matériauthèque `/materiaux` (fiches matériaux, variantes et marques) et le chiffrage. Ce document fixe l'interface attendue par le front ; la session « Cercles : fiches société, produit et service » implémente les Functions et les tables, et complète ce fichier.

Prix existants : `GET /api/prix/materiaux` — voir `docs/prix/contrat-fournisseurs-chiffrage.md` §2 (implémenté ; compte aussi les fiches produit rattachées depuis la session Cercles).

**Implémentation** (session Cercles, 2026-10-13) : logique `functions/_lib/catalogue.ts` (dépôt Neon `catalogueDepot.ts`, vues `catalogueVues.ts`), tables `docs/prix/sql/cercles-fiches-catalogue.sql` (`ProduitFournisseur`, `ServiceFournisseur`, `MateriauReferentiel`, colonnes `fiche`/`documents`/`formule` du `Fournisseur`), test de la chaîne `apps/web/src/features/fournisseurs/catalogue.chaine.test.ts` (fiche produit approuvée → catalogue public → prix marché → prix d'un ouvrage).

## Règles communes

- **Code de référence** : chaque produit approuvé est rattaché à un code CIT du catalogue (`apps/web/src/domain/materiaux/catalogue.ts`, `CIT-XX-NNN`). Un produit sans code (en attente de modération) n'est jamais renvoyé.
- **Bilingue** : tout texte affiché est un objet `Texte = { fr: string; ar?: string; en?: string }`. Le front affiche la langue demandée et **retombe sur `fr`** (`texteLocal()` dans `apps/web/src/features/materiaux/catalogueProduits.ts`).
- **Unités** : le conditionnement donne son `facteur` = quantité d'unité de référence du code CIT contenue dans une unité de vente (sac 50 kg de ciment → 50, unité de référence kg). Même convention que `UniteVente` (`domain/materiaux/types.ts`).
- **Prix** : HT, par **unité de référence** du code CIT. Publiés **seulement agrégés et à partir de 3 fournisseurs distincts** (sinon `prix: null`) — confidentialité et loi 104-12. Aucun prix nominatif d'un fournisseur, aucune coordonnée.
- **Statut** : seuls les éléments `APPROVED` de fournisseurs `APPROVED` non fictifs sont renvoyés, valides à la date du jour (`validiteJusquau`). **Aperçu** : sur les hôtes de prévisualisation (`*.pages.dev`, `localhost`), les fournisseurs fictifs (`meta.fictif`, données de test) sont inclus pour vérifier l'affichage ; jamais sur citurbarea.com.
- Réponse `200` même base indisponible : `{ ok: true, disponible: false, produits: [] }`. Cache public **5 min** (`s-maxage=300`) : un produit approuvé apparaît au plus 5 minutes après la modération.

## `GET /api/catalogue/produits?code=CIT-GO-008&region=<code|ville>`

- `code` facultatif (sinon tous les produits approuvés, au plus 2 000) ; `region` facultative (filtre sur les zones de livraison des fournisseurs). Filtres facultatifs en plus : `categorie`, `famille` (gabarit technique, `domain/cercles/offres.ts`), `gamme` (ECO, MOYEN, HAUT, LUXE), `q` (désignation FR/AR, marque, modèle), `fournisseur` (slug).

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
- Une entrée = une **variante** : les fiches produit de plusieurs fournisseurs ayant le même code, la même marque et le même modèle sont regroupées (`nbFournisseurs`, `prix` agrégé par unité de référence). `id` = la fiche la plus récente du groupe.
- Champs **en plus** (facultatifs, ignorés par `normaliserProduits`) : `codeVariante` (code créé à la modération, `CIT-<PFX>-9NN`, quand le produit est une déclinaison : `codeReference` porte alors le code générique), `gamme`, `famille`, `categorie`, `uniteRef`, `fournisseurs: [{ slug, nom: Texte, ville, documentsVerifies }]` (lien vers la fiche publique `/cercles/pro/<slug>` et le contact via la plateforme ; **jamais de prix ni de coordonnées**), `total`, `region`.
- Désignation saisie seulement en arabe : `designation.fr` reprend le texte arabe (le contrat exige `fr`).
- Plusieurs produits peuvent partager un `codeReference` : ce sont les **variantes / marques** d'un même matériau de référence ; la matériauthèque les affiche sous la fiche du code (section « Marques et variantes »).

## `GET /api/catalogue/services?ouvrage=&prestation=&nature=&lot=&region=&q=&fournisseur=`

Fiches de service approuvées : pose / main-d'œuvre seule (`POSE`) ou fourni-posé (`FOURNI_POSE`) rattachées à un **ouvrage du chiffrage** (`apps/web/src/domain/chiffrage/ouvrages.ts`, unité imposée = celle de l'ouvrage), ou **prestation hors ouvrage** (`PRESTATIONS` de `apps/web/src/domain/cercles/offres.ts` : étude BET au m², essai de laboratoire à l'unité, levé topographique à l'hectare, location à la journée, évacuation au m³…), ou libre (`AUTRE`). `lot` accepte le code de lot du chiffrage (`RSO`) ou du CPS (`LOT_11_…`).

```json
{
  "ok": true, "disponible": true, "region": "rabat-sale-kenitra", "total": 1,
  "services": [
    {
      "id": "svc_…", "nature": "POSE", "ouvrageCode": "RSO.02", "prestationCode": null,
      "designation": { "fr": "Carrelage grès cérame 60×60 collé — pose seule", "ar": "تركيب البلاط 60×60" },
      "description": null, "unite": "m²", "delaiJours": 7, "conditions": "Acompte 30 %", "zones": ["rabat-sale-kenitra"],
      "photoUrl": null, "majLe": "2026-10-13",
      "prix": { "mediane": 60, "min": 55, "max": 70, "nbFournisseurs": 3, "majLe": "2026-10-13" },
      "fournisseur": { "slug": "…", "nom": { "fr": "…", "ar": "…" }, "ville": "Rabat", "documentsVerifies": true }
    }
  ]
}
```

- `prix` : agrégat de toutes les offres approuvées pour le même `(ouvrage ou prestation, nature)` dans la région, **à partir de 3 pros** ; sinon `null`. Jamais le prix de l'offre elle-même.

## `GET /api/prix/ouvrages?region=&codes=RSO.02,MAC.01`

Prix d'ouvrage du chiffrage (prix de recherche, régime entreprise, base Rabat) et agrégats des offres de services, par nature. Toujours `200` ; sans base : `marcheDisponible: false`.

```json
{
  "ok": true, "region": "rabat-sale-kenitra", "genereLe": "…", "marcheDisponible": true,
  "ouvrages": [
    { "code": "RSO.02", "lot": "RSO", "unite": "m²", "libelle": "Carrelage grès cérame 60×60 collé, joints compris",
      "recherche": { "pu": 342.1, "min": 280.4, "max": 455.9 },
      "marche": { "POSE": { "mediane": 60, "min": 55, "max": 70, "nbOffres": 3, "nbFournisseurs": 3, "fiabilite": "A", "plusRecente": "2026-10-13" } } }
  ],
  "prestations": [ { "code": "LEVE_TOPOGRAPHIQUE", "unite": "ha", "nature": "TOPO", "libelle": { "fr": "…", "ar": "…", "en": "…" }, "marche": null } ]
}
```

- `marche.<NATURE>` : même forme et mêmes règles que `marche` de `/api/prix/materiaux` (`agregerMarche`, `domain/materiaux/marche.ts`) : `mediane`/`min`/`max`/`fiabilite` à `null` sous 3 fournisseurs.
- **Chiffrage** (`apps/web/src/domain/chiffrage/marche.ts`, `definirPrixMarche`) : à partir de 3 pros, `FOURNI_POSE` remplace le prix unitaire de l'ouvrage ; `POSE` remplace la main-d'œuvre et le petit matériel du déboursé (fournitures inchangées, K appliqué). Les matériaux du sous-détail prennent la médiane de `/api/prix/materiaux` (× facteur de `CORRESPONDANCE_CIT`) dès 3 fournisseurs. Sous 3 : la ligne garde le prix de recherche et porte le nombre d'offres (`marche.applique: false`).

## `GET /api/catalogue/referentiel`

Codes du référentiel créés à la modération d'une fiche produit (table `MateriauReferentiel`, plage `CIT-<PFX>-901` et suivants pour ne jamais heurter la numérotation du catalogue statique). Le catalogue statique est déjà dans le front.

```json
{ "ok": true, "disponible": true, "catalogueVersion": "2026-10.1",
  "codes": [ { "code": "CIT-REV-901", "libelle": { "fr": "Grès cérame 60×60 effet marbre", "ar": "…" }, "categorie": "REVETEMENT",
               "famille": "Carrelage", "uniteRef": "m2", "parent": "CIT-REV-020", "lots": ["LOT_11_REVETEMENTS_SOLS"], "gamme": "MOYEN" } ] }
```

- Un code créé avec `parent` : ses offres comptent aussi pour le code générique (prix marché, chiffrage) et ses produits sont publiés sous `codeReference = parent` (avec `codeVariante`). Sans `parent` : produits publiés sous le nouveau code ; **la matériauthèque l'affiche** (`useCodesModeres()` dans `apps/web/src/features/materiaux/catalogueProduits.ts`) : carte « Nouveau — référencé par un fournisseur » dans le catalogue, fiche `/materiaux/<désignation>-<pfx>-9NN` (servie par l'application, hors sitemap), **sans prix de référence** (médiane fournisseurs ≥ 3 ou « prix sur demande »), ajout possible à la demande de prix (`enregistrerCodesModeres` dans `domain/materiaux/catalogue.ts`).

## Annuaire et fiches publiques des pros

- `GET /api/cercles/annuaire?metier=&groupe=MATERIAUX|TRAVAUX|ETUDES|SERVICES&region=&categorie=&q=&codes=&lot=` : pros vérifiés (vue publique : raison sociale FR/AR, métier, ville, zones, catégories, description FR/AR, fiche du gabarit sans champs privés, badges `verifie` et `documentsVerifies`, nombres d'offres). `codes` / `lot` : **ciblage des demandes de prix (RFQ) par lot** — renvoie aussi `codesCouverts`.
- `GET /api/cercles/pro/:slug` : société + produits + services + matériaux chiffrés, **sans prix nominatif ni coordonnées**.
- `POST /api/cercles/contact` `{ slug, nom, telephone, email?, ville?, message, objet?: { type: "produit"|"service"|"fiche", id, libelle }, lang }` : mise en relation **via la plateforme** (lead `P6_CONTACT_PRO`, source `cercles-pro`, dans `/cc/leads`) ; pot de miel `website`, limite de débit. Les coordonnées du pro ne sont jamais renvoyées (anti-désintermédiation, commission préparée : `Fournisseur.commissionPct`, `Fournisseur.formule`).

## Espace pro et back-office (authentifiés)

- Pro (cookie `frn_session`, `functions/api/cercles/espace/_middleware.ts`) : `GET|PUT /api/cercles/espace/moi` (fiche société selon le gabarit du métier, `raisonSocialeAr`, `descriptionAr`, `fiche`), `POST /api/cercles/espace/documents`, `DELETE …/documents/:id`, `POST /api/cercles/espace/produits`, `PUT|DELETE …/produits/:id`, `POST /api/cercles/espace/services`, `PUT|DELETE …/services/:id`.
- Admin (`/api/cc/_middleware.ts`) : `GET /api/cc/produits?statut=`, `PATCH /api/cc/produits/:id` `{ action: "APPROUVER", materiauCode | nouveauCode: { libelleFr, libelleAr?, categorie?, famille?, uniteRef?, parent?, lots? }, facteur? } | { action: "REJETER", motif } | { action: "ARCHIVER" }`, `GET /api/cc/services`, `PATCH /api/cc/services/:id`, `PATCH /api/cc/fournisseurs/:id/documents/:docId` `{ statut: "VERIFIE"|"REFUSE", motif? }`, `PATCH /api/cc/fournisseurs/:id` accepte aussi `formule`.
- Un produit approuvé **reste approuvé** si seuls le prix, le stock, les délais ou les zones changent (et que le prix reste dans ±50 % de la référence) ; si sa désignation, sa marque, son modèle, sa famille ou sa conversion changent, il repasse en vérification.

## Côté front (déjà prêt)

- `apps/web/src/features/materiaux/catalogueProduits.ts` : `useProduits()` (une seule requête sans `code`, produits groupés par `codeReference`, cache mémoire ; 404, réseau ou `disponible: false` → liste vide, la page reste correcte), `texteLocal(t, lang)`.
- Fiche matériau : section « Marques et variantes » affichée dès qu'un produit approuvé existe pour le code — **aucune liste figée côté front**.
- Catalogue : badge « N marques » par matériau ; la recherche porte aussi sur les marques, modèles et désignations FR/AR des produits.
- Normalisation défensive (`normaliserProduits`) : produit sans code CIT valide ou sans `designation.fr` ignoré, URL non https ignorée, `prix` ignoré sous 3 fournisseurs.

## Appels vidéo sur demande (module d'une autre session)

Les fiches Cercles ne créent **aucune** visio. Le module générique « appels vidéo sur demande, avec accord des deux parties » (composant `<DemanderAppelVideo contexte objetId invites />`, `functions/_lib/visio.ts`) s'y branche avec :

- **Identifiant public du pro** : `slug` (vue publique, annuaire et `GET /api/cercles/pro/:slug`). **Identifiant interne** : `Fournisseur.id` (jamais exposé au public ; disponible côté serveur par `depot.fParSlug(slug)`, dans `GET /api/cercles/espace/moi` pour le pro connecté et dans les vues admin).
- **Accès du pro à son espace** : session `frn_session` (cookie HttpOnly, `Path=/api/cercles`, vérifiée par `functions/api/cercles/espace/_middleware.ts`, qui pose `ctx.data.fournisseurId`). Pour que le pro accepte une demande depuis son espace, exposer les routes sous `/api/cercles/espace/appels/*` (le cookie n'est pas envoyé ailleurs) ou réutiliser `lireSessionFournisseur` (`functions/_lib/cercles.ts`).
- **Emplacements prévus** : fiche publique `apps/web/src/features/fournisseurs/FicheProPage.tsx` (à côté du bouton « Contacter ce professionnel », en-tête, et sur chaque carte produit / prestation : `contexte` = `cercles-pro` | `cercles-produit` | `cercles-service`, `objetId` = slug du pro ou id du produit / de la prestation), cartes de l'annuaire `AnnuaireProPage.tsx`, et onglet de l'espace pro `EspaceFournisseurPage.tsx` pour accepter ou refuser.
- **Anti-désintermédiation** : comme le contact (`POST /api/cercles/contact`), la demande passe par la plateforme ; les coordonnées du pro ne sont jamais renvoyées au client.

## Images et navigation par fournisseur (matériauthèque, 2026-10-13)

**Images des produits** — forme attendue par le front (`normaliserImages`, `apps/web/src/features/materiaux/fournisseursCatalogue.ts`), sur chaque produit de `GET /api/catalogue/produits` et de `GET /api/cercles/pro/:slug` :

```json
"images": [ { "url": "https://…/principale.webp", "vignette": "https://…/principale-320.webp", "legende": { "fr": "Sac de 50 kg", "ar": "كيس 50 كلغ" }, "principale": true } ]
```

- Première image = principale ; `vignette` facultative (sinon `url`) ; légende bilingue facultative ; 12 images au plus ; **https uniquement** (autre schéma ignoré). Repli accepté : `photos: [url]` (vue actuelle de `/api/cercles/pro/:slug`) et `photoUrl`.
- Seules les images **modérées** sont publiées (photos fournies par le fournisseur, droits garantis par lui à l'inscription).
- Front : vignette cliquable → visionneuse plein écran (glisser, zoom, vignettes, légendes FR/AR, chargement paresseux) sur la fiche matériau (« Marques et variantes ») et la page fournisseur.

**Image de référence d'un code du catalogue** (matériauthèque, indépendante des fournisseurs) : `apps/web/src/domain/materiaux/images.json` — fichier hébergé dans `apps/web/public/materiaux/img/`, licence et source obligatoires (test `images.test.ts`), rempli par `apps/web/scripts/images-materiaux.mjs` (Pixabay Content License, image téléchargée et hébergée, relecture humaine avant commit) ou un visuel maison ; jamais une image copiée d'un site commercial. Sans image : icône de catégorie (SVG maison).

**Par fournisseur** — la matériauthèque lit les routes publiques déjà en service (aucune route absente de `functions/`) :
- liste : `GET /api/cercles/annuaire?groupe=MATERIAUX&region=<ville>&limite=200` (champs utilisés : `slug`, `raisonSociale`, `raisonSocialeAr`, `ville`, `zonesLivraison`, `categories`, `verifie`, `documentsVerifies`, `nbProduits`, `logoUrl`, `metierLibelle`) ;
- page fournisseur : `GET /api/cercles/pro/:slug` (`fournisseur` + `produits` : `id`, `designationFr/Ar`, `descriptionFr/Ar`, `marque`, `modele`, `famille`, `materiauCode`, `conditionnement`, `photos` ou `images`, `ficheTechniqueUrl`) ;
- « Proposé aussi par » : `fournisseurs` des variantes de `GET /api/catalogue/produits`.
Si la session Cercles publie `GET /api/catalogue/fournisseurs` et `/api/catalogue/fournisseurs/:slug/produits`, le front pourra y basculer (mêmes champs) ; jusque-là, rien à faire. Aucune coordonnée n'est lue ni affichée (normalisation qui ne retient que les champs listés) : contact via `/cercles/pro/:slug` (mise en relation par la plateforme) et demande de prix.
