import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";
import { ClientNotifyService } from "../../modules/client-notify/client-notify.service";
import { OwnerNotifyService } from "../../modules/owner-notify/owner-notify.service";

/**
 * PackValidationService — workflow de validation admin des packs achetés
 *
 * Doctrine T1: paiement → entitlements unlock, mais le user impose:
 *  "chaque pack n'est valide que par validation admin"
 *
 * Workflow:
 *   PENDING_PAYMENT → PAYMENT_RECEIVED → PENDING_ADMIN_VALIDATION → ACTIVATED
 *                                                                ↘ REVOKED (admin)
 *
 * Stocké dans Dossier.payload.packValidation (no schema migration).
 */

export type PackValidationStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_RECEIVED"
  | "PENDING_ADMIN_VALIDATION"
  | "ACTIVATED"
  | "REVOKED";

export type PackValidationState = {
  status: PackValidationStatus;
  paidAt?: string;
  paymentRef?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  validatedAt?: string;
  validatedBy?: string;
  validationNote?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  history: { ts: string; status: PackValidationStatus; author: string; note?: string }[];
};

@Injectable()
export class PackValidationService {
  private readonly logger = new Logger(PackValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientNotify: ClientNotifyService,
    private readonly ownerNotify: OwnerNotifyService,
  ) {}

  async getState(dossierId: string): Promise<PackValidationState> {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { payload: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    return payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
  }

  /**
   * Appelé par Stripe webhook OU par admin (manual mark as paid).
   */
  async handlePaymentReceived(opts: { dossierId: string; paymentRef: string; amount: number; currency?: string; author: string }) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: opts.dossierId },
      select: { payload: true, clientEmail: true, clientNom: true, porteType: true, title: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const prev: PackValidationState = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
    const now = new Date().toISOString();

    const next: PackValidationState = {
      ...prev,
      status: "PENDING_ADMIN_VALIDATION",
      paidAt: now,
      paymentRef: opts.paymentRef,
      paymentAmount: opts.amount,
      paymentCurrency: opts.currency ?? "MAD",
      history: [
        ...(prev.history ?? []),
        { ts: now, status: "PAYMENT_RECEIVED", author: opts.author, note: `Paiement ${opts.amount} ${opts.currency ?? "MAD"} (ref: ${opts.paymentRef})` },
        { ts: now, status: "PENDING_ADMIN_VALIDATION", author: "system", note: "En attente de validation admin" },
      ],
    };

    payload.packValidation = next;
    await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
    this.logger.log(`[PackValidation] ${opts.dossierId} → PENDING_ADMIN_VALIDATION (paid ${opts.amount} ${opts.currency})`);

    // Email confirmation paiement au client (fire-and-forget) — langue du dossier
    if (dossier.clientEmail) {
      this.clientNotify.paiementRecu({
        to: dossier.clientEmail,
        dossierId: opts.dossierId,
        amount: opts.amount,
        currency: opts.currency,
        paymentRef: opts.paymentRef,
        clientNom: dossier.clientNom ?? undefined,
        lang: this.readLang(payload),
      }).catch(() => {});
    }
    // Notif owner: nouveau pack à valider
    this.ownerNotify.notify("PAYMENT_RECEIVED", {
      amount: opts.amount,
      currency: opts.currency ?? "MAD",
      porteType: dossier.porteType,
      clientNom: dossier.clientNom,
      email: dossier.clientEmail,
      dossierId: opts.dossierId,
      title: dossier.title,
    }).catch(() => {});
    return next;
  }

  /**
   * Admin valide le pack (clique "Valider le pack" dans backoffice).
   * Doctrine: nécessaire avant activation du dossier.
   */
  async adminValidate(opts: { dossierId: string; author: string; note?: string }) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: opts.dossierId },
      select: { payload: true, clientEmail: true, clientNom: true, porteType: true, title: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const prev: PackValidationState = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
    const now = new Date().toISOString();

    if (prev.status === "ACTIVATED") {
      throw new Error("Pack déjà activé");
    }

    const next: PackValidationState = {
      ...prev,
      status: "ACTIVATED",
      validatedAt: now,
      validatedBy: opts.author,
      validationNote: opts.note,
      history: [
        ...(prev.history ?? []),
        { ts: now, status: "ACTIVATED", author: opts.author, note: opts.note ?? "Pack validé par admin" },
      ],
    };

    payload.packValidation = next;
    await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
    this.logger.log(`[PackValidation] ${opts.dossierId} → ACTIVATED by ${opts.author}`);

    // Email pack activé (fire-and-forget) — langue du dossier
    if (dossier.clientEmail) {
      this.clientNotify.packActive({
        to: dossier.clientEmail,
        dossierId: opts.dossierId,
        porteType: dossier.porteType ?? "—",
        title: dossier.title ?? undefined,
        clientNom: dossier.clientNom ?? undefined,
        lang: this.readLang(payload),
      }).catch(() => {});
    }
    return next;
  }

  /**
   * Admin révoque (issue détectée post-validation).
   */
  async adminRevoke(opts: { dossierId: string; author: string; reason: string }) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: opts.dossierId },
      select: { payload: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const prev: PackValidationState = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
    const now = new Date().toISOString();

    const next: PackValidationState = {
      ...prev,
      status: "REVOKED",
      revokedAt: now,
      revokedBy: opts.author,
      revokedReason: opts.reason,
      history: [
        ...(prev.history ?? []),
        { ts: now, status: "REVOKED", author: opts.author, note: opts.reason },
      ],
    };

    payload.packValidation = next;
    await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
    return next;
  }

  /** Langue persistée dans Dossier.payload.lang (alimentée par le wizard). */
  private readLang(payload: any): "fr" | "en" | "ar" {
    const v = String(payload?.lang ?? "").toLowerCase();
    return v === "en" || v === "ar" ? (v as "en" | "ar") : "fr";
  }

  /**
   * Liste les dossiers en attente de validation admin (backoffice).
   */
  async listPending(opts: { take?: number } = {}) {
    const dossiers = await this.prisma.dossier.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.take ?? 50, 200),
      select: {
        id: true, createdAt: true, title: true, commune: true,
        clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
        porteType: true, payload: true,
      },
    });
    return dossiers
      .map(d => {
        const pv = (d.payload as any)?.packValidation as PackValidationState | undefined;
        return { dossier: d, packValidation: pv ?? null };
      })
      .filter(x => x.packValidation?.status === "PENDING_ADMIN_VALIDATION");
  }
}
