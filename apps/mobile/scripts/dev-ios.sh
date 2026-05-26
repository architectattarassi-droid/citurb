#!/usr/bin/env bash
# ==========================================================
# dev-ios.sh — Hot reload iOS sur device/simulator
# ==========================================================
#
# Lance l'app iOS en mode dev avec hot reload depuis la PWA Vite.
#
# Workflow :
#   1. Détecte l'IP locale
#   2. cap run ios --livereload --external --host=<ip>
#
# Prérequis (macOS uniquement) :
#   - `npm run dev:web` tourne (port 5173)
#   - Xcode 15+ installé
#   - Simulator iOS lancé OU device iOS connecté + Trust This Computer
#
# Astuce debug :
#   - Safari → Develop → <device> → <app> pour DevTools sur la WKWebView
#   - Activer "Web Inspector" dans Réglages Safari du device iOS

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MOBILE_ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "[ERR] Dev iOS uniquement disponible sur macOS." >&2
    exit 1
fi

detect_ip() {
    ifconfig | grep -E 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n1
}

LOCAL_IP="${LOCAL_IP:-$(detect_ip)}"
DEV_PORT="${DEV_PORT:-5173}"
DEV_URL="http://${LOCAL_IP}:${DEV_PORT}"

echo "==> Dev URL : $DEV_URL"
echo "==> Assure-toi que 'npm run dev:web' tourne sur cette IP+port."
echo ""

npx cap run ios \
    --livereload \
    --external \
    --host="$LOCAL_IP" \
    --port="$DEV_PORT"
