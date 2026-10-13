# Espace projet CITURBAREA : le projet décomposé en jalons

*13 octobre 2026. Document de cadrage. Il fixe ce qu'on construit et dans quel ordre.*

## Objectif

Chaque projet (villa, immeuble, lotissement…) est décomposé en **centaines de jalons**, de la faisabilité à la réception définitive. Chaque jalon est un **espace de travail partagé** entre le client, l'architecte, les prestataires (BET, bureau de contrôle, laboratoire, entreprises, topographe…) et l'administrateur CITURBAREA. Chaque jalon réunit :

| Bloc | Contenu |
|---|---|
| **Exigences** | Les règles applicables (lois, décrets, normes NM / NF / EN, DTU, RPS 2011, RTCM, incendie, accessibilité…), **reformulées** dans nos mots, avec leur référence. Elles remontent automatiquement selon le projet (type, sous-sol, hauteur, zone sismique, ERP, ascenseur…). |
| **Checklist** | Les points à vérifier en conception et en exécution. Chacun indique un responsable et la preuve attendue (photo, PV, essai, mesure, document). Un point d'arrêt bloque le jalon suivant. |
| **Documents** | Les pièces à fournir et les documents produits, avec leurs versions. |
| **PV et documents types** | Des formulaires à remplir en ligne (PV de réception des fonds de fouille, des armatures, d'essai d'étanchéité, compte rendu de réunion, réserves…). Ils s'impriment proprement, en PDF via le navigateur, avec les signatures. |
| **Discussion** | Un fil de messages par jalon, entre tous les intervenants, horodaté et conservé. |
| **Photos / vidéos** | Des dépôts depuis le téléphone sur le chantier, rattachés au jalon et au point de checklist qu'ils prouvent. |
| **Réunions** | Une visio intégrée (module visio JaaS) avec la checklist et le PV à l'écran. |

**Règle de droit d'auteur.** Les normes NM, NF, EN et DTU sont payantes et protégées. Le référentiel n'en reproduit **jamais** le texte : il dit, avec nos mots, ce qu'il faut faire et vérifier, et donne la référence. Les textes du Bulletin officiel peuvent être résumés librement.

**Impression.** Les PV et les documents de projet sont imprimables. C'est l'inverse des guides publics, que l'on protège de l'impression. L'espace projet est privé, réservé aux membres du projet.

## Architecture

| Couche | Choix |
|---|---|
| **Référentiel** (jalons, exigences, normes, modèles) | Données versionnées dans le dépôt : `apps/web/src/domain/referentiel/data/*.json`, un fichier par domaine. Elles sont contrôlées par un test d'intégrité. L'ossature des phases vient de `packages/contracts/src/phases.catalog.ts`, celle des lots de `domain/chiffrage/lots.ts`. |
| **Données du projet** (avancement, coches, messages, documents, PV remplis) | Neon (Postgres), via Pages Functions (`functions/api/projets/*`). |
| **Fichiers** (photos, vidéos, PDF, plans) | **Cloudflare R2**, l'offre gratuite de stockage objet de Cloudflare (10 Go à vérifier sur la page tarifs). Le stockage est rattaché au projet Pages. Les fichiers sont privés et servis par une fonction qui vérifie l'appartenance au projet. |
| **Accès** | Sans mot de passe : lien personnel et code à usage unique envoyé par e-mail ou WhatsApp. Un rôle par membre : client, architecte, BET, contrôle, entreprise, sous-traitant, admin. L'architecte invite les intervenants. |
| **Temps réel** | Rafraîchissement périodique (polling) au départ, suffisant pour les discussions de chantier. |
| **Visio** | Module visio intégré (JaaS), partagé avec les rendez-vous. |

## Ordre de construction

1. **Référentiel** (en cours) : quatre domaines rédigés en parallèle.
   - Structure / géotechnique / sismique / béton.
   - Enveloppe et second œuvre / RTCM.
   - Lots techniques, incendie, accessibilité, sécurité chantier.
   - Conception, autorisations, contrats, réceptions.
   - Validation finale par l'architecte.
2. **Visualiseur du référentiel** dans le back-office : choisir un type de projet et voir ses jalons, ses exigences, ses checklists et ses modèles.
3. **Espace projet**, lot 1 :
   - projet rattaché au dossier ;
   - jalons générés depuis le référentiel ;
   - checklist cochable avec preuve ;
   - PV types à remplir et à imprimer ;
   - discussion par jalon ;
   - dépôt de photos et de vidéos sur R2 ;
   - accès des membres sans mot de passe.
4. **Espace projet**, lot 2 :
   - réunions visio rattachées au jalon ;
   - notifications par e-mail et WhatsApp ;
   - tableau de bord d'avancement ;
   - paiements à l'avancement (jalons « paiementMilestone ») ;
   - export du dossier des ouvrages exécutés.

## Ce que le propriétaire doit faire

- **Activer R2** dans Cloudflare : R2, puis Activer. Une carte bancaire peut être demandée même pour l'offre gratuite, à vérifier. Ensuite, créer un bucket `citurbarea-projets`.
- **Relire et valider** les quatre fichiers du référentiel. C'est sa signature d'architecte qui en fait la valeur.
