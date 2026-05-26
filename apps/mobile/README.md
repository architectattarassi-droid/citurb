# CITURBAREA Mobile — Capacitor 6 (iOS + Android)

Wrapper natif iOS + Android autour de la PWA citurbarea.com, basé sur **Capacitor 6**.

Cette app n'embarque PAS de bundle JS propre : elle charge directement la PWA distante via `server.url`. Cela permet de pousser des correctifs frontend sans review du store (deploy Railway → instantané).

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Installation initiale](#2-installation-initiale)
3. [Développement local (hot reload)](#3-développement-local-hot-reload)
4. [Build production APK (Android)](#4-build-production-apk-android)
5. [Build production IPA (iOS)](#5-build-production-ipa-ios)
6. [OTA Updates (correctifs sans store review)](#6-ota-updates)
7. [Stratégie Maroc (paiement + conformité)](#7-stratégie-maroc)
8. [Debug & inspection WebView](#8-debug--inspection-webview)
9. [Architecture du bridge JS ↔ Natif](#9-architecture-du-bridge)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prérequis

### Tous OS
- **Node.js 20+** (`node -v` → v20.x.x)
- **npm 10+** ou pnpm 8+

### Android (Windows / macOS / Linux)
- **JDK 17** (Temurin recommandé — https://adoptium.net)
  - Vérifier : `java -version` → `openjdk version "17.x.x"`
  - `JAVA_HOME` doit pointer vers le dossier JDK 17
- **Android Studio Hedgehog (2023.1)** ou plus récent
  - Installer via https://developer.android.com/studio
  - SDK Manager : installer **Android SDK 34** + **Build Tools 34.0.0** + **Platform Tools**
  - AVD Manager : créer un émulateur (Pixel 7 / API 34 recommandé)
- Variables d'environnement (à ajouter au shell profile) :
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk           # Linux/macOS
  # OU sous Windows : %LOCALAPPDATA%\Android\Sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
  ```

### iOS (macOS uniquement)
- **macOS Sonoma 14+** (requis par Xcode 15)
- **Xcode 15+** via App Store (~10 GB)
- **CocoaPods** : `sudo gem install cocoapods` puis `pod --version` ≥ 1.14
- **Apple Developer Account** (99 USD/an) — requis pour TestFlight + AppStore
- Simulator iOS 17 préinstallé avec Xcode (sinon : Xcode → Settings → Platforms)

### Vérification rapide
```bash
node -v        # v20.x.x
java -version  # 17.x.x
adb --version  # Android Debug Bridge 1.x
# Sur macOS :
xcodebuild -version  # Xcode 15.x
pod --version        # 1.14+
```

---

## 2. Installation initiale

```bash
# Depuis la racine du monorepo
cd apps/mobile

# 1. Installer les dépendances npm (Capacitor + 16 plugins)
npm install

# 2. Compiler le bridge TypeScript
npm run build

# 3. Créer le dossier www/ (web assets fallback offline)
mkdir -p www && cp dist/* www/

# 4. Ajouter les plateformes natives (génère ios/ et android/)
npx cap add android
npx cap add ios       # macOS uniquement

# 5. Sync (copie les plugins natifs + www/ vers ios/ et android/)
npx cap sync

# 6. Merger les permissions natives
#    Android : copier le contenu de android-overrides/app/src/main/AndroidManifest.permissions.xml
#              vers android/app/src/main/AndroidManifest.xml (dans le <manifest>)
#    iOS    : copier les <key>/<string> de ios-overrides/App/App/Info.plist.additions.xml
#              vers ios/App/App/Info.plist (dans le <dict>)

# 7. Générer les icônes + splash (depuis apps/web/public/icons/icon.svg)
bash scripts/generate-icons.sh
```

À ce stade, tu peux ouvrir le projet natif :
```bash
npx cap open android  # ouvre Android Studio
npx cap open ios      # ouvre Xcode (macOS)
```

---

## 3. Développement local (hot reload)

Le hot reload Capacitor charge la PWA Vite (port 5173) directement depuis ton PC sur le device/émulateur, via le réseau WiFi.

### Android

```bash
# Terminal 1 — Lance la PWA Vite
cd /path/to/repo
npm run dev:web   # http://localhost:5173

# Terminal 2 — Lance l'app Android avec livereload
cd apps/mobile
bash scripts/dev-android.sh
# OU : npx cap run android --livereload --external --host=192.168.X.X
```

**Important :**
- Téléphone et PC sur le **même réseau WiFi**
- Désactiver le pare-feu Windows pour le port 5173 (ou ajouter une règle)
- En cas de "ERR_CONNECTION_REFUSED" : vérifier que Vite est démarré avec `--host 0.0.0.0` (configuré par défaut dans `apps/web/vite.config.ts`)

### iOS (macOS uniquement)

```bash
# Terminal 1
npm run dev:web

# Terminal 2
cd apps/mobile
bash scripts/dev-ios.sh
```

Au lancement, choisis Simulator ou device physique. Le device doit être en mode "Trust This Computer".

---

## 4. Build production APK (Android)

### 4.1 Générer le keystore (à faire UNE seule fois)

```bash
keytool -genkey -v \
    -keystore citurbarea.keystore \
    -alias citurbarea \
    -keyalg RSA -keysize 2048 \
    -validity 10000
# Mots de passe — NOTER PRÉCIEUSEMENT (perte = impossibilité de mettre à jour l'app)
```

Déplacer `citurbarea.keystore` dans `android/app/citurbarea.keystore` (gitignored).

### 4.2 Configurer `android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file('citurbarea.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias 'citurbarea'
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4.3 Build

```bash
export KEYSTORE_PASSWORD="ton_mdp_keystore"
export KEY_PASSWORD="ton_mdp_key"

cd apps/mobile
bash scripts/build-android.sh
```

Output :
- `android/app/build/outputs/apk/release/app-release.apk` (sideload direct)
- `android/app/build/outputs/bundle/release/app-release.aab` (Play Store)

### 4.4 Upload Play Store

1. Créer une app sur https://play.google.com/console (frais unique 25 USD)
2. Bundle ID : `com.citurbarea.app`
3. **Internal Testing** track → upload `app-release.aab` → ajouter testeurs par email
4. Une fois validé interne → **Closed Testing** → **Open Testing** → **Production**
5. Délai review : ~1-7 jours (premier soumission ~7j, updates ~1-2j)

---

## 5. Build production IPA (iOS)

### 5.1 Setup Apple Developer

1. S'inscrire à https://developer.apple.com (99 USD/an)
2. Créer un App ID `com.citurbarea.app` dans Certificates, Identifiers & Profiles
3. Créer une app sur https://appstoreconnect.apple.com
4. Dans Xcode : Settings → Accounts → ajouter ton Apple ID
5. Ouvrir `ios/App/App.xcworkspace` → onglet Signing & Capabilities → Team = ton équipe → "Automatically manage signing"

### 5.2 Build

```bash
cd apps/mobile
bash scripts/build-ios.sh
```

Output :
- `build/CITURBAREA.xcarchive`
- `build/export/CITURBAREA.ipa`

### 5.3 Upload TestFlight

```bash
xcrun altool --upload-app --type ios \
    --file build/export/CITURBAREA.ipa \
    --username "ton-apple-id@example.com" \
    --password "xxxx-xxxx-xxxx-xxxx"   # App-specific password (à générer sur appleid.apple.com)
```

Ou utiliser **Transporter** (app gratuite Mac App Store) avec drag & drop.

### 5.4 Workflow TestFlight → AppStore

1. Upload IPA → traitement Apple ~30 min
2. Onglet TestFlight → ajouter Internal Testers (jusqu'à 100, instantané)
3. Externe : créer un groupe → soumettre à review TestFlight (~24h) → distribuer
4. Production : App Store Connect → "Distribution" → soumettre pour review (~24-48h)

---

## 6. OTA Updates

Pour pousser des correctifs **sans store review** (gain : 1-7 jours → instantané) :

### Option A — server.url (déjà actif)

L'app charge `https://citurbarea.com` à chaque ouverture. **Tout changement déployé sur Railway est immédiatement actif** dans l'app native. Aucune action requise.

**Limites :**
- Marche uniquement online (offline = écran blanc sauf fallback `offline.html`)
- Apple/Google peuvent demander à voir des features natives suffisantes pour justifier le wrapping

### Option B — @capgo/capacitor-updater (assets embarqués mis à jour OTA)

Pour un mode hybride (assets embarqués + update OTA), installer :

```bash
npm install @capgo/capacitor-updater
npx cap sync
```

Puis configurer dans `capacitor.config.ts` :
```ts
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
    appReadyTimeout: 10000,
    responseTimeout: 20000,
    autoDeleteFailed: true,
    autoDeletePrevious: true,
  }
}
```

Et créer un compte sur https://capgo.app (gratuit jusqu'à 1000 utilisateurs).

### Règle Apple (à connaître)

Apple **autorise** les updates JS/CSS/HTML over-the-air tant que :
- Aucune nouvelle fonctionnalité native n'est ajoutée
- L'app reste fonctionnellement équivalente à celle reviewée

Source : [App Store Review Guideline 3.3.2](https://developer.apple.com/app-store/review/guidelines/#3.3.2)

---

## 7. Stratégie Maroc

### 7.1 Paiements

**Stripe** est officiellement accepté par Bank Al-Maghrib depuis 2020 (via la filiale Stripe France pour les commerçants marocains avec compte bancaire en EU/UK/US).

**Options pour CITURBAREA :**

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **Stripe via webview** (actuel) | Pas de commission store (0%), flux Stripe standard | UX moins fluide qu'un IAP natif |
| **Apple In-App Purchase** | UX native, 1-tap pay | Commission 15-30%, TVA Maroc 20% en plus, pas remboursable hors Apple |
| **Google Play Billing** | UX native | Commission 15-30%, TVA Maroc 20% en plus |
| **CMI / Maroc Telecommerce** | Acteurs locaux, cartes 100% MA | Intégration custom (pas de SDK officiel Capacitor) |

**Décision actuelle** : Stripe via webview pour P1-P6. Les IAP natifs sont **interdits par Apple/Google** pour les services physiques (urbanisme = service physique → exemption IAP applicable).

### 7.2 Conformité Loi 09-08 (CNDP)

La **Commission Nationale de contrôle de la protection des Données à caractère Personnel** (CNDP) impose :

- **Déclaration préalable** de tout traitement de données personnelles (formulaire en ligne sur https://www.cndp.ma)
- **Hébergement** : données utilisateurs marocains hébergées au Maroc OU dans un pays "adéquat" (UE OK)
- **Consentement explicite** pour collecte (à intégrer dans l'onboarding)
- **Droit à l'oubli** : endpoint `DELETE /api/users/me` requis (vérifier dans `apps/api/`)

**Action requise :**
1. Déclarer le traitement "Gestion de dossiers d'urbanisme" auprès CNDP
2. Publier une politique de confidentialité accessible depuis Settings de l'app
3. Lien obligatoire dans la fiche Play Store + App Store

### 7.3 Géolocalisation

Le Maroc impose la déclaration des apps utilisant la géolocalisation à des fins commerciales. Inclus dans la déclaration CNDP.

### 7.4 Devises affichage

- Stripe charge en MAD (devise principale)
- Apple/Google IAP : devise du compte du store (souvent EUR pour Maroc faute de MAD support complet)

---

## 8. Debug & inspection WebView

### iOS — Safari Web Inspector

1. Sur l'iPhone : **Réglages → Safari → Avancé → Inspecteur Web** : ON
2. Sur le Mac : **Safari → Préférences → Avancé → Afficher le menu Développement**
3. Connecter le device USB
4. Safari → **Développement → [nom device] → CITURBAREA** → DevTools s'ouvre

### Android — Chrome DevTools

1. Sur le téléphone : **Paramètres → À propos → Tapoter 7x sur "Numéro de build"** pour activer mode dev
2. **Paramètres → Options de développement → Débogage USB** : ON
3. Connecter USB → autoriser "Allow USB debugging" sur le téléphone
4. Sur le PC : ouvrir Chrome → `chrome://inspect/#devices`
5. Cliquer "Inspect" sous l'app CITURBAREA → DevTools s'ouvre

**Bonus :** Sur builds release, le debug WebView est désactivé. Pour activer temporairement, modifier `capacitor.config.ts` :
```ts
android: {
  webContentsDebuggingEnabled: true  // Toujours true en dev
}
```

### Logs natifs

```bash
# Android
adb logcat -s Capacitor:V Console:V chromium:V

# iOS Simulator
xcrun simctl spawn booted log stream --predicate 'process == "App"'
```

---

## 9. Architecture du bridge

Le bridge expose des fonctions natives à la PWA via `window.CIT_NATIVE`.

**Côté mobile (`apps/mobile/src/native-bridge.ts`) :**
- Initialise les plugins Capacitor au boot WebView
- Expose `window.CIT_NATIVE.{share, haptic, geo, camera, requestPush, ...}`
- Dispatche des CustomEvents (`cit:back`, `cit:deeplink`, `cit:push`) pour les hooks PWA

**Côté PWA (`apps/web/src/lib/native-bridge.ts`) :**
```ts
import { native, isNative, onNativeBack } from '@/lib/native-bridge';

// Usage uniforme — fallback Web APIs si pas en natif
await native().haptic('success');
const photo = await native().camera('camera');

// Hooks lifecycle
useEffect(() => onNativeBack(() => router.back() === false), [router]);
```

Le helper `native()` retourne TOUJOURS un objet avec les mêmes signatures — pas de check `if (window.CIT_NATIVE)` nécessaire dans le code applicatif.

---

## 10. Troubleshooting

| Symptôme | Cause probable | Fix |
|----------|----------------|-----|
| "JAVA_HOME not set" | JDK 17 non installé / variable absente | Installer Temurin 17 + ajouter `export JAVA_HOME=...` au shell |
| `cap sync` : "ios platform not added" | macOS : `pod install` jamais lancé | `cd ios/App && pod install` |
| Hot reload Android : ERR_CONNECTION_REFUSED | Pare-feu Windows bloque 5173 | Allow port 5173 dans Windows Defender Firewall |
| iOS Build : "No signing certificate" | Pas configuré dans Xcode | Xcode → Signing & Capabilities → Team = ton équipe |
| Splash reste affiché indéfiniment | PWA n'appelle pas `hideSplash()` | Vérifier que `native().hideSplash()` est appelé au mount du root component |
| Push iOS reçu mais pas Android | FCM pas configuré | Ajouter `google-services.json` dans `android/app/` (depuis Firebase Console) |
| WebView affiche écran blanc | server.url HS ou CORS | Vérifier `https://citurbarea.com` répond + headers CORS OK |
| Geo retourne null sur Android 13+ | Permission runtime refusée | L'utilisateur doit aller Settings → Apps → CITURBAREA → Permissions → Location |
| `npx cap sync` : "config not found" | tsconfig pas compilé | `npm run build` avant `npx cap sync` |

---

## Ressources externes

- [Capacitor 6 Docs](https://capacitorjs.com/docs)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Material Design 3](https://m3.material.io)
- [CNDP Maroc — déclaration](https://www.cndp.ma)
- [Stripe Morocco](https://stripe.com/en-ma)

---

**Maintenu par :** équipe CITURBAREA
**Licence :** propriétaire (voir LICENSE racine)
