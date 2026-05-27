"use strict";
/**
 * lead-funnel.service.ts
 *
 * Capture, scoring, journalisation et stats des leads.
 *
 * Persistance V1 (MVP) :
 *  - Map en mémoire `leads`
 *  - Dump périodique JSON dans `<cwd>/data/leads.json` (best-effort, async)
 *  - Recharge au démarrage si le fichier existe
 *
 * À remplacer par Prisma `Lead` dès que la migration est appliquée
 * (cf. INTEGRATION.md).
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
var LeadFunnelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadFunnelService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const email_service_1 = require("../email/email.service");
const lead_scoring_1 = require("./lead-scoring");
const STORE_DIR = (0, path_1.join)(process.cwd(), "data");
const STORE_FILE = (0, path_1.join)(STORE_DIR, "leads.json");
let LeadFunnelService = LeadFunnelService_1 = class LeadFunnelService {
    email;
    log = new common_1.Logger(LeadFunnelService_1.name);
    leads = new Map();
    dirty = false;
    flushTimer = null;
    constructor(email) {
        this.email = email;
        // Hydratation initiale (best-effort, ne bloque pas le boot)
        this.hydrate().catch((e) => this.log.warn(`[LeadFunnel] hydrate failed: ${e?.message}`));
    }
    // ── Persistence (JSON fallback) ───────────────────────────────────
    async hydrate() {
        try {
            const raw = await fs_1.promises.readFile(STORE_FILE, "utf8");
            const arr = JSON.parse(raw);
            for (const l of arr)
                this.leads.set(l.id, l);
            this.log.log(`[LeadFunnel] hydrated ${this.leads.size} leads`);
        }
        catch {
            // fichier absent au premier boot : OK
        }
    }
    scheduleFlush() {
        this.dirty = true;
        if (this.flushTimer)
            return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            if (!this.dirty)
                return;
            this.dirty = false;
            this.flush().catch((e) => this.log.warn(`[LeadFunnel] flush failed: ${e?.message}`));
        }, 2000);
    }
    async flush() {
        await fs_1.promises.mkdir(STORE_DIR, { recursive: true });
        const arr = Array.from(this.leads.values());
        await fs_1.promises.writeFile(STORE_FILE, JSON.stringify(arr, null, 2), "utf8");
    }
    // ── Capture publique ──────────────────────────────────────────────
    async capture(input) {
        const nom = String(input.nom || "").trim();
        const telephone = String(input.telephone || "").trim();
        if (!nom || nom.length < 2) {
            throw new Error("nom_invalid");
        }
        if (!(0, lead_scoring_1.isValidMaPhone)(telephone)) {
            throw new Error("phone_invalid");
        }
        // Détecte return visitor sur (téléphone OU email) déjà connu
        const returnVisitor = this.detectReturn(telephone, input.email);
        const { score, breakdown } = (0, lead_scoring_1.computeLeadScore)({
            budget: input.budget,
            email: input.email,
            telephone,
            delaiMois: input.delaiMois,
            ville: input.ville,
            returnVisitor,
            wizardStep: 0,
        });
        const now = new Date().toISOString();
        const id = `lead_${Date.now().toString(36)}${Math.random()
            .toString(36)
            .slice(2, 7)}`;
        const lead = {
            id,
            createdAt: now,
            updatedAt: now,
            nom,
            telephone,
            email: input.email?.trim() || undefined,
            projetType: input.projetType,
            budget: input.budget,
            ville: input.ville?.trim() || undefined,
            surface: input.surface,
            delaiMois: input.delaiMois,
            source: input.source || "DIRECT",
            lang: input.lang || "fr",
            pageContext: input.pageContext,
            utm: input.utm,
            score,
            scoreBreakdown: breakdown,
            stage: "NEW",
            wizardStep: 0,
            returnVisitor,
            nurtureLog: {},
            convertedDossierId: null,
            events: [
                {
                    id: `evt_${Date.now().toString(36)}`,
                    at: now,
                    kind: "CREATED",
                    payload: { source: input.source, pageContext: input.pageContext },
                },
                {
                    id: `evt_${Date.now().toString(36)}_s`,
                    at: now,
                    kind: "SCORED",
                    payload: { score, breakdown },
                },
            ],
            meta: input.meta,
        };
        this.leads.set(id, lead);
        this.scheduleFlush();
        // Notification équipe (fire & forget)
        this.notifyTeamNewLead(lead).catch((e) => this.log.warn(`[LeadFunnel] notify team failed: ${e?.message}`));
        // Accusé réception lead (fire & forget)
        if (lead.email) {
            this.sendCaptureAck(lead).catch((e) => this.log.warn(`[LeadFunnel] ack email failed: ${e?.message}`));
        }
        return {
            leadId: lead.id,
            scoreInitial: lead.score,
            stage: lead.stage,
            message: lead.lang === "ar"
                ? "تم استلام طلبك. سيتواصل معك فريقنا خلال 24 ساعة."
                : lead.lang === "en"
                    ? "Request received. Our team will reach out within 24h."
                    : "Demande reçue. Notre équipe vous recontacte sous 24h.",
        };
    }
    detectReturn(phone, email) {
        for (const l of this.leads.values()) {
            if (l.telephone === phone)
                return true;
            if (email && l.email && l.email.toLowerCase() === email.toLowerCase()) {
                return true;
            }
        }
        return false;
    }
    // ── Lecture ───────────────────────────────────────────────────────
    get(id) {
        return this.leads.get(id);
    }
    list(opts) {
        const arr = Array.from(this.leads.values());
        const filtered = arr.filter((l) => {
            if (opts?.stage && l.stage !== opts.stage)
                return false;
            if (typeof opts?.minScore === "number" && l.score < opts.minScore)
                return false;
            return true;
        });
        filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return typeof opts?.limit === "number" ? filtered.slice(0, opts.limit) : filtered;
    }
    // ── Mutations ─────────────────────────────────────────────────────
    rescore(id) {
        const l = this.leads.get(id);
        if (!l)
            return undefined;
        const { score, breakdown } = (0, lead_scoring_1.rescoreLead)(l);
        l.score = score;
        l.scoreBreakdown = breakdown;
        l.updatedAt = new Date().toISOString();
        l.events.push({
            id: `evt_${Date.now().toString(36)}`,
            at: l.updatedAt,
            kind: "SCORED",
            payload: { score, breakdown },
        });
        this.scheduleFlush();
        return l;
    }
    setStage(id, stage) {
        const l = this.leads.get(id);
        if (!l)
            return undefined;
        const prev = l.stage;
        l.stage = stage;
        l.updatedAt = new Date().toISOString();
        l.events.push({
            id: `evt_${Date.now().toString(36)}`,
            at: l.updatedAt,
            kind: "STAGE_CHANGE",
            payload: { from: prev, to: stage },
        });
        this.scheduleFlush();
        return l;
    }
    attachEvent(id, event) {
        const l = this.leads.get(id);
        if (!l)
            return undefined;
        const evt = {
            id: `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
            at: new Date().toISOString(),
            ...event,
        };
        l.events.push(evt);
        l.updatedAt = evt.at;
        this.scheduleFlush();
        return l;
    }
    /**
     * Marque un lead comme converti vers un dossier P1–P6.
     * Appelé depuis l'endpoint /p2/intake (cf. INTEGRATION.md hook).
     */
    markConverted(id, dossierId) {
        const l = this.leads.get(id);
        if (!l)
            return undefined;
        l.convertedDossierId = dossierId;
        l.stage = "DOSSIER_OPENED";
        l.updatedAt = new Date().toISOString();
        l.events.push({
            id: `evt_${Date.now().toString(36)}`,
            at: l.updatedAt,
            kind: "DOSSIER_CONVERTED",
            payload: { dossierId },
        });
        this.scheduleFlush();
        return l;
    }
    // ── Stats funnel (CC dashboard) ───────────────────────────────────
    funnelStats() {
        const all = Array.from(this.leads.values());
        const byStage = {};
        const byPorte = {};
        const bySource = {};
        let scoreSum = 0;
        const now = Date.now();
        let last7 = 0;
        let last30 = 0;
        let paid = 0;
        for (const l of all) {
            byStage[l.stage] = (byStage[l.stage] || 0) + 1;
            const pt = String(l.projetType || "AUTRE");
            byPorte[pt] = (byPorte[pt] || 0) + 1;
            bySource[l.source] = (bySource[l.source] || 0) + 1;
            scoreSum += l.score;
            const age = now - new Date(l.createdAt).getTime();
            if (age <= 7 * 86400_000)
                last7++;
            if (age <= 30 * 86400_000)
                last30++;
            if (l.stage === "PAID")
                paid++;
        }
        const total = all.length;
        return {
            total,
            byStage,
            byPorte,
            bySource,
            conversionRate: total > 0 ? paid / total : 0,
            avgScore: total > 0 ? scoreSum / total : 0,
            last7d: last7,
            last30d: last30,
        };
    }
    // ── Notifications (équipe + lead) ─────────────────────────────────
    async notifyTeamNewLead(lead) {
        const to = process.env.LEAD_NOTIFY_TO ||
            process.env.OWNER_EMAIL ||
            "architectattarassi@gmail.com";
        const subject = `[Lead ${lead.score}/100] ${lead.nom} — ${lead.projetType || "porte ?"}`;
        const html = `
      <h2 style="font-family:sans-serif;">Nouveau lead capturé</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
        <tr><td><b>Nom</b></td><td>${escapeHtml(lead.nom)}</td></tr>
        <tr><td><b>Téléphone</b></td><td>${escapeHtml(lead.telephone)}</td></tr>
        <tr><td><b>Email</b></td><td>${escapeHtml(lead.email || "—")}</td></tr>
        <tr><td><b>Porte</b></td><td>${escapeHtml(String(lead.projetType || "—"))}</td></tr>
        <tr><td><b>Ville</b></td><td>${escapeHtml(lead.ville || "—")}</td></tr>
        <tr><td><b>Budget</b></td><td>${lead.budget ? lead.budget.toLocaleString("fr-MA") + " MAD" : "—"}</td></tr>
        <tr><td><b>Délai</b></td><td>${lead.delaiMois ?? "—"} mois</td></tr>
        <tr><td><b>Source</b></td><td>${escapeHtml(lead.source)}</td></tr>
        <tr><td><b>Page</b></td><td>${escapeHtml(lead.pageContext || "—")}</td></tr>
        <tr><td><b>Score</b></td><td><b>${lead.score}/100</b></td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:12px;color:#6b7280;">Lead id: <code>${lead.id}</code></p>
    `;
        await this.email.send({ to, subject, html });
    }
    async sendCaptureAck(lead) {
        if (!lead.email)
            return;
        const lang = lead.lang;
        const subject = lang === "ar"
            ? "تم استلام طلبك — CITURBAREA"
            : lang === "en"
                ? "We received your request — CITURBAREA"
                : "Nous avons bien reçu votre demande — CITURBAREA";
        const body = lang === "ar"
            ? `<p>مرحبًا ${escapeHtml(lead.nom)},</p><p>تم استلام طلبك بنجاح. سيعود إليك فريق CITURBAREA خلال 24 ساعة بتقدير مفصل.</p>`
            : lang === "en"
                ? `<p>Hello ${escapeHtml(lead.nom)},</p><p>We received your request. Our CITURBAREA team will get back to you within 24h with a detailed estimate.</p>`
                : `<p>Bonjour ${escapeHtml(lead.nom)},</p><p>Nous avons bien reçu votre demande. L'équipe CITURBAREA vous recontacte sous 24h avec une estimation détaillée.</p>`;
        const html = wrapEmail(body, lang);
        await this.email.send({ to: lead.email, subject, html });
        this.attachEvent(lead.id, {
            kind: "EMAIL_SENT",
            channel: "EMAIL",
            payload: { template: "capture_ack" },
        });
    }
    // ── Nurture hook — exposé au cron service ─────────────────────────
    /**
     * Sélectionne les leads éligibles à une relance (utilisé par
     * LeadNurtureService).
     */
    pickNurtureCandidates(opts) {
        const tol = opts.tolerance ?? 0.5;
        const now = Date.now();
        const minMs = (opts.ageDays - tol) * 86400_000;
        const maxMs = (opts.ageDays + tol) * 86400_000;
        return Array.from(this.leads.values()).filter((l) => {
            if (l.stage === "PAID" || l.stage === "LOST" || l.stage === "ARCHIVED") {
                return false;
            }
            const age = now - new Date(l.createdAt).getTime();
            return age >= minMs && age <= maxMs;
        });
    }
    markNurtureSent(leadId, template) {
        const l = this.leads.get(leadId);
        if (!l)
            return;
        l.nurtureLog = l.nurtureLog || {};
        l.nurtureLog[template] = new Date().toISOString();
        l.events.push({
            id: `evt_${Date.now().toString(36)}`,
            at: l.nurtureLog[template],
            kind: "EMAIL_SENT",
            channel: "EMAIL",
            payload: { template },
        });
        this.scheduleFlush();
    }
};
exports.LeadFunnelService = LeadFunnelService;
exports.LeadFunnelService = LeadFunnelService = LeadFunnelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], LeadFunnelService);
// ── Helpers locaux ──────────────────────────────────────────────────
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c] || c));
}
function wrapEmail(bodyHtml, lang) {
    const dir = lang === "ar" ? "rtl" : "ltr";
    return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);color:#fff;padding:24px 32px;">
      <div style="font-size:22px;font-weight:800;">CITURBAREA</div>
      <div style="font-size:11px;color:#bfdbfe;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">
        ${lang === "ar" ? "منصة معمارية" : lang === "en" ? "Architectural platform" : "Plateforme architecturale"}
      </div>
    </div>
    <div style="padding:28px 32px;line-height:1.6;font-size:15px;">${bodyHtml}</div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;color:#9ca3af;font-size:11px;text-align:center;">
      © CITURBAREA — citurbarea.com
    </div>
  </div>
</body>
</html>`;
}
