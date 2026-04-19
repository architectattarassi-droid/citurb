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
exports.PhaseEngineService = exports.PHASES_ABOUTISSEMENT = exports.PHASES_ETUDES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
exports.PHASES_ETUDES = [
    'PHASE_01_ESQUISSE',
    'PHASE_02_APS',
    'PHASE_03_APD',
    'PHASE_04_MANDAT_BET',
    'PHASE_05_AUTORISATION',
    'PHASE_06_DOSSIER_EXECUTION',
    'PHASE_07_DCE',
    'PHASE_08_MANDATS',
    'PHASE_09_OUVERTURE_CHANTIER',
];
exports.PHASES_ABOUTISSEMENT = [
    'PHASE_RECEPTION_PROVISOIRE',
    'PHASE_RECEPTION_DEFINITIVE',
    'PHASE_PERMIS_HABITER',
];
const ALL_PHASES_ORDERED = [...exports.PHASES_ETUDES, ...exports.PHASES_ABOUTISSEMENT];
let PhaseEngineService = class PhaseEngineService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    canAdvance(fromPhase, toPhase) {
        const fi = ALL_PHASES_ORDERED.indexOf(fromPhase);
        const ti = ALL_PHASES_ORDERED.indexOf(toPhase);
        return fi !== -1 && ti !== -1 && ti === fi + 1;
    }
    getNextPhase(phase) {
        const idx = ALL_PHASES_ORDERED.indexOf(phase);
        if (idx === -1 || idx === ALL_PHASES_ORDERED.length - 1)
            return null;
        return ALL_PHASES_ORDERED[idx + 1];
    }
    async getPhaseRecord(dossierId, phase) {
        return this.prisma.dossierPhaseRecord.findFirst({
            where: { dossierId, phase },
        });
    }
    async advancePhase(dossierId, fromPhase, toPhase, acteurId, note) {
        if (!this.canAdvance(fromPhase, toPhase)) {
            throw new common_1.BadRequestException(`Transition invalide : ${fromPhase} → ${toPhase}`);
        }
        const now = new Date();
        await this.prisma.dossierPhaseRecord.updateMany({
            where: { dossierId, phase: fromPhase },
            data: { statut: 'COMPLETE', dateFin: now },
        });
        const record = await this.prisma.dossierPhaseRecord.upsert({
            where: { dossierId_phase: { dossierId, phase: toPhase } },
            update: { statut: 'EN_COURS', dateDebut: now, note: note ?? null },
            create: { dossierId, phase: toPhase, statut: 'EN_COURS', dateDebut: now, note: note ?? null },
        });
        await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { phase: toPhase },
        });
        return record;
    }
    async getPhaseStatus(dossierId) {
        const records = await this.prisma.dossierPhaseRecord.findMany({
            where: { dossierId },
            orderBy: { createdAt: 'asc' },
        });
        const completed = records.filter(r => r.statut === 'COMPLETE').map(r => r.phase);
        const current = records.find(r => r.statut === 'EN_COURS')?.phase ?? null;
        const pending = ALL_PHASES_ORDERED.filter(p => !completed.includes(p) && p !== current);
        return { current, completed, pending, records };
    }
    // STUB Sprint 3 — ne pas implémenter maintenant
    async generateChantierPhases(nbNiveaux, nbSousSols) {
        // Sprint 3 : génère phases GO dynamiques
        // PHASE_10_FONDATIONS + SS phases + RDC + R+n + FIN_GO
        return ['PHASE_GO_FONDATIONS', 'PHASE_GO_PLANCHER', 'PHASE_GO_FIN'];
    }
};
exports.PhaseEngineService = PhaseEngineService;
exports.PhaseEngineService = PhaseEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], PhaseEngineService);
