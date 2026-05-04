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
exports.VisaCroaController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const FIFTEEN_DAYS_MS = 15 * 24 * 3600 * 1000;
let VisaCroaController = class VisaCroaController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(id) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id },
            select: { id: true, payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        const state = payload.visaCroa ?? { status: "NON_DEMANDE", history: [] };
        const daysRemaining = state.dateLimite ? Math.ceil((new Date(state.dateLimite).getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
        return { ok: true, visaCroa: state, daysRemaining };
    }
    async update(id, body) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const prev = payload.visaCroa ?? { status: "NON_DEMANDE", history: [] };
        const next = { ...prev };
        if (body.croaName !== undefined)
            next.croaName = body.croaName;
        if (body.numero !== undefined)
            next.numero = body.numero;
        if (body.scanUrl !== undefined)
            next.scanUrl = body.scanUrl;
        if (body.status && body.status !== prev.status) {
            next.status = body.status;
            const now = new Date().toISOString();
            if (body.status === "DEMANDE_ENVOYEE" || body.status === "EN_COURS") {
                const start = body.dateDemande || prev.dateDemande || now;
                next.dateDemande = start;
                next.dateLimite = new Date(new Date(start).getTime() + FIFTEEN_DAYS_MS).toISOString();
            }
            if (body.status === "OBTENU") {
                next.dateObtention = body.dateObtention || now;
            }
            if (body.status === "REFUSE") {
                next.dateRefus = body.dateRefus || now;
                next.motifRefus = body.motifRefus;
            }
            next.history = [...(prev.history || []), { ts: now, author: "admin", status: body.status, note: body.note }];
        }
        else if (body.note) {
            next.history = [...(prev.history || []), { ts: new Date().toISOString(), author: "admin", status: prev.status, note: body.note }];
        }
        payload.visaCroa = next;
        const updated = await this.prisma.dossier.update({
            where: { id },
            data: { payload },
            select: { id: true, payload: true },
        });
        const finalState = updated.payload.visaCroa;
        const daysRemaining = finalState.dateLimite ? Math.ceil((new Date(finalState.dateLimite).getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
        return { ok: true, visaCroa: finalState, daysRemaining };
    }
};
exports.VisaCroaController = VisaCroaController;
__decorate([
    (0, common_1.Get)("dossiers/:id/visa-croa"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS", "CLIENT"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisaCroaController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)("dossiers/:id/visa-croa"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VisaCroaController.prototype, "update", null);
exports.VisaCroaController = VisaCroaController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("p2"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VisaCroaController);
