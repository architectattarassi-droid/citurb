import { CaseRepository } from "../../infrastructure/case/caseRepository";
import { resolveUserId } from "./startQualification";

export type EnterDossierResult =
  | { ok: true; caseId: string }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" };

/**
 * Use case: enter dossier (gating by ownership).
 */
export function enterDossier(userId: string | null | undefined, caseId: string): EnterDossierResult {
  const uid = resolveUserId(userId);
  const repo = new CaseRepository();
  const meta = repo.getCaseMeta(caseId);
  if (!meta) return { ok: false, reason: "NOT_FOUND" };
  if (meta.userId !== uid) return { ok: false, reason: "FORBIDDEN" };
  return { ok: true, caseId };
}
