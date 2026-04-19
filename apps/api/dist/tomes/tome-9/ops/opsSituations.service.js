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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpsSituationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
let OpsSituationsService = class OpsSituationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listByProject(projectId) {
        return this.prisma.workSituation.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    }
    async create(projectId, amountDeclared) {
        const amt = Number(amountDeclared);
        if (!Number.isFinite(amt) || amt <= 0)
            throw new Error("Montant invalide.");
        return this.prisma.workSituation.create({
            data: {
                projectId,
                amountDeclared: amt,
                platformFee5: 0,
                amountNet: 0,
                status: "SUBMITTED",
            },
        });
    }
    async setValidation(id, patch) {
        return this.prisma.workSituation.update({
            where: { id },
            data: {
                ...patch,
            },
        });
    }
    async pay(id) {
        const s = await this.prisma.workSituation.findUnique({ where: { id }, include: { project: true } });
        if (!s)
            throw new Error("Situation introuvable.");
        if (!s.project.modActivated)
            throw new Error("MOD non activée sur ce projet.");
        const allOk = s.architectOk && s.betOk && s.controlOk && s.topoOk;
        if (!allOk)
            throw new Error("Validations incomplètes.");
        const fee = s.amountDeclared * 0.05;
        const net = s.amountDeclared - fee;
        return this.prisma.workSituation.update({
            where: { id },
            data: {
                platformFee5: fee,
                amountNet: net,
                status: "PAID",
            },
        });
    }
};
exports.OpsSituationsService = OpsSituationsService;
exports.OpsSituationsService = OpsSituationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OpsSituationsService);
