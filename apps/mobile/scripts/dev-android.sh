#!/usr/bin/env bash
# ==========================================================
# dev-android.sh — Hot reload Android sur device/émulateur
# ==========================================================
#
# Lance l'app Android en mode dev avec hot reload depuis la PWA Vite
# (apps/web tourne sur http://<ton-ip>:5173).
#
# Workflow :
#   1. Détecte l'IP locale de ta machine
#   2. Surcharge temporairement capacitor.config.ts server.url
#   3. cap run android --livereload --external --host=<ip>
#
# Prérequis :
#   - `npm run dev:web` lancé dans un autre terminal (port 5173)
#   - Device Android connecté en USB (debug activé) OU émulateur démarré
#   - Téléphone et PC sur le MÊME réseau WiFi
#
# Astuce debug :
#   - chrome://inspect/#devices pour ouvrir DevTools sur la WebView

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MOBILE_ROOT"

# Détecte l'IP locale (Linux/macOS/Git Bash)
detect_ip() {
    if command -v ip >/dev/null 2>&1; then
        ip route get 1 2>/dev/null | awk '{print $7; exit}'
    elif command -v ifconfig >/dev/null 2>&1; then
        ifconfig | grep -E 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n1
    else
        echo "192.168.1.100"
    fi
}

LOCAL_IP="${LOCAL_IP:-$(detect_ip)}"
DEV_PORT="${DEV_PORT:-5173}"
DEV_URL="http://${LOCAL_IP}:${DEV_PORT}"

echo "==> Dev URL : $DEV_URL"
echo "==> Assure-toi que 'npm run dev:web' tourne sur cette IP+port."
echo ""

# Note : --livereload + --external override server.url dynamiquement
npx cap run android \
    --livereload \
    --external \
    --host="$LOCAL_IP" \
    --port="$DEV_PORT"
