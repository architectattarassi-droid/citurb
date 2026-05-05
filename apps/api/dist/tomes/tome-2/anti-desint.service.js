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
var AntiDesintService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiDesintService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
const incidents_service_1 = require("../../modules/kernel/services/incidents.service");
const owner_notify_service_1 = require("../../modules/owner-notify/owner-notify.service");
const PATTERNS = [
    // Emails
    { regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, type: "EMAIL", severity: "HIGH" },
    // Phones Maroc (large match: +212, 06, 07, 05, 0X, espacés ou pas)
    { regex: /(\+?\s*2\s*1\s*2\s*[5-7]\s*\d(?:\s*\d){7,8}|0\s*[5-7]\s*\d(?:[\s.\-]*\d){7,8})/g, type: "PHONE", severity: "HIGH" },
    // URLs
    { regex: /\b(?:https?:\/\/|www\.)[^\s]+/gi, type: "URL", severity: "MEDIUM" },
    // WhatsApp / Telegram / Signal
    { regex: /\b(whats?app|telegram|signal\s+app|wa\.me)\b/gi, type: "WHATSAPP", severity: "HIGH" },
    // Plateformes externes
    { regex: /\b(facebook|instagram|linkedin|gmail|hotmail|yahoo|outlook)\b/gi, type: "EXTERNAL_PLATFORM", severity: "MEDIUM" },
    // Paiement direct
    { regex: /\b(espèces|cash|virement\s+direct|sans\s+facture|hors\s+plateforme|au\s+noir)\b/gi, type: "DIRECT_PAYMENT", severity: "HIGH" },
    // RDV physiques sans cadre
    { regex: /\b(rendez-vous\s+chez|passe\s+au?\s+bureau|viens?\s+(à|chez|au)|on\s+se\s+voit\s+où)\b/gi, type: "PHYSICAL_MEETING", severity: "LOW" },
    // Tentatives explicites de contournement
    { regex: /\b(contourner|hors\s+plateforme|sans\s+passer\s+par|en\s+direct\s+entre\s+nous)\b/gi, type: "EXTERNAL_PLATFORM", severity: "HIGH" },
];
const FLAG_THRESHOLD_CRITICAL = 3; // si ≥3 flags HIGH en 7j → notif owner CRITICAL
let AntiDesintService = AntiDesintService_1 = class AntiDesintService {
    prisma;
    incidents;
    ownerNotify;
    logger = new common_1.Logger(AntiDesintService_1.name);
    constructor(prisma, incidents, ownerNotify) {
        this.prisma = prisma;
        this.incidents = incidents;
        this.ownerNotify = ownerNotify;
    }
    /**
     * Cron job nocturne — 02h00 heure Maroc.
     */
    async runNightly() {
        this.logger.log("[AntiDesint] Démarrage scan nocturne…");
        const since = new Date(Date.now() - 24 * 3600 * 1000);
        const stats = await this.scanSince(since);
        this.logger.log(`[AntiDesint] Scan terminé. ${stats.messagesScanned} messages, ${stats.flagsCreated} flags, ${stats.dossiersAffected} dossiers, ${stats.criticalCases} alertes critiques.`);
        if (stats.criticalCases > 0) {
            await this.ownerNotify.notify("DOCUMENT_UPLOADED", {
                docType: "ANTI_DESINT_REPORT",
                originalName: `${stats.criticalCases} dossier(s) avec ≥${FLAG_THRESHOLD_CRITICAL} signalements HIGH sur 7j`,
                dossierId: "—",
            });
        }
        return stats;
    }
    /**
     * Endpoint utilisable manuellement (admin scan ad-hoc).
     */
    async scanSince(since) {
        let messagesScanned = 0;
        let flagsCreated = 0;
        const dossiersTouched = new Set();
        let criticalCases = 0;
        const messages = await this.prisma.dossierMessage.findMany({
            where: { createdAt: { gte: since }, type: "TEXT" },
            select: { id: true, dossierId: true, expediteurId: true, expediteurRole: true, contenu: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        });
        for (const msg of messages) {
            messagesScanned++;
            if (!msg.contenu)
                continue;
            const detections = this.detect(msg.contenu);
            if (detections.length === 0)
                continue;
            const flags = [];
            for (const det of detections) {
                const incidentResult = await this.incidents.createFromDoctrinePointer({
                    rule_id: "T2-R-ANTI-DESINT-001",
                    error_code: `ERR-T2-DESINT-${det.type}`,
                    category: "DISINTERMEDIATION_RISK",
                    severity: det.severity === "HIGH" ? "WARN" : "INFO",
                    projectId: msg.dossierId,
                    actorId: msg.expediteurId,
                    actorType: msg.expediteurRole === "CLIENT" ? "CLIENT" : "OPERATOR",
                    door: 2,
                    metadata: {
                        messageId: msg.id,
                        patternType: det.type,
                        evidence: det.evidence,
                        createdAt: msg.createdAt.toISOString(),
                    },
                });
                flags.push({
                    ts: new Date().toISOString(),
                    messageId: msg.id,
                    expediteurId: msg.expediteurId,
                    expediteurRole: msg.expediteurRole,
                    type: det.type,
                    evidence: det.evidence.slice(0, 200),
                    severity: det.severity,
                    incidentId: incidentResult.incidentId,
                });
                flagsCreated++;
            }
            // Append au payload du dossier
            await this.appendFlagsToDossier(msg.dossierId, flags);
            dossiersTouched.add(msg.dossierId);
        }
        // Identifier dossiers critiques (≥ FLAG_THRESHOLD_CRITICAL flags HIGH sur 7j)
        for (const dossierId of dossiersTouched) {
            const isCritical = await this.checkCriticalThreshold(dossierId);
            if (isCritical)
                criticalCases++;
        }
        return {
            since: since.toISOString(),
            until: new Date().toISOString(),
            messagesScanned,
            flagsCreated,
            dossiersAffected: dossiersTouched.size,
            criticalCases,
        };
    }
    /**
     * Détecte tous les patterns suspects dans un message.
     */
    detect(content) {
        const out = [];
        for (const p of PATTERNS) {
            const matches = content.match(p.regex);
            if (matches && matches.length > 0) {
                // Garder le premier match comme evidence (redacté à 200 chars en stockage)
                out.push({ type: p.type, severity: p.severity, evidence: matches[0] });
            }
        }
        return out;
    }
    async appendFlagsToDossier(dossierId, flags) {
        try {
            const dossier = await this.prisma.dossier.findUnique({
                where: { id: dossierId },
                select: { payload: true },
            });
            if (!dossier)
                return;
            const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
            const existing = Array.isArray(payload.antiDesintFlags) ? payload.antiDesintFlags : [];
            payload.antiDesintFlags = [...existing, ...flags].slice(-200); // capper à 200 derniers flags
            await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        }
        catch (e) {
            this.logger.error(`[AntiDesint] appendFlagsToDossier ${dossierId} failed: ${e?.message}`);
        }
    }
    async checkCriticalThreshold(dossierId) {
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true, title: true, clientNom: true },
        });
        if (!dossier)
            return false;
        const flags = (dossier.payload?.antiDesintFlags) || [];
        const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const recentHigh = flags.filter(f => {
            const ts = new Date(f.ts).getTime();
            return f.severity === "HIGH" && ts >= sevenDaysAgo;
        });
        if (recentHigh.length >= FLAG_THRESHOLD_CRITICAL) {
            this.logger.warn(`[AntiDesint] CRITICAL: ${dossierId} (${dossier.clientNom || "—"}) ${recentHigh.length} flags HIGH sur 7j`);
            // Créer un incident escalation
            await this.incidents.createFromDoctrinePointer({
                rule_id: "T2-R-ANTI-DESINT-ESCALATION",
                error_code: "ERR-T2-DESINT-CRITICAL",
                category: "DISINTERMEDIATION_RISK",
                severity: "CRITICAL",
                projectId: dossierId,
                door: 2,
                metadata: {
                    dossierTitle: dossier.title,
                    recentHighFlags: recentHigh.length,
                    windowDays: 7,
                    flags: recentHigh.slice(-10),
                },
            });
            return true;
        }
        return false;
    }
};
exports.AntiDesintService = AntiDesintService;
__decorate([
    (0, schedule_1.Cron)("0 2 * * *", { timeZone: "Africa/Casablanca" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AntiDesintService.prototype, "runNightly", null);
exports.AntiDesintService = AntiDesintService = AntiDesintService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        incidents_service_1.IncidentsService,
        owner_notify_service_1.OwnerNotifyService])
], AntiDesintService);
