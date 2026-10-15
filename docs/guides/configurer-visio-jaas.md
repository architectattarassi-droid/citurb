# Activer la salle vidéo intégrée (JaaS, 8x8) — pas à pas

Pour Yassine. Durée : 15 minutes. Sans cette étape, les **demandes** d'appel fonctionnent déjà (envoi, acceptation, refus, rappels), mais la salle affiche « visio pas encore activée ».

Les rendez-vous `/rendez-vous`, le suivi de chantier et les appels sur demande utilisent tous la même salle : une seule configuration.

## 1. Créer le compte gratuit JaaS

1. Ouvrir **https://jaas.8x8.vc** → **Start for free** (ou *Sign up*).
2. S'inscrire avec l'adresse du cabinet (Google ou e-mail + code). Choisir l'offre gratuite **JaaS Dev** (jusqu'à 25 utilisateurs actifs par mois). Si une carte bancaire est demandée, vous êtes sur une offre payante : revenez en arrière.
3. Dans la console, en haut de la page d'accueil, repérer l'**AppID** : il commence par `vpaas-magic-cookie-…`. **Copier-le** : c'est `JAAS_APP_ID`.

## 2. Générer la clé

1. Menu de gauche → **API Keys** → **Add API key** → **Generate API key pair**.
2. Le navigateur télécharge un fichier de **clé privée** (extension `.pk` ou `.pem`). **Gardez-le en lieu sûr, il ne sera plus jamais affiché.** Ne l'envoyez à personne, ne le mettez pas dans le dépôt.
3. Dans la liste des clés, copier le **Key ID** (la partie après la barre oblique, ou la valeur complète `vpaas-magic-cookie-…/abc123`, les deux sont acceptées) : c'est `JAAS_KEY_ID`.
4. Ouvrir le fichier de clé privée avec le Bloc-notes : tout le texte, de `-----BEGIN PRIVATE KEY-----` à `-----END PRIVATE KEY-----` inclus, est `JAAS_PRIVATE_KEY_PEM`.

   Si le champ Cloudflare refuse les retours à la ligne, copier la clé sur une seule ligne avec PowerShell (remplacez le chemin) — la valeur va dans le presse-papiers :

   ```powershell
   (Get-Content -Raw "C:\Users\yassine\Downloads\cle-jaas.pk") -replace "\r?\n", '\n' | Set-Clipboard
   ```

## 3. Coller les variables dans Cloudflare

1. **dash.cloudflare.com** → **Workers & Pages** → **citurbarea** → **Settings** → **Variables and secrets**.
2. Onglet / environnement **Production** → **Add** (type **Secret** pour la clé, **Text** ou **Secret** pour les deux autres) :

   | Nom | Valeur |
   |---|---|
   | `JAAS_APP_ID` | `vpaas-magic-cookie-…` |
   | `JAAS_KEY_ID` | l'identifiant de la clé |
   | `JAAS_PRIVATE_KEY_PEM` | la clé privée (Secret) |
   | `APPELS_SECRET` *(recommandé)* | 48 caractères aléatoires (Secret) — sinon `ADMIN_SESSION_SECRET` sert de secret |

   Pour générer `APPELS_SECRET` (PowerShell, la valeur va dans le presse-papiers) :

   ```powershell
   $b = New-Object byte[] 36; [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($b); [Convert]::ToBase64String($b) | Set-Clipboard
   ```

3. **Save**.
4. Pour tester avant la mise en production sur `feat-backoffice-leads-local.citurbarea.pages.dev`, ajouter les **mêmes** variables dans l'environnement **Preview**.
5. Les variables ne s'appliquent qu'au prochain déploiement : **Deployments** → dernier déploiement **Production** → menu **⋯** → **Retry deployment** (idem pour Preview).

## 4. Créer les tables (une fois)

console.neon.tech → projet **citurbarea** → branche **production** → **SQL Editor** → coller le contenu de `docs/sql/appels-video-neon.sql` → **Run**. La dernière ligne doit afficher `DemandeAppel` et `BlocageAppel`.

## 5. Vérifier

- `/cc/appels` s'ouvre sans message « pas encore ouverts ».
- Faire une demande test **entre vos propres adresses** (jamais à un vrai client) : une fiche pro de test → « Demander un appel vidéo » → acceptez depuis l'espace pro ou le lien reçu → à l'heure prévue (10 min avant), « Rejoindre l'appel » ouvre la salle.
- Si la salle affiche une erreur de jeton : vérifier que `JAAS_KEY_ID` correspond bien à la clé dont vous avez collé la partie privée.

## Rappels avant l'appel (facultatif)

Les rappels partent quand le back-office ou un espace pro ouvre la liste des appels. Pour des rappels ponctuels sans dépendre de ces visites : créer `APPELS_CRON_CLE` (≥ 24 caractères, même méthode que `APPELS_SECRET`) puis un cron gratuit (ex. cron-job.org) toutes les 10 minutes : `POST https://citurbarea.com/api/appels/rappels` avec l'en-tête `x-cle-cron: <la valeur>`.

## Trace et enregistrement des appels (facultatif)

**Sans rien configurer**, chaque appel garde déjà une trace : qui est entré dans la salle et quand, les accords sur les créneaux, et un **compte rendu écrit** rédigé par un participant puis validé (ou contesté) par les autres. Rien n'est enregistré en vidéo.

### Durée réelle de l'appel (webhook JaaS, gratuit)

1. Console JaaS → **Webhooks** → **Add endpoint** → URL : `https://citurbarea.com/api/appels/jaas`.
2. Cocher au moins : `PARTICIPANT_JOINED`, `PARTICIPANT_LEFT`, `ROOM_CREATED`, `ROOM_DESTROYED`, `RECORDING_STARTED`, `RECORDING_ENDED`, `RECORDING_UPLOADED`.
3. **Reveal secret** → copier le secret → Cloudflare (Variables and secrets, Production) : `JAAS_WEBHOOK_SECRET` (type Secret) → **Retry deployment**.

### Enregistrement vidéo (payant chez 8x8)

- **Règle** : l'appel ne peut être enregistré que si **toutes** les personnes ont coché « J'accepte l'enregistrement » (finalité, conservation 12 mois et droits loi 09-08 affichés) ; chacune peut retirer son accord à tout moment et arrêter l'enregistrement dans la salle. Sans l'accord de tous, le bouton d'enregistrement n'existe pas, et un fichier reçu quand même n'est jamais conservé.
- **Coût** : 8x8 facture l'enregistrement **0,01 $ par minute** (option « Recordings » de la grille JaaS) ; vérifiez dans la console JaaS qu'il est proposé sur votre offre (le plan gratuit « Dev » ne le garantit pas : si l'option est absente, il faut passer sur une offre payante, à partir de 99 $ / mois).
- **Stockage** : 8x8 ne garde le fichier que **24 heures**. CITURBAREA le récupère automatiquement (webhook ci-dessus) et le range dans les documents de l'appel **si R2 est activé** (`docs/guides/configurer-google-drive.md`, dernière partie). Sans R2, vous recevez un e-mail avec le lien 8x8 à télécharger vous-même sous 24 h.
- **À faire avant d'activer** : ajouter dans les CGU / la politique de confidentialité le paragraphe « Messagerie et appels vidéo » (`docs/architecture/contrat-messagerie.md`) complété de l'enregistrement, et vérifier la déclaration du traitement auprès de la CNDP.
