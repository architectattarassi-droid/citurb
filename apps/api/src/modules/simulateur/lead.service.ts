import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Lead } from "@prisma/client";
import { PrismaService } from "../../tomes/tome-at";
import type { EstimationInput } from "./estimation-publique.service";

/**
 * LeadService — capture & cycle de vie des leads du simulateur de coût.
 *
 * Conformité : le consentement explicite est stocké ; la désinscription
 * (unsubscribed=true) arrête immédiatement toute relance (cf. NurtureService).
 * À la création d'un dossier, le lead bascule en CONVERTED (relances stoppées).
 *
 * Émet l'event `lead.created` (bus EventEmitter2) → écouté par
 * LeadNotifyListener (Telegram + mail à l'owner, réutilise le module monitoring).
 */

export interface LeadCaptureInput {
  nom: string;
  telephone: string;
  email: string;
  consentement: boolean;
  typeProjet: string;
  ville: string;
  paramsProjet: EstimationInput | Record<string, unknown>;
  estimationMin?: number;
  estimationMax?: number;
  source?: string;
}

export interface LeadCreatedEvent {
  leadId: string;
  nom: string;
  telephone: string;
  email: string;
  typeProjet: string;
  ville: string;
  estimationMin?: number | null;
  estimationMax?: number | null;
  paramsProjet: unknown;
  source: string;
}

@Injectable()
export class LeadService {
  private readonly log = new Logger("LeadService");

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async capture(input: LeadCaptureInput): Promise<Lead> {
    const nom = (input.nom || "").trim();
    const telephone = (input.telephone || "").trim();
    const email = (input.email || "").trim().toLowerCase();
    if (!nom) throw new BadRequestException("nom requis");
    if (!telephone) throw new BadRequestException("téléphone requis");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException("email invalide");
    }

    const lead = await this.prisma.lead.create({
      data: {
        nom,
        telephone,
        email,
        consentement: !!input.consentement,
        typeProjet: String(input.typeProjet || "PARTICULIER"),
        ville: String(input.ville || ""),
        paramsProjet: (input.paramsProjet ?? {}) as object,
        estimationMin: numOrNull(input.estimationMin),
        estimationMax: numOrNull(input.estimationMax),
        source: input.source || "SIMULATEUR_COUT_CONSTRUCTION",
      },
    });

    // Event découplé → notif Telegram + mail à l'owner (jamais bloquant).
    const payload: LeadCreatedEvent = {
      leadId: lead.id,
      nom: lead.nom,
      telephone: lead.telephone,
      email: lead.email,
      typeProjet: lead.typeProjet,
      ville: lead.ville,
      estimationMin: lead.estimationMin,
      estimationMax: lead.estimationMax,
      paramsProjet: lead.paramsProjet,
      source: lead.source,
    };
    try {
      this.events.emit("lead.created", payload);
    } catch (e: any) {
      this.log.warn(`[Lead] emit lead.created failed: ${e?.message}`);
    }

    return lead;
  }

  /** Désinscription 1-clic via token opaque. Idempotent. */
  async unsubscribeByToken(token: string): Promise<{ ok: boolean; alreadyDone?: boolean }> {
    const t = (token || "").trim();
    if (!t) throw new BadRequestException("token requis");
    const lead = await this.prisma.lead.findUnique({ where: { unsubscribeToken: t } });
    if (!lead) return { ok: false };
    if (lead.unsubscribed) return { ok: true, alreadyDone: true };
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { unsubscribed: true, nurtureStatus: "STOPPED" },
    });
    this.log.log(`[Lead] désinscription ${lead.id} (${lead.email})`);
    return { ok: true };
  }

  /**
   * Marque un lead converti (dossier créé) → relances stoppées.
   * Appelé par le bridge devis quand un lead transforme en dossier.
   */
  async markConverted(leadId: string, dossierId: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { dossierCree: true, dossierId, nurtureStatus: "CONVERTED" },
    });
    this.log.log(`[Lead] ${leadId} converti → dossier ${dossierId}`);
  }

  get(id: string) {
    return this.prisma.lead.findUnique({ where: { id } });
  }
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}
