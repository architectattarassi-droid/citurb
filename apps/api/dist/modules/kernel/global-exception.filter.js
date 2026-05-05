"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const domain_error_1 = require("./domain-error");
const incidents_service_1 = require("./services/incidents.service");
/**
 * Global redaction filter:
 * - DomainError → public payload + persiste l'incident en DB (Incident + ProbativeLog)
 * - HttpException 4xx → réponse client lisible (auth/UI flows)
 * - HttpException 5xx → masqué + incident_id généré
 * - Tout autre → masqué + incident_id généré
 *
 * IMPORTANT: ne jamais leak rule_id/tome_ref/error_code publiquement.
 */
let GlobalExceptionFilter = class GlobalExceptionFilter {
    incidents;
    constructor(incidents) {
        this.incidents = incidents;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        if (exception instanceof domain_error_1.DomainError) {
            // Persiste l'incident en DB (fire-and-forget, ne bloque jamais la réponse)
            const ptr = exception.publicPayload || {};
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
                }).catch(() => { });
            }
            return res.status(exception.getStatus()).json(exception.publicPayload);
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();
            if (status < 500) {
                if (typeof payload === "string")
                    return res.status(status).json({ error: payload });
                if (payload && typeof payload === "object") {
                    const anyPayload = payload;
                    const msg = Array.isArray(anyPayload.message)
                        ? anyPayload.message.join("; ")
                        : anyPayload.message || anyPayload.error || "Action impossible";
                    return res.status(status).json({ error: msg });
                }
                return res.status(status).json({ error: "Action impossible" });
            }
            // 5xx: masqué + incident_id
            const incidentId = (0, node_crypto_1.randomUUID)();
            if (this.incidents) {
                this.incidents.createFromDoctrinePointer({
                    incident_id: incidentId,
                    rule_id: "T@-INTERNAL-5XX",
                    error_code: `HTTP_${status}`,
                    category: "DOCTRINE_BLOCK",
                    severity: "WARN",
                    metadata: { path: req?.url, method: req?.method, status },
                }).catch(() => { });
            }
            return res.status(status).json({
                error: typeof payload === "string" ? payload : "Erreur interne",
                incident_id: incidentId,
            });
        }
        // Erreur inconnue: redact + incident_id
        // eslint-disable-next-line no-console
        console.error("Unhandled error:", exception, { path: req?.url });
        const incidentId = (0, node_crypto_1.randomUUID)();
        if (this.incidents) {
            this.incidents.createFromDoctrinePointer({
                incident_id: incidentId,
                rule_id: "T@-INTERNAL-UNHANDLED",
                error_code: "UNHANDLED_EXCEPTION",
                category: "DOCTRINE_BLOCK",
                severity: "CRITICAL",
                metadata: {
                    path: req?.url, method: req?.method,
                    message: exception?.message,
                    stack: exception?.stack?.split("\n").slice(0, 5).join("\n"),
                },
            }).catch(() => { });
        }
        return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: "Erreur interne",
            incident_id: incidentId,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Injectable)(),
    (0, common_1.Catch)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [incidents_service_1.IncidentsService])
], GlobalExceptionFilter);
