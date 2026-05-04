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
exports.ContractController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const contract_service_1 = require("./contract.service");
/**
 * Génération du contrat type unifié d'Architecte (HTML imprimable).
 *
 * Endpoint admin protégé. Le navigateur ouvre l'HTML, l'admin clique "Imprimer / Sauvegarder en PDF"
 * pour produire un PDF natif, sans dépendance serveur lourde (puppeteer/headless chrome).
 */
let ContractController = class ContractController {
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
                id: true, title: true, commune: true, createdAt: true,
                clientNom: true, clientEmail: true, clientTel: true,
                raisonSociale: true,
                payload: true,
            },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        const data = {
            id: dossier.id,
            clientNom: dossier.clientNom ?? undefined,
            clientEmail: dossier.clientEmail ?? undefined,
            clientTel: dossier.clientTel ?? undefined,
            raisonSociale: dossier.raisonSociale,
            title: dossier.title ?? undefined,
            commune: dossier.commune ?? undefined,
            createdAt: dossier.createdAt,
            // Champs MO additionnels stockés dans payload (saisis par admin via Backoffice)
            clientCIN: payload.clientCIN,
            representant: payload.representant,
            rc: payload.rc,
            ice: payload.ice,
            cnss: payload.cnss,
            titreFoncierNum: payload.titreFoncierNum,
            surfaceTerrainM2: typeof payload.surfaceTerrainM2 === "number" ? payload.surfaceTerrainM2 : undefined,
            surfacePlancherM2: typeof payload.surfacePlancher === "number" ? payload.surfacePlancher : undefined,
            natureProjet: payload.natureProjet,
            brief: payload.brief,
        };
        const admin = {
            contratNumero: q.contratNumero,
            croaName: q.croaName,
            archNom: q.archNom,
            archCIN: q.archCIN,
            archDomicile: q.archDomicile,
            archAutorisation: q.archAutorisation,
            archAutorisationAnnee: q.archAutorisationAnnee,
            archICE: q.archICE,
            archRC: q.archRC,
            archCNSS: q.archCNSS,
            archTel: q.archTel,
            archEmail: q.archEmail,
            delaiEtudesJours: q.delaiEtudesJours ? Number(q.delaiEtudesJours) : undefined,
            delaiTravauxMois: q.delaiTravauxMois ? Number(q.delaiTravauxMois) : undefined,
            penaliteMOPourcentJour: q.penaliteMOPourcentJour ? Number(q.penaliteMOPourcentJour) : undefined,
            penaliteMOEPourcentJour: q.penaliteMOEPourcentJour ? Number(q.penaliteMOEPourcentJour) : undefined,
        };
        const html = this.contract.renderContractHtml(data, admin);
        res.send(html);
    }
};
exports.ContractController = ContractController;
__decorate([
    (0, common_1.Get)("dossiers/:id/contrat"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ContractController.prototype, "generate", null);
exports.ContractController = ContractController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("p2"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        contract_service_1.P2ContractService])
], ContractController);
