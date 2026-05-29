"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localPresign = localPresign;
exports.verifyLocalToken = verifyLocalToken;
exports.writeLocalObject = writeLocalObject;
/**
 * local.driver — fallback DEV uniquement.
 * Doctrine : « le binaire ne transite jamais par l'API ». En prod, on utilise R2
 * (PUT direct au stockage). Ce driver émule un upload « présigné » en signant un
 * jeton HMAC court (5 min) qui autorise un PUT vers l'API même. C'est une
 * entorse temporaire documentée, acceptable uniquement quand R2 n'est pas
 * provisionné.
 */
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
const object_storage_types_1 = require("../object-storage.types");
const TTL_SEC = 300;
function getSecret() {
    return process.env.UPLOAD_PRESIGN_SECRET || process.env.JWT_SECRET || "dev-only-presign-secret-CHANGE-ME";
}
function sign(payload) {
    return (0, node_crypto_1.createHmac)("sha256", getSecret()).update(payload).digest("hex");
}
function timingSafeEqualHex(a, b) {
    if (a.length !== b.length)
        return false;
    let r = 0;
    for (let i = 0; i < a.length; i++)
        r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}
function localPresign(input, apiBase) {
    const ext = (0, object_storage_types_1.extFor)(input.mime);
    const key = `${input.kind}/${input.ownerKey}/${Date.now()}-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.${ext}`;
    const expiresAt = new Date(Date.now() + TTL_SEC * 1000).toISOString();
    const sig = sign(`${key}|${expiresAt}|${input.mime}|${input.size}`);
    const qs = new URLSearchParams({ exp: expiresAt, mime: input.mime, size: String(input.size), sig }).toString();
    const base = apiBase.replace(/\/$/, "");
    return {
        uploadUrl: `${base}/uploads/objects/${key}?${qs}`,
        publicUrl: `${base}/uploads/objects/${key}`,
        key,
        method: "PUT",
        headers: { "Content-Type": input.mime },
        expiresAt,
        driver: "local",
    };
}
function verifyLocalToken(key, exp, mime, size, sig) {
    if (!exp || Number.isNaN(Date.parse(exp)))
        return false;
    if (new Date(exp).getTime() < Date.now())
        return false;
    const expect = sign(`${key}|${exp}|${mime}|${size}`);
    return timingSafeEqualHex(expect, sig);
}
async function writeLocalObject(uploadsDir, key, data) {
    // Garde-fou path traversal : refuse tout key qui sort de uploadsDir/objects/.
    if (key.includes("..") || key.startsWith("/") || key.startsWith("\\")) {
        throw new Error("Key invalide");
    }
    const dest = (0, node_path_1.join)(uploadsDir, "objects", key);
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(dest), { recursive: true });
    await (0, promises_1.writeFile)(dest, data);
}
