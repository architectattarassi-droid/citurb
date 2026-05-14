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
exports.MembershipsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const cercles_service_1 = require("./cercles.service");
/**
 * MembershipsService — Sprint C1 (memberships flow)
 *
 * - join PUBLIC          → ACTIVE direct
 * - join MEMBERS_ONLY    → PENDING_REQUEST
 * - join PRIVATE         → forbidden (invitation requise)
 * - invite               → PENDING_INVITE
 * - accept invitation    → ACTIVE
 * - leave                → LEFT
 * - ban                  → BANNED
 */
let MembershipsService = class MembershipsService {
    prisma;
    cercles;
    constructor(prisma, cercles) {
        this.prisma = prisma;
        this.cercles = cercles;
    }
    async join(cercleId, userId) {
        const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { visibility: true } });
        if (cercle.visibility === "PRIVATE")
            throw new common_1.BadRequestException("Cercle privé : invitation requise");
        const status = cercle.visibility === "PUBLIC" ? "ACTIVE" : "PENDING_REQUEST";
        return this.prisma.cercleMembership.upsert({
            where: { cercleId_userId: { cercleId, userId } },
            update: { status },
            create: { cercleId, userId, status, role: "MEMBER" },
        });
    }
    async leave(cercleId, userId) {
        const m = await this.prisma.cercleMembership.findUnique({ where: { cercleId_userId: { cercleId, userId } } });
        if (!m)
            throw new common_1.NotFoundException("Pas membre");
        return this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { status: "LEFT", leftAt: new Date() },
        });
    }
    async invite(cercleId, inviterId, userId, role = "MEMBER") {
        await this.cercles.assertModerator(cercleId, inviterId);
        return this.prisma.cercleMembership.upsert({
            where: { cercleId_userId: { cercleId, userId } },
            update: { status: "PENDING_INVITE", role },
            create: { cercleId, userId, status: "PENDING_INVITE", role },
        });
    }
    async acceptInvitation(cercleId, userId) {
        const m = await this.prisma.cercleMembership.findUnique({ where: { cercleId_userId: { cercleId, userId } } });
        if (!m || m.status !== "PENDING_INVITE")
            throw new common_1.BadRequestException("Aucune invitation à accepter");
        return this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { status: "ACTIVE", joinedAt: new Date() },
        });
    }
    async approveRequest(cercleId, approverId, userId) {
        await this.cercles.assertModerator(cercleId, approverId);
        return this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { status: "ACTIVE", joinedAt: new Date() },
        });
    }
    async listMembers(cercleId, viewerId) {
        // Cercles PUBLIC + MEMBERS_ONLY : tous les users connectés peuvent voir la liste
        // Cercles PRIVATE : seulement les membres ACTIVE peuvent voir
        const cercle = await this.prisma.cercle.findUniqueOrThrow({
            where: { id: cercleId },
            select: { visibility: true },
        });
        if (cercle.visibility === "PRIVATE") {
            await this.cercles.assertMember(cercleId, viewerId);
        }
        return this.prisma.cercleMembership.findMany({
            where: { cercleId, status: "ACTIVE" },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
            include: {
                user: {
                    select: {
                        id: true, email: true, username: true,
                        proProfile: { select: { displayName: true, title: true, avatarUrl: true, metier: true, villePrincipale: true } },
                    },
                },
            },
        });
    }
    async promote(cercleId, ownerId, userId) {
        await this.cercles.assertOwner(cercleId, ownerId);
        await this.prisma.cercleModerator.upsert({
            where: { cercleId_userId: { cercleId, userId } },
            update: {},
            create: { cercleId, userId },
        });
        return this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { role: "MODERATOR" },
        });
    }
    async ban(cercleId, moderatorId, userId) {
        await this.cercles.assertModerator(cercleId, moderatorId);
        return this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { status: "BANNED", leftAt: new Date() },
        });
    }
};
exports.MembershipsService = MembershipsService;
exports.MembershipsService = MembershipsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cercles_service_1.CerclesService])
], MembershipsService);
