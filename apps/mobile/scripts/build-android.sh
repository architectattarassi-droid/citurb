#!/usr/bin/env bash
# ==========================================================
# build-android.sh — Build APK/AAB release Android CITURBAREA
# ==========================================================
#
# Workflow :
#   1. Compile le bridge TypeScript → dist/
#   2. Copie dist/ vers www/ (web assets embarqués)
#   3. cap sync android (copie www/ + plugins → android/app/src/main/assets/)
#   4. Gradle assembleRelease (APK signé) + bundleRelease (AAB pour Play Store)
#
# Prérequis :
#   - JDK 17 installé + JAVA_HOME défini
#   - Android SDK 34+ via Android Studio
#   - Keystore configuré dans android/app/build.gradle :
#       signingConfigs {
#           release {
#               storeFile file('citurbarea.keystore')
#               storePassword System.getenv('KEYSTORE_PASSWORD')
#               keyAlias 'citurbarea'
#               keyPassword System.getenv('KEY_PASSWORD')
#           }
#       }
#   - Variables env : KEYSTORE_PASSWORD, KEY_PASSWORD
#
# Output :
#   - android/app/build/outputs/apk/release/app-release.apk   (sideload)
#   - android/app/build/outputs/bundle/release/app-release.aab (Play Store)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MOBILE_ROOT"

echo "==> [1/4] Compile bridge TypeScript..."
npm run build

echo "==> [2/4] Copy dist/ → www/..."
mkdir -p www
cp -r dist/* www/ 2>/dev/null || true

echo "==> [3/4] Capacitor sync android..."
npx cap sync android

echo "==> [4/4] Gradle build release..."
cd android

# APK (sideload + Internal Testing manuel)
./gradlew assembleRelease

# AAB (upload Play Store recommandé)
./gradlew bundleRelease

echo ""
echo "[OK] Build terminé."
echo "  APK : android/app/build/outputs/apk/release/app-release.apk"
echo "  AAB : android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "Étape suivante : upload sur Play Console → Internal Testing track."
