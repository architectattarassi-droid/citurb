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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RokhasTrackerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RokhasTrackerService = void 0;
/**
 * Rokhas Tracker — Service
 *
 * Source de vérité pour l'instance Rokhas d'un dossier.
 *
 * Persistance MVP : `Dossier.payload.rokhasTracker: RokhasInstance`.
 * Une migration Prisma dédiée (cf. INTEGRATION.md) peut être plug-in
 * plus tard : seuls `_load` / `_save` changent.
 *
 * Audit : chaque mutation passe par `ProbativeLogService.append`.
 */
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
const rokhas_delays_1 = require("./rokhas-delays");
const ALL_EVENT_TYPES = [
    "DEPOT", "ACCUSE", "COMMISSION", "AVIS_AU", "AVIS_SERVICES",
    "VOTE", "DECISION", "RESERVE_AJOUTE", "RESERVE_LEVEE", "DELIVRANCE",
];
/** Étapes "principales" de la timeline pour calcul du progressPct. */
const TIMELINE_MILESTONES = [
    "DEPOT", "ACCUSE", "COMMISSION", "VOTE", "DECISION", "DELIVRANCE",
];
let RokhasTrackerService = RokhasTrackerService_1 = class RokhasTrackerService {
    prisma;
    probative;
    logger = new common_1.Logger(RokhasTrackerService_1.name);
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
    }
    // ── DÉPÔT ─────────────────────────────────────────────────────────────────
    async registerDepot(opts) {
        const { dossierId, projectCategory, refRokhasCommune, actorId } = opts;
        if (![1, 2, 3].includes(projectCategory)) {
            throw new common_1.BadRequestException("projectCategory doit être 1, 2 ou 3");
        }
        const depositDate = this._ensureIso(opts.depositDate) || new Date().toISOString();
        const existing = await this._load(dossierId);
        if (existing && existing.events.some((e) => e.type === "DEPOT")) {
            // Idempotent : on retourne l'instance existante.
            return this._hydrate(existing);
        }
        const inst = existing ?? this._emptyInstance(dossierId, depositDate, projectCategory);
        inst.projectCategory = projectCategory;
        inst.depositDate = depositDate;
        inst.refRokhasCommune = refRokhasCommune ?? inst.refRokhasCommune ?? null;
        inst.events = [
            ...inst.events,
            this._newEvent("DEPOT", depositDate, { projectCategory, refRokhasCommune }, actorId),
        ];
        inst.updatedAt = new Date().toISOString();
        await this._save(dossierId, inst);
        await this._logEvent("DEPOT", dossierId, { projectCategory, refRokhasCommune }, actorId);
        return this._hydrate(inst);
    }
    // ── ÉVÉNEMENT GÉNÉRIQUE ───────────────────────────────────────────────────
    async addEvent(opts) {
        const { dossierId, type, payload, actorId } = opts;
        if (!ALL_EVENT_TYPES.includes(type))
            throw new common_1.BadRequestException(`type d'événement inconnu: ${type}`);
        const date = this._ensureIso(opts.date) || new Date().toISOString();
        const inst = await this._loadOrThrow(dossierId);
        // Traitement spécial pour certains types
        if (type === "DECISION") {
            this._applyDecisionEvent(inst, date, payload || {});
        }
        else if (type === "DELIVRANCE") {
            inst.delivranceDate = date;
            if (payload?.attestationPdfUrl && typeof payload.attestationPdfUrl === "string") {
                inst.attestationPdfUrl = payload.attestationPdfUrl;
            }
        }
        else if (type === "RESERVE_AJOUTE") {
            this._addReserveFromPayload(inst, payload || {}, date);
        }
        inst.events.push(this._newEvent(type, date, payload, actorId));
        inst.updatedAt = new Date().toISOString();
        await this._save(dossierId, inst);
        await this._logEvent(type, dossierId, payload, actorId);
        return this._hydrate(inst);
    }
    // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────
    async leverReserve(opts) {
        const { dossierId, reserveId, preuveDocId, actorId } = opts;
        if (!preuveDocId || typeof preuveDocId !== "string") {
            throw new common_1.BadRequestException("preuveDocId requis");
        }
        const inst = await this._loadOrThrow(dossierId);
        const reserve = inst.reserves.find((r) => r.id === reserveId);
        if (!reserve)
            throw new common_1.NotFoundException("Réserve inconnue");
        if (reserve.status === "LEVEE")
            return this._hydrate(inst); // idempotent
        if (reserve.status === "FORCLOSE") {
            throw new common_1.BadRequestException("Réserve forclose — délai légal dépassé");
        }
        reserve.status = "LEVEE";
        reserve.preuveDocId = preuveDocId;
        reserve.preuveUrl = opts.preuveUrl ?? reserve.preuveUrl ?? null;
        reserve.leveeAt = new Date().toISOString();
        reserve.leveeBy = actorId;
        inst.events.push(this._newEvent("RESERVE_LEVEE", reserve.leveeAt, { reserveId, preuveDocId }, actorId));
        inst.updatedAt = reserve.leveeAt;
        await this._save(dossierId, inst);
        await this._logEvent("RESERVE_LEVEE", dossierId, { reserveId, preuveDocId }, actorId);
        return this._hydrate(inst);
    }
    // ── READ ──────────────────────────────────────────────────────────────────
    async getInstance(dossierId) {
        const inst = await this._load(dossierId);
        return inst ? this._hydrate(inst) : null;
    }
    async listDeadlines(dossierId) {
        const inst = await this._load(dossierId);
        if (!inst)
            return [];
        return this._computeDeadlines(inst);
    }
    // ── WEBHOOK (ingestion externe future) ────────────────────────────────────
    async ingestFromWebhook(payload) {
        if (!payload?.dossierId || !payload?.type) {
            throw new common_1.BadRequestException("dossierId + type requis");
        }
        // S'assure qu'une instance existe (auto-création légère si premier événement = DEPOT)
        const existing = await this._load(payload.dossierId);
        if (!existing && payload.type !== "DEPOT") {
            throw new common_1.NotFoundException("Aucune instance Rokhas — DEPOT requis en premier");
        }
        if (payload.type === "DEPOT") {
            return this.registerDepot({
                dossierId: payload.dossierId,
                projectCategory: payload.extra?.projectCategory ?? 1,
                depositDate: payload.date,
                refRokhasCommune: payload.refRokhasCommune ?? null,
                actorId: "system:webhook:rokhas",
            });
        }
        return this.addEvent({
            dossierId: payload.dossierId,
            type: payload.type,
            date: payload.date,
            payload: { ...(payload.extra || {}), decision: payload.decision },
            actorId: "system:webhook:rokhas",
        });
    }
    // ── INTERNALS ─────────────────────────────────────────────────────────────
    _emptyInstance(dossierId, depositDate, cat) {
        return {
            dossierId,
            projectCategory: cat,
            depositDate,
            refRokhasCommune: null,
            events: [],
            decision: null,
            reserves: [],
            delivranceDate: null,
            attestationPdfUrl: null,
            updatedAt: new Date().toISOString(),
        };
    }
    _newEvent(type, date, payload, by) {
        return {
            id: `evt_${(0, crypto_1.randomUUID)().replace(/-/g, "").slice(0, 12)}`,
            type,
            date,
            createdAt: new Date().toISOString(),
            payload,
            by,
        };
    }
    _applyDecisionEvent(inst, date, payload) {
        const type = payload.decision?.type ?? payload.type;
        if (!type)
            throw new common_1.BadRequestException("payload.decision.type requis pour événement DECISION");
        if (!["FAVORABLE", "FAVORABLE_AVEC_RESERVES", "DEFAVORABLE", "AJOURNE"].includes(type)) {
            throw new common_1.BadRequestException(`type de décision invalide: ${type}`);
        }
        inst.decision = {
            type,
            date,
            motifsRefus: payload.decision?.motifsRefus ?? payload.motifsRefus ?? [],
            pvId: payload.decision?.pvId ?? payload.pvId,
        };
        // Si FAVORABLE_AVEC_RESERVES + reserves dans payload → matérialise
        const incoming = Array.isArray(payload.reserves) ? payload.reserves : [];
        if (incoming.length) {
            for (const r of incoming)
                this._addReserveFromPayload(inst, r, date);
        }
    }
    _addReserveFromPayload(inst, raw, decisionDate) {
        const titre = String(raw.titre || raw.title || "").trim();
        if (!titre)
            return;
        const sev = ["INFO", "AVIS", "RESERVE", "BLOQUANT"].includes(raw.severite)
            ? raw.severite
            : "RESERVE";
        const deadlineLevee = this._ensureIso(raw.deadlineLevee) ||
            (decisionDate ? (0, rokhas_delays_1.computeReserveLeveeDeadline)(decisionDate) : null);
        inst.reserves.push({
            id: `res_${(0, crypto_1.randomUUID)().replace(/-/g, "").slice(0, 12)}`,
            titre,
            description: String(raw.description || ""),
            articleLoi: raw.articleLoi || null,
            severite: sev,
            deadlineLevee,
            status: "OUVERTE",
            preuveDocId: null,
            preuveUrl: null,
            leveeAt: null,
            leveeBy: null,
        });
    }
    _hydrate(inst) {
        // 1) bascule FORCLOSE pour les réserves dont le délai est passé
        const reserves = inst.reserves.map((r) => {
            const jr = (0, rokhas_delays_1.joursRestants)(r.deadlineLevee);
            const status = r.status === "LEVEE" ? "LEVEE" :
                r.status === "FORCLOSE" ? "FORCLOSE" :
                    (jr !== null && jr < 0) ? "FORCLOSE" :
                        r.status;
            return { ...r, status, joursRestants: jr };
        });
        const hydrated = { ...inst, reserves };
        // 2) deadlines + decision deadline
        const deadlines = this._computeDeadlines(hydrated);
        const decisionDeadlineIso = inst.decision ? null : (0, rokhas_delays_1.computeDecisionDeadline)(inst.depositDate, inst.projectCategory);
        const decisionJr = decisionDeadlineIso ? (0, rokhas_delays_1.joursRestants)(decisionDeadlineIso) ?? 0 : null;
        const decisionDeadline = decisionDeadlineIso && decisionJr !== null
            ? { deadline: decisionDeadlineIso, joursRestants: decisionJr, severity: (0, rokhas_delays_1.severityFromJours)(decisionJr) }
            : null;
        // 3) progress pct (milestones franchis vs total)
        const reached = new Set(hydrated.events.map((e) => e.type));
        const total = TIMELINE_MILESTONES.length;
        const done = TIMELINE_MILESTONES.filter((m) => reached.has(m)).length;
        const progressPct = Math.round((done / total) * 100);
        return { ...hydrated, deadlines, decisionDeadline, progressPct };
    }
    _computeDeadlines(inst) {
        const out = [];
        // Décision légale (si non décidée)
        if (!inst.decision) {
            const dl = (0, rokhas_delays_1.computeDecisionDeadline)(inst.depositDate, inst.projectCategory);
            const jr = (0, rokhas_delays_1.joursRestants)(dl) ?? 0;
            out.push({
                type: "DECISION_LEGALE",
                label: `Décision attendue (catégorie ${inst.projectCategory})`,
                deadline: dl,
                joursRestants: jr,
                severity: (0, rokhas_delays_1.severityFromJours)(jr),
            });
        }
        // Réserves ouvertes
        for (const r of inst.reserves) {
            if (r.status === "LEVEE" || r.status === "FORCLOSE")
                continue;
            const jr = (0, rokhas_delays_1.joursRestants)(r.deadlineLevee);
            if (!r.deadlineLevee)
                continue;
            out.push({
                type: "RESERVE_LEVEE",
                label: `Lever réserve : ${r.titre}`.slice(0, 120),
                deadline: r.deadlineLevee,
                joursRestants: jr,
                severity: (0, rokhas_delays_1.severityFromJours)(jr),
                reserveId: r.id,
            });
        }
        // Relance ajourné
        if (inst.decision?.type === "AJOURNE") {
            const dl = (0, rokhas_delays_1.computeRelanceAjourneDeadline)(inst.decision.date);
            const jr = (0, rokhas_delays_1.joursRestants)(dl) ?? 0;
            out.push({
                type: "RELANCE_AJOURNE",
                label: "Relance automatique (ajournement)",
                deadline: dl,
                joursRestants: jr,
                severity: (0, rokhas_delays_1.severityFromJours)(jr),
            });
        }
        return out.sort((a, b) => (a.joursRestants ?? Infinity) - (b.joursRestants ?? Infinity));
    }
    _ensureIso(value) {
        if (!value)
            return null;
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime()))
            return null;
        return d.toISOString();
    }
    async _logEvent(type, dossierId, payload, actorId) {
        try {
            await this.probative?.append({
                type: "ROKHAS_TRACKER_EVENT",
                eventType: type,
                dossierId,
                actorId,
                payload,
                ts: new Date().toISOString(),
            });
        }
        catch (e) {
            this.logger.warn(`[ProbativeLog] failed: ${e?.message}`);
        }
    }
    // ── Persistance (MVP — payload Dossier) ───────────────────────────────────
    async _load(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true },
        });
        if (!d)
            return null;
        const raw = d.payload?.rokhasTracker;
        if (!raw)
            return null;
        return this._normalize(raw, dossierId);
    }
    async _loadOrThrow(dossierId) {
        const inst = await this._load(dossierId);
        if (!inst)
            throw new common_1.NotFoundException("Aucune instance Rokhas pour ce dossier (DEPOT requis)");
        return inst;
    }
    async _save(dossierId, inst) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true },
        });
        if (!d)
            throw new common_1.NotFoundException("Dossier inconnu");
        const cur = d.payload || {};
        await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { payload: { ...cur, rokhasTracker: inst } },
        });
    }
    /** Reconstruit un objet sain (compat anciennes versions / champs manquants). */
    _normalize(raw, dossierId) {
        return {
            dossierId: raw.dossierId || dossierId,
            projectCategory: ([1, 2, 3].includes(Number(raw.projectCategory)) ? Number(raw.projectCategory) : 1),
            depositDate: raw.depositDate || new Date().toISOString(),
            refRokhasCommune: raw.refRokhasCommune ?? null,
            events: Array.isArray(raw.events) ? raw.events : [],
            decision: raw.decision ?? null,
            reserves: Array.isArray(raw.reserves) ? raw.reserves : [],
            delivranceDate: raw.delivranceDate ?? null,
            attestationPdfUrl: raw.attestationPdfUrl ?? null,
            updatedAt: raw.updatedAt || new Date().toISOString(),
        };
    }
};
exports.RokhasTrackerService = RokhasTrackerService;
exports.RokhasTrackerService = RokhasTrackerService = RokhasTrackerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], RokhasTrackerService);
