"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2EnvIfReady = r2EnvIfReady;
exports.r2Presign = r2Presign;
/**
 * r2.driver — Cloudflare R2 via API S3-compatible.
 * Actif UNIQUEMENT si toutes les env R2_* sont présentes ET le SDK installé.
 * Le binaire transite directement client → R2 (doctrine respectée).
 *
 * Activation (à faire au checkpoint « branchement R2 ») :
 *   npm i -w apps/api @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * Env requises (apps/api/.env) :
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL
 */
const node_crypto_1 = require("node:crypto");
const object_storage_types_1 = require("../object-storage.types");
const TTL_SEC = 60;
function r2EnvIfReady() {
    const v = {
        accountId: process.env.R2_ACCOUNT_ID,
        bucket: process.env.R2_BUCKET,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        publicBase: process.env.R2_PUBLIC_BASE_URL,
    };
    if (!v.accountId || !v.bucket || !v.accessKeyId || !v.secretAccessKey || !v.publicBase)
        return null;
    return v;
}
async function r2Presign(input, env) {
    // Chargement paresseux du SDK — pas de dépendance dure tant que R2 n'est pas activé.
    let S3Client, PutObjectCommand, getSignedUrl;
    try {
        // @ts-ignore — dépendance installée uniquement à l'activation R2 (cf. README activation).
        const s3 = await Promise.resolve().then(() => require("@aws-sdk/client-s3"));
        S3Client = s3.S3Client;
        PutObjectCommand = s3.PutObjectCommand;
        // @ts-ignore — idem
        const presigner = await Promise.resolve().then(() => require("@aws-sdk/s3-request-presigner"));
        getSignedUrl = presigner.getSignedUrl;
    }
    catch {
        throw new Error("R2 configuré (env présentes) mais SDK manquant. Installe : " +
            "`npm i -w apps/api @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`");
    }
    const ext = (0, object_storage_types_1.extFor)(input.mime);
    const key = `${input.kind}/${input.ownerKey}/${Date.now()}-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.${ext}`;
    const client = new S3Client({
        region: "auto",
        endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    });
    const cmd = new PutObjectCommand({
        Bucket: env.bucket,
        Key: key,
        ContentType: input.mime,
        ContentLength: input.size,
    });
    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: TTL_SEC });
    return {
        uploadUrl,
        publicUrl: `${env.publicBase.replace(/\/$/, "")}/${key}`,
        key,
        method: "PUT",
        headers: { "Content-Type": input.mime },
        expiresAt: new Date(Date.now() + TTL_SEC * 1000).toISOString(),
        driver: "r2",
    };
}
