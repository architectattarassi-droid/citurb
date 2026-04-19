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
exports.CCSnapshotService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tomes/tome-at/kernel/prisma/prisma.service");
let CCSnapshotService = class CCSnapshotService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async current() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [dossiersTotal, leadsNew, approved, submitted, incidents] = await Promise.all([
            this.prisma.dossier.count(),
            this.prisma.dossier.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            this.prisma.dossier.count({ where: { status: "APPROVED" } }),
            this.prisma.dossier.count({ where: { status: { in: ["SUBMITTED", "NEEDS_CHANGES"] } } }),
            this.prisma.incident.count().catch(() => 0),
        ]);
        return {
            ytSubscribers: 0,
            emailsCollected: 0,
            leadsNew,
            consultationsDone: 0,
            projectsActive: submitted,
            revenueMois: 0,
            dossierCount: dossiersTotal,
            blockedCount: incidents,
            approvedCount: approved,
            funnel: [
                { name: "YouTube Views", value: 0, color: "#ff4444" },
                { name: "Email Signups", value: 0, color: "#f59e0b" },
                { name: "Leads", value: leadsNew, color: "#0088ff" },
                { name: "Consultations", value: 0, color: "#00d4aa" },
                { name: "Clients CITURBAREA", value: approved, color: "#34d399" },
            ],
        };
    }
};
exports.CCSnapshotService = CCSnapshotService;
exports.CCSnapshotService = CCSnapshotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CCSnapshotService);
