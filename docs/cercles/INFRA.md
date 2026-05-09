# Infrastructure — CITURBAREA Cercles

Spec issue de `CERCLES-prompt-claude-code.md` §5.

> Ce document liste les pré-requis sysadmin pour faire tourner Cercles en production. Les scripts d'installation Linux ne sont pas inclus — ils sont du ressort de Yassine.

---

## 1. Composants à provisionner

| Composant | Rôle | Notes |
|---|---|---|
| **VPS Linux** (Ubuntu 22.04, 4 vCPU + 8 Go RAM minimum) | Héberge LiveKit + Egress + MinIO | Sous-domaine `livekit.cercles.citurbarea.com` |
| **LiveKit serveur** (binaire Go officiel) | WebRTC SFU | TURN/STUN intégrés (coturn embarqué) |
| **LiveKit Egress worker** | Recording + multi-RTMP push | Service séparé, partage Redis avec LiveKit principal. Nécessite Chrome headless |
| **MinIO** | Stockage S3-compatible des replays | Sous-domaine `minio.cercles.citurbarea.com`, bucket `cercles-recordings` |
| **Redis** | Orchestration Egress | Au moins 1 Go RAM, persistance optionnelle |
| **Caddy ou Nginx** | TLS Let's Encrypt + reverse proxy | Termine SSL pour LiveKit (443) et MinIO |

---

## 2. Sous-domaines

```
livekit.cercles.citurbarea.com   → A record vers IP VPS (port 443 TLS)
minio.cercles.citurbarea.com     → idem
cercles.citurbarea.com           → CNAME vers Railway (frontend SPA)
```

---

## 3. Ports

| Port | Protocole | Usage |
|---|---|---|
| 443 | TCP | WebSocket LiveKit (signaling) |
| 7881 | TCP | Fallback TCP pour clients sans UDP |
| 50000-60000 | UDP | Médias WebRTC (audio/vidéo) |
| 8080 | TCP | Console MinIO (à protéger derrière auth) |
| 9000 | TCP | API S3 MinIO |

UFW à configurer : autoriser 443 et la plage UDP 50000-60000, bloquer le reste.

---

## 4. Variables d'environnement (à provisionner côté API)

Copier `.env.example` racine, valoriser :

```
LIVEKIT_HOST=https://livekit.cercles.citurbarea.com
LIVEKIT_WS_URL=wss://livekit.cercles.citurbarea.com
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxx

LIVEKIT_EGRESS_S3_ENDPOINT=https://minio.cercles.citurbarea.com
LIVEKIT_EGRESS_S3_BUCKET=cercles-recordings
LIVEKIT_EGRESS_S3_ACCESS_KEY=...
LIVEKIT_EGRESS_S3_SECRET_KEY=...

CERCLES_STREAM_KEY_ENC_KEY=  # 32 bytes hex, à générer via:
                              # openssl rand -hex 32

VITE_LIVEKIT_WS_URL=wss://livekit.cercles.citurbarea.com
```

---

## 5. Génération de la clé de chiffrement stream keys

Critique : sans cette clé, les `EgressTarget.streamKey` ne peuvent pas être déchiffrés.

```bash
openssl rand -hex 32
```

Résultat : 64 caractères hex. À stocker dans `CERCLES_STREAM_KEY_ENC_KEY` côté API uniquement (jamais dans le repo, jamais dans le build front).

**Une fois la clé générée :** ne JAMAIS la perdre, ne JAMAIS la changer (sinon toutes les stream keys déjà encryptées en DB deviennent illisibles).

---

## 6. Ressources externes

- LiveKit self-hosting : https://docs.livekit.io/realtime/self-hosting/
- LiveKit Egress (RTMP) : https://docs.livekit.io/egress/
- LiveKit Server SDK Node : https://docs.livekit.io/server/sdks-server/node/
- LiveKit React Components : https://docs.livekit.io/realtime/client/react/

---

## 7. Mode développement (sans VPS)

Tant que le VPS n'est pas provisionné :
- L'API utilise une clé de signature factice (`devsecret-local-only-do-not-use-in-prod`)
- `LiveKitService.ensureRoom()` et `closeRoom()` deviennent des no-op loggués
- Le front peut s'installer + se connecter, mais la salle de visio sera inopérante (aucun serveur SFU à l'autre bout)

Pour passer en mode prod : provisionner le VPS, renseigner les vars d'env, redémarrer l'API.
