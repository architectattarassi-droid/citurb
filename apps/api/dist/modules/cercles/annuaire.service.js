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
exports.AnnuaireService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
let AnnuaireService = class AnnuaireService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsertMyProfile(userId, input) {
        if (!input.displayName?.trim())
            throw new common_1.BadRequestException("displayName requis");
        if (!input.metier)
            throw new common_1.BadRequestException("metier requis");
        const payload = {
            displayName: input.displayName.trim(),
            title: input.title ?? null,
            bio: input.bio ?? null,
            avatarUrl: input.avatarUrl ?? null,
            coverUrl: input.coverUrl ?? null,
            metier: input.metier,
            classeBTP: input.classeBTP ?? null,
            agrements: input.agrements ?? [],
            specialites: input.specialites ?? [],
            cnoaNumero: input.cnoaNumero ?? null,
            cabinetName: input.cabinetName ?? null,
            cabinetSize: input.cabinetSize ?? null,
            cabinetStatus: input.cabinetStatus ?? null,
            yearsExperience: input.yearsExperience ?? null,
            formations: input.formations ? input.formations : null,
            certifications: input.certifications ?? [],
            prix: input.prix ?? [],
            langues: input.langues ?? [],
            experiencesPhares: input.experiencesPhares ? input.experiencesPhares : null,
            regions: input.regions ?? [],
            villePrincipale: input.villePrincipale ?? null,
            tarifsRange: input.tarifsRange ?? null,
            disponibilite: input.disponibilite ?? "DISPONIBLE",
            disponibleAPartir: input.disponibleAPartir ? new Date(input.disponibleAPartir) : null,
            websiteUrl: input.websiteUrl ?? null,
            linkedinUrl: input.linkedinUrl ?? null,
            behanceUrl: input.behanceUrl ?? null,
            instagramUrl: input.instagramUrl ?? null,
            pinterestUrl: input.pinterestUrl ?? null,
            phonePublic: input.phonePublic ?? null,
            emailPublic: input.emailPublic ?? null,
        };
        return this.prisma.proProfile.upsert({
            where: { userId },
            update: payload,
            create: { userId, ...payload },
        });
    }
    // ── Données dérivées : posts/cercles/rooms de l'user ─────────
    async getUserCercles(userIdOrId, viewerId) {
        const target = await this.resolveUserId(userIdOrId);
        return this.prisma.cercleMembership.findMany({
            where: { userId: target, status: "ACTIVE" },
            orderBy: { joinedAt: "desc" },
            take: 50,
            include: {
                cercle: {
                    select: {
                        id: true, slug: true, name: true, description: true, visibility: true,
                        region: true, themes: true,
                        _count: { select: { members: true, posts: true, rooms: true } },
                    },
                },
            },
        });
    }
    async getUserPosts(userIdOrId) {
        const target = await this.resolveUserId(userIdOrId);
        return this.prisma.cerclePost.findMany({
            where: { authorId: target, deletedAt: null, parentId: null },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                cercle: { select: { id: true, slug: true, name: true } },
                _count: { select: { replies: true } },
            },
        });
    }
    async getUserRooms(userIdOrId) {
        const target = await this.resolveUserId(userIdOrId);
        return this.prisma.liveRoom.findMany({
            where: { hostId: target },
            orderBy: [{ status: "asc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
            take: 20,
            include: {
                cercle: { select: { id: true, slug: true, name: true } },
            },
        });
    }
    async resolveUserId(userIdOrProfileId) {
        // Si c'est un userId direct
        const u = await this.prisma.user.findUnique({ where: { id: userIdOrProfileId }, select: { id: true } });
        if (u)
            return u.id;
        // Sinon c'est peut-être un ProProfile.id
        const p = await this.prisma.proProfile.findUnique({ where: { id: userIdOrProfileId }, select: { userId: true } });
        if (p)
            return p.userId;
        throw new common_1.NotFoundException("Utilisateur introuvable");
    }
    async getMyProfile(userId) {
        return this.prisma.proProfile.findUnique({ where: { userId } });
    }
    async getProfile(userIdOrId) {
        // Accepte userId OU id de ProProfile
        const profile = await this.prisma.proProfile.findFirst({
            where: { OR: [{ userId: userIdOrId }, { id: userIdOrId }] },
            include: { user: { select: { id: true, email: true, username: true, role: true } } },
        });
        if (!profile)
            throw new common_1.NotFoundException("Profil pro introuvable");
        return profile;
    }
    /** Facets pour la sidebar de recherche (compteurs par dimension). */
    async facets() {
        const [byMetier, byClasseBTP, byVerified] = await Promise.all([
            this.prisma.proProfile.groupBy({ by: ["metier"], _count: { _all: true } }),
            this.prisma.proProfile.groupBy({ by: ["classeBTP"], _count: { _all: true }, where: { classeBTP: { not: null } } }),
            this.prisma.proProfile.groupBy({ by: ["isVerified"], _count: { _all: true } }),
        ]);
        const total = await this.prisma.proProfile.count();
        return {
            total,
            metiers: byMetier.map(g => ({ name: g.metier, count: g._count._all })),
            classesBTP: byClasseBTP.map(g => ({ name: g.classeBTP, count: g._count._all })),
            verified: byVerified.map(g => ({ name: g.isVerified ? "verified" : "unverified", count: g._count._all })),
        };
    }
    async search(input) {
        const page = Math.max(1, input.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
        const where = {};
        if (input.metier)
            where.metier = input.metier;
        if (input.classeBTP)
            where.classeBTP = input.classeBTP;
        if (input.isVerified !== undefined)
            where.isVerified = input.isVerified;
        if (input.region)
            where.regions = { has: input.region };
        if (input.specialite)
            where.specialites = { has: input.specialite };
        if (input.q?.trim()) {
            const q = input.q.trim();
            where.OR = [
                { displayName: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { bio: { contains: q, mode: "insensitive" } },
                { villePrincipale: { contains: q, mode: "insensitive" } },
                { specialites: { has: q } },
                { agrements: { has: q } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.proProfile.findMany({
                where,
                orderBy: [{ isVerified: "desc" }, { connectionsCount: "desc" }, { displayName: "asc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { user: { select: { id: true, email: true, username: true } } },
            }),
            this.prisma.proProfile.count({ where }),
        ]);
        return { data, meta: { page, pageSize, total } };
    }
    /**
     * Suggestions : pros du même métier, des mêmes régions, ou avec spécialités
     * en commun. Limité aux non-connectés.
     */
    async suggestions(userId, take = 6) {
        const me = await this.prisma.proProfile.findUnique({ where: { userId } });
        if (!me) {
            // Si user n'a pas encore de profil, on retourne quelques pros vérifiés
            return this.prisma.proProfile.findMany({
                where: { userId: { not: userId }, isVerified: true },
                take,
                orderBy: { connectionsCount: "desc" },
            });
        }
        return this.prisma.proProfile.findMany({
            where: {
                userId: { not: userId },
                OR: [
                    { metier: me.metier },
                    { regions: { hasSome: me.regions } },
                    { specialites: { hasSome: me.specialites } },
                ],
            },
            take,
            orderBy: [{ isVerified: "desc" }, { connectionsCount: "desc" }],
        });
    }
    // ── Connections ──────────────────────────────────────────────
    async sendConnection(fromUserId, toUserId, message) {
        if (fromUserId === toUserId)
            throw new common_1.BadRequestException("Impossible de se connecter à soi-même");
        return this.prisma.connection.upsert({
            where: { fromUserId_toUserId: { fromUserId, toUserId } },
            update: {},
            create: { fromUserId, toUserId, message: message ?? null, status: "PENDING" },
        });
    }
    async respondConnection(toUserId, fromUserId, accept) {
        const conn = await this.prisma.connection.findUnique({ where: { fromUserId_toUserId: { fromUserId, toUserId } } });
        if (!conn || conn.status !== "PENDING")
            throw new common_1.BadRequestException("Aucune demande à traiter");
        const updated = await this.prisma.connection.update({
            where: { fromUserId_toUserId: { fromUserId, toUserId } },
            data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
        });
        if (accept) {
            // Incrémente connectionsCount des deux côtés
            await this.prisma.$transaction([
                this.prisma.proProfile.updateMany({ where: { userId: fromUserId }, data: { connectionsCount: { increment: 1 } } }),
                this.prisma.proProfile.updateMany({ where: { userId: toUserId }, data: { connectionsCount: { increment: 1 } } }),
            ]);
        }
        return updated;
    }
    async listConnections(userId) {
        return this.prisma.connection.findMany({
            where: {
                OR: [{ fromUserId: userId }, { toUserId: userId }],
                status: "ACCEPTED",
            },
            include: {
                fromUser: { include: { proProfile: true } },
                toUser: { include: { proProfile: true } },
            },
            orderBy: { respondedAt: "desc" },
        });
    }
    async listPendingRequests(userId) {
        return this.prisma.connection.findMany({
            where: { toUserId: userId, status: "PENDING" },
            include: { fromUser: { include: { proProfile: true } } },
            orderBy: { createdAt: "desc" },
        });
    }
};
exports.AnnuaireService = AnnuaireService;
exports.AnnuaireService = AnnuaireService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnnuaireService);
