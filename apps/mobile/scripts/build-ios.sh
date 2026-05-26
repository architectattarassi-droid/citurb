#!/usr/bin/env bash
# ==========================================================
# build-ios.sh — Build IPA release iOS CITURBAREA
# ==========================================================
#
# Workflow :
#   1. Compile le bridge TypeScript → dist/
#   2. Copie dist/ vers www/ (web assets embarqués)
#   3. cap sync ios (copie www/ + plugins → ios/App/App/public/)
#   4. xcodebuild archive (génère .xcarchive signé)
#   5. xcodebuild exportArchive (génère .ipa pour TestFlight/AppStore)
#
# Prérequis (macOS uniquement) :
#   - Xcode 15+ installé
#   - Compte Apple Developer ($99/an)
#   - Provisioning profile + Distribution certificate configurés dans Xcode
#   - CocoaPods installé : `sudo gem install cocoapods`
#   - Bundle ID `com.citurbarea.app` enregistré sur App Store Connect
#
# Output :
#   - build/CITURBAREA.xcarchive (archive Xcode)
#   - build/export/CITURBAREA.ipa (à uploader via Transporter / xcrun altool)
#
# Distribution :
#   - TestFlight : xcrun altool --upload-app --type ios --file CITURBAREA.ipa
#   - AppStore : via App Store Connect après TestFlight validé

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MOBILE_ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "[ERR] Build iOS uniquement disponible sur macOS." >&2
    exit 1
fi

echo "==> [1/5] Compile bridge TypeScript..."
npm run build

echo "==> [2/5] Copy dist/ → www/..."
mkdir -p www
cp -r dist/* www/ 2>/dev/null || true

echo "==> [3/5] Capacitor sync ios..."
npx cap sync ios

echo "==> [4/5] Install pods..."
cd ios/App
pod install --repo-update
cd ../..

echo "==> [5/5] Xcode archive + export..."
mkdir -p build

# Archive
xcodebuild \
    -workspace ios/App/App.xcworkspace \
    -scheme App \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/CITURBAREA.xcarchive \
    archive

# ExportOptions.plist (à personnaliser pour ton team ID)
cat > build/ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID_HERE</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
EOF

# Export IPA
xcodebuild \
    -exportArchive \
    -archivePath build/CITURBAREA.xcarchive \
    -exportPath build/export \
    -exportOptionsPlist build/ExportOptions.plist

echo ""
echo "[OK] Build terminé."
echo "  Archive : build/CITURBAREA.xcarchive"
echo "  IPA     : build/export/CITURBAREA.ipa"
echo ""
echo "Étape suivante :"
echo "  xcrun altool --upload-app --type ios --file build/export/CITURBAREA.ipa \\"
echo "    --username \"$APPLE_ID\" --password \"$APPLE_APP_PASSWORD\""
