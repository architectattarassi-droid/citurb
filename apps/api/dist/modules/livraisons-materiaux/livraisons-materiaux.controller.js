"use strict";
/**
 * apps/api/src/modules/livraisons-materiaux/livraisons-materiaux.controller.ts
 *
 * Routes REST du module Livraisons Matériaux (Tome 5).
 * Toutes les mutations sont JWT-gated. Allow-list MutationGate : /api/livraisons.
 *
 * Endpoints :
 *  POST   /api/livraisons/commande
 *  GET    /api/livraisons/dossier/:dossierId
 *  GET    /api/livraisons/dossier/:dossierId/calendar?week=YYYY-WW
 *  GET    /api/livraisons/commande/:id           (via dossierId query)
 *  GET    /api/livraisons/commande/:id/audit
 *  POST   /api/livraisons/commande/:id/confirm-supplier
 *  POST   /api/livraisons/commande/:id/reject-supplier
 *  POST   /api/livraisons/commande/:id/livraison-prete
 *  POST   /api/livraisons/commande/:id/reception
 *  POST   /api/livraisons/commande/:id/anomalie
 */
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
exports.LivraisonsMateriauxController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const tome_decorators_1 = require("../../tomes/tome-at/kernel/tome.decorators");
const jwt_auth_guard_1 = require("../../tomes/tome-at/security/jwt-auth.guard");
const livraisons_materiaux_service_1 = require("./livraisons-materiaux.service");
let LivraisonsMateriauxController = class LivraisonsMateriauxController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    actor(req) {
        return { userId: req?.user?.userId, role: req?.user?.role };
    }
    // ── Lecture ───────────────────────────────────────────────────────────
    list(dossierId) {
        return this.svc.listForDossier(dossierId);
    }
    calendar(dossierId, week) {
        return this.svc.calendarForWeek(dossierId, week || "");
    }
    getOne(id, dossierId) {
        return this.svc.getOne(dossierId, id);
    }
    audit(id, dossierId) {
        return this.svc.getAuditTrail(dossierId, id);
    }
    // ── Mutations ────────────────────────────────────────────────────────
    create(body, req) {
        return this.svc.create(body, this.actor(req));
    }
    confirm(id, body, req) {
        return this.svc.confirmBySupplier(body.dossierId, id, this.actor(req));
    }
    reject(id, body, req) {
        return this.svc.rejectBySupplier(body.dossierId, id, body.motif || "", this.actor(req));
    }
    prete(id, body, req) {
        return this.svc.markLivraisonPrete(body.dossierId, id, this.actor(req));
    }
    reception(id, body, req) {
        const { dossierId, ...input } = body;
        return this.svc.receptionner(dossierId, id, input, this.actor(req));
    }
    anomalie(id, body, req) {
        const { dossierId, ...input } = body;
        return this.svc.declareAnomalie(dossierId, id, input, this.actor(req));
    }
};
exports.LivraisonsMateriauxController = LivraisonsMateriauxController;
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    (0, tome_decorators_1.Rule)("T5-LIV-LIST-001"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/calendar"),
    (0, tome_decorators_1.Rule)("T5-LIV-CALENDAR-007"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)("week")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "calendar", null);
__decorate([
    (0, common_1.Get)("commande/:id"),
    (0, tome_decorators_1.Rule)("T5-LIV-DETAIL-001"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)("commande/:id/audit"),
    (0, tome_decorators_1.Rule)("T5-LIV-AUDIT-008"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "audit", null);
__decorate([
    (0, common_1.Post)("commande"),
    (0, tome_decorators_1.Rule)("T5-LIV-COMMANDE-001"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("commande/:id/confirm-supplier"),
    (0, tome_decorators_1.Rule)("T5-LIV-CONFIRM-002"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)("commande/:id/reject-supplier"),
    (0, tome_decorators_1.Rule)("T5-LIV-REJECT-003"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)("commande/:id/livraison-prete"),
    (0, tome_decorators_1.Rule)("T5-LIV-EN-ROUTE-004"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "prete", null);
__decorate([
    (0, common_1.Post)("commande/:id/reception"),
    (0, tome_decorators_1.Rule)("T5-LIV-RECEPTION-005"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "reception", null);
__decorate([
    (0, common_1.Post)("commande/:id/anomalie"),
    (0, tome_decorators_1.Rule)("T5-LIV-ANOMALIE-006"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LivraisonsMateriauxController.prototype, "anomalie", null);
exports.LivraisonsMateriauxController = LivraisonsMateriauxController = __decorate([
    (0, tome_at_1.Tome)("tome5"),
    (0, common_1.Controller)("api/livraisons"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [livraisons_materiaux_service_1.LivraisonsMateriauxService])
], LivraisonsMateriauxController);
