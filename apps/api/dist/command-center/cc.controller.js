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
exports.CCController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tomes/tome-at/kernel/prisma/prisma.service");
const cc_snapshot_service_1 = require("./cc-snapshot.service");
let CCController = class CCController {
    prisma;
    snapshotService;
    constructor(prisma, snapshotService) {
        this.prisma = prisma;
        this.snapshotService = snapshotService;
    }
    snapshotCurrent() {
        return this.snapshotService.current();
    }
    media() {
        return { items: [
                { id: "m1", title: "500 000 DH : نستثمر ولا نبني؟", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
                { id: "m2", title: "5 أخطاء كتخسر الملايين", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 2, views: 0, leads: 0 },
                { id: "m3", title: "Étape 6: التسوية Terrassement", type: "SHORT", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
                { id: "m4", title: "بئر الرامي : تحليل شامل", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 3, views: 0, leads: 0 },
            ] };
    }
    async leads() {
        const items = await this.prisma.dossier.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            select: { id: true, createdAt: true, title: true, commune: true, status: true },
        });
        return items.map((d) => ({
            id: d.id,
            createdAt: d.createdAt,
            nom: d.title || "Lead",
            ville: d.commune || "—",
            type: "PARTICULIER",
            source: "SITE",
            status: mapStatus(d.status),
            interet: d.title,
        }));
    }
    async updateLead() {
        return { ok: true };
    }
    async createLead(body) {
        const item = await this.prisma.dossier.create({
            data: {
                ownerId: body.ownerId || "owner-dev",
                title: body.nom || "Lead manuel",
                commune: body.ville || null,
                payload: body,
            },
        });
        return {
            id: item.id, createdAt: item.createdAt, nom: item.title, ville: item.commune || "—", type: "PARTICULIER", source: "DIRECT", status: "NEW", interet: item.title,
        };
    }
};
exports.CCController = CCController;
__decorate([
    (0, common_1.Get)("snapshot/current"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CCController.prototype, "snapshotCurrent", null);
__decorate([
    (0, common_1.Get)("media"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CCController.prototype, "media", null);
__decorate([
    (0, common_1.Get)("leads"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CCController.prototype, "leads", null);
__decorate([
    (0, common_1.Patch)("leads/:id"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CCController.prototype, "updateLead", null);
__decorate([
    (0, common_1.Post)("leads"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CCController.prototype, "createLead", null);
exports.CCController = CCController = __decorate([
    (0, common_1.Controller)("api/cc"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cc_snapshot_service_1.CCSnapshotService])
], CCController);
function mapStatus(status) {
    if (status === "APPROVED")
        return "CLIENT";
    if (status === "SUBMITTED")
        return "QUALIFIED";
    if (status === "NEEDS_CHANGES")
        return "CONTACTED";
    return "NEW";
}
