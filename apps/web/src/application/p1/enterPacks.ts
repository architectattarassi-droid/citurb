import { readJSON, writeJSON } from "../../infrastructure/storage";

function key(uid: string, k: string) {
  return `citurbarea:p1:${k}:${uid}:v1`;
}

/**
 * V162 — Packs access is NOT public.
 * Access to the packs page requires:
 * - authenticated user (handled in UI)
 * - phone verified
 */
export function canAccessPacksPage(userId: string | null): boolean {
  const uid = userId || "anon";
  if (uid === "anon") return false;
  const phoneVerifiedAt = readJSON(key(uid, "phone_verified_at"), null);
  return Boolean(phoneVerifiedAt);
}

/**
 * Packs are shown only after:
 * - truth confirmed
 * - terms accepted
 * - confirmation email sent
 */
export function canShowPacks(userId: string | null): boolean {
  const uid = userId || "anon";
  if (uid === "anon") return false;
  const okTruth = Boolean(readJSON(key(uid, "truth_ok"), false));
  const okTerms = Boolean(readJSON(key(uid, "terms_ok"), false));
  const emailSentAt = readJSON(key(uid, "email_sent_at"), null);
  return okTruth && okTerms && Boolean(emailSentAt);
}

export function markPhoneVerified(userId: string, ts: number) {
  writeJSON(key(userId, "phone_verified_at"), ts);
}

export function unlockPacks(userId: string, ts: number) {
  writeJSON(key(userId, "truth_ok"), true);
  writeJSON(key(userId, "terms_ok"), true);
  writeJSON(key(userId, "email_sent_at"), ts);
}
