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
var PvComplianceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvComplianceService = exports.PV_COMPLIANCE_KEY = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../../../modules/kernel/services/probative-log.service");
const notifications_hub_service_1 = require("../../../modules/notifications-hub/notifications-hub.service");
const pv_chantier_types_1 = require("./pv-chantier.types");
/**
 * PvComplianceService — doctrine T2-R-PV-CADENCE-001.
 *
 * Règle métier (exigée par la direction) :
 *   Tout chantier suivi sur CITURBAREA doit être documenté par au moins
 *   un procès-verbal de visite **tous les 15 jours**. Passé ce délai sans
 *   nouveau PV finalisé, le chantier est **bloqué** sur la plateforme
 *   (commandes matériaux + affectation sous-traitants suspendues) et le
 *   maître d'ouvrage ainsi que les prestataires sont alertés.
 *
 * Cinématique :
 *   - Cron quotidien 07:00 Africa/Casablanca : scanne les chantiers actifs,
 *     calcule l'ancienneté du dernier PV, applique l'état et notifie sur
 *     transition (rappel J-3, blocage J-15).
 *   - `onPvFinalized()` : appelé par PvChantierService.finalize — recalcule,
 *     débloque le chantier et notifie la reprise.
 *   - `assertNotBlocked()` : utilisé par les modules chantier pour refuser
 *     les mutations quand le dossier est bloqué.
 *
 * État persisté dans `Dossier.payload.pvCompliance`.
 */
exports.PV_COMPLIANCE_KEY = "pvCompliance";
const INTERVAL_DAYS = 15;
const WARNING_LEAD_DAYS = 3; // rappel à J-12 (3 jours avant le blocage)
const DAY_MS = 86_400_000;
const SCAN_LIMIT = 1000;
let PvComplianceService = PvComplianceService_1 = class PvComplianceService {
    prisma;
    probative;
    hub;
    log = new common_1.Logger(PvComplianceService_1.name);
    constructor(prisma, probative, hub) {
        this.prisma = prisma;
        this.probative = probative;
        this.hub = hub;
    }
    // ── Cron quotidien ──────────────────────────────────────────────
    async dailyScan() {
        const dossiers = (await this.prisma.dossier.findMany({
            orderBy: { updatedAt: "desc" },
            take: SCAN_LIMIT,
            select: {
                id: true,
                ownerId: true,
                refInterne: true,
                title: true,
                payload: true,
                rokhas: { select: { statut: true, dateArrete: true, dateDepot: true } },
            },
        }));
        let active = 0;
        let blocked = 0;
        for (const d of dossiers) {
            try {
                const state = await this.refreshAndNotify(d);
                if (state.active)
                    active += 1;
                if (state.blocked)
                    blocked += 1;
            }
            catch (e) {
                this.log.warn(`[PvCompliance] dossier=${d.id} eval failed: ${e?.message}`);
            }
        }
        this.log.log(`[PvCompliance] scan: ${dossiers.length} dossiers, ${active} chantiers actifs, ${blocked} bloqués`);
        return { scanned: dossiers.length, active, blocked };
    }
    /** Déclenchement manuel (admin). */
    async runScanNow() {
        return this.dailyScan();
    }
    // ── Lecture (UI / overview) ─────────────────────────────────────
    async getStatus(dossierId) {
        const d = await this.loadBundle(dossierId);
        const state = this.compute(d);
        await this.persist(d.id, d.payload, state); // refresh silencieux (pas de notif)
        return state;
    }
    // ── Hook : appelé après finalisation d'un PV ────────────────────
    async onPvFinalized(dossierId) {
        try {
            const d = await this.loadBundle(dossierId);
            await this.refreshAndNotify(d);
        }
        catch (e) {
            this.log.warn(`[PvCompliance] onPvFinalized ${dossierId} failed: ${e?.message}`);
        }
    }
    // ── Enforcement : refus de mutation si chantier bloqué ──────────
    /**
     * Lève une ForbiddenException si le dossier est bloqué faute de PV.
     * Lecture du flag persisté (rafraîchi par le cron + onPvFinalized).
     */
    static assertPayloadNotBlocked(payload) {
        const st = payload?.[exports.PV_COMPLIANCE_KEY];
        if (st && st.blocked === true) {
            throw new common_1.ForbiddenException("Chantier bloqué : aucun PV de visite depuis plus de 15 jours. " +
                "Déposez un nouveau PV de chantier pour reprendre les opérations.");
        }
    }
    async assertNotBlocked(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true },
        });
        PvComplianceService_1.assertPayloadNotBlocked(d?.payload);
    }
    // ── Cœur : compute / persist / notify ───────────────────────────
    async refreshAndNotify(d) {
        const prev = d.payload?.[exports.PV_COMPLIANCE_KEY] ?? null;
        const state = this.compute(d);
        await this.persist(d.id, d.payload, state);
        if (!state.active)
            return state;
        // Notifier uniquement sur transition d'état (anti-spam).
        const prevStatus = prev?.status ?? "OK";
        if (state.status === prevStatus)
            return state;
        if (state.status === "WARNING") {
            await this.notify(d, "PV_CADENCE_RAPPEL", state);
        }
        else if (state.status === "BLOCKED") {
            await this.notify(d, "CHANTIER_BLOQUE_PV", state);
            await this.appendLog(d, "CHANTIER_BLOQUE_PV", state);
        }
        else if (state.status === "OK" && prevStatus === "BLOCKED") {
            await this.notify(d, "CHANTIER_DEBLOQUE_PV", state);
            await this.appendLog(d, "CHANTIER_DEBLOQUE_PV", state);
        }
        // Mémorise la dernière notif envoyée.
        state.lastNotifiedStatus = state.status;
        state.lastNotifiedAt = new Date().toISOString();
        await this.persist(d.id, d.payload, state);
        return state;
    }
    compute(d) {
        const payload = d.payload && typeof d.payload === "object" ? d.payload : {};
        const prev = payload[exports.PV_COMPLIANCE_KEY] ?? null;
        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        const active = this.isActiveChantier(d, payload);
        // Ancre du compteur : début de chantier (stable d'une exécution à l'autre).
        const rokhasArrete = d.rokhas?.dateArrete
            ? new Date(d.rokhas.dateArrete).toISOString()
            : null;
        const chantierStartAt = payload.chantierDemarrageAt ||
            payload.chantierStartAt ||
            rokhasArrete ||
            prev?.chantierStartAt ||
            nowIso;
        // Dernier PV finalisé (un brouillon ne compte pas comme documentation).
        const pvBag = Array.isArray(payload[pv_chantier_types_1.PV_PAYLOAD_KEY])
            ? payload[pv_chantier_types_1.PV_PAYLOAD_KEY]
            : [];
        const finalized = pvBag
            .filter((p) => p.status === "FINAL")
            .map((p) => ({ id: p.id, when: p.finalizedAt || p.date || p.createdAt || "" }))
            .filter((p) => !!p.when)
            .sort((a, b) => b.when.localeCompare(a.when));
        const lastPv = finalized[0] ?? null;
        const lastPvDate = lastPv?.when ?? null;
        const lastPvId = lastPv?.id ?? null;
        const referenceMs = new Date(lastPvDate || chantierStartAt).getTime();
        const daysSinceLastPv = Math.max(0, Math.floor((now - referenceMs) / DAY_MS));
        const dueMs = referenceMs + INTERVAL_DAYS * DAY_MS;
        const nextPvDueDate = new Date(dueMs).toISOString();
        const daysUntilDue = Math.ceil((dueMs - now) / DAY_MS);
        let status = "OK";
        if (active) {
            if (daysSinceLastPv >= INTERVAL_DAYS)
                status = "BLOCKED";
            else if (daysUntilDue <= WARNING_LEAD_DAYS)
                status = "WARNING";
        }
        const blocked = active && status === "BLOCKED";
        return {
            active,
            status,
            blocked,
            intervalDays: INTERVAL_DAYS,
            chantierStartAt,
            lastPvDate,
            lastPvId,
            nextPvDueDate,
            daysSinceLastPv,
            daysUntilDue,
            blockedSince: blocked ? prev?.blockedSince || nowIso : null,
            lastEvaluatedAt: nowIso,
            lastNotifiedStatus: prev?.lastNotifiedStatus ?? null,
            lastNotifiedAt: prev?.lastNotifiedAt ?? null,
        };
    }
    /**
     * Un dossier est un "chantier actif" pour la cadence PV s'il a démarré
     * (permis obtenu / démarrage déclaré / au moins un PV ou sous-traitant)
     * et n'est pas encore réceptionné.
     */
    isActiveChantier(d, payload) {
        const rokhasStatut = d.rokhas?.statut ?? null;
        const permitDone = rokhasStatut === "FAVORABLE" ||
            rokhasStatut === "PERMIS_DELIVRE" ||
            Boolean(d.rokhas?.dateArrete);
        const hasStartSignal = Boolean(payload.chantierDemarrageAt) ||
            Boolean(payload.chantierStartAt) ||
            permitDone ||
            (Array.isArray(payload[pv_chantier_types_1.PV_PAYLOAD_KEY]) && payload[pv_chantier_types_1.PV_PAYLOAD_KEY].length > 0) ||
            (Array.isArray(payload.sousTraitants) && payload.sousTraitants.length > 0);
        const receptionDone = Boolean(payload.receptionProvisoireAt) ||
            Boolean(payload.receptionDefinitiveAt) ||
            Boolean(payload.permisHabiter?.deliveredAt);
        return hasStartSignal && !receptionDone;
    }
    async persist(dossierId, currentPayload, state) {
        const payload = currentPayload && typeof currentPayload === "object" ? { ...currentPayload } : {};
        payload[exports.PV_COMPLIANCE_KEY] = state;
        // garde le payload en mémoire à jour pour les appels chaînés
        currentPayload[exports.PV_COMPLIANCE_KEY] = state;
        await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { payload: payload },
        });
    }
    // ── Notifications owner + prestataires ──────────────────────────
    async notify(d, eventType, state) {
        const ref = d.refInterne || d.title || d.id.slice(0, 8);
        const payloadCtx = {
            dossierId: d.id,
            ref,
            daysLeft: Math.max(0, state.daysUntilDue),
            dueDate: this.fmt(state.nextPvDueDate),
            lastPvDate: state.lastPvDate ? this.fmt(state.lastPvDate) : "—",
        };
        const urgency = eventType === "CHANTIER_BLOQUE_PV" ? "URGENT" : "HIGH";
        const recipients = new Set();
        if (d.ownerId)
            recipients.add(d.ownerId);
        for (const uid of this.prestataireUserIds(d.payload))
            recipients.add(uid);
        for (const userId of recipients) {
            try {
                await this.hub.dispatch({ eventType, userId, payload: payloadCtx, urgency: urgency });
            }
            catch (e) {
                this.log.warn(`[PvCompliance] notify ${eventType}→${userId} failed: ${e?.message}`);
            }
        }
    }
    prestataireUserIds(payload) {
        const out = new Set();
        const sts = Array.isArray(payload?.sousTraitants) ? payload.sousTraitants : [];
        for (const st of sts) {
            if (st?.status !== "TERMINATED" && typeof st?.supplierUserId === "string" && st.supplierUserId) {
                out.add(st.supplierUserId);
            }
        }
        return Array.from(out);
    }
    async appendLog(d, kind, state) {
        try {
            await this.probative.append({
                kind,
                tome: "tome2",
                rule_id: "T2-R-PV-CADENCE-001",
                dossierId: d.id,
                lastPvDate: state.lastPvDate,
                daysSinceLastPv: state.daysSinceLastPv,
                at: new Date().toISOString(),
            });
        }
        catch (e) {
            this.log.warn(`[PvCompliance] probative append failed: ${e?.message}`);
        }
    }
    // ── Helpers ─────────────────────────────────────────────────────
    async loadBundle(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: {
                id: true,
                ownerId: true,
                refInterne: true,
                title: true,
                payload: true,
                rokhas: { select: { statut: true, dateArrete: true, dateDepot: true } },
            },
        });
        if (!d)
            throw new common_1.ForbiddenException("Dossier introuvable");
        return d;
    }
    fmt(iso) {
        if (!iso)
            return "—";
        try {
            return new Date(iso).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        }
        catch {
            return iso;
        }
    }
};
exports.PvComplianceService = PvComplianceService;
__decorate([
    (0, schedule_1.Cron)("0 7 * * *", { timeZone: "Africa/Casablanca" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PvComplianceService.prototype, "dailyScan", null);
exports.PvComplianceService = PvComplianceService = PvComplianceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService,
        notifications_hub_service_1.NotificationsHubService])
], PvComplianceService);
