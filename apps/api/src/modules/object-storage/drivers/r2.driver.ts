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
import { randomBytes } from "node:crypto";
import type { PresignInput, PresignedUpload } from "../object-storage.types";
import { extFor } from "../object-storage.types";

const TTL_SEC = 60;

export interface R2Env {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBase: string;
}

export function r2EnvIfReady(): R2Env | null {
  const v = {
    accountId: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBase: process.env.R2_PUBLIC_BASE_URL,
  };
  if (!v.accountId || !v.bucket || !v.accessKeyId || !v.secretAccessKey || !v.publicBase) return null;
  return v as R2Env;
}

export async function r2Presign(input: PresignInput, env: R2Env): Promise<PresignedUpload> {
  // Chargement paresseux du SDK — pas de dépendance dure tant que R2 n'est pas activé.
  let S3Client: any, PutObjectCommand: any, getSignedUrl: any;
  try {
    // @ts-ignore — dépendance installée uniquement à l'activation R2 (cf. README activation).
    const s3 = await import("@aws-sdk/client-s3");
    S3Client = (s3 as any).S3Client;
    PutObjectCommand = (s3 as any).PutObjectCommand;
    // @ts-ignore — idem
    const presigner = await import("@aws-sdk/s3-request-presigner");
    getSignedUrl = (presigner as any).getSignedUrl;
  } catch {
    throw new Error(
      "R2 configuré (env présentes) mais SDK manquant. Installe : " +
        "`npm i -w apps/api @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`",
    );
  }

  const ext = extFor(input.mime);
  const key = `${input.kind}/${input.ownerKey}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

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
  const uploadUrl: string = await getSignedUrl(client, cmd, { expiresIn: TTL_SEC });

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
