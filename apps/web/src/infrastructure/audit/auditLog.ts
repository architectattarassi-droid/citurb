/**
 * CITURBAREA — Infrastructure — Audit Log
 *
 * Doctrine: append-only. Never destructive.
 *
 * This is separate from Case events:
 * - Case events = dossier lifecycle
 * - Audit log = cross-cutting traceability (nav, key actions)
 */

import { readJSON, writeJSON, type StorageAdapter, browserStorage } from "../storage";
import { STORAGE_KEYS } from "../storage/keys";

export type AuditEventType =
  | "NAV_CLICK"
  | "P1_SELECT_PROJECT_TYPE"
  | "P1_ANALYZE"
  | "P1_CREATE_DOSSIER"
  | "PACK_SELECTED"
  | "CHAT_MESSAGE";

export interface AuditEvent {
  id: string;
  ts: number;
  type: AuditEventType;
  dossierId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function appendAudit(
  evt: Omit<AuditEvent, "id" | "ts">,
  store: StorageAdapter = browserStorage
) {
  const list = readJSON<AuditEvent[]>(STORAGE_KEYS.audit, [], store);
  list.push({ id: uid(), ts: Date.now(), ...evt });
  writeJSON(STORAGE_KEYS.audit, list, store);
}

export function readAudit(store: StorageAdapter = browserStorage): AuditEvent[] {
  return readJSON<AuditEvent[]>(STORAGE_KEYS.audit, [], store);
}
