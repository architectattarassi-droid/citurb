# Intégration `apps/mobile/` au monorepo CITURBAREA

Ce document liste les ajustements à faire dans le monorepo racine pour intégrer proprement le sous-projet mobile.

---

## 1. `.gitignore` racine

Ajouter au `.gitignore` à la racine du repo :

```gitignore
# ===== apps/mobile (Capacitor) =====
apps/mobile/node_modules/
apps/mobile/dist/
apps/mobile/www/

# Natifs générés par `npx cap add`
apps/mobile/android/
apps/mobile/ios/

# Mais on garde les overrides versionnés :
!apps/mobile/android-overrides/
!apps/mobile/ios-overrides/

# Keystores (NE JAMAIS COMMITTER)
apps/mobile/*.keystore
apps/mobile/*.jks
apps/mobile/keystore.properties
apps/mobile/google-services.json
apps/mobile/GoogleService-Info.plist

# Build outputs
apps/mobile/build/
apps/mobile/ios/App/Pods/
apps/mobile/ios/App/build/
apps/mobile/ios/App/App.xcworkspace/xcuserdata/
apps/mobile/android/app/build/
apps/mobile/android/.gradle/
apps/mobile/android/local.properties
apps/mobile/android/captures/
apps/mobile/android/.idea/

# Capacitor cache
apps/mobile/.capacitor/

# Resources générés (gardés en cache local mais regénérables)
apps/mobile/resources/icon.png
apps/mobile/resources/splash.png
```

---

## 2. Scripts racine `package.json` (optionnel mais recommandé)

Ajouter dans la section `"scripts"` du `package.json` racine :

```json
{
  "scripts": {
    "mobile:install": "npm --prefix apps/mobile install",
    "mobile:sync": "npm --prefix apps/mobile run sync",
    "mobile:dev:android": "npm --prefix apps/mobile run dev:android",
    "mobile:dev:ios": "npm --prefix apps/mobile run dev:ios",
    "mobile:build:android": "npm --prefix apps/mobile run build:android",
    "mobile:build:ios": "npm --prefix apps/mobile run build:ios",
    "mobile:validate": "npm --prefix apps/mobile run validate:config",
    "mobile:open:android": "npm --prefix apps/mobile run open:android",
    "mobile:open:ios": "npm --prefix apps/mobile run open:ios"
  }
}
```

Usage depuis la racine :
```bash
npm run mobile:install
npm run mobile:dev:android
```

---

## 3. Note Railway / déploiement

**Important** : `apps/mobile` n'est PAS déployé sur Railway.

- Railway déploie uniquement `apps/api` (NestJS) + sert `apps/web/dist` (PWA)
- Le build mobile est **manuel** :
  1. Build APK / IPA en local (ou via GitHub Actions, voir `.github/workflows/mobile-build.yml`)
  2. Upload manuel sur Play Console (AAB) / App Store Connect (IPA)

Le `.railwayignore` racine doit contenir :
```
apps/mobile/
```
(c'est déjà le cas vu qu'on exclut `node_modules` & co dans `.gitignore`, mais il vaut mieux être explicite pour ne pas que Nixpacks essaie de builder Capacitor sur Railway).

---

## 4. Workspaces NPM

Le `package.json` racine définit déjà :
```json
"workspaces": ["apps/*", "packages/*"]
```

→ `apps/mobile` est **automatiquement** détecté comme workspace. Aucune modification requise.

Pour éviter le hoisting de Capacitor (qui peut casser le sync), créer optionnellement `apps/mobile/.npmrc` :
```
node-linker=hoisted
package-lock=true
```

---

## 5. Liens entre `apps/web` et `apps/mobile`

Le helper `apps/web/src/lib/native-bridge.ts` détecte `window.CIT_NATIVE` injecté par l'app mobile. Aucune dépendance npm entre les deux packages — c'est un contrat d'interface global volontairement découplé.

Si tu veux partager les types strict, créer optionnellement un package `packages/native-bridge-types/` qui exporte l'interface `CitNativeBridge` consommée par les deux apps.

---

## 6. CI (déjà créé : `.github/workflows/mobile-build.yml`)

Build APK debug à chaque PR vers `main`. Voir le fichier pour la config.

Pour un build release CI complet (signature + upload Play Store), ajouter les secrets GitHub :
- `KEYSTORE_BASE64` (base64 du `citurbarea.keystore`)
- `KEYSTORE_PASSWORD`
- `KEY_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON` (pour upload via fastlane supply)

---

## 7. Checklist intégration initiale

- [ ] Ajouter les patterns au `.gitignore` racine
- [ ] (Optionnel) Ajouter les scripts `mobile:*` au `package.json` racine
- [ ] Ajouter `apps/mobile/` au `.railwayignore` racine
- [ ] Lancer `npm install` depuis la racine (active le workspace)
- [ ] Suivre `apps/mobile/README.md` section 2 pour init Android + iOS
- [ ] Vérifier `npm run mobile:validate` passe en vert
