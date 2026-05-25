import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import * as fs from "fs/promises";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { PvChantierRenderer } from "./pv-chantier.renderer";
import { PvChantierService } from "./pv-chantier.service";
import {
  PvChantierCreateInput,
  PvChantierPatchInput,
  PvChantierSignInput,
} from "./pv-chantier.types";

type AuthedRequest = Request & { user?: { userId?: string; sub?: string; role?: string } };

/**
 * Tome 2 — PV de Chantier (Procès-Verbaux).
 *
 * Endpoints :
 *  - GET    /api/pv-chantier/dossier/:dossierId        liste
 *  - POST   /api/pv-chantier/dossier/:dossierId        create (auth)
 *  - GET    /api/pv-chantier/:pvId                     detail
 *  - PATCH  /api/pv-chantier/:pvId                     patch DRAFT (auth)
 *  - POST   /api/pv-chantier/:pvId/sign                add signature (auth)
 *  - POST   /api/pv-chantier/:pvId/finalize            finalize → FINAL + hash + log (auth)
 *  - POST   /api/pv-chantier/:pvId/photos              upload photo base64 (auth)
 *  - GET    /api/pv-chantier/:pvId/pdf                 HTML imprimable (Print → PDF)
 */
@Tome("tome2")
@Controller("api/pv-chantier")
export class PvChantierController {
  constructor(
    private readonly service: PvChantierService,
    private readonly renderer: PvChantierRenderer,
    private readonly prisma: PrismaService,
  ) {}

  // ───────── Listes & lectures (publiques en GET)

  @Get("dossier/:dossierId")
  async list(@Param("dossierId") dossierId: string) {
    const items = await this.service.list(dossierId);
    return { items, total: items.length };
  }

  @Get(":pvId")
  async detail(@Param("pvId") pvId: string) {
    return this.service.get(pvId);
  }

  // ───────── Mutations (auth requise)

  @Post("dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async create(
    @Param("dossierId") dossierId: string,
    @Body() body: PvChantierCreateInput,
    @Req() req: AuthedRequest,
  ) {
    const authorId = req.user?.userId ?? req.user?.sub;
    return this.service.create(dossierId, authorId, body ?? {});
  }

  @Patch(":pvId")
  @UseGuards(JwtAuthGuard)
  async patch(
    @Param("pvId") pvId: string,
    @Body() body: PvChantierPatchInput,
    @Req() req: AuthedRequest,
  ) {
    const authorId = req.user?.userId ?? req.user?.sub;
    return this.service.patch(pvId, authorId, body ?? {});
  }

  @Post(":pvId/sign")
  @UseGuards(JwtAuthGuard)
  async sign(
    @Param("pvId") pvId: string,
    @Body() body: PvChantierSignInput,
  ) {
    return this.service.addSignature(pvId, body);
  }

  @Post(":pvId/finalize")
  @UseGuards(JwtAuthGuard)
  async finalize(@Param("pvId") pvId: string) {
    const pv = await this.service.get(pvId);
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: pv.dossierId },
      select: { title: true, commune: true },
    });
    const html = this.renderer.renderHtml(pv, {
      dossierTitle: dossier?.title ?? undefined,
      commune: dossier?.commune ?? undefined,
    });
    return this.service.finalize(pvId, html);
  }

  @Post(":pvId/photos")
  @UseGuards(JwtAuthGuard)
  async uploadPhoto(
    @Param("pvId") pvId: string,
    @Body() body: { contentBase64: string; mimeType: string; filenameHint?: string },
  ) {
    const pv = await this.service.get(pvId);
    return this.service.savePhoto({
      dossierId: pv.dossierId,
      pvId: pv.id,
      contentBase64: body?.contentBase64 ?? "",
      mimeType: body?.mimeType ?? "image/jpeg",
      filenameHint: body?.filenameHint,
    });
  }

  // ───────── Export HTML imprimable (sert de PDF source)

  @Get(":pvId/pdf")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdf(@Param("pvId") pvId: string, @Res() res: Response) {
    const pv = await this.service.get(pvId);

    // Si finalisé, sert le snapshot stocké (immuable) ; sinon rendu live.
    if (pv.status === "FINAL" && pv.pdfUrl) {
      try {
        const abs = await this.service.resolveSnapshotPath(pvId);
        const html = await fs.readFile(abs, "utf8");
        res.send(html);
        return;
      } catch {
        // fallback rendu live
      }
    }

    const dossier = await this.prisma.dossier.findUnique({
      where: { id: pv.dossierId },
      select: { title: true, commune: true },
    });
    const html = this.renderer.renderHtml(pv, {
      dossierTitle: dossier?.title ?? undefined,
      commune: dossier?.commune ?? undefined,
    });
    res.send(html);
  }
}
