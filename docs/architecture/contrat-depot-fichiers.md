# Dépôt de documents commun — contrat v2 (images, PDF, plans, vidéos)

**Un seul** service de dépôt pour toute la plateforme : messagerie et appels vidéo, dossier client, rendez-vous, espace projet (pièces graphiques ESQ / APS / APD), demandes de prix. Les images publiques des fiches Cercles restent dans `ImageCatalogue` (en service, cache public) ; elles pourront migrer plus tard sans changer leurs URL.

Code : `functions/_lib/depotRegles.ts` (logique pure, testée), `depotStockage.ts` (Neon), `depotService.ts` (routes, droits, supports), `depotNeon.ts` (gardien, liens personnels, red flag), `depotDrive.ts` (archive Google Drive) ; tests `apps/web/src/features/documents/depot.test.ts`. Front : `apps/web/src/features/documents/` (`DepotDocuments` : liste + envoi + aperçu).

**Une seule table** `DocumentDepose`, partagée avec les **pièces du dossier** de la session Gestion de projet (`functions/_lib/documents.ts`, routes `…/dossiers/:id/pieces`, statut `PRIVE`, droits propres via `DossierPiece`) : créée par `docs/sql/gestion-projet-neon.sql`, étendue par `docs/sql/documents-neon.sql` (colonnes ajoutées, rien de supprimé). Vocabulaire commun en base : `proprietaire` (déposant), statuts `PRIVE` | `PENDING` (à modérer) | `APPROVED` (visible) | `REJECTED` | `EN_COURS` (envoi) | `SUPPRIME` ; l'API ci-dessous les présente comme `A_MODERER` / `VISIBLE` / `REFUSE`. Une pièce `PRIVE` n'est montrée par ce service qu'au cabinet (le module des pièces garde ses propres règles).

## Règles (décisions du fondateur)

1. **Tout reste enregistré** : historique, versions, qui a déposé, quand ; suppression **logique** seulement (statut `SUPPRIME`, auteur et date gardés).
2. **Tout passe par CITURBAREA** : le nom du fichier, la légende et les métadonnées libres passent par le moteur commun de masquage (`coordonnees.ts`) et comptent comme tentative de contact direct (red flag). Un numéro écrit **dans** une image ou un PDF n'est pas détecté automatiquement : un document déposé par un client, un pro ou un membre est **`A_MODERER`** — visible de son déposant et du cabinet seulement — jusqu'à la décision du cabinet (`VISIBLE` ou `REFUSE`). Un document déposé par le cabinet est `VISIBLE` d'emblée.
3. **Accès réservé aux participants du contexte** ; fichiers servis uniquement par **liens signés à durée limitée** (15 min), jamais d'URL publique.
4. **Contrôles** : type lu dans les octets (signature), jamais d'après le nom ni le `content-type` déclaré ; extension cohérente avec le type ; métadonnées des images retirées (EXIF, XMP, IPTC, GPS) ; PDF refusé s'il contient du JavaScript, une action de lancement ou un fichier joint ; plafonds et quotas côté serveur.
5. **Google Drive = archive de référence** (décision du 15/10) : chaque document `VISIBLE` est copié dans le Drive de CITURBAREA (`CITURBAREA/<contexte>/<objetId>/`) quand les variables Google sont configurées ; Neon / R2 servent l'affichage.

## Supports et bascule automatique

| Support | Quand | Fichiers | Envoi |
|---|---|---|---|
| **Neon** (`bytea`) | binding `FICHIERS` absent | images ≤ 1,5 Mo (≤ 4 000 px), PDF ≤ 2 Mo ; **pas de vidéo** | 1 morceau |
| **R2** (`FICHIERS`) | binding présent | images ≤ 50 Mo, PDF / plans ≤ 200 Mo, vidéos ≤ 5 Go | direct (≤ 20 Mo) ou **multipart** (morceaux de 20 Mo) |

La Function choisit seule : `support = env.FICHIERS ? "R2" : "NEON"`. Le front lit la réponse de `POST …/televersements` (`mode`, `taillePartie`, `parties`) et s'adapte. Plafond global Neon : 400 Mo de documents (offre gratuite ≈ 0,5 Go pour toute la base) → au-delà, `507 stockage_plein`. Quotas : 60 documents et 40 Mo (Neon) par contexte ; 40 dépôts / 24 h par déposant (cabinet : illimité).

Types acceptés : `image/jpeg`, `image/png`, `image/webp` (le navigateur réduit les photos en WebP 1 600 px quand c'est une photo ; les **plans** gardent leur PNG/JPEG d'origine), `application/pdf`, et sur R2 seulement `video/mp4`, `video/quicktime`, `video/webm`.

## Contextes et droits

| `contexte` | `objetId` | Lire | Déposer | Modérer |
|---|---|---|---|---|
| `conversation` | id du fil | participants du fil | participants | cabinet |
| `appel` | id de la demande d'appel | participants de l'appel | participants | cabinet |
| `dossier` | id du dossier | client du dossier (`cli_session`), cabinet | client, cabinet | cabinet |
| `rdv` | id du rendez-vous | client du RDV (lien `/rdv/<jeton>`), cabinet | client, cabinet | cabinet |
| `projet` | id du projet (`prj_…`) | membres actifs du projet, cabinet | membres, cabinet | cabinet |
| `demande-prix` | id de la demande | cabinet (et le pro destinataire quand l'invitation existera) | cabinet | cabinet |

Le service ne décide pas seul : chaque porte d'entrée authentifie l'acteur, puis `droits(acteur, contexte, objetId)` vérifie l'appartenance (fil, appel, dossier, RDV, projet) en base.

## API (même forme sous chaque porte d'entrée)

Portes : `/api/cc/depot` (cabinet), `/api/client/depot` (client, cookie `cli_session`), `/api/cercles/espace/depot` (pro), `/api/projets/depot` (membre de projet), `/api/depot` (titulaire d'un **lien** : en-tête `x-acces: messages:<jeton>` | `appel:<jeton>` | `rdv:<jeton>`).

| Méthode | Chemin | Corps / réponse |
|---|---|---|
| `GET` | `…?contexte=&objetId=` | `{ documents: [{ id, nom, type, taille, statut, version, meta, deposant, moi, createdAt, apercu? }] }` (versions comprises, `SUPPRIME` exclus sauf cabinet) |
| `POST` | `…/televersements` | `{ contexte, objetId, nom, type, taille, meta?: { phase?, categorie?, niveau?, version?, legende? }, brouillon? }` (`brouillon`, cabinet seulement : déposé non publié, `A_MODERER`, publié par `…/moderer { decision: "VISIBLE" }`) → `{ id, mode: "neon" \| "r2" \| "r2-multipart", taillePartie, parties }` |
| `PUT` | `…/televersements/<id>/<n>` | octets bruts du morceau `n` (1…parties) ; `…/televersements/<id>/vignette` pour une vignette d'image (facultatif) |
| `POST` | `…/televersements/<id>/terminer` | contrôles (signature, plafonds, PDF, métadonnées retirées) → `{ document }` statut `A_MODERER` ou `VISIBLE` |
| `GET` | `…/<id>/lien[?taille=vignette]` | `{ url, expire }` : lien signé 15 min vers `/api/depot/f/<id>?e=…&s=…` |
| `DELETE` | `…/<id>` | suppression logique (déposant ou cabinet) |
| `POST` | `/api/cc/depot/<id>/moderer` | `{ decision: "VISIBLE" \| "REFUSE", motif? }` |
| `GET` | `/api/cc/depot/a-moderer` | file d'attente de modération |

Lecture d'un fichier : `GET /api/depot/f/<id>?e=<exp>&s=<hmac>` — vérifie la signature et l'expiration seulement (utilisable dans `<img>`, `<video>`, lien de téléchargement) ; `Range` pris en charge sur R2 (lecture vidéo) ; `content-disposition: attachment` pour PDF, `inline` pour images et vidéos ; `cache-control: private, max-age=600`, `x-content-type-options: nosniff`, `content-security-policy: default-src 'none'`.

**Métadonnées libres** (`meta`, toutes facultatives, masquées comme le texte) : `phase` (ex. `ESQ`, `APS`, `APD`, `PC`, `DCE`, `EXE`), `categorie` (ex. `plan-niveau`, `coupe`, `facade`, `vue-3d`, `detail`, `video`, `piece-administrative`, `photo-chantier`), `niveau` (ex. `RDC`, `R+1`, `SS1`), `version` (libellé libre, ex. `B`, `v3`), `legende`. Le service ajoute `version` (entier) : +1 à chaque nouveau dépôt du même nom normalisé dans le même contexte et la même catégorie, l'ancien restant consultable.

**Messages** : un message ne contient qu'une **référence** : `meta.documents = [{ id, nom }]` ; la lecture passe par `…/<id>/lien` avec les droits du lecteur.

## Google Drive (archive)

Variables (Workers & Pages → citurbarea → Settings → Variables and secrets), créées par le fondateur : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (compte Google de CITURBAREA, portée `drive.file`), `GOOGLE_DRIVE_DOSSIER_ID` (dossier racine « CITURBAREA »). Absentes → pas d'archive, le reste fonctionne. Guide : `docs/guides/configurer-google-drive.md`. Un compte de service sans Google Workspace n'a pas d'espace de stockage propre : on utilise donc le compte du cabinet (jeton d'actualisation).

## Briques réutilisées (session Cercles)

`functions/_lib/images.ts` (`typeImage`, `dimensions`, `sansMetadonnees`, `validerImage`, `empreinte`, `versHex`, `depuisBase64`), `apps/web/src/features/fournisseurs/imagesNavigateur.ts` (`preparerImage`), `functions/_lib/coordonnees.ts` (masquage), conventions de `functions/_lib/imagesDepot.ts` (insertion `decode(hex)`, lecture `encode(…, 'base64')`, listes sans octets).
