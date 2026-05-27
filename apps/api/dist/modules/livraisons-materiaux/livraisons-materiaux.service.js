"use strict";
/**
 * apps/api/src/modules/livraisons-materiaux/livraisons-materiaux.service.ts
 *
 * Service Livraisons Matériaux (Tome 5).
 *
 * Doctrine:
 *  - Stockage MVP : JSON dans `Dossier.payload.livraisons` (array Commande).
 *  - Toutes les transitions critiques (réception, signature, anomalie) sont
 *    journalisées dans ProbativeLog (chaîne SHA-256 append-only).
 *  - Owner du dossier = chef chantier (création + réception).
 *  - Fournisseur = `supplierUserId` (confirme + marque en route).
 */
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
exports.LivraisonsMateriauxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
const types_1 = require("./types");
const TVA_RATE = 0.20;
let LivraisonsMateriauxService = class LivraisonsMateriauxService {
    prisma;
    probative;
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
    }
    // ─────────────────────────────────────────────────────────────
    // Read helpers
    // ─────────────────────────────────────────────────────────────
    async loadDossier(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { id: true, ownerId: true, payload: true },
        });
        if (!d)
            throw new common_1.NotFoundException(`Dossier ${dossierId} introuvable`);
        return d;
    }
    extractCommandes(payload) {
        const root = (payload && typeof payload === "object") ? payload : {};
        const livr = root.livraisons;
        if (Array.isArray(livr))
            return livr;
        return [];
    }
    async writeCommandes(dossierId, commandes) {
        const d = await this.loadDossier(dossierId);
        const payload = (d.payload && typeof d.payload === "object") ? { ...d.payload } : {};
        payload.livraisons = commandes;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
    }
    async listForDossier(dossierId) {
        const d = await this.loadDossier(dossierId);
        const items = this.extractCommandes(d.payload).sort((a, b) => (b.dateCreation || "").localeCompare(a.dateCreation || ""));
        return { items, total: items.length };
    }
    async getOne(dossierId, commandeId) {
        const d = await this.loadDossier(dossierId);
        const cmd = this.extractCommandes(d.payload).find((c) => c.id === commandeId);
        if (!cmd)
            throw new common_1.NotFoundException(`Commande ${commandeId} introuvable`);
        return cmd;
    }
    // ─────────────────────────────────────────────────────────────
    // Mutations
    // ─────────────────────────────────────────────────────────────
    async create(input, actor) {
        if (!input.lignes || input.lignes.length === 0) {
            throw new common_1.BadRequestException("Au moins une ligne requise");
        }
        const d = await this.loadDossier(input.dossierId);
        // Owner = chef chantier (le seul autorisé à créer côté MVP, plus ADMIN/OPS)
        if (d.ownerId !== actor.userId &&
            actor.role !== "ADMIN" &&
            actor.role !== "OWNER" &&
            actor.role !== "OPS") {
            throw new common_1.ForbiddenException("Création réservée au chef chantier");
        }
        const commandes = this.extractCommandes(d.payload);
        const lignes = input.lignes.map((l, i) => {
            const qty = Number(l.qty) || 0;
            const pu = Number(l.prixUnitaire) || 0;
            const total = round2(qty * pu);
            return {
                id: makeId(`lg_${i}`),
                materialCode: String(l.materialCode || "").slice(0, 80),
                materialLabel: l.materialLabel || l.materialCode,
                unit: l.unit || "U",
                qtyDemandee: qty,
                prixUnitaireMAD: pu,
                totalLigne: total,
            };
        });
        const totalCommande = round2(lignes.reduce((s, l) => s + l.totalLigne, 0));
        const tva20 = round2(totalCommande * TVA_RATE);
        const totalTtc = round2(totalCommande + tva20);
        const now = new Date().toISOString();
        const cmd = {
            id: makeId("cmd"),
            dossierId: input.dossierId,
            supplierUserId: input.supplierUserId,
            dateCreation: now,
            lignes,
            totalCommande,
            tva20,
            totalTtc,
            adresseLivraison: input.adresseLivraison,
            dateLivraisonSouhaitee: input.dateLivraisonSouhaitee,
            status: "REQUEST",
            receptionPhotos: [],
            qtyRecuesPart: {},
            anomalies: [],
            createdBy: actor.userId,
            audit: [
                { at: now, action: "COMMANDE_CREATED", actorId: actor.userId, actorRole: actor.role, details: { lignes: lignes.length, totalTtc } },
            ],
        };
        commandes.push(cmd);
        await this.writeCommandes(input.dossierId, commandes);
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-COMMANDE-001",
            action: "COMMANDE_CREATED",
            dossierId: input.dossierId,
            commandeId: cmd.id,
            supplierUserId: input.supplierUserId,
            totalTtc,
            actorId: actor.userId ?? null,
            at: now,
        });
        return cmd;
    }
    async confirmBySupplier(dossierId, commandeId, actor) {
        const cmd = await this.mutateOne(dossierId, commandeId, (c) => {
            this.assertSupplier(c, actor);
            if (c.status !== "REQUEST") {
                throw new common_1.BadRequestException(`Statut ${c.status} : confirmation impossible`);
            }
            const at = new Date().toISOString();
            c.status = "CONFIRMED";
            c.confirmedAt = at;
            c.audit.push({ at, action: "SUPPLIER_CONFIRMED", actorId: actor.userId, actorRole: actor.role });
            return c;
        });
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-CONFIRM-002",
            action: "SUPPLIER_CONFIRMED",
            dossierId,
            commandeId,
            actorId: actor.userId ?? null,
            at: cmd.confirmedAt,
        });
        return cmd;
    }
    async rejectBySupplier(dossierId, commandeId, motif, actor) {
        const cmd = await this.mutateOne(dossierId, commandeId, (c) => {
            this.assertSupplier(c, actor);
            if (c.status !== "REQUEST") {
                throw new common_1.BadRequestException(`Statut ${c.status} : rejet impossible`);
            }
            const at = new Date().toISOString();
            c.status = "CANCELLED";
            c.rejectedAt = at;
            c.rejectionMotif = String(motif || "").slice(0, 500);
            c.audit.push({ at, action: "SUPPLIER_REJECTED", actorId: actor.userId, actorRole: actor.role, details: { motif: c.rejectionMotif } });
            return c;
        });
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-REJECT-003",
            action: "SUPPLIER_REJECTED",
            dossierId,
            commandeId,
            motif: cmd.rejectionMotif,
            actorId: actor.userId ?? null,
            at: cmd.rejectedAt,
        });
        return cmd;
    }
    async markLivraisonPrete(dossierId, commandeId, actor) {
        const cmd = await this.mutateOne(dossierId, commandeId, (c) => {
            this.assertSupplier(c, actor);
            if (c.status !== "CONFIRMED") {
                throw new common_1.BadRequestException(`Statut ${c.status} : livraison non envoyable`);
            }
            const at = new Date().toISOString();
            c.status = "EN_ROUTE";
            c.enRouteAt = at;
            c.audit.push({ at, action: "SUPPLIER_LIVRAISON_PRETE", actorId: actor.userId, actorRole: actor.role });
            return c;
        });
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-EN-ROUTE-004",
            action: "SUPPLIER_LIVRAISON_PRETE",
            dossierId,
            commandeId,
            actorId: actor.userId ?? null,
            at: cmd.enRouteAt,
        });
        return cmd;
    }
    async receptionner(dossierId, commandeId, input, actor) {
        if (!input || !input.signatureDataUrl) {
            throw new common_1.BadRequestException("Signature requise pour réception");
        }
        if (!input.photos || input.photos.length === 0) {
            throw new common_1.BadRequestException("Au moins une photo requise");
        }
        const d = await this.loadDossier(dossierId);
        const isOwner = d.ownerId === actor.userId;
        const isAdmin = actor.role === "ADMIN" || actor.role === "OWNER" || actor.role === "OPS";
        if (!isOwner && !isAdmin) {
            throw new common_1.ForbiddenException("Réception réservée au chef chantier");
        }
        const cmd = await this.mutateOne(dossierId, commandeId, (c) => {
            if (c.status !== "EN_ROUTE" && c.status !== "CONFIRMED") {
                throw new common_1.BadRequestException(`Statut ${c.status} : réception impossible`);
            }
            const at = new Date().toISOString();
            c.receptionPhotos = [...(c.receptionPhotos || []), ...input.photos];
            c.signatureDataUrl = input.signatureDataUrl;
            c.qtyRecuesPart = { ...(c.qtyRecuesPart || {}), ...(input.qtyRecues || {}) };
            c.deliveredAt = at;
            c.receivedAt = at;
            const anomalies = (input.anomalies ?? []).map((a) => ({
                id: makeId("an"),
                ligneId: a.ligneId,
                type: a.type,
                description: String(a.description || "").slice(0, 1000),
                photos: a.photos || [],
                declaredAt: at,
                resolved: false,
            }));
            c.anomalies = [...(c.anomalies || []), ...anomalies];
            c.status = anomalies.length > 0 ? "DISPUTED" : "RECEIVED";
            c.audit.push({
                at,
                action: "RECEPTION_CHANTIER",
                actorId: actor.userId,
                actorRole: actor.role,
                details: { photos: input.photos.length, anomalies: anomalies.length },
            });
            // Jalon de paiement par défaut : J+30 si réception OK
            if (c.status === "RECEIVED" && !c.paiementJalon) {
                const due = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
                c.paiementJalon = { dueDate: due, paid: false };
            }
            return c;
        });
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-RECEPTION-005",
            action: "RECEPTION_CHANTIER",
            dossierId,
            commandeId,
            anomaliesCount: cmd.anomalies.length,
            photosCount: cmd.receptionPhotos.length,
            signatureHashPresent: !!cmd.signatureDataUrl,
            actorId: actor.userId ?? null,
            at: cmd.receivedAt,
        });
        return cmd;
    }
    async declareAnomalie(dossierId, commandeId, input, actor) {
        const cmd = await this.mutateOne(dossierId, commandeId, (c) => {
            const isOwnerOrAdmin = actor.role === "ADMIN" || actor.role === "OWNER" || actor.role === "OPS" ||
                (actor.userId && c.audit.some((a) => a.actorId === actor.userId));
            if (!isOwnerOrAdmin) {
                // Le chef chantier (owner du dossier) sera vérifié par la route via dossier owner check.
            }
            const at = new Date().toISOString();
            const an = {
                id: makeId("an"),
                ligneId: input.ligneId,
                type: input.type,
                description: String(input.description || "").slice(0, 1000),
                photos: input.photos || [],
                declaredAt: at,
                resolved: false,
            };
            c.anomalies = [...(c.anomalies || []), an];
            if (c.status === "RECEIVED")
                c.status = "DISPUTED";
            c.audit.push({ at, action: "ANOMALIE_DECLAREE", actorId: actor.userId, actorRole: actor.role, details: { type: input.type } });
            return c;
        });
        await this.probative.append({
            tome: "tome5",
            rule: "T5-LIV-ANOMALIE-006",
            action: "ANOMALIE_DECLAREE",
            dossierId,
            commandeId,
            anomalieType: input.type,
            actorId: actor.userId ?? null,
            at: new Date().toISOString(),
        });
        return cmd;
    }
    async calendarForWeek(dossierId, week) {
        const { items } = await this.listForDossier(dossierId);
        const upcoming = items.filter((c) => {
            if (!c.dateLivraisonSouhaitee)
                return false;
            try {
                const d = new Date(c.dateLivraisonSouhaitee);
                return (0, types_1.isoWeekKey)(d) === week;
            }
            catch {
                return false;
            }
        });
        return {
            week,
            items: upcoming.map((c) => ({
                commandeId: c.id,
                supplierUserId: c.supplierUserId,
                dateLivraisonSouhaitee: c.dateLivraisonSouhaitee,
                adresseLivraison: c.adresseLivraison,
                status: c.status,
                nbLignes: c.lignes.length,
                totalTtc: c.totalTtc,
            })),
        };
    }
    async getAuditTrail(dossierId, commandeId) {
        const cmd = await this.getOne(dossierId, commandeId);
        return {
            commandeId: cmd.id,
            status: cmd.status,
            timeline: cmd.audit,
            keyDates: {
                created: cmd.dateCreation,
                confirmed: cmd.confirmedAt,
                rejected: cmd.rejectedAt,
                enRoute: cmd.enRouteAt,
                delivered: cmd.deliveredAt,
                received: cmd.receivedAt,
            },
            anomalies: cmd.anomalies,
            paiementJalon: cmd.paiementJalon,
        };
    }
    // ─────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────
    async mutateOne(dossierId, commandeId, mut) {
        const d = await this.loadDossier(dossierId);
        const commandes = this.extractCommandes(d.payload);
        const idx = commandes.findIndex((c) => c.id === commandeId);
        if (idx < 0)
            throw new common_1.NotFoundException(`Commande ${commandeId} introuvable`);
        const next = mut({ ...commandes[idx], audit: [...(commandes[idx].audit || [])] });
        commandes[idx] = next;
        await this.writeCommandes(dossierId, commandes);
        return next;
    }
    assertSupplier(cmd, actor) {
        const isAdmin = actor.role === "ADMIN" || actor.role === "OWNER" || actor.role === "OPS";
        if (isAdmin)
            return;
        if (!actor.userId || cmd.supplierUserId !== actor.userId) {
            throw new common_1.ForbiddenException("Action réservée au fournisseur de la commande");
        }
    }
    // Utility kept public for downstream tests / dashboards
    static computeTotalStatuses(commandes) {
        const out = {
            REQUEST: 0, CONFIRMED: 0, EN_ROUTE: 0, RECEIVED: 0, CANCELLED: 0, DISPUTED: 0,
        };
        for (const c of commandes)
            out[c.status] = (out[c.status] || 0) + 1;
        return out;
    }
};
exports.LivraisonsMateriauxService = LivraisonsMateriauxService;
exports.LivraisonsMateriauxService = LivraisonsMateriauxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], LivraisonsMateriauxService);
function round2(n) {
    return Math.round(n * 100) / 100;
}
function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
