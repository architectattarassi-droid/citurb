import { CaseRepository } from "../../infrastructure/case/caseRepository";
import { appendAudit } from "../../infrastructure/audit/auditLog";
import type { P1ProjectData } from "../../domain/p1/types";
import { resolveUserId, readP1Draft } from "./startQualification";

export type CreateDossierResult = {
  caseId: string;
};

/**
 * Use case: create dossier (case) — append-only.
 *
 * Note: This does NOT do OTP here. OTP comes in B5/B6.
 */
export function createDossier(userId: string | null | undefined, overrideDraft?: Partial<P1ProjectData>): CreateDossierResult {
  const uid = resolveUserId(userId);
  const repo = new CaseRepository();
  const caseId = repo.createCase(uid);

  const draft = overrideDraft ?? readP1Draft(uid);
  repo.appendEvent(caseId, { type: "P1_DRAFT_SAVED", payload: { draft } });

  appendAudit({ type: "P1_CREATE_DOSSIER", userId: uid, dossierId: caseId, meta: { hasDraft: Boolean(draft) } });
  return { caseId };
}
