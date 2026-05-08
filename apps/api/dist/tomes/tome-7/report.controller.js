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
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
const report_renderer_service_1 = require("./report-renderer.service");
const client_notify_service_1 = require("../../modules/client-notify/client-notify.service");
const raise_doctrine_1 = require("../../modules/kernel/raise-doctrine");
/**
 * Endpoints de téléchargement rapport P4 / P5 (HTML watermarqué imprimable)
 *
 *  /p4/dossiers/:id/rapport     → CLIENT, gated sur packValidation.status === ACTIVATED
 *  /p4/dossiers/:id/rapport/admin → ADMIN, preview sans gating (banner ⚠️)
 *  /p5/dossiers/:id/rapport     → idem
 *  /p5/dossiers/:id/rapport/admin → idem
 *
 * Doctrine T7-R-EXPORT-001: téléchargement permis seulement après paiement
 * validé par admin (Tome 1 PackValidationService). Sinon → 403 + incident
 * ENTITLEMENT_BYPASS.
 */
let ReportController = class ReportController {
    prisma;
    renderer;
    clientNotify;
    constructor(prisma, renderer, clientNotify) {
        this.prisma = prisma;
        this.renderer = renderer;
        this.clientNotify = clientNotify;
    }
    /**
     * Admin notifie le client que son rapport est prêt à télécharger.
     * Endpoint manuel: l'admin clique "Notifier le client" depuis le shadow view
     * une fois le rapport finalisé.
     */
    async notifyReportReady(dossierId, body) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
            select: { id: true, porteType: true, title: true, clientNom: true, clientEmail: true, payload: true },
        });
        if (dossier.porteType !== "P4" && dossier.porteType !== "P5") {
            return { ok: false, error: "Notification rapport disponible uniquement pour P4 / P5" };
        }
        if (!dossier.clientEmail) {
            return { ok: false, error: "Aucune adresse email client" };
        }
        const status = dossier.payload?.packValidation?.status;
        if (status !== "ACTIVATED") {
            return { ok: false, error: `Pack non activé (status: ${status ?? "PENDING"}). Activez d'abord le pack.` };
        }
        const langRaw = String(dossier.payload?.lang ?? "").toLowerCase();
        const lang = langRaw === "en" || langRaw === "ar" ? langRaw : "fr";
        await this.clientNotify.rapportPret({
            to: dossier.clientEmail,
            dossierId: dossier.id,
            porteType: dossier.porteType,
            reportName: body.reportName || dossier.title || undefined,
            clientNom: dossier.clientNom ?? undefined,
            lang,
        });
        return { ok: true, sent: dossier.clientEmail };
    }
    // ── P4 client (gated) ─────────────────────────────────────────────────
    async p4Client(id, req, res) {
        const dossier = await this.fetchDossier(id);
        if (dossier.porteType !== "P4") {
            return res.status(404).json({ error: "Dossier P4 introuvable" });
        }
        this.assertActivatedOrThrow(dossier, req);
        const html = this.renderer.renderHtml({
            dossierId: dossier.id,
            porteType: "P4",
            clientNom: dossier.clientNom ?? undefined,
            raisonSociale: dossier.raisonSociale ?? undefined,
            commune: dossier.commune ?? undefined,
            title: dossier.title ?? undefined,
            brief: dossier.payload?.brief,
            packValidationStatus: dossier.payload?.packValidation?.status,
            adminContent: this.parseAdminContent(req.query),
            isAdminPreview: false,
        });
        res.send(html);
    }
    // ── P4 admin preview (no gating) ─────────────────────────────────────
    async p4Admin(id, q, res) {
        const dossier = await this.fetchDossier(id);
        if (dossier.porteType !== "P4") {
            return res.status(404).json({ error: "Dossier P4 introuvable" });
        }
        const html = this.renderer.renderHtml({
            dossierId: dossier.id,
            porteType: "P4",
            clientNom: dossier.clientNom ?? undefined,
            raisonSociale: dossier.raisonSociale ?? undefined,
            commune: dossier.commune ?? undefined,
            title: dossier.title ?? undefined,
            brief: dossier.payload?.brief,
            packValidationStatus: dossier.payload?.packValidation?.status,
            adminContent: this.parseAdminContent(q),
            isAdminPreview: true,
        });
        res.send(html);
    }
    // ── P5 client (gated) ─────────────────────────────────────────────────
    async p5Client(id, req, res) {
        const dossier = await this.fetchDossier(id);
        if (dossier.porteType !== "P5") {
            return res.status(404).json({ error: "Dossier P5 introuvable" });
        }
        this.assertActivatedOrThrow(dossier, req);
        const html = this.renderer.renderHtml({
            dossierId: dossier.id,
            porteType: "P5",
            clientNom: dossier.clientNom ?? undefined,
            raisonSociale: dossier.raisonSociale ?? undefined,
            commune: dossier.commune ?? undefined,
            title: dossier.title ?? undefined,
            brief: dossier.payload?.brief,
            packValidationStatus: dossier.payload?.packValidation?.status,
            adminContent: this.parseAdminContent(req.query),
            isAdminPreview: false,
        });
        res.send(html);
    }
    async p5Admin(id, q, res) {
        const dossier = await this.fetchDossier(id);
        if (dossier.porteType !== "P5") {
            return res.status(404).json({ error: "Dossier P5 introuvable" });
        }
        const html = this.renderer.renderHtml({
            dossierId: dossier.id,
            porteType: "P5",
            clientNom: dossier.clientNom ?? undefined,
            raisonSociale: dossier.raisonSociale ?? undefined,
            commune: dossier.commune ?? undefined,
            title: dossier.title ?? undefined,
            brief: dossier.payload?.brief,
            packValidationStatus: dossier.payload?.packValidation?.status,
            adminContent: this.parseAdminContent(q),
            isAdminPreview: true,
        });
        res.send(html);
    }
    // ── Helpers ───────────────────────────────────────────────────────────
    async fetchDossier(id) {
        return this.prisma.dossier.findUniqueOrThrow({
            where: { id },
            select: {
                id: true, porteType: true, title: true, commune: true,
                clientNom: true, raisonSociale: true, payload: true,
                ownerId: true,
            },
        });
    }
    assertActivatedOrThrow(dossier, req) {
        const userId = req.user?.userId;
        const isOwnerOfDossier = userId && dossier.ownerId === userId;
        const role = (req.user?.role || "").toString().toUpperCase();
        const isPrivileged = ["ADMIN", "OWNER", "OPS"].includes(role);
        if (!isOwnerOfDossier && !isPrivileged) {
            (0, raise_doctrine_1.raiseDoctrine)({
                messagePublic: "Action impossible.",
                httpStatus: 403,
                rule_id: "T7-R-EXPORT-OWNERSHIP",
                error_code: "ERR-T7-EXPORT-NOT-OWNER",
                category: "ENTITLEMENT_BYPASS",
                severity: "WARN",
                public_code: "CIT-403-0030",
            });
        }
        const status = dossier.payload?.packValidation?.status;
        if (status !== "ACTIVATED") {
            (0, raise_doctrine_1.raiseDoctrine)({
                messagePublic: "Le pack n'est pas encore activé. Le rapport sera téléchargeable après validation administrative.",
                httpStatus: 402,
                rule_id: "T7-R-EXPORT-PAYWALL",
                error_code: "ERR-T7-EXPORT-NOT-ACTIVATED",
                category: "ENTITLEMENT_BYPASS",
                severity: "INFO",
                public_code: "CIT-402-0010",
            });
        }
    }
    parseAdminContent(q) {
        return {
            sections: q?.sections ? this.safeJson(q.sections) : undefined,
            conclusion: q?.conclusion,
            expertNom: q?.expertNom,
            expertNumeroOrdre: q?.expertNumeroOrdre,
            dateDelivrance: q?.dateDelivrance,
        };
    }
    safeJson(s) {
        try {
            return JSON.parse(s);
        }
        catch {
            return undefined;
        }
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Post)("api/cc/dossiers/:id/notify-report-ready"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "notifyReportReady", null);
__decorate([
    (0, common_1.Get)("p4/dossiers/:id/rapport"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "p4Client", null);
__decorate([
    (0, common_1.Get)("p4/dossiers/:id/rapport/admin"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "p4Admin", null);
__decorate([
    (0, common_1.Get)("p5/dossiers/:id/rapport"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "p5Client", null);
__decorate([
    (0, common_1.Get)("p5/dossiers/:id/rapport/admin"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "p5Admin", null);
exports.ReportController = ReportController = __decorate([
    (0, tome_at_1.Tome)("tome7"),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        report_renderer_service_1.ReportRendererService,
        client_notify_service_1.ClientNotifyService])
], ReportController);
