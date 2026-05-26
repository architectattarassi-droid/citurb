#!/usr/bin/env bash
# ==========================================================
# generate-icons.sh — Génère les icônes iOS+Android depuis icon.svg
# ==========================================================
#
# Convertit apps/web/public/icons/icon.svg en PNG aux tailles requises
# pour iOS (AppIcon.appiconset) et Android (mipmap-*).
#
# Prérequis :
#   - ImageMagick (`magick` ou `convert`) OU `sharp` via npx
#   - SVG source : apps/web/public/icons/icon.svg
#
# Output :
#   - resources/icon.png (1024x1024 master)
#   - resources/splash.png (2732x2732 master)
#   - Puis `npx @capacitor/assets generate` génère tous les variants

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$MOBILE_ROOT/../.." && pwd)"

cd "$MOBILE_ROOT"

SVG_SOURCE="$REPO_ROOT/apps/web/public/icons/icon.svg"
RESOURCES_DIR="$MOBILE_ROOT/resources"

if [[ ! -f "$SVG_SOURCE" ]]; then
    echo "[ERR] Source SVG introuvable : $SVG_SOURCE" >&2
    exit 1
fi

mkdir -p "$RESOURCES_DIR"

echo "==> [1/3] Convert SVG → PNG master (1024x1024 icon)..."
if command -v magick >/dev/null 2>&1; then
    magick -background "#0A2540" -density 384 "$SVG_SOURCE" -resize 1024x1024 "$RESOURCES_DIR/icon.png"
elif command -v convert >/dev/null 2>&1; then
    convert -background "#0A2540" -density 384 "$SVG_SOURCE" -resize 1024x1024 "$RESOURCES_DIR/icon.png"
elif command -v npx >/dev/null 2>&1; then
    # Fallback sharp
    npx --yes sharp-cli -i "$SVG_SOURCE" -o "$RESOURCES_DIR/icon.png" --width 1024 --height 1024 --background "#0A2540"
else
    echo "[ERR] Aucun convertisseur disponible (magick / convert / sharp)." >&2
    exit 1
fi

echo "==> [2/3] Génère splash master (2732x2732 navy bg)..."
if command -v magick >/dev/null 2>&1; then
    magick -size 2732x2732 xc:"#0A2540" \
        \( "$SVG_SOURCE" -resize 800x800 \) -gravity center -composite \
        "$RESOURCES_DIR/splash.png"
elif command -v convert >/dev/null 2>&1; then
    convert -size 2732x2732 xc:"#0A2540" \
        \( "$SVG_SOURCE" -resize 800x800 \) -gravity center -composite \
        "$RESOURCES_DIR/splash.png"
fi

echo "==> [3/3] Génère tous les variants via @capacitor/assets..."
# Cet outil officiel Capacitor génère :
#   - ios/App/App/Assets.xcassets/AppIcon.appiconset/* (toutes tailles)
#   - ios/App/App/Assets.xcassets/Splash.imageset/*
#   - android/app/src/main/res/mipmap-*/* (mdpi → xxxhdpi)
#   - android/app/src/main/res/drawable-*/splash.png
npx --yes @capacitor/assets generate \
    --iconBackgroundColor "#0A2540" \
    --iconBackgroundColorDark "#0A2540" \
    --splashBackgroundColor "#0A2540" \
    --splashBackgroundColorDark "#0A2540"

echo ""
echo "[OK] Icônes générées."
echo "  Master : $RESOURCES_DIR/icon.png + $RESOURCES_DIR/splash.png"
echo "  iOS    : ios/App/App/Assets.xcassets/"
echo "  Android: android/app/src/main/res/mipmap-*/"
