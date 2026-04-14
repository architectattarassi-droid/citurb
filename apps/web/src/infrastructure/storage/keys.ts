/**
 * CITURBAREA — Infrastructure — Storage Keys
 *
 * Doctrine: one nomenclature for ALL persisted data.
 * This is critical for future migration (SQLite/Tauri/encrypted storage)
 * and for data portability between machines.
 */

const PREFIX = "citurbarea";

export const STORAGE_KEYS = {
  // P1
  p1Draft: (userId: string) => `${PREFIX}:p1:draft:${userId}:v1`,

  // Cases (index + per-case)
  casesIndexByUser: (userId: string) => `${PREFIX}:cases:index:${userId}:v1`,
  caseMeta: (caseId: string) => `${PREFIX}:case:${caseId}:meta:v1`,
  caseEvents: (caseId: string) => `${PREFIX}:case:${caseId}:events:v1`,

  // Audit
  audit: `${PREFIX}:audit:v1`,
} as const;
