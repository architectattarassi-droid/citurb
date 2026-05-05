import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tome-5/auth/roles.guard";
import { Roles } from "../tome-5/auth/roles.decorator";
import { PackValidationService } from "./pack-validation.service";

/**
 * PackValidationController — API admin pour la workflow de validation des packs.
 *
 * Endpoints (tous sous /api/cc/pack-validation, auth ADMIN/OWNER/OPS):
 *  GET  pending                       → liste des dossiers en attente de validation
 *  GET  :dossierId                    → état détaillé pour un dossier
 *  POST :dossierId/mark-paid          → marquer paiement reçu manuellement (cas hors Stripe)
 *  PATCH :dossierId/validate          → valider le pack (admin clique "Activer")
 *  PATCH :dossierId/revoke            → révoquer (issue détectée)
 */
@Tome("tome1")
@Controller("api/cc/pack-validation")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackValidationController {
  constructor(private readonly svc: PackValidationService) {}

  @Get("pending")
  @Roles("ADMIN", "OWNER", "OPS")
  async listPending(@Query("take") take?: string) {
    const items = await this.svc.listPending({ take: take ? +take : 50 });
    return { ok: true, items };
  }

  @Get(":dossierId")
  @Roles("ADMIN", "OWNER", "OPS", "CLIENT")
  async get(@Param("dossierId") id: string) {
    return { ok: true, packValidation: await this.svc.getState(id) };
  }

  @Post(":dossierId/mark-paid")
  @Roles("ADMIN", "OWNER", "OPS")
  async markPaid(
    @Param("dossierId") id: string,
    @Body() body: { paymentRef?: string; amount: number; currency?: string },
    @Req() req: any,
  ) {
    const author = req.user?.email || req.user?.userId || "admin";
    const state = await this.svc.handlePaymentReceived({
      dossierId: id,
      paymentRef: body.paymentRef ?? `MANUAL-${Date.now()}`,
      amount: Number(body.amount),
      currency: body.currency,
      author,
    });
    return { ok: true, packValidation: state };
  }

  @Patch(":dossierId/validate")
  @Roles("ADMIN", "OWNER")
  async validate(
    @Param("dossierId") id: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const author = req.user?.email || req.user?.userId || "admin";
    const state = await this.svc.adminValidate({ dossierId: id, author, note: body.note });
    return { ok: true, packValidation: state };
  }

  @Patch(":dossierId/revoke")
  @Roles("ADMIN", "OWNER")
  async revoke(
    @Param("dossierId") id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const author = req.user?.email || req.user?.userId || "admin";
    const state = await this.svc.adminRevoke({ dossierId: id, author, reason: body.reason });
    return { ok: true, packValidation: state };
  }
}
