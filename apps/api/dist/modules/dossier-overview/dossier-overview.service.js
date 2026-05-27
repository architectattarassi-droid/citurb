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
var DossierOverviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DossierOverviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * DossierOverviewService — agrégateur "Mon Parcours".
 *
 * Doctrine :
 *  - PrismaService est le seul accès DB ; aucune dépendance vers d'autres modules.
 *  - Lecture seule, jamais d'écriture. Aucune mutation. (Hors scope MutationGate.)
 *  - Données absentes → retournées null / 0 / [] sans casser.
 *  - Le format est versionné via `DossierOverview` (Tome 0).
 */
let DossierOverviewService = DossierOverviewService_1 = class DossierOverviewService {
    prisma;
    logger = new common_1.Logger(DossierOverviewService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ─────────────────────────────────────────────────────────────────────
    // Lecture principale
    // ─────────────────────────────────────────────────────────────────────
    async getOverview(dossierId, requesterId, requesterRole) {
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            include: {
                rokhas: true,
                payments: true,
                documents: true,
                owner: {
                    select: { id: true, email: true, phone: true, username: true },
                },
            },
        });
        if (!dossier)
            throw new common_1.NotFoundException("Dossier inconnu");
        const isOwner = dossier.ownerId === requesterId;
        const isAdmin = requesterRole === "ADMIN" ||
            requesterRole === "SUPER_ADMIN" ||
            requesterRole === "OWNER" ||
            requesterRole === "OPS";
        if (!isOwner && !isAdmin) {
            throw new common_1.ForbiddenException("Accès refusé sur ce dossier");
        }
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        const phases = this.buildPhases(dossier, payload);
        const currentPhase = this.detectCurrentPhase(phases);
        const progressGlobalPct = this.computeGlobalProgress(phases, payload);
        const payments = this.buildPayments(dossier, payload);
        const documents = this.buildDocuments(dossier);
        const experts = this.buildExperts(dossier, payload);
        const nextAction = this.computeNextAction(dossier, payload, phases, payments);
        return {
            dossierId: dossier.id,
            projectTitle: dossier.title || dossier.refInterne || "Mon projet",
            porteType: dossier.porteType ?? "P1",
            currentPhase,
            progressGlobalPct,
            nextAction,
            phases,
            payments,
            documents,
            experts,
            generatedAt: new Date().toISOString(),
        };
    }
    // ─────────────────────────────────────────────────────────────────────
    // Phases
    // ─────────────────────────────────────────────────────────────────────
    buildPhases(dossier, payload) {
        // ── LEAD
        const lead = payload.lead ?? {};
        const leadDone = Boolean(dossier.mandatSigne) ||
            Boolean(payload.packValidation?.status) ||
            dossier.status !== "DRAFT";
        const leadSummary = {
            id: "lead",
            status: leadDone ? "DONE" : "ACTIVE",
            completedAt: lead.convertedAt ?? dossier.createdAt?.toISOString?.() ?? null,
            summary: {
                leadScore: typeof lead.score === "number" ? lead.score : null,
                source: lead.source ?? payload.source ?? null,
                firstContactAt: lead.firstContactAt ?? dossier.createdAt?.toISOString?.() ?? null,
            },
        };
        // ── MANAGE (contractualisation + paiement + pack activé)
        const pv = payload.packValidation ?? null;
        const packStatus = pv?.status ?? null;
        const packActivated = packStatus === "ACTIVATED";
        const manageStatus = packActivated
            ? "DONE"
            : leadDone
                ? "ACTIVE"
                : "PENDING";
        const manageSummary = {
            id: "manage",
            status: manageStatus,
            completedAt: pv?.validatedAt ?? null,
            summary: {
                architect: payload.architectName ?? payload.assignedArchitectName ?? null,
                pack: dossier.packSelected ?? payload.packSelected ?? null,
                packPriceMAD: dossier.packPriceMAD ?? null,
                signatures: {
                    mandat: Boolean(dossier.mandatSigne),
                    contract: Boolean(payload.contractSignedAt),
                },
                packValidationStatus: packStatus,
            },
        };
        // ── PERMIT (Rokhas)
        const rok = dossier.rokhas;
        const rokhasStatus = rok?.statut ?? null;
        const permitDone = rokhasStatus === "FAVORABLE" ||
            rokhasStatus === "PERMIS_DELIVRE" ||
            Boolean(rok?.dateArrete);
        const permitActive = !permitDone && (Boolean(rok?.dateDepot) || packActivated);
        const reservesCount = this.countReservesFromPhases(rok);
        const permitSummary = {
            id: "permit",
            status: permitDone ? "DONE" : permitActive ? "ACTIVE" : "PENDING",
            completedAt: rok?.dateArrete?.toISOString?.() ?? null,
            summary: {
                rokhasStatus,
                depositDate: rok?.dateDepot?.toISOString?.() ?? null,
                legalDeadline: rok?.dateLivraison?.toISOString?.() ?? null,
                reservesCount,
                phaseActuelle: rok?.phaseActuelle ?? null,
                decisionCommission: rok?.decisionCommission ?? null,
                numArrete: rok?.numArrete ?? null,
            },
        };
        // ── SITE (chantier) — calculé depuis projectCalendar + pvChantier
        const cal = payload.projectCalendar ?? {};
        const tasks = Array.isArray(cal.tasks) ? cal.tasks : [];
        const siteTasks = tasks.filter((t) => typeof t.phase === "string" &&
            (t.phase.includes("CHANTIER") || t.phase.startsWith("PHASE_09") ||
                t.phase.startsWith("PHASE_10") || t.phase.startsWith("PHASE_11")));
        const progressPct = this.averageProgress(siteTasks);
        const pvList = Array.isArray(payload.pvChantier) ? payload.pvChantier : [];
        const lastVisit = pvList.length > 0
            ? pvList.reduce((acc, pv) => (pv.date && pv.date > acc ? pv.date : acc), "")
            : null;
        const photosRecentCount = pvList.reduce((acc, pv) => {
            const obs = Array.isArray(pv.observations) ? pv.observations : [];
            return acc + obs.reduce((a, o) => a + (Array.isArray(o.photoUrls) ? o.photoUrls.length : 0), 0);
        }, 0);
        const siteDone = Boolean(payload.receptionProvisoireAt) || progressPct >= 100;
        const siteActive = !siteDone && permitDone;
        const siteSummary = {
            id: "site",
            status: siteDone ? "DONE" : siteActive ? "ACTIVE" : "PENDING",
            completedAt: payload.receptionProvisoireAt ?? null,
            summary: {
                progressPct,
                pvCount: pvList.length,
                lastVisit: lastVisit || null,
                photosRecentCount,
            },
        };
        // ── DELIVERY (PH = Permis Habiter)
        const ph = payload.permisHabiter ?? {};
        const deliveryDone = Boolean(ph.deliveredAt);
        const deliverySummary = {
            id: "delivery",
            status: deliveryDone ? "DONE" : siteDone ? "ACTIVE" : "PENDING",
            completedAt: ph.deliveredAt ?? null,
            summary: {
                phStatus: ph.status ?? null,
                plannedDate: ph.plannedDate ?? null,
                garantiesActives: Array.isArray(ph.garanties) ? ph.garanties : [],
            },
        };
        return [leadSummary, manageSummary, permitSummary, siteSummary, deliverySummary];
    }
    detectCurrentPhase(phases) {
        const active = phases.find((p) => p.status === "ACTIVE");
        if (active)
            return active.id;
        // Sinon, dernière non DONE (PENDING/BLOCKED) ou la dernière (delivery).
        const pending = phases.find((p) => p.status !== "DONE");
        return (pending ?? phases[phases.length - 1]).id;
    }
    computeGlobalProgress(phases, payload) {
        // Chaque phase pèse 20%. Pour la phase courante, on regarde le %
        // chantier si disponible, sinon 50% par défaut.
        let pct = 0;
        for (const p of phases) {
            if (p.status === "DONE")
                pct += 20;
            else if (p.status === "ACTIVE") {
                if (p.id === "site") {
                    const sitePct = Number(p.summary.progressPct) || 0;
                    pct += Math.round((sitePct / 100) * 20);
                }
                else {
                    pct += 10;
                }
            }
        }
        // Bonus paiement si packActivated.
        if (payload.packValidation?.status === "ACTIVATED" && pct < 100) {
            pct = Math.min(100, pct + 0);
        }
        return Math.max(0, Math.min(100, pct));
    }
    // ─────────────────────────────────────────────────────────────────────
    // Paiements
    // ─────────────────────────────────────────────────────────────────────
    buildPayments(dossier, payload) {
        const totalContractMAD = Number(dossier.packPriceMAD ?? payload.totalContractMAD ?? 0) || 0;
        const payments = Array.isArray(dossier.payments) ? dossier.payments : [];
        const paidMAD = payments
            .filter((p) => p.status === "CONFIRMED")
            .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
        const dueMAD = Math.max(0, totalContractMAD - paidMAD);
        // Schedule depuis payload.paymentSchedule ou inféré.
        const rawSchedule = Array.isArray(payload.paymentSchedule)
            ? payload.paymentSchedule
            : [];
        const schedule = rawSchedule.map((s) => ({
            jalon: String(s.jalon ?? s.label ?? "Jalon"),
            amount: Number(s.amount ?? 0) || 0,
            dueDate: s.dueDate ?? null,
            paid: Boolean(s.paid),
            paidAt: s.paidAt ?? null,
        }));
        return {
            totalContractMAD,
            paidMAD,
            dueMAD,
            currency: "MAD",
            schedule,
        };
    }
    // ─────────────────────────────────────────────────────────────────────
    // Documents (synthèse — accès rapide)
    // ─────────────────────────────────────────────────────────────────────
    buildDocuments(dossier) {
        const out = [];
        const docs = Array.isArray(dossier.documents) ? dossier.documents : [];
        // On garde les docs les plus représentatifs pour l'accès rapide.
        const keys = ["CONTRAT", "PLANS", "PERMIS", "PV_CHANTIER", "PV"];
        const sorted = [...docs].sort((a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime());
        for (const k of keys) {
            const match = sorted.find((d) => String(d.docType ?? "").toUpperCase().includes(k));
            if (match) {
                out.push({
                    id: match.id,
                    title: match.originalName ?? match.docType ?? "Document",
                    kind: match.docType ?? "DOC",
                    signedUrl: this.buildDocUrl(dossier.id, match.id),
                    signed: false,
                    updatedAt: match.uploadedAt?.toISOString?.() ?? null,
                });
            }
        }
        // Si rien trouvé : on liste les 4 derniers.
        if (out.length === 0) {
            for (const d of sorted.slice(0, 4)) {
                out.push({
                    id: d.id,
                    title: d.originalName ?? d.docType ?? "Document",
                    kind: d.docType ?? "DOC",
                    signedUrl: this.buildDocUrl(dossier.id, d.id),
                    signed: false,
                    updatedAt: d.uploadedAt?.toISOString?.() ?? null,
                });
            }
        }
        return out;
    }
    buildDocUrl(dossierId, docId) {
        return `/api/dossier-overview/${dossierId}/documents/${docId}`;
    }
    // ─────────────────────────────────────────────────────────────────────
    // Experts (architecte, OPS, etc.)
    // ─────────────────────────────────────────────────────────────────────
    buildExperts(dossier, payload) {
        const out = [];
        if (payload.architectName || payload.assignedArchitect) {
            out.push({
                role: "ARCHITECT",
                name: payload.architectName ??
                    payload.assignedArchitect?.name ??
                    "Votre architecte",
                phone: payload.architectPhone ?? payload.assignedArchitect?.phone ?? null,
                email: payload.architectEmail ?? payload.assignedArchitect?.email ?? null,
                photo: payload.architectPhoto ?? null,
            });
        }
        if (payload.opsContact) {
            out.push({
                role: "OPS",
                name: payload.opsContact.name ?? "Support CITURBAREA",
                phone: payload.opsContact.phone ?? null,
                email: payload.opsContact.email ?? null,
                photo: null,
            });
        }
        // Fallback : numéro support générique (WhatsApp owner).
        if (out.length === 0) {
            out.push({
                role: "SUPPORT",
                name: "CITURBAREA Support",
                phone: process.env.OWNER_WHATSAPP_PHONE ?? null,
                email: process.env.SUPPORT_EMAIL ?? null,
                photo: null,
            });
        }
        return out;
    }
    // ─────────────────────────────────────────────────────────────────────
    // Prochaine action (ordre de priorité)
    // ─────────────────────────────────────────────────────────────────────
    computeNextAction(dossier, payload, phases, payments) {
        const pv = payload.packValidation ?? null;
        // 1) Pas de paiement reçu → CTA payer
        if (!pv || pv.status === "PENDING_PAYMENT") {
            return {
                title: "Paiement de votre pack en attente",
                description: "Pour démarrer votre projet, finalisez le paiement de votre pack CITURBAREA.",
                ctaUrl: `/api/payment/checkout-session/${dossier.id}`,
                ctaLabel: "Payer maintenant",
                deadline: null,
                severity: "urgent",
            };
        }
        // 2) Paiement reçu mais en attente validation admin → info
        if (pv.status === "PAYMENT_RECEIVED" || pv.status === "PENDING_ADMIN_VALIDATION") {
            return {
                title: "Paiement reçu — validation en cours",
                description: "Notre équipe valide votre dossier sous 24 h. Vous recevrez un email dès activation.",
                ctaUrl: `/mon-parcours/${dossier.id}`,
                ctaLabel: "Voir mon dossier",
                deadline: null,
                severity: "info",
            };
        }
        // 3) Mandat non signé → urgent
        if (!dossier.mandatSigne) {
            return {
                title: "Signez votre contrat d'architecte",
                description: "Le contrat d'architecte est requis pour engager les démarches Rokhas.",
                ctaUrl: `/dossier/${dossier.id}/contrat`,
                ctaLabel: "Signer maintenant",
                deadline: null,
                severity: "urgent",
            };
        }
        // 4) Échéance paiement à venir
        const nextSchedule = payments.schedule
            .filter((s) => !s.paid && s.dueDate)
            .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
        if (nextSchedule) {
            const due = new Date(nextSchedule.dueDate).getTime();
            const days = Math.round((due - Date.now()) / 86_400_000);
            const severity = days <= 3 ? "urgent" : days <= 14 ? "warning" : "info";
            return {
                title: `Jalon ${nextSchedule.jalon} dû`,
                description: `${nextSchedule.amount.toLocaleString("fr-FR")} MAD à régler avant le ${this.formatDate(nextSchedule.dueDate)}.`,
                ctaUrl: `/api/payment/checkout-session/${dossier.id}`,
                ctaLabel: "Payer",
                deadline: nextSchedule.dueDate,
                severity,
            };
        }
        // 5) Réserves Rokhas à lever
        const rok = dossier.rokhas;
        if (rok && rok.statut === "RESERVES") {
            return {
                title: "Levée de réserves Rokhas",
                description: "Des réserves ont été émises sur votre dossier permis.",
                ctaUrl: `/dossier/${dossier.id}/rokhas`,
                ctaLabel: "Voir les réserves",
                deadline: null,
                severity: "warning",
            };
        }
        // 6) Phase chantier active et PV à valider
        const pvList = Array.isArray(payload.pvChantier) ? payload.pvChantier : [];
        const pvUnsigned = pvList.find((p) => p.status === "SIGNED_PARTIEL" || p.status === "DRAFT");
        if (pvUnsigned) {
            return {
                title: "PV de chantier à valider",
                description: `PV n°${pvUnsigned.numero ?? "—"} en attente de votre signature.`,
                ctaUrl: `/projet/${dossier.id}/pv/${pvUnsigned.id}`,
                ctaLabel: "Valider le PV",
                deadline: null,
                severity: "warning",
            };
        }
        // 7) Tout est OK → message informatif
        const active = phases.find((p) => p.status === "ACTIVE");
        if (active) {
            return {
                title: `Phase ${active.id} en cours`,
                description: "Votre projet avance — votre architecte vous tient informé.",
                ctaUrl: `/mon-parcours/${dossier.id}`,
                ctaLabel: "Voir le détail",
                deadline: null,
                severity: "info",
            };
        }
        return null;
    }
    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    countReservesFromPhases(rok) {
        if (!rok)
            return 0;
        const phases = Array.isArray(rok.phases) ? rok.phases : [];
        return phases.filter((p) => p.statut === "RESERVES" || p.motifRejet).length;
    }
    averageProgress(tasks) {
        if (!tasks.length)
            return 0;
        const sum = tasks.reduce((a, t) => a + (Number(t.progressPct) || 0), 0);
        return Math.round(sum / tasks.length);
    }
    formatDate(iso) {
        if (!iso)
            return "—";
        try {
            const d = new Date(iso);
            return d.toLocaleDateString("fr-FR", {
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
exports.DossierOverviewService = DossierOverviewService;
exports.DossierOverviewService = DossierOverviewService = DossierOverviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DossierOverviewService);
