"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("node:crypto");
/**
 * EncryptionService — AES-256-GCM pour les stream keys (YouTube/FB/LinkedIn).
 *
 * Format ciphertext stocké : "iv:authTag:ciphertext" en base64.
 * Clé maître depuis env CERCLES_STREAM_KEY_ENC_KEY (32 bytes hex,
 * généré via `openssl rand -hex 32`).
 *
 * Spec : CERCLES-prompt-claude-code.md §2.4
 */
let EncryptionService = class EncryptionService {
    algorithm = "aes-256-gcm";
    getKey() {
        const hex = process.env.CERCLES_STREAM_KEY_ENC_KEY;
        if (!hex)
            throw new common_1.InternalServerErrorException("CERCLES_STREAM_KEY_ENC_KEY non configurée");
        if (hex.length !== 64)
            throw new common_1.InternalServerErrorException("CERCLES_STREAM_KEY_ENC_KEY invalide (64 hex chars attendus)");
        return Buffer.from(hex, "hex");
    }
    encrypt(plaintext) {
        const key = this.getKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString("base64")}:${authTag.toString("base64")}:${enc.toString("base64")}`;
    }
    decrypt(ciphertext) {
        const key = this.getKey();
        const [ivB64, tagB64, encB64] = ciphertext.split(":");
        if (!ivB64 || !tagB64 || !encB64)
            throw new common_1.InternalServerErrorException("Ciphertext mal formé");
        const iv = Buffer.from(ivB64, "base64");
        const authTag = Buffer.from(tagB64, "base64");
        const enc = Buffer.from(encB64, "base64");
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);
        const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
        return dec.toString("utf8");
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)()
], EncryptionService);
