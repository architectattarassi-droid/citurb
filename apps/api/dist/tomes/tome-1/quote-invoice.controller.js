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
exports.QuoteInvoiceController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tome-5/auth/roles.decorator");
const quote_invoice_service_1 = require("./quote-invoice.service");
/**
 * QuoteInvoiceController — endpoints admin pour devis & factures.
 *
 *   POST /api/cc/quote/:dossierId        — assigne le numéro de devis
 *   GET  /api/cc/quote/:dossierId/html   — HTML imprimable du devis
 *   POST /api/cc/invoice/:dossierId      — assigne le numéro de facture
 *   GET  /api/cc/invoice/:dossierId/html — HTML imprimable de la facture
 *
 * Tous protégés ADMIN/OWNER/OPS via RolesGuard.
 */
let QuoteInvoiceController = class QuoteInvoiceController {
    service;
    constructor(service) {
        this.service = service;
    }
    // ── Devis ──
    async assignQuote(dossierId) {
        const numero = await this.service.getOrAssignNumero(dossierId, "QUOTE");
        return { ok: true, numero };
    }
    async quoteHtml(dossierId, notes, res) {
        const html = await this.service.renderHtml(dossierId, { type: "QUOTE", notes });
        res.send(html);
    }
    // ── Devis persisté (model Devis, passe 2) ──
    async devisRowHtml(devisId, res) {
        const html = await this.service.renderDevisRowHtml(devisId);
        res.send(html);
    }
    // ── Facture ──
    async assignInvoice(dossierId) {
        const numero = await this.service.getOrAssignNumero(dossierId, "INVOICE");
        return { ok: true, numero };
    }
    async invoiceHtml(dossierId, statut, methode, ref, notes, res) {
        const html = await this.service.renderHtml(dossierId, {
            type: "INVOICE",
            paiementStatut: statut,
            paiementMethode: methode,
            paiementRef: ref,
            notes,
        });
        res.send(html);
    }
};
exports.QuoteInvoiceController = QuoteInvoiceController;
__decorate([
    (0, common_1.Post)("quote/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuoteInvoiceController.prototype, "assignQuote", null);
__decorate([
    (0, common_1.Get)("quote/:dossierId/html"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)("notes")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], QuoteInvoiceController.prototype, "quoteHtml", null);
__decorate([
    (0, common_1.Get)("devis/:devisId/html"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("devisId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuoteInvoiceController.prototype, "devisRowHtml", null);
__decorate([
    (0, common_1.Post)("invoice/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuoteInvoiceController.prototype, "assignInvoice", null);
__decorate([
    (0, common_1.Get)("invoice/:dossierId/html"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)("statut")),
    __param(2, (0, common_1.Query)("methode")),
    __param(3, (0, common_1.Query)("ref")),
    __param(4, (0, common_1.Query)("notes")),
    __param(5, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], QuoteInvoiceController.prototype, "invoiceHtml", null);
exports.QuoteInvoiceController = QuoteInvoiceController = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("api/cc"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:paramtypes", [quote_invoice_service_1.QuoteInvoiceService])
], QuoteInvoiceController);
