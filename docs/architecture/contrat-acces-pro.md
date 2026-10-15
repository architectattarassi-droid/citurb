# Contrat — outils pro réservés (Premium ou accord de l'admin)

Décision du fondateur (15/10/2026) : les outils pro de l'espace Cercles ne sont ouverts qu'aux membres **Premium** ou **agréés par CITURBAREA** outil par outil. Un membre de base (formule `GRATUIT`) garde : fiche société, produits et prestations, annuaire et fiche publique, messagerie, demandes de prix, appels vidéo. La **matériauthèque publique** (`/materiaux`, prix de référence, demande de prix) reste ouverte à tous (leads et référencement).

## Règle unique

`aAcces(fournisseur, outil)` — `apps/web/src/domain/cercles/accesPro.ts` (partagé front / Functions) :

- pro **agréé** (`statut = APPROVED` ; PENDING, REJECTED, SUSPENDED → jamais d'accès) **ET**
  - **accord** de l'admin pour cet outil (`acces[OUTIL].actif = true`, `expireLe` non dépassée), **OU**
  - formule **PREMIUM** (`"Fournisseur"."formule" = 'PREMIUM'`, activée par l'admin, paiement plus tard) **sauf retrait explicite** de l'outil (`acces[OUTIL].actif = false`).
- `sourceAcces(...)` dit d'où vient l'accès : `"accord"`, `"premium"` ou `null`.

Outils (`OUTILS_PRO`, segment d'URL entre parenthèses) : `MATERIAUTHEQUE_PRO` (`materiautheque-pro`), `CHIFFRAGE_PRO` (`chiffrage-pro`), `CPS` (`cps`), `BUDGETISATION` (`budgetisation`), `FACTURATION` (`facturation`). Ajouter un outil = une entrée dans `OUTILS_PRO` (libellé FR/AR/EN + segment).

## Contrôle côté serveur (obligatoire)

1. **Routes sous `/api/cercles/espace/outils/<segment>/…`** : protégées d'office par `functions/api/cercles/espace/outils/_middleware.ts` (après la garde de session de `/api/cercles/espace`, qui pose `ctx.data.fournisseurId`). Segment inconnu → 404 ; pas d'accès → **403 `{ ok: false, error: "acces_reserve", outil }`**. Placer les routes pro ici suffit.
2. **Ailleurs** (route existante d'une autre session) : appeler `exigerAcces(depot, fournisseurId, "FACTURATION")` (`functions/_lib/accesPro.ts`) en tête de la Function et renvoyer sa réponse si elle n'est pas `null`.
3. Ne jamais se contenter de masquer un bouton : le serveur refuse.

Écran de refus (front) : `MESSAGE_RESERVE` — « Réservé aux membres Premium ou agréés par CITURBAREA — demander l'accès » (FR/AR/EN), bouton → `POST /api/cercles/espace/acces/demande { outil, message? }` (la demande arrive à l'admin par e-mail et dans `/cc/fournisseurs` ; aucune coordonnée échangée). Composant de l'espace : `apps/web/src/features/fournisseurs/OutilsPro.tsx` (onglet « Outils pro »).

## Données et administration

- SQL : `docs/prix/sql/cercles-acces-pro.sql` (dans `docs/sql/TOUT-NEON.sql`) — colonnes `"Fournisseur"."acces"` (`{ OUTIL: { actif, depuis, par, expireLe } }`) et `"accesDemandes"` (`[{ outil, le, message }]`).
- Admin : `PATCH /api/cc/fournisseurs/:id/acces { outil, actif, expireLe?, motif? }` (accorder / retirer ; daté, auteur, trace `ACCES_ACCORDE` / `ACCES_RETIRE` dans `events`), `PATCH /api/cc/fournisseurs/:id { statut, formule: "GRATUIT" | "PRO" | "PREMIUM" }`. Bascules dans `/cc/fournisseurs` (fiche du membre).
- Vue : `acces` dans `GET /api/cercles/espace/moi` et dans la liste admin : `{ outils: [{ outil, actif, source, retire, depuis, expireLe, demandeLe }], demandes, premium }`.

## Outils en service

- **Matériauthèque pro** : `GET /api/cercles/espace/outils/materiautheque-pro/prix?region=` — pour chaque matériau que le pro chiffre, son prix par unité de référence face au marché de la région (médiane, min, max à partir de 3 fournisseurs seulement ; jamais le prix d'un autre pro).
- **Devis et facturation, CPS, budgétisation, calcul pro** : à brancher par les sessions concernées sous `/api/cercles/espace/outils/<segment>/…`.

Offre Premium : brouillon non publié `apps/web/src/features/fournisseurs/OffrePremiumPage.tsx` (prix « à définir », activation par l'admin, aucun paiement en ligne).

Tests : `apps/web/src/features/fournisseurs/accesPro.test.ts` (membre de base refusé sur chaque outil, Premium, retrait explicite, expiration, suspension, demande, trace).
