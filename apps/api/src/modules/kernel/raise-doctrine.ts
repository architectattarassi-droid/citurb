import { randomUUID, createHash } from "crypto";
import { DomainError } from "./domain-error";

/**
 * Tome @ helper unique.
 * Any doctrine violation MUST throw via this helper.
 * Public payload is always redacted (incident_id only + optional public code).
 */
export function raiseDoctrine(args: {
  messagePublic: string;
  httpStatus: number;
  rule_id: string;
  error_code: string;
  category: string;
  severity: string;
  public_code?: string;
  sources?: string[];
}) {
  const incident_id = randomUUID();
  // Optional deterministic-ish internal marker (not exposed)
  const _marker = createHash("sha256").update(`${args.rule_id}|${incident_id}`).digest("hex").slice(0, 16);
  throw new DomainError(args.messagePublic, args.httpStatus, {
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
