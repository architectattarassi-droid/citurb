"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsService = void 0;
/**
 * Placeholder kernel service.
 * In the full implementation this will:
 * - create Incident row
 * - append ProbativeLog entry
 * - queue NotificationDelivery (email/telegram) if severity >= WARN
 */
class IncidentsService {
    async createFromDoctrinePointer(_ptr) {
        return { ok: true };
    }
}
exports.IncidentsService = IncidentsService;
