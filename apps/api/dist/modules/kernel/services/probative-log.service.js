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
var ProbativeLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProbativeLogService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * ProbativeLogService — journal probatoire append-only avec chaîne de hashs
 *
 * Doctrine T@-R-TRACE-001:
 *   chaque entrée contient hash(prevHash + payload) pour détection de
 *   manipulation a posteriori. Toute rupture de chaîne = compromission DB.
 *
 * Performance: sériel (verrou logique) pour garantir la chaîne. Si volume élevé,
 * basculer sur batching avec transaction (TODO).
 */
let ProbativeLogService = ProbativeLogService_1 = class ProbativeLogService {
    prisma;
    logger = new common_1.Logger(ProbativeLogService_1.name);
    // Cache du dernier hash pour éviter une lecture DB par append (best-effort).
    lastHashCache = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async append(payload) {
        try {
            const prevHash = await this.getLastHash();
            const serialized = JSON.stringify(payload, Object.keys(payload).sort());
            const hash = (0, crypto_1.createHash)("sha256").update(`${prevHash || ""}|${serialized}`).digest("hex");
            const row = await this.prisma.probativeLog.create({
                data: { prevHash, hash, payload: payload },
                select: { hash: true },
            });
            this.lastHashCache = row.hash;
            return { ok: true, hash: row.hash };
        }
        catch (e) {
            this.logger.error(`[ProbativeLog] Append failed: ${e?.message}`, e?.stack);
            return { ok: false };
        }
    }
    /**
     * Vérifie l'intégrité de la chaîne (à la demande, pour audit).
     */
    async verifyChain(opts = {}) {
        const rows = await this.prisma.probativeLog.findMany({
            orderBy: { createdAt: "asc" },
            take: opts.take ?? 1000,
            select: { id: true, prevHash: true, hash: true, payload: true },
        });
        let prev = null;
        for (const r of rows) {
            const serialized = JSON.stringify(r.payload, Object.keys(r.payload).sort());
            const expectedHash = (0, crypto_1.createHash)("sha256").update(`${prev || ""}|${serialized}`).digest("hex");
            if (expectedHash !== r.hash) {
                return { ok: false, checked: rows.length, broken: { id: r.id, expected: expectedHash, actual: r.hash } };
            }
            if ((r.prevHash || null) !== (prev || null)) {
                return { ok: false, checked: rows.length, broken: { id: r.id, expected: prev || "", actual: r.prevHash || "" } };
            }
            prev = r.hash;
        }
        return { ok: true, checked: rows.length };
    }
    async getLastHash() {
        if (this.lastHashCache !== null)
            return this.lastHashCache;
        const last = await this.prisma.probativeLog.findFirst({
            orderBy: { createdAt: "desc" },
            select: { hash: true },
        });
        this.lastHashCache = last?.hash ?? null;
        return this.lastHashCache;
    }
};
exports.ProbativeLogService = ProbativeLogService;
exports.ProbativeLogService = ProbativeLogService = ProbativeLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProbativeLogService);
