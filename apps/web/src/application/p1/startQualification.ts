import { readJSON, writeJSON } from "../../infrastructure/storage";
import { STORAGE_KEYS } from "../../infrastructure/storage/keys";
import { appendAudit } from "../../infrastructure/audit/auditLog";
import type { P1ProjectData, ProjectType, PlanMode } from "../../domain/p1/types";

export const ANON_USER_ID = "anon";

export function resolveUserId(userId?: string | null): string {
  const u = (userId || "").trim();
  return u ? u : ANON_USER_ID;
}

export function readP1Draft(userId?: string | null): Partial<P1ProjectData> {
  const uid = resolveUserId(userId);
  return readJSON<Partial<P1ProjectData>>(STORAGE_KEYS.p1Draft(uid), {});
}

export function writeP1Draft(userId: string | null | undefined, draft: Partial<P1ProjectData>) {
  const uid = resolveUserId(userId);
  writeJSON(STORAGE_KEYS.p1Draft(uid), draft);
}

/**
 * Use case: begin qualification. Storage-first.
 */
export function startQualification(userId?: string | null) {
  const uid = resolveUserId(userId);
  const existing = readP1Draft(uid);
  if (!existing.createdAt) {
    writeP1Draft(uid, { ...existing, createdAt: Date.now() });
  }
  appendAudit({ type: "NAV_CLICK", userId: uid, meta: { action: "P1_START_QUALIFICATION" } });
  return { userId: uid, draft: readP1Draft(uid) };
}

export function setProjectType(userId: string | null | undefined, projectType: ProjectType) {
  const uid = resolveUserId(userId);
  const d = readP1Draft(uid);
  writeP1Draft(uid, { ...d, projectType, createdAt: d.createdAt ?? Date.now() });
  appendAudit({ type: "P1_SELECT_PROJECT_TYPE", userId: uid, meta: { projectType } });
}

export function setPlanMode(userId: string | null | undefined, planMode: PlanMode) {
  const uid = resolveUserId(userId);
  const d = readP1Draft(uid);
  writeP1Draft(uid, { ...d, planMode, createdAt: d.createdAt ?? Date.now() });
}
