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
exports.P1ContractController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const contract_service_1 = require("./contract.service");
/**
 * Génération du contrat type unifié d'Architecte (CNOA Construction 2024) pour P1.
 *
 * 2 endpoints :
 *   - GET /p1/admin/dossiers/:id/contrat (ADMIN/OWNER/OPS)
 *       → accès direct, pas de consentement requis
 *   - GET /p1/dossiers/:id/contrat (CLIENT propriétaire du dossier)
 *       → consentement obligatoire (?consent_data=true&consent_usage=true)
 *       → sans consentement : page HTML de saisie avec checkboxes
 *       → avec consentement : trace en DB + génère le contrat
 *
 * Format : HTML imprimable (l'utilisateur clique "Imprimer / Sauvegarder en PDF"
 * dans le navigateur — aucune dépendance puppeteer ou pdfkit côté serveur).
 */
let P1ContractController = class P1ContractController {
    prisma;
    contract;
    constructor(prisma, contract) {
        this.prisma = prisma;
        this.contract = contract;
    }
    // ─── Variante ADMIN ────────────────────────────────────────────────────
    async generateAdmin(id, q, res) {
        const dossier = await this.loadDossier(id);
        const data = this.contract.buildContractData(dossier);
        const admin = this.contract.buildAdminParams(q);
        res.send(this.contract.renderContractHtml(data, admin));
    }
    // ─── Variante CLIENT self-service avec consentement ────────────────────
    async generateClient(id, q, req, res) {
        const dossier = await this.loadDossier(id);
        const user = req.user;
        const role = (user?.role || "").toUpperCase();
        // Si admin → accès direct (mêmes droits que /admin/...)
        if (role === "ADMIN" || role === "OWNER" || role === "OPS") {
            const data = this.contract.buildContractData(dossier);
            const admin = this.contract.buildAdminParams(q);
            res.send(this.contract.renderContractHtml(data, admin));
            return;
        }
        // Client : doit être propriétaire du dossier
        const ownerId = dossier.userId || dossier.clientId;
        if (!ownerId || ownerId !== user?.userId) {
            throw new common_1.ForbiddenException("Vous n'êtes pas le propriétaire de ce dossier.");
        }
        const consentData = q.consent_data === "true";
        const consentUsage = q.consent_usage === "true";
        // Sans consentement → page de saisie avec checkboxes
        if (!consentData || !consentUsage) {
            const title = dossier.title || "Mon projet";
            res.send(this.contract.renderConsentPage(id, title));
            return;
        }
        // Trace le consentement (Dossier.payload.contractConsents[]).
        // Append-only (history complet pour traçabilité juridique loi 09-08).
        const existingPayload = dossier.payload && typeof dossier.payload === "object"
            ? dossier.payload
            : {};
        const consents = Array.isArray(existingPayload.contractConsents)
            ? existingPayload.contractConsents
            : [];
        consents.push({
            timestamp: new Date().toISOString(),
            ip: this.extractIp(req),
            userAgent: req.headers["user-agent"] || "",
            consent_data: true,
            consent_usage: true,
            userId: user?.userId || null,
        });
        await this.prisma.dossier.update({
            where: { id },
            data: {
                payload: { ...existingPayload, contractConsents: consents },
            },
        });
        // Génère le contrat HTML
        const data = this.contract.buildContractData(dossier);
        const adminParams = this.contract.buildAdminParams(q);
        res.send(this.contract.renderContractHtml(data, adminParams));
    }
    // ─── Helpers ───────────────────────────────────────────────────────────
    async loadDossier(id) {
        if (!id || typeof id !== "string" || id.length < 3) {
            throw new common_1.BadRequestException("Identifiant de dossier invalide.");
        }
        try {
            return await this.prisma.dossier.findUniqueOrThrow({
                where: { id },
                select: {
                    id: true, title: true, commune: true, createdAt: true,
                    clientNom: true, clientEmail: true, clientTel: true,
                    raisonSociale: true,
                    payload: true,
                    // userId si présent (selon le schéma Prisma local) — sélection tolérante
                },
            });
        }
        catch {
            throw new common_1.NotFoundException("Dossier introuvable.");
        }
    }
    extractIp(req) {
        // Priorité X-Forwarded-For (Railway / Cloudflare), fallback connection.
        const xff = req.headers["x-forwarded-for"] || "";
        const first = xff.split(",")[0]?.trim();
        return first || req.ip || "";
    }
};
exports.P1ContractController = P1ContractController;
__decorate([
    (0, common_1.Get)("admin/dossiers/:id/contrat"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P1ContractController.prototype, "generateAdmin", null);
__decorate([
    (0, common_1.Get)("dossiers/:id/contrat"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("CLIENT", "ADMIN", "OWNER", "OPS") // permet aussi admin via cet endpoint
    ,
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], P1ContractController.prototype, "generateClient", null);
exports.P1ContractController = P1ContractController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("p1"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        contract_service_1.P1ContractService])
], P1ContractController);
