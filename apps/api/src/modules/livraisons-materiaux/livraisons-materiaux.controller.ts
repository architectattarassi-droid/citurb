/**
 * apps/api/src/modules/livraisons-materiaux/livraisons-materiaux.controller.ts
 *
 * Routes REST du module Livraisons Matériaux (Tome 5).
 * Toutes les mutations sont JWT-gated. Allow-list MutationGate : /api/livraisons.
 *
 * Endpoints :
 *  POST   /api/livraisons/commande
 *  GET    /api/livraisons/dossier/:dossierId
 *  GET    /api/livraisons/dossier/:dossierId/calendar?week=YYYY-WW
 *  GET    /api/livraisons/commande/:id           (via dossierId query)
 *  GET    /api/livraisons/commande/:id/audit
 *  POST   /api/livraisons/commande/:id/confirm-supplier
 *  POST   /api/livraisons/commande/:id/reject-supplier
 *  POST   /api/livraisons/commande/:id/livraison-prete
 *  POST   /api/livraisons/commande/:id/reception
 *  POST   /api/livraisons/commande/:id/anomalie
 */

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { Rule } from "../../tomes/tome-at/kernel/tome.decorators";
import { JwtAuthGuard } from "../../tomes/tome-at/security/jwt-auth.guard";
import { LivraisonsMateriauxService } from "./livraisons-materiaux.service";
import { AnomalieInput, CreateCommandeInput, ReceptionInput } from "./types";

@Tome("tome5")
@Controller("api/livraisons")
@UseGuards(JwtAuthGuard)
export class LivraisonsMateriauxController {
  constructor(private readonly svc: LivraisonsMateriauxService) {}

  private actor(req: any) {
    return { userId: req?.user?.userId, role: req?.user?.role };
  }

  // ── Lecture ───────────────────────────────────────────────────────────

  @Get("dossier/:dossierId")
  @Rule("T5-LIV-LIST-001")
  list(@Param("dossierId") dossierId: string) {
    return this.svc.listForDossier(dossierId);
  }

  @Get("dossier/:dossierId/calendar")
  @Rule("T5-LIV-CALENDAR-007")
  calendar(@Param("dossierId") dossierId: string, @Query("week") week: string) {
    return this.svc.calendarForWeek(dossierId, week || "");
  }

  @Get("commande/:id")
  @Rule("T5-LIV-DETAIL-001")
  getOne(@Param("id") id: string, @Query("dossierId") dossierId: string) {
    return this.svc.getOne(dossierId, id);
  }

  @Get("commande/:id/audit")
  @Rule("T5-LIV-AUDIT-008")
  audit(@Param("id") id: string, @Query("dossierId") dossierId: string) {
    return this.svc.getAuditTrail(dossierId, id);
  }

  // ── Mutations ────────────────────────────────────────────────────────

  @Post("commande")
  @Rule("T5-LIV-COMMANDE-001")
  create(@Body() body: CreateCommandeInput, @Req() req: any) {
    return this.svc.create(body, this.actor(req));
  }

  @Post("commande/:id/confirm-supplier")
  @Rule("T5-LIV-CONFIRM-002")
  confirm(@Param("id") id: string, @Body() body: { dossierId: string }, @Req() req: any) {
    return this.svc.confirmBySupplier(body.dossierId, id, this.actor(req));
  }

  @Post("commande/:id/reject-supplier")
  @Rule("T5-LIV-REJECT-003")
  reject(
    @Param("id") id: string,
    @Body() body: { dossierId: string; motif: string },
    @Req() req: any,
  ) {
    return this.svc.rejectBySupplier(body.dossierId, id, body.motif || "", this.actor(req));
  }

  @Post("commande/:id/livraison-prete")
  @Rule("T5-LIV-EN-ROUTE-004")
  prete(@Param("id") id: string, @Body() body: { dossierId: string }, @Req() req: any) {
    return this.svc.markLivraisonPrete(body.dossierId, id, this.actor(req));
  }

  @Post("commande/:id/reception")
  @Rule("T5-LIV-RECEPTION-005")
  reception(
    @Param("id") id: string,
    @Body() body: ReceptionInput & { dossierId: string },
    @Req() req: any,
  ) {
    const { dossierId, ...input } = body;
    return this.svc.receptionner(dossierId, id, input, this.actor(req));
  }

  @Post("commande/:id/anomalie")
  @Rule("T5-LIV-ANOMALIE-006")
  anomalie(
    @Param("id") id: string,
    @Body() body: AnomalieInput & { dossierId: string },
    @Req() req: any,
  ) {
    const { dossierId, ...input } = body;
    return this.svc.declareAnomalie(dossierId, id, input, this.actor(req));
  }
}
