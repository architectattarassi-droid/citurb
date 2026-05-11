"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClientFingerprint = extractClientFingerprint;
exports.extractClientIp = extractClientIp;
exports.extractUserAgent = extractUserAgent;
exports.ipInCidr = ipInCidr;
exports.generateSessionToken = generateSessionToken;
exports.hashAuditPayload = hashAuditPayload;
const crypto_1 = require("crypto");
/**
 * Device fingerprint serveur — Sprint H couche 6.
 *
 * Le front envoie un fingerprint client (canvas + WebGL + screen + UA + timezone)
 * dans le header `X-Device-FP`. On le hashe HMAC-SHA-256 avec un secret serveur
 * pour qu'il ne soit pas falsifiable.
 *
 * Si le fingerprint change entre deux requêtes d'une même session admin,
 * la session est révoquée immédiatement.
 */
const SECRET = process.env.ADMIN_DEVICE_FP_SECRET || "change-me-in-env-admin-fp";
function extractClientFingerprint(req) {
    const raw = String(req.headers["x-device-fp"] || "");
    if (!raw)
        return "no-fingerprint";
    // HMAC pour qu'un attaquant qui connait le fingerprint client ne puisse pas
    // reconstruire la version serveur sans le secret.
    return (0, crypto_1.createHmac)("sha256", SECRET).update(raw).digest("hex").slice(0, 32);
}
function extractClientIp(req) {
    // Railway / nginx mettent l'IP réelle dans X-Forwarded-For
    const xff = String(req.headers["x-forwarded-for"] || "");
    if (xff)
        return xff.split(",")[0].trim();
    const real = String(req.headers["x-real-ip"] || "");
    if (real)
        return real;
    return req.socket?.remoteAddress || "unknown";
}
function extractUserAgent(req) {
    return String(req.headers["user-agent"] || "unknown").slice(0, 500);
}
/** Vérifie qu'une IP appartient à un CIDR (IPv4 uniquement pour démarrer). */
function ipInCidr(ip, cidr) {
    if (!ip || !cidr)
        return false;
    // IPv6 → match exact only pour simplifier
    if (ip.includes(":") || cidr.includes(":"))
        return ip === cidr.split("/")[0];
    const [range, bits = "32"] = cidr.split("/");
    const mask = ~(2 ** (32 - Number(bits)) - 1) >>> 0;
    const ipInt = ipv4ToInt(ip);
    const rangeInt = ipv4ToInt(range);
    if (ipInt === null || rangeInt === null)
        return false;
    return (ipInt & mask) === (rangeInt & mask);
}
function ipv4ToInt(ip) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255))
        return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
/** Génère un session token cryptographiquement sûr (32 bytes base64url). */
function generateSessionToken() {
    return (0, crypto_1.randomBytes)(32).toString("base64url");
}
/** Hash d'un payload pour la chaîne d'audit log. */
function hashAuditPayload(prevHash, payload) {
    const json = JSON.stringify(payload);
    return (0, crypto_1.createHash)("sha256").update((prevHash || "") + json).digest("hex");
}
