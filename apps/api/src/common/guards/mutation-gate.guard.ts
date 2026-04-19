import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { raiseDoctrine } from "../../modules/kernel/raise-doctrine";
import { RULES } from "@citurbarea/contracts";

/**
 * Tome @ enforcement:
 * - Toute mutation (POST/PUT/PATCH/DELETE) doit passer par le pipeline Tome @ (Orchestrator).
 * - Exceptions: webhooks Stripe, auth, health, docs.
 *
 * Objectif: empêcher toute dérive "controller direct" qui court-circuite les tomes.
 */
@Injectable()
export class MutationGateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { path?: string; url?: string; method?: string }>();
    const method = (req.method || "").toUpperCase();
    const url = (req as any).originalUrl || (req as any).url || "";
    const path = (req as any).path || url.split("?")[0] || "";

    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (!isMutation) return true;

    // Allow-list (mutations autorisées hors orchestrator)
    const allow = [
      "/tomes/tome-at/stripe/webhook",   // Stripe
      "/auth",                          // login/refresh (si présent)
      "/health",                        // health checks
      "/docs",                          // swagger (si exposé)
      "/tomes/tome-at/orchestrator",     // pipeline canonique
      "/p1",
      "/p2",
      "/p3",
      "/p4",
      "/p5",
      "/p6",
    ];

    const allowed = allow.some((p) => path === p || path.startsWith(p + "/"));
    if (allowed) return true;

    // Blocage doctrinal: mutation hors pipeline
    raiseDoctrine({
      messagePublic: "Action impossible.",
      httpStatus: 403,
      rule_id: (RULES as any).MUTATION_GATE ?? RULES.TRACE_REDACTION,
      error_code: "ERR-T@-MUTATION-GATE",
      category: "DOCTRINE_BLOCK",
      severity: "CRITICAL",
      public_code: "CIT-403-0010",
      sources: [(RULES as any).MUTATION_GATE ?? RULES.TRACE_REDACTION],
    });
    return false;
  }
}
