import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EmailService } from "../email/email.service";
import { TelegramService } from "./telegram.service";

/**
 * NotificationsService — notifications instantanées multi-canal (Email + Telegram)
 * sur création de dossier.
 *
 * Architecture event-driven : ce service ÉCOUTE l'event `owner.DOSSIER_CREATED`
 * (ré-émis par OwnerNotifyService, point de déclenchement unique déjà existant et
 * commun aux 3 chemins de création : DossierService.create, /p2/intake, admin).
 * La logique dossier reste totalement découplée — elle ne connaît pas ce service.
 *
 * Garanties :
 *  - Idempotent : pas de double notif sur retry (clé = dossierId, cache borné).
 *  - try/catch PAR canal : un échec Telegram n'empêche pas l'email et inversement.
 *  - Flags : NOTIFY_EMAIL_ENABLED / NOTIFY_TELEGRAM_ENABLED (défaut: activés).
 *
 * Note : l'email réutilise EmailService (cascade Resend → SMTP → log), qui remplit
 * déjà le rôle du "MailService" demandé (détection Resend/SMTP automatique).
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger("NotificationsService");
  // Cache d'idempotence borné (process-local) : dossierIds déjà notifiés.
  private readonly seen = new Set<string>();
  private static readonly SEEN_CAP = 5000;

  constructor(
    private readonly email: EmailService,
    private readonly telegram: TelegramService,
  ) {}

  private flag(name: string): boolean {
    // Défaut activé : seul "false"/"0"/"no" désactive.
    const v = (process.env[name] ?? "").trim().toLowerCase();
    return !["false", "0", "no", "off"].includes(v);
  }

  private markSeen(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > NotificationsService.SEEN_CAP) {
      // Évince le plus ancien (ordre d'insertion garanti par Set).
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    return true;
  }

  private opsLink(dossierId: string): string {
    const base = (process.env.OPS_BASE_URL || "http://localhost:5173/ops").replace(/\/+$/, "");
    return `${base}/dossiers/${dossierId}`;
  }

  /** Écoute l'event de création de dossier (ré-émis par OwnerNotifyService). */
  @OnEvent("owner.DOSSIER_CREATED", { async: true, promisify: true })
  async onDossierCreated(meta: Record<string, any> = {}): Promise<void> {
    const dossierId = String(meta.dossierId || "").trim();
    // Clé d'idempotence : dossierId si dispo, sinon empreinte du payload.
    const key = dossierId || `nokey:${JSON.stringify(meta)}`;
    if (!this.markSeen(key)) {
      this.log.debug(`[Notif] dossier ${key} déjà notifié — skip (idempotence)`);
      return;
    }

    const payload = this.buildPayload(meta);
    // Chaque canal isolé : un échec ne propage pas et ne bloque pas l'autre.
    await Promise.allSettled([
      this.notifyTelegram(payload),
      this.notifyEmail(payload),
    ]);
  }

  // ── Composition ───────────────────────────────────────────────

  private buildPayload(meta: Record<string, any>) {
    const dossierId = String(meta.dossierId || "").trim();
    const date = new Date().toLocaleString("fr-MA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Casablanca",
    });
    return {
      dossierId,
      title: String(meta.title || "Dossier"),
      projet: String(meta.packSelected || meta.porteType || meta.projectType || "—"),
      ville: String(meta.commune || meta.ville || "—"),
      client: String(meta.clientNom || meta.clientEmail || meta.email || "—"),
      tel: String(meta.clientTel || meta.tel || ""),
      date,
      link: dossierId ? this.opsLink(dossierId) : null,
    };
  }

  // ── Canal Telegram ────────────────────────────────────────────

  private async notifyTelegram(p: ReturnType<NotificationsService["buildPayload"]>) {
    if (!this.flag("NOTIFY_TELEGRAM_ENABLED")) return;
    try {
      const lines = [
        "📁 <b>Nouveau dossier CITURBAREA</b>",
        "",
        `<b>Titre :</b> ${esc(p.title)}`,
        `<b>Projet :</b> ${esc(p.projet)}`,
        `<b>Ville :</b> ${esc(p.ville)}`,
        `<b>Client :</b> ${esc(p.client)}${p.tel ? ` (${esc(p.tel)})` : ""}`,
        `<b>Date :</b> ${esc(p.date)}`,
      ];
      if (p.link) lines.push("", `🔗 <a href="${esc(p.link)}">Ouvrir la fiche OPS</a>`);
      const r = await this.telegram.sendMessage(lines.join("\n"), "HTML");
      if (!r.ok && !r.skipped) this.log.warn(`[Notif] Telegram échec: ${r.error}`);
    } catch (e: any) {
      this.log.error(`[Notif] Telegram exception: ${e?.message}`);
    }
  }

  // ── Canal Email ───────────────────────────────────────────────

  private async notifyEmail(p: ReturnType<NotificationsService["buildPayload"]>) {
    if (!this.flag("NOTIFY_EMAIL_ENABLED")) return;
    const to =
      process.env.NOTIFY_EMAIL_TO ||
      process.env.OWNER_EMAIL ||
      process.env.LEAD_NOTIFY_TO ||
      process.env.ALERT_EMAIL_TO ||
      "";
    if (!to) {
      this.log.warn("[Notif] Email skip — aucun destinataire (NOTIFY_EMAIL_TO/OWNER_EMAIL…)");
      return;
    }
    try {
      const rows: Array<[string, string]> = [
        ["Titre", p.title],
        ["Projet", p.projet],
        ["Ville", p.ville],
        ["Client", p.tel ? `${p.client} (${p.tel})` : p.client],
        ["Date", p.date],
      ];
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#0B1B3A;margin:0 0 16px;">📁 Nouveau dossier CITURBAREA</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            ${rows
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:6px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">${esc(k)}</td><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #e2e8f0;">${esc(v)}</td></tr>`,
              )
              .join("")}
          </table>
          ${
            p.link
              ? `<p style="margin:20px 0;"><a href="${esc(p.link)}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Ouvrir la fiche OPS</a></p>`
              : ""
          }
        </div>`;
      const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (p.link ? `\n\nFiche OPS: ${p.link}` : "");
      const r = await this.email.send({
        to,
        subject: `📁 Nouveau dossier — ${p.title} (${p.ville})`,
        html,
        text,
      });
      if (!r.ok) this.log.warn(`[Notif] Email échec: ${r.error}`);
    } catch (e: any) {
      this.log.error(`[Notif] Email exception: ${e?.message}`);
    }
  }
}

/** Échappe le HTML (Telegram HTML + email) pour des valeurs utilisateur. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
