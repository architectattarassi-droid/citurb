"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const domain_error_1 = require("./domain-error");
/**
 * Global redaction filter:
 * - If DomainError: respond with its publicPayload (already redacted)
 * - Else: respond with generic error + generated incident_id (UUID)
 *
 * IMPORTANT: never leak rule_id/tome_ref/error_code publicly.
 */
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        if (exception instanceof domain_error_1.DomainError) {
            return res.status(exception.getStatus()).json(exception.publicPayload);
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();
            // For expected client errors (4xx), do NOT mask the response behind a
            // fake incident id. This keeps auth flows sane (401/403) and allows UIs
            // to react properly.
            if (status < 500) {
                if (typeof payload === "string")
                    return res.status(status).json({ error: payload });
                // Nest may return: { statusCode, message, error }
                if (payload && typeof payload === "object") {
                    const anyPayload = payload;
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
                incident_id: (0, node_crypto_1.randomUUID)(),
            });
        }
        // Unknown error: redact
        // eslint-disable-next-line no-console
        console.error("Unhandled error:", exception, { path: req?.url });
        return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: "Erreur interne",
            incident_id: (0, node_crypto_1.randomUUID)(),
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
