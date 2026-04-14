import { appendAudit } from "../../infrastructure/audit/auditLog";
import { validateProject } from "../../domain/p1/validation";
import type { P1ProjectData } from "../../domain/p1/types";
import { readP1Draft, resolveUserId, writeP1Draft } from "./startQualification";

export type RecommendedPack = {
  id: "entree" | "standard" | "premium";
  name: string;
};

export type AnalyzeResult = {
  ok: boolean;
  errors: string[];
  recommendedPack?: RecommendedPack;
  draft: Partial<P1ProjectData>;
};

function recommendPack(d: Partial<P1ProjectData>): RecommendedPack {
  // Règles simples (placeholder B6 améliorera la recommandation)
  const surface = typeof d.surface === "number" ? d.surface : 0;
  const projectType = d.projectType;

  // Heuristiques:
  // - gros projet => premium
  if (surface >= 400 || projectType === "immeuble") {
    return { id: "premium", name: "Pack Premium" };
  }
  // - sinon standard par défaut
  if (surface >= 150) {
    return { id: "standard", name: "Pack Standard" };
  }
  // - entrée si petit
  return { id: "entree", name: "Pack Entrée" };
}

/**
 * Use case: analyze project (validate + save draft + compute recommendation).
 */
export function analyzeProject(userId: string | null | undefined, data: Partial<P1ProjectData>): AnalyzeResult {
  const uid = resolveUserId(userId);
  const prev = readP1Draft(uid);
  const merged: Partial<P1ProjectData> = {
    ...prev,
    ...data,
    createdAt: prev.createdAt ?? Date.now(),
  };

  // Validation only if we can cast to full data (minimal fields).
  const errors = validateProject(merged as P1ProjectData);

  writeP1Draft(uid, merged);
  appendAudit({ type: "P1_ANALYZE", userId: uid, meta: { ok: errors.length === 0 } });

  if (errors.length) {
    return { ok: false, errors, draft: merged };
  }

  return {
    ok: true,
    errors: [],
    recommendedPack: recommendPack(merged),
    draft: merged,
  };
}
