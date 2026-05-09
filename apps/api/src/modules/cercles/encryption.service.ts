import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as crypto from "node:crypto";

/**
 * EncryptionService — AES-256-GCM pour les stream keys (YouTube/FB/LinkedIn).
 *
 * Format ciphertext stocké : "iv:authTag:ciphertext" en base64.
 * Clé maître depuis env CERCLES_STREAM_KEY_ENC_KEY (32 bytes hex,
 * généré via `openssl rand -hex 32`).
 *
 * Spec : CERCLES-prompt-claude-code.md §2.4
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";

  private getKey(): Buffer {
    const hex = process.env.CERCLES_STREAM_KEY_ENC_KEY;
    if (!hex) throw new InternalServerErrorException("CERCLES_STREAM_KEY_ENC_KEY non configurée");
    if (hex.length !== 64) throw new InternalServerErrorException("CERCLES_STREAM_KEY_ENC_KEY invalide (64 hex chars attendus)");
    return Buffer.from(hex, "hex");
  }

  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${enc.toString("base64")}`;
  }

  decrypt(ciphertext: string): string {
    const key = this.getKey();
    const [ivB64, tagB64, encB64] = ciphertext.split(":");
    if (!ivB64 || !tagB64 || !encB64) throw new InternalServerErrorException("Ciphertext mal formé");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  }
}
