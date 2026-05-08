"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ClientNotifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientNotifyService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const client_notify_i18n_1 = require("./client-notify.i18n");
/**
 * ClientNotifyService — emails transactionnels destinés au CLIENT.
 *
 * Multilingue FR / EN / AR : la langue est passée par l'appelant
 * (lue depuis Dossier.payload.lang). Fallback : FR.
 *
 * 4 templates:
 *  1. demandeRecue     — après /p2/intake : confirmation + lien paiement
 *  2. paiementRecu     — après webhook Stripe ou mark-paid manuel
 *  3. packActive       — après admin clic "Valider le pack"
 *  4. rapportPret      — admin notifie manuellement quand le rapport P4/P5 est prêt
 *
 * Configuration :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Gmail recommended)
 *   PUBLIC_WEB_URL (pour les liens absolus)
 *
 * Si SMTP non configuré → log only (no crash, no error to caller).
 */
let ClientNotifyService = ClientNotifyService_1 = class ClientNotifyService {
    logger = new common_1.Logger(ClientNotifyService_1.name);
    async demandeRecue(opts) {
        const lang = (0, client_notify_i18n_1.normalizeLang)(opts.lang);
        const subject = client_notify_i18n_1.DEMANDE_RECUE.subject[lang](opts.porteType);
        const idShort = opts.dossierId.slice(0, 12);
        const projectLine = opts.title
            ? `<p><strong>${client_notify_i18n_1.DEMANDE_RECUE.projectLabel[lang]} :</strong> ${this.esc(opts.title)}</p>`
            : "";
        const html = this.shell(lang, {
            title: client_notify_i18n_1.DEMANDE_RECUE.title[lang],
            preheader: client_notify_i18n_1.DEMANDE_RECUE.preheader[lang](idShort),
            bodyHtml: `
        <p>${client_notify_i18n_1.DEMANDE_RECUE.hello[lang](opts.clientNom ? this.esc(opts.clientNom) : "")},</p>
        <p>${client_notify_i18n_1.DEMANDE_RECUE.body[lang](this.esc(opts.porteType))}</p>
        ${projectLine}
        <div class="cta-block">
          <p>${client_notify_i18n_1.DEMANDE_RECUE.ctaIntro[lang]}</p>
          <a href="${this.webUrl()}/portal" class="cta">${client_notify_i18n_1.DEMANDE_RECUE.ctaPortal[lang]}</a>
          <a href="${this.webUrl()}/payment/start?dossier=${opts.dossierId}" class="cta cta-pay">${client_notify_i18n_1.DEMANDE_RECUE.ctaPay[lang]}</a>
        </div>
        <p>${client_notify_i18n_1.DEMANDE_RECUE.followup[lang]}</p>
        <p class="footer-note">${client_notify_i18n_1.SHELL.refDossier[lang]} : <code>${opts.dossierId}</code></p>
      `,
        });
        await this.send(opts.to, subject, html);
    }
    async paiementRecu(opts) {
        const lang = (0, client_notify_i18n_1.normalizeLang)(opts.lang);
        const cur = opts.currency ?? "MAD";
        const amt = `${opts.amount.toLocaleString(this.locale(lang))} ${cur}`;
        const subject = client_notify_i18n_1.PAIEMENT_RECU.subject[lang];
        const txLine = opts.paymentRef
            ? `<p style="color:#6b7280; font-size:13px;">${client_notify_i18n_1.PAIEMENT_RECU.txRef[lang]} : <code>${this.esc(opts.paymentRef)}</code></p>`
            : "";
        const html = this.shell(lang, {
            title: client_notify_i18n_1.PAIEMENT_RECU.title[lang],
            preheader: client_notify_i18n_1.PAIEMENT_RECU.preheader[lang](amt),
            bodyHtml: `
        <p>${client_notify_i18n_1.DEMANDE_RECUE.hello[lang](opts.clientNom ? this.esc(opts.clientNom) : "")},</p>
        <p>${client_notify_i18n_1.PAIEMENT_RECU.body[lang](amt)}</p>
        ${txLine}
        <div class="cta-block info-block">
          <p>${client_notify_i18n_1.PAIEMENT_RECU.nextStepHeading[lang]}</p>
          <p>${client_notify_i18n_1.PAIEMENT_RECU.nextStepBody[lang]}</p>
        </div>
        <p>${client_notify_i18n_1.PAIEMENT_RECU.followLink[lang]}</p>
        <a href="${this.webUrl()}/portal" class="cta">${client_notify_i18n_1.PAIEMENT_RECU.ctaPortal[lang]}</a>
        <p class="footer-note">${client_notify_i18n_1.SHELL.refDossier[lang]} : <code>${opts.dossierId}</code></p>
      `,
        });
        await this.send(opts.to, subject, html);
    }
    async packActive(opts) {
        const lang = (0, client_notify_i18n_1.normalizeLang)(opts.lang);
        const subject = client_notify_i18n_1.PACK_ACTIVE.subject[lang](opts.porteType);
        const ref = opts.title ? this.esc(opts.title) : opts.dossierId.slice(0, 12);
        const html = this.shell(lang, {
            title: client_notify_i18n_1.PACK_ACTIVE.title[lang],
            preheader: client_notify_i18n_1.PACK_ACTIVE.preheader[lang],
            bodyHtml: `
        <p>${client_notify_i18n_1.DEMANDE_RECUE.hello[lang](opts.clientNom ? this.esc(opts.clientNom) : "")},</p>
        <div class="cta-block success-block">
          <p style="font-size:20px; margin:0;">${client_notify_i18n_1.PACK_ACTIVE.banner[lang](this.esc(opts.porteType))}</p>
        </div>
        <p>${client_notify_i18n_1.PACK_ACTIVE.body[lang](ref)}</p>
        <p><strong>${client_notify_i18n_1.PACK_ACTIVE.nextStepsTitle[lang]}</strong></p>
        <ul>
          <li>${client_notify_i18n_1.PACK_ACTIVE.step1[lang]}</li>
          <li>${client_notify_i18n_1.PACK_ACTIVE.step2[lang]}</li>
          <li>${client_notify_i18n_1.PACK_ACTIVE.step3[lang]}</li>
        </ul>
        <a href="${this.webUrl()}/portal" class="cta">${client_notify_i18n_1.PACK_ACTIVE.ctaPortal[lang]}</a>
        <p class="footer-note">${client_notify_i18n_1.SHELL.refDossier[lang]} : <code>${opts.dossierId}</code></p>
      `,
        });
        await this.send(opts.to, subject, html);
    }
    async rapportPret(opts) {
        const lang = (0, client_notify_i18n_1.normalizeLang)(opts.lang);
        const subject = client_notify_i18n_1.RAPPORT_PRET.subject[lang];
        const reportUrl = `${this.webUrl()}/${opts.porteType.toLowerCase()}/dossiers/${opts.dossierId}/rapport`;
        const name = opts.reportName ? this.esc(opts.reportName) : opts.porteType;
        const html = this.shell(lang, {
            title: client_notify_i18n_1.RAPPORT_PRET.title[lang],
            preheader: client_notify_i18n_1.RAPPORT_PRET.preheader[lang],
            bodyHtml: `
        <p>${client_notify_i18n_1.DEMANDE_RECUE.hello[lang](opts.clientNom ? this.esc(opts.clientNom) : "")},</p>
        <p>${client_notify_i18n_1.RAPPORT_PRET.body[lang](name)}</p>
        <div class="cta-block">
          <a href="${reportUrl}" class="cta cta-pay">${client_notify_i18n_1.RAPPORT_PRET.ctaDownload[lang]}</a>
        </div>
        <div class="info-block">
          <p style="font-size:13px; color:#6b7280;">
            ${client_notify_i18n_1.RAPPORT_PRET.warningTitle[lang]} ${client_notify_i18n_1.RAPPORT_PRET.warningBody[lang]}
          </p>
        </div>
        <p class="footer-note">${client_notify_i18n_1.SHELL.refDossier[lang]} : <code>${opts.dossierId}</code></p>
      `,
        });
        await this.send(opts.to, subject, html);
    }
    // ── Helpers ──────────────────────────────────────────────────────────
    webUrl() {
        return process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
    }
    locale(lang) {
        return lang === "fr" ? "fr-MA" : lang === "ar" ? "ar-MA" : "en-MA";
    }
    esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c] || c);
    }
    shell(lang, opts) {
        const dir = client_notify_i18n_1.DIR[lang];
        const htmlLang = client_notify_i18n_1.HTML_LANG[lang];
        return `<!doctype html>
<html lang="${htmlLang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;" dir="${dir}">
<div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);padding:24px 32px;text-align:center;">
            <div style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">${client_notify_i18n_1.SHELL.brand[lang]}</div>
            <div style="color:#bfdbfe;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;">${client_notify_i18n_1.SHELL.tagline[lang]}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;color:#1f2937;font-size:15px;line-height:1.65;" dir="${dir}">
            <h1 style="margin:0 0 20px;font-size:22px;color:#1e3a8a;font-weight:700;">${opts.title}</h1>
            <style>
              .cta { display:inline-block; padding:13px 24px; background:#1d4ed8; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600; margin:6px 4px; font-size:14px; }
              .cta-pay { background:#dc2626; }
              .cta-block { margin:20px 0; padding:18px 20px; background:#f9fafb; border-radius:6px; border-${dir === "rtl" ? "right" : "left"}:3px solid #1d4ed8; }
              .info-block { background:#fef3c7; border-${dir === "rtl" ? "right" : "left"}:3px solid #f59e0b; padding:14px 18px; border-radius:6px; margin:16px 0; font-size:13px; }
              .success-block { background:#d1fae5; border-${dir === "rtl" ? "right" : "left"}:3px solid #10b981; padding:14px 18px; border-radius:6px; margin:16px 0; }
              .footer-note { color:#9ca3af; font-size:11px; margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; }
              code { background:#f3f4f6; padding:2px 6px; border-radius:3px; font-size:12px; color:#6b7280; }
              a { color:#1d4ed8; }
              ul { padding-${dir === "rtl" ? "right" : "left"}:20px; padding-${dir === "rtl" ? "left" : "right"}:0; }
              ul li { margin:4px 0; }
            </style>
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 36px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;">
            ${client_notify_i18n_1.SHELL.footerLine[lang]}<br/>
            ${client_notify_i18n_1.SHELL.footerNote[lang]} <a href="mailto:contact@citurbarea.ma" style="color:#9ca3af;">contact@citurbarea.ma</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
    }
    async send(to, subject, html) {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            this.logger.warn(`[ClientNotify] SMTP non configuré — email à ${to} non envoyé. Configurer SMTP_HOST/SMTP_USER/SMTP_PASS.`);
            return;
        }
        if (!to || !to.includes("@") || to.endsWith(".unknown") || to.endsWith(".local")) {
            this.logger.warn(`[ClientNotify] Adresse email invalide ou test (${to}) — non envoyé`);
            return;
        }
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
                from: `"CITURBAREA" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`[ClientNotify] Email "${subject}" envoyé à ${to}`);
        }
        catch (e) {
            this.logger.error(`[ClientNotify] Erreur envoi à ${to}: ${e?.message}`);
        }
    }
};
exports.ClientNotifyService = ClientNotifyService;
exports.ClientNotifyService = ClientNotifyService = ClientNotifyService_1 = __decorate([
    (0, common_1.Injectable)()
], ClientNotifyService);
