import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { OpciTokeniseService, OfferingStatus } from "./opci-tokenise.service";

/**
 * OpciTokeniseController — OPCI tokenisé (Tome 4).
 * Listing public ; souscription + portfolio JWT-gated ; audit AMMC public.
 */
@Tome("tome4")
@Controller("api/opci-tokenise")
export class OpciTokeniseController {
  constructor(private readonly svc: OpciTokeniseService) {}
  private uid(req: any): string { return req?.user?.id || req?.user?.sub || req?.user?.userId; }

  @Get("offerings")
  offerings(@Query("status") status?: OfferingStatus) {
    return { ok: true, offerings: this.svc.listOfferings(status) };
  }

  @Get("offering/:id")
  offering(@Param("id") id: string) {
    const o = this.svc.getOffering(id);
    return o ? { ok: true, offering: o } : { ok: false, error: "Offering introuvable" };
  }

  @Post("offering/:id/souscription")
  @UseGuards(JwtAuthGuard)
  async souscrire(@Param("id") id: string, @Body() body: { nbParts: number }, @Req() req: any) {
    const sub = await this.svc.souscrire(id, this.uid(req), body.nbParts);
    return { ok: true, souscription: sub };
  }

  @Get("portfolio")
  @UseGuards(JwtAuthGuard)
  portfolio(@Req() req: any) {
    return { ok: true, portfolio: this.svc.portfolio(this.uid(req)) };
  }

  @Get("offering/:id/audit-ammc")
  auditAmmc(@Param("id") id: string) {
    return { ok: true, audit: this.svc.auditAmmc(id) };
  }
}
