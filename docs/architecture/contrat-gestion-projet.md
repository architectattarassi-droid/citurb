# Gestion de projet de construction — lots GP1 à GP5 (contrat d'intégration)

Feuille de route : `docs/gestion-projet/audit-et-ameliorations.md`. Référentiel (enrichi par la session principale, lu tel quel par le code) : `docs/gestion-projet/referentiel-phases.json`.

## Où est quoi

| Sujet | Code | Routes |
|---|---|---|
| Référentiel unique (15 phases P00–P14, correspondances catalogue / espace projet / matériaux / chiffrage / CPS / types / rôles) | `packages/contracts/src/gestion/referentiel.ts` | — |
| Profil du projet, conditions des pièces, décisions du 15/10/2026 (bureau de contrôle > 5 MDH, TRC/décennale > 3 étages ou 800 m²) | `packages/contracts/src/gestion/profil.ts` | action `profil` de `PATCH /api/cc/dossiers/:id` |
| Visa : commune → conseil régional de l'Ordre (entrées « à vérifier ») | `packages/contracts/src/gestion/ordres.ts` | — |
| Questions ouvertes paramétrables (raccordements, levée des réserves, art. 770, budget visible) | `packages/contracts/src/gestion/parametres.ts` | `GET/PUT /api/cc/gestion/parametres` (table `Parametre`, clé `gestion-projet`) |
| Documents attendus par phase et par lot, « Document manquant », normes par lot, checklists de la phase | `packages/contracts/src/gestion/pieces.ts`, `functions/_lib/dossierPieces.ts` | `/api/cc/dossiers/:id/pieces`, `/api/client/dossiers/:id/pieces`, `/api/projets/:id/pieces` (+ `/<docId>`) |
| Dépôt de documents commun (PDF, images) | `functions/_lib/documents.ts` (contrat `contrat-depot-fichiers.md`) | via les routes de pièces |
| Checklists de chantier = PV numériques, points d'arrêt, déblocage admin motivé | `packages/contracts/src/gestion/checklists.ts`, `functions/_lib/projetsApi.ts` | `PATCH /api/cc/projets/:id/jalons/:code` `{ debloquer: { motif } }` |
| Échéances et rappels J−90 / J−30 / J−7 | `packages/contracts/src/gestion/echeances.ts`, `functions/_lib/echeances.ts` | `GET /api/cc/echeances`, `POST /api/cc/echeances/rappels`, `POST /api/taches/rappels` |
| Phase du dossier synchronisée sur l'espace projet, frise client | `packages/contracts/src/gestion/frise.ts`, `functions/_lib/projetsGestion.ts`, `functions/_lib/vueDossierClient.ts` | vues `/api/mon-dossier/:jeton`, `/api/client/dossiers/:id` |

Écrans : fiche `/cc/dossiers/:id` (Parcours P00→P14, Profil du projet, Échéances, onglet « Documents par phase »), `/cc/dashboard` (menu « Échéances »), espace client `/mon-espace` (frise, documents FR/AR), espace projet (documents du dossier, PV exigés, déblocage).

## Règles garanties

- **Aucune coordonnée** : noms de fichiers, motifs de refus et de déblocage passent par `masquerCoordonnees` ; les pièces « back-office uniquement » (identité, estimation de référence, offres) ne sont jamais servies au client ; les e-mails de rappel ne portent que titre, commune, date et action.
- **Point d'arrêt** : un jalon « porte » (ex. `84_FONDATIONS.FON.10`, armatures avant bétonnage) ne passe pas à « validé » sans le PV de sa checklist signé par tous les rôles et non refusé. Seul l'administrateur débloque, avec un motif écrit, journalisé dans `ProjetEvenement` et dans `DossierEvenement` (`journaliser()`). Débloquer une étape du dossier (statut `DEBLOQUEE`) ou le dossier exige aussi un motif.
- **Migration sans perte** : les étapes existantes gardent leur statut ; l'étape retirée `36_AFFICHAGE_RECOURS` reste affichée en historique (`PHASES_RETIREES`). Le code `32_VISA_CNOA` est conservé, son titre est « Visa de l'ordre régional compétent ».
- **Dégradation** : sans `docs/sql/gestion-projet-neon.sql`, les pièces s'affichent toutes « Document manquant » en lecture seule, le dépôt répond `sql_a_coller`, le déblocage fonctionne (motif au journal), les échéances et la frise marchent (aucune table nouvelle pour eux : `Dossier.payload.gestion`).

## Données dans `Dossier.payload.gestion` (aucune table)

`profil` (type, budgetMDH, étages, sous-sols, m², équipements, `activer`), `dates` (début des fondations, ouverture, réceptions, assurances, cautions, autres), `rappels` (`"<échéance>|<date>": [90, 30, 7]` déjà envoyés), `phaseRef` (phase P.. suivie par l'espace projet).

## Tâche planifiée des rappels

Les rappels partent à l'ouverture de `/cc/dashboard` (une fois par jour) et par le bouton. Pour un envoi chaque matin sans ouvrir le tableau de bord : définir `TACHES_SECRET` (≥ 32 caractères) dans Cloudflare Pages, puis faire appeler chaque jour `POST https://<site>/api/taches/rappels` avec l'en-tête `x-tache-secret: <TACHES_SECRET>` (Worker Cloudflare avec déclencheur planifié, ou service de cron). Destinataires : `LEAD_NOTIFY_TO` ; envoi : `RESEND_API_KEY`.

## Rattachement des checklists aux jalons

`RATTACHEMENT_CHECKLISTS` (dans `checklists.ts`) : `offres` = phases du catalogue où le PV se remplit, `arrets` = jalons porte qui l'exigent. Une checklist ajoutée au référentiel sans entrée dans ce tableau n'est proposée nulle part : ajouter sa ligne.
