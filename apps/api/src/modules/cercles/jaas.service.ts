import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * JaasService — Sprint F1
 *
 * Cohabitation Jitsi (8x8.vc JaaS) + LiveKit. Quand un LiveRoom a `provider=JITSI`,
 * le frontend appelle /api/cercles/:cercleId/rooms/:roomId/jaas-config qui retourne :
 *
 *   - mode "jaas"   → si JAAS_APP_ID + JAAS_API_KEY + JAAS_PRIVATE_KEY_PEM dispos
 *                      Token JWT RS256 signé serveur, domain `8x8.vc`
 *   - mode "public" → fallback `meet.jit.si` anonyme (pas de modération avancée)
 *
 * Ref JaaS JWT spec : https://developer.8x8.com/jaas/docs/api-keys-jwt
 */

export type JaasConfig = {
  mode: "jaas" | "public";
  domain: string;       // "8x8.vc" ou "meet.jit.si"
  roomName: string;     // pour JaaS: <appId>/<roomName> ; pour public: <roomName>
  jwt?: string;         // null en mode public
  appId?: string;       // null en mode public
  parentNodeId: string; // pour external_api.js (le DOM id à hydrater)
};

@Injectable()
export class JaasService {
  private readonly log = new Logger("JaasService");
  constructor(private readonly jwt: JwtService) {}

  isJaasConfigured(): boolean {
    return !!(process.env.JAAS_APP_ID && process.env.JAAS_API_KEY && process.env.JAAS_PRIVATE_KEY_PEM);
  }

  /**
   * Retourne la config Jitsi à passer au front.
   *
   * @param jitsiRoomName — nom de room CITURBAREA (slug court, sans /)
   * @param user — { id, displayName, email, isModerator }
   */
  buildConfig(
    jitsiRoomName: string,
    user: { id: string; displayName: string; email: string; isModerator: boolean },
  ): JaasConfig {
    if (!this.isJaasConfigured()) {
      // Fallback meet.jit.si (anonyme, marche tout de suite)
      return {
        mode: "public",
        domain: "meet.jit.si",
        roomName: jitsiRoomName,
        parentNodeId: "jaas-container",
      };
    }
    const appId = process.env.JAAS_APP_ID!;
    const apiKey = process.env.JAAS_API_KEY!;
    const privateKey = process.env.JAAS_PRIVATE_KEY_PEM!.replace(/\\n/g, "\n");

    const now = Math.floor(Date.now() / 1000);
    const payload: any = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: "*",
      nbf: now - 10,
      iat: now,
      exp: now + 2 * 60 * 60, // 2h
      context: {
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "outbound-call": false,
        },
        user: {
          "hidden-from-recorder": false,
          moderator: user.isModerator,
          name: user.displayName,
          id: user.id,
          avatar: "",
          email: user.email,
        },
      },
    };

    let token: string;
    try {
      token = this.jwt.sign(payload, {
        algorithm: "RS256",
        privateKey,
        keyid: apiKey,
      } as any);
    } catch (e: any) {
      this.log.error(`JaaS sign failed: ${e?.message} — fallback meet.jit.si`);
      return {
        mode: "public",
        domain: "meet.jit.si",
        roomName: jitsiRoomName,
        parentNodeId: "jaas-container",
      };
    }

    return {
      mode: "jaas",
      domain: "8x8.vc",
      // JaaS exige le format <appId>/<roomName>
      roomName: `${appId}/${jitsiRoomName}`,
      jwt: token,
      appId,
      parentNodeId: "jaas-container",
    };
  }
}
