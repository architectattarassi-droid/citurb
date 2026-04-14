/**
 * CITURBAREA — Infrastructure — Case Repository
 *
 * Doctrine: append-only. No destructive updates.
 *
 * Implementation note:
 * - We store immutable case meta (id, userId, createdAt)
 * - We store ALL changes as events.
 * - We derive state (status, pack, etc.) from events when reading.
 */

import { readJSON, writeJSON, type StorageAdapter, browserStorage } from "../storage";
import { STORAGE_KEYS } from "../storage/keys";

export type CaseStatus =
  | "draft"
  | "otp_pending"
  | "otp_verified"
  | "packs"
  | "pack_selected"
  | "active";

export type CaseEventType =
  | "CASE_CREATED"
  | "P1_DRAFT_SAVED"
  | "OTP_REQUESTED"
  | "OTP_VERIFIED"
  | "PACK_SELECTED"
  | "PAYMENT_STATUS_SET"
  | "DOC_UPLOADED"
  | "NOTE_ADDED";

export interface CaseMeta {
  id: string;
  userId: string;
  createdAt: number;
}

export interface CaseEvent {
  id: string;
  ts: number;
  type: CaseEventType;
  payload?: Record<string, unknown>;
}

export interface CaseSnapshot {
  meta: CaseMeta;
  status: CaseStatus;
  lastTs: number;
  packId?: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function reduceStatus(events: CaseEvent[]): { status: CaseStatus; lastTs: number; packId?: string } {
  let status: CaseStatus = "draft";
  let packId: string | undefined;
  let lastTs = 0;

  for (const e of events) {
    if (e.ts > lastTs) lastTs = e.ts;

    switch (e.type) {
      case "OTP_REQUESTED":
        status = "otp_pending";
        break;
      case "OTP_VERIFIED":
        status = "otp_verified";
        break;
      case "PACK_SELECTED":
        status = "pack_selected";
        if (typeof e.payload?.packId === "string") packId = e.payload.packId;
        break;
      case "PAYMENT_STATUS_SET":
        // if payment confirmed later, we can promote to active by event
        if (e.payload?.paymentStatus === "confirmed") status = "active";
        break;
      default:
        break;
    }
  }

  // If OTP verified but pack not selected, next logical step is packs.
  if (status === "otp_verified") status = "packs";

  return { status, lastTs, packId };
}

export class CaseRepository {
  constructor(private store: StorageAdapter = browserStorage) {}

  createCase(userId: string): string {
    const caseId = uid();
    const meta: CaseMeta = { id: caseId, userId, createdAt: Date.now() };

    // Persist immutable meta
    writeJSON(STORAGE_KEYS.caseMeta(caseId), meta, this.store);

    // Index for user
    const indexKey = STORAGE_KEYS.casesIndexByUser(userId);
    const ids = readJSON<string[]>(indexKey, [], this.store);
    ids.unshift(caseId);
    writeJSON(indexKey, ids, this.store);

    // First event
    this.appendEvent(caseId, { type: "CASE_CREATED" });
    return caseId;
  }

  appendEvent(caseId: string, event: Omit<CaseEvent, "id" | "ts">): CaseEvent {
    const key = STORAGE_KEYS.caseEvents(caseId);
    const list = readJSON<CaseEvent[]>(key, [], this.store);
    const full: CaseEvent = { id: uid(), ts: Date.now(), ...event };
    list.push(full);
    writeJSON(key, list, this.store);
    return full;
  }

  getCaseMeta(caseId: string): CaseMeta | null {
    const meta = readJSON<CaseMeta | null>(STORAGE_KEYS.caseMeta(caseId), null, this.store);
    return meta;
  }

  getCaseEvents(caseId: string): CaseEvent[] {
    return readJSON<CaseEvent[]>(STORAGE_KEYS.caseEvents(caseId), [], this.store);
  }

  getCaseSnapshot(caseId: string): CaseSnapshot | null {
    const meta = this.getCaseMeta(caseId);
    if (!meta) return null;
    const events = this.getCaseEvents(caseId);
    const reduced = reduceStatus(events);
    return { meta, ...reduced };
  }

  listCases(userId: string): CaseSnapshot[] {
    const ids = readJSON<string[]>(STORAGE_KEYS.casesIndexByUser(userId), [], this.store);
    const out: CaseSnapshot[] = [];
    for (const id of ids) {
      const snap = this.getCaseSnapshot(id);
      if (snap) out.push(snap);
    }
    return out;
  }
}
