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
exports.CerclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
let CerclesService = class CerclesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async makeSlug(name) {
        const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "cercle";
        let slug = base;
        let i = 2;
        while (await this.prisma.cercle.findUnique({ where: { slug } })) {
            slug = `${base}-${i++}`;
        }
        return slug;
    }
    async create(ownerId, input) {
        if (!input.name?.trim())
            throw new common_1.BadRequestException("Nom requis");
        const slug = await this.makeSlug(input.name);
        // Récupère le firmId du owner si non fourni
        let firmId = input.firmId;
        if (!firmId) {
            const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { firmId: true } });
            firmId = owner?.firmId ?? undefined;
        }
        return this.prisma.cercle.create({
            data: {
                slug,
                name: input.name.trim(),
                description: input.description ?? null,
                visibility: input.visibility ?? "MEMBERS_ONLY",
                region: input.region ?? null,
                themes: input.themes ?? [],
                ownerId,
                firmId: firmId ?? null,
                // Owner est ajouté comme membre OWNER + modérateur
                members: { create: { userId: ownerId, role: "OWNER", status: "ACTIVE" } },
                moderators: { create: { userId: ownerId } },
            },
        });
    }
    async list(userId, opts = {}) {
        const page = Math.max(1, opts.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
        const where = {
            deletedAt: null,
            OR: [
                { visibility: "PUBLIC" },
                { visibility: "MEMBERS_ONLY" },
                { members: { some: { userId, status: "ACTIVE" } } },
            ],
        };
        const [data, total] = await Promise.all([
            this.prisma.cercle.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    _count: { select: { members: true, posts: true, rooms: true } },
                    members: { where: { userId }, select: { role: true, status: true } },
                },
            }),
            this.prisma.cercle.count({ where }),
        ]);
        return { data, meta: { page, pageSize, total } };
    }
    async getBySlug(slug, userId) {
        const cercle = await this.prisma.cercle.findFirst({
            where: { slug, deletedAt: null },
            include: {
                owner: { select: { id: true, email: true, username: true } },
                _count: { select: { members: true, posts: true, rooms: true } },
                members: { where: { userId }, select: { role: true, status: true } },
            },
        });
        if (!cercle)
            throw new common_1.NotFoundException("Cercle introuvable");
        if (cercle.visibility === "PRIVATE") {
            const isMember = cercle.members.length > 0 && cercle.members[0].status === "ACTIVE";
            if (!isMember)
                throw new common_1.NotFoundException("Cercle introuvable");
        }
        return cercle;
    }
    async update(cercleId, userId, input) {
        await this.assertModerator(cercleId, userId);
        const data = {};
        if (input.name !== undefined)
            data.name = input.name.trim();
        if (input.description !== undefined)
            data.description = input.description;
        if (input.visibility !== undefined)
            data.visibility = input.visibility;
        if (input.region !== undefined)
            data.region = input.region;
        if (input.themes !== undefined)
            data.themes = input.themes;
        return this.prisma.cercle.update({ where: { id: cercleId }, data });
    }
    async softDelete(cercleId, userId) {
        await this.assertOwner(cercleId, userId);
        return this.prisma.cercle.update({ where: { id: cercleId }, data: { deletedAt: new Date() } });
    }
    // ── Helpers RBAC ───────────────────────────────────────────────
    async isMember(cercleId, userId) {
        const m = await this.prisma.cercleMembership.findUnique({
            where: { cercleId_userId: { cercleId, userId } },
            select: { status: true },
        });
        return m?.status === "ACTIVE";
    }
    async assertMember(cercleId, userId) {
        if (!(await this.isMember(cercleId, userId)))
            throw new common_1.ForbiddenException("Membre requis");
    }
    async isModerator(cercleId, userId) {
        const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { ownerId: true } });
        if (cercle.ownerId === userId)
            return true;
        const mod = await this.prisma.cercleModerator.findUnique({
            where: { cercleId_userId: { cercleId, userId } },
        });
        return !!mod;
    }
    async assertModerator(cercleId, userId) {
        if (!(await this.isModerator(cercleId, userId)))
            throw new common_1.ForbiddenException("Modérateur requis");
    }
    async assertOwner(cercleId, userId) {
        const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { ownerId: true } });
        if (cercle.ownerId !== userId)
            throw new common_1.ForbiddenException("Owner requis");
    }
};
exports.CerclesService = CerclesService;
exports.CerclesService = CerclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CerclesService);
