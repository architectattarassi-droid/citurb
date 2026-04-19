/**
 * Placeholder kernel service.
 * In the full implementation this will:
 * - create Incident row
 * - append ProbativeLog entry
 * - queue NotificationDelivery (email/telegram) if severity >= WARN
 */
export class IncidentsService {
  async createFromDoctrinePointer(_ptr: unknown) {
    return { ok: true };
  }
}
