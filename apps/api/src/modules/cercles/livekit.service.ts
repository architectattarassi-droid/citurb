import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "node:crypto";

/**
 * LiveKitService — wrapper minimal du SDK LiveKit Server.
 *
 * Mode dégradé : si LIVEKIT_API_KEY/SECRET non configurés, la méthode
 * generateAccessToken signe quand même un JWT compatible LiveKit (avec
 * une clé fictive) et ensureRoom/closeRoom deviennent des no-op loggués.
 * Cela permet le développement front sans VPS LiveKit.
 *
 * Pour passer en mode prod : provisionner le VPS (cf docs/cercles/INFRA.md)
 * et renseigner LIVEKIT_HOST + LIVEKIT_API_KEY + LIVEKIT_API_SECRET.
 *
 * Spec : CERCLES-prompt-claude-code.md §2.3
 */
@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  private get apiKey(): string {
    return process.env.LIVEKIT_API_KEY || "devkey";
  }

  private get apiSecret(): string {
    return process.env.LIVEKIT_API_SECRET || "devsecret-local-only-do-not-use-in-prod";
  }

  get wsUrl(): string {
    return process.env.LIVEKIT_WS_URL || "wss://livekit.cercles.citurbarea.com";
  }

  get isConfigured(): boolean {
    return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  }

  /**
   * Génère un token JWT pour rejoindre une room.
   * Format : standard LiveKit AccessToken (HS256 signé sur apiSecret).
   * Grants : video.roomJoin, video.room, video.canPublish/Subscribe selon role.
   */
  generateAccessToken(args: {
    roomName: string;
    userId: string;
    displayName: string;
    role: "host" | "speaker" | "viewer";
    canPublish?: boolean;
    canPublishData?: boolean;
    canSubscribe?: boolean;
    ttlSeconds?: number;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const ttl = args.ttlSeconds ?? 3600;

    const canPublish = args.canPublish ?? (args.role !== "viewer");
    const canSubscribe = args.canSubscribe ?? true;
    const canPublishData = args.canPublishData ?? true;

    const payload = {
      iss: this.apiKey,
      sub: args.userId,
      name: args.displayName,
      iat: now,
      exp: now + ttl,
      nbf: now,
      video: {
        roomJoin: true,
        room: args.roomName,
        canPublish,
        canSubscribe,
        canPublishData,
      },
      // Métadonnées custom (visibles par autres participants)
      metadata: JSON.stringify({ userId: args.userId, role: args.role }),
    };

    return this.signJwt(payload, this.apiSecret);
  }

  /**
   * Idempotent : le serveur LiveKit crée la room au premier join si elle
   * n'existe pas. En mode prod réel on appelle l'API admin pour préset.
   */
  async ensureRoom(roomName: string, _opts: { maxParticipants: number; emptyTimeoutSec?: number }): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`[LiveKit] Mode dev — ensureRoom('${roomName}') no-op`);
      return;
    }
    // TODO Sprint C4 : appel HTTP à LIVEKIT_HOST/twirp/livekit.RoomService/CreateRoom
    this.logger.log(`[LiveKit] ensureRoom '${roomName}' (TODO call API admin)`);
  }

  async closeRoom(roomName: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`[LiveKit] Mode dev — closeRoom('${roomName}') no-op`);
      return;
    }
    this.logger.log(`[LiveKit] closeRoom '${roomName}' (TODO call API admin)`);
  }

  // ── JWT signature minimal (HS256) ──

  private base64url(input: Buffer | string): string {
    const buf = typeof input === "string" ? Buffer.from(input) : input;
    return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  private signJwt(payload: Record<string, any>, secret: string): string {
    const header = { alg: "HS256", typ: "JWT" };
    const segments = [
      this.base64url(JSON.stringify(header)),
      this.base64url(JSON.stringify(payload)),
    ];
    const signature = crypto
      .createHmac("sha256", secret)
      .update(segments.join("."))
      .digest();
    segments.push(this.base64url(signature));
    return segments.join(".");
  }
}
