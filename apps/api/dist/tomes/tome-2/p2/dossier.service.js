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
exports.DossierService = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const owner_notify_service_1 = require("../../../modules/owner-notify/owner-notify.service");
const storage_service_1 = require("../../../modules/storage/storage.service");
const phase_engine_service_1 = require("../../../modules/phase-engine/phase-engine.service");
/**
 * P2 — Dossier service (v1)
 * Doctrine: minimal DB persistence + stable API contract, iterations later for schema hardening.
 */
let DossierService = class DossierService {
    prisma;
    ownerNotify;
    storage;
    phaseEngine;
    constructor(prisma, ownerNotify, storage, phaseEngine) {
        this.prisma = prisma;
        this.ownerNotify = ownerNotify;
        this.storage = storage;
        this.phaseEngine = phaseEngine;
    }
    async create(ownerId, input) {
        const title = String(input?.title || "").trim() || "Dossier";
        const payload = input?.payload ?? input ?? {};
        // S-FIRM-LINK — auto-propagate firmId from owner
        const owner = await this.prisma.user.findUnique({
            where: { id: ownerId },
            select: { firmId: true },
        });
        const result = await this.prisma.dossier.create({
            data: {
                ownerId,
                title,
                commune: input?.commune ?? null,
                address: input?.address ?? null,
                parcelRef: input?.parcelRef ?? null,
                payload,
                packSelected: input?.packSelected ?? null,
                packPriceMAD: input?.packPriceMAD != null ? Number(input.packPriceMAD) : null,
                projectType: input?.projectType ?? null,
                constructionLevel: input?.constructionLevel ?? null,
                caseId: input?.caseId ?? null,
                firmId: owner?.firmId ?? null,
            },
        });
        this.ownerNotify.notify('DOSSIER_CREATED', { title: result.title, commune: result.commune, packSelected: result.packSelected, dossierId: result.id }).catch(() => { });
        this.storage.ensureDossierStructure(result.id, result.refInterne ?? undefined).catch(() => { });
        return result;
    }
    async submit(ownerId, dossierId) {
        if (!dossierId)
            throw new common_1.BadRequestException("dossierId required");
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
        if (!d)
            throw new common_1.BadRequestException("dossier not found");
        if (d.ownerId !== ownerId)
            throw new common_1.ForbiddenException("not owner");
        if (d.status !== "DRAFT" && d.status !== "NEEDS_CHANGES") {
            throw new common_1.BadRequestException("dossier not submittable");
        }
        const updated = await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { status: "SUBMITTED", submittedAt: new Date() },
        });
        this.ownerNotify.notify('DOSSIER_SUBMITTED', { title: d.title, commune: d.commune }).catch(() => { });
        return updated;
    }
    async list(ownerId) {
        return this.prisma.dossier.findMany({
            where: { ownerId },
            orderBy: { updatedAt: "desc" },
            take: 50,
        });
    }
    async findAllForOps(firmId) {
        return this.prisma.dossier.findMany({
            where: firmId ? { firmId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { documents: true } },
                owner: { select: { email: true, username: true, phone: true, emailVerifiedAt: true, phoneVerifiedAt: true } },
                firm: { select: { slug: true, name: true } },
                rokhas: true,
                phaseRecords: { select: { phase: true, statut: true }, orderBy: { createdAt: 'asc' } },
            },
        });
    }
    async get(ownerId, dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            include: { areas: { orderBy: { computedAt: 'desc' } }, phaseRecords: { orderBy: { createdAt: 'asc' } } },
        });
        if (!d)
            throw new common_1.BadRequestException("dossier not found");
        if (d.ownerId !== ownerId)
            throw new common_1.ForbiddenException("not owner");
        return d;
    }
    async getForOps(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            include: {
                areas: { orderBy: { computedAt: 'desc' } },
                phaseRecords: { orderBy: { createdAt: 'asc' } },
                messages: { orderBy: { createdAt: 'asc' } },
                documents: true,
                owner: { select: { email: true, username: true, phone: true } },
                firm: { select: { slug: true, name: true } },
                rokhas: {
                    include: {
                        phases: { orderBy: { phaseNum: 'asc' } },
                        documents: { orderBy: { phaseNum: 'asc' } },
                    },
                },
            },
        });
        if (!d)
            throw new common_1.BadRequestException("dossier not found");
        return d;
    }
    async getPhaseDetail(dossierId, phase) {
        const record = await this.prisma.dossierPhaseRecord.findFirst({ where: { dossierId, phase } });
        const messages = await this.prisma.dossierMessage.findMany({ where: { dossierId, phaseRef: phase }, orderBy: { createdAt: 'asc' } });
        const documents = await this.prisma.dossierDocument.findMany({ where: { dossierId }, orderBy: { uploadedAt: 'desc' } });
        return { phase, statut: record?.statut ?? 'EN_ATTENTE', dateDebut: record?.dateDebut ?? null, dateFin: record?.dateFin ?? null, note: record?.note ?? null, acteurId: record?.acteurId ?? null, messages, documents };
    }
    async handlePhaseAction(dossierId, phase, action, acteurId, note) {
        if (action === 'BLOQUER') {
            return this.prisma.dossierPhaseRecord.updateMany({ where: { dossierId, phase }, data: { statut: 'BLOQUE', note: note ?? null } });
        }
        if (action === 'DEMARRER') {
            return this.prisma.dossierPhaseRecord.updateMany({ where: { dossierId, phase, statut: 'EN_ATTENTE' }, data: { statut: 'EN_COURS', dateDebut: new Date() } });
        }
        if (action === 'VALIDER') {
            const next = this.phaseEngine.getNextPhase(phase);
            if (!next)
                throw new common_1.BadRequestException('Aucune phase suivante');
            return this.phaseEngine.advancePhase(dossierId, phase, next, acteurId, note);
        }
        throw new common_1.BadRequestException(`Action inconnue : ${action}`);
    }
    async uploadDocument(dossierId, ownerId, docType, file) {
        await this.prisma.dossier.findUniqueOrThrow({ where: { id: dossierId } });
        const doc = await this.prisma.dossierDocument.create({
            data: {
                dossierId,
                docType,
                originalName: file.originalname,
                storedName: file.filename,
                mimeType: file.mimetype,
                sizeBytes: file.size,
            },
        });
        this.ownerNotify.notify('DOCUMENT_UPLOADED', { docType, originalName: file.originalname, dossierId }).catch(() => { });
        return { ok: true, document: doc };
    }
    async listDocuments(dossierId) {
        return this.prisma.dossierDocument.findMany({
            where: { dossierId },
            orderBy: { uploadedAt: 'desc' },
        });
    }
    async promote(dossierId, ownerId) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({ where: { id: dossierId } });
        if (dossier.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Accès refusé');
        // Idempotent — retourne le Project existant si déjà promu
        if (dossier.projectId) {
            return { ok: true, projectId: dossier.projectId, dossierId: dossier.id, alreadyPromoted: true };
        }
        const project = await this.prisma.project.create({
            data: { door: 1, state: 'E0', dossierId: dossier.id, ownerId },
        });
        this.ownerNotify.notify('DOSSIER_APPROVED', { title: dossier.title, projectId: project.id, dossierId }).catch(() => { });
        this.initProjectMilestones(project.id, ownerId).catch(() => { });
        await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { projectId: project.id },
        });
        return { ok: true, projectId: project.id, dossierId: dossier.id };
    }
    // Sprint S10 — Disclaimer acceptance
    async acceptDisclaimer(dossierId, requestingUserId, requestingUserRole) {
        const isPrivileged = ['OPS', 'OPERATOR', 'ADMIN', 'OWNER'].includes(requestingUserRole || '');
        const dossier = isPrivileged
            ? await this.prisma.dossier.findFirst({ where: { id: dossierId } })
            : await this.prisma.dossier.findFirst({ where: { id: dossierId, ownerId: requestingUserId } });
        if (!dossier)
            throw new common_1.NotFoundException('Dossier introuvable');
        return this.prisma.dossier.update({
            where: { id: dossierId },
            data: { disclaimerAcceptedAt: new Date() },
            select: { id: true, disclaimerAcceptedAt: true },
        });
    }
    // Sprint S11 — Paiements multi-modalités
    async createPayment(dossierId, data) {
        const VALID_MODES = ['STRIPE', 'WISE', 'CMI', 'CASH', 'CHEQUE'];
        if (!VALID_MODES.includes(data.mode)) {
            throw new Error(`Mode de paiement invalide: ${data.mode}`);
        }
        return this.prisma.payment.create({
            data: {
                dossierId,
                mode: data.mode,
                amount: data.amount,
                currency: data.currency || 'MAD',
                ref: data.ref,
                notes: data.notes,
                status: 'PENDING',
            },
        });
    }
    async confirmPayment(paymentId, confirmedBy) {
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy },
        });
    }
    async rejectPayment(paymentId, confirmedBy, notes) {
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'REJECTED',
                confirmedAt: new Date(),
                confirmedBy,
                ...(notes ? { notes } : {}),
            },
        });
    }
    async listPayments(dossierId) {
        return this.prisma.payment.findMany({
            where: { dossierId },
            orderBy: { createdAt: 'desc' },
        });
    }
    // S14 — Jalons projet
    async initProjectMilestones(projectId, triggeredBy) {
        const PHASES = [
            { phase: 'E7_ACTIVE', label: 'Projet actif' },
            { phase: 'E8_DESIGN', label: 'Études & conception' },
            { phase: 'E9_PERMIT', label: 'Autorisation de construire' },
            { phase: 'E10_CONSTRUCTION', label: 'Travaux' },
            { phase: 'E11_DELIVERY', label: 'Réception & livraison' },
            { phase: 'E12_CLOSED', label: 'Projet clôturé' },
        ];
        const existing = await this.prisma.projectMilestone.findMany({
            where: { projectId },
            select: { phase: true },
        });
        const existingPhases = new Set(existing.map((m) => m.phase));
        const toCreate = PHASES.filter(p => !existingPhases.has(p.phase));
        if (toCreate.length === 0)
            return this.prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
        await this.prisma.projectMilestone.createMany({
            data: toCreate.map(p => ({
                projectId,
                phase: p.phase,
                label: p.label,
                status: p.phase === 'E7_ACTIVE' ? 'IN_PROGRESS' : 'PENDING',
                startedAt: p.phase === 'E7_ACTIVE' ? new Date() : null,
                triggeredBy,
            })),
        });
        return this.prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
    }
    async advanceMilestone(projectId, phase, triggeredBy) {
        return this.prisma.projectMilestone.updateMany({
            where: { projectId, phase },
            data: { status: 'DONE', completedAt: new Date(), triggeredBy },
        });
    }
    async listMilestones(projectId) {
        return this.prisma.projectMilestone.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async advanceDossierPhase(dossierId, toPhase, acteurId, note) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({ where: { id: dossierId }, select: { phase: true } });
        const fromPhase = dossier.phase ?? 'PHASE_01_ESQUISSE';
        return this.phaseEngine.advancePhase(dossierId, fromPhase, toPhase, acteurId, note);
    }
};
exports.DossierService = DossierService;
exports.DossierService = DossierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService,
        owner_notify_service_1.OwnerNotifyService,
        storage_service_1.StorageService,
        phase_engine_service_1.PhaseEngineService])
], DossierService);
