"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationGateGuard = void 0;
const common_1 = require("@nestjs/common");
const raise_doctrine_1 = require("../../modules/kernel/raise-doctrine");
const contracts_1 = require("@citurbarea/contracts");
/**
 * Tome @ enforcement:
 * - Toute mutation (POST/PUT/PATCH/DELETE) doit passer par le pipeline Tome @ (Orchestrator).
 * - Exceptions: webhooks Stripe, auth, health, docs.
 *
 * Objectif: empêcher toute dérive "controller direct" qui court-circuite les tomes.
 */
let MutationGateGuard = class MutationGateGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const method = (req.method || "").toUpperCase();
        const url = req.originalUrl || req.url || "";
        const path = req.path || url.split("?")[0] || "";
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        if (!isMutation)
            return true;
        // Allow-list (mutations autorisées hors orchestrator)
        const allow = [
            "/tomes/tome-at/stripe/webhook", // Stripe
            "/auth", // login/refresh (si présent)
            "/health", // health checks
            "/docs", // swagger (si exposé)
            "/tomes/tome-at/orchestrator", // pipeline canonique
            "/p1",
            "/p2",
            "/p3",
            "/p4",
            "/p5",
            "/p6",
        ];
        const allowed = allow.some((p) => path === p || path.startsWith(p + "/"));
        if (allowed)
            return true;
        // Blocage doctrinal: mutation hors pipeline
        (0, raise_doctrine_1.raiseDoctrine)({
            messagePublic: "Action impossible.",
            httpStatus: 403,
            rule_id: contracts_1.RULES.MUTATION_GATE ?? contracts_1.RULES.TRACE_REDACTION,
            error_code: "ERR-T@-MUTATION-GATE",
            category: "DOCTRINE_BLOCK",
            severity: "CRITICAL",
            public_code: "CIT-403-0010",
            sources: [contracts_1.RULES.MUTATION_GATE ?? contracts_1.RULES.TRACE_REDACTION],
        });
        return false;
    }
};
exports.MutationGateGuard = MutationGateGuard;
exports.MutationGateGuard = MutationGateGuard = __decorate([
    (0, common_1.Injectable)()
], MutationGateGuard);
