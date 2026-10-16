# Contrat — carnet des matériaux du projet (propositions client, validation de l'architecte)

Décision du fondateur (15/10/2026) : **à partir de l'APD, le client ou le maître d'ouvrage peut proposer un matériau depuis la matériauthèque ; la validation reste toujours à l'architecte maître d'œuvre.** Une table unique, partagée par la matériauthèque et la gestion de projet (pages d'étape).

## Où est le code

| Rôle | Fichier |
|---|---|
| Règles pures (phase, entrées, décisions, transitions) | `apps/web/src/domain/materiaux/carnet.ts` |
| Accès Neon, journal, message au client | `functions/_lib/carnetMateriaux.ts` (`proposer`, `statuer`, `lireCarnet`, `vueLigne`, `messageDecision`) |
| Routes client | `functions/api/client/dossiers/[id]/materiaux.ts` (GET, POST) |
| Routes admin | `functions/api/cc/dossiers/[id]/materiaux/[[chemin]].ts` (GET, POST, PATCH /:ligne) |
| Recherche | `functions/api/materiaux/recherche.ts` + `apps/web/src/domain/materiaux/recherche.ts` |
| Écrans | fiche `/materiaux/:slug` (`ProposerPourProjet`), `/mon-espace` (`CarnetClient`), `/cc/dossiers/:id` onglet « Matériaux proposés » (`OngletMateriaux`), compteur dans `/cc/dossiers` |
| SQL | `docs/sql/carnet-materiaux-neon.sql` (ligne 17 de `A-COLLER-DANS-NEON.md`) |
| Tests | `apps/web/src/domain/materiaux/carnet.test.ts` |

## Règles

- **Phase** : `Dossier.phase` (codes de `packages/contracts/src/phases.catalog.ts`). Le client peut proposer si l'ordre de la phase ≥ celui de `14_APD` (`proposableEnPhase`) ; avant → **409 `avant_apd`**, l'écran affiche « Disponible à partir de l'avant-projet détaillé ». L'admin et les pages d'étape prescrivent à toute phase.
- **Qui statue** : uniquement le back-office (`/api/cc`, architecte maître d'œuvre / cabinet du dossier). La route client n'a **aucune** méthode PATCH (testé).
- **Isolement** : la route client vérifie `dossierId ∈ session.dossierIds` (sinon 404) ; toute requête porte `WHERE "dossierId" = …`.
- **Statuts** : `PROPOSE → EN_ETUDE → VALIDE | REFUSE (motif obligatoire) | VARIANTE_PROPOSEE (varianteCode, autre code du catalogue)`. Une décision rendue ne peut qu'être rouverte en `EN_ETUDE`. Une ligne prescrite par l'architecte est créée `VALIDE`.
- **Carnet du projet = lignes `VALIDE`** (`carnetValide`) : seule source autorisée pour le CPS, le DQE et le planning d'achat. Une proposition n'y entre jamais sans validation.
- **Journal** : `MATERIAU_PROPOSE` / `MATERIAU_PRESCRIT` / `MATERIAU_STATUE` (de, vers, motif, variante) dans `DossierEvenement` via `journaliser()`, avec l'auteur et la date.
- **Client prévenu** par la messagerie de la plateforme (`creerFil`, contexte `dossier`, invité `client`) à chaque décision sur une proposition client ; aucun e-mail de tiers.
- **Aucune coordonnée** : note, emplacement et motif passent par `masquerCoordonnees` (`functions/_lib/coordonnees.ts`) ; la vue ne renvoie ni `auteur` ni `decidePar`. Le nom, l'unité et le prix indicatif sont recalculés depuis le catalogue (jamais saisis).
- **Table absente** : toutes les routes répondent `503 { error: "sql_a_coller", fichier }` ; le client voit « Le carnet des matériaux sera bientôt disponible ».

## Formes

`POST` (client ou admin) :
```json
{ "code": "CIT-REV-020", "source": "referentiel", "refId": "CIT-REV-020", "lot": "RSO", "emplacement": "sol séjour", "quantite": 40, "note": "…", "etapeCode": "LOT_CARRELAGE" }
```
`source: "produit"` + `refId: <id variante>` pour une variante fournisseur (le `code` CIT reste obligatoire). `lot` : code de lot du chiffrage (`LOTS`). `etapeCode` : facultatif (page d'étape).

`PATCH /api/cc/dossiers/:id/materiaux/:ligne` :
```json
{ "statut": "EN_ETUDE" | "VALIDE" | "REFUSE" | "VARIANTE_PROPOSEE", "motif": "…", "varianteCode": "CIT-REV-019" }
```

Ligne renvoyée (`GET` → `{ ok, lignes: [...] }`, `?etape=<code>` pour filtrer) :
```json
{ "id": "dma_…", "dossierId": "…", "etapeCode": null, "source": "referentiel", "refId": "CIT-REV-020", "code": "CIT-REV-020",
  "nom": "Grès cérame 60×60", "categorie": "REVETEMENT", "lot": "RSO", "emplacement": "sol séjour", "unite": "m2", "quantite": 40,
  "prixIndicatif": 137.5, "note": "…", "origine": "CLIENT", "proposePar": "CLIENT", "statut": "PROPOSE", "motif": null,
  "varianteCode": null, "decideLe": null, "proposeLe": "2026-10-16T…" }
```

## Recherche

`GET /api/materiaux/recherche?q=&lot=&phase=&categorie=&limite=50` (public) → `{ ok, disponible, total, resultats: [{ code, nom: {fr, ar?}, categorie, famille, lots, unite, prixReference: {min, ref, max, fiabilite} | null, phasesAchat, nbVariantes, slug }] }`. `lot` = code de lot du chiffrage ; `phase` = phase d'achat (`PHASES_REALISATION` : GROS_OEUVRE, REVETEMENTS…, voir `docs/prix/phases-materiaux.md`). Comprend les 280 codes du catalogue et les codes créés en modération (sans prix de référence). Les variantes d'un code : `GET /api/catalogue/produits?code=<code>`.

## Référentiel en base

`docs/sql/materiaux-referentiel-amorcage.sql` (ligne 16) recopie les codes du catalogue dans `MateriauReferentiel` (`ON CONFLICT DO NOTHING`), généré par `node scripts/sql-referentiel-materiaux.mjs` (test de synchronisation). Le site lit toujours le catalogue depuis le code ; `GET /api/catalogue/referentiel` continue de ne lister que les codes **créés en modération** (c'est voulu).
