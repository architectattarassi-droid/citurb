/**
 * CITURBAREA — Compatibility shim
 *
 * Historical imports use "src/infrastructure/auditLog".
 * BLOC 3 introduces the canonical module at "src/infrastructure/audit/auditLog".
 *
 * Keep this file to avoid breaking the app, but route all logic to the canonical module.
 */

export {
  appendAudit,
  readAudit,
  type AuditEvent,
  type AuditEventType,
} from "./audit/auditLog";
