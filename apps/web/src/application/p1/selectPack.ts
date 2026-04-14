import { CaseRepository } from "../../infrastructure/case/caseRepository";
import { appendAudit } from "../../infrastructure/audit/auditLog";
import { resolveUserId } from "./startQualification";

export type PackId = "type" | "custom" | "premium";

/**
 * Use case: select a pack for a case.
 */
export function selectPack(userId: string | null | undefined, caseId: string, packId: PackId) {
  const uid = resolveUserId(userId);
  const repo = new CaseRepository();
  repo.appendEvent(caseId, { type: "PACK_SELECTED", payload: { packId } });
  appendAudit({ type: "PACK_SELECTED", userId: uid, dossierId: caseId, meta: { packId } });
}
