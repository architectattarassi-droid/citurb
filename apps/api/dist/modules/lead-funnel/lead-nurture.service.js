"use strict";
/**
 * lead-nurture.service.ts
 *
 * Cron de nurturing email : J+1, J+3, J+7, J+14.
 *
 * Stratégie :
 *  - Un cron `@Cron("0 9 * * *", { timeZone: "Africa/Casablanca" })`
 *    tourne tous les jours à 09:00 et envoie les emails dus.
 *  - Chaque template a une fenêtre de tolérance (±0.5 jour) pour rattraper
 *    les leads créés en cours de journée.
 *  - `nurtureLog[template]` empêche le double envoi.
 *
 * Templates :
 *   J+1  → estimation_detail   "Voici votre estimation détaillée"
 *   J+3  → temoignages         "Témoignages clients Rabat-Casa-Marrakech"
 *   J+7  → visio_expert        "Réservez une visio gratuite avec un expert"
 *   J+14 → derniere_chance     "Dernière chance offre lancement"
 *
 * Email rendering : helper local minimaliste, multilingue FR/AR/EN.
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
var LeadNurtureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadNurtureService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_service_1 = require("../email/email.service");
const lead_funnel_service_1 = require("./lead-funnel.service");
const PUBLIC_URL = () => process.env.PUBLIC_WEB_URL || "https://citurbarea.com";
const TEMPLATES = [
    {
        key: "estimation_detail",
        ageDays: 1,
        subject: {
            fr: "Votre estimation détaillée CITURBAREA",
            en: "Your detailed CITURBAREA estimate",
            ar: "تقديركم المفصّل من CITURBAREA",
        },
        body: (l) => ({
            fr: `<p>Bonjour ${esc(l.nom)},</p>
<p>Voici l'estimation détaillée de votre projet${l.ville ? ` à ${esc(l.ville)}` : ""}. Nos architectes ont préparé un premier découpage budgétaire.</p>
<p><a href="${PUBLIC_URL()}/calculateur?lead=${l.id}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Voir mon estimation</a></p>
<p>L'équipe CITURBAREA.</p>`,
            en: `<p>Hello ${esc(l.nom)},</p>
<p>Here is the detailed estimate for your project${l.ville ? ` in ${esc(l.ville)}` : ""}. Our architects prepared an initial budget breakdown.</p>
<p><a href="${PUBLIC_URL()}/calculateur?lead=${l.id}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">See my estimate</a></p>
<p>The CITURBAREA team.</p>`,
            ar: `<p>مرحبًا ${esc(l.nom)},</p>
<p>إليك التقدير المفصّل لمشروعك${l.ville ? ` في ${esc(l.ville)}` : ""}. أعدّ مهندسونا تقسيمًا أوليًا للميزانية.</p>
<p><a href="${PUBLIC_URL()}/calculateur?lead=${l.id}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">شاهد التقدير</a></p>
<p>فريق CITURBAREA.</p>`,
        }),
    },
    {
        key: "temoignages",
        ageDays: 3,
        subject: {
            fr: "Ils nous ont fait confiance — Rabat, Casa, Marrakech",
            en: "They trusted us — Rabat, Casablanca, Marrakech",
            ar: "وثقوا بنا — الرباط، الدار البيضاء، مراكش",
        },
        body: (l) => ({
            fr: `<p>Bonjour ${esc(l.nom)},</p>
<p>Voici quelques projets livrés récemment : villa R+1 à Bouskoura, immeuble R+4 à Rabat-Agdal, lotissement de 24 lots à Marrakech.</p>
<p>Chaque dossier a été suivi de bout en bout par un architecte référent, du permis aux clés.</p>
<p><a href="${PUBLIC_URL()}/temoignages" style="color:#1d4ed8;font-weight:600;">Lire les témoignages →</a></p>`,
            en: `<p>Hello ${esc(l.nom)},</p>
<p>Recent projects delivered: R+1 villa in Bouskoura, R+4 building in Rabat-Agdal, 24-lot subdivision in Marrakech.</p>
<p>Each case was followed end-to-end by a referent architect, from permit to keys.</p>
<p><a href="${PUBLIC_URL()}/temoignages" style="color:#1d4ed8;font-weight:600;">Read testimonials →</a></p>`,
            ar: `<p>مرحبًا ${esc(l.nom)},</p>
<p>مشاريع تم إنجازها مؤخرًا: فيلا R+1 في بوسكورة، عمارة R+4 في الرباط-أكدال، تجزئة من 24 قطعة في مراكش.</p>
<p>كل ملف يتم تتبعه من البداية حتى التسليم من قبل مهندس مرجعي.</p>
<p><a href="${PUBLIC_URL()}/temoignages" style="color:#1d4ed8;font-weight:600;">اقرأ الشهادات →</a></p>`,
        }),
    },
    {
        key: "visio_expert",
        ageDays: 7,
        subject: {
            fr: "Réservez une visio gratuite avec un architecte",
            en: "Book a free video call with an architect",
            ar: "احجز مكالمة فيديو مجانية مع مهندس",
        },
        body: (l) => ({
            fr: `<p>Bonjour ${esc(l.nom)},</p>
<p>Vous souhaitez clarifier votre projet ? Réservez 30 minutes en visio avec un architecte CITURBAREA — sans engagement.</p>
<p><a href="${PUBLIC_URL()}/visio?lead=${l.id}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Réserver ma visio</a></p>`,
            en: `<p>Hello ${esc(l.nom)},</p>
<p>Want to clarify your project? Book a 30-min video call with a CITURBAREA architect — no commitment.</p>
<p><a href="${PUBLIC_URL()}/visio?lead=${l.id}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Book my call</a></p>`,
            ar: `<p>مرحبًا ${esc(l.nom)},</p>
<p>هل تود توضيح مشروعك؟ احجز 30 دقيقة فيديو مع مهندس CITURBAREA — بدون التزام.</p>
<p><a href="${PUBLIC_URL()}/visio?lead=${l.id}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">احجز المكالمة</a></p>`,
        }),
    },
    {
        key: "derniere_chance",
        ageDays: 14,
        subject: {
            fr: "Dernière chance — offre de lancement CITURBAREA",
            en: "Last chance — CITURBAREA launch offer",
            ar: "آخر فرصة — عرض إطلاق CITURBAREA",
        },
        body: (l) => ({
            fr: `<p>Bonjour ${esc(l.nom)},</p>
<p>Votre demande date d'il y a 2 semaines. Notre offre de lancement (étude foncière offerte) expire bientôt.</p>
<p><a href="${PUBLIC_URL()}/offre-lancement?lead=${l.id}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Profiter de l'offre</a></p>
<p>Si vous ne souhaitez plus être contacté, répondez simplement STOP.</p>`,
            en: `<p>Hello ${esc(l.nom)},</p>
<p>Your request is 2 weeks old. Our launch offer (free land study) expires soon.</p>
<p><a href="${PUBLIC_URL()}/offre-lancement?lead=${l.id}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Claim the offer</a></p>
<p>To stop receiving emails, reply STOP.</p>`,
            ar: `<p>مرحبًا ${esc(l.nom)},</p>
<p>طلبك يعود إلى أسبوعين. عرض الإطلاق لدينا (دراسة عقارية مجانية) ينتهي قريبًا.</p>
<p><a href="${PUBLIC_URL()}/offre-lancement?lead=${l.id}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">استفد من العرض</a></p>
<p>للتوقف عن استلام الرسائل، رد بكلمة STOP.</p>`,
        }),
    },
];
let LeadNurtureService = LeadNurtureService_1 = class LeadNurtureService {
    leads;
    email;
    log = new common_1.Logger(LeadNurtureService_1.name);
    constructor(leads, email) {
        this.leads = leads;
        this.email = email;
    }
    /** Cron quotidien 09:00 Africa/Casablanca. */
    async runDaily() {
        if (!this.email.isConfigured()) {
            this.log.warn("[Nurture] email provider non configuré — skip");
            return;
        }
        let sent = 0;
        for (const tpl of TEMPLATES) {
            const candidates = this.leads.pickNurtureCandidates({
                ageDays: tpl.ageDays,
                tolerance: 0.5,
            });
            for (const l of candidates) {
                if (l.nurtureLog?.[tpl.key])
                    continue; // déjà envoyé
                if (!l.email)
                    continue;
                try {
                    const lang = (l.lang || "fr");
                    await this.email.send({
                        to: l.email,
                        subject: tpl.subject[lang],
                        html: wrap(tpl.body(l)[lang], lang),
                    });
                    this.leads.markNurtureSent(l.id, tpl.key);
                    sent++;
                }
                catch (e) {
                    this.log.warn(`[Nurture] échec ${tpl.key} → ${l.email}: ${e?.message}`);
                }
            }
        }
        if (sent > 0)
            this.log.log(`[Nurture] ${sent} emails envoyés`);
    }
    /** Pour tests manuels (endpoint /api/cc à wirer si besoin). */
    async runNow() {
        let sent = 0;
        for (const tpl of TEMPLATES) {
            const candidates = this.leads.pickNurtureCandidates({
                ageDays: tpl.ageDays,
                tolerance: 0.5,
            });
            for (const l of candidates) {
                if (l.nurtureLog?.[tpl.key])
                    continue;
                if (!l.email)
                    continue;
                const lang = (l.lang || "fr");
                await this.email.send({
                    to: l.email,
                    subject: tpl.subject[lang],
                    html: wrap(tpl.body(l)[lang], lang),
                });
                this.leads.markNurtureSent(l.id, tpl.key);
                sent++;
            }
        }
        return { sent };
    }
};
exports.LeadNurtureService = LeadNurtureService;
__decorate([
    (0, schedule_1.Cron)("0 9 * * *", { timeZone: "Africa/Casablanca" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadNurtureService.prototype, "runDaily", null);
exports.LeadNurtureService = LeadNurtureService = LeadNurtureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [lead_funnel_service_1.LeadFunnelService,
        email_service_1.EmailService])
], LeadNurtureService);
// ── Helpers locaux ──────────────────────────────────────────────────
function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c] || c));
}
function wrap(body, lang) {
    const dir = lang === "ar" ? "rtl" : "ltr";
    return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);color:#fff;padding:24px 32px;">
      <div style="font-size:22px;font-weight:800;">CITURBAREA</div>
    </div>
    <div style="padding:28px 32px;line-height:1.65;font-size:15px;">${body}</div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;color:#9ca3af;font-size:11px;text-align:center;">
      © CITURBAREA — citurbarea.com
    </div>
  </div>
</body>
</html>`;
}
