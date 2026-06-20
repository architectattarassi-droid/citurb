import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tome-5/auth/roles.guard";
import { Roles } from "../tome-5/auth/roles.decorator";
import { QuoteInvoiceService, DocumentType } from "./quote-invoice.service";

/**
 * QuoteInvoiceController — endpoints admin pour devis & factures.
 *
 *   POST /api/cc/quote/:dossierId        — assigne le numéro de devis
 *   GET  /api/cc/quote/:dossierId/html   — HTML imprimable du devis
 *   POST /api/cc/invoice/:dossierId      — assigne le numéro de facture
 *   GET  /api/cc/invoice/:dossierId/html — HTML imprimable de la facture
 *
 * Tous protégés ADMIN/OWNER/OPS via RolesGuard.
 */

@Tome("tome1")
@Controller("api/cc")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "OWNER", "OPS")
export class QuoteInvoiceController {
  constructor(private readonly service: QuoteInvoiceService) {}

  // ── Devis ──
  @Post("quote/:dossierId")
  async assignQuote(@Param("dossierId") dossierId: string) {
    const numero = await this.service.getOrAssignNumero(dossierId, "QUOTE");
    return { ok: true, numero };
  }

  @Get("quote/:dossierId/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  async quoteHtml(
    @Param("dossierId") dossierId: string,
    @Query("notes") notes: string | undefined,
    @Res() res: Response,
  ) {
    const html = await this.service.renderHtml(dossierId, { type: "QUOTE", notes });
    res.send(html);
  }

  // ── Devis autonome (sans dossier, passe B) ──
  @Get("devis")
  async listDevisLibre() {
    return { ok: true, devis: await this.service.listDevisLibre() };
  }

  @Post("devis")
  async createDevisLibre(
    @Body() body: { titre: string; lignes: any[]; clientInfo?: any; tva?: number; conditions?: string },
    @Req() req: any,
  ) {
    const emetteurId = req.user?.userId ?? req.user?.sub ?? "";
    return { ok: true, devis: await this.service.createDevisLibre(emetteurId, body) };
  }

  // ── Devis persisté (model Devis, passe 2) ──
  @Get("devis/:devisId/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  async devisRowHtml(@Param("devisId") devisId: string, @Res() res: Response) {
    const html = await this.service.renderDevisRowHtml(devisId);
    res.send(html);
  }

  // ── Facture ──
  @Post("invoice/:dossierId")
  async assignInvoice(@Param("dossierId") dossierId: string) {
    const numero = await this.service.getOrAssignNumero(dossierId, "INVOICE");
    return { ok: true, numero };
  }

  @Get("invoice/:dossierId/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  async invoiceHtml(
    @Param("dossierId") dossierId: string,
    @Query("statut") statut: "PAYEE" | "IMPAYEE" | "PARTIELLE" | undefined,
    @Query("methode") methode: string | undefined,
    @Query("ref") ref: string | undefined,
    @Query("notes") notes: string | undefined,
    @Res() res: Response,
  ) {
    const html = await this.service.renderHtml(dossierId, {
      type: "INVOICE",
      paiementStatut: statut,
      paiementMethode: methode,
      paiementRef: ref,
      notes,
    });
    res.send(html);
  }
}
