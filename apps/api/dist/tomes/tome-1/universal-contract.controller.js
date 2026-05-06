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
exports.UniversalContractController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
const universal_contract_service_1 = require("./universal-contract.service");
/**
 * Endpoint admin pour générer le contrat HTML de N'IMPORTE QUEL dossier
 * (P3/P4/P5/P6 — pour P2 utiliser /p2/dossiers/:id/contrat existant).
 *
 *  GET /api/cc/contract/:dossierId  → HTML imprimable
 *
 * Variables admin via query string (contratNumero, archNom, archICE,
 * archRC, archDomicile, archTel, archEmail, delaiJours, penaliteRetardPourcent).
 */
let UniversalContractController = class UniversalContractController {
    prisma;
    contract;
    constructor(prisma, contract) {
        this.prisma = prisma;
        this.contract = contract;
    }
    async generate(id, q, res) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id },
            select: {
                id: true, porteType: true, title: true, commune: true, createdAt: true,
                clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
                payload: true,
            },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        const admin = {
            contratNumero: q.contratNumero,
            archNom: q.archNom,
            archICE: q.archICE,
            archRC: q.archRC,
            archDomicile: q.archDomicile,
            archTel: q.archTel,
            archEmail: q.archEmail,
            delaiJours: q.delaiJours ? Number(q.delaiJours) : undefined,
            penaliteRetardPourcent: q.penaliteRetardPourcent ? Number(q.penaliteRetardPourcent) : undefined,
        };
        const html = this.contract.renderHtml({
            id: dossier.id,
            porteType: dossier.porteType ?? "",
            title: dossier.title ?? undefined,
            commune: dossier.commune ?? undefined,
            clientNom: dossier.clientNom ?? undefined,
            clientCIN: payload.clientCIN,
            clientEmail: dossier.clientEmail ?? undefined,
            clientTel: dossier.clientTel ?? undefined,
            raisonSociale: dossier.raisonSociale,
            representant: payload.representant,
            rc: payload.rc,
            ice: payload.ice,
            cnss: payload.cnss,
            brief: payload.brief,
            createdAt: dossier.createdAt,
        }, admin);
        res.send(html);
    }
};
exports.UniversalContractController = UniversalContractController;
__decorate([
    (0, common_1.Get)(":dossierId"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UniversalContractController.prototype, "generate", null);
exports.UniversalContractController = UniversalContractController = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("api/cc/contract"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        universal_contract_service_1.UniversalContractService])
], UniversalContractController);
