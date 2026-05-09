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
exports.FeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * FeedService — Sprint D2
 *
 * Timeline LinkedIn-style : agrège les posts récents de tous les cercles
 * dont l'utilisateur est membre (status ACTIVE) + les posts épinglés des
 * cercles publics + les rooms LIVE.
 *
 * Tri : pinned d'abord, puis upvotes décroissant boostés par fraîcheur.
 */
let FeedService = class FeedService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async homeFeed(userId, opts = {}) {
        const take = Math.min(50, Math.max(1, opts.take ?? 30));
        // 1) Cercles dont je suis membre actif
        const memberships = await this.prisma.cercleMembership.findMany({
            where: { userId, status: "ACTIVE" },
            select: { cercleId: true },
        });
        const myCercleIds = memberships.map(m => m.cercleId);
        // 2) Cercles publics (pour découvrir au-delà de mes memberships)
        const publicCercles = await this.prisma.cercle.findMany({
            where: { visibility: "PUBLIC", deletedAt: null, id: { notIn: myCercleIds } },
            select: { id: true },
            take: 30,
        });
        const visibleIds = [...myCercleIds, ...publicCercles.map(c => c.id)];
        // 3) Posts root (parentId null) récents et non supprimés
        const since = new Date(Date.now() - 30 * 24 * 3600_000);
        const posts = await this.prisma.cerclePost.findMany({
            where: {
                cercleId: { in: visibleIds },
                parentId: null,
                deletedAt: null,
                createdAt: { gte: since },
            },
            orderBy: [{ isPinned: "desc" }, { upvotes: "desc" }, { createdAt: "desc" }],
            take,
            include: {
                author: { select: { id: true, email: true, username: true, proProfile: { select: { displayName: true, avatarUrl: true, metier: true, isVerified: true } } } },
                cercle: { select: { id: true, slug: true, name: true } },
                attachments: true,
                _count: { select: { replies: true } },
            },
        });
        // 4) Rooms LIVE — banner en haut
        const liveRooms = await this.prisma.liveRoom.findMany({
            where: { cercleId: { in: visibleIds }, status: "LIVE" },
            orderBy: { startedAt: "desc" },
            take: 5,
            include: {
                cercle: { select: { id: true, slug: true, name: true } },
                host: { select: { id: true, email: true, username: true } },
            },
        });
        return { posts, liveRooms, myCercleIds };
    }
    /** Quelques cercles à découvrir (publics, fortement actifs). */
    async discoveryCercles(userId, take = 8) {
        const myMems = await this.prisma.cercleMembership.findMany({ where: { userId }, select: { cercleId: true } });
        const exclude = new Set(myMems.map(m => m.cercleId));
        return this.prisma.cercle.findMany({
            where: {
                deletedAt: null,
                visibility: { in: ["PUBLIC", "MEMBERS_ONLY"] },
                id: { notIn: Array.from(exclude) },
            },
            orderBy: { updatedAt: "desc" },
            take,
            include: { _count: { select: { members: true, posts: true } } },
        });
    }
};
exports.FeedService = FeedService;
exports.FeedService = FeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeedService);
