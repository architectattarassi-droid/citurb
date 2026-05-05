import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DomainError } from "./domain-error";
import { IncidentsService } from "./services/incidents.service";

/**
 * Global redaction filter:
 * - DomainError → public payload + persiste l'incident en DB (Incident + ProbativeLog)
 * - HttpException 4xx → réponse client lisible (auth/UI flows)
 * - HttpException 5xx → masqué + incident_id généré
 * - Tout autre → masqué + incident_id généré
 *
 * IMPORTANT: ne jamais leak rule_id/tome_ref/error_code publiquement.
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Optional() private readonly incidents?: IncidentsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    if (exception instanceof DomainError) {
      // Persiste l'incident en DB (fire-and-forget, ne bloque jamais la réponse)
      const ptr = (exception as any).publicPayload || {};
      if (this.incidents) {
        this.incidents.createFromDoctrinePointer({
          rule_id: ptr.rule_id || "UNKNOWN",
          error_code: ptr.error_code || "UNKNOWN",
          category: ptr.category || "DOCTRINE_BLOCK",
          severity: ptr.severity || "WARN",
          incident_id: ptr.incident_id,
          public_code: ptr.public_code,
          sources: ptr.sources,
          metadata: { path: req?.url, method: req?.method, status: exception.getStatus() },
        }).catch(() => { /* logged inside service */ });
      }
      return res.status(exception.getStatus()).json(exception.publicPayload);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (status < 500) {
        if (typeof payload === "string") return res.status(status).json({ error: payload });
        if (payload && typeof payload === "object") {
          const anyPayload = payload as any;
          const msg = Array.isArray(anyPayload.message)
            ? anyPayload.message.join("; ")
            : anyPayload.message || anyPayload.error || "Action impossible";
          return res.status(status).json({ error: msg });
        }
        return res.status(status).json({ error: "Action impossible" });
      }

      // 5xx: masqué + incident_id
      const incidentId = randomUUID();
      if (this.incidents) {
        this.incidents.createFromDoctrinePointer({
          incident_id: incidentId,
          rule_id: "T@-INTERNAL-5XX",
          error_code: `HTTP_${status}`,
          category: "DOCTRINE_BLOCK",
          severity: "WARN",
          metadata: { path: req?.url, method: req?.method, status },
        }).catch(() => {});
      }
      return res.status(status).json({
        error: typeof payload === "string" ? payload : "Erreur interne",
        incident_id: incidentId,
      });
    }

    // Erreur inconnue: redact + incident_id
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", exception, { path: req?.url });
    const incidentId = randomUUID();
    if (this.incidents) {
      this.incidents.createFromDoctrinePointer({
        incident_id: incidentId,
        rule_id: "T@-INTERNAL-UNHANDLED",
        error_code: "UNHANDLED_EXCEPTION",
        category: "DOCTRINE_BLOCK",
        severity: "CRITICAL",
        metadata: {
          path: req?.url, method: req?.method,
          message: (exception as any)?.message,
          stack: (exception as any)?.stack?.split("\n").slice(0, 5).join("\n"),
        },
      }).catch(() => {});
    }
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Erreur interne",
      incident_id: incidentId,
    });
  }
}
