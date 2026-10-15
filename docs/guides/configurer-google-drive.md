# Archiver les documents déposés dans Google Drive — pas à pas

Pour Yassine. Durée : 20 minutes, gratuit. Sans cette étape, le dépôt de documents fonctionne (stockage Neon / R2) ; avec, chaque document **accepté** est aussi copié dans le Drive de CITURBAREA, rangé par `contexte / identifiant` dans un dossier « CITURBAREA — archives plateforme ».

L'application n'obtient accès qu'aux fichiers **qu'elle crée** (autorisation `drive.file`) : elle ne peut ni lire ni modifier le reste de votre Drive. Vous créez vous-même les identifiants ; ne les transmettez à personne.

## 1. Projet Google Cloud et API Drive

1. Ouvrir **https://console.cloud.google.com** avec le compte Google de CITURBAREA.
2. En haut : sélecteur de projet → **Nouveau projet** → nom « CITURBAREA archives » → **Créer**.
3. Menu → **API et services** → **Bibliothèque** → chercher **Google Drive API** → **Activer**.

## 2. Écran de consentement

1. **API et services** → **Écran de consentement OAuth** (ou « Google Auth Platform ») → type **Externe** → **Créer**.
2. Nom de l'application : `CITURBAREA archives` ; e-mail d'assistance et e-mail du développeur : celui du cabinet → **Enregistrer et continuer**.
3. **Champs d'application** → **Ajouter** → cocher `.../auth/drive.file` → **Mettre à jour** → **Enregistrer et continuer**.
4. Revenir au tableau de bord de l'écran de consentement → **Publier l'application** → **Confirmer**. (En mode « Test », Google invalide l'autorisation au bout de 7 jours ; `drive.file` ne demande pas de vérification par Google.)

## 3. Identifiants OAuth

1. **API et services** → **Identifiants** → **Créer des identifiants** → **ID client OAuth** → type **Application Web**.
2. **URI de redirection autorisés** → ajouter `https://developers.google.com/oauthplayground` → **Créer**.
3. Copier l'**ID client** (`GOOGLE_CLIENT_ID`) et le **code secret du client** (`GOOGLE_CLIENT_SECRET`).

## 4. Jeton d'actualisation (une seule fois)

1. Ouvrir **https://developers.google.com/oauthplayground**.
2. Roue dentée (en haut à droite) → cocher **Use your own OAuth credentials** → coller l'ID client et le secret.
3. À gauche, dans « Input your own scopes », coller `https://www.googleapis.com/auth/drive.file` → **Authorize APIs** → se connecter avec le compte de CITURBAREA → **Autoriser**.
4. **Exchange authorization code for tokens** → copier le **Refresh token** (`GOOGLE_REFRESH_TOKEN`).

## 5. Variables Cloudflare

**dash.cloudflare.com** → **Workers & Pages** → **citurbarea** → **Settings** → **Variables and secrets** → environnement **Production** (et **Preview** pour tester) → **Add**, type **Secret** :

| Nom | Valeur |
|---|---|
| `GOOGLE_CLIENT_ID` | l'ID client |
| `GOOGLE_CLIENT_SECRET` | le secret |
| `GOOGLE_REFRESH_TOKEN` | le jeton d'actualisation |
| `GOOGLE_DRIVE_DOSSIER_ID` | *facultatif* : laissez vide, l'application crée son dossier racine |

Puis **Deployments** → dernier déploiement → **⋯** → **Retry deployment**.

## 6. Vérifier

Dans `/cc/documents`, acceptez un document de test : quelques secondes plus tard, il apparaît dans Google Drive sous « CITURBAREA — archives plateforme / <contexte> / <identifiant> », nommé `v1 — <nom du fichier>`, avec en description qui l'a déposé et quand.

## Et R2 (gros fichiers, vidéos) ?

Les vidéos (jusqu'à 5 Go) et les fichiers de plus de 2 Mo ont besoin de **Cloudflare R2**, qui exige un moyen de paiement enregistré sur le compte Cloudflare (10 Go gratuits par mois, puis environ 0,015 $ par Go et par mois ; aucun frais de sortie). Une fois R2 activé : **R2** → **Create bucket** `citurbarea-fichiers` → **Workers & Pages** → **citurbarea** → **Settings** → **Bindings** → **Add** → **R2 bucket** → nom de variable **`FICHIERS`** → le bucket → **Retry deployment**. Le dépôt bascule tout seul sur R2 ; rien d'autre à changer.
