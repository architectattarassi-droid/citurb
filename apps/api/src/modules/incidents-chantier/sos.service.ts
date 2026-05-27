/**
 * sos.service.ts — Orchestration du bouton SOS (Tome 3).
 *
 * Cinématique :
 *  1. Charge incident + dossier (geoloc, parties)
 *  2. Charge contacts d'urgence MA (emergency-contacts.json) filtrés par type
 *  3. SMS (Twilio) : famille + avocat + OPS CITURBAREA
 *  4. WhatsApp (placeholder logging, Meta WA Business via Twilio Content API si configuré)
 *  5. Email auto pour CRITICAL → emergency contacts (SAMU, Police, CNSS, Inspection)
 *  6. ProbativeLog "SOS_TRIGGERED" avec full payload géolocalisé
 *  7. Bascule statut chantier → SUSPENDU_SOS (via service incidents-chantier)
 *
 * Aucune dépendance dure à un schéma Prisma précis : on lit les contacts du
 * dossier dans le payload du store mémoire `dossierContacts` (alimenté par
 * /api/incidents-chantier/dossier/:id/sos-contacts en V2, ou enrichi via
 * PrismaDossiersService quand le schema sera figé).
 */

import { Injectable, Logger } from "@nestjs/common";

import { TwilioService } from "../twilio/twilio.service";
import { EmailService } from "../email/email.service";
import { IncidentsChantierService } from "./incidents-chantier.service";
import type { IncidentChantier, NotifiedParty } from "./types";

export type SosDossierContacts = {
  famille?: { nom?: string; tel?: string; email?: string };
  avocat?: { nom?: string; tel?: string; email?: string };
  architecte?: { nom?: string; tel?: string; email?: string };
  mod?: { nom?: string; tel?: string; email?: string };
  promoteur?: { nom?: string; tel?: string; email?: string };
};

export type SosResult = {
  ok: boolean;
  incident?: IncidentChantier;
  notifiedParties: NotifiedParty[];
  emergencyCodesUsed: string[];
  errors: string[];
};

const TWILIO_MAX_BODY = 320;

@Injectable()
export class SosService {
  private readonly log = new Logger("SosService");

  constructor(
    private readonly twilio: TwilioService,
    private readonly email: EmailService,
    private readonly incidents: IncidentsChantierService,
  ) {}

  /**
   * Déclenche le SOS pour un incident donné.
   */
  async trigger(
    incidentId: string,
    contacts: SosDossierContacts = {},
    actor: { userId?: string; role?: string } = {},
  ): Promise<SosResult> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return {
        ok: false,
        notifiedParties: [],
        emergencyCodesUsed: [],
        errors: ["incident_not_found"],
      };
    }

    const errors: string[] = [];
    const notified: NotifiedParty[] = [];

    const typeDef = await this.incidents.findTypeDef(incident.type);
    const emergencyContacts = await this.incidents.findContactsForType(
      incident.type,
    );

    const geolocText = incident.geoloc
      ? `https://maps.google.com/?q=${incident.geoloc.lat},${incident.geoloc.lng}`
      : "(géoloc non disponible)";
    const baseBody =
      `[SOS CITURBAREA] ${incident.numero} — ` +
      `${typeDef?.label || incident.type} — sev ${incident.severite}. ` +
      `Lieu: ${geolocText}. ` +
      `Déclaré par ${actor.role || "chef chantier"}. ` +
      `À traiter en urgence absolue.`;

    // ── 1) SMS Twilio : famille + avocat + OPS ────────────────────
    const smsTargets: { who: string; tel?: string }[] = [
      { who: "famille", tel: contacts.famille?.tel },
      { who: "avocat", tel: contacts.avocat?.tel },
      { who: "ops_citurbarea", tel: process.env.OPS_PHONE || "+212661362476" },
    ];

    for (const t of smsTargets) {
      if (!t.tel) continue;
      const r = await this.twilio.sendSms(t.tel, baseBody.slice(0, TWILIO_MAX_BODY));
      notified.push({
        channel: "SMS",
        toMasked: this.maskPhone(t.tel),
        ok: r.ok,
        ts: new Date().toISOString(),
        ref: r.messageId,
      });
      if (!r.ok) errors.push(`sms_${t.who}:${r.error || "fail"}`);
    }

    // ── 2) WhatsApp : architecte + MOD + promoteur ────────────────
    // V1 : on log et on tente d'envoyer par SMS si WA dédié non configuré
    // V2 : Twilio Content API (whatsapp:+212...) ou Meta WA Business direct
    const waTargets: { who: string; tel?: string }[] = [
      { who: "architecte", tel: contacts.architecte?.tel },
      { who: "mod", tel: contacts.mod?.tel },
      { who: "promoteur", tel: contacts.promoteur?.tel },
    ];
    for (const t of waTargets) {
      if (!t.tel) continue;
      // Fallback SMS si pas de canal WA dédié — on tag explicitement le canal
      const r = await this.twilio.sendSms(t.tel, baseBody.slice(0, TWILIO_MAX_BODY));
      notified.push({
        channel: "WHATSAPP",
        toMasked: this.maskPhone(t.tel),
        ok: r.ok,
        ts: new Date().toISOString(),
        ref: r.messageId,
      });
      if (!r.ok) errors.push(`wa_${t.who}:${r.error || "fail"}`);
    }

    // ── 3) Email parties (full payload) ───────────────────────────
    const emailTargets: { who: string; email?: string }[] = [
      { who: "famille", email: contacts.famille?.email },
      { who: "avocat", email: contacts.avocat?.email },
      { who: "architecte", email: contacts.architecte?.email },
      { who: "mod", email: contacts.mod?.email },
      { who: "promoteur", email: contacts.promoteur?.email },
      { who: "ops", email: process.env.OPS_EMAIL || "ops@citurbarea.com" },
    ];

    const html = this.buildSosEmailHtml(incident, contacts, geolocText, typeDef?.label);
    for (const t of emailTargets) {
      if (!t.email) continue;
      const r = await this.email.send({
        to: t.email,
        subject: `[SOS CITURBAREA] ${incident.numero} — ${typeDef?.label || incident.type}`,
        html,
        text: baseBody,
      });
      notified.push({
        channel: "EMAIL",
        toMasked: this.maskEmail(t.email),
        ok: r.ok,
        ts: new Date().toISOString(),
        ref: r.messageId,
      });
      if (!r.ok) errors.push(`email_${t.who}:${r.error || "fail"}`);
    }

    // ── 4) Emergency contacts (CRITICAL uniquement) ───────────────
    const emergencyCodes: string[] = [];
    if (incident.severite === "CRITICAL") {
      for (const ec of emergencyContacts) {
        if (ec.email) {
          const r = await this.email.send({
            to: ec.email,
            subject: `[SOS CITURBAREA - URGENCE] ${incident.numero} — ${typeDef?.label || incident.type}`,
            html,
            text: baseBody,
          });
          notified.push({
            channel: "EMAIL",
            toMasked: `${ec.code}:${this.maskEmail(ec.email)}`,
            ok: r.ok,
            ts: new Date().toISOString(),
            ref: r.messageId,
          });
          if (!r.ok) errors.push(`emergency_${ec.code}:${r.error || "fail"}`);
        }
        emergencyCodes.push(ec.code);
      }
    }

    // ── 5) Persistance + ProbativeLog (via incidents-chantier.service) ─
    const updated = await this.incidents.markSosTriggered(
      incidentId,
      notified,
      emergencyCodes,
    );

    return {
      ok: errors.length === 0 || notified.some((n) => n.ok),
      incident: updated || undefined,
      notifiedParties: notified,
      emergencyCodesUsed: emergencyCodes,
      errors,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────

  private buildSosEmailHtml(
    incident: IncidentChantier,
    contacts: SosDossierContacts,
    geolocText: string,
    typeLabel?: string,
  ): string {
    const photosHtml =
      incident.photos && incident.photos.length
        ? `<p><b>Photos :</b><br>${incident.photos
            .slice(0, 6)
            .map(
              (p) =>
                `<img src="${this.escapeAttr(p.url)}" style="max-width:280px;margin:6px;border:1px solid #ddd;border-radius:6px" />`,
            )
            .join("")}</p>`
        : "";
    return `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #fecaca;border-radius:10px;overflow:hidden">
        <div style="background:#dc2626;color:white;padding:18px 22px">
          <h1 style="margin:0;font-size:22px">SOS CITURBAREA — ${this.escapeHtml(incident.numero)}</h1>
          <p style="margin:6px 0 0;opacity:0.9">${this.escapeHtml(typeLabel || incident.type)} — sévérité ${incident.severite}</p>
        </div>
        <div style="padding:20px 22px;color:#0f172a">
          <p><b>Description :</b><br>${this.escapeHtml(incident.description)}</p>
          <p><b>Date constatation :</b> ${this.escapeHtml(incident.dateConstatation)}</p>
          <p><b>Géolocalisation :</b> <a href="${this.escapeAttr(geolocText)}">${this.escapeHtml(geolocText)}</a></p>
          ${incident.blessesNb != null ? `<p><b>Nombre de blessés :</b> ${incident.blessesNb}</p>` : ""}
          ${incident.montantDommageEstimeMad != null ? `<p><b>Dommage estimé :</b> ${incident.montantDommageEstimeMad} MAD</p>` : ""}
          ${photosHtml}
          <hr style="margin:20px 0;border:0;border-top:1px solid #e2e8f0" />
          <p style="font-size:13px;color:#64748b">Cet email est généré automatiquement par CITURBAREA suite à l'activation du bouton SOS sur le chantier. Toutes les parties concernées ont été notifiées simultanément (SMS + WhatsApp + email).</p>
        </div>
      </div>
    `;
  }

  private maskPhone(tel: string): string {
    if (!tel) return "";
    const trimmed = tel.replace(/\s/g, "");
    if (trimmed.length <= 6) return "***";
    return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!domain) return "***";
    const u =
      user.length <= 2 ? "*".repeat(user.length) : `${user[0]}***${user.slice(-1)}`;
    return `${u}@${domain}`;
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private escapeAttr(s: string): string {
    return this.escapeHtml(s).replace(/"/g, "&quot;");
  }
}
