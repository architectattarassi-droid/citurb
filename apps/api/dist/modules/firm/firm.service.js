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
exports.FirmService = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
let FirmService = class FirmService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.firm.create({ data });
    }
    async findBySlug(slug) {
        return this.prisma.firm.findUnique({ where: { slug } });
    }
    async findAll() {
        return this.prisma.firm.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async update(id, data) {
        return this.prisma.firm.update({ where: { id }, data });
    }
    async assignUserToFirm(userId, firmId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { firmId },
            select: { id: true, email: true, firmId: true },
        });
    }
    async listFirmUsers(firmId) {
        return this.prisma.user.findMany({
            where: { firmId },
            select: { id: true, email: true, username: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listFirmDossiers(firmId) {
        return this.prisma.dossier.findMany({
            where: { firmId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async seedDefault() {
        const existing = await this.prisma.firm.findUnique({ where: { slug: 'citurbarea' } });
        if (existing)
            return existing;
        return this.prisma.firm.create({
            data: {
                slug: 'citurbarea',
                name: 'CITURBAREA',
                ownerEmail: 'citurbarea@gmail.com',
                ownerPhone: '+212700127892',
                planType: 'ENTERPRISE',
            },
        });
    }
};
exports.FirmService = FirmService;
exports.FirmService = FirmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService])
], FirmService);
