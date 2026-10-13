# Dépôt de fichiers commun (images, PDF, plans) — briques existantes à réutiliser

Le fondateur veut **un seul** service de dépôt pour les images des fiches Cercles, la messagerie et les documents des appels vidéo, et les documents du dossier client. Les images Cercles sont déjà en service ; ce document décrit ce qui est réutilisable tel quel et propose la forme du service commun (`functions/_lib/documents.ts`), à écrire par la première session qui en a besoin, **sans dupliquer** ces briques.

## Choix de stockage (en vigueur)

- **Pas de R2** tant qu'aucun moyen de paiement n'est enregistré sur le compte Cloudflare (l'activation de R2 en exige un, même dans l'offre gratuite). Le binding `FICHIERS` lu par l'espace projet (`functions/_lib/projetsApi.ts`) n'est pas garanti.
- **Neon `bytea`**, fichiers **réduits dans le navigateur** avant l'envoi : capacité de l'offre gratuite ≈ 0,5 Go pour toute la base → quotas stricts obligatoires.
- Migration vers R2 : seule la lecture/écriture des octets change (colonne `cleR2`, octets vidés) ; les URL publiques et les contrôles restent (procédure : `docs/architecture/contrat-catalogue.md`, « Images des fiches »).

## Briques réutilisables

| Brique | Fichier | Usage |
|---|---|---|
| Contrôle des octets d'image | `functions/_lib/images.ts` | `typeImage` (signature réelle : WebP, JPEG — tout le reste refusé, SVG compris), `dimensions`, `sansMetadonnees` (retire **EXIF / XMP / IPTC / commentaires**, donc les coordonnées GPS), `validerImage(octets, maxOctets, maxCote)`, `idImage` (identifiant non devinable, 128 bits), `empreinte` (SHA-256, ETag), `depuisBase64` / `versBase64` / `versHex`. Fonctions pures, testées (`apps/web/src/features/fournisseurs/images.test.ts`). |
| Réduction dans le navigateur | `apps/web/src/features/fournisseurs/imagesNavigateur.ts` | `preparerImage(File)` → WebP (repli JPEG) 1 600 px + vignette 400 px, sous les plafonds ; le ré-encodage canvas ne garde aucune métadonnée. |
| Stockage et lecture Neon | `functions/_lib/imagesDepot.ts` | Insertion `decode(hex, 'hex')`, lecture des octets un par un en `encode(…, 'base64')` (le driver HTTP Neon n'a pas de type bytea natif), listes **sans** octets. |
| Réponse binaire | `reponseImage(o, req, publique)` dans `functions/_lib/imagesCatalogue.ts` | `ETag` + 304, `cache-control: public, max-age=31536000, immutable` (public, empreinte dans l'URL) ou `private, no-store` (propriétaire, admin), `x-content-type-options: nosniff`, `content-security-policy: default-src 'none'`, `content-disposition: inline`. |
| Masque des coordonnées | `functions/_lib/coordonnees.ts` | `detecterCoordonnees`, `masquerCoordonnees`, `coordonneesDans` : téléphones (chiffres arabes compris), e-mails, liens, messageries — pour les légendes, noms de fichiers et messages (« tout passe par CITURBAREA »). |

Règles déjà appliquées aux images Cercles (à garder pour tout fichier) : type lu dans les octets (jamais le nom ni le `content-type` déclaré), taille et dimensions plafonnées côté serveur, métadonnées retirées côté serveur même si le navigateur l'a fait, identifiant aléatoire, quotas par propriétaire et par objet, **rien de public sans approbation**, accès propriétaire / admin / public distincts (trois routes), corps JSON borné (`lireJson(req, max)`).

## Proposition : `functions/_lib/documents.ts` (service commun)

Table `DocumentDepose` (SQL à fournir, mêmes conventions que `ImageCatalogue`) : `id` (`doc_` + 128 bits), `contexte` (`cercles` | `appel` | `messagerie` | `dossier` …), `objetId`, `proprietaire` (`fournisseur:<id>` | `client:<id>` | `admin:<email>`), `type` (`image/webp` | `image/jpeg` | `application/pdf`), `nom` (masqué par `masquerCoordonnees`), `taille`, `octets`, `vignette` (images seulement), `empreinte`, `statut` (`PRIVE` | `PENDING` | `APPROVED` | `REJECTED`), `createdAt`.

- **Images** : réutiliser `validerImage` + `preparerImage` tels quels.
- **PDF / plans** : signature `%PDF-` obligatoire, plafond (ex. 2 Mo en `bytea`), pas de JavaScript ni de fichier joint (refuser `/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile` dans les octets), métadonnées `/Author`, `/Producer`… neutralisées si possible ; servis en `content-disposition: attachment` et jamais en cache public.
- Accès : le service ne décide pas qui lit ; chaque module (Cercles, appels, dossier) vérifie l'appartenance puis appelle `octets(id)` et `reponseImage`/`reponseFichier`.
- Les images des fiches Cercles restent dans `ImageCatalogue` (en service, publiques après modération) ; une migration vers `DocumentDepose` est possible plus tard sans changer leurs URL.
