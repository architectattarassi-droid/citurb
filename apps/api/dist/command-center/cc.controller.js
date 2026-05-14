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
const tome_at_1 = require("../tomes/tome-at");
const jwt_auth_guard_1 = require("../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tomes/tome-5/auth/roles.decorator");
const cc_snapshot_service_1 = require("./cc-snapshot.service");
const LEAD_STATUS = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST", "SPAM"];
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
        return {
            items: [
                { id: "m1", title: "500 000 DH : نستثمر ولا نبني؟", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
                { id: "m2", title: "5 أخطاء كتخسر الملايين", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 2, views: 0, leads: 0 },
                { id: "m3", title: "Étape 6: التسوية Terrassement", type: "SHORT", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
                { id: "m4", title: "بئر الرامي : تحليل شامل", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 3, views: 0, leads: 0 },
            ],
        };
    }
    async leads() {
        const items = await this.prisma.dossier.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            select: {
                id: true, createdAt: true, updatedAt: true, title: true, commune: true, status: true,
                porteType: true, gestionMode: true, payload: true,
                clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
                owner: { select: { email: true } },
            },
        });
        return items.map((d) => extractLeadView(d));
    }
    async updateLead(id, body, req) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({ where: { id }, select: { payload: true } });
        const payload = (dossier.payload && typeof dossier.payload === "object") ? { ...dossier.payload } : {};
        const qualif = (payload.leadQualif && typeof payload.leadQualif === "object")
            ? payload.leadQualif
            : { status: "NEW", notes: [] };
        if (body.status && LEAD_STATUS.includes(body.status)) {
            qualif.status = body.status;
            qualif.lastContactAt = new Date().toISOString();
        }
        if (body.note && body.note.trim()) {
            qualif.notes = qualif.notes || [];
            qualif.notes.push({
                ts: new Date().toISOString(),
                author: req.user?.email || req.user?.userId || "admin",
                text: body.note.trim(),
                status: body.status,
            });
        }
        payload.leadQualif = qualif;
        const updated = await this.prisma.dossier.update({
            where: { id },
            data: { payload },
            select: { id: true, payload: true },
        });
        return { ok: true, leadQualif: updated.payload?.leadQualif };
    }
    // ── Inscrits Cercles (tous les users avec ProProfile) ──────────
    async inscrits() {
        const profiles = await this.prisma.proProfile.findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            select: {
                id: true,
                userId: true,
                displayName: true,
                title: true,
                bio: true,
                avatarUrl: true,
                metier: true,
                cabinetName: true,
                cabinetStatus: true,
                cnoaNumero: true,
                yearsExperience: true,
                villePrincipale: true,
                regions: true,
                specialites: true,
                langues: true,
                websiteUrl: true,
                linkedinUrl: true,
                phonePublic: true,
                emailPublic: true,
                isVerified: true,
                verifiedAt: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        email: true, username: true, phone: true, isActive: true,
                        role: true, plan: true, emailVerifiedAt: true, createdAt: true,
                    },
                },
            },
        });
        return { ok: true, data: profiles };
    }
    async verifyInscrit(userId, body, req) {
        const updated = await this.prisma.proProfile.update({
            where: { userId },
            data: {
                isVerified: body.isVerified,
                verifiedAt: body.isVerified ? new Date() : null,
                verifierNote: body.note || null,
            },
            select: { id: true, isVerified: true, verifiedAt: true },
        });
        return { ok: true, data: updated };
    }
    async deactivateInscrit(userId, body) {
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isActive: body.isActive },
            select: { id: true, isActive: true },
        });
        return { ok: true, data: updated };
    }
    async createLead(body, req) {
        // Admin manual lead creation. Creates a Dossier in name of admin (or specified owner).
        const ownerId = body.ownerId || req.user?.userId;
        if (!ownerId)
            throw new Error("ownerId requis");
        const item = await this.prisma.dossier.create({
            data: {
                ownerId,
                title: body.title || body.nom || "Lead manuel",
                commune: body.commune || body.ville || null,
                payload: {
                    ...body,
                    leadQualif: { status: "NEW", notes: [{ ts: new Date().toISOString(), author: req.user?.email || "admin", text: "Lead créé manuellement par admin" }] },
                },
                porteType: body.porteType || "P1",
                gestionMode: body.gestionMode || "AUTONOME",
                clientNom: body.clientNom || body.nom || null,
                clientEmail: body.clientEmail || body.email || null,
                clientTel: body.clientTel || body.tel || null,
                raisonSociale: body.raisonSociale || null,
            },
            select: { id: true, createdAt: true, title: true, commune: true, porteType: true, payload: true, clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true, owner: { select: { email: true } }, status: true, gestionMode: true, updatedAt: true },
        });
        return extractLeadView(item);
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Patch)("leads/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CCController.prototype, "updateLead", null);
__decorate([
    (0, common_1.Get)("inscrits"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CCController.prototype, "inscrits", null);
__decorate([
    (0, common_1.Patch)("inscrits/:userId/verify"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CCController.prototype, "verifyInscrit", null);
__decorate([
    (0, common_1.Patch)("inscrits/:userId/deactivate"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CCController.prototype, "deactivateInscrit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    (0, common_1.Post)("leads"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CCController.prototype, "createLead", null);
exports.CCController = CCController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/cc"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cc_snapshot_service_1.CCSnapshotService])
], CCController);
function extractLeadView(d) {
    const qualif = (d.payload?.leadQualif && typeof d.payload.leadQualif === "object")
        ? d.payload.leadQualif
        : { status: "NEW", notes: [] };
    return {
        id: d.id,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        nom: d.clientNom || d.raisonSociale || d.title || "Lead",
        ville: d.commune || "—",
        type: d.porteType || "P1",
        source: d.payload?.source || "SITE",
        status: qualif.status,
        dossierStatus: d.status,
        interet: d.title,
        gestionMode: d.gestionMode,
        email: d.clientEmail || d.owner?.email,
        tel: d.clientTel,
        raisonSociale: d.raisonSociale,
        notesCount: qualif.notes?.length || 0,
        lastContactAt: qualif.lastContactAt,
        lastNote: qualif.notes?.length ? qualif.notes[qualif.notes.length - 1] : null,
        notes: qualif.notes || [],
        brief: d.payload?.brief,
    };
}
