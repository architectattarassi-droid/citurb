import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DomainError } from "./domain-error";

/**
 * Global redaction filter:
 * - If DomainError: respond with its publicPayload (already redacted)
 * - Else: respond with generic error + generated incident_id (UUID)
 *
 * IMPORTANT: never leak rule_id/tome_ref/error_code publicly.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    if (exception instanceof DomainError) {
      return res.status(exception.getStatus()).json(exception.publicPayload);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // For expected client errors (4xx), do NOT mask the response behind a
      // fake incident id. This keeps auth flows sane (401/403) and allows UIs
      // to react properly.
      if (status < 500) {
        if (typeof payload === "string") return res.status(status).json({ error: payload });

        // Nest may return: { statusCode, message, error }
        if (payload && typeof payload === "object") {
          const anyPayload = payload as any;
          const msg = Array.isArray(anyPayload.message)
            ? anyPayload.message.join("; ")
            : anyPayload.message || anyPayload.error || "Action impossible";
          return res.status(status).json({ error: msg });
        }

        return res.status(status).json({ error: "Action impossible" });
      }

      // For server errors, redact + generate incident_id for tracing.
      return res.status(status).json({
        error: typeof payload === "string" ? payload : "Erreur interne",
        incident_id: randomUUID(),
      });
    }

    // Unknown error: redact
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", exception, { path: req?.url });
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Erreur interne",
      incident_id: randomUUID(),
    });
  }
}
