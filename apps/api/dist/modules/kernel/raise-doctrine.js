"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raiseDoctrine = raiseDoctrine;
const crypto_1 = require("crypto");
const domain_error_1 = require("./domain-error");
/**
 * Tome @ helper unique.
 * Any doctrine violation MUST throw via this helper.
 * Public payload is always redacted (incident_id only + optional public code).
 */
function raiseDoctrine(args) {
    const incident_id = (0, crypto_1.randomUUID)();
    // Optional deterministic-ish internal marker (not exposed)
    const _marker = (0, crypto_1.createHash)("sha256").update(`${args.rule_id}|${incident_id}`).digest("hex").slice(0, 16);
    throw new domain_error_1.DomainError(args.messagePublic, args.httpStatus, {
        rule_id: args.rule_id,
        error_code: args.error_code,
        category: args.category,
        severity: args.severity,
        incident_id,
        public_code: args.public_code,
        sources: args.sources ?? [],
        // marker intentionally not included in doctrine pointer
    });
}
