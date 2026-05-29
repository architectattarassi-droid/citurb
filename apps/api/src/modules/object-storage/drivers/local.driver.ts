/**
 * local.driver — fallback DEV uniquement.
 * Doctrine : « le binaire ne transite jamais par l'API ». En prod, on utilise R2
 * (PUT direct au stockage). Ce driver émule un upload « présigné » en signant un
 * jeton HMAC court (5 min) qui autorise un PUT vers l'API même. C'est une
 * entorse temporaire documentée, acceptable uniquement quand R2 n'est pas
 * provisionné.
 */
import { createHmac, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { PresignInput, PresignedUpload } from "../object-storage.types";
import { extFor } from "../object-storage.types";

const TTL_SEC = 300;

function getSecret(): string {
  return process.env.UPLOAD_PRESIGN_SECRET || process.env.JWT_SECRET || "dev-only-presign-secret-CHANGE-ME";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function localPresign(input: PresignInput, apiBase: string): PresignedUpload {
  const ext = extFor(input.mime);
  const key = `${input.kind}/${input.ownerKey}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
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

export function verifyLocalToken(key: string, exp: string, mime: string, size: string, sig: string): boolean {
  if (!exp || Number.isNaN(Date.parse(exp))) return false;
  if (new Date(exp).getTime() < Date.now()) return false;
  const expect = sign(`${key}|${exp}|${mime}|${size}`);
  return timingSafeEqualHex(expect, sig);
}

export async function writeLocalObject(uploadsDir: string, key: string, data: Buffer): Promise<void> {
  // Garde-fou path traversal : refuse tout key qui sort de uploadsDir/objects/.
  if (key.includes("..") || key.startsWith("/") || key.startsWith("\\")) {
    throw new Error("Key invalide");
  }
  const dest = join(uploadsDir, "objects", key);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, data);
}
