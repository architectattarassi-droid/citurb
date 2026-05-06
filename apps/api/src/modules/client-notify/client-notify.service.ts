import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

/**
 * ClientNotifyService — emails transactionnels destinés au CLIENT.
 *
 * (Différent de OwnerNotifyService qui alerte l'owner CITURBAREA des nouveaux
 * leads/dossiers/incidents.)
 *
 * 4 templates:
 *  1. demandeRecue     — après /p2/intake : confirmation + lien paiement
 *  2. paiementRecu     — après webhook Stripe ou mark-paid manuel
 *  3. packActive       — après admin clic "Valider le pack"
 *  4. rapportPret      — admin notifie manuellement quand le rapport P4/P5 est prêt
 *
 * Configuration:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Gmail recommended)
 *   PUBLIC_WEB_URL (pour les liens absolus)
 *
 * Si SMTP non configuré → log only (no crash, no error to caller).
 */

@Injectable()
export class ClientNotifyService {
  private readonly logger = new Logger(ClientNotifyService.name);

  async demandeRecue(opts: {
    to: string;
    porteType: string;
    dossierId: string;
    clientNom?: string;
    title?: string;
  }): Promise<void> {
    const subject = `✓ Votre demande ${opts.porteType} est bien reçue — CITURBAREA`;
    const html = this.shell({
      title: "Votre demande est reçue",
      preheader: `Référence dossier : ${opts.dossierId.slice(0, 12)}…`,
      bodyHtml: `
        <p>Bonjour ${opts.clientNom ? this.esc(opts.clientNom) : ""},</p>
        <p>Nous avons bien reçu votre demande <strong>${this.esc(opts.porteType)}</strong> sur la plateforme CITURBAREA.</p>
        ${opts.title ? `<p><strong>Projet :</strong> ${this.esc(opts.title)}</p>` : ""}
        <div class="cta-block">
          <p>Pour accéder à votre tableau de bord et procéder au paiement :</p>
          <a href="${this.webUrl()}/portal" class="cta">📁 Mes dossiers</a>
          <a href="${this.webUrl()}/payment/start?dossier=${opts.dossierId}" class="cta cta-pay">💳 Payer maintenant</a>
        </div>
        <p>Notre équipe vous recontacte sous 24h ouvrables si vous avez besoin d'assistance.</p>
        <p class="footer-note">Référence dossier : <code>${opts.dossierId}</code></p>
      `,
    });
    await this.send(opts.to, subject, html);
  }

  async paiementRecu(opts: {
    to: string;
    dossierId: string;
    amount: number;
    currency?: string;
    paymentRef?: string;
    clientNom?: string;
  }): Promise<void> {
    const subject = `💰 Paiement reçu — CITURBAREA`;
    const html = this.shell({
      title: "Paiement bien reçu",
      preheader: `${opts.amount} ${opts.currency ?? "MAD"} · Validation admin sous 24h`,
      bodyHtml: `
        <p>Bonjour ${opts.clientNom ? this.esc(opts.clientNom) : ""},</p>
        <p>Nous avons bien reçu votre paiement de <strong style="color:#34d399; font-size:18px;">${opts.amount.toLocaleString("fr-MA")} ${opts.currency ?? "MAD"}</strong>.</p>
        ${opts.paymentRef ? `<p style="color:#6b7280; font-size:13px;">Référence transaction : <code>${this.esc(opts.paymentRef)}</code></p>` : ""}
        <div class="cta-block info-block">
          <p>📋 <strong>Prochaine étape :</strong> validation administrative</p>
          <p>Notre équipe valide votre pack <strong>sous 24h ouvrables</strong>. Vous recevrez un email dès que votre pack sera activé et accessible.</p>
        </div>
        <p>Vous pouvez suivre le statut dans votre tableau de bord :</p>
        <a href="${this.webUrl()}/portal" class="cta">📁 Mes dossiers</a>
        <p class="footer-note">Référence dossier : <code>${opts.dossierId}</code></p>
      `,
    });
    await this.send(opts.to, subject, html);
  }

  async packActive(opts: {
    to: string;
    dossierId: string;
    porteType: string;
    title?: string;
    clientNom?: string;
  }): Promise<void> {
    const subject = `✅ Votre pack ${opts.porteType} est activé — CITURBAREA`;
    const html = this.shell({
      title: "Pack activé !",
      preheader: "Votre dossier est désormais opérationnel",
      bodyHtml: `
        <p>Bonjour ${opts.clientNom ? this.esc(opts.clientNom) : ""},</p>
        <div class="cta-block success-block">
          <p style="font-size:20px; margin:0;">🎉 <strong>Votre pack ${this.esc(opts.porteType)} est activé !</strong></p>
        </div>
        <p>Votre dossier <strong>${opts.title ? this.esc(opts.title) : opts.dossierId.slice(0, 12)}</strong> est maintenant opérationnel et notre équipe peut commencer à travailler dessus.</p>
        <p><strong>Prochaines étapes :</strong></p>
        <ul>
          <li>Notre équipe vous contactera dans les 48h pour démarrer la mission</li>
          <li>Vous recevrez régulièrement des mises à jour sur l'avancement</li>
          <li>Vous pouvez consulter le statut à tout moment dans votre espace</li>
        </ul>
        <a href="${this.webUrl()}/portal" class="cta">📁 Accéder à mes dossiers</a>
        <p class="footer-note">Référence dossier : <code>${opts.dossierId}</code></p>
      `,
    });
    await this.send(opts.to, subject, html);
  }

  async rapportPret(opts: {
    to: string;
    dossierId: string;
    porteType: "P4" | "P5";
    reportName?: string;
    clientNom?: string;
  }): Promise<void> {
    const subject = `📄 Votre rapport est prêt — CITURBAREA`;
    const reportUrl = `${this.webUrl()}/${opts.porteType.toLowerCase()}/dossiers/${opts.dossierId}/rapport`;
    const html = this.shell({
      title: "Votre rapport est disponible",
      preheader: "Téléchargement immédiat depuis votre espace",
      bodyHtml: `
        <p>Bonjour ${opts.clientNom ? this.esc(opts.clientNom) : ""},</p>
        <p>Votre rapport <strong>${opts.reportName ? this.esc(opts.reportName) : opts.porteType}</strong> a été finalisé par notre expert et est prêt à être téléchargé.</p>
        <div class="cta-block">
          <a href="${reportUrl}" class="cta cta-pay">📄 Télécharger le rapport</a>
        </div>
        <div class="info-block">
          <p style="font-size:13px; color:#6b7280;">
            <strong>📌 Important :</strong> le rapport est marqué d'un filigrane "Rapport exclusif CITURBAREA — utilisable sur autorisation écrite". Il est destiné à votre usage exclusif. Toute reproduction ou transmission à un tiers nécessite une autorisation écrite préalable.
          </p>
        </div>
        <p class="footer-note">Référence dossier : <code>${opts.dossierId}</code></p>
      `,
    });
    await this.send(opts.to, subject, html);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private webUrl(): string {
    return process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
  }

  private esc(s: string): string {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c] || c);
  }

  private shell(opts: { title: string; preheader: string; bodyHtml: string }): string {
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);padding:24px 32px;text-align:center;">
            <div style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">CITURBAREA</div>
            <div style="color:#bfdbfe;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;">Plateforme architecturale</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;color:#1f2937;font-size:15px;line-height:1.65;">
            <h1 style="margin:0 0 20px;font-size:22px;color:#1e3a8a;font-weight:700;">${opts.title}</h1>
            <style>
              .cta { display:inline-block; padding:13px 24px; background:#1d4ed8; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600; margin:6px 4px; font-size:14px; }
              .cta-pay { background:#dc2626; }
              .cta-block { margin:20px 0; padding:18px 20px; background:#f9fafb; border-radius:6px; border-left:3px solid #1d4ed8; }
              .info-block { background:#fef3c7; border-left:3px solid #f59e0b; padding:14px 18px; border-radius:6px; margin:16px 0; font-size:13px; }
              .success-block { background:#d1fae5; border-left:3px solid #10b981; padding:14px 18px; border-radius:6px; margin:16px 0; }
              .footer-note { color:#9ca3af; font-size:11px; margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; }
              code { background:#f3f4f6; padding:2px 6px; border-radius:3px; font-size:12px; color:#6b7280; }
              a { color:#1d4ed8; }
              ul { padding-left:20px; }
              ul li { margin:4px 0; }
            </style>
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 36px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;">
            CITURBAREA · Plateforme d'orchestration architecturale au Maroc<br/>
            Cet email vous est envoyé automatiquement, vous pouvez répondre directement à <a href="mailto:contact@citurbarea.ma" style="color:#9ca3af;">contact@citurbarea.ma</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
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
    } catch (e: any) {
      this.logger.error(`[ClientNotify] Erreur envoi à ${to}: ${e?.message}`);
    }
  }
}
